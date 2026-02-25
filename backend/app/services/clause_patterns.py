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
        "PlaintiffAddress": (0, min(6000, L)),
        "DefendantAddress": (0, min(6000, L)),
        
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
        "ClaimAmount": (0, L),
        "PrayerForRelief": (0, L),
        
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
            r"(?i)COURT\s+OF\s+APPEAL"
        ],
        "fallback_patterns": [
            # Relaxed patterns to catch corrupted court titles
            # Allows any characters (including corruption) between COURT and LANKA
            r"(?i)IN\s+THE\s+SUPREME\s+COURT[\s\S]{0,150}?LANKA",  # Match across lines with possible corruption
            r"(?i)IN\s+THE\s+(?:HIGH|DISTRICT)\s+COURT[\s\S]{0,100}?LANKA",
        ],
        "corruption_indicators": [
            r"[=@$%!&*]{2,}",  # Multiple special characters
            r"#{2,}",  # Multiple hashes
            r"[A-Z]{2,}[=@#$%!&*]+[A-Z]",  # Special chars in middle of words
            r"\uFFFD",  # Replacement character
            r"[A-Z]+[#@=]+[A-Z]+",  # Letters with special chars between
            r"&{2,}",  # Multiple ampersands
        ],
        "frequency": "🔴 Always Present (99.6%)",
        "detection_rate": 0.996
    },
    
    "MatterDescription": {
        "name": "Matter Description",
        "description": "Legal basis and type of appeal/application",
        "patterns": [
            r"(?i)^In\s+the\s+matter\s+of",
            r"(?i)In\s+the\s+matter\s+of\s+(?:an?|the)?\s*(?:appeal|application|petition)"
        ],
        "corruption_indicators": [],
        "frequency": "🟡 Sometimes Present (73.8%)",
        "detection_rate": 0.738
    },
    
    "CaseNumber": {
        "name": "Case Number",
        "description": "Supreme Court case/appeal identifier",
        "patterns": [
            r"(?i)SC[/\s]*APPEAL[/\s]*\d+[/\s]*\d{4}",
            r"(?i)SC[/\s]*(?:CHC|FR|SPL)?[/\s]*(?:APPEAL|APPLICATION)[/\s]*(?:No\.?)?[/\s]*\d+[/\s]*\d{4}",
            r"(?i)HC[/\s]*ARB[/\s]*\d+[/\s]*\d{4}",
            r"(?i)(SC|CA|HC|S\.C\.|C\.A\.|H\.C\.)\s*(CHC\s*)?(?:Appeal|Application|No)?\.?\s*No?\.?\s*\d+[/\-\.]\d{2,4}",
            r"(?i)(?:Case\s+)?(?:No|Νo)[.:]?\s*SC\s+(?:Appeal|Application)\s+\d+[/-]\d{2,4}"
        ],
        "corruption_indicators": [r"###", r"XXX", r"\[CORRUPTED:", r"SC/###"],
        "frequency": "🔴 Must Present (91.2%) ⚠️ Pattern needs work",
        "detection_rate": 0.316  # Low due to strict regex, not position
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
            r"(?i)(?:High Court|District Court|Magistrate'?s?\s+Court|HC|DC)\s*(?:\(?\w+\)?)?\s*(?:Case|Application|Appeal|No\.?)\s*(?:No\.?)?\s*\d+",
            r"(?i)(?:HC|HCCA|WP/HCCA)\s*[/\s]*\w*\s*(?:Case\s*)?No[.:]?\s*\d+[/-]\d+",
            r"(?i)District\s+Court\s+\w+\s+(?:Case\s*)?No[.:]?\s*\d+[/-]\d+",
            r"(?i)(?:DC|MC)\s*[/\s]*\w*\s*(?:Case\s*)?No[.:]?\s*\d+[/-]\d+"
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
        "corruption_indicators": [],
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
        "corruption_indicators": [r"\[MISSING:.*Signature", r"Signature required"],
        "frequency": "🔴 Always Present (98.9%)",
        "detection_rate": 0.984
    },
    
    "ArguedOn": {
        "name": "Argued On",
        "description": "Date case was argued/heard",
        "patterns": [
            r"(?i)Argued\s+on\s*:\s*\d{2}\.\d{2}\.\d{4}",
            r"(?i)Argued\s+on\s*:\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}",
            r"(?i)(?:Argued|Heard)\s+on\s*:"
        ],
        "corruption_indicators": [r"##\.", r"[Oo][Oo]", r"[Tt][Tt]"],
        "frequency": "🟡 Sometimes Present (86.9%)",
        "detection_rate": 0.864
    },
    
    "DecidedOn": {
        "name": "Decided On",
        "description": "Date judgment was delivered",
        "patterns": [
            r"(?i)Decided\s+on\s*:\s*\d{2}\.\d{2}\.\d{4}",
            r"(?i)Decided\s+on\s*:\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}",
            r"(?i)(?:Decided|Delivered)\s+on\s*:"
        ],
        "corruption_indicators": [r"##\.", r"[Oo][Oo]", r"[Tt][Tt]"],
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
        "corruption_indicators": [],
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
        "corruption_indicators": [],
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
    
    "PlaintiffAddress": {
        "name": "Plaintiff Address",
        "description": "Address of the plaintiff",
        "patterns": [
            r"No\.\s*[\d/A-Z,-]+[\s\w,]*(?:Road|Street|Lane|Avenue|Mawatha|Place)",
            r"No\.\s*[\d/A-Z,-]+,\s*[A-Z][a-z]+(?:,\s*[A-Z][a-z]+){1,3}",
            r"All\s+of\s+[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*",
            r"\d+\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\."
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (60.8%)",
        "detection_rate": 0.608
    },
    
    "DefendantAddress": {
        "name": "Defendant Address",
        "description": "Address of the defendant",
        "patterns": [
            r"No\.\s*[\d/A-Z,-]+[\s\w,]*(?:Road|Street|Lane|Avenue|Mawatha|Place)",
            r"No\.\s*[\d/A-Z,-]+,\s*[A-Z][a-z]+(?:,\s*[A-Z][a-z]+){1,3}",
            r"All\s+of\s+[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*"
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (60.9%)",
        "detection_rate": 0.609
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
            r"(?:Civil|Criminal|Fundamental\s+Rights)\s+(?:appeal|application)",
            r"Application\s+for\s+Leave\s+to\s+Appeal",
            r"exercising\s+its\s+(?:Civil|Criminal)\s+(?:Appellate\s+)?Jurisdiction"
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (57.9%)",
        "detection_rate": 0.579
    },
    
    "LowerCourtNumber": {
        "name": "Lower Court Number",
        "description": "Case number from the lower court",
        "patterns": [
            r"(?i)HC[/\s]*ARB[/\s]*\d+[/\s]*\d{4}",
            r"(?i)HC[/\s]*(?:Civil|HCCA)[/\s]*[A-Za-z]+[/\s]*Case[/\s]*No[:.\s]*\d+[/\s]*\d{4}",
            r"(?i)(?:District|Magistrate'?s?)\s+Court\s+(?:\w+\s+)?(?:No|Case)[:.\s]+\d+",
            r"(?i)(?:DC|MC)[/\s]*[A-Za-z]+[/\s]*Case[/\s]*No[:.\s]*\d+"
        ],
        "corruption_indicators": []
    },
    
    "MatterDescription": {
        "name": "Matter Description",
        "description": "Description of the matter being heard",
        "patterns": [
            r"(?i)In\s+the\s+matter\s+of"
        ],
        "corruption_indicators": []
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
        "corruption_indicators": [],
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
    
    "ClaimAmount": {
        "name": "Claim Amount",
        "description": "Monetary amount claimed",
        "patterns": [
            r"(?:Rs\.?|Rupees)\s*[\d,]+(?:[/\.\-=]\d*)?",
            r"(?:US\s*)?(?:Dollars?|USD)\s*[\d,]+(?:\.\d+)?"
        ],
        "corruption_indicators": [r"###", r"XXX"],
        "frequency": "🟡 Sometimes Present (76.2%)",
        "detection_rate": 0.762
    },
    
    "InstructedBy": {
        "name": "Instructed By",
        "description": "Instructing attorney information",
        "patterns": [
            r"(?:Instructed|Instructing)\s+(?:by|attorney|solicitor)"
        ],
        "corruption_indicators": [],
        "frequency": "⚪ Very Rare (20.3%)",
        "detection_rate": 0.203
    },
    
    "PrayerForRelief": {
        "name": "Prayer for Relief",
        "description": "Relief sought by the petitioner",
        "patterns": [
            r"(?i)(?:prayer|relief|order)[:\s]+[^\n]+",
            r"(?i)(?:seeking|praying\s+for|claiming)[^\n]+"
        ],
        "corruption_indicators": [],
        "frequency": "🟢 Rarely Present (59.4%)",
        "detection_rate": 0.594
    },
    
    "Plaintiff": {
        "name": "Plaintiff",
        "description": "Plaintiff party name",
        "patterns": [
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
            r"(?im)^PLAINTIFF[S]?\s*$"
        ],
        "corruption_indicators": [],
        "frequency": "⚪ Very Rare (17.6%)",
        "detection_rate": 0.176
    },
    
    "DefendantBlock": {
        "name": "Defendant Block",
        "description": "Complete defendant information block",
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
    
    ✅ USES VERIFIED SEARCH REGIONS from 450-file analysis
    This improves detection accuracy by searching only in expected locations.
    
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
    corruption_indicators = clause_def["corruption_indicators"]
    
    # Get the search region for this clause (position-based optimization)
    region_start, region_end = get_search_region(text, clause_key)
    search_text = text[region_start:region_end]
    
    logger.debug(f"Detecting clause: {clause_key} (region: {region_start}-{region_end}, {len(search_text)} chars)")
    
    # Limit search to reasonable chunk sizes to prevent catastrophic backtracking
    max_search_len = 50000  # Limit to 50KB per regex search
    
    # Try to find the clause using its patterns in the search region
    for idx, pattern in enumerate(patterns):
        try:
            logger.debug(f"  Pattern {idx+1}/{len(patterns)}: {pattern[:100]}...")
            
            # Use regex with limited search space
            if len(search_text) > max_search_len:
                # For large regions, search in chunks
                search_chunk = search_text[:max_search_len]
            else:
                search_chunk = search_text
            
            match = re.search(pattern, search_chunk, re.MULTILINE | re.IGNORECASE)
            
            if match:
                logger.debug(f"  ✅ Match found for {clause_key}")
                matched_text = match.group(0)
                # Convert relative position to absolute position in full text
                start_pos = region_start + match.start()
                end_pos = region_start + match.end()
                
                # Check if the matched text itself contains corruption indicators
                is_corrupted = False
                
                # First check ONLY in the matched text for specific corruption indicators
                if corruption_indicators:
                    for indicator in corruption_indicators:
                        if re.search(indicator, matched_text):
                            is_corrupted = True
                            break
                
                # Only for clauses that have specific corruption indicators defined,
                # we expand to check the full line context
                if is_corrupted and clause_key == "CourtTitle":
                    # For Court Title, get the full line to show complete corruption
                    line_start = text.rfind('\n', 0, start_pos) + 1
                    line_end = text.find('\n', end_pos)
                    if line_end == -1:
                        line_end = len(text)
                    full_line = text[line_start:line_end]
                    return ("Corrupted", full_line.strip(), line_start, line_end)
                elif is_corrupted:
                    return ("Corrupted", matched_text, start_pos, end_pos)
                else:
                    return ("Present", matched_text, start_pos, end_pos)
        except Exception as e:
            # If pattern fails, log and continue to next pattern
            logger.warning(f"  ⚠️ Pattern failed for {clause_key}: {str(e)[:100]}")
            continue
    
    # If no main pattern matched, try fallback patterns (for detecting corruption)
    fallback_patterns = clause_def.get("fallback_patterns", [])
    if fallback_patterns:
        logger.debug(f"  ⚠️ Main patterns failed, trying {len(fallback_patterns)} fallback patterns for corruption detection...")
        
        for idx, pattern in enumerate(fallback_patterns):
            try:
                logger.debug(f"  Fallback pattern {idx+1}/{len(fallback_patterns)}")
                
                # Limit search space
                if len(search_text) > max_search_len:
                    search_chunk = search_text[:max_search_len]
                else:
                    search_chunk = search_text
                
                match = re.search(pattern, search_chunk, re.MULTILINE | re.IGNORECASE)
                
                if match:
                    logger.debug(f"  ⚠️ Fallback match found - checking for corruption")
                    matched_text = match.group(0)
                    start_pos = region_start + match.start()
                    end_pos = region_start + match.end()
                    
                    # Fallback patterns should always check for corruption
                    is_corrupted = False
                    if corruption_indicators:
                        for indicator in corruption_indicators:
                            if re.search(indicator, matched_text):
                                is_corrupted = True
                                logger.debug(f"    → Corruption indicator found: {indicator}")
                                break
                    
                    # If corruption found, mark as corrupted
                    if is_corrupted:
                        if clause_key == "CourtTitle":
                            # For Court Title, get the full line to show complete corruption
                            line_start = text.rfind('\n', 0, start_pos) + 1
                            line_end = text.find('\n', end_pos)
                            if line_end == -1:
                                line_end = len(text)
                            full_line = text[line_start:line_end]
                            logger.debug(f"    → Marking as CORRUPTED")
                            return ("Corrupted", full_line.strip(), line_start, line_end)
                        else:
                            return ("Corrupted", matched_text, start_pos, end_pos)
                    else:
                        # Fallback matched but no corruption indicators - could be acceptable variant
                        logger.debug(f"    → Fallback matched but no corruption - marking as Present")
                        return ("Present", matched_text, start_pos, end_pos)
            except Exception as e:
                logger.warning(f"  ⚠️ Fallback pattern failed: {str(e)[:100]}")
                continue
    
    # If no pattern matched (including fallbacks), the clause is missing
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
        (r"\b#{3,}\b", "hash_placeholder"),
        (r"\bX{3,}\b", "x_placeholder"),
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
