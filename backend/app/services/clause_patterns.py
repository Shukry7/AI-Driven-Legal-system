"""
Clause Detection Patterns - 28 Legal Clauses with Regex Patterns

Based on comprehensive format analysis from clause_regrexs.md (Version 4.0)
✅ VERIFIED with 450 judgment files
Uses position-based detection for accurate clause identification.
Each clause has patterns to detect its presence and potential corruption.
"""

import re
import logging
from typing import List, Dict, Tuple, Optional

# Set up logging
logger = logging.getLogger(__name__)

# Date pattern components
DIG = r"[\d]"
SEP = r"[./-]"
DATE_PATTERN = rf"{DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}}"

# ─── Month names for worded-date patterns ────────────────────────────────────
_MONTHS = (
    r"(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December)"
)

# Numeric date tolerating optional spaces around separators: "18. 05. 2010"
_NUMERIC_DATE = r"\d{1,2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{2,4}"

# Worded date: "14th January 2020" / "4th August, 2010"
_WORDED_DATE = r"\d{1,2}(?:st|nd|rd|th)?\s+" + _MONTHS + r"[\s,]+\d{2,4}"

# Combined date pattern
_ANY_DATE = rf"(?:{_NUMERIC_DATE}|{_WORDED_DATE})"


def _get_line_context(
    text: str, start_pos: int, end_pos: int
) -> Tuple[str, int, int]:
    """Return the full line surrounding the matched position.

    Args:
        text: Full document text.
        start_pos: Start character offset of the match.
        end_pos: End character offset of the match.

    Returns:
        Tuple (line_text, line_start, line_end).
    """
    line_start = text.rfind('\n', 0, start_pos)
    line_start = line_start + 1 if line_start != -1 else 0

    line_end = text.find('\n', end_pos)
    if line_end == -1:
        line_end = len(text)

    return text[line_start:line_end].strip(), line_start, line_end


def _has_any_corruption(text: str) -> bool:
    """Comprehensive corruption check using layered heuristics.

    Uses the same signals as corruption_detection_service plus targeted extras.
    Returns True as soon as any corruption signal is found.
    """
    if not text:
        return False

    _CORRUPTION_PATTERNS = [
        r'\uFFFD',                   # Unicode replacement char
        r'\[CORRUPTED:',             # Explicit corruption marker
        r'\b#{2,}',                  # Two or more consecutive # chars
        r'[#*%]{2,}',                # Two or more of # * % in a row (OCR garble)
        r'[^\w\s]{3,}',              # 3+ consecutive non-word, non-space chars
    ]
    for pat in _CORRUPTION_PATTERNS:
        try:
            if re.search(pat, text):
                return True
        except re.error:
            pass
    return False


def _clause_specific_corrupted(text: str, indicators: list) -> bool:
    """Check clause-specific corruption indicators against text."""
    for indicator in indicators:
        try:
            if re.search(indicator, text):
                return True
        except re.error:
            pass
    return False


def preprocess_text(text: str) -> str:
    """
    Preprocess extracted PDF text to remove formatting markers and clean up.
    
    Removes:
    - PDF formatting markers: <<F:...>> and <</F>>
    - Page separators: --- Page N ---
    - Excessive whitespace
    
    Args:
        text: Raw extracted text from PDF
        
    Returns:
        Cleaned text suitable for regex pattern matching
    """
    # Remove PDF formatting markers like <<F:size=14,bold=1>> and <</F>>
    text = re.sub(r'<<F:[^>]+>>', '', text)
    text = re.sub(r'<</F>>', '', text)
    
    # Remove page separators like --- Page 1 ---
    text = re.sub(r'-{2,}\s*Page\s+\d+\s*-{2,}', '', text)
    
    # Remove excessive whitespace while preserving single spaces and newlines
    text = re.sub(r' {2,}', ' ', text)  # Multiple spaces to single space
    text = re.sub(r'\n{3,}', '\n\n', text)  # Multiple newlines to double newline
    
    return text.strip()


def get_search_region(text: str, clause_name: str) -> Tuple[int, int]:
    """
    Return (start, end) char indices to search for this clause.
    
    ✅ VERIFIED POSITIONS from comprehensive analysis of 450 judgment files.
    ALL positions are from start of document unless negative (= from end).
    
    Args:
        text: The legal document text
        clause_name: The key name of the clause
        
    Returns:
        Tuple of (start_position, end_position) in characters
    """
    L = len(text)
    regions = {
        # HEADER (always in first ~500 chars)
        "CourtTitle": (0, min(500, L)),
        "MatterDescription": (0, min(500, L)),
        
        # HEADER/CASE IDENTIFIERS ✅ Verified
        "CaseNumber": (0, min(5000, L)),  # Verified: max=1138, avg=458
        "CaseYear": (0, min(6000, L)),
        "LowerCourtNumber": (0, min(3000, L)),
        "AppealType": (0, min(8000, L)),
        
        # PARTY BLOCKS (chars 0-5000)
        "Petitioner": (0, min(5000, L)),
        "Respondent": (0, min(5000, L)),
        "Plaintiff": (0, min(5000, L)),
        "Defendant": (0, min(5000, L)),
        "PetitionerBlock": (0, min(5000, L)),
        "RespondentBlock": (0, min(5000, L)),
        "PlaintiffBlock": (0, min(5000, L)),
        "DefendantBlock": (0, min(5000, L)),
        
        # PROCEDURAL SECTION ✅ VERIFIED (450 files)
        # Measured: BeforeBench avg=1835, max=13212; JudgeNames avg=2891, max=14258
        "BeforeBench": (400, min(15000, L)),  # Verified expansion
        "JudgeNames": (400, min(15000, L)),  # Verified expansion
        "CounselForAppellant": (400, min(15000, L)),
        "CounselForRespondent": (400, min(15000, L)),
        "InstructedBy": (400, min(15000, L)),
        "CounselSection": (400, min(15000, L)),
        
        # DATES ✅ VERIFIED (450 files)
        # Measured: ArguedOn avg=2197, max=13087; DecidedOn avg=2226, max=13134
        "ArguedOn": (500, min(15000, L)),  # Verified expansion
        "DecidedOn": (500, min(15000, L)),  # Verified expansion
        
        # BODY (search full document)
        "Jurisdiction": (0, L),
        "LegalProvisionsCited": (0, L),
        
        # FOOTER ✅ VERIFIED (450 files)
        # Measured: avg position 98.72% of document
        "JudgeSignature": (max(0, L - 3000), L),  # Last 3000 chars for safety
    }
    return regions.get(clause_name, (0, L))

# 28 Legal Clauses for Supreme Court Judgments
# ✅ VERIFIED patterns from clause_regrexs.md (Version 4.0)
CLAUSE_DEFINITIONS = {
    "CourtTitle": {
        "name": "Court Title",
        "description": "The title of the court where the case was heard",
        "patterns": [
            r"(?i)IN\s+THE\s+SUPREME\s+COURT\s+OF(?:\s+THE)?(?:\s+DEMOCRATIC)?(?:\s+SOCIALIST)?(?:\s+REPUBLIC)?(?:\s+OF)?\s+SRI\s+LANKA",
            r"(?i)IN\s+THE\s+(?:HIGH|DISTRICT)\s+COURT\s+OF\s+[\w\s]+SRI\s+LANKA",
            r"(?i)(?:IN\s+THE\s+)?COURT\s+OF\s+APPEAL\s+OF\s+SRI\s+LANKA"  # More specific - requires context
        ],
        "fallback_patterns": [
            # Lenient patterns to catch corrupted/variant court titles.
            # Corruption is checked on the matched text AFTER these patterns match.
            r"(?i)IN\s+[^\n]{0,50}?(?:DEMOCRATIC|SOCIALIST|REPUBLIC)[\s\S]{0,100}?SRI\s+LANKA",
            r"(?i)IN\s+[^\n]{0,100}?SUPREME\s+COURT[\s\S]{0,150}?LANKA",
            r"(?i)IN\s+THE\s+(?:HIGH|DISTRICT)\s+COURT[\s\S]{0,100}?LANKA",
            r"(?i)SUPREME\s+COURT[\s\S]{0,150}?SRI\s+LANKA",
            r"(?i)IN\s+[^\n]{0,150}?LANKA",
        ],
        "corruption_indicators": [
            # Do NOT include bare '-' — hyphens appear in legitimate legal text.
            r"[#@$%!&*+^~`|\\]{2,}",   # 2+ consecutive garbled chars
            r"[A-Za-z][#@$%!&*+^~`]{1,}[A-Za-z]",  # Special char embedded in a word
            r"\uFFFD",                  # Unicode replacement character
            r"\[CORRUPTED:",            # Explicit corruption marker
        ],
        "frequency": "🔴 Always Present (99.6%)",
        "detection_rate": 0.996
    },
    
    "MatterDescription": {
        "name": "Matter Description",
        "description": "Legal basis and type of appeal/application",
        "patterns": [
            r"(?i)In\s+the\s+matter\s+of[^\n]{1,200}",  # Match full description
            r"(?i)In\s+the\s+matter\s+of\s+an?\s+(?:Application|appeal|petition)"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (73.8%)",
        "detection_rate": 0.738
    },
    
    "CaseNumber": {
        "name": "Case Number",
        "description": "Supreme Court case/appeal identifier",
        "patterns": [
            r"(?i)SC[\s.]*(?:Appeal|Application|FR|CHC|SPL)[\s.]*(?:No\.?)?[\s.:#]*\d+[/\-.]\d{2,4}",
            r"(?i)SC[\s.]*(?:Appeal|Application)[\s.]*(?:No\.?)?[\s:#]*\d+[/\-.]\d{4}(?:\s*\([A-Z]+\))?",
            r"(?i)(?:SC|CA|HC)[\s./]*[A-Z]*[\s]*(?:Appeal|Application|No)[\s.]*(?:No\.?)?[\s:#]*\d+[/\-.]\d{2,4}"
        ],
        "fallback_patterns": [
            r"(?i)SC[/\s#*&@.]*(?:APPEAL|APPLICATION|FR|CHC)[/\s#*&@.]*(?:No\.?)?[\s#*&@.]*\d+",
            r"(?i)(SC|CA)[/\s#*&@]*\d+",
        ],
        "corruption_indicators": [r"###", r"XXX", r"\[CORRUPTED:", r"[#*&@]{2,}"],
        "frequency": "🔴 Must Present (91.2%)",
        "detection_rate": 0.316
    },
    
    "CaseYear": {
        "name": "Case Year",
        "description": "Year from case number",
        "patterns": [
            r"\b(19\d{2}|20\d{2})\b",
            r"[/\\-](\d{4})"
        ],
        "corruption_indicators": [r"####", r"XXXX"],
        "frequency": "🟡 Sometimes Present (84.2%)",
        "detection_rate": 1.000  # 100% in validation
    },
    
    "LowerCourtNumber": {
        "name": "Lower Court Number",
        "description": "References to High Court, District Court, Magistrate Court cases",
        "patterns": [
            r"(?i)HC[\s.]*(?:ALT|Civil|CA|HCCA|ARB|ARP)[\s.]*(?:No\.?)?[\s:#]*\d+[/\-.]\d+",
            r"(?i)Commercial\s+High\s+Court[\s]*Case[\s]*No[.:]?\s*\d+[/\-]\d+",
            r"(?i)(?:High Court|District Court|Magistrate'?s?\s+Court)\s*(?:\([A-Z]+\))?\s*(?:Case|No\.)\s*(?:No\.?)?[\s:#]*\d+[/\-.]\d+",
            r"(?i)(?:DC|MC|WP/HCCA|HCMCA)[\s./]*\w*[\s]*(?:Case\s*)?(?:No\.?)?[\s:#]*\d+[/\-]\d+",
            r"(?i)(?:CA|LT\s+Case)\s*(?:No\.?)?[\s:#]*\d+[/\-]\d+"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (85.1%)",
        "detection_rate": 0.851
    },
    
    "BeforeBench": {
        "name": "Before/Bench",
        "description": "Label for judges hearing the case",
        "patterns": [
            r"(?i)Before\s*:",
            r"(?i)Coram\s*:",
            r"(?i)Before\s*[:\n]"
        ],
        "fallback_patterns": [
            r"(?i)B[e3][f#]*[o0][r#]*[e3][\s#*&@:]*",  # Allows typos/corruption in "Before"
            r"(?i)C[o0][r#]*[a@][m#]*\s*:",  # Allows typos/corruption in "Coram"
        ],
        "corruption_indicators": [r"[#*&@]{2,}", r"[Bb][^eE]", r"[Cc][^oO]"],
        "frequency": "🔴 Always Present (88.7%)",
        "detection_rate": 0.927
    },
    
    "JudgeNames": {
        "name": "Judge Names",
        "description": "Names of judges on the panel",
        "patterns": [
            r"(?i)Hon\.?\s+Justice\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+",
            r"(?i)(?:Hon\.?\s+)?(?:Justice\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\s*,?\s*(?:PC\s*,?\s*)?(?:J\.|CJ\.|PCJ)\b",
            r"[A-Z][a-z]+\s+[A-Z]\.?\s*[A-Z][a-z]+\s*,\s*(?:PC\s*,\s*)?J\."
        ],
        "fallback_patterns": [
            r"(?i)Hon[^a-z]*Justice[\s\S]{0,50}?[A-Z][a-z]+",  # Relaxed Hon. Justice pattern
            r"(?i)Justice[\s\S]{0,30}?[A-Z][a-z]+",  # Just Justice + name
            r"[A-Z][a-z]+[\s#*&@]+[A-Z][a-z]+[\s,]*(?:J\.|CJ)",  # Name with corruption + J.
        ],
        "corruption_indicators": [
            r"#{2,}",
            r"[=@$%!&*]{2,}",
            r"\[MISSING:"
        ],
        "frequency": "🔴 Always Present (87.5%)",
        "detection_rate": 0.875
    },
    
    "JudgeSignature": {
        "name": "Judge Signature",
        "description": "Signatures and agreements of panel judges",
        "patterns": [
            r"(?i)JUDGE\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT",
            r"(?i)Judge\s+of\s+the\s+Supreme\s+Court",
            r"(?i)\bCHIEF\s+JUSTICE\b",
            r"(?m)\bI\s+agree[,.]?\s*$"
        ],
        "fallback_patterns": [
            r"(?i)JUDGE[\s#*&@]+OF[\s#*&@]+THE[\s\S]{0,50}?COURT",  # Allows corruption
            r"(?i)Judge[\s#*&@]+of[\s#*&@]+the[\s\S]{0,30}?Court",
            r"(?i)I[\s#*&@]+agree",  # "I agree" with possible corruption
        ],
        "corruption_indicators": [r"\[MISSING:.*Signature", r"Signature required", r"[#*&@]{2,}"],
        "frequency": "🔴 Always Present (98.9%)",
        "detection_rate": 0.984
    },
    
    "ArguedOn": {
        "name": "Argued On",
        "description": "Date case was argued/heard",
        "requires_value": True,  # This clause needs a date VALUE after the key
        "patterns": [
            # Numeric date — tolerates spaces around separators: "18. 05. 2010"
            r"(?i)(?:Argued|Heard)\s+on\s*:\s*\d{1,2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{2,4}",
            # Worded date: "14th January 2020" / "4th August, 2010"
            r"(?i)(?:Argued|Heard)\s+on\s*:\s*\d{1,2}(?:st|nd|rd|th)?\s+"
            r"(?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)[\s,]+\d{2,4}",
        ],
        "fallback_patterns": [
            # Corrupted keyword variants
            r"(?i)A[r#*&=@\-]*[g#*&=@\-]*[u#*&=@\-]*[e3][d#*&=@\-]*\s+[o0][n#*&=@\-]*\s*:",
            r"(?i)H[e3][a@][r#*&=@\-]*[d#*&=@\-]*\s+[o0][n#*&=@\-]*\s*:",
            r"(?i)(?:Argued|Heard)\s+on\s*:",  # Clean keyword — date checked separately
        ],
        "corruption_indicators": [
            r"[#@$%!&*+^~`|\\]{2,}",   # 2+ consecutive garbled chars
            r"[#@$%!&*+^~`]{1,}\d",    # Garbled char right before a digit
            r"\d[#@$%!&*+^~`]{1,}",    # Digit followed by garbled char
            r"\uFFFD",
            r"\[CORRUPTED:",
        ],
        "frequency": "🟡 Sometimes Present (86.9%)",
        "detection_rate": 0.864
    },
    
    "DecidedOn": {
        "name": "Decided On",
        "description": "Date judgment was delivered",
        "requires_value": True,  # This clause needs a date VALUE after the key
        "patterns": [
            # Numeric date — tolerates spaces around separators
            r"(?i)(?:Decided|Delivered|Judgment\s+delivered)\s+on\s*:\s*\d{1,2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{2,4}",
            # Worded date
            r"(?i)(?:Decided|Delivered|Judgment\s+delivered)\s+on\s*:\s*\d{1,2}(?:st|nd|rd|th)?\s+"
            r"(?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)[\s,]+\d{2,4}",
        ],
        "fallback_patterns": [
            # Corrupted keyword variants
            r"(?i)D[e3][c#*&=@\-]*[i1!][d#*&=@\-0-9]*[e3#*&=@\-]*[d#*&=@\-0-9]*\s+[o0][n#*&=@\-]*\s*:",
            r"(?i)D[e3][l#*&=@\-]*[i1][v#*&=@\-]*[e3][r#*&=@\-]*[e3][d#*&=@\-]*\s+[o0][n#*&=@\-]*\s*:",
            r"(?i)(?:Decided|Delivered|Judgment\s+delivered)\s+on\s*:",
        ],
        "corruption_indicators": [
            r"[#@$%!&*+^~`|\\]{2,}",   # 2+ consecutive garbled chars
            r"[#@$%!&*+^~`]{1,}\d",    # Garbled char right before a digit
            r"\d[#@$%!&*+^~`]{1,}",    # Digit followed by garbled char
            r"\uFFFD",
            r"\[CORRUPTED:",
        ],
        "frequency": "🟡 Sometimes Present (88.5%)",
        "detection_rate": 0.911
    },
    
    "Petitioner": {
        "name": "Petitioner",
        "description": "The party filing the petition/appeal",
        "patterns": [
            r"(?i)Petitioner\s*$",
            r"(?i)Petitioner-Respondent\s*$",
            r"(?i)(?:PETITIONER|APPELLANT|PLAINTIFF)[S]?\s*$"
        ],
        "fallback_patterns": [
            r"(?i)P[e3][t#]*[i1][t#]*[i1][o0][n#]*[e3][r#]*",  # Allows typos in Petitioner
            r"(?i)APPELLANT[S]?",
            r"(?i)PLAINTIFF[S]?",
        ],
        "corruption_indicators": [r"[#*&@]{2,}"],
        "frequency": "🔴 Always Present (87.9%)",
        "detection_rate": 0.879
    },
    
    "Respondent": {
        "name": "Respondent",
        "description": "The opposing party in the case",
        "patterns": [
            r"(?i)Respondent\s*$",
            r"(?i)Respondent-Appellant\s*$",
            r"(?i)(?:RESPONDENT|DEFENDANT)[S]?\s*$",
            r"(?i)Vs\."
        ],
        "fallback_patterns": [
            r"(?i)R[e3][s#]*[p#]*[o0][n#]*[d#]*[e3][n#]*[t#]*",  # Allows typos in Respondent
            r"(?i)DEFENDANT[S]?",
            r"(?i)V[s#]*\.",  # Vs. with possible corruption
        ],
        "corruption_indicators": [r"[#*&@]{2,}"],
        "frequency": "🔴 Always Present (87.7%)",
        "detection_rate": 0.877
    },
    
    "PetitionerBlock": {
        "name": "Petitioner Block",
        "description": "Full petitioner details including name and address",
        "patterns": [
            r"(?i)(?:PLAINTIFF|PETITIONER|APPELLANT)[S]?\s*$",
            r"(?im)^(?:PLAINTIFF|PETITIONER|APPELLANT)[S]?\s*$"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (80.4%)",
        "detection_rate": 0.004
    },
    
    "RespondentBlock": {
        "name": "Respondent Block",
        "description": "Full respondent details including name and address",
        "patterns": [
            r"(?im)^\s*(?:v\.|vs|versus)\s*$",
            r"(?i)(?:DEFENDANT|RESPONDENT)[S]?\s*$"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (79.8%)",
        "detection_rate": 0.002
    },
    
    "CounselSection": {
        "name": "Counsel Section",
        "description": "Section listing counsel for parties",
        "patterns": [
            r"(?i)Counsel\s*:",
            r"(?i)for\s+(?:the\s+)?(?:Respondent|Petitioner|Appellant)"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present",
        "detection_rate": 0.85
    },
    
    "CounselForAppellant": {
        "name": "Counsel for Appellant",
        "description": "Counsel representing the appellant",
        "patterns": [
            r"(?i)for\s+(?:the\s+)?(?:Petitioner|Appellant|Plaintiff)[-\s]",
            r"(?i)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\s+(?:with|and)\s+[A-Z][a-z]+[\s\w,]+for\s+(?:the\s+)?(?:Respondent-Appellant|Petitioner)"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (86.5%)",
        "detection_rate": 0.865
    },
    
    "CounselForRespondent": {
        "name": "Counsel for Respondent",
        "description": "Counsel representing the respondent",
        "patterns": [
            r"(?i)for\s+(?:the\s+)?(?:Respondent|Defendant|Petitioner-Respondent)",
            r"(?i)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\s+(?:with|and)\s+[A-Z][a-z]+[\s\w,]+for\s+(?:the\s+)?(?:Petitioner-Respondent|Respondent)"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (86.3%)",
        "detection_rate": 0.863
    },
    
    "AppealType": {
        "name": "Appeal Type",
        "description": "Type of appeal (Civil, Criminal, etc.)",
        "patterns": [
            r"(?i)Application\s+for\s+(?:Special\s+)?Leave\s+to\s+Appeal",
            r"(?i)Application\s+for\s+Leave\s+to\s+Appeal[^\n]{0,150}",
            r"(?i)(?:Civil|Criminal|Fundamental\s+Rights)\s+(?:Appeal|Application)",
            r"(?i)exercising\s+its\s+(?:Civil|Criminal)\s+(?:Appellate\s+)?Jurisdiction"
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (57.9%)",
        "detection_rate": 0.579
    },
    
    "LegalProvisionsCited": {
        "name": "Legal Provisions Cited",
        "description": "Sections, Articles, or Acts cited",
        "patterns": [
            r"(?i)section\s+\d+(?:\s*\([a-z0-9]+\))?",
            r"(?i)Article\s+\d+",
            r"(?i)Article\s+\d+\s+of\s+the\s+Constitution",
            r"(?i)Act\s+No\.\s*\d+\s+of\s+\d{4}",
            r"(?i)Arbitration\s+Act\s+No\.\s*\d+\s+of\s+\d{4}"
        ],
        "fallback_patterns": [
            r"(?i)s[e3][c#]*[t#]*[i1][o0][n#]*[\s#*&@]+\d+",  # section with typos
            r"(?i)A[r#]*[t#]*[i1][c#]*[l#]*[e3][\s#*&@]+\d+",  # Article with typos
            r"(?i)Act[\s#*&@]+No",  # Act No. with corruption
        ],
        "corruption_indicators": [r"[#*&@]{2,}"],
        "frequency": "🔴 Always Present (88.6%)",
        "detection_rate": 0.911
    },
    
    "Jurisdiction": {
        "name": "Jurisdiction",
        "description": "Reference to court's jurisdiction",
        "patterns": [
            r"(?i)\bjurisdiction\b",
            r"exercising\s+its\s+(?:Civil|Criminal)\s+(?:Appellate\s+)?Jurisdiction",
            r"Appellate\s+Jurisdiction"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (82.9%)",
        "detection_rate": 0.829
    },
    
    "InstructedBy": {
        "name": "Instructed By",
        "description": "Instructing attorney information",
        "patterns": [
            r"(?i)instructed\s+by\s+[A-Z][^\n]{1,80}",
            r"(?i)(?:Instructed|Instructing)\s+(?:by|attorney|solicitor)"
        ],
        "corruption_indicators": [],
        "frequency": "⚪ Very Rare (20.3%)",
        "detection_rate": 0.203
    },
    
    "Plaintiff": {
        "name": "Plaintiff",
        "description": "Plaintiff party name",
        "patterns": [
            r"(?i)Plaintiff[-\s]+(?:Appellant|Respondent)",
            r"(?i)PLAINTIFF[S]?\s*$",
            r"Plaintiff[:\s]*([^\n]+)"
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (52.7%)",
        "detection_rate": 0.527
    },
    
    "Defendant": {
        "name": "Defendant", 
        "description": "Defendant party name",
        "patterns": [
            r"(?i)Defendant[-\s]+(?:Appellant|Respondent)",
            r"(?i)DEFENDANT[S]?\s*$",
            r"Defendant[:\s]*([^\n]+)"
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (54.6%)",
        "detection_rate": 0.546
    },
    
    "PlaintiffBlock": {
        "name": "Plaintiff Block",
        "description": "Complete plaintiff information block",
        "patterns": [
            r"(?i)Plaintiff[-\s]+(?:Appellant|Respondent)[^\n]{0,100}",
            r"(?im)^\s*PLAINTIFF[S]?[-\s]+(?:APPELLANT|RESPONDENT)\s*$",
            r"(?im)^\s*PLAINTIFF[S]?\s*$"
        ],
        "corruption_indicators": [],
        "frequency": "⚪ Very Rare (17.6%)",
        "detection_rate": 0.176
    },
    
    "DefendantBlock": {
        "name": "Defendant Block",
        "description": "Complete defendant information block",
        "patterns": [
            r"(?i)Defendant[-\s]+(?:Appellant|Respondent)[^\n]{0,100}",
            r"(?im)^\s*DEFENDANT[S]?[-\s]+(?:APPELLANT|RESPONDENT)\s*$",
            r"(?im)^\s*DEFENDANT[S]?\s*$"
        ],
        "patterns": [
            r"(?im)^(?:RESPONDENT|DEFENDANT)[S]?\s*$"
        ],
        "corruption_indicators": [],
        "frequency": "⚪ Very Rare (20.2%)",
        "detection_rate": 0.202
    }
}


def detect_clause(text: str, clause_key: str, use_preprocessing: bool = True) -> Tuple[str, Optional[str], Optional[int], Optional[int]]:
    """
    Detect a specific clause in the text using position-based search strategy.

    ✅ USES VERIFIED SEARCH REGIONS from 450-file analysis.
    Corruption is checked after EVERY successful match (main or fallback) so
    that clauses containing garbled characters are never silently marked Present.

    Args:
        text: The legal document text (will be preprocessed if use_preprocessing=True)
        clause_key: The key of the clause to detect (e.g., "CourtTitle")
        use_preprocessing: Whether to clean PDF formatting markers before detection

    Returns:
        Tuple of (status, content, start_pos, end_pos)
        status: "Present", "Missing", or "Corrupted"
        content: Extracted content if found
        start_pos: Start position of the clause in cleaned text
        end_pos: End position of the clause in cleaned text
    """
    if clause_key not in CLAUSE_DEFINITIONS:
        return ("Missing", None, None, None)

    # Preprocess text to remove PDF formatting markers
    if use_preprocessing:
        text = preprocess_text(text)

    clause_def = CLAUSE_DEFINITIONS[clause_key]
    patterns = clause_def["patterns"]
    corruption_indicators = clause_def.get("corruption_indicators", [])

    # Get the search region for this clause (position-based optimisation)
    region_start, region_end = get_search_region(text, clause_key)
    search_text = text[region_start:region_end]

    logger.debug(f"Detecting clause: {clause_key} (region: {region_start}-{region_end}, {len(search_text)} chars)")

    # Cap search chunk to avoid catastrophic backtracking
    max_search_len = 50000
    search_chunk = search_text[:max_search_len] if len(search_text) > max_search_len else search_text

    # ── Helper: decide Present / Corrupted for a successful match ──────────
    def _evaluate_match(matched_text: str, abs_start: int, abs_end: int,
                        from_fallback: bool = False) -> Tuple[str, Optional[str], Optional[int], Optional[int]]:
        """
        Given a matched text and its position, decide whether the clause is
        Present or Corrupted by checking:
          1. Clause-specific corruption indicators on the matched text.
          2. General corruption heuristics on the FULL LINE surrounding the match.

        Returns the same 4-tuple as detect_clause.
        """
        # 1. Clause-specific indicators on the matched text itself
        specific_corrupt = _clause_specific_corrupted(matched_text, corruption_indicators)

        # 2. General corruption check on the line context
        line_ctx, lc_start, lc_end = _get_line_context(text, abs_start, abs_end)
        general_corrupt = _has_any_corruption(line_ctx)

        if specific_corrupt or general_corrupt:
            logger.debug(f"  ⚠️ Corruption detected in {clause_key} "
                         f"(specific={specific_corrupt}, general={general_corrupt})")
            return ("Corrupted", line_ctx, lc_start, lc_end)

        return ("Present", matched_text, abs_start, abs_end)

    # ── Helper: check date value after a keyword match ──────────────────────
    def _evaluate_requires_value(matched_text: str, abs_start: int,
                                  abs_end: int) -> Tuple[str, Optional[str], Optional[int], Optional[int]]:
        """
        For clauses that require a value (e.g. date after 'Argued on:'):
          - If the keyword itself is corrupted → Corrupted
          - If the date value following the keyword is corrupted → Corrupted
          - If there is a valid date → Present
          - If no valid date and no corruption → Missing
        """
        # Check keyword corruption
        keyword_corrupted = (_clause_specific_corrupted(matched_text, corruption_indicators)
                             or _has_any_corruption(matched_text))

        # Inspect the text coming after the keyword (up to 150 chars)
        context_after = text[abs_end:min(abs_end + 150, len(text))]

        # Numeric date: tolerates optional spaces around separators
        numeric_date_pat = r"\s*\d{1,2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{2,4}"
        # Worded date: "14th January 2020" / "4th August, 2010"
        worded_date_pat = (
            r"\s*\d{1,2}(?:st|nd|rd|th)?\s+"
            r"(?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)[\s,]+\d{2,4}"
        )

        num_m = re.match(numeric_date_pat, context_after, re.IGNORECASE)
        wrd_m = re.match(worded_date_pat, context_after, re.IGNORECASE)
        date_match = num_m or wrd_m
        has_valid_date = date_match is not None

        # Check if the date area is corrupted (even if there is no valid date)
        date_area = context_after[:100]
        date_corrupted = _has_any_corruption(date_area)

        logger.debug(f"    → keyword_corrupted={keyword_corrupted}, "
                     f"has_valid_date={has_valid_date}, date_corrupted={date_corrupted}")

        if keyword_corrupted:
            logger.debug("    → Marking as CORRUPTED (corrupted keyword)")
            # Include the date token in the content if it exists
            if date_match:
                full_content = matched_text + context_after[:date_match.end()]
                return ("Corrupted", full_content, abs_start, abs_end + date_match.end())
            return ("Corrupted", matched_text, abs_start, abs_end)

        if date_corrupted and not has_valid_date:
            logger.debug("    → Marking as CORRUPTED (date value is corrupted)")
            return ("Corrupted", matched_text, abs_start, abs_end)

        if not has_valid_date:
            logger.debug("    → Marking as MISSING (keyword clean but no valid date)")
            return ("Missing", None, None, None)

        # Both keyword and date are present and clean
        full_content = matched_text + context_after[:date_match.end()]
        logger.debug("    → Marking as PRESENT (keyword + valid date both clean)")
        return ("Present", full_content, abs_start, abs_end + date_match.end())

    # ── MAIN PATTERNS ────────────────────────────────────────────────────────
    requires_value = clause_def.get("requires_value", False)

    for idx, pattern in enumerate(patterns):
        try:
            logger.debug(f"  Pattern {idx+1}/{len(patterns)}: {pattern[:100]}...")
            match = re.search(pattern, search_chunk, re.MULTILINE | re.IGNORECASE)

            if match:
                logger.debug(f"  ✅ Main pattern match for {clause_key}")
                matched_text = match.group(0)
                abs_start = region_start + match.start()
                abs_end = region_start + match.end()

                # For clauses that already embed the date in the strict pattern,
                # requires_value is irrelevant — just do corruption check.
                return _evaluate_match(matched_text, abs_start, abs_end)

        except Exception as e:
            logger.warning(f"  ⚠️ Pattern {idx+1} failed for {clause_key}: {str(e)[:100]}")
            continue

    # ── FALLBACK PATTERNS ────────────────────────────────────────────────────
    fallback_patterns = clause_def.get("fallback_patterns", [])
    if fallback_patterns:
        logger.debug(f"  ⚠️ Trying {len(fallback_patterns)} fallback patterns for {clause_key}...")

        for idx, pattern in enumerate(fallback_patterns):
            try:
                logger.debug(f"  Fallback pattern {idx+1}/{len(fallback_patterns)}")
                match = re.search(pattern, search_chunk, re.MULTILINE | re.IGNORECASE)

                if match:
                    logger.debug(f"  ⚠️ Fallback match found for {clause_key}, checking corruption/value...")
                    matched_text = match.group(0)
                    abs_start = region_start + match.start()
                    abs_end = region_start + match.end()

                    if requires_value:
                        return _evaluate_requires_value(matched_text, abs_start, abs_end)

                    # Standard non-value clause: check for corruption universally
                    return _evaluate_match(matched_text, abs_start, abs_end, from_fallback=True)

            except Exception as e:
                logger.warning(f"  ⚠️ Fallback pattern {idx+1} failed for {clause_key}: {str(e)[:100]}")
                continue

    logger.debug(f"  ❌ No match found for {clause_key}")
    return ("Missing", None, None, None)


def detect_all_clauses(text: str, use_preprocessing: bool = True) -> List[Dict]:
    """
    Detect all 28 clauses in the text.
    
    Args:
        text: The legal document text
        use_preprocessing: Whether to clean PDF formatting markers before detection
        
    Returns:
        List of dictionaries containing clause detection results
    """
    results = []
    
    logger.info(f"Starting clause detection on text ({len(text)} chars, {len(text.split())} words)")
    
    # Preprocess text once for all clauses
    if use_preprocessing:
        logger.info("Preprocessing text to remove PDF formatting markers...")
        text = preprocess_text(text)
        logger.info(f"Preprocessing complete ({len(text)} chars after cleaning)")
    
    total_clauses = len(CLAUSE_DEFINITIONS)
    logger.info(f"Detecting {total_clauses} clauses...")
    
    for idx, (clause_key, clause_def) in enumerate(CLAUSE_DEFINITIONS.items(), 1):
        logger.info(f"[{idx}/{total_clauses}] Detecting: {clause_key}")
        
        try:
            status, content, start_pos, end_pos = detect_clause(text, clause_key, use_preprocessing=False)
            
            results.append({
                "clause_key": clause_key,
                "clause_name": clause_def["name"],
                "description": clause_def["description"],
                "status": status,
                "content": content,
                "start_pos": start_pos,
                "end_pos": end_pos,
                "confidence": 1.0 if status == "Present" else (0.5 if status == "Corrupted" else 0.0)
            })
            
            logger.info(f"  → Result: {status}")
        except Exception as e:
            logger.error(f"  → ERROR detecting {clause_key}: {str(e)}")
            # Add a failed result
            results.append({
                "clause_key": clause_key,
                "clause_name": clause_def["name"],
                "description": clause_def["description"],
                "status": "Missing",
                "content": None,
                "start_pos": None,
                "end_pos": None,
                "confidence": 0.0
            })
    
    logger.info(f"Detection complete! Processed {len(results)} clauses")
    return results


def get_corrupted_regions(text: str, clause_results: List[Dict]) -> List[Dict]:
    """
    Extract corrupted regions from the text for highlighting.
    
    Args:
        text: The legal document text
        clause_results: Results from detect_all_clauses
        
    Returns:
        List of corrupted regions with their positions
    """
    corrupted_regions = []
    
    for result in clause_results:
        if result["status"] == "Corrupted" and result["start_pos"] is not None:
            corrupted_regions.append({
                "clause_name": result["clause_name"],
                "text": result["content"],
                "start": result["start_pos"],
                "end": result["end_pos"]
            })
    
    # Also detect general corruption markers
    corruption_patterns = [
        (r"\[CORRUPTED:[^\]]+\]", "explicit_marker"),
        (r"\b#{3,}\b", "hash_placeholder"),  # Changed from 3+ to be stricter
        (r"\bX{3,}\b", "x_placeholder"),      # Changed from 3+ to be stricter
        (r"\[MISSING:[^\]]+\]", "missing_marker")
    ]
    
    for pattern, corruption_type in corruption_patterns:
        for match in re.finditer(pattern, text):
            corrupted_regions.append({
                "clause_name": f"Corruption ({corruption_type})",
                "text": match.group(0),
                "start": match.start(),
                "end": match.end()
            })
    
    # Sort by position and remove duplicates
    corrupted_regions.sort(key=lambda x: x["start"])
    
    return corrupted_regions
