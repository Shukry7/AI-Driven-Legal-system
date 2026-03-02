"""
Clause Prediction Service - LLM-powered AI suggestions for missing clauses.

This service:
1. Takes clause detection results (from regex analysis)
2. Identifies which MISSING clauses are LLM-predictable (12 selected clauses)
3. Extracts relevant context from the document for each missing clause
4. Sends batch request to OpenAI GPT for AI suggestions
5. Returns structured suggestions with confidence scores
6. Supports caching to avoid redundant LLM calls
7. Graceful fallback if LLM fails

Configurable via environment variables:
- OPENAI_API_KEY: API key for OpenAI
- CLAUSE_PREDICTION_MODE: "auto" (run after detection) or "manual" (separate button)
- OPENAI_MODEL: Model to use (default: gpt-4o-mini)
"""

import os
import re
import json
import hashlib
import logging
import asyncio
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
CLAUSE_PREDICTION_MODE = os.getenv("CLAUSE_PREDICTION_MODE", "manual")  # "auto" or "manual"

# Cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "uploads" / ".prediction_cache"


# ─── 12 Selected LLM-Predictable Clauses ─────────────────────────────────────

PREDICTABLE_CLAUSES = {
    "judge_concurrence": {
        "name": "Judge Concurrence Block",
        "predictability": "FULL",
        "frequency": "95.5%",
        "position": "End of judgment (last 5-15 lines)",
        "detection_regex": r"I\s+agree[.,]?",
        "detection_scope": "last_20_percent",
    },
    "conclusion_section": {
        "name": "Conclusion / Disposition Section",
        "predictability": "FULL",
        "frequency": "82.3%",
        "position": "80-95% through document",
        "detection_regex": r"(?:(?:^|\n)\s*(?:Conclusion|CONCLUSION|Determination|DETERMINATION)\s*:?\s*(?:\n|$)|[Ff]or\s+(?:the\s+)?(?:reasons|foregoing\s+reasons|all\s+(?:the\s+)?(?:above|aforesaid|foregoing)\s+reasons)\s+(?:set\s+(?:out|forth)\s+above|stated|mentioned|given|I|we)|[Ii]n\s+(?:the\s+(?:above\s+)?circumstances|these\s+circumstances|the\s+premises|the\s+result|the\s+upshot)|[Tt]aking\s+into\s+consideration|(?:I|[Ww]e)\s+(?:am|are)\s+of\s+the\s+(?:view|opinion)\s+that|(?:I|[Ww]e)\s+(?:hold|find|conclude)\s+that|(?:I|[Ww]e)\s+(?:accordingly|therefore|thus|hence)\s+(?:dismiss|allow|affirm|set\s+aside|uphold)|[Ii]n\s+(?:view|light)\s+of\s+(?:the\s+)?(?:above|aforesaid|foregoing)|(?:I|[Ww]e)\s+(?:see|find)\s+no\s+(?:merit|reason|ground|basis))",
        "detection_scope": "last_40_percent",
    },
    "disposition_formula": {
        "name": "Disposition Formula",
        "predictability": "FULL",
        "frequency": "50.4%",
        "position": "Last 5-10% of document",
        "detection_regex": r"(?:[Aa]ppeal\s+(?:is\s+)?(?:allowed|dismissed|partly\s+allowed)|[Aa]pplication\s+(?:is\s+)?(?:allowed|dismissed|granted)|[Rr]ule\s+(?:is\s+)?made\s+absolute)",
        "detection_scope": "last_20_percent",
    },
    "procedural_history": {
        "name": "Procedural History",
        "predictability": "PARTIAL",
        "frequency": "93.8%",
        "position": "5-20% through document",
        "detection_regex": r"(?:filed\s+(?:an?\s+)?(?:action|appeal|application|plaint|this\s+appeal)|instituted\s+(?:partition\s+)?action|[Tt]his\s+is\s+an\s+appeal|[Tt]his\s+appeal\s+arises|[Aa]ggrieved\s+by\s+the|[Bb]eing\s+aggrieved|preferred\s+this\s+appeal|[Ii]n\s+the\s+matter\s+of\s+an\s+(?:appeal|application)|appealed\s+to\s+(?:this\s+Court|the\s+High\s+Court|the\s+Court\s+of\s+Appeal)|(?:the\s+)?(?:above|instant|present)\s+(?:appeal|case|matter|action|petition|application)|(?:appeal|petition)\s+(?:against|from)\s+(?:the\s+)?(?:judgment|order|decree|decision)|(?:the\s+)?(?:brief|material|relevant|salient)\s+facts|(?:was|were)\s+(?:preferred|filed|lodged|instituted)\s+(?:before|in|to|with))",
        "detection_scope": "first_30_percent",
    },
    "leave_to_appeal": {
        "name": "Leave to Appeal Statement",
        "predictability": "PARTIAL",
        "frequency": "51.1%",
        "position": "10-25% through document",
        "detection_regex": r"(?:[Ll]eave\s+to\s+[Aa]ppeal\s+(?:was|has\s+been)\s+granted|[Tt]his\s+[Cc]ourt\s+(?:has\s+)?granted\s+(?:special\s+)?[Ll]eave|[Ss]pecial\s+[Ll]eave\s+to\s+[Aa]ppeal|granted\s+[Ll]eave\s+(?:to\s+[Aa]ppeal\s+)?on\s+the|[Ll]eave\s+to\s+[Aa]ppeal\s+on\s+the\s+following)",
        "detection_scope": "first_40_percent",
    },
    "lower_court_findings": {
        "name": "Lower Court Findings Summary",
        "predictability": "PARTIAL",
        "frequency": "58.6%",
        "position": "15-40% through document",
        "detection_regex": r"(?:(?:[Ll]earned\s+)?(?:Additional\s+)?(?:District|High\s+Court|Commercial\s+High\s+Court|Trial|Magistrate'?s?)\s+(?:Court\s+)?Judge[s]?\s+(?:held|found|concluded|observed|determined|decided|dismissed|allowed|granted|erred|ruled|was\s+of\s+the\s+(?:view|opinion))|(?:the\s+)?(?:High\s+Court|Court\s+of\s+Appeal|District\s+Court|Commercial\s+High\s+Court|Labour\s+Tribunal|Magistrate.s\s+Court)\s+(?:held|found|decided|dismissed|allowed|affirmed|set\s+aside|erred|upheld|ruled|observed|concluded|determined)|(?:the\s+)?(?:impugned|challenged|contested)\s+(?:judgment|order|decree|decision)|(?:the\s+)?(?:learned\s+)?(?:trial\s+)?[Jj]udge\s+(?:held|found|decided|concluded|observed|determined|dismissed|allowed|erred|ruled)|court\s+(?:of\s+first\s+instance|below|a\s+quo))",
        "detection_scope": "full",
    },
    "factual_background_label": {
        "name": "Factual Background Label",
        "predictability": "FULL",
        "frequency": "18.6%",
        "position": "10-25% through document",
        "detection_regex": r"(?:(?:^|\n)\s*(?:Factual\s+[Mm]atrix|Facts?\s+in\s+[Bb]rief|The\s+[Ff]actual\s+[Bb]ackground|Background\s+[Ff]acts?|The\s+[Ff]acts?\s+of\s+the\s+[Cc]ase|Introduction|Brief\s+[Ff]acts|The\s+[Ff]acts|Background|BACKGROUND|THE\s+FACTS|FACTUAL\s+MATRIX|FACTS\s+IN\s+BRIEF|INTRODUCTION|Brief\s+[Bb]ackground|The\s+[Bb]ackground|Factual\s+[Bb]ackground|Consideration\s+of\s+[Ff]acts?)\s*:?\s*\.?\s*(?:\n|$))",
        "detection_scope": "first_30_percent",
    },
    "appellant_argument": {
        "name": "Appellant Argument Summary",
        "predictability": "PARTIAL",
        "frequency": "53.9%",
        "position": "40-70% through document",
        "detection_regex": r"(?:(?:[Ll]earned\s+)?[Cc]ounsel\s+for\s+(?:the\s+)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)s?[\s,]+(?:submitted|contended|argued|urged|maintained|pointed\s+out|stated)|(?:the\s+)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)s?\s+(?:submitted|contended|argued|urged|maintained|averred|stated)|(?:it\s+was\s+)?(?:submitted|contended|argued|urged)\s+(?:by|on\s+behalf\s+of)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)|(?:the\s+)?(?:submission|contention|argument)s?\s+(?:of|made\s+by)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner))",
        "detection_scope": "full",
    },
    "respondent_argument": {
        "name": "Respondent Argument Summary",
        "predictability": "PARTIAL",
        "frequency": "41.3%",
        "position": "45-75% through document",
        "detection_regex": r"(?:(?:[Ll]earned\s+)?[Cc]ounsel\s+for\s+(?:the\s+)?(?:[Rr]espondent|[Dd]efendant)s?[\s,]+(?:submitted|contended|argued|urged|maintained|pointed\s+out|stated)|(?:the\s+)?(?:[Rr]espondent|[Dd]efendant)s?\s+(?:submitted|contended|argued|urged|maintained|averred|stated)|(?:it\s+was\s+)?(?:submitted|contended|argued|urged)\s+(?:by|on\s+behalf\s+of)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Rr]espondent|[Dd]efendant)|(?:the\s+)?(?:submission|contention|argument)s?\s+(?:of|made\s+by)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Rr]espondent|[Dd]efendant))",
        "detection_scope": "full",
    },
    "legal_framework": {
        "name": "Legal Framework Introduction",
        "predictability": "PARTIAL",
        "frequency": "98.5%",
        "position": "30-50% through document",
        "detection_regex": r"(?:(?:[Ss]ection|[Ss]\.)\s+\d+(?:\s*\([^)]*\))?\s+of\s+the|[Aa]rticle\s+\d+(?:\s*\([^)]*\))?\s+of\s+the|(?:the\s+)?(?:relevant|applicable|material|pertinent)\s+(?:legal\s+)?(?:section|provision|law|statute|enactment)|(?:provides?|reads?|states?|stipulates?|enacts?)\s+(?:as\s+follows|that|inter\s+alia)|[Ii]n\s+terms\s+of\s+(?:[Ss]ection|[Aa]rticle|the\s+|[Ss]\.)|(?:Civil|Criminal|Penal|Companies?)\s+(?:Procedure\s+)?(?:Code|Act|Ordinance)|(?:Evidence|Prescription|Limitation|Registration|Trust)\s+(?:Ordinance|Act)|(?:Ordinance|Act|Statute)\s+No\.?\s*\d+)",
        "detection_scope": "full",
    },
    "issue_analysis": {
        "name": "Issue Analysis Structure",
        "predictability": "PARTIAL",
        "frequency": "90.2%",
        "position": "20-40% through document",
        "detection_regex": r"(?:(?:the\s+)?(?:following\s+)?(?:issues?|questions?)\s+(?:that\s+)?(?:arise|for\s+(?:consideration|determination|decision|adjudication))|(?:the\s+)?(?:issues?|questions?\s+of\s+law)\s+(?:for|that\s+arise\s+for)\s+(?:determination|consideration)|[Gg]rounds?\s+of\s+appeal\s+(?:urged|are|raised|set\s+out)|(?:question|issue|point)\s+(?:is|to\s+be\s+(?:considered|decided|determined|answered))|(?:the\s+)?(?:main|principal|primary|central|key)\s+(?:question|issue|point)|[Ww]hether\s+(?:the|a|an|or\s+not)|(?:questions?\s+of\s+law)|(?:question|issue)\s+(?:No\.?\s*)?\d|(?:first|second|third|fourth|fifth|next)\s+(?:question|issue|point|ground|contention)|(?:I|[Ww]e)\s+(?:now\s+)?(?:turn|proceed|come)\s+to\s+(?:consider|examine|address|deal)|(?:it\s+is)\s+(?:necessary|important)\s+to\s+(?:consider|examine|determine))",
        "detection_scope": "full",
    },
    "cost_order": {
        "name": "Cost Order",
        "predictability": "FULL",
        "frequency": "64.5%",
        "position": "Last 5% of document",
        "detection_regex": r"(?:with(?:out)?\s+costs?|[Nn]o\s+costs?|costs?\s+(?:fixed|assessed)\s+at\s+Rs\.|no\s+order\s+(?:as\s+to|for|regarding|with\s+regard\s+to)\s+costs?|(?:I|we)\s+(?:make|do)\s+no[r]?\s+order.*?costs?|bear\s+(?:their\s+own|his|her|its)\s+(?:own\s+)?costs?|entitled\s+to\s+(?:the\s+)?costs?|costs?\s+(?:of|to)\s+(?:this|the)\s+(?:appeal|action|case|petition|application)|(?:pay|paid)\s+Rs\.?\s*[\d,/]+.*?(?:as\s+)?costs?|(?:punitive|nominal|taxed)\s+costs?|subject\s+to\s+costs?)",
        "detection_scope": "last_20_percent",
    },
}


# ─── Context Extraction Functions ─────────────────────────────────────────────

def extract_judge_names(text: str) -> List[str]:
    """Extract judge names from Before:/Coram: section."""
    match = re.search(
        r'(?:BEFORE|Before|Coram)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:Counsel|Argued|Heard|Written))',
        text[:3000]
    )
    if match:
        names_block = match.group(1)
        names = []
        for line in names_block.strip().split('\n'):
            line = line.strip()
            # Remove "Hon." prefix
            line = re.sub(r'^(?:Hon\.?\s*)', '', line)
            if line and ('J' in line or 'CJ' in line):
                names.append(line)
        return names
    return []


def extract_judgment_author(text: str) -> Optional[str]:
    """Extract which judge wrote the judgment."""
    # Look for pattern after Decided/Written Submissions: "Surname, J" or "Surname, PC, J"
    match = re.search(
        r'(?:Decided\s+on|Written\s+Submissions|Argued\s+on)[\s\S]*?\n\s*\n([\s\S]*?)(?=\n\s*\n)',
        text[:5000]
    )
    if match:
        block = match.group(1)
        author_match = re.search(
            r'([A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*)\s*,?\s*(?:PC\s*,?\s*)?(?:J|CJ)\b',
            block
        )
        if author_match:
            return author_match.group(0).strip()

    # Fallback: look in the body text for first judge reference
    body_match = re.search(
        r'\n\s*([A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*)\s*,?\s*(?:PC\s*,?\s*)?(?:J|CJ)\s*\.?\s*\n',
        text[2000:6000]
    )
    if body_match:
        return body_match.group(0).strip()
    return None


def extract_case_numbers(text: str) -> Dict[str, str]:
    """Extract all case numbers from header."""
    header = text[:3000]
    result = {}

    sc_match = re.search(r'(S\.?C\.?\s*(?:Appeal|FR|CHC|SPL\s*LA|LA|APPEAL)\s*(?:No\.?\s*)?[\d/()]+)', header, re.IGNORECASE)
    if sc_match:
        result['sc'] = sc_match.group(1).strip()

    hcca_match = re.search(r'((?:WP/)?H\.?C\.?C\.?A\.?\s*[^\n]*[\d/]+)', header, re.IGNORECASE)
    if hcca_match:
        result['hcca'] = hcca_match.group(1).strip()

    dc_match = re.search(r'(D\.?C\.?\s+[A-Za-z]+\s+(?:Case\s+)?No\.?\s*[\d/]+)', header, re.IGNORECASE)
    if dc_match:
        result['dc'] = dc_match.group(1).strip()

    # Generic case number fallback
    generic = re.findall(r'(?:Case\s+)?No\.?\s*[\d/]+(?:\([A-Z]+\))?', header)
    if generic and not result:
        result['case'] = generic[0].strip()

    return result


def extract_party_names(text: str) -> Dict[str, str]:
    """Extract plaintiff/appellant and respondent/defendant names."""
    header = text[:3000]
    parties = {}

    # Look for name blocks before party role labels
    petitioner_match = re.search(
        r'([A-Z][^\n]{2,50})\n[^\n]*(?:Plaintiff|Appellant|Petitioner)',
        header
    )
    if petitioner_match:
        parties['petitioner'] = petitioner_match.group(1).strip()

    respondent_match = re.search(
        r'(?:Vs\.?|[Vv]ersus)\s*\n+([A-Z][^\n]{2,50})',
        header
    )
    if respondent_match:
        parties['respondent'] = respondent_match.group(1).strip()

    return parties


def extract_counsel_names(text: str) -> Dict[str, str]:
    """Extract counsel names for appellant and respondent."""
    header = text[:4000]
    counsel = {}

    app_counsel = re.search(
        r'([A-Z][^\n]+?)(?:\s+(?:with|instructed)\s+[^\n]+)?\s+for\s+(?:the\s+)?(?:Plaintiff|Appellant|Petitioner)',
        header
    )
    if app_counsel:
        counsel['appellant'] = app_counsel.group(1).strip()

    resp_counsel = re.search(
        r'([A-Z][^\n]+?)(?:\s+(?:with|instructed)\s+[^\n]+)?\s+for\s+(?:the\s+)?(?:Respondent|Defendant)',
        header
    )
    if resp_counsel:
        counsel['respondent'] = resp_counsel.group(1).strip()

    return counsel


def extract_questions_of_law(text: str) -> List[str]:
    """Extract numbered questions of law."""
    match = re.search(
        r'questions?\s+of\s+law[\s\S]*?(?:\n\s*\n|\Z)',
        text, re.IGNORECASE
    )
    if match:
        block = match.group(0)
        questions = re.findall(
            r'[\(\[]?\s*[a-z\divx]+\s*[\)\]]?\s*\.?\s*((?:Whether|Did|Does|Has|Is|Was|Can|Should|May|Could|Would)[\s\S]*?)(?=[\(\[]?\s*[a-z\divx]+\s*[\)\]]|$)',
            block, re.IGNORECASE
        )
        return [q.strip() for q in questions if q.strip() and len(q.strip()) > 20]
    return []


def extract_statutes_mentioned(text: str) -> Dict[str, List[str]]:
    """Extract Acts, Ordinances, and Articles mentioned."""
    acts = re.findall(r'(?:the\s+)?(\w+(?:\s+\w+){0,4})\s+(?:Act|Ordinance)(?:\s+No\.?\s*\d+)?', text)
    articles = re.findall(r'Article\s+(\d+(?:\(\d+\))?(?:\([a-z]\))?)', text)
    sections = re.findall(r'Section\s+(\d+(?:\(\d+\))?)', text)
    return {
        'acts': list(set(acts[:10])),
        'articles': list(set(articles[:10])),
        'sections': list(set(sections[:10]))
    }


def extract_case_type(text: str) -> str:
    """Determine case type from case number prefix."""
    header = text[:1000]
    if re.search(r'SC\s*[\(/]?\s*FR', header, re.IGNORECASE):
        return "fundamental_rights_application"
    elif re.search(r'SC\s+CHC|CHC\s+Appeal', header, re.IGNORECASE):
        return "commercial_high_court_appeal"
    elif re.search(r'Criminal|Cr\.?\s*App', header, re.IGNORECASE):
        return "criminal_appeal"
    elif re.search(r'SC\s+Appeal|SC\s*\(', header, re.IGNORECASE):
        return "civil_appeal"
    elif re.search(r'Leave\s+to\s+Appeal', header, re.IGNORECASE):
        return "leave_to_appeal_application"
    return "civil_appeal"


def extract_outcome(text: str) -> str:
    """Extract appeal outcome from end of document."""
    last_section = text[-3000:]
    if re.search(r'appeal\s+is\s+allowed', last_section, re.IGNORECASE):
        return "allowed"
    elif re.search(r'appeal\s+is\s+dismissed', last_section, re.IGNORECASE):
        return "dismissed"
    elif re.search(r'application\s+is\s+(?:allowed|granted)', last_section, re.IGNORECASE):
        return "allowed"
    elif re.search(r'application\s+is\s+dismissed', last_section, re.IGNORECASE):
        return "dismissed"
    elif re.search(r'leave\s+to\s+appeal\s+(?:is\s+)?(?:refused|dismissed)', last_section, re.IGNORECASE):
        return "refused"
    return "unknown"


def extract_lower_court(text: str) -> str:
    """Extract lower court name from case numbers or body."""
    header = text[:3000]
    lc_match = re.search(r'(District\s+Court\s+of\s+\w+)', header)
    if lc_match:
        return lc_match.group(1)
    hc_match = re.search(r'(High\s+Court\s+of\s+(?:the\s+)?[\w\s]+Province)', header)
    if hc_match:
        return hc_match.group(1)
    if re.search(r'District\s+Court', header):
        return "District Court"
    if re.search(r'High\s+Court', header):
        return "High Court"
    return "lower court"


def extract_court(text: str) -> str:
    """Extract main court (Supreme Court, Court of Appeal, etc.)."""
    header = text[:500]
    if re.search(r'SUPREME\s+COURT', header, re.IGNORECASE):
        return "Supreme Court"
    elif re.search(r'COURT\s+OF\s+APPEAL', header, re.IGNORECASE):
        return "Court of Appeal"
    return "Supreme Court"


# ─── Detect Missing Predictable Clauses ───────────────────────────────────────

def get_text_scope(text: str, scope: str) -> str:
    """Get the relevant portion of text based on scope."""
    text_len = len(text)
    if scope == "first_30_percent":
        return text[:int(text_len * 0.3)]
    elif scope == "first_40_percent":
        return text[:int(text_len * 0.4)]
    elif scope == "last_20_percent":
        return text[int(text_len * 0.8):]
    elif scope == "last_40_percent":
        return text[int(text_len * 0.6):]
    return text


def detect_missing_predictable_clauses(text: str) -> List[Dict[str, Any]]:
    """
    Scan document for missing LLM-predictable clauses using dedicated prediction regexes.
    
    Returns list of clause keys that are missing and can be predicted by LLM.
    """
    missing = []

    for clause_key, clause_info in PREDICTABLE_CLAUSES.items():
        scope_text = get_text_scope(text, clause_info["detection_scope"])
        pattern = clause_info["detection_regex"]

        try:
            match = re.search(pattern, scope_text, re.MULTILINE)
            if not match:
                missing.append({
                    "clause_key": clause_key,
                    "clause_name": clause_info["name"],
                    "predictability": clause_info["predictability"],
                    "frequency": clause_info["frequency"],
                    "position": clause_info["position"],
                })
        except re.error as e:
            logger.warning(f"Regex error for clause {clause_key}: {e}")

    return missing


# ─── Context Extraction per Clause ────────────────────────────────────────────

def extract_context_for_clause(text: str, clause_key: str) -> Dict[str, Any]:
    """Extract relevant context from document for a specific clause type."""
    context = {"clause_type": clause_key}

    if clause_key == "judge_concurrence":
        context["judge_names"] = extract_judge_names(text)
        context["judgment_author"] = extract_judgment_author(text)
        context["court"] = extract_court(text)

    elif clause_key == "conclusion_section":
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)
        context["lower_court"] = extract_lower_court(text)

    elif clause_key == "disposition_formula":
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)

    elif clause_key == "procedural_history":
        context["case_numbers"] = extract_case_numbers(text)
        context["parties"] = extract_party_names(text)
        context["case_type"] = extract_case_type(text)
        context["lower_court"] = extract_lower_court(text)

    elif clause_key == "leave_to_appeal":
        context["questions_of_law"] = extract_questions_of_law(text)
        context["case_type"] = extract_case_type(text)

    elif clause_key == "lower_court_findings":
        context["lower_court"] = extract_lower_court(text)
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)

    elif clause_key == "factual_background_label":
        context["case_type"] = extract_case_type(text)

    elif clause_key == "appellant_argument":
        context["parties"] = extract_party_names(text)
        context["counsel"] = extract_counsel_names(text)
        context["questions_of_law"] = extract_questions_of_law(text)

    elif clause_key == "respondent_argument":
        context["parties"] = extract_party_names(text)
        context["counsel"] = extract_counsel_names(text)
        context["questions_of_law"] = extract_questions_of_law(text)

    elif clause_key == "legal_framework":
        context["statutes"] = extract_statutes_mentioned(text)
        context["case_type"] = extract_case_type(text)

    elif clause_key == "issue_analysis":
        context["case_type"] = extract_case_type(text)
        context["questions_of_law"] = extract_questions_of_law(text)

    elif clause_key == "cost_order":
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)

    return context


# ─── LLM Prompt Generation ───────────────────────────────────────────────────

def build_clause_prompt(clause_key: str, context: Dict[str, Any]) -> str:
    """Build the LLM prompt for a specific clause type based on extracted context."""

    if clause_key == "judge_concurrence":
        judge_names = context.get("judge_names", [])
        author = context.get("judgment_author", "Unknown")
        court = context.get("court", "Supreme Court")
        return f"""Generate the judge concurrence block for a Sri Lankan {court} judgment.

The judgment was authored by {author}.
The bench consists of: {', '.join(judge_names) if judge_names else 'Unknown judges'}

For each NON-authoring judge, generate:
[Judge Full Name]
I agree.

JUDGE OF THE {court.upper()}

Rules:
- The authoring judge does NOT get an "I agree" block
- Each non-authoring judge gets their own block
- Use exact names as provided
- Title is always "JUDGE OF THE {court.upper()}" (or "CHIEF JUSTICE" if applicable)"""

    elif clause_key == "conclusion_section":
        return f"""Generate a conclusion section for a Sri Lankan Supreme Court judgment.

Case type: {context.get('case_type', 'civil_appeal')}
Outcome: appeal {context.get('outcome', 'unknown')}
Lower court: {context.get('lower_court', 'lower court')}

Generate a formal conclusion paragraph using one of these standard openings:
- "For the foregoing reasons..."
- "In the above circumstances..."
- "Accordingly..."
- "For all the reasons set out above..."

Follow with the final order (appeal dismissed/allowed) and reference the lower court judgment.
Keep it concise - 2-4 sentences maximum."""

    elif clause_key == "disposition_formula":
        return f"""Generate the disposition formula for a Sri Lankan Supreme Court judgment.

Case type: {context.get('case_type', 'civil_appeal')}
Outcome: {context.get('outcome', 'unknown')}

Use one of these standard formulas:
- "The appeal is dismissed [with/without costs]."
- "The appeal is allowed. The judgment of the [lower court] is set aside."
- "The application is dismissed. No costs."
- "The appeal is partly allowed."

Generate ONLY the disposition formula line, nothing else."""

    elif clause_key == "procedural_history":
        cases = context.get("case_numbers", {})
        parties = context.get("parties", {})
        return f"""Generate a procedural history paragraph for a Sri Lankan Supreme Court judgment.

Case numbers: {json.dumps(cases)}
Petitioner/Plaintiff: {parties.get('petitioner', '[Party Name]')}
Respondent/Defendant: {parties.get('respondent', '[Party Name]')}
Case type: {context.get('case_type', 'civil_appeal')}
Lower court: {context.get('lower_court', 'lower court')}

Generate a paragraph explaining how the case traveled through the courts using formal judicial language.
Common patterns: "The [Party] instituted action...", "Being aggrieved by the [judgment]...", "This Court granted leave to appeal..."
Use placeholders [date] for unknown dates. Keep it concise - 3-5 sentences."""

    elif clause_key == "leave_to_appeal":
        questions = context.get("questions_of_law", [])
        questions_text = "\n".join([f"({chr(97+i)}) {q}" for i, q in enumerate(questions)]) if questions else "[Questions not extracted]"
        return f"""Generate a leave to appeal statement for a Sri Lankan Supreme Court judgment.

Questions of law:
{questions_text}

Use this standard format:
"This Court granted [special] leave to appeal on [date] on the following question(s) of law:

(a) [Question 1]
(b) [Question 2]
..."

If questions are not available, generate appropriate placeholder structure."""

    elif clause_key == "lower_court_findings":
        return f"""Generate a lower court findings summary for a Sri Lankan Supreme Court judgment.

Lower court: {context.get('lower_court', 'District Court')}
Case type: {context.get('case_type', 'civil_appeal')}
Case outcome direction: {context.get('outcome', 'unknown')}

Use formal judicial language:
"The learned [Judge title] [held/found/concluded] that [finding]. Accordingly, the learned [Judge title] [entered judgment / dismissed the action]."

Generate 2-3 sentences summarizing what the lower court decided. Use [placeholders] for specific details you cannot determine."""

    elif clause_key == "factual_background_label":
        case_type = context.get("case_type", "civil_appeal")
        return f"""Suggest an appropriate section heading label for the factual background section of a Sri Lankan {case_type} judgment.

Choose from these standard labels (pick most appropriate):
- "The Facts"
- "Factual Background"
- "Brief Facts"
- "Background"
- "The Facts of the Case"

Output ONLY the heading text, nothing else."""

    elif clause_key == "appellant_argument":
        parties = context.get("parties", {})
        counsel = context.get("counsel", {})
        questions = context.get("questions_of_law", [])
        grounds_text = "\n".join([f"- {q}" for q in questions]) if questions else "[Grounds not extracted]"
        return f"""Generate an appellant argument summary for a Sri Lankan Supreme Court judgment.

Appellant/Petitioner: {parties.get('petitioner', '[Party Name]')}
Counsel for Appellant: {counsel.get('appellant', 'Learned Counsel')}
Grounds/Questions:
{grounds_text}

Use this format:
"Learned [Counsel/President's Counsel] for the [Party role] [submitted/contended/argued] that:
(1) [Argument based on ground 1]
(2) [Argument based on ground 2]..."

Use formal judicial language. Generate 2-4 argument points. Use [placeholders] for unknowns."""

    elif clause_key == "respondent_argument":
        parties = context.get("parties", {})
        counsel = context.get("counsel", {})
        return f"""Generate a respondent argument summary for a Sri Lankan Supreme Court judgment.

Respondent/Defendant: {parties.get('respondent', '[Party Name]')}
Counsel for Respondent: {counsel.get('respondent', 'Learned Counsel')}

Use this format:
"Learned Counsel for the Respondent [submitted/contended/urged] that [counter-argument responding to appellant's position].
It was further submitted on behalf of the Respondent that [additional counter-argument]."

Generate counter-arguments in formal judicial language. 2-3 sentences. Use [placeholders] for unknowns."""

    elif clause_key == "legal_framework":
        statutes = context.get("statutes", {})
        acts = statutes.get("acts", [])[:5]
        sections = statutes.get("sections", [])[:5]
        articles = statutes.get("articles", [])[:5]
        return f"""Generate a legal framework introduction for a Sri Lankan Supreme Court judgment.

Statutes mentioned: {', '.join(acts) if acts else '[No statutes extracted]'}
Sections: {', '.join(['Section ' + s for s in sections]) if sections else '[None]'}
Articles: {', '.join(['Article ' + a for a in articles]) if articles else '[None]'}
Case type: {context.get('case_type', 'civil_appeal')}

Use formal judicial language:
"The relevant legal provisions applicable to this case are as follows:..."
or "It is necessary to examine the statutory framework governing..."

Generate 2-4 sentences introducing the legal framework. Use [placeholders] for provision text you cannot determine."""

    elif clause_key == "issue_analysis":
        case_type = context.get("case_type", "civil_appeal")
        questions = context.get("questions_of_law", [])
        issues_text = "\n".join([f"({chr(97+i)}) {q}" for i, q in enumerate(questions)]) if questions else "[Issues not extracted]"
        return f"""Generate an issue/question analysis structure for a Sri Lankan Supreme Court judgment.

Case type: {case_type}
Issues/Questions:
{issues_text}

Use this format:
"The following [issues arise for determination / questions of law arise] in this [appeal/application]:

(a) [issue text]
(b) [issue text]

Each of these [issues/questions] will be considered in turn."

Use formal judicial language. If issues not available, generate template with [placeholders]."""

    elif clause_key == "cost_order":
        outcome = context.get("outcome", "unknown")
        case_type = context.get("case_type", "civil_appeal")
        return f"""Generate a cost order for a Sri Lankan judgment.

Case type: {case_type}
Outcome: {outcome}

Common patterns:
- Appeal dismissed → "without costs" or "with costs"
- Appeal allowed → "with costs" or "costs fixed at Rs. [amount]"
- FR Application dismissed → "No costs"

Generate ONLY the cost phrase, nothing else. Example: "with costs" or "without costs" or "No costs"."""

    return f"Generate the {clause_key} clause for a Sri Lankan Supreme Court judgment based on context: {json.dumps(context)}"


# ─── Caching ──────────────────────────────────────────────────────────────────

def _get_cache_key(text: str) -> str:
    """Generate a cache key from document text hash."""
    return hashlib.md5(text.encode('utf-8')).hexdigest()


def _get_cached_predictions(text: str) -> Optional[Dict]:
    """Check if predictions are cached for this document."""
    try:
        cache_key = _get_cache_key(text)
        cache_file = CACHE_DIR / f"{cache_key}.json"
        if cache_file.exists():
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            logger.info(f"Cache hit for document {cache_key[:8]}...")
            return cached
    except Exception as e:
        logger.warning(f"Cache read failed: {e}")
    return None


def _save_predictions_cache(text: str, predictions: Dict):
    """Save predictions to cache."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_key = _get_cache_key(text)
        cache_file = CACHE_DIR / f"{cache_key}.json"
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(predictions, f, ensure_ascii=False, indent=2)
        logger.info(f"Predictions cached for document {cache_key[:8]}...")
    except Exception as e:
        logger.warning(f"Cache write failed: {e}")


# ─── OpenAI LLM Integration ──────────────────────────────────────────────────

async def call_openai_batch(
    missing_clauses: List[Dict],
    contexts: Dict[str, Dict],
    text: str
) -> Dict[str, Dict]:
    """
    Make a SINGLE batched OpenAI API call for all missing clauses.
    Returns dict: clause_key -> { suggestion, confidence, ... }
    """
    logger.info(f"call_openai_batch called for {len(missing_clauses)} clauses")
    logger.info(f"API Key present: {bool(OPENAI_API_KEY)}, Length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")
    
    if not OPENAI_API_KEY:
        logger.warning("❌ OPENAI_API_KEY not set. Returning fallback suggestions.")
        return _generate_fallback_suggestions(missing_clauses, contexts)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        logger.info(f"✅ AsyncOpenAI client created successfully with model: {OPENAI_MODEL}")
    except ImportError:
        logger.error("❌ openai package not installed. Run: pip install openai")
        return _generate_fallback_suggestions(missing_clauses, contexts)
    except Exception as e:
        logger.error(f"❌ Failed to create AsyncOpenAI client: {type(e).__name__}: {str(e)}")
        return _generate_fallback_suggestions(missing_clauses, contexts)

    # Build a single prompt with all clauses
    clause_prompts = []
    for mc in missing_clauses:
        key = mc["clause_key"]
        ctx = contexts.get(key, {"clause_type": key})
        prompt = build_clause_prompt(key, ctx)
        clause_prompts.append(f"""
--- CLAUSE: {mc['clause_name']} (key: {key}) ---
Predictability: {mc['predictability']}
{prompt}
""")

    batch_prompt = f"""You are a legal document analysis AI specializing in Sri Lankan Supreme Court judgments.

For each MISSING clause listed below, generate a suggestion in formal judicial language.
Also assign a confidence score (0-100) for each suggestion.

IMPORTANT RULES:
- Use formal Sri Lankan judicial language
- If you don't have enough context, use [placeholder] brackets for unknown details
- For FULL predictability clauses, generate complete text
- For PARTIAL predictability clauses, generate the structure/template with [placeholders]
- Output valid JSON only

Generate suggestions for these {len(missing_clauses)} missing clauses:

{''.join(clause_prompts)}

Respond with a JSON object. Each key is the clause key, and each value has:
- "suggestion": the generated text (string)
- "confidence": confidence score 0-100 (integer)
- "reasoning": brief explanation of why you generated this (string, 1 sentence)

JSON Output:"""

    try:
        logger.info(f"Making OpenAI API call with model: {OPENAI_MODEL}")
        logger.info(f"Requesting suggestions for {len(missing_clauses)} clauses")
        
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a legal AI specializing in Sri Lankan Supreme Court judgment structure. You generate missing clause text based on document context. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": batch_prompt
                }
            ],
            temperature=0.3,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )

        response_text = response.choices[0].message.content.strip()
        suggestions = json.loads(response_text)
        logger.info(f"✅ LLM returned suggestions for {len(suggestions)} clauses")
        return suggestions

    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse LLM response as JSON: {e}")
        logger.error(f"Response text was: {response_text[:500] if 'response_text' in locals() else 'N/A'}")
        return _generate_fallback_suggestions(missing_clauses, contexts)
    except Exception as e:
        logger.error(f"❌ OpenAI API call failed: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return _generate_fallback_suggestions(missing_clauses, contexts)


def _generate_fallback_suggestions(
    missing_clauses: List[Dict],
    contexts: Dict[str, Dict]
) -> Dict[str, Dict]:
    """Generate template-based fallback suggestions when LLM is unavailable."""
    fallbacks = {}
    
    fallback_templates = {
        "judge_concurrence": lambda ctx: _fallback_judge_concurrence(ctx),
        "conclusion_section": "For the foregoing reasons, [the appeal/application is dismissed/allowed]. [Costs order].",
        "disposition_formula": "The appeal is [dismissed/allowed] [with/without costs].",
        "procedural_history": "The [Plaintiff/Appellant] instituted action in the [Court] bearing No. [case number]. Being aggrieved by the judgment of the [Court], the [Party] preferred this appeal.",
        "leave_to_appeal": "This Court granted special leave to appeal on [date] on the following question(s) of law:\n\n(a) [Question of law]",
        "lower_court_findings": "The learned [Judge] held that [finding]. Accordingly, judgment was entered [in favour of/against] the [Party].",
        "factual_background_label": "The Facts",
        "appellant_argument": "Learned Counsel for the Appellant submitted that [argument]. It was further contended that [argument].",
        "respondent_argument": "Learned Counsel for the Respondent submitted that [counter-argument]. It was further urged that [counter-argument].",
        "legal_framework": "The relevant legal provisions applicable to this case are as follows: [Section/Article] of the [Act/Ordinance] provides that [provision text].",
        "issue_analysis": "The following issues arise for determination in this appeal:\n\n(a) [Issue 1]\n(b) [Issue 2]",
        "cost_order": "without costs",
    }

    for mc in missing_clauses:
        key = mc["clause_key"]
        ctx = contexts.get(key, {})
        template = fallback_templates.get(key, f"[{mc['clause_name']} - AI suggestion unavailable]")
        
        if callable(template):
            suggestion = template(ctx)
        else:
            suggestion = template

        fallbacks[key] = {
            "suggestion": suggestion,
            "confidence": 30,
            "reasoning": "Generated from template (LLM unavailable). Please review and edit."
        }

    return fallbacks


def _fallback_judge_concurrence(ctx: Dict) -> str:
    """Generate judge concurrence from extracted names without LLM."""
    judge_names = ctx.get("judge_names", [])
    author = ctx.get("judgment_author", "")
    court = ctx.get("court", "Supreme Court")

    if not judge_names:
        return "[Judge Name]\nI agree.\n\nJUDGE OF THE SUPREME COURT"

    blocks = []
    for name in judge_names:
        # Skip the author
        if author and any(part in name for part in author.split(",")[0].split()):
            continue
        blocks.append(f"{name}\nI agree.\n\nJUDGE OF THE {court.upper()}")

    return "\n\n".join(blocks) if blocks else "[Judge Name]\nI agree.\n\nJUDGE OF THE SUPREME COURT"


# ─── Main Prediction Function ────────────────────────────────────────────────

async def predict_missing_clauses(text: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Main function: analyze document for missing predictable clauses and generate AI suggestions.
    
    Args:
        text: Full document text
        force_refresh: If True, skip cache
        
    Returns:
        Dict with:
        - missing_predictable_clauses: list of detected missing clause info
        - suggestions: dict of clause_key -> suggestion data
        - source: "llm" | "cache" | "fallback"
        - mode: current prediction mode setting
    """
    # 1. Check cache first (unless force refresh)
    if not force_refresh:
        cached = _get_cached_predictions(text)
        if cached:
            return {**cached, "source": "cache"}

    # 2. Detect missing predictable clauses using prediction regexes
    missing = detect_missing_predictable_clauses(text)
    logger.info(f"Found {len(missing)} missing predictable clauses")

    if not missing:
        result = {
            "missing_predictable_clauses": [],
            "suggestions": {},
            "total_predictable": len(PREDICTABLE_CLAUSES),
            "total_missing": 0,
            "source": "none",
            "mode": CLAUSE_PREDICTION_MODE,
        }
        _save_predictions_cache(text, result)
        return result

    # 3. Extract context for each missing clause
    contexts = {}
    for mc in missing:
        key = mc["clause_key"]
        contexts[key] = extract_context_for_clause(text, key)

    # 4. Call LLM (batch) for suggestions
    suggestions = await call_openai_batch(missing, contexts, text)

    # 5. Build result
    result = {
        "missing_predictable_clauses": missing,
        "suggestions": {},
        "total_predictable": len(PREDICTABLE_CLAUSES),
        "total_missing": len(missing),
        "source": "llm" if OPENAI_API_KEY else "fallback",
        "mode": CLAUSE_PREDICTION_MODE,
    }

    for mc in missing:
        key = mc["clause_key"]
        suggestion_data = suggestions.get(key, {})
        
        result["suggestions"][key] = {
            "clause_key": key,
            "clause_name": mc["clause_name"],
            "predictability": mc["predictability"],
            "frequency": mc["frequency"],
            "suggestion": suggestion_data.get("suggestion", f"[{mc['clause_name']} - suggestion unavailable]"),
            "confidence": suggestion_data.get("confidence", 0),
            "reasoning": suggestion_data.get("reasoning", ""),
            "context_used": contexts.get(key, {}),
            "position": mc["position"],
            "status": "pending",  # pending | accepted | edited | rejected
        }

    # 6. Cache the result
    _save_predictions_cache(text, result)

    return result


def get_prediction_mode() -> str:
    """Get current prediction mode from env."""
    return CLAUSE_PREDICTION_MODE


def get_predictable_clause_list() -> List[Dict[str, str]]:
    """Get list of all predictable clauses with info."""
    return [
        {
            "key": key,
            "name": info["name"],
            "predictability": info["predictability"],
            "frequency": info["frequency"],
        }
        for key, info in PREDICTABLE_CLAUSES.items()
    ]
