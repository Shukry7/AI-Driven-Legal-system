"""
Clause Prediction Service - LLM-powered AI suggestions for missing clauses.

This service:
1. Takes clause detection results (from regex analysis)
2. Identifies which MISSING clauses are LLM-predictable (12 selected clauses)
3. Extracts relevant context from the document for each missing clause
4. Sends batch request to OpenAI GPT for AI suggestions
5. Returns structured suggestions with confidence scores
6. Graceful fallback if LLM fails

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

# Maximum number of suggestions to show to user (to avoid overwhelming them)
MAX_SUGGESTIONS_TO_SHOW = int(os.getenv("MAX_AI_SUGGESTIONS", "3"))  # Default: 3 suggestions


# ─── 12 Selected LLM-Predictable Clauses ─────────────────────────────────────

PREDICTABLE_CLAUSES = {
    "judge_concurrence": {
        "name": "Judge Concurrence Block",
        "predictability": "FULL",
        "frequency": "95.5%",
        "position": "End of judgment (last 5-15 lines)",
        "detection_regex": r"(?:I\s+(?:agree|concur|accord)|Agreed)",
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
    "cost_order": {
        "name": "Cost Order",
        "predictability": "FULL",
        "frequency": "64.5%",
        "position": "Last 5% of document",
        "detection_regex": r"(?:with(?:out)?\s+costs?|[Nn]o\s+(?:order\s+(?:as\s+to\s+)?)?costs?|costs?\s+(?:fixed|assessed|taxed)\s+at|(?:bear|pay).*?costs?|entitled\s+to.*?costs?|Rs\.?\s*[\d,/]+.*?costs?)",
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
            # Remove "Hon." or "The Honourable" prefix
            line = re.sub(r'^(?:The\s+)?(?:Hon(?:ou)?rable|Hon)\.?\s*', '', line, flags=re.IGNORECASE)
            # Check for judge designation including PC, J format
            if line and re.search(r'(?:PC\s*,\s*)?(?:J|CJ)\b', line):
                names.append(line)
        return names
    return []


def extract_judgment_author(text: str) -> Optional[str]:
    """Extract which judge wrote the judgment."""
    header = text[:5000]
    
    # Method 1: Find judge name after "Decided on:" or "Written Submissions:" line
    # Pattern: Date line followed by judge name on next non-empty line
    date_match = re.search(
        r'(?:Decided\s+on|Written\s+Submissions)\s*:?\s*[\d./-]+\s*\n+\s*([A-Z][^\n]{10,80}?(?:PC\s*,?\s*)?(?:J|CJ))',
        header, re.IGNORECASE
    )
    if date_match:
        return date_match.group(1).strip()
    
    # Method 2: Find first judge designation after header section (Before/Counsel)
    # Look for standalone judge name line (not in list)
    body_start = 1000 if 'DECIDED ON' in header or 'Decided on' in header else 500
    author_match = re.search(
        r'^\s*([A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*)\s*,\s*(?:PC\s*,\s*)?(?:J|CJ)\s*\.?\s*$',
        text[body_start:body_start+3000], re.MULTILINE
    )
    if author_match:
        return author_match.group(1).strip() + ', ' + author_match.group(0).split(',')[-1].strip()
    
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
    """Extract plaintiff/appellant and respondent/defendant names with roles."""
    header = text[:3000]
    parties = {}

    # Look for name blocks before party role labels
    petitioner_match = re.search(
        r'([A-Z][^\n]{2,80})\s*\n[^\n]*?(Plaintiff-Appellant|Appellant|Petitioner|Plaintiff|Accused-Appellant)',
        header, re.MULTILINE
    )
    if petitioner_match:
        parties['petitioner'] = petitioner_match.group(1).strip()
        parties['petitioner_role'] = petitioner_match.group(2).strip()

    # Handle multiple respondents and "AND BETWEEN" structures
    respondent_match = re.search(
        r'(?:Vs?\.?|versus|AND\s+(?:NOW\s+)?BETWEEN)\s*\n+([A-Z][^\n]{2,80})\s*\n[^\n]*?(Respondent-Respondent|Respondent|Defendant)',
        header, re.IGNORECASE | re.MULTILINE
    )
    if respondent_match:
        parties['respondent'] = respondent_match.group(1).strip()
        parties['respondent_role'] = respondent_match.group(2).strip()
    
    # Additional respondents (if any)
    additional_respondents = re.findall(
        r'(?:AND|\n)\s*([A-Z][^\n]{10,80})\s*\n[^\n]*?(\d+(?:st|nd|rd|th)?\s+Respondent)',
        header, re.IGNORECASE | re.MULTILINE
    )
    if additional_respondents:
        parties['additional_respondents'] = [name.strip() for name, _ in additional_respondents]

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
    elif re.search(r'set\s+aside', last_section, re.IGNORECASE):
        return "set_aside"
    elif re.search(r'(?:judgment|order)\s+(?:is\s+)?affirmed', last_section, re.IGNORECASE):
        return "affirmed"
    return "unknown"


def extract_cost_info(text: str) -> Dict[str, Any]:
    """Extract information about costs from document."""
    # Increased search window from 2000 to 3000 characters
    last_section = text[-3000:]
    cost_info = {
        "has_costs": False,
        "cost_type": "no_order",
        "cost_amount": None
    }
    
    if re.search(r'with\s+costs', last_section, re.IGNORECASE):
        cost_info["has_costs"] = True
        cost_info["cost_type"] = "with_costs"
    elif re.search(r'without\s+costs', last_section, re.IGNORECASE):
        cost_info["has_costs"] = True
        cost_info["cost_type"] = "without_costs"
    elif re.search(r'no\s+(?:order\s+(?:as\s+to\s+)?)?costs?', last_section, re.IGNORECASE):
        cost_info["has_costs"] = True
        cost_info["cost_type"] = "no_order"
    elif re.search(r'(?:each\s+party|parties\s+to)\s+bear.*?costs', last_section, re.IGNORECASE):
        cost_info["has_costs"] = True
        cost_info["cost_type"] = "parties_bear_own"
    
    # Extract cost amount if mentioned (handle Rs. 21,000/- format)
    amount_match = re.search(r'Rs\.?\s*([\d,]+)(?:/-)?.{0,30}costs?', last_section, re.IGNORECASE)
    if amount_match:
        cost_info["cost_amount"] = amount_match.group(1).replace(',', '')
    
    return cost_info


def extract_lower_court(text: str) -> Dict[str, Any]:
    """Extract lower court information from case numbers or body."""
    header = text[:3000]
    lower_court_info = {
        "name": "lower court",
        "type": "unknown",
        "location": ""
    }
    
    # Try to get specific court with location
    lc_match = re.search(r'(District\s+Court)\s+(?:of\s+)?(\w+)', header, re.IGNORECASE)
    if lc_match:
        lower_court_info["name"] = lc_match.group(0).strip()
        lower_court_info["type"] = "District Court"
        lower_court_info["location"] = lc_match.group(2)
        return lower_court_info
    
    hc_match = re.search(r'((?:Commercial\s+)?High\s+Court)(?:\s+of\s+(?:the\s+)?([\w\s]+Province))?', header, re.IGNORECASE)
    if hc_match:
        lower_court_info["name"] = hc_match.group(0).strip()
        lower_court_info["type"] = "High Court"
        if hc_match.group(2):
            lower_court_info["location"] = hc_match.group(2)
        return lower_court_info
    
    # Fallback to generic detection
    if re.search(r'Court\s+of\s+Appeal', header, re.IGNORECASE):
        lower_court_info["name"] = "Court of Appeal"
        lower_court_info["type"] = "Court of Appeal"
    elif re.search(r'High\s+Court', header, re.IGNORECASE):
        lower_court_info["name"] = "High Court"
        lower_court_info["type"] = "High Court"
    elif re.search(r'District\s+Court', header, re.IGNORECASE):
        lower_court_info["name"] = "District Court"
        lower_court_info["type"] = "District Court"
    
    return lower_court_info


def extract_court(text: str) -> str:
    """Extract main court (Supreme Court, Court of Appeal, etc.)."""
    header = text[:500]
    if re.search(r'SUPREME\s+COURT', header, re.IGNORECASE):
        return "Supreme Court"
    elif re.search(r'COURT\s+OF\s+APPEAL', header, re.IGNORECASE):
        return "Court of Appeal"
    return "Supreme Court"


def calculate_insertion_point(text: str, clause_key: str) -> Dict[str, Any]:
    """
    Calculate the best insertion point for a clause in the document.
    Returns line number estimate and descriptive position.
    """
    lines = text.split('\n')
    total_lines = len(lines)
    insertion_info = {
        "line_estimate": 0,
        "position_description": "",
        "marker_before": "",
        "marker_after": ""
    }
    
    if clause_key == "procedural_history":
        # Insert after header section (BEFORE/COUNSEL), before body text
        for i, line in enumerate(lines[:min(200, total_lines)]):
            if re.search(r'DECIDED\\s+ON|WRITTEN\\s+SUBMISSIONS', line, re.IGNORECASE):
                insertion_info["line_estimate"] = i + 3
                insertion_info["position_description"] = "After header, before judgment body"
                insertion_info["marker_before"] = "DECIDED ON / WRITTEN SUBMISSIONS section"
                insertion_info["marker_after"] = "First paragraph of judgment"
                return insertion_info
        # Fallback: 10-15% into document
        insertion_info["line_estimate"] = int(total_lines * 0.12)
        insertion_info["position_description"] = "After header section (estimated)"
        
    elif clause_key == "disposition_formula":
        # Insert before judge concurrence or cost order, in last 10%
        start_idx = int(total_lines * 0.85)
        for i in range(start_idx, total_lines):
            if re.search(r'(I\\s+agree|JUDGE\\s+OF\\s+THE)', lines[i], re.IGNORECASE):
                insertion_info["line_estimate"] = max(0, i - 2)
                insertion_info["position_description"] = "Before judge concurrence blocks"
                insertion_info["marker_after"] = "Judge concurrence section"
                return insertion_info
        # Fallback: 92% into document
        insertion_info["line_estimate"] = int(total_lines * 0.92)
        insertion_info["position_description"] = "Before end of judgment (estimated)"
        
    elif clause_key == "conclusion_section":
        # Insert before judge concurrence block, in last 10-15% of document
        start_idx = int(total_lines * 0.85)
        for i in range(start_idx, total_lines):
            if re.search(r'(I\s+agree|JUDGE\s+OF\s+THE)', lines[i], re.IGNORECASE):
                insertion_info["line_estimate"] = max(0, i - 2)
                insertion_info["position_description"] = "Before judge concurrence blocks"
                insertion_info["marker_after"] = "Judge concurrence section"
                return insertion_info
        # Fallback: 90% into document
        insertion_info["line_estimate"] = int(total_lines * 0.90)
        insertion_info["position_description"] = "Before end of judgment (estimated)"
        
    elif clause_key == "cost_order":
        # Insert right before judge concurrence
        start_idx = int(total_lines * 0.85)
        for i in range(start_idx, total_lines):
            if re.search(r'I\\s+agree', lines[i], re.IGNORECASE):
                insertion_info["line_estimate"] = max(0, i - 1)
                insertion_info["position_description"] = "After disposition, before judge concurrence"
                insertion_info["marker_after"] = "Judge concurrence blocks"
                return insertion_info
        # Fallback: 94% into document
        insertion_info["line_estimate"] = int(total_lines * 0.94)
        insertion_info["position_description"] = "Before judge concurrence (estimated)"
        
    elif clause_key == "judge_concurrence":
        # Append to very end
        insertion_info["line_estimate"] = total_lines
        insertion_info["position_description"] = "At end of document"
        insertion_info["marker_before"] = "Final disposition/cost order"
        
    elif clause_key == "leave_to_appeal":
        # Insert after procedural history, before facts (15-25%)
        for i, line in enumerate(lines[:min(300, total_lines)]):
            if re.search(r'(The\\s+[Ff]acts?|[Ff]actual\\s+[Bb]ackground|BACKGROUND)', line):
                insertion_info["line_estimate"] = max(0, i - 2)
                insertion_info["position_description"] = "After procedural history, before facts section"
                insertion_info["marker_after"] = "Facts section"
                return insertion_info
        # Fallback: 20% into document
        insertion_info["line_estimate"] = int(total_lines * 0.20)
        insertion_info["position_description"] = "After procedural history (estimated)"
    
    elif clause_key == "lower_court_findings":
        # Insert in early-middle section, around 35-40%
        insertion_info["line_estimate"] = int(total_lines * 0.37)
        insertion_info["position_description"] = "In middle section (after facts)"
    
    return insertion_info


def extract_dates(text: str) -> Dict[str, str]:
    """Extract important dates from the judgment."""
    dates = {}
    header = text[:2000]
    
    # Argued on date
    argued_match = re.search(r'ARGUED\\s+ON\\s*:?\\s*([\\d./-]+)', header, re.IGNORECASE)
    if argued_match:
        dates['argued_on'] = argued_match.group(1).strip()
    
    # Decided on date
    decided_match = re.search(r'DECIDED\\s+ON\\s*:?\\s*([\\d./-]+)', header, re.IGNORECASE)
    if decided_match:
        dates['decided_on'] = decided_match.group(1).strip()
    
    # Written submissions date
    submissions_match = re.search(r'WRITTEN\\s+SUBMISSIONS.*?:?\\s*([\\d./-]+)', header, re.IGNORECASE)
    if submissions_match:
        dates['written_submissions'] = submissions_match.group(1).strip()
    
    return dates


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
    
    # Add insertion point information for all clauses
    context["insertion_point"] = calculate_insertion_point(text, clause_key)

    if clause_key == "judge_concurrence":
        context["judge_names"] = extract_judge_names(text)
        context["judgment_author"] = extract_judgment_author(text)
        context["court"] = extract_court(text)

    elif clause_key == "conclusion_section":
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)
        lower_court_info = extract_lower_court(text)
        context["lower_court"] = lower_court_info["name"]
        context["lower_court_type"] = lower_court_info["type"]

    elif clause_key == "disposition_formula":
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)
        lower_court_info = extract_lower_court(text)
        context["lower_court"] = lower_court_info["name"]
        context["lower_court_type"] = lower_court_info["type"]
        context["cost_info"] = extract_cost_info(text)

    elif clause_key == "procedural_history":
        context["case_numbers"] = extract_case_numbers(text)
        context["parties"] = extract_party_names(text)
        context["case_type"] = extract_case_type(text)
        lower_court_info = extract_lower_court(text)
        context["lower_court"] = lower_court_info["name"]
        context["lower_court_type"] = lower_court_info["type"]
        context["dates"] = extract_dates(text)

    elif clause_key == "leave_to_appeal":
        context["questions_of_law"] = extract_questions_of_law(text)
        context["case_type"] = extract_case_type(text)
        context["dates"] = extract_dates(text)

    elif clause_key == "lower_court_findings":
        lower_court_info = extract_lower_court(text)
        context["lower_court"] = lower_court_info["name"]
        context["lower_court_type"] = lower_court_info["type"]
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)

    elif clause_key == "cost_order":
        context["case_type"] = extract_case_type(text)
        context["outcome"] = extract_outcome(text)
        context["cost_info"] = extract_cost_info(text)
        # Check if government party (usually no costs)
        context["has_government_party"] = bool(re.search(r'Attorney[- ]General', text[:3000], re.IGNORECASE))

    return context


# ─── RAG-Enhanced Prompt Building ────────────────────────────────────────────

def build_clause_prompt_with_rag(clause_key: str, context: Dict[str, Any], 
                                 similar_examples: List[Dict[str, Any]]) -> str:
    """
    Build an enhanced prompt that includes retrieved similar examples from RAG.
    
    This provides the LLM with actual examples from existing legal documents,
    making the predictions more accurate and contextually appropriate.
    
    Args:
        clause_key: Type of clause to generate
        context: Context information for the clause
        similar_examples: Retrieved similar clause examples from RAG service
    
    Returns:
        Enhanced prompt string with real examples
    """
    clause_info = PREDICTABLE_CLAUSES.get(clause_key, {})
    clause_name = clause_info.get("name", clause_key)
    
    # Start with context info
    context_lines = [f"**Context for {clause_name}:**"]
    
    # Add relevant context fields
    for key, value in context.items():
        if key not in ["clause_type", "insertion_point"] and value:
            if isinstance(value, dict):
                context_lines.append(f"- {key}: {json.dumps(value, indent=2)}")
            elif isinstance(value, list) and value:
                context_lines.append(f"- {key}: {', '.join(map(str, value[:5]))}")
            else:
                context_lines.append(f"- {key}: {value}")
    
    # Add RAG-retrieved examples
    examples_section = ["\n**📚 SIMILAR EXAMPLES FROM ACTUAL LEGAL DOCUMENTS:**"]
    examples_section.append("(Use these as reference for style, format, and language)\n")
    
    for i, example in enumerate(similar_examples[:3], 1):
        source = example.get('metadata', {}).get('document_id', 'Unknown')
        text = example['text']
        
        # Truncate if too long
        if len(text) > 800:
            text = text[:800] + "..."
        
        examples_section.append(f"\n### Example {i} (from case: {source}):")
        examples_section.append(f"```\n{text}\n```")
    
    # Add instructions
    instructions = f"""

**INSTRUCTIONS:**
Generate a concise {clause_name} for the current case based on:
1. The context information provided above
2. The style, format, and language patterns shown in the retrieved examples
3. Standard Sri Lankan judicial conventions

IMPORTANT:
- Generate brief, concise content (approximately 30-35 words)
- Adapt the examples to fit the specific context
- Use [placeholder] for any details not determinable from context
- Maintain formal judicial language and proper formatting"""

    return "\n".join(context_lines) + "\n" + "\n".join(examples_section) + instructions


# ─── LLM Prompt Generation ───────────────────────────────────────────────────

def build_clause_prompt(clause_key: str, context: Dict[str, Any]) -> str:
    """Build the LLM prompt for a specific clause type based on extracted context."""

    if clause_key == "judge_concurrence":
        judge_names = context.get("judge_names", [])
        author = context.get("judgment_author", "Unknown")
        court = context.get("court", "Supreme Court")
        
        return f"""Generate the judge concurrence block for a Sri Lankan {court} judgment.

**Context:**
- Judgment authored by: {author}
- Full bench: {', '.join(judge_names) if judge_names else 'Unknown judges'}
- Court: {court}

**ABSOLUTELY CRITICAL - READ CAREFULLY:**

You MUST generate EXACTLY this format - NO EXCEPTIONS:

[Judge Name], J.
I agree.

JUDGE OF THE {court.upper()}


[Judge Name], J.
I agree.

JUDGE OF THE {court.upper()}

**WHAT YOU MUST DO:**
✅ Generate separate blocks for EACH non-authoring judge
✅ Each block contains exactly 3 lines: [Name], J. | I agree. | JUDGE OF THE {court.upper()}
✅ Separate blocks with TWO blank lines (one empty line between blocks)
✅ Use ONLY "I agree." - nothing else
✅ Skip the author judge ({author}) - they do NOT get a concurrence block

**WHAT YOU MUST NOT DO - THESE ARE ALL WRONG:**
❌ "We, the undersigned judges, concur with the findings..."
❌ "Concur with the judgment delivered herein..."
❌ "I hereby concur with the above judgment..."
❌ "I agree with the above" (wrong - must be just "I agree.")
❌ Any statement starting with "We" or "Each of us"
❌ Any paragraph format - MUST be individual blocks
❌ Any collective statements about judges agreeing together

**REAL EXAMPLE FROM AN ACTUAL JUDGMENT:**

P.A. Ratnayake, J.
I agree.

JUDGE OF THE SUPREME COURT


A.L. Amaranath, J.
I agree.

JUDGE OF THE SUPREME COURT


K. Sripavan, J.
I agree.

JUDGE OF THE SUPREME COURT

Notice: Each judge gets their OWN block. They are NOT grouped. There is no "We" or group statements.

**YOUR TASK:**
Generate concurrence blocks for these judges: {', '.join(judge_names) if judge_names else '[judge names]'}
Skip: {author}

Output ONLY the judge concurrence blocks - nothing before, nothing after, just the blocks."""

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
Keep it concise - approximately 30-35 words."""

    elif clause_key == "disposition_formula":
        case_type = context.get('case_type', 'civil_appeal')
        outcome = context.get('outcome', 'unknown')
        lower_court = context.get("lower_court", "lower court")
        lower_court_type = context.get("lower_court_type", "lower court")
        cost_info = context.get("cost_info", {})
        
        return f"""Generate the disposition formula for a Sri Lankan Supreme Court judgment.

**Context:**
- Case type: {case_type}
- Outcome: {outcome}
- Lower court: {lower_court} ({lower_court_type})
- Cost indication: {cost_info.get('cost_type', 'unknown')}

**Examples from actual judgments:**

If appeal DISMISSED:
"The appeal is dismissed with costs."
"The appeal is dismissed without costs."
"I would therefore, dismiss the appeal, but without costs."

If appeal ALLOWED:
"The appeal is allowed. The judgment of the Court of Appeal dated [date] is set aside."
"The appeal is allowed. The judgment of the District Court is affirmed."
"The appeal is allowed with costs."

If appeal PARTLY ALLOWED:
"The appeal is partly allowed. The order of the High Court is set aside in part."

If SET ASIDE and AFFIRM pattern:
"The judgment of the Civil Appellate High Court dated 17th January 2011 is hereby set aside. The judgment of the District Court of Mount Lavinia dated 13th December 2007 is affirmed."

**Your task:**
Generate the disposition formula (approximately 30-35 words) based on the outcome. Use formal language matching the examples. Do NOT include cost orders (those come separately)."""

    elif clause_key == "procedural_history":
        cases = context.get("case_numbers", {})
        parties = context.get("parties", {})
        case_type = context.get('case_type', 'civil_appeal')
        lower_court = context.get("lower_court", "lower court")
        dates = context.get("dates", {})
        
        # Get party roles
        petitioner = parties.get('petitioner', '[Party Name]')
        petitioner_role = parties.get('petitioner_role', 'Plaintiff-Appellant')
        respondent = parties.get('respondent', '[Party Name]')
        respondent_role = parties.get('respondent_role', 'Respondent')
        
        return f"""Generate a procedural history paragraph for a Sri Lankan Supreme Court judgment.

**Context:**
- Case numbers: SC: {cases.get('sc', '[SC case no]')}, HCCA: {cases.get('hcca', '[HC case no]')}, DC: {cases.get('dc', '[DC case no]')}
- Petitioner: {petitioner} ({petitioner_role})
- Respondent: {respondent} ({respondent_role})
- Case type: {case_type}
- Lower court: {lower_court}

**Examples from actual judgments:**

Example 1:
"The Plaintiff-Appellant instituted action in the District Court of Mount Lavinia bearing No. 1316/00/L seeking partition. Being aggrieved by the judgment of the High Court, the Plaintiff preferred this appeal to the Supreme Court."

Example 2:
"This is an appeal from the judgment of the Court of Appeal dated 05-09-2002. By that judgment the Court of Appeal had dismissed the application of the petitioner-appellant who had sought Writs of Prohibition and Certiorari. The appellant preferred an application to this Court for special leave to appeal."

Example 3:
"The appellant is a duly incorporated limited liability company that filed an action in the District Court. The Board of Investment had granted approval to the appellant. At that stage, the respondents took the view that Customs duty was leviable. Being aggrieved, the appellant filed this appeal."

**Your task:**
Generate a concise procedural history paragraph (approximately 30-35 words) explaining:
1. How the case started (which party filed in which court)
2. How it reached the Supreme Court

Use formal Sri Lankan judicial language. Use [date] for unknown dates. Match the style of the examples above."""

    elif clause_key == "leave_to_appeal":
        questions = context.get("questions_of_law", [])
        case_type = context.get("case_type", "civil_appeal")
        dates = context.get("dates", {})
        grant_date = dates.get('decided_on', '[date]')
        
        questions_text = "\n".join([f"({chr(97+i)}) {q}" for i, q in enumerate(questions[:5])]) if questions else "[Questions not extracted - use placeholders]"
        
        return f"""Generate a leave to appeal statement for a Sri Lankan Supreme Court judgment.

**Context:**
- Case type: {case_type}
- Grant date: {grant_date}
- Questions of law (extracted): 
{questions_text}

**Examples from actual judgments:**

Example 1 (with extracted questions):
"This Court granted special leave to appeal on [date] on the following questions of law:

(a) Can the Customs interpret the nature of the goods that can be exported under and in terms of the Agreement X8?

(b) Is the power of the Customs restricted to verifying whether the goods exported conform to the goods said to be exported by exporters?"

Example 2 (template when questions not clear):
"The appellant preferred an application to this Court for special leave to appeal for which this Court had granted special leave to appeal on the following questions:

(a) [Question of law 1]

(b) [Question of law 2]"

**Your task:**
Generate the leave to appeal section using the standard format. If questions were extracted, use them. If not, create a template with placeholder questions [Question 1], [Question 2], etc. Use proper letter numbering (a), (b), (c)."""

    elif clause_key == "lower_court_findings":
        return f"""Generate a lower court findings summary for a Sri Lankan Supreme Court judgment.

Lower court: {context.get('lower_court', 'District Court')}
Case type: {context.get('case_type', 'civil_appeal')}
Case outcome direction: {context.get('outcome', 'unknown')}

Use formal judicial language:
"The learned [Judge title] [held/found/concluded] that [finding]. Accordingly, the learned [Judge title] [entered judgment / dismissed the action]."

Generate a concise paragraph (approximately 30-35 words) summarizing what the lower court decided. Use [placeholders] for specific details you cannot determine."""

    elif clause_key == "cost_order":
        outcome = context.get("outcome", "unknown")
        case_type = context.get("case_type", "civil_appeal")
        cost_info = context.get("cost_info", {})
        has_government = context.get("has_government_party", False)
        cost_type = cost_info.get('cost_type', 'none detected')
        cost_amount = cost_info.get('cost_amount', None)
        
        return f"""Generate a cost order for a Sri Lankan Supreme Court judgment.

**Context:**
- Case type: {case_type}
- Appeal outcome: {outcome}
- Government party involved: {"Yes" if has_government else "No"}
- Detected cost type: {cost_type}
- Detected cost amount: {"Rs. " + cost_amount if cost_amount else "Not specified"}

**Real Examples from Sri Lankan Supreme Court judgments:**

1. Simple with costs:
   "The appeal is dismissed with costs."

2. Without costs:
   "The appeal is dismissed without costs."
   
3. No order pattern:
   "I make no order as to costs."
   "We make no order as to costs."

4. Specific amount:
   "The appeal is dismissed with costs fixed at Rs. 25,000/-."
   "Appellant to pay Rs. 50,000/- as costs to the Respondent."

5. Parties bear own:
   "Each party to bear their own costs."
   "Parties to bear their own costs."

6. Government party pattern (common):
   "The appeal is dismissed. No costs." (when Attorney General is party)

**Guidelines:**
- Appeal DISMISSED + private parties → usually "with costs"
- Appeal ALLOWED → usually "with costs" (appellant recovers costs)
- Government/Attorney-General involved → often "No costs" or "without costs"
- Constitutional cases → often "No costs"
- Fundamental Rights cases → varied (depends on merit)

**Your task:**
Generate the cost order (approximately 30-35 words). Match the formal style of the examples. Use the detected cost information when available."""

    # Default catch-all for other clause types
    return f"""Generate a concise {clause_key} clause for a Sri Lankan Supreme Court judgment.

**Context provided:**
{json.dumps(context, indent=2)}

**Instructions:**
- Generate brief paragraph-style content (approximately 30-35 words)
- Use formal Sri Lankan judicial language
- Use [placeholder] brackets for any unknown details
- Follow standard Sri Lankan Supreme Court judgment formatting conventions"""


# ─── OpenAI LLM Integration with RAG ─────────────────────────────────────────

async def call_openai_batch(
    missing_clauses: List[Dict],
    contexts: Dict[str, Dict],
    text: str
) -> Dict[str, Dict]:
    """
    NEW APPROACH: Send the ENTIRE document to OpenAI and ask it to:
    1. Predict missing clauses with proper content
    2. Specify EXACTLY where each clause should be inserted (anchor text + position)
    
    Returns dict: clause_key -> { suggestion, confidence, insertion_anchor, insertion_position, ... }
    """
    logger.info(f"call_openai_batch called for {len(missing_clauses)} clauses")
    logger.info(f"API Key present: {bool(OPENAI_API_KEY)}, Length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")
    
    if not OPENAI_API_KEY:
        logger.warning("❌ OPENAI_API_KEY not set. Returning fallback suggestions.")
        return _generate_fallback_suggestions(missing_clauses, contexts, text)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        logger.info(f"✅ AsyncOpenAI client created successfully with model: {OPENAI_MODEL}")
    except ImportError:
        logger.error("❌ openai package not installed. Run: pip install openai")
        return _generate_fallback_suggestions(missing_clauses, contexts, text)
    except Exception as e:
        logger.error(f"❌ Failed to create AsyncOpenAI client: {type(e).__name__}: {str(e)}")
        return _generate_fallback_suggestions(missing_clauses, contexts, text)

    # ═══ RAG INTEGRATION (Optional Examples) ═══
    try:
        from app.RAG.rag_clause_service import get_rag_service
        rag_service = get_rag_service()
        logger.info("🔍 RAG service initialized, retrieving similar examples...")
        
        rag_examples = {}
        if rag_service.enabled:
            for mc in missing_clauses:
                key = mc["clause_key"]
                ctx = contexts.get(key, {"clause_type": key})
                similar_examples = rag_service.retrieve_similar_clauses(key, ctx, n_results=2)
                if similar_examples:
                    rag_examples[key] = similar_examples
                    logger.info(f"✅ Retrieved {len(similar_examples)} examples for {key}")
        else:
            logger.info("⚠️ RAG service disabled, proceeding with standard prompts")
    except Exception as e:
        logger.warning(f"⚠️ RAG retrieval failed: {e}. Proceeding without RAG enhancement.")
        rag_examples = {}

    # ═══ BUILD NEW PROMPT ═══
    # List missing clauses with their descriptions
    clause_descriptions = []
    for mc in missing_clauses:
        key = mc["clause_key"]
        desc = f"""
{key} ({mc['clause_name']}):
- Description: {mc.get('description', 'Missing clause that should be present in legal documents')}
- Predictability: {mc['predictability']}
- Typical Position: {mc['position']}"""
        
        # Add RAG examples if available
        if key in rag_examples and rag_examples[key]:
            desc += f"\n- Example from similar document: \"{rag_examples[key][0]['text'][:150]}...\""
        
        clause_descriptions.append(desc)

    # Truncate document if too long (keep within token limits)
    max_doc_length = 15000  # chars, roughly 3750 tokens
    truncated_text = text if len(text) <= max_doc_length else text[:max_doc_length] + "...[TRUNCATED]"

    batch_prompt = f"""You are a legal document analysis AI specializing in Sri Lankan Supreme Court judgments.

I will provide you with:
1. The FULL DOCUMENT text
2. A list of MISSING clauses that need to be added

Your task:
- For each missing clause, generate the appropriate text content
- Specify EXACTLY where it should be inserted by providing:
  * An "anchor_text": A unique sentence or phrase from the document (15-50 words) near where the clause should go
  * A "position": Either "before" or "after" the anchor text
- Use formal Sri Lankan judicial language
- Keep suggestions concise (30-50 words per clause)

════════════════════════════════════════════════════════════
DOCUMENT TEXT:
════════════════════════════════════════════════════════════
{truncated_text}

════════════════════════════════════════════════════════════
MISSING CLAUSES TO PREDICT:
════════════════════════════════════════════════════════════
{''.join(clause_descriptions)}

════════════════════════════════════════════════════════════
SPECIAL INSTRUCTION FOR judge_concurrence:
════════════════════════════════════════════════════════════
IF "judge_concurrence" is in the missing clauses list above:
- MUST generate SEPARATE BLOCKS for each judge
- MUST NOT generate a collective "We, the undersigned judges..." statement
- Format MUST be: [Judge Name], J. on one line, "I agree." on next line, blank line, "JUDGE OF THE SUPREME COURT" on next line
- MUST separate each judge's block with TWO blank lines
- MUST only include non-authoring judges (skip the judgment author)
- Example of CORRECT format:
  K. Sripavan, J.
  I agree.
  
  JUDGE OF THE SUPREME COURT
  
  
  S.I. Imam, J.
  I agree.
  
  JUDGE OF THE SUPREME COURT
- Example of WRONG format (reject these):
  ✗ "We, the undersigned judges, concur with the findings..."
  ✗ "I hereby concur with the above judgment..."
  ✗ "Concur with the conclusions reached herein..."

════════════════════════════════════════════════════════════
INSTRUCTIONS:
════════════════════════════════════════════════════════════
Respond with a JSON object where each key is a clause key from the list above.
Each value must have:
- "suggestion": The generated clause text (string)
- "confidence": Confidence score 0-100 (integer)
- "reasoning": Brief explanation (1 sentence)
- "anchor_text": A unique sentence/phrase from the document (15-50 words) that exists near where this clause should be inserted
- "position": Either "before" or "after" the anchor_text

CRITICAL RULES for anchor_text:
1. COPY the text EXACTLY from the document above - do NOT paraphrase or change any words
2. The anchor_text MUST BE A VERBATIM COPY of text that appears in the document
3. Choose a unique sentence that appears only ONCE in the document
4. The anchor should be logically close to where the missing clause belongs
5. For clauses at the very start: use the first sentence with position "before"
6. For clauses at the very end: use the last sentence with position "after"
7. **SPECIAL RULE for judge_concurrence: ALWAYS goes at the ABSOLUTE END of the document. Use the last complete sentence from the document as anchor_text with position "after"**
8. DO NOT create or invent text - ONLY copy what exists in the document

EXAMPLE:
If the document contains: "The Petitioner made an application in terms of Section 87(3)"
Then anchor_text should be: "The Petitioner made an application in terms of Section 87(3)"
NOT: "The petitioner filed an application under Section 87(3)" ← WRONG (paraphrased)

JSON Output:"""

    try:
        logger.info(f"Making OpenAI API call with model: {OPENAI_MODEL}")
        logger.info(f"Requesting position-based suggestions for {len(missing_clauses)} clauses")
        logger.info(f"Document length: {len(truncated_text)} chars")
        
        # Log request info
        logger.info("\n" + "="*80)
        logger.info("📤 SENDING TO OPENAI LLM (POSITION-BASED APPROACH)")
        logger.info("="*80)
        logger.info(f"Model: {OPENAI_MODEL}")
        logger.info(f"Temperature: 0.3")
        logger.info(f"Max Tokens: 6000")
        logger.info(f"Clauses: {[mc['clause_key'] for mc in missing_clauses]}")
        logger.info(f"Document length: {len(truncated_text)} chars")
        logger.info("="*80 + "\n")
        
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a legal AI that analyzes Sri Lankan Supreme Court judgments. You predict missing clauses AND specify their exact insertion position using anchor text from the document. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": batch_prompt
                }
            ],
            temperature=0.3,
            max_tokens=6000,
            response_format={"type": "json_object"}
        )

        response_text = response.choices[0].message.content.strip()
        
        # Log response
        logger.info("\n" + "="*80)
        logger.info("📥 RECEIVED FROM OPENAI LLM")
        logger.info("="*80)
        logger.info(f"Response ID: {response.id}")
        logger.info(f"Tokens used - Prompt: {response.usage.prompt_tokens}, Completion: {response.usage.completion_tokens}, Total: {response.usage.total_tokens}")
        logger.info(f"Response length: {len(response_text)} chars")
        logger.info(f"\n{response_text}")
        logger.info("="*80 + "\n")
        
        suggestions = json.loads(response_text)
        logger.info(f"✅ LLM returned suggestions for {len(suggestions)} clauses")
        
        # Handle if LLM returned a list instead of object - convert to dict by clause_key
        if isinstance(suggestions, list):
            logger.warning("⚠️ LLM returned a list instead of object, converting to dict format...")
            suggestions_dict = {}
            for item in suggestions:
                if isinstance(item, dict) and "clause_key" in item:
                    clause_key = item.pop("clause_key")
                    suggestions_dict[clause_key] = item
                elif isinstance(item, dict) and len(item) == 1:
                    # If it's a dict with single key-value pair, use that
                    clause_key = list(item.keys())[0]
                    suggestions_dict[clause_key] = item[clause_key]
            if suggestions_dict:
                suggestions = suggestions_dict
                logger.info(f"✅ Converted list to dict with {len(suggestions)} clauses")
            else:
                raise ValueError("Could not convert list response to dict format")
        
        # Validate that responses have required fields
        for key, sug in suggestions.items():
            if "anchor_text" not in sug:
                logger.warning(f"⚠️ Missing anchor_text for {key}, using fallback")
                sug["anchor_text"] = ""
                sug["position"] = "end"
            if "position" not in sug:
                sug["position"] = "after"
        
        return suggestions

    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse LLM response as JSON: {e}")
        logger.error(f"Response text was: {response_text[:500] if 'response_text' in locals() else 'N/A'}")
        return _generate_fallback_suggestions(missing_clauses, contexts, text)
    except Exception as e:
        logger.error(f"❌ OpenAI API call failed: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return _generate_fallback_suggestions(missing_clauses, contexts, text)


def _generate_fallback_suggestions(
    missing_clauses: List[Dict],
    contexts: Dict[str, Dict],
    text: str
) -> Dict[str, Dict]:
    """Generate template-based fallback suggestions when LLM is unavailable."""
    fallbacks = {}
    
    fallback_templates = {
        "judge_concurrence": lambda ctx: _fallback_judge_concurrence(ctx),
        "conclusion_section": "For the foregoing reasons set out above, and having considered the submissions of both parties and the applicable law, [the appeal/application is hereby dismissed/allowed]. The judgment of the [lower court] dated [date] is [affirmed/set aside].",
        "disposition_formula": "The appeal is [dismissed/allowed] [with/without costs]. The judgment of the [Court of Appeal/High Court/District Court] dated [date] is hereby [affirmed/set aside].",
        "procedural_history": "The [Plaintiff/Appellant] instituted action in the [District Court/High Court] bearing No. [case number] seeking [relief]. Being aggrieved by the judgment of the [Court] dated [date], the [Party] preferred this appeal to the Supreme Court.",
        "leave_to_appeal": "This Court granted special leave to appeal on [date] on the following question(s) of law:\n\n(a) [Question of law pertaining to the interpretation of statutory provisions]\n(b) [Question relating to the application of legal principles]",
        "lower_court_findings": "The learned [District Judge/High Court Judge] held that [finding regarding the main issue]. Accordingly, judgment was entered [in favour of/against] the [Party] with directions that [order or relief granted by the lower court].",
        "cost_order": "Considering the circumstances of this case and the conduct of the parties, [the appeal is dismissed with costs/without costs/each party to bear their own costs].",
    }

    # Try to find anchor text from document for position-based insertion
    lines = text.split('\n')
    first_line = lines[0] if lines else "Document start"
    last_line = lines[-1] if lines else "Document end"

    for mc in missing_clauses:
        key = mc["clause_key"]
        ctx = contexts.get(key, {})
        template = fallback_templates.get(key, f"[{mc['clause_name']} - AI suggestion unavailable]")
        
        if callable(template):
            suggestion = template(ctx)
        else:
            suggestion = template

        # Provide basic position info for fallback
        anchor = last_line[:100] if key == "judge_concurrence" else first_line[:100]
        position = "after" if key == "judge_concurrence" else "before"

        fallbacks[key] = {
            "suggestion": suggestion,
            "confidence": 30,
            "reasoning": "Generated from template (LLM unavailable). Please review and edit.",
            "anchor_text": anchor,
            "position": position
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
        - source: "llm" | "fallback"
        - mode: current prediction mode setting
    """
    # 1. Detect missing predictable clauses using prediction regexes
    missing = detect_missing_predictable_clauses(text)
    logger.info(f"Found {len(missing)} missing predictable clauses")

    if not missing:
        result = {
            "missing_predictable_clauses": [],
            "suggestions": {},
            "total_predictable": len(PREDICTABLE_CLAUSES),
            "total_missing": 0,
            "total_detected": 0,
            "source": "none",
            "mode": CLAUSE_PREDICTION_MODE,
        }
        return result

    # 2. Prioritize and limit suggestions (show only top 2-3 most important)
    # Give judge_concurrence highest priority, then sort by frequency
    total_missing = len(missing)
    if len(missing) > MAX_SUGGESTIONS_TO_SHOW:
        # Prioritize judge_concurrence first, then by frequency
        def priority_key(clause):
            # Judge concurrence gets highest priority (score 1000)
            if clause['clause_key'] == 'judge_concurrence':
                return 1000.0
            # Otherwise sort by frequency
            return float(clause['frequency'].rstrip('%'))
        
        missing_sorted = sorted(
            missing,
            key=priority_key,
            reverse=True
        )
        missing = missing_sorted[:MAX_SUGGESTIONS_TO_SHOW]
        logger.info(f"Limiting suggestions to top {MAX_SUGGESTIONS_TO_SHOW} most important clauses")
        logger.info(f"Selected clauses: {[m['clause_name'] for m in missing]}")

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
        "total_missing": total_missing,  # Total number detected
        "total_shown": len(missing),  # Number of suggestions shown (limited)
        "source": "llm" if OPENAI_API_KEY else "fallback",
        "mode": CLAUSE_PREDICTION_MODE,
    }

    for mc in missing:
        key = mc["clause_key"]
        suggestion_data = suggestions.get(key, {})
        ctx = contexts.get(key, {})
        
        result["suggestions"][key] = {
            "clause_key": key,
            "clause_name": mc["clause_name"],
            "predictability": mc["predictability"],
            "frequency": mc["frequency"],
            "suggestion": suggestion_data.get("suggestion", f"[{mc['clause_name']} - suggestion unavailable]"),
            "confidence": suggestion_data.get("confidence", 0),
            "reasoning": suggestion_data.get("reasoning", ""),
            "context_used": ctx,
            "position": mc["position"],
            "insertion_point": ctx.get("insertion_point", {}),
            # NEW: Position-based insertion data from OpenAI
            "anchor_text": suggestion_data.get("anchor_text", ""),
            "insertion_position": suggestion_data.get("position", "end"),  # "before" | "after" | "end"
        }

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
