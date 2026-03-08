"""
Legal risk classification pipeline service.
Implements the two-stage pipeline: clause segmentation → risk classification
"""
import logging
import torch
import numpy as np
import re
from typing import List, Dict, Tuple
from .model_loader import model_loader

logger = logging.getLogger(__name__)


class LegalRiskClassifier:
    """Two-stage legal risk classification pipeline."""
    
    def __init__(self):
        self.device = model_loader.get_device()
        
        # Check model availability
        self.has_segmentation = model_loader.has_segmentation_model()
        self.has_classification = model_loader.has_classification_model()
        
        # Load models if available
        if self.has_segmentation:
            self.segmentation_model, self.segmentation_tokenizer = model_loader.get_segmentation_model()
        else:
            self.segmentation_model = None
            self.segmentation_tokenizer = None
            logger.warning("Segmentation model not available")
        
        if self.has_classification:
            self.classification_model, self.classification_tokenizer = model_loader.get_classification_model()
        else:
            self.classification_model = None
            self.classification_tokenizer = None
            logger.warning("Classification model not available")
        
        self.labels = model_loader.get_labels()
    
    def _split_into_sentences(self, text: str) -> List[Dict]:
        """
        Split text into sentences to avoid model truncation issues.
        Returns sentence text AND offsets relative to original text.
        
        Handles:
        - PDF line breaks (joins mid-sentence line breaks)
        - Intentional paragraph breaks (blank lines, section headings)
        - Punctuation-based sentence endings (. ! ?)
        - Common legal abbreviations (Mr., Rs., Ltd., etc.)
        
        Args:
            text: Input text to split
            
        Returns:
            List of dicts: [{"text": str, "start": int, "end": int}, ...]
        """
        # ── Step 1: Join lines that are clearly continuations ──
        # This fixes PDF extraction where sentences are broken across lines
        # Track both joined text and offset mapping
        lines = text.split('\n')
        paragraphs_with_offsets = []
        current_paragraph_parts = []
        prev_blank = False
        char_pos = 0
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            line_start_in_original = char_pos
            
            # Blank line = paragraph boundary
            if not stripped:
                if current_paragraph_parts:
                    joined = ' '.join([p['text'] for p in current_paragraph_parts])
                    paragraphs_with_offsets.append({
                        'text': joined,
                        'start': current_paragraph_parts[0]['start'],
                        'parts': current_paragraph_parts
                    })
                    current_paragraph_parts = []
                prev_blank = True
                char_pos += len(line) + 1  # +1 for \n
                continue
            
            # Find where stripped text actually starts in original
            actual_start = text.find(stripped, char_pos)
            if actual_start == -1:
                actual_start = char_pos
            
            # If previous line was blank, start new paragraph
            if prev_blank:
                current_paragraph_parts = [{'text': stripped, 'start': actual_start}]
                prev_blank = False
                char_pos += len(line) + 1
                continue
            
            # Check if this line should start a new paragraph
            is_new_section = False
            if current_paragraph_parts:
                prev_text = current_paragraph_parts[-1]['text']
                
                # Check if both current and previous are ALL CAPS (multi-line heading)
                prev_is_caps = prev_text.isupper() and len(prev_text) < 100
                curr_is_caps = stripped.isupper() and len(stripped) < 100
                
                # If both are ALL CAPS, keep them together (multi-line heading)
                if prev_is_caps and curr_is_caps:
                    is_new_section = False
                else:
                    # New section if:
                    # 1. Previous line ends with sentence punctuation + current starts with capital/number
                    # 2. Current line looks like a heading (ALL CAPS, short) and previous is not
                    # 3. Current line starts with numbering (1., (a), etc.)
                    ends_with_sentence = prev_text.rstrip().endswith(('.', '!', '?', ':'))
                    starts_capital = stripped and stripped[0].isupper()
                    is_heading = curr_is_caps and not prev_is_caps
                    is_numbered = re.match(r'^\s*(\d+\.|\([a-z]\)|\([0-9]+\))', stripped)
                    
                    if ends_with_sentence and (starts_capital or is_numbered):
                        is_new_section = True
                    elif is_heading:
                        is_new_section = True
            
            if is_new_section:
                joined = ' '.join([p['text'] for p in current_paragraph_parts])
                paragraphs_with_offsets.append({
                    'text': joined,
                    'start': current_paragraph_parts[0]['start'],
                    'parts': current_paragraph_parts
                })
                current_paragraph_parts = [{'text': stripped, 'start': actual_start}]
            else:
                current_paragraph_parts.append({'text': stripped, 'start': actual_start})
            
            prev_blank = False
            char_pos += len(line) + 1
        
        if current_paragraph_parts:
            joined = ' '.join([p['text'] for p in current_paragraph_parts])
            paragraphs_with_offsets.append({
                'text': joined,
                'start': current_paragraph_parts[0]['start'],
                'parts': current_paragraph_parts
            })
        
        # ── Step 2: Split paragraphs into sentences ──
        # Common abbreviations that shouldn't trigger sentence breaks
        abbreviations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 
                        'Inc.', 'Ltd.', 'Corp.', 'Co.', 'vs.', 'etc.', 'e.g.', 'i.e.',
                        'Art.', 'No.', 'vol.', 'Vol.', 'p.', 'pp.', 'Rs.']
        
        result = []
        
        for para_info in paragraphs_with_offsets:
            paragraph = para_info['text']
            para_start = para_info['start']
            
            if not paragraph.strip():
                continue
            
            # Protect abbreviations by temporarily replacing them
            protected = paragraph
            placeholders = {}
            for i, abbr in enumerate(abbreviations):
                placeholder = f"__ABBR{i}__"
                if abbr in protected:
                    protected = protected.replace(abbr, placeholder)
                    placeholders[placeholder] = abbr
            
            # Split on sentence endings (. ! ?) followed by space and capital letter or number
            sentence_pattern = r'([.!?]+)\s+(?=[A-Z0-9])'
            parts = re.split(sentence_pattern, protected)
            
            # Reconstruct sentences from parts
            sentences = []
            current_sentence = ""
            for part in parts:
                if part.strip():
                    if re.match(r'^[.!?]+$', part):
                        current_sentence += part
                        if current_sentence.strip():
                            sentences.append(current_sentence.strip())
                        current_sentence = ""
                    else:
                        current_sentence += part
            if current_sentence.strip():
                sentences.append(current_sentence.strip())
            
            # Restore abbreviations and find offsets
            search_from = para_start
            for sentence in sentences:
                for placeholder, abbr in placeholders.items():
                    sentence = sentence.replace(placeholder, abbr)
                
                if len(sentence.strip()) <= 10:
                    continue  # skip very short fragments
                
                # Find offset in original text starting from paragraph position
                # Try to find the sentence in original text (handling joined lines)
                sentence_clean = sentence.strip()
                
                # Search in the original text starting from where we expect it
                idx = text.find(sentence_clean, search_from)
                
                if idx == -1:
                    # If exact match not found, try finding first few words
                    # This handles cases where joining lines changed spacing
                    words = sentence_clean.split()[:5]  # First 5 words
                    search_phrase = ' '.join(words)
                    idx = text.find(search_phrase, search_from)
                
                if idx != -1:
                    result.append({
                        "text": sentence_clean,
                        "start": idx,
                        "end": idx + len(sentence_clean)
                    })
                    search_from = idx + len(sentence_clean)
                else:
                    # Fallback: estimate position
                    result.append({
                        "text": sentence_clean,
                        "start": search_from,
                        "end": search_from + len(sentence_clean)
                    })
                    search_from += len(sentence_clean)
        
        if not result:
            result = [{"text": text.strip(), "start": 0, "end": len(text.strip())}]
        
        logger.info(f"Split text into {len(result)} sentences (PDF-aware, joined line breaks)")
        return result
    
    def segment_clauses(self, text: str) -> List[Dict]:
        """
        Stage 1: Segment text into clauses using BIO tagging.
        Pre-splits text into sentences to avoid truncation issues.
        Returns clauses with character offsets from the original text.
        
        Args:
            text: Input text to segment
            
        Returns:
            List of dicts: [{"text": str, "start": int, "end": int}, ...]
        """
        if not self.has_segmentation:
            raise RuntimeError("Segmentation model not available. Please place model files in app/ml_models/legalbert_clause_segmentation_model/")
        
        sentence_infos = self._split_into_sentences(text)
        
        all_clauses = []
        
        for sentence_info in sentence_infos:
            sentence = sentence_info["text"]
            sentence_start = sentence_info["start"]
            
            # Tokenize input with return_offsets_mapping to get char positions
            inputs = self.segmentation_tokenizer(
                sentence,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
                return_offsets_mapping=True
            )
            
            # Extract offset_mapping before moving to device (it's not needed on GPU)
            offset_mapping = inputs.pop("offset_mapping")[0]  # shape: (seq_len, 2)
            
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Get predictions
            with torch.no_grad():
                outputs = self.segmentation_model(**inputs)
                predictions = torch.argmax(outputs.logits, dim=-1)
            
            # Convert predictions to labels
            tokens = self.segmentation_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
            predicted_labels = [self.labels["segmentation"][pred.item()] for pred in predictions[0]]
            
            # Extract clauses using offset_mapping for exact positions
            sentence_clauses = self._extract_clauses_with_offsets(
                tokens, predicted_labels, offset_mapping, sentence, sentence_start
            )
            all_clauses.extend(sentence_clauses)
        
        logger.info(f"Segmented into {len(all_clauses)} clauses from {len(sentence_infos)} sentences")
        
        if not all_clauses:
            # If no clauses found, treat entire text as one clause
            all_clauses = [{"text": text, "start": 0, "end": len(text)}]
        
        return all_clauses
    
    def _extract_clauses_with_offsets(
        self, 
        tokens: List[str], 
        labels: List[str], 
        offset_mapping: torch.Tensor,
        sentence: str,
        sentence_start: int
    ) -> List[Dict]:
        """
        Extract clauses with exact character offsets using the tokenizer's offset_mapping.
        Now captures ALL text including gaps (O-tagged regions) to ensure 100% coverage.
        
        Args:
            tokens: List of tokens
            labels: List of BIO labels
            offset_mapping: Tensor of (start_char, end_char) for each token
            sentence: The original sentence text
            sentence_start: Character offset of this sentence in the full document
            
        Returns:
            List of dicts: [{"text": str, "start": int, "end": int}, ...]
        """
        clauses = []
        clause_start_char = None
        clause_end_char = None
        current_label_type = None  # Track if we're in CLAUSE or O region
        
        for i, (token, label) in enumerate(zip(tokens, labels)):
            # Skip special tokens
            if token in ["[CLS]", "[SEP]", "[PAD]"]:
                continue
            
            token_start = offset_mapping[i][0].item()
            token_end = offset_mapping[i][1].item()
            
            # Skip tokens with zero offset (special tokens)
            if token_start == 0 and token_end == 0:
                continue
            
            if label == "B-CLAUSE":
                # Save previous region if exists (could be CLAUSE or O)
                if clause_start_char is not None:
                    clause_text = sentence[clause_start_char:clause_end_char].strip()
                    if clause_text:
                        clauses.append({
                            "text": clause_text,
                            "start": sentence_start + clause_start_char,
                            "end": sentence_start + clause_end_char
                        })
                # Start new clause region
                clause_start_char = token_start
                clause_end_char = token_end
                current_label_type = "CLAUSE"
                
            elif label == "I-CLAUSE":
                if clause_start_char is not None and current_label_type == "CLAUSE":
                    # Continue existing clause
                    clause_end_char = token_end
                else:
                    # I-CLAUSE without B-CLAUSE or after O, start new clause
                    if clause_start_char is not None:
                        # Save previous O region
                        clause_text = sentence[clause_start_char:clause_end_char].strip()
                        if clause_text:
                            clauses.append({
                                "text": clause_text,
                                "start": sentence_start + clause_start_char,
                                "end": sentence_start + clause_end_char
                            })
                    clause_start_char = token_start
                    clause_end_char = token_end
                    current_label_type = "CLAUSE"
                    
            elif label == "O":
                # O-tagged text (gaps between clauses) - KEEP THESE NOW
                if clause_start_char is not None and current_label_type == "CLAUSE":
                    # Save current clause region
                    clause_text = sentence[clause_start_char:clause_end_char].strip()
                    if clause_text:
                        clauses.append({
                            "text": clause_text,
                            "start": sentence_start + clause_start_char,
                            "end": sentence_start + clause_end_char
                        })
                    # Start new O region
                    clause_start_char = token_start
                    clause_end_char = token_end
                    current_label_type = "O"
                elif clause_start_char is not None and current_label_type == "O":
                    # Continue existing O region
                    clause_end_char = token_end
                else:
                    # Start new O region
                    clause_start_char = token_start
                    clause_end_char = token_end
                    current_label_type = "O"
        
        # Add last region if exists (could be CLAUSE or O)
        if clause_start_char is not None:
            clause_text = sentence[clause_start_char:clause_end_char].strip()
            if clause_text:
                clauses.append({
                    "text": clause_text,
                    "start": sentence_start + clause_start_char,
                    "end": sentence_start + clause_end_char
                })
        
        # If no clauses found, treat entire sentence as one clause
        if not clauses:
            clause_text = sentence.strip()
            if clause_text:
                clauses.append({
                    "text": clause_text,
                    "start": sentence_start,
                    "end": sentence_start + len(sentence)
                })
        
        return clauses
    
    def _extract_clauses_from_bio(self, tokens: List[str], labels: List[str]) -> List[str]:
        """
        Extract clause texts from BIO-tagged tokens (legacy method).
        
        Args:
            tokens: List of tokenized words
            labels: List of BIO labels (O, B-CLAUSE, I-CLAUSE)
            
        Returns:
            List of clause strings
        """
        clauses = []
        current_clause = []
        
        for token, label in zip(tokens, labels):
            # Skip special tokens
            if token in ["[CLS]", "[SEP]", "[PAD]"]:
                continue
            
            if label == "B-CLAUSE":
                if current_clause:
                    clause_text = self._reconstruct_text(current_clause)
                    if clause_text:
                        clauses.append(clause_text)
                current_clause = [token]
            elif label == "I-CLAUSE":
                current_clause.append(token)
            elif label == "O":
                if current_clause:
                    clause_text = self._reconstruct_text(current_clause)
                    if clause_text:
                        clauses.append(clause_text)
                    current_clause = []
        
        if current_clause:
            clause_text = self._reconstruct_text(current_clause)
            if clause_text:
                clauses.append(clause_text)
        
        return clauses if clauses else [self._reconstruct_text(tokens)]
    
    def _reconstruct_text(self, tokens: List[str]) -> str:
        """
        Reconstruct text from WordPiece tokens.
        """
        text = ""
        for token in tokens:
            if token.startswith("##"):
                text += token[2:]
            else:
                if text:
                    text += " "
                text += token
        return text.strip()
    
    def classify_risk(self, clause: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Stage 2: Classify risk level of a clause.
        
        Args:
            clause: Clause text to classify
            
        Returns:
            Tuple of (risk_level, confidence, all_probabilities)
        """
        if not self.has_classification:
            raise RuntimeError("Classification model not available. Please place model files in app/ml_models/legalbert_risk_classification_model/")
        
        inputs = self.classification_tokenizer(
            clause,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)
        
        with torch.no_grad():
            outputs = self.classification_model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]
            predicted_class = torch.argmax(probabilities).item()
            confidence = probabilities[predicted_class].item()
        
        risk_level = self.labels["classification"][predicted_class]
        
        all_probs = {
            self.labels["classification"][i]: prob.item() 
            for i, prob in enumerate(probabilities)
        }
        
        return risk_level, confidence, all_probs
    
    def analyze_text(self, text: str) -> Dict:
        """
        Complete two-stage analysis pipeline.
        Now returns character offsets (start_char, end_char) for each clause
        so the frontend can highlight exact original text.
        
        Args:
            text: Input legal text
            
        Returns:
            Dictionary with segmented clauses, risk classifications, and character offsets
        """
        logger.info("Starting two-stage analysis pipeline...")
        
        # Stage 1: Segment clauses (now returns offsets)
        clause_infos = self.segment_clauses(text)
        
        if not clause_infos:
            logger.warning("No clauses detected")
            return {
                "total_clauses": 0,
                "clauses": [],
                "risk_summary": {"High": 0, "Medium": 0, "Low": 0}
            }
        
        # Stage 2: Classify each clause
        results = []
        risk_counts = {"High": 0, "Medium": 0, "Low": 0}
        
        for i, clause_info in enumerate(clause_infos):
            clause_text = clause_info["text"]
            risk_level, confidence, all_probs = self.classify_risk(clause_text)
            
            key_factors = self._generate_key_factors(clause_text, risk_level)
            
            results.append({
                "id": i + 1,
                "text": clause_text,
                "start_char": clause_info["start"],
                "end_char": clause_info["end"],
                "risk": risk_level,
                "confidence": round(confidence * 100, 2),
                "probabilities": {k: round(v * 100, 2) for k, v in all_probs.items()},
                "keyFactors": key_factors
            })
            
            risk_counts[risk_level] += 1
        
        logger.info(f"Analysis complete: {len(clause_infos)} clauses classified")
        
        return {
            "total_clauses": len(clause_infos),
            "clauses": results,
            "risk_summary": risk_counts,
            "model_info": {
                "segmentation_model": "Legal-BERT (BIO Tagging)",
                "classification_model": "Legal-BERT (Risk Classification)",
                "device": str(self.device)
            }
        }
    
    def _generate_key_factors(self, clause: str, risk_level: str) -> List[str]:
        """Generate key risk factors for a clause."""
        factors = []
        clause_lower = clause.lower()
        
        if risk_level == "High":
            if any(word in clause_lower for word in ["breach", "failed", "violation"]):
                factors.append("Contains breach/failure language")
            if any(word in clause_lower for word in ["damages", "penalty", "liable"]):
                factors.append("Financial liability indicated")
            if any(word in clause_lower for word in ["court", "judgment", "ordered"]):
                factors.append("Judicial determination present")
            if not factors:
                factors.append("High legal risk identified")
        elif risk_level == "Medium":
            if any(word in clause_lower for word in ["claim", "dispute", "alleged"]):
                factors.append("Disputed matter")
            if any(word in clause_lower for word in ["may", "could", "potential"]):
                factors.append("Conditional outcome")
            if not factors:
                factors.append("Moderate legal implications")
        else:
            if any(word in clause_lower for word in ["procedural", "evidence", "consideration"]):
                factors.append("Procedural statement")
            if any(word in clause_lower for word in ["not", "without", "no"]):
                factors.append("Negative/mitigating language")
            if not factors:
                factors.append("Low legal risk")
        
        return factors if factors else ["Standard legal clause"]


# Global classifier instance
classifier = LegalRiskClassifier()
