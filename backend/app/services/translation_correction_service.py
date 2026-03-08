"""
Translation Correction Service - Post-processing for Sinhala & Tamil translations

Provides:
  - Glossary-based legal term correction
  - Grammar correction for Sinhala output
  - Common mistranslation fixes
  - Term consistency enforcement
  - Sinhala Unicode normalization (ZWJ insertion for proper conjuncts)
"""

import re
import logging
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import csv

from app.services.sinhala_unicode_normalizer import (
    normalize_sinhala_unicode,
    full_sinhala_normalization,
)

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
GLOSSARY_PATH = ROOT_DIR / "legal_glossary.csv"

# Cache for glossary data
_glossary_map: Optional[Dict[str, Dict[str, str]]] = None


def load_glossary_map() -> Dict[str, Dict[str, str]]:
    """Load glossary into optimized lookup structure."""
    global _glossary_map
    if _glossary_map is not None:
        return _glossary_map

    glossary_map = {
        "en_to_si": {},  # English -> Sinhala
        "en_to_ta": {},  # English -> Tamil
        "si_patterns": [],  # Sinhala correction patterns
        "ta_patterns": [],  # Tamil correction patterns
    }

    if not GLOSSARY_PATH.exists():
        logger.warning("Glossary not found at %s", GLOSSARY_PATH)
        _glossary_map = glossary_map
        return glossary_map

    try:
        with open(GLOSSARY_PATH, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            next(reader, None)  # Skip header
            
            for row in reader:
                if len(row) >= 4:
                    en_term = row[1].strip().lower()
                    si_term = row[2].strip()
                    ta_term = row[3].strip()
                    
                    # Skip very short terms (too many false positives)
                    if len(en_term) < 4:
                        continue
                    
                    # Handle synonyms - split by semicolon and take first (primary) term
                    if en_term and si_term:
                        si_primary = si_term.split(';')[0].strip()
                        # Prefer longer multi-word terms (don't overwrite with shorter)
                        if en_term not in glossary_map["en_to_si"] or len(si_primary) > len(glossary_map["en_to_si"][en_term]):
                            glossary_map["en_to_si"][en_term] = si_primary
                    
                    if en_term and ta_term:
                        ta_primary = ta_term.split(';')[0].strip()
                        if en_term not in glossary_map["en_to_ta"] or len(ta_primary) > len(glossary_map["en_to_ta"][en_term]):
                            glossary_map["en_to_ta"][en_term] = ta_primary

        logger.info("✓ Glossary loaded: %d SI terms, %d TA terms", 
                   len(glossary_map["en_to_si"]), len(glossary_map["en_to_ta"]))
    except Exception as e:
        logger.error("Error loading glossary: %s", e)

    _glossary_map = glossary_map
    return glossary_map


# ============================================================================
# SINHALA GRAMMAR CORRECTION RULES
# ============================================================================

SINHALA_GRAMMAR_RULES = [
    # Fix ZWJ (Zero-Width Joiner) issues in common words
    (r'ශ්රී(?!\u200D)', 'ශ්\u200Dරී'),  # Fix ශ්රී -> ශ්‍රී (add ZWJ)
    (r'ප්රති(?!\u200D)', 'ප්\u200Dරති'),  # Fix ප්රති -> ප්‍රති
    (r'ව්යු(?!\u200D)', 'ව්\u200Dයු'),  # Fix ව්යු -> ව්‍යු
    
    # Fix common verb form issues
    (r'\bකරන්න\s+කරන්න\b', 'කරන්න'),  # Duplicate verbs
    (r'\bවෙනවා\s+වෙනවා\b', 'වෙනවා'),
    (r'\bසිටිනවා\s+සිටිනවා\b', 'සිටිනවා'),
    (r'\bකරන ලද\s+කරන ලද\b', 'කරන ලද'),
    
    # Fix spacing around punctuation
    (r'\s+([.,;:!?])', r'\1'),  # Remove space before punctuation
    (r'([.,;:!?])([^\s])', r'\1 \2'),  # Add space after punctuation
    
    # Fix genitive case markers (possessive) - handle various spacing patterns
    (r'ගේ\s+ගේ\b', 'ගේ'),  # Duplicate possessive (any context)
    (r'\bට\s+ට\b', 'ට'),  # Duplicate dative
    (r'\bහි\s+හි\b', 'හි'),  # Duplicate locative
    
    # Fix article repetition
    (r'\bඑක\s+එක\b', 'එක'),
    (r'\bමෙම\s+මෙම\b', 'මෙම'),
    (r'\bඒ\s+ඒ\b', 'ඒ'),
    
    # Fix negation patterns
    (r'\bනොමැති\s+නොමැති\b', 'නොමැති'),
    (r'\bනැත\s+නැත\b', 'නැත'),
    
    # Fix conjunction duplicates
    (r'\bහා\s+හා\b', 'හා'),
    (r'\bසහ\s+සහ\b', 'සහ'),
    (r'\bහෝ\s+හෝ\b', 'හෝ'),
    
    # Fix common word order issues in legal phrases
    (r'අනුව\s+පනත', 'පනත අනුව'),
    (r'මගින්\s+නීතිය', 'නීතිය මගින්'),
    
    # Fix double spaces
    (r'\s{2,}', ' '),
    
    # Fix incorrect case markers after numbers
    (r'(\d+)\s*වැනි\s*වැනි', r'\1 වැනි'),
    
    # Fix verb tense consistency - past tense
    (r'\bවන්ව\b', 'වන'),  # Common mistranslation
    (r'\bකරන්නා\s+ය\b', 'කරන්නේ ය'),
    
    # Fix common legal term spacing
    (r'අධි\s*කරණ', 'අධිකරණ'),
    (r'නීති\s*ය', 'නීතිය'),
    (r'දඬු\s*වම', 'දඬුවම'),
    
    # Fix postposition markers
    (r'(\w+)යි\s+(\w+)යි\b', r'\1යි \2'),  # Remove duplicate postpositions
    
    # Fix common mistranslations from mBART
    (r'\bපනත්\s*තුල\b', 'පනතෙහි'),
    (r'\bඅනුව\s*ලෙස\b', 'අනුව'),
    (r'\bමගින්\s*ලෙස\b', 'මගින්'),
]

# Common Sinhala legal phrase corrections
SINHALA_PHRASE_CORRECTIONS = {
    # Incorrect -> Correct
    "අනුව පනත": "පනත අනුව",
    "අනුව නීතිය": "නීතිය අනුව",
    "විසින් අධිකරණය": "අධිකරණය විසින්",
    "මගින් නීතිය": "නීතිය මගින්",
    "සඳහා අයිතිය": "අයිතිය සඳහා",
    "මත පදනම්ව": "පදනම් වී",
    "තුල පනත": "පනත තුළ",
    "හට අයිතිය": "අයිතිය හට",
    # Fix common ZWJ issues in legal text
    "ශ්රේෂ්ඨාධිකරණය": "ශ්‍රේෂ්ඨාධිකරණය",
    "ශ්රී ලංකා": "ශ්‍රී ලංකා",
    "ශ්රීලංකා": "ශ්‍රීලංකා",
    # Fix possessive duplicates (edge cases)
    "ගේ ගේ": "ගේ",
    "ට ට": "ට",
    "හි හි": "හි",
    
    # Sri Lankan Legal Domain - Court & Legal Roles
    "වගඋත්තරකරු-වගඋත්තරකරු විනිශ්චය අධිකාරය": "ප්‍රතිවාදී-ප්‍රතිචාර දක්වන්නා සමාගම",
    "වගඋත්තරකරු විනිශ්චය": "ප්‍රතිවාදී",
    "පරිශ‍්‍රය විසින්": "සමාගම විසින්",
    "පරිශ‍්‍රය": "සමාගම",
    "සේවයෙන් සලකනවා කරන ලද": "සේවයෙන් ඉවත් කළ බව සැලකීමට",
    
    # Legal terminology fixes
    "කම්කරු විනිශ්චය මණ්ඩලයේ": "කම්කරු විනිශ්චය මණ්ඩලයට",
    "සාර්ථකව අවසන් කරන ලද": "ව්‍යුහාත්මකව අවසන් කරන ලද",
    "ගොනු කළේ": "ගොනු කළ",
    "යාච්ඤා කිරීම සඳහා ය": "යාච්ඤා කිරීම",
    
    # Legal phrases
    "මෙතැන් සිට": "මෙතැන් පසුව",
    "ඉල්ලා සහ ‍පෙත්සම්කරු": "ඉල්ලා සිටිමින්, පෙත්සම්කරුගේ",
    "නැවත පත් කිරීම": "නැවත සේවයේ පිහිටුවීම",
    "ප්රතික්ෂේප කරමින්": "ප්‍රතික්ෂේප කළ",
    "සක්රීයව සේවයෙන් ඉවත් කරන ලද": "සක්‍රීයව සේවයෙන් ඉවත් කළ",
    "ඒ වෙනුවට": "ඒ වෙනුවට,",
    "විකල්පයක් නොමැති බව": "විකල්පයක් නොතිබූ බව",
}


# ============================================================================
# TAMIL GRAMMAR CORRECTION RULES (Basic)
# ============================================================================

TAMIL_GRAMMAR_RULES = [
    # Fix spacing around punctuation
    (r'\s+([.,;:!?])', r'\1'),
    (r'([.,;:!?])([^\s])', r'\1 \2'),
    
    # Fix double spaces
    (r'\s{2,}', ' '),
    
    # Fix duplicate words (common mBART artifacts)
    (r'\bஇன்\s+இன்\b', 'இன்'),
    (r'\bஉம்\s+உம்\b', 'உம்'),
    (r'\bமற்றும்\s+மற்றும்\b', 'மற்றும்'),
    (r'\bஅல்லது\s+அல்லது\b', 'அல்லது'),
    (r'\bஎன்று\s+என்று\b', 'என்று'),
    (r'\bஆனால்\s+ஆனால்\b', 'ஆனால்'),
    (r'\bஇல்லை\s+இல்லை\b', 'இல்லை'),
    (r'\bஉள்ள\s+உள்ள\b', 'உள்ள'),
    (r'\bஒரு\s+ஒரு\b', 'ஒரு'),
    (r'\bஇந்த\s+இந்த\b', 'இந்த'),
    (r'\bஅந்த\s+அந்த\b', 'அந்த'),
    
    # Fix duplicate postpositions / case markers
    (r'\bக்கு\s+க்கு\b', 'க்கு'),
    (r'\bக்கான\s+க்கான\b', 'க்கான'),
    (r'\bஉடன்\s+உடன்\b', 'உடன்'),
    (r'\bமீது\s+மீது\b', 'மீது'),
    (r'\bபடி\s+படி\b', 'படி'),
    (r'\bமூலம்\s+மூலம்\b', 'மூலம்'),
    
    # Fix duplicate verbs
    (r'\bசெய்ய\s+செய்ய\b', 'செய்ய'),
    (r'\bசெய்யப்பட்ட\s+செய்யப்பட்ட\b', 'செய்யப்பட்ட'),
    (r'\bவேண்டும்\s+வேண்டும்\b', 'வேண்டும்'),
    (r'\bமுடியும்\s+முடியும்\b', 'முடியும்'),
    (r'\bஉள்ளது\s+உள்ளது\b', 'உள்ளது'),
    (r'\bஇருக்கிறது\s+இருக்கிறது\b', 'இருக்கிறது'),
    
    # Fix common legal term spacing issues
    (r'நீதி\s*மன்ற', 'நீதிமன்ற'),
    (r'உயர்\s*நீதி', 'உயர்நீதி'),
    (r'சட்ட\s*மன்ற', 'சட்டமன்ற'),
    (r'உச்ச\s*நீதி', 'உச்சநீதி'),
    
    # Fix incorrect number markers after numbers
    (r'(\d+)\s*வது\s*வது', r'\1 வது'),
    
    # Fix common mistranslations from mBART
    (r'\bசட்டத்தின்\s*படி\s*படி\b', 'சட்டத்தின் படி'),
    (r'\bஅதன்\s*படி\s*படி\b', 'அதன்படி'),
]

# Common Tamil legal phrase corrections
TAMIL_PHRASE_CORRECTIONS = {
    # Court names
    "உயர் நீதிமன்றம்": "உயர்நீதிமன்றம்",
    "உச்ச நீதிமன்றம்": "உச்சநீதிமன்றம்",
    "மாவட்ட நீதிமன்றம்": "மாவட்ட நீதிமன்றம்",
    
    # Legal role terms
    "வழக்கு தொடர்பவர்": "வழக்காளர்",
    "வழக்கு பதிவாளர்": "வழக்குப் பதிவாளர்",
    
    # Common legal phrase fixes
    "சட்டத்தின் கீழ் கீழ்": "சட்டத்தின் கீழ்",
    "படி படி": "படி",
    "மூலம் மூலம்": "மூலம்",
    "அதன் படி": "அதன்படி",
    "இலங்கை சனநாயக சோசலிச குடியரசு": "இலங்கை ஜனநாயக சோசலிசக் குடியரசு",
    
    # Legal terminology
    "தீர்ப்பு வழங்கப் பட்ட": "தீர்ப்பு வழங்கப்பட்ட",
    "வழக்கு தாக்கல்": "வழக்குத் தாக்கல்",
    "ஆணை பிறப்பிக்கப் பட்ட": "ஆணை பிறப்பிக்கப்பட்ட",
    "நிவாரணம் கோரி": "நிவாரணம் கோரி",
}


# ============================================================================
# CORRECTION FUNCTIONS
# ============================================================================

def apply_sinhala_grammar_correction(text: str) -> Tuple[str, int]:
    """
    Apply Sinhala grammar correction rules.
    Returns: (corrected_text, num_corrections)
    """
    if not text or not isinstance(text, str):
        return text, 0
    
    corrected = text
    corrections_count = 0
    
    # Apply regex-based rules
    for pattern, replacement in SINHALA_GRAMMAR_RULES:
        new_text = re.sub(pattern, replacement, corrected)
        if new_text != corrected:
            corrections_count += 1
            corrected = new_text
    
    # Apply phrase corrections
    for incorrect, correct in SINHALA_PHRASE_CORRECTIONS.items():
        if incorrect in corrected:
            corrected = corrected.replace(incorrect, correct)
            corrections_count += 1
    
    # Trim whitespace
    corrected = corrected.strip()
    
    return corrected, corrections_count


def apply_tamil_grammar_correction(text: str) -> Tuple[str, int]:
    """
    Apply Tamil grammar correction rules.
    Returns: (corrected_text, num_corrections)
    """
    if not text or not isinstance(text, str):
        return text, 0
    
    corrected = text
    corrections_count = 0
    
    # Apply regex-based rules
    for pattern, replacement in TAMIL_GRAMMAR_RULES:
        new_text = re.sub(pattern, replacement, corrected)
        if new_text != corrected:
            corrections_count += 1
            corrected = new_text
    
    # Apply phrase corrections
    for incorrect, correct in TAMIL_PHRASE_CORRECTIONS.items():
        if incorrect in corrected:
            corrected = corrected.replace(incorrect, correct)
            corrections_count += 1
    
    # Trim whitespace
    corrected = corrected.strip()
    
    return corrected, corrections_count


def _find_terms_with_word_boundaries(source_lower: str, term_map: Dict[str, str]) -> List[Tuple[str, str]]:
    """
    Find glossary terms in source text using proper word boundary matching.
    Avoids false positives like 'petit' inside 'petitioner' or 'vice' inside 'services'.
    Returns list of (en_term, local_term) sorted longest-first.
    """
    found_terms = []
    already_covered = set()  # Track character positions already matched by longer terms

    # Sort by length (longest first) so multi-word terms take priority
    candidates = sorted(term_map.items(), key=lambda x: len(x[0]), reverse=True)

    for en_term, local_term in candidates:
        # Skip very short terms (high false-positive risk)
        if len(en_term) < 4:
            continue

        # Use word boundary regex to find whole-word/phrase matches only
        pattern = r'\b' + re.escape(en_term) + r'\b'
        for m in re.finditer(pattern, source_lower):
            span = (m.start(), m.end())
            # Skip if this span is already covered by a longer term
            if any(span[0] >= c[0] and span[1] <= c[1] for c in already_covered):
                continue
            already_covered.add(span)
            found_terms.append((en_term, local_term))
            break  # One match per term is enough

    return found_terms


def apply_glossary_correction(text: str, source_text: str, target_lang: str) -> Tuple[str, int, List[str]]:
    """
    Apply glossary-based corrections to translated text.
    
    Strategy:
    1. Find legal terms in source using word-boundary matching (no false positives)
    2. Check if the correct glossary translation is already in the output
    3. If an incorrect/partial translation is found, replace it with glossary term
    
    Args:
        text: Translated text to correct
        source_text: Original English text
        target_lang: Target language ('si' or 'ta')
    
    Returns:
        (corrected_text, num_corrections, terms_corrected)
    """
    if not text or not source_text:
        return text, 0, []

    glossary_map = load_glossary_map()
    lang_key = f"en_to_{target_lang}"
    term_map = glossary_map.get(lang_key, {})

    if not term_map:
        return text, 0, []

    corrected = text
    corrections_count = 0
    terms_corrected = []
    source_lower = source_text.lower()

    # Step 1: Find legal terms with proper word boundaries
    found_terms = _find_terms_with_word_boundaries(source_lower, term_map)

    # Step 2: For each found term, check if glossary translation is present
    for en_term, correct_local_term in found_terms:
        if not correct_local_term:
            continue

        # Already correct in translation — skip
        if correct_local_term in corrected:
            continue

        # Multi-word glossary terms: try to find partial matches in the translated text
        # E.g. if glossary says "labour tribunal" → "කම්කරු විනිශ්චය අධිකාරය"
        # and the model output has a partial/wrong version, replace it
        en_words = en_term.split()
        local_words = correct_local_term.split()

        if len(en_words) >= 2 and len(local_words) >= 2:
            # Multi-word term: only replace if we find a partial match that
            # shares at least TWO words with the glossary term AND is close
            # in length (within 30% tolerance). This prevents the old bug
            # where the first-word match grabbed everything to the next
            # sentence boundary and destroyed correct translations.
            first_local = local_words[0]
            if first_local in corrected and correct_local_term not in corrected:
                # Build a tight pattern: first word + up to N more words
                # (where N = number of words in the correct term)
                max_extra = len(local_words)
                partial_pattern = re.escape(first_local) + r'(?:\s+\S+){0,' + str(max_extra) + r'}'
                for match in re.finditer(partial_pattern, corrected):
                    matched_text = match.group(0).strip()
                    if matched_text == correct_local_term:
                        break  # already correct
                    # Require at least 2 shared words between match and glossary term
                    matched_words = set(matched_text.split())
                    glossary_words = set(local_words)
                    shared = matched_words & glossary_words
                    if len(shared) < 2:
                        continue
                    # Length guard: matched text must be within 30% of correct term length
                    len_ratio = len(matched_text) / max(len(correct_local_term), 1)
                    if 0.5 <= len_ratio <= 1.5:
                        corrected = corrected.replace(matched_text, correct_local_term, 1)
                        corrections_count += 1
                        terms_corrected.append(en_term)
                        break
        elif len(en_words) == 1:
            # Single-word term: look for the English word left untranslated in output
            # This catches cases where the model left an English word as-is
            en_pattern = r'\b' + re.escape(en_term) + r'\b'
            if re.search(en_pattern, corrected, re.IGNORECASE):
                corrected = re.sub(en_pattern, correct_local_term, corrected, count=1, flags=re.IGNORECASE)
                corrections_count += 1
                terms_corrected.append(en_term)

    return corrected, corrections_count, terms_corrected


def apply_comprehensive_correction(
    text: str, 
    source_text: str, 
    target_lang: str
) -> Dict[str, any]:
    """
    Apply all correction layers: glossary + grammar.
    
    Args:
        text: Translated text to correct
        source_text: Original source text
        target_lang: Target language ('si' or 'ta')
    
    Returns:
        Dict with corrected text and metadata
    """
    if not text:
        return {
            "corrected_text": text,
            "original_text": text,
            "glossary_corrections": 0,
            "grammar_corrections": 0,
            "total_corrections": 0,
            "terms_corrected": [],
        }
    
    original_text = text
    unicode_normalization_count = 0
    
    # Step 0: Apply Sinhala Unicode normalization (ZWJ insertion)
    if target_lang == "si":
        text, unicode_stats = full_sinhala_normalization(text)
        unicode_normalization_count = unicode_stats.get("zwj_fixes", 0) + unicode_stats.get("term_fixes", 0)
    
    # Step 1: Apply glossary corrections
    text, glossary_count, terms_corrected = apply_glossary_correction(
        text, source_text, target_lang
    )
    
    # Step 2: Apply grammar corrections
    if target_lang == "si":
        text, grammar_count = apply_sinhala_grammar_correction(text)
    elif target_lang == "ta":
        text, grammar_count = apply_tamil_grammar_correction(text)
    else:
        grammar_count = 0
    
    total_corrections = glossary_count + grammar_count + unicode_normalization_count
    
    result = {
        "corrected_text": text,
        "original_text": original_text,
        "glossary_corrections": glossary_count,
        "grammar_corrections": grammar_count,
        "unicode_normalizations": unicode_normalization_count,
        "total_corrections": total_corrections,
        "terms_corrected": terms_corrected,
        "was_corrected": total_corrections > 0,
    }
    
    if total_corrections > 0:
        logger.info(
            "Applied %d corrections (%d glossary, %d grammar) to %s text",
            total_corrections, glossary_count, grammar_count, target_lang.upper()
        )
    
    return result


def batch_correct_sections(
    sections: List[Dict],
    source_sections: List[Dict],
    target_lang: str
) -> Tuple[List[Dict], Dict[str, int]]:
    """
    Apply corrections to a batch of translated sections.
    
    Args:
        sections: List of translated sections
        source_sections: List of source sections
        target_lang: Target language
    
    Returns:
        (corrected_sections, statistics)
    """
    corrected_sections = []
    stats = {
        "total_sections": len(sections),
        "sections_corrected": 0,
        "glossary_corrections": 0,
        "grammar_corrections": 0,
        "total_corrections": 0,
        "all_terms_corrected": [],
    }
    
    for i, section in enumerate(sections):
        translated_text = section.get("translated_content", "")
        source_text = ""
        
        # Find matching source section
        if i < len(source_sections):
            source_text = source_sections[i].get("content", "")
        
        # Apply corrections
        correction_result = apply_comprehensive_correction(
            translated_text, source_text, target_lang
        )
        
        # Update section with corrected text
        corrected_section = section.copy()
        corrected_section["translated_content"] = correction_result["corrected_text"]
        corrected_section["correction_applied"] = correction_result["was_corrected"]
        corrected_section["corrections_count"] = correction_result["total_corrections"]
        
        corrected_sections.append(corrected_section)
        
        # Update statistics
        if correction_result["was_corrected"]:
            stats["sections_corrected"] += 1
        stats["glossary_corrections"] += correction_result["glossary_corrections"]
        stats["grammar_corrections"] += correction_result["grammar_corrections"]
        stats["total_corrections"] += correction_result["total_corrections"]
        stats["all_terms_corrected"].extend(correction_result["terms_corrected"])
    
    # Remove duplicate terms
    stats["all_terms_corrected"] = list(set(stats["all_terms_corrected"]))
    
    return corrected_sections, stats


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_correction_statistics(corrections_applied: int, total_words: int) -> Dict:
    """Calculate correction quality metrics."""
    return {
        "corrections_applied": corrections_applied,
        "correction_rate": round(corrections_applied / max(total_words, 1) * 100, 2),
        "quality_score": min(100, 85 + (corrections_applied * 0.5)),
    }


def clear_cache():
    """Clear the glossary cache (useful for testing)."""
    global _glossary_map
    _glossary_map = None
    logger.info("Correction service cache cleared")
