"""
Integration script to use the optimized Legal-BERT model with the existing service.
This bridges the trained PyTorch model with the clause detection service.

Supports both:
- Pure ML-based detection (using the trained model)
- Hybrid detection (ML + regex fallback)
"""

import torch
import torch.nn as nn
import os
from typing import Dict, List
from pathlib import Path
from transformers import AutoModel, AutoTokenizer


# ============================================================================
# CLAUSES (Must match training script)
# ============================================================================
CLAUSES = [
    "CourtTitle", "CaseNumber", "CaseYear", "BeforeBench", "JudgeNames",
    "ArguedOn", "DecidedOn", "JudgeSignature", "LowerCourtNumber",
    "Petitioner", "Respondent", "Plaintiff", "Defendant",
    "PetitionerBlock", "RespondentBlock", "PlaintiffBlock", "DefendantBlock",
    "CounselForAppellant", "CounselForRespondent", "ClaimAmount",
    "Jurisdiction", "LegalProvisionsCited", "MatterDescription",
    "PrayerForRelief", "AppealType", "InstructedBy",
    "DefendantAddress", "PlaintiffAddress"
]
LABEL_MAP_REVERSE = {0: "Missing", 1: "Present", 2: "Corrupted"}


# ============================================================================
# MODEL ARCHITECTURE (Must match training script)
# ============================================================================
class OptimizedLegalBERTDetector(nn.Module):
    """Optimized Legal-BERT model for clause detection."""
    
    def __init__(self, num_clauses=28, dropout=0.3, num_dropout_samples=5,
                 model_name="nlpaueb/legal-bert-base-uncased"):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.num_dropout_samples = num_dropout_samples
        
        hidden_size = self.bert.config.hidden_size
        
        self.pre_classifier = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.LayerNorm(hidden_size),
            nn.GELU(),
            nn.Dropout(dropout)
        )
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.LayerNorm(hidden_size // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, num_clauses * 3)
        )
        
    def forward(self, input_ids, attention_mask, use_multi_dropout=False):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, 0]
        
        if use_multi_dropout and self.training:
            logits_list = []
            for _ in range(self.num_dropout_samples):
                x = self.pre_classifier(pooled)
                logits = self.classifier(x)
                logits_list.append(logits)
            logits = torch.stack(logits_list).mean(0)
        else:
            x = self.pre_classifier(pooled)
            logits = self.classifier(x)
        
        batch_size = logits.size(0)
        logits = logits.view(batch_size, 28, 3)
        return logits


# ============================================================================
# ML-BASED CLAUSE DETECTION SERVICE
# ============================================================================
class MLClauseDetectionService:
    """Enhanced clause detection service using trained ML model."""
    
    def __init__(self, checkpoint_path: str = 'app/ml_models/clause_detection_model.pt',
                 model_name: str = "nlpaueb/legal-bert-base-uncased"):
        """Initialize the ML-based clause detection service."""
        # Resolve path relative to backend directory
        if not os.path.isabs(checkpoint_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            checkpoint_path = os.path.join(backend_dir, checkpoint_path)
        
        self.checkpoint_path = checkpoint_path
        self.model_name = model_name
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model = None
        self.tokenizer = None
        self.config = None
        self.load_checkpoint()
    
    def load_checkpoint(self):
        """Load the model checkpoint."""
        if not os.path.exists(self.checkpoint_path):
            print(f"⚠️ Checkpoint not found at: {self.checkpoint_path}")
            return False
        
        try:
            print(f"📦 Loading checkpoint from: {self.checkpoint_path}")
            checkpoint = torch.load(self.checkpoint_path, map_location=self.device)
            
            # Extract config
            self.config = checkpoint.get('config', {'DROPOUT': 0.3, 'NUM_DROPOUT_SAMPLES': 5})
            
            # Build model
            print(f"🏗️  Building model...")
            dropout = self.config.get('DROPOUT', 0.3)
            num_dropout_samples = self.config.get('NUM_DROPOUT_SAMPLES', 5)
            
            self.model = OptimizedLegalBERTDetector(
                num_clauses=28,
                dropout=dropout,
                num_dropout_samples=num_dropout_samples,
                model_name=self.model_name
            ).to(self.device)
            
            # Load weights
            if 'model_state_dict' in checkpoint:
                self.model.load_state_dict(checkpoint['model_state_dict'])
            else:
                raise KeyError("model_state_dict not found in checkpoint")
            
            self.model.eval()
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            print(f"✅ Model loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to load checkpoint: {e}")
            return False
    
    def predict(self, text: str, max_length: int = 512) -> Dict:
        """
        Use the trained ML model for predictions.
        
        Args:
            text: Legal document text
            max_length: Maximum sequence length
            
        Returns:
            Dict: Predictions for each clause
        """
        if self.model is None or self.tokenizer is None:
            return {"error": "Model not loaded"}
        
        try:
            with torch.no_grad():
                # Tokenize
                encoding = self.tokenizer(
                    text,
                    max_length=max_length,
                    padding='max_length',
                    truncation=True,
                    return_tensors='pt'
                )
                
                input_ids = encoding['input_ids'].to(self.device)
                attention_mask = encoding['attention_mask'].to(self.device)
                
                # Inference
                logits = self.model(input_ids, attention_mask, use_multi_dropout=False)
                
                # Extract predictions
                predictions = logits.argmax(dim=-1)
                probs = torch.softmax(logits, dim=-1)
                confidences = torch.max(probs, dim=-1)[0]
                
                # Format results
                clause_results = []
                batch_idx = 0
                
                for clause_idx, clause_name in enumerate(CLAUSES):
                    pred_label = predictions[batch_idx, clause_idx].item()
                    prediction = LABEL_MAP_REVERSE[pred_label]
                    confidence = confidences[batch_idx, clause_idx].item()
                    
                    class_probs = probs[batch_idx, clause_idx].cpu().numpy().tolist()
                    
                    clause_results.append({
                        'clause': clause_name,
                        'status': prediction,
                        'confidence': float(confidence),
                        'probabilities': {
                            'missing': float(class_probs[0]),
                            'present': float(class_probs[1]),
                            'corrupted': float(class_probs[2])
                        }
                    })
                
                # Calculate summary
                summary = {
                    'present': sum(1 for c in clause_results if c['status'] == 'Present'),
                    'missing': sum(1 for c in clause_results if c['status'] == 'Missing'),
                    'corrupted': sum(1 for c in clause_results if c['status'] == 'Corrupted')
                }
                
                return {
                    'success': True,
                    'clauses': clause_results,
                    'summary': summary,
                    'device': str(self.device),
                    'text_length': len(text)
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'device': str(self.device),
                'text_length': len(text)
            }
    
    def analyze(self, text: str, max_length: int = 512) -> Dict:
        """
        Analyze document with ML model.
        
        Args:
            text: Legal document text
            max_length: Maximum sequence length
            
        Returns:
            Dict: Analysis results
        """
        result = self.predict(text, max_length=max_length)
        
        if result.get('success'):
            return {
                'success': True,
                'analysis_method': 'machine_learning',
                'clauses': result['clauses'],
                'statistics': {
                    'total_clauses': 28,
                    'present': result['summary']['present'],
                    'missing': result['summary']['missing'],
                    'corrupted': result['summary']['corrupted'],
                    'completion_percentage': round(
                        result['summary']['present'] / 28 * 100, 2
                    )
                },
                'text_length': result['text_length'],
                'word_count': len(text.split()),
                'ml_predictions': result
            }
        else:
            return {
                'success': False,
                'error': result.get('error'),
                'analysis_method': 'machine_learning'
            }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def analyze_document_with_model(
    text: str,
    checkpoint_path: str = 'app/ml_models/clause_detection_model.pt',
    max_length: int = 512
) -> Dict:
    """
    Analyze a legal document using the trained ML model.
    
    Args:
        text: Document text to analyze
        checkpoint_path: Path to the trained checkpoint
        max_length: Maximum sequence length
        
    Returns:
        Dict: Complete analysis results
    """
    service = MLClauseDetectionService(checkpoint_path)
    return service.analyze(text, max_length=max_length)


def analyze_file_with_model(
    file_path: str,
    checkpoint_path: str = 'app/ml_models/clause_detection_model.pt',
    max_length: int = 512
) -> Dict:
    """
    Analyze a document from file using the trained ML model.
    
    Args:
        file_path: Path to the text file
        checkpoint_path: Path to the trained checkpoint
        max_length: Maximum sequence length
        
    Returns:
        Dict: Complete analysis results
    """
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    return analyze_document_with_model(text, checkpoint_path, max_length)


# ============================================================================
# TESTING
# ============================================================================

if __name__ == '__main__':
    import json
    
    print("="*80)
    print("ML CLAUSE DETECTION SERVICE - INTEGRATION TEST")
    print("="*80 + "\n")
    
    # Test with sample text
    sample_text = """
    HIGH COURT OF DELHI
    
    Writ Petition (Civil) No. 2345 of 2023
    
    PETITIONER vs. STATE OF DELHI
    
    ORDER
    
    1. Facts: The petitioner filed a writ petition challenging the order passed by 
    the Deputy Commissioner on 15.03.2023 which was found to be in violation of 
    Article 21 of the Constitution of India.
    
    2. Issues: Whether the impugned order is vitiated by procedural impropriety
    and whether the fundamental rights of the petitioner have been violated.
    
    3. Judgment: After hearing arguments from both sides and perusing the records,
    we find that the order was passed without following due process.
    
    4. Relief: The impugned order is hereby quashed and set aside. The matter is
    remitted back to the Deputy Commissioner for fresh consideration in accordance
    with law within a period of three months from today.
    
    5. Costs: No costs.
    
    Pronounced in the open court on this 20th day of April, 2023.
    """
    
    result = analyze_document_with_model(sample_text)
    
    print("📊 ANALYSIS RESULTS:")
    print(json.dumps({
        'success': result.get('success'),
        'analysis_method': result.get('analysis_method'),
        'statistics': result.get('statistics'),
        'text_length': result.get('text_length')
    }, indent=2))
    
    print("\n✅ Test complete!")
