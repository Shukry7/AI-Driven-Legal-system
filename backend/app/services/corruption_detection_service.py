"""
Corruption detection service

Simple heuristics to detect corrupted fragments/placeholders in extracted text.

Exports:
 - detect_corruptions(text: str) -> List[dict]

Each dict contains: { 'match': str, 'start': int, 'end': int, 'type': str }
"""
from typing import List, Dict
import re


def detect_corruptions(text: str) -> List[Dict]:
    """Detect likely corrupted fragments in `text`.

    Heuristics used:
    - Explicit markers like `[CORRUPTED: ... ]`
    - Long sequences of hashes or X characters (e.g., `###`, `XXXX`)
    - Replacement/unprintable characters (U+FFFD)
    - Tokens with many non-word characters

    Returns list of dicts with keys: match, start, end, type
    """
    if not text:
        return []

    patterns = [
        (r"\[CORRUPTED:[^\]]+\]", 'marker'),
        (r"\b#{2,}\b", 'hashes'),
        (r"\bX{2,}\b", 'placeholder_x'),
        (r"\uFFFD+", 'replacement_char'),
        (r"[^\w\s]{2,}", 'nonword_seq')
    ]

    matches = []
    for pat, ptype in patterns:
        for m in re.finditer(pat, text):
            try:
                matches.append({'match': m.group(0), 'start': m.start(), 'end': m.end(), 'type': ptype})
            except Exception:
                continue

    # Merge overlapping matches and remove duplicates while preserving order
    matches_sorted = sorted(matches, key=lambda x: (x['start'], -x['end']))
    merged = []
    last_end = -1
    seen = set()
    for m in matches_sorted:
        key = (m['start'], m['end'], m['match'])
        if key in seen:
            continue
        seen.add(key)
        if m['start'] < last_end:
            # overlapping - skip or adjust
            continue
        merged.append(m)
        last_end = m['end']

    return merged
