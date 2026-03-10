

from typing import Dict, Tuple, Optional
from enum import Enum


class InsertionPosition(Enum):
    """Where to insert relative to anchor text"""
    BEFORE = "before"
    AFTER = "after"
    REPLACE = "replace"
    DOCUMENT_START = "document_start"
    DOCUMENT_END = "document_end"


# ═══════════════════════════════════════════════════════════════════════════
# PREDICTABLE CLAUSES WITH POSITION LOGIC
# ═══════════════════════════════════════════════════════════════════════════

CLAUSE_INSERTION_RULES = {
    "judge_concurrence": {
        "name": "Judge Concurrence Block",
        "position_strategy": InsertionPosition.DOCUMENT_END,
        "anchor_text_patterns": [
            "Application is dismissed",
            "Appeal is dismissed", 
            "dismissed. Parties shall bear",
            "costs"
        ],
        "fallback_position": "END",  # Always goes at very end
        "offset_lines": 2,  # Insert 2 lines after anchor
        "priority": 1,  # Highest priority - insert first
        "example_anchor": "For all the foregoing reasons, I hold that leave to appeal must be refused. Application is dismissed.",
        "insertion_logic": """
            # PSEUDO-CODE (NOT EXECUTABLE)
            if document.contains("Application is dismissed"):
                position = find_end_of_sentence("Application is dismissed")
                insert_at(position + 2_newlines)
            else:
                position = document.end - 10_lines
                insert_at(position)
        """
    },
    
    "conclusion_section": {
        "name": "Conclusion / Disposition Section",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "For the foregoing reasons",
            "In conclusion",
            "Accordingly, I hold",
            "Therefore, I conclude"
        ],
        "fallback_position": 0.85,  # 85% through document
        "offset_lines": 1,
        "priority": 2,
        "example_anchor": "I am in respectful agreement with the decision in Barbara Iranganie De Silva",
        "insertion_logic": """
            # Find legal analysis conclusion
            if document.contains("For the foregoing reasons"):
                anchor_pos = find("For the foregoing reasons")
                insert_at(anchor_pos + paragraph_end)
            elif document.contains("Accordingly"):
                anchor_pos = find_last_occurrence("Accordingly")
                insert_at(anchor_pos + 1_newline)
            else:
                # Fallback: 85% through document (before judge signatures)
                pos = len(document) * 0.85
                insert_at(pos)
        """
    },
    
    "disposition_formula": {
        "name": "Disposition Formula",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "leave to appeal must be refused",
            "appeal is allowed",
            "appeal is dismissed",
            "application is granted"
        ],
        "fallback_position": 0.90,  # 90% through document
        "offset_lines": 0,
        "priority": 3,
        "example_anchor": "Hence, the leave to appeal application made by the Petitioner is misconceived in law.",
        "insertion_logic": """
            # Final outcome statement
            outcomes = ["refused", "allowed", "dismissed", "granted"]
            for outcome in outcomes:
                if f"leave to appeal must be {outcome}" in document:
                    pos = find(f"leave to appeal must be {outcome}")
                    insert_at(pos + sentence_end)
                    break
            else:
                # Before judge concurrence if exists
                if has_judge_concurrence:
                    insert_before(judge_concurrence_start - 3_lines)
                else:
                    insert_at(document.end * 0.90)
        """
    },
    
    "hearing_dates": {
        "name": "Hearing Dates",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "Counsel:",
            "For the Petitioner:",
            "For the Respondent:",
            "Argued on:"
        ],
        "fallback_position": 0.15,  # 15% through document (header area)
        "offset_lines": 1,
        "priority": 10,
        "example_anchor": "Ishan Alawathurage for the Substituted Defendant – Respondent – Respondent – Respondent",
        "insertion_logic": """
            # After counsel/advocate listings
            counsel_section_end = find_last("For the Respondent:")
            if counsel_section_end:
                insert_at(counsel_section_end + 2_newlines)
            else:
                # After "Before:" judge listing
                before_section = find("Before:")
                if before_section:
                    insert_at(before_section + 3_lines)
                else:
                    insert_at(document_start + header_size)
        """
    },
    
    "legal_representatives": {
        "name": "Legal Representatives",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "JUDGE OF THE SUPREME COURT",
            "Before:",
            "Hon. Vijith K. Malalgoda"
        ],
        "fallback_position": 0.12,  # 12% through document
        "offset_lines": 2,
        "priority": 9,
        "example_anchor": "Hon. Janak De Silva, J.",
        "insertion_logic": """
            # After judge bench listing
            if "Before:" in document:
                before_pos = find("Before:")
                # Find end of judge list (usually 3-5 lines)
                judge_list_end = find_next_empty_line(before_pos)
                insert_at(judge_list_end + 1_newline)
            else:
                # After case number section
                case_no_end = find("Case No:")
                insert_at(case_no_end + 5_lines)
        """
    },
    
    "legal_framework": {
        "name": "Legal Framework Section",
        "position_strategy": InsertionPosition.BEFORE,
        "anchor_text_patterns": [
            "The question that arises",
            "The issue for determination",
            "Section 88(2)",
            "was examined by"
        ],
        "fallback_position": 0.40,  # 40% through document (legal analysis area)
        "offset_lines": -2,  # Insert BEFORE anchor
        "priority": 6,
        "example_anchor": "The question that arises for determination is whether a party aggrieved by a default judgment must come by way of appeal or leave to appeal.",
        "insertion_logic": """
            # Before main legal question
            if "The question that arises" in document:
                question_pos = find("The question that arises")
                insert_at(question_pos - 2_newlines, position=BEFORE)
            elif "Section" in document:
                # Before first section reference
                first_section = find_first_match(r"Section \d+")
                insert_at(first_section - 1_paragraph)
            else:
                # Middle of document - legal analysis area
                insert_at(len(document) * 0.40)
        """
    },
    
    "case_title": {
        "name": "Case Title",
        "position_strategy": InsertionPosition.DOCUMENT_START,
        "anchor_text_patterns": [
            "IN THE SUPREME COURT",
            "HIGH COURT",
            "CIVIL APPELLATE"
        ],
        "fallback_position": 0,  # Very beginning
        "offset_lines": 1,
        "priority": 15,
        "example_anchor": "IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA",
        "insertion_logic": """
            # Always at document start
            if "IN THE SUPREME COURT" in document:
                court_line = find("IN THE SUPREME COURT")
                insert_at(court_line + 2_newlines)
            else:
                # Absolute start
                insert_at(position=0)
        """
    },
    
    "petitioner_name": {
        "name": "Petitioner Name",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "Plaintiff",
            "Petitioner",
            "Appellant",
            "Applicant"
        ],
        "fallback_position": 0.08,  # 8% through document
        "offset_lines": 1,
        "priority": 12,
        "example_anchor": "S.C. Case No: SC/HCCA/LA 184/2023",
        "insertion_logic": """
            # After case number, before "Vs." or "Defendant"
            case_no_end = find("Case No:")
            vs_position = find("Vs.")
            
            if case_no_end and vs_position:
                insert_at(case_no_end + 3_lines)
            elif "Plaintiff" in document:
                insert_after("Plaintiff")
            else:
                insert_at(header_end + 50_chars)
        """
    },
    
    "respondent_name": {
        "name": "Respondent Name",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "Vs.",
            "Defendant",
            "Respondent",
            "Against"
        ],
        "fallback_position": 0.10,  # 10% through document
        "offset_lines": 1,
        "priority": 11,
        "example_anchor": "Vs.",
        "insertion_logic": """
            # After "Vs." marker
            vs_pos = find("Vs.")
            if vs_pos:
                insert_at(vs_pos + 2_newlines)
            else:
                # After petitioner section
                petitioner_end = find_section_end("Petitioner")
                insert_at(petitioner_end + 1_newline)
        """
    },
    
    "referred_cases": {
        "name": "Referred Cases / Citations",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "was examined by",
            "referred to",
            "relied upon",
            "cited"
        ],
        "fallback_position": 0.50,  # Middle of document (legal analysis)
        "offset_lines": 1,
        "priority": 5,
        "example_anchor": "This provision was examined by a fuller bench of this Court in Barbara Iranganie De Silva",
        "insertion_logic": """
            # In legal analysis, after case references begin
            citations = find_all(r"v\. [A-Z][a-z]+|AIR|SCC|\[\d{4}\]")
            if citations:
                last_citation = citations[-1]
                insert_at(last_citation + paragraph_end)
            else:
                # Middle of document
                insert_at(len(document) * 0.50)
        """
    },
    
    "judge_bench": {
        "name": "Judge Bench Composition",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "Before:",
            "Coram:",
            "JUDGES"
        ],
        "fallback_position": 0.10,
        "offset_lines": 0,
        "priority": 13,
        "example_anchor": "Before: Hon. Vijith K. Malalgoda, PC, J.",
        "insertion_logic": """
            # Part of header, after "Before:"
            if "Before:" in document:
                # Already exists, skip
                return SKIP
            else:
                # After case number, before counsel
                case_end = find("Case No:")
                counsel_start = find("Counsel:")
                insert_between(case_end, counsel_start)
        """
    },
    
    "procedural_history": {
        "name": "Procedural History",
        "position_strategy": InsertionPosition.AFTER,
        "anchor_text_patterns": [
            "background",
            "facts",
            "instituted action",
            "filed application"
        ],
        "fallback_position": 0.30,
        "offset_lines": 1,
        "priority": 7,
        "example_anchor": "The Plaintiff-Petitioner-Petitioner-Petitioner instituted action against the Defendant",
        "insertion_logic": """
            # After facts section begins
            facts_start = find_any([
                "instituted action",
                "filed application",
                "background"
            ])
            if facts_start:
                insert_at(facts_start + 2_paragraphs)
            else:
                # 30% through doc (after header, before legal analysis)
                insert_at(len(document) * 0.30)
        """
    }
}


# ═══════════════════════════════════════════════════════════════════════════
# INSERTION ENGINE (PSEUDO-CODE - NOT FUNCTIONAL)
# ═══════════════════════════════════════════════════════════════════════════

class ClauseInsertionEngine:
    """
    DEMO CLASS - Does not actually work!
    Shows conceptual logic for inserting clauses at correct positions.
    """
    
    def __init__(self, document_text: str):
        self.document = document_text
        self.insertions = []  # List of (position, clause_text) tuples
        
    def find_insertion_position(self, clause_key: str, clause_text: str) -> Tuple[int, str]:
        """
        PSEUDO-METHOD: Find where to insert a clause
        
        Returns: (character_position, reasoning_string)
        """
        rule = CLAUSE_INSERTION_RULES[clause_key]
        
        # Strategy 1: Try anchor text patterns
        for anchor_pattern in rule["anchor_text_patterns"]:
            if anchor_pattern in self.document:
                position = self._find_anchor_position(
                    anchor_pattern, 
                    rule["position_strategy"],
                    rule["offset_lines"]
                )
                return position, f"Found anchor: '{anchor_pattern}'"
        
        # Strategy 2: Use fallback position
        if isinstance(rule["fallback_position"], str):
            if rule["fallback_position"] == "END":
                position = len(self.document) - 100  # Near end
            elif rule["fallback_position"] == "START":
                position = 0
        else:
            # Percentage through document
            position = int(len(self.document) * rule["fallback_position"])
        
        return position, f"Using fallback position: {rule['fallback_position']}"
    
    def _find_anchor_position(self, anchor_text: str, strategy: InsertionPosition, offset: int):
        """PSEUDO-METHOD: Calculate position based on anchor"""
        # THIS CODE DOES NOT RUN!
        anchor_index = self.document.find(anchor_text)
        
        if strategy == InsertionPosition.AFTER:
            # Find end of sentence/paragraph
            end_of_section = anchor_index + len(anchor_text)
            # Add offset lines
            for _ in range(offset):
                end_of_section = self.document.find('\n', end_of_section) + 1
            return end_of_section
        
        elif strategy == InsertionPosition.BEFORE:
            # Find start of paragraph
            line_start = self.document.rfind('\n', 0, anchor_index)
            return line_start
        
        elif strategy == InsertionPosition.DOCUMENT_END:
            return len(self.document) - 50
        
        elif strategy == InsertionPosition.DOCUMENT_START:
            return 0
        
        return anchor_index
    
    def insert_all_clauses(self, missing_clauses: Dict[str, str]) -> str:
        """
        PSEUDO-METHOD: Insert all missing clauses in correct order
        
        Args:
            missing_clauses: {clause_key: generated_text}
            
        Returns:
            Modified document with insertions
        """
        # Sort by priority (highest first)
        sorted_clauses = sorted(
            missing_clauses.items(),
            key=lambda x: CLAUSE_INSERTION_RULES[x[0]]["priority"],
            reverse=True
        )
        
        # Calculate all positions
        for clause_key, clause_text in sorted_clauses:
            position, reason = self.find_insertion_position(clause_key, clause_text)
            self.insertions.append({
                "clause_key": clause_key,
                "position": position,
                "text": clause_text,
                "reason": reason,
                "priority": CLAUSE_INSERTION_RULES[clause_key]["priority"]
            })
        
        # Sort by position (insert from end to start to preserve positions)
        self.insertions.sort(key=lambda x: x["position"], reverse=True)
        
        # Apply insertions
        modified_doc = self.document
        for insertion in self.insertions:
            pos = insertion["position"]
            text = insertion["text"]
            
            # Insert at position
            modified_doc = (
                modified_doc[:pos] + 
                "\n\n" + text + "\n\n" + 
                modified_doc[pos:]
            )
        
        return modified_doc
    
    def get_insertion_report(self) -> str:
        """Generate report showing where each clause was inserted"""
        report_lines = ["CLAUSE INSERTION REPORT", "=" * 80, ""]
        
        for ins in self.insertions:
            report_lines.append(f"Clause: {ins['clause_key']}")
            report_lines.append(f"  Position: Character {ins['position']} ({ins['position'] / len(self.document) * 100:.1f}% through doc)")
            report_lines.append(f"  Reason: {ins['reason']}")
            report_lines.append(f"  Priority: {ins['priority']}")
            report_lines.append("")
        
        return "\n".join(report_lines)


# ═══════════════════════════════════════════════════════════════════════════
# USAGE EXAMPLE (CONCEPTUAL - WILL NOT RUN)
# ═══════════════════════════════════════════════════════════════════════════

def demo_usage():
    """
    THIS IS PSEUDO-CODE - NOT EXECUTABLE
    Shows how the insertion engine would be used
    """
    # Load document
    document_text = load_document("SC_Appeal_79_2002.txt")
    
    # AI generates missing clauses
    missing_clauses = {
        "judge_concurrence": "Fernando, J.\nI agree.\n\nPerera, J.\nI agree.",
        "hearing_dates": "Argued on: 15.03.2023\nDecided on: 17.03.2023",
        "conclusion_section": "For the foregoing reasons, leave to appeal is refused."
    }
    
    # Initialize insertion engine
    engine = ClauseInsertionEngine(document_text)
    
    # Insert all clauses at correct positions
    final_document = engine.insert_all_clauses(missing_clauses)
    
    # Show where each clause was inserted
    print(engine.get_insertion_report())
    
    # Save final document
    save_document(final_document, "SC_Appeal_79_2002_completed.txt")


# ═══════════════════════════════════════════════════════════════════════════
# POSITION PRIORITY MATRIX
# ═══════════════════════════════════════════════════════════════════════════

INSERTION_ORDER = """
Priority Order (Insert highest priority first to avoid position conflicts):

1. (Priority 15) case_title              → Document start (0%)
2. (Priority 13) judge_bench             → Header area (10%)
3. (Priority 12) petitioner_name         → Header area (8%)
4. (Priority 11) respondent_name         → Header area (10%)
5. (Priority 10) hearing_dates           → Header area (15%)
6. (Priority 9)  legal_representatives   → Header area (12%)
7. (Priority 7)  procedural_history      → Facts section (30%)
8. (Priority 6)  legal_framework         → Legal analysis (40%)
9. (Priority 5)  referred_cases          → Legal analysis (50%)
10. (Priority 3) disposition_formula     → Conclusion area (90%)
11. (Priority 2) conclusion_section      → Conclusion area (85%)
12. (Priority 1) judge_concurrence       → Document end (100%)

Strategy:
- Insert from START to END (by priority)
- Recalculate positions after each insertion
- Special handling for DOCUMENT_END clauses (always append)
"""

print(__doc__)
print("\n" + "="*80)
print("This file contains conceptual logic only!")
print("See actual implementation in:")
print("  - frontend/src/components/clause/ClauseWorkspace.tsx")
print("  - backend/app/services/clause_prediction_service.py")
print("="*80)
