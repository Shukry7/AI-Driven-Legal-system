"""
Clause Detection Patterns - 28 Legal Clauses with Regex Patterns

Based on comprehensive format analysis from clause_regrexs.md
Each clause has patterns to detect its presence and potential corruption.
"""

import re
from typing import List, Dict, Tuple, Optional

# Date pattern components
DIG = r"[\d]"
SEP = r"[./-]"
DATE_PATTERN = rf"{DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}}"

# 28 Legal Clauses for Supreme Court Judgments
CLAUSE_DEFINITIONS = {
    "CourtTitle": {
        "name": "Court Title",
        "description": "The title of the court where the case was heard",
        "patterns": [
            r"^\s{0,10}IN\s+THE\s+(?:SUPREME|HIGH|DISTRICT|MAGISTRATE'?S?)\s+COURT",  # More flexible pattern
            r"^\s*COURT\s+OF\s+APPEAL"
        ],
        "corruption_indicators": [
            r"[=@$%!&*]{2,}",  # Multiple special characters
            r"#{2,}",  # Multiple hashes
            r"[A-Z]{2,}[=@#$%!&*]+[A-Z]",  # Special chars in middle of words
            r"\uFFFD",  # Replacement character
            r"[A-Z]+[#@=]+[A-Z]+",  # Letters with special chars between
        ]
    },
    
    "CaseNumber": {
        "name": "Case Number",
        "description": "The case number assigned to the case",
        "patterns": [
            r"(?:SC|CA|HC|HCCA|HCB|WP|DC|MC)[^\n]{0,80}?(?:Appeal|Application|Case)\s+No[:\.\s]+([A-Z0-9/\\-]+)",
            r"[A-Z]{2,4}\s*[/.-]?\s*[A-Z]?\d+[A-Z]*(?:[/.-]\d+[A-Z]*){0,3}"
        ],
        "corruption_indicators": [r"###", r"XXX", r"\[CORRUPTED:", r"SC/###"]
    },
    
    "CaseYear": {
        "name": "Case Year",
        "description": "The year the case was filed",
        "patterns": [
            r"\b(19\d{2}|20\d{2})\b",
            r"[/\\-](\d{4})"
        ],
        "corruption_indicators": [r"####", r"XXXX"]
    },
    
    "BeforeBench": {
        "name": "Before/Bench",
        "description": "The label indicating the bench composition",
        "patterns": [
            r"^\s*(?:Before|BEFORE|Coram)\s*:\s*",
            r"^\s*(?:Before|BEFORE|Coram)\s*:?\s*$"
        ],
        "corruption_indicators": []
    },
    
    "JudgeNames": {
        "name": "Judge Names",
        "description": "Names of judges presiding over the case",
        "patterns": [
            r"(?:Hon\.?\s*)?(?:Justice\s+)?[A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)+,?\s*(?:PC,?\s*)?[CJ]\.?",
            r"[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*J\.?"
        ],
        "corruption_indicators": [
            r"#{2,}",  # Multiple hashes in name
            r"[=@$%!&*]{2,}",  # Special characters in name
            r"\[MISSING:",  # Explicit missing marker
        ]
    },
    
    "JudgeSignature": {
        "name": "Judge Signature",
        "description": "Judge's signature at the end of judgment",
        "patterns": [
            r"JUDGE\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT",
            r"(?:JUDGE|CHIEF\s+JUSTICE)\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT"
        ],
        "corruption_indicators": [r"\[MISSING:.*Signature", r"Signature required"]
    },
    
    "ArguedOn": {
        "name": "Argued On",
        "description": "Date when the case was argued",
        "patterns": [
            rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]?\s*\n?\s*({DATE_PATTERN})",
            rf"(?i)ARGUED\s+ON\s*[:\\-;.]?\s*\n?\s*({DATE_PATTERN})",
            rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]"
        ],
        "corruption_indicators": [r"##\.", r"[Oo][Oo]", r"[Tt][Tt]"]
    },
    
    "DecidedOn": {
        "name": "Decided On",
        "description": "Date when the judgment was delivered",
        "patterns": [
            rf"(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\\-;.]?\s*\n?\s*({DATE_PATTERN})",
            rf"(?i)DECIDED\s+ON\s*[:\\-;.]?\s*\n?\s*({DATE_PATTERN})",
            rf"(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\\-;.]"
        ],
        "corruption_indicators": [r"##\.", r"[Oo][Oo]", r"[Tt][Tt]"]
    },
    
    "Petitioner": {
        "name": "Petitioner",
        "description": "The party filing the petition/appeal",
        "patterns": [
            r"(?:PETITIONER|APPELLANT|PLAINTIFF)[S]?\s*$",
            r"(?:Petitioner|Appellant|Plaintiff)[:\s]*\n\s*([A-Z][^\n]+)",
            r"^\s*PLAINTIFF[S]?\s*$"  # Added explicit PLAINTIFFS pattern
        ],
        "corruption_indicators": []
    },
    
    "Respondent": {
        "name": "Respondent",
        "description": "The opposing party in the case",
        "patterns": [
            r"(?:RESPONDENT|DEFENDANT)[S]?\s*$",
            r"(?:Respondent|Defendant)[:\s]*\n\s*([A-Z][^\n]+)",
            r"-VS-",  # Common separator indicating respondent section follows
            r"^\s*-vs-\s*$"
        ],
        "corruption_indicators": []
    },
    
    "PetitionerBlock": {
        "name": "Petitioner Block",
        "description": "Full petitioner details including name and address",
        "patterns": [
            r"(?:PLAINTIFF|PETITIONER|APPELLANT)[S]?\s*$.*?(?=^Vs?\.?$)",
            r"(?s)(?:PLAINTIFF|PETITIONER|APPELLANT)[S]?\s*\n(?:.*?\n){1,20}?(?=^\s*(?:v\.|vs|versus)\s*$)"
        ],
        "corruption_indicators": []
    },
    
    "RespondentBlock": {
        "name": "Respondent Block",
        "description": "Full respondent details including name and address",
        "patterns": [
            r"(?s)^\s*(?:v\.|vs|versus)\s*$.*?(?:DEFENDANT|RESPONDENT)[S]?\s*$",
            r"(?s)(?:^\s*(?:v\.|vs|versus)\s*$)(?:.*?\n){1,20}?(?=^(?:DEFENDANT|RESPONDENT)[S]?\s*$)"
        ],
        "corruption_indicators": []
    },
    
    "PlaintiffAddress": {
        "name": "Plaintiff Address",
        "description": "Address of the plaintiff",
        "patterns": [
            r"No\.\s*[\d/A-Z,-]+.*?(?:Road|Street|Lane|Avenue|Mawatha|Place)",
            r"No\.\s*[\d/A-Z,-]+,\s*[A-Z][a-z]+(?:,\s*[A-Z][a-z]+){1,3}",
            r"All\s+of\s+[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*",  # "All of Location, Location"
            r"\d+\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\."  # Numbered items with locations
        ],
        "corruption_indicators": []
    },
    
    "DefendantAddress": {
        "name": "Defendant Address",
        "description": "Address of the defendant",
        "patterns": [
            r"No\.\s*[\d/A-Z,-]+.*?(?:Road|Street|Lane|Avenue|Mawatha|Place)",
            r"No\.\s*[\d/A-Z,-]+,\s*[A-Z][a-z]+(?:,\s*[A-Z][a-z]+){1,3}",
            r"All\s+of\s+[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*"
        ],
        "corruption_indicators": []
    },
    
    "CounselSection": {
        "name": "Counsel Section",
        "description": "Section listing counsel for parties",
        "patterns": [
            r"^\s*(?:Counsel|COUNSEL)\s*:\s*"
        ],
        "corruption_indicators": []
    },
    
    "CounselForAppellant": {
        "name": "Counsel for Appellant",
        "description": "Counsel representing the appellant",
        "patterns": [
            r"(?m)^.*?for\s+(?:the\s+)?(?:petitioner|appellant|plaintiff)"
        ],
        "corruption_indicators": []
    },
    
    "CounselForRespondent": {
        "name": "Counsel for Respondent",
        "description": "Counsel representing the respondent",
        "patterns": [
            r"(?m)^.*?for\s+(?:the\s+)?(?:respondent|defendant)"
        ],
        "corruption_indicators": []
    },
    
    "AppealType": {
        "name": "Appeal Type",
        "description": "Type of appeal (Civil, Criminal, etc.)",
        "patterns": [
            r"(?:Civil|Criminal|Fundamental\s+Rights)\s+(?:appeal|application)",
            r"Application\s+for\s+Leave\s+to\s+Appeal",
            r"exercising\s+its\s+(?:Civil|Criminal)\s+(?:Appellate\s+)?Jurisdiction"
        ],
        "corruption_indicators": []
    },
    
    "LowerCourtNumber": {
        "name": "Lower Court Number",
        "description": "Case number from the lower court",
        "patterns": [
            r"(?:District|Magistrate'?s?|D\.C\.|M\.C\.)\s+(?:Court)?.*?(?:No|Case)[:\.\s]+([A-Z0-9/\\-]+)",
            r"Provincial\s+High\s+Court.*?holden\s+at\s+[A-Z][a-z]+"
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
            r"(?:Section|section)\s+\d+(?:\s*\([a-z0-9]+\))?",
            r"(?:Article|Act)\s+(?:No\.?\s*)?\d+",
            r"Article\s+\d+\s+of\s+the\s+Constitution",
            r"Act\s+No\.\s*\d+\s+of\s+\d{4}"
        ],
        "corruption_indicators": []
    },
    
    "Jurisdiction": {
        "name": "Jurisdiction",
        "description": "Reference to court's jurisdiction",
        "patterns": [
            r"(?i)\bjurisdiction\b",
            r"exercising\s+its\s+(?:Civil|Criminal)\s+(?:Appellate\s+)?Jurisdiction",
            r"Appellate\s+Jurisdiction"
        ],
        "corruption_indicators": []
    },
    
    "ClaimAmount": {
        "name": "Claim Amount",
        "description": "Monetary amount claimed",
        "patterns": [
            r"(?:Rs\.?|Rupees)\s*[\d,]+(?:[/\.\-=]\d*)?",
            r"(?:US\s*)?(?:Dollars?|USD)\s*[\d,]+(?:\.\d+)?"
        ],
        "corruption_indicators": [r"###", r"XXX"]
    },
    
    "InstructedBy": {
        "name": "Instructed By",
        "description": "Instructing attorney information",
        "patterns": [
            r"(?:Instructed|Instructing)\s+(?:by|attorney|solicitor)"
        ],
        "corruption_indicators": []
    },
    
    "PrayerForRelief": {
        "name": "Prayer for Relief",
        "description": "Relief sought by the petitioner",
        "patterns": [
            r"(?i)(?:prayer|relief|order)[:\s]+[^\n]+",
            r"(?i)(?:seeking|praying\s+for|claiming)[^\n]+"
        ],
        "corruption_indicators": []
    },
    
    "Plaintiff": {
        "name": "Plaintiff",
        "description": "Plaintiff party name",
        "patterns": [
            r"Plaintiff[:\s]*([^\n]+)"
        ],
        "corruption_indicators": []
    },
    
    "Defendant": {
        "name": "Defendant", 
        "description": "Defendant party name",
        "patterns": [
            r"Defendant[:\s]*([^\n]+)"
        ],
        "corruption_indicators": []
    },
    
    "PlaintiffBlock": {
        "name": "Plaintiff Block",
        "description": "Complete plaintiff information block",
        "patterns": [
            r"PLAINTIFF[S]?\s*\n(?:.*?\n){1,10}"
        ],
        "corruption_indicators": []
    },
    
    "DefendantBlock": {
        "name": "Defendant Block",
        "description": "Complete defendant information block",
        "patterns": [
            r"(?:RESPONDENT|DEFENDANT)[S]?\s*\n(?:.*?\n){1,15}"
        ],
        "corruption_indicators": []
    }
}


def detect_clause(text: str, clause_key: str) -> Tuple[str, Optional[str], Optional[int], Optional[int]]:
    """
    Detect a specific clause in the text.
    
    Args:
        text: The legal document text
        clause_key: The key of the clause to detect (e.g., "CourtTitle")
        
    Returns:
        Tuple of (status, content, start_pos, end_pos)
        status: "Present", "Missing", or "Corrupted"
        content: Extracted content if found
        start_pos: Start position of the clause in text
        end_pos: End position of the clause in text
    """
    if clause_key not in CLAUSE_DEFINITIONS:
        return ("Missing", None, None, None)
    
    clause_def = CLAUSE_DEFINITIONS[clause_key]
    patterns = clause_def["patterns"]
    corruption_indicators = clause_def["corruption_indicators"]
    
    # Try to find the clause using its patterns
    for pattern in patterns:
        try:
            match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
            if match:
                matched_text = match.group(0)
                start_pos = match.start()
                end_pos = match.end()
                
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
            # If pattern fails, continue to next pattern
            continue
    
    # If no pattern matched, the clause is missing
    return ("Missing", None, None, None)


def detect_all_clauses(text: str) -> List[Dict]:
    """
    Detect all 28 clauses in the text.
    
    Args:
        text: The legal document text
        
    Returns:
        List of dictionaries containing clause detection results
    """
    results = []
    
    for clause_key, clause_def in CLAUSE_DEFINITIONS.items():
        status, content, start_pos, end_pos = detect_clause(text, clause_key)
        
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
