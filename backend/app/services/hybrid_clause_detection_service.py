"""
Hybrid Clause Detection Service - Combines ML Model + Regex Detection

This service implements a weighted ensemble approach:
1. Runs both ML model (Legal-BERT) and regex-based detection in parallel
2. Compares predictions from both systems
3. Applies intelligent decision logic:
   - If both agree: High confidence result
   - If both disagree: Prioritize regex (more reliable currently)
   - Track disagreements for future model improvement
4. Returns enriched results with full transparency

Architecture Benefits:
- Safe fallback to reliable regex
- ML model learns from disagreements
- Gradual confidence building
- Full audit trail for debugging
"""

import os
import sys
from typing import Dict, List, Optional, Tuple
import logging

from .clause_detection_service import analyze_clause_detection as regex_detection
from .ml_clause_detection_service import MLClauseDetectionService

logger = logging.getLogger(__name__)


class HybridClauseDetectionService:
    """
    Hybrid service combining ML model and regex-based clause detection.
    
    Decision Strategy:
    - Both agree → Use consensus (high confidence)
    - ML confident (>85%) but regex disagrees → Flag for review
    - Regex finds, ML misses → Use regex (reliable baseline)
    - Neither finds → Missing (both systems agree)
    """
    
    # Confidence thresholds for decision logic
    ML_HIGH_CONFIDENCE_THRESHOLD = 0.85  # ML can suggest override
    ML_MEDIUM_CONFIDENCE_THRESHOLD = 0.70  # ML confirms regex
    ML_LOW_CONFIDENCE_THRESHOLD = 0.40  # ML uncertain
    
    def __init__(self, 
                 ml_checkpoint_path: str = 'app/ml_models/clause_detection_model.pt',
                 enable_ml: bool = True):
        """
        Initialize hybrid detection service.
        
        Args:
            ml_checkpoint_path: Path to trained ML model checkpoint
            enable_ml: Whether to use ML model (can disable for testing)
        """
        self.enable_ml = enable_ml
        self.ml_service = None
        
        if self.enable_ml:
            try:
                logger.info(f"🤖 Initializing ML model from: {ml_checkpoint_path}")
                self.ml_service = MLClauseDetectionService(checkpoint_path=ml_checkpoint_path)
                if self.ml_service.model is not None:
                    logger.info("✅ ML model loaded successfully")
                else:
                    logger.warning("⚠️ ML model failed to load, falling back to regex only")
                    self.ml_service = None
            except Exception as e:
                logger.error(f"❌ ML model initialization failed: {e}")
                self.ml_service = None
    
    def analyze(self, text: str, max_length: int = 512) -> Dict:
        """
        Analyze legal document using hybrid approach.
        
        Process:
        1. Run ML model (if enabled)
        2. Run regex detection
        3. Compare and merge results
        4. Return weighted decision with full metadata
        
        Args:
            text: Extracted text from legal document
            max_length: Max tokens for ML model (512 for Legal-BERT)
            
        Returns:
            Dict: Enriched analysis results with decisions and metadata
        """
        
        # Strip formatting tags before analysis — tags waste tokens and add noise
        # Raw .txt file is preserved on disk; model always gets clean text
        try:
            import re
            clean_text = re.sub(r'<<F:[^>]+>>', '', text)
            clean_text = re.sub(r'<</F>>', '', clean_text)
            clean_text = re.sub(r' {2,}', ' ', clean_text)
        except Exception:
            clean_text = text  # fallback to original if strip fails

        # Step 1: Run ML model
        ml_results = None
        if self.enable_ml and self.ml_service:
            try:
                logger.info("\n" + "="*80)
                logger.info("🤖 HYBRID SERVICE: Calling ML model predict()...")
                logger.info("="*80)
                logger.info(f"Text to be sent - Length: {len(clean_text)} chars | Words: {len(clean_text.split())} | Max tokens: {max_length}")
                logger.info(f"Text preview (first 300 chars): {clean_text[:300]}...")
                
                ml_results = self.ml_service.predict(clean_text, max_length=max_length)
                
                if ml_results.get('success'):
                    logger.info("\n" + "="*80)
                    logger.info("✅ ML PREDICTION RECEIVED IN HYBRID SERVICE")
                    logger.info("="*80)
                    logger.info(f"Summary from ML: {ml_results['summary']}")
                    logger.info(f"Received {len(ml_results.get('clauses', []))} clause predictions")
                    logger.info("="*80 + "\n")
                else:
                    logger.warning(f"⚠️ ML prediction failed: {ml_results.get('error')}")
                    ml_results = None
            except Exception as e:
                logger.error(f"❌ ML prediction error: {e}", exc_info=True)
                ml_results = None
        
        # Step 2: Run regex detection (always)
        logger.info("📝 Running regex-based detection...")
        regex_results = regex_detection(clean_text)
        logger.info(f"✅ Regex detection complete: {regex_results['statistics']}")
        
        # Step 3: Merge and compare results
        if ml_results and ml_results.get('success'):
            hybrid_results = self._merge_predictions(ml_results, regex_results, clean_text)
        else:
            # ML not available, return regex results with metadata
            hybrid_results = self._format_regex_only_results(regex_results)
        
        return hybrid_results
    
    def _merge_predictions(self, ml_results: Dict, regex_results: Dict, text: str) -> Dict:
        """
        Merge ML and regex predictions with intelligent decision logic.
        
        Decision Matrix:
        ┌─────────────┬──────────────┬─────────────────┬──────────────────┐
        │ ML Predicts │ Regex Finds  │ ML Confidence   │ Final Decision   │
        ├─────────────┼──────────────┼─────────────────┼──────────────────┤
        │ Present     │ Present      │ Any             │ Present (✓✓)     │
        │ Present     │ Missing      │ >85%            │ Present (review) │
        │ Present     │ Missing      │ <85%            │ Missing (regex)  │
        │ Missing     │ Present      │ Any             │ Present (regex)  │
        │ Missing     │ Missing      │ Any             │ Missing (✓✓)     │
        │ Corrupted   │ Present      │ >70%            │ Corrupted        │
        │ Corrupted   │ Missing      │ Any             │ Missing (regex)  │
        └─────────────┴──────────────┴─────────────────┴──────────────────┘
        
        Args:
            ml_results: Results from ML model
            regex_results: Results from regex detection
            text: Original text (for metadata)
            
        Returns:
            Dict: Merged results with decision metadata
        """
        
        # Create lookup dictionaries for fast comparison
        # ML uses 'clause' field, Regex uses 'clause_key' field
        ml_clauses_map = {c['clause']: c for c in ml_results['clauses']}
        regex_clauses_map = {c['clause_key']: c for c in regex_results['clauses']}
        
        merged_clauses = []
        agreements = 0
        disagreements = 0
        ml_overrides = 0
        regex_priority = 0
        
        logger.info("\n" + "="*80)
        logger.info("📊 MERGING ML AND REGEX PREDICTIONS")
        logger.info("="*80)
        logger.debug(f"ML clauses: {len(ml_clauses_map)} | Regex clauses: {len(regex_clauses_map)}")
        
        # Process each clause (use ML's clause list as reference since it matches our 28 clauses)
        for clause_key in ml_clauses_map.keys():
            ml_clause = ml_clauses_map[clause_key]
            regex_clause = regex_clauses_map.get(clause_key, {})
            
            # Get predictions
            ml_status = ml_clause.get('status', 'Missing')
            ml_confidence = ml_clause.get('confidence', 0.0)
            regex_status = regex_clause.get('status', 'Missing')
            
            # Normalize status naming (ML uses 'Present', regex might use different format)
            ml_normalized = self._normalize_status(ml_status)
            regex_normalized = self._normalize_status(regex_status)
            
            # Decision logic
            decision_result = self._make_decision(
                ml_status=ml_normalized,
                ml_confidence=ml_confidence,
                regex_status=regex_normalized,
                clause_name=clause_key
            )
            
            final_status = decision_result['status']
            decision_source = decision_result['source']
            requires_review = decision_result['requires_review']
            
            # Track statistics
            if ml_normalized == regex_normalized:
                agreements += 1
            else:
                disagreements += 1
                logger.debug(f"  DISAGREEMENT [{clause_key}]: ML={ml_status} (conf={ml_confidence:.3f}) vs Regex={regex_status} -> Final Decision={final_status} from {decision_source}")
                
            if decision_source == 'ml_override':
                ml_overrides += 1
            elif decision_source == 'regex_priority':
                regex_priority += 1
            
            # Build merged clause result
            merged_clause = {
                'clause': clause_key,  # Use clause_key as the standard identifier
                'clause_name': regex_clause.get('clause_name', clause_key),  # Human-readable name
                'description': regex_clause.get('description'),
                'status': final_status,
                'confidence': self._calculate_confidence(
                    ml_confidence, 
                    ml_normalized == regex_normalized
                ),
                'requires_review': requires_review,
                
                # Include content and position data from regex if available
                'content': regex_clause.get('content'),
                'start_pos': regex_clause.get('start_pos'),
                'end_pos': regex_clause.get('end_pos'),
                
                # Source tracking (full transparency)
                'sources': {
                    'ml': {
                        'prediction': ml_status,
                        'confidence': ml_confidence,
                        'probabilities': ml_clause.get('probabilities', {})
                    },
                    'regex': {
                        'prediction': regex_status,
                        'matched': regex_status == 'Present',
                        'content': regex_clause.get('content')
                    },
                    'agreement': ml_normalized == regex_normalized,
                    'decision_source': decision_source
                }
            }
            
            merged_clauses.append(merged_clause)
        
        # Calculate final statistics
        present_count = sum(1 for c in merged_clauses if c['status'] == 'Present')
        missing_count = sum(1 for c in merged_clauses if c['status'] == 'Missing')
        corrupted_count = sum(1 for c in merged_clauses if c['status'] == 'Corrupted')
        review_count = sum(1 for c in merged_clauses if c['requires_review'])
        
        total_clauses = len(merged_clauses)
        agreement_rate = agreements / total_clauses if total_clauses > 0 else 0
        
        # Log final merge statistics
        logger.info("\n" + "="*80)
        logger.info("📊 MERGE STATISTICS")
        logger.info("="*80)
        logger.info(f"Total clauses analyzed: {total_clauses}")
        logger.info(f"Agreements between ML and Regex: {agreements}/{total_clauses} ({agreement_rate:.1%})")
        logger.info(f"Disagreements: {disagreements}/{total_clauses}")
        logger.info(f"ML Model overrides (high confidence): {ml_overrides}")
        logger.info(f"Regex priority decisions: {regex_priority}")
        logger.info(f"\nFinal Decision - Present: {present_count}, Missing: {missing_count}, Corrupted: {corrupted_count}")
        logger.info(f"Items requiring review: {review_count}")
        logger.info("="*80 + "\n")
        
        # Build comprehensive result
        result = {
            'success': True,
            'method': 'hybrid_ml_regex',
            'text_length': len(text),
            'word_count': len(text.split()),
            'clauses_analyzed': total_clauses,
            
            'clauses': merged_clauses,
            
            'statistics': {
                'total_clauses': total_clauses,
                'present': present_count,
                'missing': missing_count,
                'corrupted': corrupted_count,
                'requires_review': review_count,
                'completion_percentage': round((present_count / total_clauses) * 100, 2) if total_clauses > 0 else 0
            },
            
            # Hybrid-specific metadata
            'hybrid_metadata': {
                'ml_model_used': True,
                'regex_used': True,
                'total_agreements': agreements,
                'total_disagreements': disagreements,
                'agreement_rate': round(agreement_rate, 3),
                'ml_overrides': ml_overrides,
                'regex_priority_decisions': regex_priority,
                'model_checkpoint': self.ml_service.checkpoint_path if self.ml_service else None,
                'ml_confidence_thresholds': {
                    'high': self.ML_HIGH_CONFIDENCE_THRESHOLD,
                    'medium': self.ML_MEDIUM_CONFIDENCE_THRESHOLD,
                    'low': self.ML_LOW_CONFIDENCE_THRESHOLD
                }
            },
            
            # Include corrupted regions from regex (important for highlighting)
            'corrupted_regions': regex_results.get('corrupted_regions', []),
            
            'message': f"Hybrid analysis complete: {present_count} present, {missing_count} missing, "
                      f"{corrupted_count} corrupted | Agreement: {agreement_rate:.1%} | "
                      f"Review needed: {review_count}"
        }
        
        return result
    
    def _make_decision(self, 
                      ml_status: str, 
                      ml_confidence: float,
                      regex_status: str,
                      clause_name: str) -> Dict:
        """
        Apply decision logic to determine final clause status.
        
        Args:
            ml_status: ML prediction (Present/Missing/Corrupted)
            ml_confidence: ML confidence score (0-1)
            regex_status: Regex detection result
            clause_name: Name of the clause being decided
            
        Returns:
            Dict: Decision with status, source, and review flag
        """
        
        # Case 1: Both systems agree → High confidence consensus
        if ml_status == regex_status:
            return {
                'status': ml_status,
                'source': 'consensus',
                'requires_review': False
            }
        
        # Case 2: ML says Present, Regex says Missing
        if ml_status == 'Present' and regex_status == 'Missing':
            # If ML is very confident, flag for human review (ML might have caught something)
            if ml_confidence >= self.ML_HIGH_CONFIDENCE_THRESHOLD:
                return {
                    'status': 'Present',  # Trust ML but flag it
                    'source': 'ml_override',
                    'requires_review': True  # Human should verify
                }
            else:
                # ML not confident enough, trust regex
                return {
                    'status': 'Missing',
                    'source': 'regex_priority',
                    'requires_review': False
                }
        
        # Case 3: Regex says Present, ML says Missing → Trust regex (it's more reliable)
        if regex_status == 'Present' and ml_status == 'Missing':
            return {
                'status': 'Present',
                'source': 'regex_priority',
                'requires_review': False
            }
        
        # Case 4: ML says Corrupted
        if ml_status == 'Corrupted':
            # If regex confirms presence and ML is confident about corruption
            if regex_status == 'Present' and ml_confidence >= self.ML_MEDIUM_CONFIDENCE_THRESHOLD:
                return {
                    'status': 'Corrupted',
                    'source': 'ml_corruption_detected',
                    'requires_review': True
                }
            else:
                # Not confident enough, use regex result
                return {
                    'status': regex_status,
                    'source': 'regex_priority',
                    'requires_review': False
                }
        
        # Case 5: Regex says Corrupted
        if regex_status == 'Corrupted':
            # Trust regex corruption detection
            return {
                'status': 'Corrupted',
                'source': 'regex_corruption',
                'requires_review': True
            }
        
        # Default fallback: trust regex (conservative approach)
        return {
            'status': regex_status,
            'source': 'regex_fallback',
            'requires_review': True  # Flag unusual cases
        }
    
    def _calculate_confidence(self, ml_confidence: float, agreement: bool) -> float:
        """
        Calculate overall confidence based on ML confidence and agreement.
        
        Logic:
        - If both agree: Boost confidence (min 0.85)
        - If disagree: Lower confidence relative to ML
        
        Args:
            ml_confidence: ML model's confidence
            agreement: Whether ML and regex agree
            
        Returns:
            float: Adjusted confidence score
        """
        if agreement:
            # Both agree → high confidence
            return max(ml_confidence, 0.85)
        else:
            # Disagree → reduce confidence
            return min(ml_confidence * 0.7, 0.75)
    
    def _normalize_status(self, status: str) -> str:
        """
        Normalize status strings from different systems.
        
        Args:
            status: Status string from ML or regex
            
        Returns:
            str: Normalized status (Present/Missing/Corrupted)
        """
        if not status:
            return 'Missing'
        
        status_lower = str(status).lower()
        
        if 'present' in status_lower:
            return 'Present'
        elif 'corrupt' in status_lower:
            return 'Corrupted'
        elif 'missing' in status_lower or 'not' in status_lower:
            return 'Missing'
        else:
            return status  # Return as-is if unknown
    
    def _format_regex_only_results(self, regex_results: Dict) -> Dict:
        """
        Format results when ML is not available (fallback to regex only).
        
        Args:
            regex_results: Results from regex detection
            
        Returns:
            Dict: Formatted results with metadata indicating ML was not used
        """
        result = {
            'success': True,
            'method': 'regex_only',
            'text_length': regex_results.get('text_length', 0),
            'word_count': regex_results.get('word_count', 0),
            'clauses_analyzed': regex_results.get('clauses_analyzed', 28),
            'clauses': regex_results.get('clauses', []),
            'statistics': regex_results.get('statistics', {}),
            'corrupted_regions': regex_results.get('corrupted_regions', []),
            'hybrid_metadata': {
                'ml_model_used': False,
                'regex_used': True,
                'ml_unavailable_reason': 'Model not loaded or disabled'
            },
            'message': regex_results.get('message', 'Analysis complete (regex only)')
        }
        
        return result


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

# Global service instance (lazy loaded)
_hybrid_service_instance = None


def get_hybrid_service() -> HybridClauseDetectionService:
    """
    Get or create the global hybrid service instance.
    
    Returns:
        HybridClauseDetectionService: Shared service instance
    """
    global _hybrid_service_instance
    
    if _hybrid_service_instance is None:
        _hybrid_service_instance = HybridClauseDetectionService()
    
    return _hybrid_service_instance


def analyze_with_hybrid_detection(text: str, max_length: int = 512) -> Dict:
    """
    Convenience function for hybrid clause detection.
    
    Args:
        text: Legal document text
        max_length: Max tokens for ML model
        
    Returns:
        Dict: Hybrid analysis results
    """
    service = get_hybrid_service()
    return service.analyze(text, max_length=max_length)
