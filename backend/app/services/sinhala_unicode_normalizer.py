"""
Sinhala Unicode Normalizer

Handles proper formation of Sinhala conjunct consonants by inserting
Zero Width Joiner (ZWJ - U+200D) characters where needed.

Problem:
When text is extracted from PDFs or translated, the ZWJ character is often missing,
causing conjunct consonants to display incorrectly:
- Without ZWJ: ප්ර (broken) 
- With ZWJ: ප්‍ර (proper conjunct)

This module normalizes Sinhala text to ensure proper conjunct formation.
"""

import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# U+200D - Zero Width Joiner
ZWJ = '\u200D'

# Sinhala Virama (්) - U+0DCA
VIRAMA = '\u0DCA'

# Sinhala consonants that form conjuncts with following consonant
SINHALA_CONSONANTS = (
    'ක', 'ඛ', 'ග', 'ඝ', 'ඞ',  # Velars
    'ච', 'ඡ', 'ජ', 'ඣ', 'ඤ',  # Palatals
    'ට', 'ඨ', 'ඩ', 'ඪ', 'ණ',  # Retroflexes
    'ත', 'ථ', 'ද', 'ධ', 'න',  # Dentals
    'ප', 'ඵ', 'බ', 'භ', 'ම',  # Labials
    'ය', 'ර', 'ල', 'ව',        # Semi-vowels
    'ශ', 'ෂ', 'ස', 'හ', 'ළ', 'ෆ'  # Sibilants and others
)

# Characters that commonly follow virama to form conjuncts (need ZWJ)
CONJUNCT_FORMING_CHARS = ('ර', 'ය', 'ව')

# Build regex pattern for consonant + virama + conjunct-forming char (missing ZWJ)
# Match: Consonant + ් + [ර|ය|ව] where ZWJ is missing
MISSING_ZWJ_PATTERN = re.compile(
    f'([{"".join(SINHALA_CONSONANTS)}]){VIRAMA}(?!{ZWJ})([{"".join(CONJUNCT_FORMING_CHARS)}])'
)


def normalize_sinhala_unicode(text: str) -> str:
    """
    Normalize Sinhala text by inserting ZWJ characters where needed
    to form proper conjunct consonants.
    
    Args:
        text: Input text that may contain improperly formed Sinhala conjuncts
        
    Returns:
        Normalized text with proper ZWJ insertion
        
    Examples:
        "ප්රජාතන්ත්රවාදී" -> "ප්‍රජාතන්ත්‍රවාදී"
        "ශ්රී ලංකාව" -> "ශ්‍රී ලංකාව"
        "ශ්රේෂ්ඨාධිකරණයේ" -> "ශ්‍රේෂ්ඨාධිකරණයේ"
    """
    if not text or not isinstance(text, str):
        return text
    
    # Check if text contains Sinhala characters
    if not any('\u0D80' <= c <= '\u0DFF' for c in text):
        return text
    
    # Insert ZWJ where missing
    # Pattern: consonant + virama + conjunct_char (without ZWJ between virama and char)
    # Replace with: consonant + virama + ZWJ + conjunct_char
    normalized = MISSING_ZWJ_PATTERN.sub(rf'\1{VIRAMA}{ZWJ}\2', text)
    
    return normalized


def normalize_sinhala_unicode_with_stats(text: str) -> Tuple[str, int]:
    """
    Normalize Sinhala Unicode and return statistics.
    
    Args:
        text: Input text
        
    Returns:
        Tuple of (normalized_text, number_of_fixes_applied)
    """
    if not text or not isinstance(text, str):
        return text, 0
    
    # Count matches before normalization
    matches = MISSING_ZWJ_PATTERN.findall(text)
    fix_count = len(matches)
    
    if fix_count > 0:
        normalized = MISSING_ZWJ_PATTERN.sub(rf'\1{VIRAMA}{ZWJ}\2', text)
        logger.debug(f"Sinhala Unicode normalization: {fix_count} ZWJ insertions")
        return normalized, fix_count
    
    return text, 0


# ============================================================================
# COMMON SINHALA LEGAL TERMS WITH PROPER UNICODE
# These are for direct replacement of known problematic terms
# ============================================================================

SINHALA_LEGAL_TERM_CORRECTIONS = {
    # Country name
    "ශ්රී ලංකා": "ශ්‍රී ලංකා",
    "ශ්රීලංකා": "ශ්‍රීලංකා",
    "ශ්රී ලංකාව": "ශ්‍රී ලංකාව",
    
    # Supreme Court
    "ශ්රේෂ්ඨාධිකරණය": "ශ්‍රේෂ්ඨාධිකරණය",
    "ශ්රේෂ්ඨාධිකරණයේ": "ශ්‍රේෂ්ඨාධිකරණයේ",
    "ශ්රේෂ්ඨාධිකරණයේදී": "ශ්‍රේෂ්ඨාධිකරණයේදී",
    "ශ්රේෂ්ඨාධිකරණයට": "ශ්‍රේෂ්ඨාධිකරණයට",
    
    # Democratic Socialist Republic
    "ප්රජාතන්ත්රවාදී": "ප්‍රජාතන්ත්‍රවාදී",
    "ප්රජාතාන්ත්රික": "ප්‍රජාතාන්ත්‍රික",
    "ප්රජාතන්ත්රවාදය": "ප්‍රජාතන්ත්‍රවාදය",
    
    # Constitution
    "ව්යවස්ථාව": "ව්‍යවස්ථාව",
    "ව්යවස්ථාවේ": "ව්‍යවස්ථාවේ",
    "ව්යවස්ථාදායක": "ව්‍යවස්ථාදායක",
    
    # Fundamental Rights
    "මූලික අයිතිවාසිකම්": "මූලික අයිතිවාසිකම්",
    "ප්රාථමික": "ප්‍රාථමික",
    
    # Appeal
    "අභියාචනය": "අභියාචනය",
    "අභියාචනාධිකරණය": "අභියාචනාධිකරණය",
    
    # Court terms
    "විනිශ්චයකරු": "විනිශ්චයකරු",
    "ප්රධාන": "ප්‍රධාන",
    "ප්රතිවාදී": "ප්‍රතිවාදී",
    "ප්රතික්ෂේප": "ප්‍රතික්ෂේප",
    
    # Other common legal terms
    "සම්ප්රදාය": "සම්ප්‍රදාය",
    "විප්රතිපත්ති": "විප්‍රතිපත්ති",
    "ස්වාධීන": "ස්වාධීන",
    "ප්රමාණවත්": "ප්‍රමාණවත්",
    "ක්රියාත්මක": "ක්‍රියාත්මක",
    "ක්රියාමාර්ග": "ක්‍රියාමාර්ග",
    "ක්රියාකාරී": "ක්‍රියාකාරී",
    "ප්රකාශන": "ප්‍රකාශන",
    "ප්රකාශය": "ප්‍රකාශය",
    "ප්රකාශනය": "ප්‍රකාශනය",
    "ව්යාපාර": "ව්‍යාපාර",
    "ව්යාජ": "ව්‍යාජ",
    "ස්ථාවර": "ස්ථාවර",
    "ස්වභාවික": "ස්වභාවික",
    "ස්වෛරී": "ස්වෛරී",
    "ප්රතිපත්ති": "ප්‍රතිපත්ති",
    "ප්රතිපාදන": "ප්‍රතිපාදන",
    "ප්රතිඵල": "ප්‍රතිඵල",
    "ප්රතිසංස්කරණ": "ප්‍රතිසංස්කරණ",
    "ප්රතිව්යුහගත": "ප්‍රතිව්‍යුහගත",
    "ශ්රමිකයා": "ශ්‍රමිකයා",
    "ශ්රමිකයෝ": "ශ්‍රමිකයෝ",
    "ශ්රමය": "ශ්‍රමය",
}


def apply_legal_term_corrections(text: str) -> str:
    """
    Apply known legal term corrections for Sinhala.
    These are direct string replacements for commonly problematic terms.
    
    Args:
        text: Input text
        
    Returns:
        Text with corrected legal terms
    """
    if not text or not isinstance(text, str):
        return text
    
    corrected = text
    for incorrect, correct in SINHALA_LEGAL_TERM_CORRECTIONS.items():
        if incorrect in corrected:
            corrected = corrected.replace(incorrect, correct)
    
    return corrected


def full_sinhala_normalization(text: str) -> Tuple[str, dict]:
    """
    Perform full Sinhala Unicode normalization including:
    1. Regex-based ZWJ insertion for all conjuncts
    2. Known legal term corrections
    
    Args:
        text: Input text
        
    Returns:
        Tuple of (normalized_text, stats_dict)
    """
    if not text or not isinstance(text, str):
        return text, {"zwj_fixes": 0, "term_fixes": 0}
    
    # Step 1: General ZWJ normalization
    text_after_zwj, zwj_count = normalize_sinhala_unicode_with_stats(text)
    
    # Step 2: Apply known legal term corrections
    text_before_terms = text_after_zwj
    text_after_terms = apply_legal_term_corrections(text_after_zwj)
    
    # Count term fixes
    term_fixes = sum(1 for inc in SINHALA_LEGAL_TERM_CORRECTIONS if inc in text_before_terms)
    
    stats = {
        "zwj_fixes": zwj_count,
        "term_fixes": term_fixes
    }
    
    if zwj_count > 0 or term_fixes > 0:
        logger.info(f"Sinhala normalization: {zwj_count} ZWJ insertions, {term_fixes} term corrections")
    
    return text_after_terms, stats


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def has_sinhala_text(text: str) -> bool:
    """Check if text contains Sinhala characters."""
    if not text:
        return False
    return any('\u0D80' <= c <= '\u0DFF' for c in text)


def debug_unicode(text: str) -> str:
    """
    Generate a debug representation showing Unicode code points.
    Useful for debugging character encoding issues.
    
    Args:
        text: Input text
        
    Returns:
        String showing each character and its code point
    """
    result = []
    for char in text:
        code_point = hex(ord(char))
        if char == ZWJ:
            result.append(f"[ZWJ:{code_point}]")
        elif char == VIRAMA:
            result.append(f"[්:{code_point}]")
        else:
            result.append(f"{char}[{code_point}]")
    return "".join(result)
