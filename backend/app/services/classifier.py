"""
Legal risk classification pipeline service.
Implements the two-stage pipeline: clause segmentation → risk classification
"""
import logging
import torch
import numpy as np
from typing import List, Dict, Tuple
from .model_loader import model_loader

logger = logging.getLogger(__name__)


class LegalRiskClassifier:
    """Two-stage legal risk classification pipeline."""
    
    def __init__(self):
        self.device = model_loader.get_device()
        self.segmentation_model, self.segmentation_tokenizer = model_loader.get_segmentation_model()
        self.classification_model, self.classification_tokenizer = model_loader.get_classification_model()
        self.labels = model_loader.get_labels()
    
    def segment_clauses(self, text: str) -> List[str]:
        """
        Stage 1: Segment text into clauses using BIO tagging.
        
        Args:
            text: Input text to segment
            
        Returns:
            List of segmented clause strings
        """
        # Tokenize input
        inputs = self.segmentation_tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)
        
        # Get predictions
        with torch.no_grad():
            outputs = self.segmentation_model(**inputs)
            predictions = torch.argmax(outputs.logits, dim=-1)
        
        # Convert predictions to labels
        tokens = self.segmentation_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
        predicted_labels = [self.labels["segmentation"][pred.item()] for pred in predictions[0]]
        
        # Extract clauses from BIO tags
        clauses = self._extract_clauses_from_bio(tokens, predicted_labels)
        
        logger.info(f"Segmented into {len(clauses)} clauses")
        return clauses
    
    def _extract_clauses_from_bio(self, tokens: List[str], labels: List[str]) -> List[str]:
        """
        Extract clause texts from BIO-tagged tokens.
        
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
                # Start of new clause
                if current_clause:
                    clause_text = self._reconstruct_text(current_clause)
                    if clause_text:
                        clauses.append(clause_text)
                current_clause = [token]
            elif label == "I-CLAUSE":
                # Continuation of clause
                current_clause.append(token)
            elif label == "O":
                # Outside clause - might be between clauses
                if current_clause:
                    clause_text = self._reconstruct_text(current_clause)
                    if clause_text:
                        clauses.append(clause_text)
                    current_clause = []
        
        # Add last clause if exists
        if current_clause:
            clause_text = self._reconstruct_text(current_clause)
            if clause_text:
                clauses.append(clause_text)
        
        return clauses if clauses else [self._reconstruct_text(tokens)]
    
    def _reconstruct_text(self, tokens: List[str]) -> str:
        """
        Reconstruct text from WordPiece tokens.
        
        Args:
            tokens: List of tokens
            
        Returns:
            Reconstructed text string
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
        # Tokenize input
        inputs = self.classification_tokenizer(
            clause,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)
        
        # Get predictions
        with torch.no_grad():
            outputs = self.classification_model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]
            predicted_class = torch.argmax(probabilities).item()
            confidence = probabilities[predicted_class].item()
        
        # Get risk level
        risk_level = self.labels["classification"][predicted_class]
        
        # Get all probabilities
        all_probs = {
            self.labels["classification"][i]: prob.item() 
            for i, prob in enumerate(probabilities)
        }
        
        return risk_level, confidence, all_probs
    
    def analyze_text(self, text: str) -> Dict:
        """
        Complete two-stage analysis pipeline.
        
        Args:
            text: Input legal text
            
        Returns:
            Dictionary with segmented clauses and their risk classifications
        """
        logger.info("Starting two-stage analysis pipeline...")
        
        # Stage 1: Segment clauses
        clauses = self.segment_clauses(text)
        
        if not clauses:
            logger.warning("No clauses detected")
            return {
                "total_clauses": 0,
                "clauses": [],
                "risk_summary": {
                    "High": 0,
                    "Medium": 0,
                    "Low": 0
                }
            }
        
        # Stage 2: Classify each clause
        results = []
        risk_counts = {"High": 0, "Medium": 0, "Low": 0}
        
        for i, clause in enumerate(clauses):
            risk_level, confidence, all_probs = self.classify_risk(clause)
            
            # Generate key factors based on risk level (simplified for now)
            key_factors = self._generate_key_factors(clause, risk_level)
            
            results.append({
                "id": i + 1,
                "text": clause,
                "risk": risk_level,
                "confidence": round(confidence * 100, 2),
                "probabilities": {k: round(v * 100, 2) for k, v in all_probs.items()},
                "keyFactors": key_factors
            })
            
            risk_counts[risk_level] += 1
        
        logger.info(f"Analysis complete: {len(clauses)} clauses classified")
        
        return {
            "total_clauses": len(clauses),
            "clauses": results,
            "risk_summary": risk_counts,
            "model_info": {
                "segmentation_model": "Legal-BERT (BIO Tagging)",
                "classification_model": "Legal-BERT (Risk Classification)",
                "device": str(self.device)
            }
        }
    
    def _generate_key_factors(self, clause: str, risk_level: str) -> List[str]:
        """
        Generate key risk factors for a clause (simplified version).
        In production, this could use additional ML models or rule-based analysis.
        
        Args:
            clause: The clause text
            risk_level: The predicted risk level
            
        Returns:
            List of key factor strings
        """
        factors = []
        clause_lower = clause.lower()
        
        # High risk indicators
        if risk_level == "High":
            if any(word in clause_lower for word in ["breach", "failed", "violation"]):
                factors.append("Contains breach/failure language")
            if any(word in clause_lower for word in ["damages", "penalty", "liable"]):
                factors.append("Financial liability indicated")
            if any(word in clause_lower for word in ["court", "judgment", "ordered"]):
                factors.append("Judicial determination present")
            if not factors:
                factors.append("High legal risk identified")
        
        # Medium risk indicators
        elif risk_level == "Medium":
            if any(word in clause_lower for word in ["claim", "dispute", "alleged"]):
                factors.append("Disputed matter")
            if any(word in clause_lower for word in ["may", "could", "potential"]):
                factors.append("Conditional outcome")
            if not factors:
                factors.append("Moderate legal implications")
        
        # Low risk indicators
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
