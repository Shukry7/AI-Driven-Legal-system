# COMPLETE LLM-PREDICTABLE CLAUSES GUIDE

## For AI Suggestion/Prediction When Clauses Are Missing

**Date:** March 2026  
**Verified Against:** 792 judgment files  
**Purpose:** When a user uploads a legal document → scan for clauses → for MISSING predictable clauses → extract context → send to LLM → show AI suggestion

---

## How This Works In Your App

```
User uploads judgment file
        ↓
STEP 1: Scan document with regex patterns (detect all clauses)
        ↓
STEP 2: Label each clause: ✅ Present | ❌ Missing | ⚠️ Corrupted
        ↓
STEP 3: For each MISSING clause listed below:
        → Extract required context from document
        → Send context + prompt to LLM
        → Show "💡 AI Suggestion" to user
```

---

## MASTER TABLE: All LLM-Predictable Clauses

| #   | Clause Name                        | Verified Freq (792 files) | Predictability | What LLM Generates                                                                                      |
| --- | ---------------------------------- | ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | **Judge Concurrence Block**        | 95.5% (756/792)           | ✅ FULL        | Complete "I agree" blocks for each judge                                                                |
| 2   | **Conclusion/Disposition Section** | 82.3% (652/792)           | ✅ FULL        | "For the foregoing reasons... appeal is dismissed/allowed"                                              |
| 3   | **Disposition Formula**            | 50.4% (399/792)           | ✅ FULL        | "Appeal is dismissed/allowed with/without costs"                                                        |
| 4   | **Procedural History**             | 93.8% (743/792)           | ⚠️ PARTIAL     | "This is an appeal from the judgment of the [Court]..."                                                 |
| 5   | **Leave to Appeal Statement**      | 51.1% (405/792)           | ⚠️ PARTIAL     | "Leave to appeal was granted on [date] on the following questions of law..."                            |
| 6   | **Lower Court Findings Summary**   | 58.6% (464/792)           | ⚠️ PARTIAL     | "The learned [Judge] of the [Court] held that..."                                                       |
| 7   | **Question of Law Answers**        | 32.4% (257/792)           | ⚠️ PARTIAL     | "Question (1): Answered in the affirmative/negative"                                                    |
| 8   | **Factual Background Label**       | 18.6% (147/792)           | ✅ FULL        | Section header: "Factual Background:" or variant                                                        |
| 9   | **Appellant Argument Summary**     | 53.9% (427/792)           | ⚠️ PARTIAL     | "Learned Counsel for the Appellant submitted that: (1)... (2)..."                                       |
| 10  | **Respondent Argument Summary**    | 41.3% (327/792)           | ⚠️ PARTIAL     | "Learned Counsel for the Respondent contended that: (1)... (2)..."                                      |
| 11  | **Legal Framework Introduction**   | 98.5% (780/792)           | ⚠️ PARTIAL     | "The relevant legal provisions are as follows: Section X of the [Act]..."                               |
| 12  | **Issue Analysis Structure**       | 90.2% (714/792)           | ⚠️ PARTIAL     | "The following issues arise for determination: (1)... (2)..."                                           |
| 13  | **Preliminary Objection Handling** | 12.5% (99/792)            | ⚠️ PARTIAL     | "[Party] raised the following preliminary objection(s):..."                                             |
| 14  | **Issues at Trial Block**          | 4.8% (38/792)             | ⚠️ PARTIAL     | "At the trial, the following issues were framed: (1)... (2)..."                                         |
| 15  | **Burden of Proof Discussion**     | 27.4% (217/792)           | ⚠️ PARTIAL     | "The burden of proving [X] lies with the [Party] on a balance of probabilities/beyond reasonable doubt" |
| 16  | **Hereinafter Reference**          | 47.6% (377/792)           | ⚠️ PARTIAL     | "[Full Party Name] (hereinafter referred to as the '[Short Name]')"                                     |
| 17  | **Cost Order**                     | 64.5% (511/792)           | ✅ FULL        | "with costs" / "without costs" / "costs fixed at Rs. [amount]"                                          |

**Legend:**

- ✅ FULL = LLM can generate the ENTIRE clause from document context
- ⚠️ PARTIAL = LLM can generate the STRUCTURE/TEMPLATE but some content is case-specific (noted with `[placeholders]`)

---

## DETAILED SPECIFICATIONS FOR EACH CLAUSE

---

### CLAUSE 1: Judge Concurrence Block

**Predictability:** ✅ FULL  
**Verified Frequency:** 95.5% (756/792 files)  
**Position in Document:** End of judgment (last 5-15 lines)

#### Regex to Detect If MISSING

```regex
I\s+agree[.,]?
```

If this regex does NOT match in the last 20% of the document → clause is MISSING → offer AI suggestion.

#### What to Extract from Document

| Extract This    | Where to Find It                                               | Regex to Extract                                                           |
| --------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ | -------------------------------------------- | ------ | -------- |
| All judge names | "Before:" or "BEFORE:" section near top                        | `(?:BEFORE                                                                 | Before | Coram)\s*:?\s*\n([\s\S]_?)(?=\n\s_(?:Counsel | Argued | Heard))` |
| Judgment author | First "[Surname], J" or "[Surname], PC, J" after body starts   | `^\s*([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+),?\s*(?:PC,?\s*)?J\.?\s*$` |
| Judge titles    | From court name (Supreme Court → "JUDGE OF THE SUPREME COURT") | Derive from court header                                                   |

#### What to Send to LLM

```json
{
  "clause_type": "judge_concurrence",
  "judge_names": [
    "Vijith K. Malalgoda, PC, J",
    "Yasantha Kodagoda, PC, J",
    "Arjuna Obeyesekere, J"
  ],
  "judgment_author": "Obeyesekere, J",
  "court": "Supreme Court"
}
```

#### Prompt to Send to LLM

```
Generate the judge concurrence block for a Sri Lankan Supreme Court judgment.

The judgment was authored by {judgment_author}.
The bench consists of: {judge_names}

For each NON-authoring judge, generate:
[Judge Full Name]
I agree.

JUDGE OF THE SUPREME COURT

Rules:
- The authoring judge does NOT get an "I agree" block
- Each non-authoring judge gets their own block
- Use exact names as provided
- Title is always "JUDGE OF THE SUPREME COURT" (or "CHIEF JUSTICE" if applicable)
```

#### Expected Output

```
Vijith K. Malalgoda, PC, J
I agree.

JUDGE OF THE SUPREME COURT

Yasantha Kodagoda, PC, J
I agree.

JUDGE OF THE SUPREME COURT
```

---

### CLAUSE 2: Conclusion / Disposition Section

**Predictability:** ✅ FULL  
**Verified Frequency:** 82.3% (652/792 files)  
**Position in Document:** 80-95% through document

#### Regex to Detect If MISSING

```regex
(?:(?:^|\n)\s*(?:Conclusion|CONCLUSION|Determination|DETERMINATION)\s*:?\s*(?:\n|$)|[Ff]or\s+(?:the\s+)?(?:reasons|foregoing\s+reasons|all\s+(?:the\s+)?(?:above|aforesaid|foregoing)\s+reasons)\s+(?:set\s+(?:out|forth)\s+above|stated|mentioned|given|I|we)|[Ii]n\s+(?:the\s+(?:above\s+)?circumstances|these\s+circumstances|the\s+premises|the\s+result|the\s+upshot)|[Tt]aking\s+into\s+consideration|(?:I|[Ww]e)\s+(?:am|are)\s+of\s+the\s+(?:view|opinion)\s+that|(?:I|[Ww]e)\s+(?:hold|find|conclude)\s+that|(?:I|[Ww]e)\s+(?:accordingly|therefore|thus|hence)\s+(?:dismiss|allow|affirm|set\s+aside|uphold)|[Ii]n\s+(?:view|light)\s+of\s+(?:the\s+)?(?:above|aforesaid|foregoing)|(?:I|[Ww]e)\s+(?:see|find)\s+no\s+(?:merit|reason|ground|basis))
```

If NOT found → clause is MISSING.

#### What to Extract from Document

| Extract This   | Where to Find It     | How                                                    |
| -------------- | -------------------- | ------------------------------------------------------ |
| Appeal outcome | Last 20% of document | Search for "dismissed\|allowed\|affirmed\|set aside"   |
| Case type      | Header               | "Appeal" / "Application" / "Petition" from case number |
| Lower court    | Header case numbers  | e.g., "High Court of the Western Province"             |

#### What to Send to LLM

```json
{
  "clause_type": "conclusion_section",
  "case_type": "appeal",
  "outcome": "dismissed",
  "lower_court": "High Court of the Western Province",
  "lower_court_date": "29th November 2017"
}
```

#### Prompt to Send to LLM

```
Generate a conclusion section for a Sri Lankan Supreme Court judgment.

Case type: {case_type}
Outcome: appeal {outcome}
Lower court: {lower_court}
Lower court judgment date: {lower_court_date}

Generate a formal conclusion paragraph using one of these standard openings:
- "For the foregoing reasons..."
- "In the above circumstances..."
- "Accordingly..."
- "For all the reasons set out above..."

Follow with the final order (appeal dismissed/allowed) and reference the lower court judgment.
End with costs order if applicable.
```

#### Expected Output

```
For the foregoing reasons, I am of the view that the judgment of the
learned High Court Judge dated 29th November 2017 is correct and does
not warrant interference by this Court.

Accordingly, this appeal is dismissed, with costs.
```

---

### CLAUSE 3: Disposition Formula

**Predictability:** ✅ FULL  
**Verified Frequency:** 50.4% (399/792 files)  
**Position in Document:** Last 5-10% of document (before judge signatures)

#### Regex to Detect If MISSING

```regex
(?:[Aa]ppeal\s+(?:is\s+)?(?:allowed|dismissed|partly\s+allowed)|[Aa]pplication\s+(?:is\s+)?(?:allowed|dismissed|granted)|[Rr]ule\s+(?:is\s+)?made\s+absolute)
```

#### What to Extract from Document

| Extract This      | Where to Find It          | How                                                                         |
| ----------------- | ------------------------- | --------------------------------------------------------------------------- |
| Outcome direction | Analysis section near end | Look for "I hold that" / "I am of the view" / positive or negative language |
| Case type         | Header                    | Appeal / Application / Writ                                                 |
| Costs             | Common patterns           | "with costs" / "without costs"                                              |

#### What to Send to LLM

```json
{
  "clause_type": "disposition_formula",
  "case_type": "appeal",
  "likely_outcome": "dismissed",
  "costs": "with costs fixed at Rs. 100,000"
}
```

#### Prompt to Send to LLM

```
Generate the disposition formula for a Sri Lankan Supreme Court judgment.

Case type: {case_type}
Outcome: {likely_outcome}

Use one of these standard formulas:
- "The appeal is dismissed [with/without costs]."
- "The appeal is allowed. The judgment of the [lower court] is set aside."
- "The application is dismissed. No costs."
- "The appeal is partly allowed."

If costs are applicable, add: "Costs fixed at Rs. [amount]."
```

#### Expected Output

```
The appeal is dismissed, with costs fixed at Rs. 100,000/-.
```

---

### CLAUSE 4: Procedural History

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 93.8% (743/792 files)  
**Position in Document:** 5-20% through document (after header, before factual background)

**Note:** LLM can generate the STRUCTURE and TEMPLATE. Specific dates and court names must come from document context.

#### Regex to Detect If MISSING

```regex
(?:filed\s+(?:an?\s+)?(?:action|appeal|application|plaint|this\s+appeal)|instituted\s+(?:partition\s+)?action|[Tt]his\s+is\s+an\s+appeal|[Tt]his\s+appeal\s+arises|[Aa]ggrieved\s+by\s+the|[Bb]eing\s+aggrieved|preferred\s+this\s+appeal|[Ii]n\s+the\s+matter\s+of\s+an\s+(?:appeal|application)|appealed\s+to\s+(?:this\s+Court|the\s+High\s+Court|the\s+Court\s+of\s+Appeal)|(?:the\s+)?(?:above|instant|present)\s+(?:appeal|case|matter|action|petition|application)|(?:appeal|petition)\s+(?:against|from)\s+(?:the\s+)?(?:judgment|order|decree|decision)|(?:the\s+)?(?:brief|material|relevant|salient)\s+facts|(?:was|were)\s+(?:preferred|filed|lodged|instituted)\s+(?:before|in|to|with))
```

#### What to Extract from Document

| Extract This      | Where to Find It               | Regex                                                                         |
| ----------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| All case numbers  | Header area (first 50 lines)   | `[A-Z]{2,4}\s+\d+[/\\-]\d+`                                                   |
| Lower court names | Header or case number prefixes | "DC" = District Court, "HC" = High Court, "HCCA" = High Court Civil Appellate |
| Party roles       | Header                         | Plaintiff/Defendant/Petitioner/Respondent                                     |
| Party names       | Header                         | First party name under each role label                                        |
| Case type         | Case number prefix             | SC Appeal / SC FR / SC CHC                                                    |

#### What to Send to LLM

```json
{
  "clause_type": "procedural_history",
  "case_numbers": {
    "sc": "SC Appeal 48/2021",
    "hcca": "WP/HCCA/COL/41/2019(F)",
    "dc": "DDR/425/2017"
  },
  "courts": [
    "District Court of Colombo",
    "High Court of the Western Province",
    "Supreme Court"
  ],
  "plaintiff": "Indian Overseas Bank",
  "defendant": "Vadivelu Anandasiva",
  "case_type": "Civil Appeal"
}
```

#### Prompt to Send to LLM

```
Generate a procedural history paragraph for a Sri Lankan Supreme Court judgment.

Case hierarchy:
- District Court: {dc_case} in {dc_court}
- High Court (Civil Appellate): {hcca_case}
- Supreme Court: {sc_case}

Plaintiff: {plaintiff}
Defendant: {defendant}
Case type: {case_type}

Generate a paragraph explaining how the case traveled through the courts.
Use formal judicial language. Common patterns:
- "The [Plaintiff] instituted action in the [Court] bearing No. [X]."
- "Being aggrieved by the [judgment/order] of the [Court], the [Party] appealed to the [Higher Court]."
- "This Court granted [special] leave to appeal on [date]."

Fill in [specific details] with placeholders if not provided.
```

#### Expected Output

```
The Plaintiff-Respondent-Respondent (Indian Overseas Bank) instituted
action in the District Court of Colombo bearing No. DDR/425/2017.

Being aggrieved by the judgment of the learned District Judge, the
Defendant-Appellant filed an appeal in the High Court of the Western
Province bearing No. WP/HCCA/COL/41/2019(F).

Being further aggrieved by the judgment of the High Court, the
Defendant-Appellant-Appellant preferred this appeal to the Supreme Court.
This Court granted special leave to appeal.
```

---

### CLAUSE 5: Leave to Appeal Statement

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 51.1% (405/792 files)  
**Position in Document:** 10-25% through document

#### Regex to Detect If MISSING

```regex
(?:[Ll]eave\s+to\s+[Aa]ppeal\s+(?:was|has\s+been)\s+granted|[Tt]his\s+[Cc]ourt\s+(?:has\s+)?granted\s+(?:special\s+)?[Ll]eave|[Ss]pecial\s+[Ll]eave\s+to\s+[Aa]ppeal|granted\s+[Ll]eave\s+(?:to\s+[Aa]ppeal\s+)?on\s+the|[Ll]eave\s+to\s+[Aa]ppeal\s+on\s+the\s+following)
```

#### What to Extract from Document

| Extract This        | Where to Find It            | How                                                      |
| ------------------- | --------------------------- | -------------------------------------------------------- |
| Questions of law    | Body text, usually numbered | Look for "question(s) of law" followed by numbered items |
| Leave date          | Body or header              | Date near "leave" / "granted" keywords                   |
| Number of questions | Count from body text        | Count numbered/lettered questions                        |

#### What to Send to LLM

```json
{
  "clause_type": "leave_to_appeal",
  "leave_date": "15th January 2021",
  "questions_of_law": [
    "Whether the Court of Appeal erred in law in holding that...",
    "Whether the defendant had established prescriptive title..."
  ]
}
```

#### Prompt to Send to LLM

```
Generate a leave to appeal statement for a Sri Lankan Supreme Court judgment.

Leave was granted on: {leave_date}
Questions of law:
{questions_of_law}

Use this standard format:
"This Court granted [special] leave to appeal on [date] on the following
question(s) of law:

(a) [Question 1]
(b) [Question 2]
..."

If number of questions is not known, use placeholder.
```

#### Expected Output

```
This Court granted special leave to appeal on 15th January 2021
on the following questions of law:

(a) Whether the Court of Appeal erred in law in holding that the
    Plaintiff had failed to establish title?

(b) Whether the defendant had established prescriptive title to the
    land in dispute?
```

---

### CLAUSE 6: Lower Court Findings Summary

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 58.6% (464/792 files)  
**Position in Document:** 15-40% through document

#### Regex to Detect If MISSING

```regex
(?:(?:[Ll]earned\s+)?(?:Additional\s+)?(?:District|High\s+Court|Commercial\s+High\s+Court|Trial|Magistrate'?s?)\s+(?:Court\s+)?Judge[s]?\s+(?:held|found|concluded|observed|determined|decided|dismissed|allowed|granted|erred|ruled|was\s+of\s+the\s+(?:view|opinion))|(?:the\s+)?(?:High\s+Court|Court\s+of\s+Appeal|District\s+Court|Commercial\s+High\s+Court|Labour\s+Tribunal|Magistrate.s\s+Court)\s+(?:held|found|decided|dismissed|allowed|affirmed|set\s+aside|erred|upheld|ruled|observed|concluded|determined)|(?:the\s+)?(?:impugned|challenged|contested)\s+(?:judgment|order|decree|decision)|(?:the\s+)?(?:learned\s+)?(?:trial\s+)?[Jj]udge\s+(?:held|found|decided|concluded|observed|determined|dismissed|allowed|erred|ruled)|court\s+(?:of\s+first\s+instance|below|a\s+quo))
```

#### What to Extract from Document

| Extract This           | Where to Find It                  | How                                        |
| ---------------------- | --------------------------------- | ------------------------------------------ |
| Lower court name       | Header case numbers               | DC/HC/HCCA prefix                          |
| Judge title            | Convention                        | "District Judge" / "High Court Judge"      |
| Outcome at lower court | Case number chain — who appealed? | If defendant appealed, plaintiff won below |
| Issues decided         | Body text — questions of law      | What questions were before lower court     |

#### What to Send to LLM

```json
{
  "clause_type": "lower_court_findings",
  "lower_court": "District Court of Colombo",
  "judge_title": "learned District Judge",
  "outcome": "judgment entered in favour of the Plaintiff",
  "key_findings": [
    "Plaintiff proved title to the land",
    "Defendant's claim of prescription rejected"
  ]
}
```

#### Prompt to Send to LLM

```
Generate a lower court findings summary for a Sri Lankan Supreme Court judgment.

Lower court: {lower_court}
Judge title: {judge_title}
Outcome: {outcome}
Key findings: {key_findings}

Use formal judicial language:
"The {judge_title} [held/found/concluded] that [finding].
Accordingly, the {judge_title} [entered judgment in favour of / dismissed the action of] the [Party]."

Generate 2-4 sentences summarizing what the lower court decided.
```

#### Expected Output

```
The learned District Judge, having considered the evidence led at the
trial, held that the Plaintiff had proved title to the corpus of the
land. The learned District Judge further held that the Defendant's
claim of prescriptive title had not been established. Accordingly,
judgment was entered in favour of the Plaintiff as prayed for.
```

---

### CLAUSE 7: Question of Law Answers

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 32.4% (257/792 files)  
**Position in Document:** 85-95% through document (in or near conclusion)

#### Regex to Detect If MISSING

```regex
(?:[Qq]uestion\s+(?:of\s+[Ll]aw\s+)?(?:No\.?\s*)?[\(\[]?\d[\)\]]?\s*:?\s*(?:is\s+)?[Aa]nswered|[Aa]nswere?d?\s+in\s+the\s+(?:affirmative|negative)|I\s+(?:would\s+)?(?:therefore\s+)?answer\s+the\s+(?:above\s+)?question|answer\s+the\s+questions?\s+of\s+law)
```

#### What to Extract from Document

| Extract This                  | Where to Find It                                    | How                                             |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Questions of law text         | Earlier in document (after "leave granted" section) | Numbered questions following "questions of law" |
| Court's analysis per question | Body reasoning sections                             | Analysis paragraphs addressing each question    |
| Direction of answer           | Conclusion language                                 | Positive/negative language per question         |

#### What to Send to LLM

```json
{
  "clause_type": "question_of_law_answers",
  "questions": [
    {
      "number": "a",
      "text": "Whether the Court erred in applying Section 41A?",
      "analysis_direction": "negative"
    },
    {
      "number": "b",
      "text": "Whether there was a miscarriage of justice?",
      "analysis_direction": "negative"
    }
  ]
}
```

#### Prompt to Send to LLM

```
Generate answers to questions of law for a Sri Lankan Supreme Court judgment.

Questions:
{questions}

Use this exact format for each question:
"Question ({number}): Answered in the [affirmative/negative]."

If analysis_direction is "positive" → "affirmative"
If analysis_direction is "negative" → "negative"

At the end add: "I answer the questions of law as set out above."
```

#### Expected Output

```
I answer the questions of law as follows:

Question (a): Answered in the negative.
Question (b): Answered in the negative.
```

---

### CLAUSE 8: Factual Background Label

**Predictability:** ✅ FULL  
**Verified Frequency:** 18.6% (147/792 files)  
**Position in Document:** 10-25% through document

#### Regex to Detect If MISSING

```regex
(?:(?:^|\n)\s*(?:Factual\s+[Mm]atrix|Facts?\s+in\s+[Bb]rief|The\s+[Ff]actual\s+[Bb]ackground|Background\s+[Ff]acts?|The\s+[Ff]acts?\s+of\s+the\s+[Cc]ase|Introduction|Brief\s+[Ff]acts|The\s+[Ff]acts|Background|BACKGROUND|THE\s+FACTS|FACTUAL\s+MATRIX|FACTS\s+IN\s+BRIEF|INTRODUCTION|Brief\s+[Bb]ackground|The\s+[Bb]ackground|Factual\s+[Bb]ackground|Consideration\s+of\s+[Ff]acts?)\s*:?\s*\.?\s*(?:\n|$))
```

#### What to Extract from Document

Nothing needed — this is a section header label. Just check if the document has a factual narrative section without a label.

#### What to Send to LLM

```json
{
  "clause_type": "factual_background_label",
  "case_type": "civil_appeal"
}
```

#### Prompt to Send to LLM

```
Suggest an appropriate section heading label for the factual background section
of a Sri Lankan {case_type} judgment.

Choose from these standard labels (pick most appropriate for case type):
- "The Facts" (most common)
- "Factual Background"
- "Brief Facts"
- "Background"
- "The Facts of the Case"
- "Factual Matrix" (for complex commercial cases)
- "Facts in Brief"
```

#### Expected Output

```
The Facts
```

---

### CLAUSE 9: Appellant Argument Summary

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 53.9% (427/792 files)  
**Position in Document:** 40-70% through document

**Note:** LLM generates the STRUCTURE. The actual arguments are case-specific and must come from document context or be left as placeholders.

#### Regex to Detect If MISSING

```regex
(?:(?:[Ll]earned\s+)?[Cc]ounsel\s+for\s+(?:the\s+)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)s?[\s,]+(?:submitted|contended|argued|urged|maintained|pointed\s+out|stated)|(?:the\s+)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)s?\s+(?:submitted|contended|argued|urged|maintained|averred|stated)|(?:it\s+was\s+)?(?:submitted|contended|argued|urged)\s+(?:by|on\s+behalf\s+of)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)|(?:the\s+)?(?:submission|contention|argument)s?\s+(?:of|made\s+by)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner))
```

#### What to Extract from Document

| Extract This      | Where to Find It                         | How                                          |
| ----------------- | ---------------------------------------- | -------------------------------------------- |
| Appellant's role  | Header                                   | Appellant / Plaintiff-Appellant / Petitioner |
| Counsel name      | Header counsel section                   | Name appearing against "for the Appellant"   |
| Grounds of appeal | Questions of law or grounds listed       | Numbered grounds/questions                   |
| Key arguments     | Body text — look for submission keywords | Paragraphs with legal contentions            |

#### What to Send to LLM

```json
{
  "clause_type": "appellant_argument_summary",
  "party_role": "Appellant",
  "counsel_name": "Romesh de Silva, PC",
  "counsel_title": "President's Counsel",
  "grounds": [
    "The learned Judge erred in rejecting the documentary evidence",
    "The judgment is against the weight of evidence"
  ]
}
```

#### Prompt to Send to LLM

```
Generate an appellant argument summary for a Sri Lankan Supreme Court judgment.

Party role: {party_role}
Counsel: {counsel_name} ({counsel_title})
Grounds of appeal: {grounds}

Use this format:
"Learned [Counsel/President's Counsel] for the {party_role} [submitted/contended/argued] that:

(1) [Argument based on ground 1]
(2) [Argument based on ground 2]
..."

Use formal judicial language. Each argument should be a complete sentence.
If grounds are not available, generate placeholder structure:
"Learned Counsel for the {party_role} submitted that [argument]."
```

#### Expected Output

```
Learned President's Counsel for the Appellant submitted that the learned
District Judge erred in rejecting the documentary evidence marked P1 to P5
which clearly established the Appellant's claim. It was further contended
that the judgment of the learned District Judge is against the weight of
evidence adduced at the trial.
```

---

### CLAUSE 10: Respondent Argument Summary

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 41.3% (327/792 files)  
**Position in Document:** 45-75% through document (follows appellant arguments)

#### Regex to Detect If MISSING

```regex
(?:(?:[Ll]earned\s+)?[Cc]ounsel\s+for\s+(?:the\s+)?(?:[Rr]espondent|[Dd]efendant)s?[\s,]+(?:submitted|contended|argued|urged|maintained|pointed\s+out|stated)|(?:the\s+)?(?:[Rr]espondent|[Dd]efendant)s?\s+(?:submitted|contended|argued|urged|maintained|averred|stated)|(?:it\s+was\s+)?(?:submitted|contended|argued|urged)\s+(?:by|on\s+behalf\s+of)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Rr]espondent|[Dd]efendant)|(?:the\s+)?(?:submission|contention|argument)s?\s+(?:of|made\s+by)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Rr]espondent|[Dd]efendant))
```

#### What to Extract from Document

| Extract This      | Where to Find It       | How                                         |
| ----------------- | ---------------------- | ------------------------------------------- |
| Respondent's role | Header                 | Respondent / Defendant-Respondent           |
| Counsel name      | Header counsel section | Name appearing against "for the Respondent" |
| Counter-arguments | Body text              | Arguments opposing appellant's position     |

#### What to Send to LLM

```json
{
  "clause_type": "respondent_argument_summary",
  "party_role": "Respondent",
  "counsel_name": "Sanjay Rajaratnam, PC",
  "appellant_arguments": [
    "Judge erred in rejecting evidence",
    "Judgment against weight of evidence"
  ]
}
```

#### Prompt to Send to LLM

```
Generate a respondent argument summary for a Sri Lankan Supreme Court judgment.

Party role: {party_role}
Counsel: {counsel_name}
Appellant's arguments to counter: {appellant_arguments}

Use this format:
"Learned Counsel for the {party_role} [submitted/contended/urged] that
[counter-argument responding to appellant's position].

It was further submitted on behalf of the {party_role} that [additional counter-argument]."

Generate counter-arguments that address each of the appellant's points.
If specific counter-arguments not available, use placeholder structure.
```

#### Expected Output

```
Learned Counsel for the Respondent submitted that the learned District
Judge correctly evaluated the evidence and that the findings of the
learned District Judge are supported by the evidence on record. It was
further urged that there is no basis for this Court to interfere with
the concurrent findings of fact of both the District Court and the
High Court.
```

---

### CLAUSE 11: Legal Framework Introduction

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 98.5% (780/792 files)  
**Position in Document:** 30-50% through document

#### Regex to Detect If MISSING

```regex
(?:(?:[Ss]ection|[Ss]\.)\s+\d+(?:\s*\([^)]*\))?\s+of\s+the|[Aa]rticle\s+\d+(?:\s*\([^)]*\))?\s+of\s+the|(?:the\s+)?(?:relevant|applicable|material|pertinent)\s+(?:legal\s+)?(?:section|provision|law|statute|enactment)|(?:provides?|reads?|states?|stipulates?|enacts?)\s+(?:as\s+follows|that|inter\s+alia)|[Ii]n\s+terms\s+of\s+(?:[Ss]ection|[Aa]rticle|the\s+|[Ss]\.)|(?:Civil|Criminal|Penal|Companies?)\s+(?:Procedure\s+)?(?:Code|Act|Ordinance)|(?:Evidence|Prescription|Limitation|Registration|Trust)\s+(?:Ordinance|Act)|(?:Ordinance|Act|Statute)\s+No\.?\s*\d+)
```

#### What to Extract from Document

| Extract This            | Where to Find It           | How                                    |
| ----------------------- | -------------------------- | -------------------------------------- | ------------------------------- |
| Statutes/Acts mentioned | Throughout body            | `(?:the\s+)?(\w+(?:\s+\w+)\*)\s+(?:Act | Ordinance)\s+(?:No\.?\s\*\d+)?` |
| Constitutional articles | Throughout body            | `Article\s+\d+(?:\(\d+\))?`            |
| Key legal issues        | Questions of law / grounds | What legal provisions are in dispute   |

#### What to Send to LLM

```json
{
  "clause_type": "legal_framework_introduction",
  "statutes": ["Evidence Ordinance", "Prescription Ordinance (Chapter 68)"],
  "articles": ["Article 12(1)", "Article 14(1)(g)"],
  "provisions": ["Section 101", "Section 3"],
  "legal_issue": "burden of proof in civil cases"
}
```

#### Prompt to Send to LLM

```
Generate a legal framework introduction for a Sri Lankan Supreme Court judgment.

Statutes involved: {statutes}
Constitutional articles: {articles}
Specific provisions: {provisions}
Legal issue: {legal_issue}

Use this format:
"The relevant legal provisions applicable to this case are as follows:

[Provision name] provides:

'[Quote text if available, otherwise describe the provision]'

[Brief explanation of relevance to the case]"

Use formal judicial language. Common opening phrases:
- "The relevant legal provisions are as follows:"
- "It is necessary to examine the statutory framework governing..."
- "The applicable law on this issue is well settled."
```

---

### CLAUSE 12: Issue Analysis Structure

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 90.2% (714/792 files)  
**Position in Document:** 20-40% through document

#### Regex to Detect If MISSING

```regex
(?:(?:the\s+)?(?:following\s+)?(?:issues?|questions?)\s+(?:that\s+)?(?:arise|for\s+(?:consideration|determination|decision|adjudication))|(?:the\s+)?(?:issues?|questions?\s+of\s+law)\s+(?:for|that\s+arise\s+for)\s+(?:determination|consideration)|[Gg]rounds?\s+of\s+appeal\s+(?:urged|are|raised|set\s+out)|(?:question|issue|point)\s+(?:is|to\s+be\s+(?:considered|decided|determined|answered))|(?:the\s+)?(?:main|principal|primary|central|key)\s+(?:question|issue|point)|[Ww]hether\s+(?:the|a|an|or\s+not)|(?:questions?\s+of\s+law)|(?:question|issue)\s+(?:No\.?\s*)?\d|(?:first|second|third|fourth|fifth|next)\s+(?:question|issue|point|ground|contention)|(?:I|[Ww]e)\s+(?:now\s+)?(?:turn|proceed|come)\s+to\s+(?:consider|examine|address|deal)|(?:it\s+is)\s+(?:necessary|important)\s+to\s+(?:consider|examine|determine))
```

#### What to Extract from Document

| Extract This      | Where to Find It              | How                                       |
| ----------------- | ----------------------------- | ----------------------------------------- |
| Questions of law  | After "leave granted" section | Numbered/lettered items                   |
| Grounds of appeal | Header or early body          | Listed grounds                            |
| Case type         | Header                        | FR/Appeal/Writ — determines framing style |

#### What to Send to LLM

```json
{
  "clause_type": "issue_analysis_structure",
  "case_type": "civil_appeal",
  "issues": [
    "Whether the learned trial Judge erred in rejecting testimony?",
    "Whether substantial miscarriage of justice occurred?"
  ],
  "numbering_style": "alphabetic"
}
```

#### Prompt to Send to LLM

```
Generate an issue/question analysis structure for a Sri Lankan Supreme Court judgment.

Case type: {case_type}
Issues/Questions: {issues}

Use this format:
"The following [issues arise for determination / questions of law arise] in this [appeal/application]:

({letter_or_number}) {issue_text}

Each of these [issues/questions] will be considered in turn."

Use formal judicial language. Number style: {numbering_style}
```

---

### CLAUSE 13: Preliminary Objection Handling

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 12.5% (99/792 files)  
**Position in Document:** 20-50% through document

#### Regex to Detect If MISSING

```regex
(?:[Pp]reliminary\s+objection[s]?\s+(?:raised|taken|urged)|raised\s+(?:a\s+)?preliminary\s+objection)
```

#### What to Extract from Document

| Extract This         | Where to Find It | How                                       |
| -------------------- | ---------------- | ----------------------------------------- |
| Who raised objection | Body text        | Look for party reference near "objection" |
| Nature of objection  | Body text        | Following sentence/paragraph              |
| Outcome              | Body text        | "upheld" / "overruled" / "rejected"       |

#### What to Send to LLM

```json
{
  "clause_type": "preliminary_objection",
  "raising_party": "Respondent",
  "objection_nature": "maintainability of the application",
  "outcome": "overruled"
}
```

#### Prompt to Send to LLM

```
Generate a preliminary objection handling section for a Sri Lankan judgment.

Raising party: {raising_party}
Nature of objection: {objection_nature}
Outcome: {outcome}

Format:
"At the outset, learned Counsel for the {raising_party} raised a
preliminary objection [regarding / on the ground that] {objection_nature}.

[Brief analysis]

This Court [upholds/overrules/dismisses] the preliminary objection
[for the following reasons: ...]"
```

---

### CLAUSE 14: Issues at Trial Block

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 4.8% (38/792 files)  
**Position in Document:** 20-35% through document

#### Regex to Detect If MISSING

```regex
(?:[Ii]ssues?\s+(?:framed|raised|recorded|were\s+raised)\s+(?:at|for)\s+(?:the\s+)?trial|the\s+following\s+issues|admissions?\s+(?:recorded|and)\s+\d+\s+issues?)
```

#### What to Extract from Document

| Extract This            | Where to Find It | How                                         |
| ----------------------- | ---------------- | ------------------------------------------- |
| Number of issues        | Body text        | Count references to issue numbers           |
| Issue text              | Body text        | Numbered items after "issues" keyword       |
| Who raised which issues | Body text        | "Plaintiff's issues" / "Defendant's issues" |

#### What to Send to LLM

```json
{
  "clause_type": "issues_at_trial",
  "admissions_count": 5,
  "plaintiff_issues": ["Whether the Plaintiff is entitled to the land?"],
  "defendant_issues": ["Whether the Defendant acquired prescriptive title?"]
}
```

#### Prompt to Send to LLM

```
Generate a trial issues block for a Sri Lankan judgment.

Number of admissions: {admissions_count}
Plaintiff's issues: {plaintiff_issues}
Defendant's issues: {defendant_issues}

Format:
"At the commencement of the trial, {admissions_count} admissions were
recorded and the following issues were raised:

Plaintiff's Issues:
(1) {issue}

Defendant's Issues:
(2) {issue}
..."
```

---

### CLAUSE 15: Burden of Proof Discussion

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 27.4% (217/792 files)  
**Position in Document:** 50-70% through document

#### Regex to Detect If MISSING

```regex
(?:[Bb]urden\s+of\s+proof|[Bb]eyond\s+(?:a\s+)?reasonable\s+doubt|balance\s+of\s+probabilities|prima\s+facie\s+(?:case|evidence))
```

#### What to Extract from Document

| Extract This               | Where to Find It | How                                                                      |
| -------------------------- | ---------------- | ------------------------------------------------------------------------ |
| Case type (criminal/civil) | Header / body    | Criminal → "beyond reasonable doubt"; Civil → "balance of probabilities" |
| Legal issue                | Questions of law | What needs to be proved                                                  |
| Which party bears burden   | Convention       | Plaintiff/Prosecution bears burden of proof                              |

#### What to Send to LLM

```json
{
  "clause_type": "burden_of_proof",
  "case_type": "civil",
  "standard": "balance of probabilities",
  "bearing_party": "Plaintiff",
  "legal_issue": "establishing title to the land"
}
```

#### Prompt to Send to LLM

```
Generate a burden of proof discussion for a Sri Lankan judgment.

Case type: {case_type}
Standard of proof: {standard}
Party bearing burden: {bearing_party}
Issue to prove: {legal_issue}

Format:
"The [standard] of proof applicable in {case_type} proceedings is the
{standard}. The burden of proving {legal_issue} lies with the {bearing_party}.

[If civil:] Section 101 of the Evidence Ordinance provides that whoever
desires any Court to give judgment as to any legal right must prove
that the facts establishing such right exist.

[If criminal:] The prosecution must prove the guilt of the accused
beyond a reasonable doubt. Any reasonable doubt must be resolved in
favour of the accused."
```

---

### CLAUSE 16: Hereinafter Reference

**Predictability:** ⚠️ PARTIAL  
**Verified Frequency:** 47.6% (377/792 files)  
**Position in Document:** 5-15% through document (early, when introducing parties)

#### Regex to Detect If MISSING

```regex
(?:hereinafter\s+(?:referred\s+to\s+as|sometimes\s+referred\s+to\s+as)|hereinafter\s+called)
```

#### What to Extract from Document

| Extract This           | Where to Find It | How                                              |
| ---------------------- | ---------------- | ------------------------------------------------ |
| Full party names       | Header           | Petitioner/Respondent names                      |
| Party roles            | Header           | Appellant/Respondent/Petitioner                  |
| Short names used later | Body text        | How parties are referred to in the judgment body |

#### What to Send to LLM

```json
{
  "clause_type": "hereinafter_reference",
  "parties": [
    {
      "full_name": "Indian Overseas Bank",
      "role": "Plaintiff-Respondent-Respondent",
      "short_name": "Bank"
    },
    {
      "full_name": "Vadivelu Anandasiva",
      "role": "Defendant-Appellant-Appellant",
      "short_name": "Appellant"
    }
  ]
}
```

#### Prompt to Send to LLM

```
Generate hereinafter party references for a Sri Lankan judgment.

Parties: {parties}

For each party, generate:
"[Full Name], the {role} (hereinafter referred to as the '[Short Name]')"

Common short names:
- Companies → use company short name or "the Bank", "the Company"
- Individuals → use "the Appellant", "the Respondent", "the Petitioner"
- Government bodies → use abbreviated name
```

#### Expected Output

```
The Indian Overseas Bank, the Plaintiff-Respondent-Respondent (hereinafter
referred to as the "Bank") instituted action against Vadivelu Anandasiva,
the Defendant-Appellant-Appellant (hereinafter referred to as the "Appellant").
```

---

### CLAUSE 17: Cost Order

**Predictability:** ✅ FULL  
**Verified Frequency:** 64.5% (511/792 files)  
**Position in Document:** Last 5% of document (after disposition, before signatures)

#### Regex to Detect If MISSING

```regex
(?:with(?:out)?\s+costs?|[Nn]o\s+costs?|costs?\s+(?:fixed|assessed)\s+at\s+Rs\.|no\s+order\s+(?:as\s+to|for|regarding|with\s+regard\s+to)\s+costs?|(?:I|we)\s+(?:make|do)\s+no[r]?\s+order.*?costs?|bear\s+(?:their\s+own|his|her|its)\s+(?:own\s+)?costs?|entitled\s+to\s+(?:the\s+)?costs?|costs?\s+(?:of|to)\s+(?:this|the)\s+(?:appeal|action|case|petition|application)|(?:pay|paid)\s+Rs\.?\s*[\d,/]+.*?(?:as\s+)?costs?|(?:punitive|nominal|taxed)\s+costs?|subject\s+to\s+costs?)
```

#### What to Extract from Document

| Extract This | Where to Find It | How                                                                 |
| ------------ | ---------------- | ------------------------------------------------------------------- |
| Case type    | Header           | Appeal / FR Application                                             |
| Outcome      | Disposition      | Allowed / Dismissed                                                 |
| Convention   | Common patterns  | Dismissed appeals often "without costs"; Allowed often "with costs" |

#### What to Send to LLM

```json
{
  "clause_type": "cost_order",
  "case_type": "civil_appeal",
  "outcome": "dismissed"
}
```

#### Prompt to Send to LLM

```
Generate a cost order for a Sri Lankan judgment.

Case type: {case_type}
Outcome: {outcome}

Common patterns:
- Appeal dismissed → "without costs" or "with costs"
- Appeal allowed → "with costs" or "costs fixed at Rs. [25,000/50,000/100,000]"
- FR Application dismissed → "No costs"
- FR Application allowed → "with costs fixed at Rs. [amount]"

Generate just the cost phrase to append to the disposition.
```

---

## IMPLEMENTATION REFERENCE

### Priority Order for Implementation

| Priority | Clause                         | Why First                                              |
| -------- | ------------------------------ | ------------------------------------------------------ |
| 1        | Judge Concurrence Block        | Easiest — pure formula, 97% frequency                  |
| 2        | Conclusion/Disposition Section | High value — 68.3% frequency, clear templates          |
| 3        | Disposition Formula            | Easy — 55.2% frequency, fixed phrases                  |
| 4        | Factual Background Label       | Trivial — just a section header                        |
| 5        | Cost Order                     | Easy — limited options, 64.5% frequency                |
| 6        | Procedural History             | High value — 93.8% frequency but needs more extraction |
| 7        | Leave to Appeal Statement      | Moderate — 51.1% frequency                             |
| 8        | Lower Court Findings           | Moderate — 58.6% frequency                             |
| 9        | Appellant Argument Summary     | Moderate — 53.9% frequency, partial prediction         |
| 10       | Question of Law Answers        | Moderate — 32.4% frequency                             |
| 11       | Respondent Argument Summary    | Moderate — 41.3% frequency                             |
| 12       | Legal Framework Introduction   | Complex — 98.5% frequency but needs statute extraction |
| 13       | Issue Analysis Structure       | Complex — 90.2% frequency but needs issue extraction   |
| 14       | Burden of Proof Discussion     | Moderate — 27.4% frequency, formulaic                  |
| 15       | Hereinafter Reference          | Easy — 47.6% frequency                                 |
| 16       | Preliminary Objection Handling | Low freq — 12.5%                                       |
| 17       | Issues at Trial Block          | Low freq — 4.8%                                        |

### Quick Regex Detection Summary

```python
PREDICTABLE_CLAUSE_DETECTION = {
    "judge_concurrence": r"I\s+agree[.,]?",
    "conclusion_section": r"(?:(?:^|\n)\s*(?:Conclusion|CONCLUSION|Determination|DETERMINATION)\s*:?\s*(?:\n|$)|[Ff]or\s+(?:the\s+)?(?:reasons|foregoing\s+reasons|all\s+(?:the\s+)?(?:above|aforesaid|foregoing)\s+reasons)\s+(?:set\s+(?:out|forth)\s+above|stated|mentioned|given|I|we)|[Ii]n\s+(?:the\s+(?:above\s+)?circumstances|these\s+circumstances|the\s+premises|the\s+result|the\s+upshot)|[Tt]aking\s+into\s+consideration|(?:I|[Ww]e)\s+(?:am|are)\s+of\s+the\s+(?:view|opinion)\s+that|(?:I|[Ww]e)\s+(?:hold|find|conclude)\s+that|(?:I|[Ww]e)\s+(?:accordingly|therefore|thus|hence)\s+(?:dismiss|allow|affirm|set\s+aside|uphold)|[Ii]n\s+(?:view|light)\s+of\s+(?:the\s+)?(?:above|aforesaid|foregoing)|(?:I|[Ww]e)\s+(?:see|find)\s+no\s+(?:merit|reason|ground|basis))",
    "disposition_formula": r"(?:[Aa]ppeal\s+(?:is\s+)?(?:allowed|dismissed|partly\s+allowed)|[Aa]pplication\s+(?:is\s+)?(?:allowed|dismissed|granted)|[Rr]ule\s+(?:is\s+)?made\s+absolute)",
    "procedural_history": r"(?:filed\s+(?:an?\s+)?(?:action|appeal|application|plaint|this\s+appeal)|instituted\s+(?:partition\s+)?action|[Tt]his\s+is\s+an\s+appeal|[Tt]his\s+appeal\s+arises|[Aa]ggrieved\s+by\s+the|[Bb]eing\s+aggrieved|preferred\s+this\s+appeal|[Ii]n\s+the\s+matter\s+of\s+an\s+(?:appeal|application)|appealed\s+to\s+(?:this\s+Court|the\s+High\s+Court|the\s+Court\s+of\s+Appeal)|(?:the\s+)?(?:above|instant|present)\s+(?:appeal|case|matter|action|petition|application)|(?:appeal|petition)\s+(?:against|from)\s+(?:the\s+)?(?:judgment|order|decree|decision)|(?:the\s+)?(?:brief|material|relevant|salient)\s+facts|(?:was|were)\s+(?:preferred|filed|lodged|instituted)\s+(?:before|in|to|with))",
    "leave_to_appeal": r"(?:[Ll]eave\s+to\s+[Aa]ppeal\s+(?:was|has\s+been)\s+granted|[Tt]his\s+[Cc]ourt\s+(?:has\s+)?granted\s+(?:special\s+)?[Ll]eave|[Ss]pecial\s+[Ll]eave\s+to\s+[Aa]ppeal|granted\s+[Ll]eave\s+(?:to\s+[Aa]ppeal\s+)?on\s+the|[Ll]eave\s+to\s+[Aa]ppeal\s+on\s+the\s+following)",
    "lower_court_findings": r"(?:(?:[Ll]earned\s+)?(?:Additional\s+)?(?:District|High\s+Court|Commercial\s+High\s+Court|Trial|Magistrate'?s?)\s+(?:Court\s+)?Judge[s]?\s+(?:held|found|concluded|observed|determined|decided|dismissed|allowed|granted|erred|ruled|was\s+of\s+the\s+(?:view|opinion))|(?:the\s+)?(?:High\s+Court|Court\s+of\s+Appeal|District\s+Court|Commercial\s+High\s+Court|Labour\s+Tribunal|Magistrate.s\s+Court)\s+(?:held|found|decided|dismissed|allowed|affirmed|set\s+aside|erred|upheld|ruled|observed|concluded|determined)|(?:the\s+)?(?:impugned|challenged|contested)\s+(?:judgment|order|decree|decision)|(?:the\s+)?(?:learned\s+)?(?:trial\s+)?[Jj]udge\s+(?:held|found|decided|concluded|observed|determined|dismissed|allowed|erred|ruled)|court\s+(?:of\s+first\s+instance|below|a\s+quo))",
    "question_of_law_answers": r"(?:[Qq]uestion\s+(?:of\s+[Ll]aw\s+)?(?:No\.?\s*)?[\(\[]?\d[\)\]]?\s*:?\s*(?:is\s+)?[Aa]nswered|[Aa]nswere?d?\s+in\s+the\s+(?:affirmative|negative)|I\s+(?:would\s+)?(?:therefore\s+)?answer\s+the\s+(?:above\s+)?question|answer\s+the\s+questions?\s+of\s+law)",
    "factual_background_label": r"(?:(?:^|\n)\s*(?:Factual\s+[Mm]atrix|Facts?\s+in\s+[Bb]rief|The\s+[Ff]actual\s+[Bb]ackground|Background\s+[Ff]acts?|The\s+[Ff]acts?\s+of\s+the\s+[Cc]ase|Introduction|Brief\s+[Ff]acts|The\s+[Ff]acts|Background|BACKGROUND|THE\s+FACTS|FACTUAL\s+MATRIX|FACTS\s+IN\s+BRIEF|INTRODUCTION|Brief\s+[Bb]ackground|The\s+[Bb]ackground|Factual\s+[Bb]ackground|Consideration\s+of\s+[Ff]acts?)\s*:?\s*\.?\s*(?:\n|$))",
    "appellant_argument": r"(?:(?:[Ll]earned\s+)?[Cc]ounsel\s+for\s+(?:the\s+)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)s?[\s,]+(?:submitted|contended|argued|urged|maintained|pointed\s+out|stated)|(?:the\s+)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)s?\s+(?:submitted|contended|argued|urged|maintained|averred|stated)|(?:it\s+was\s+)?(?:submitted|contended|argued|urged)\s+(?:by|on\s+behalf\s+of)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner)|(?:the\s+)?(?:submission|contention|argument)s?\s+(?:of|made\s+by)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Aa]ppellant|[Pp]laintiff|[Pp]etitioner))",
    "respondent_argument": r"(?:(?:[Ll]earned\s+)?[Cc]ounsel\s+for\s+(?:the\s+)?(?:[Rr]espondent|[Dd]efendant)s?[\s,]+(?:submitted|contended|argued|urged|maintained|pointed\s+out|stated)|(?:the\s+)?(?:[Rr]espondent|[Dd]efendant)s?\s+(?:submitted|contended|argued|urged|maintained|averred|stated)|(?:it\s+was\s+)?(?:submitted|contended|argued|urged)\s+(?:by|on\s+behalf\s+of)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Rr]espondent|[Dd]efendant)|(?:the\s+)?(?:submission|contention|argument)s?\s+(?:of|made\s+by)\s+(?:the\s+)?(?:learned\s+)?(?:counsel\s+for\s+(?:the\s+)?)?(?:[Rr]espondent|[Dd]efendant))",
    "legal_framework": r"(?:(?:[Ss]ection|[Ss]\.)\s+\d+(?:\s*\([^)]*\))?\s+of\s+the|[Aa]rticle\s+\d+(?:\s*\([^)]*\))?\s+of\s+the|(?:the\s+)?(?:relevant|applicable|material|pertinent)\s+(?:legal\s+)?(?:section|provision|law|statute|enactment)|(?:provides?|reads?|states?|stipulates?|enacts?)\s+(?:as\s+follows|that|inter\s+alia)|[Ii]n\s+terms\s+of\s+(?:[Ss]ection|[Aa]rticle|the\s+|[Ss]\.)|(?:Civil|Criminal|Penal|Companies?)\s+(?:Procedure\s+)?(?:Code|Act|Ordinance)|(?:Evidence|Prescription|Limitation|Registration|Trust)\s+(?:Ordinance|Act)|(?:Ordinance|Act|Statute)\s+No\.?\s*\d+)",
    "issue_analysis": r"(?:(?:the\s+)?(?:following\s+)?(?:issues?|questions?)\s+(?:that\s+)?(?:arise|for\s+(?:consideration|determination|decision|adjudication))|(?:the\s+)?(?:issues?|questions?\s+of\s+law)\s+(?:for|that\s+arise\s+for)\s+(?:determination|consideration)|[Gg]rounds?\s+of\s+appeal\s+(?:urged|are|raised|set\s+out)|(?:question|issue|point)\s+(?:is|to\s+be\s+(?:considered|decided|determined|answered))|(?:the\s+)?(?:main|principal|primary|central|key)\s+(?:question|issue|point)|[Ww]hether\s+(?:the|a|an|or\s+not)|(?:questions?\s+of\s+law)|(?:question|issue)\s+(?:No\.?\s*)?\d|(?:first|second|third|fourth|fifth|next)\s+(?:question|issue|point|ground|contention)|(?:I|[Ww]e)\s+(?:now\s+)?(?:turn|proceed|come)\s+to\s+(?:consider|examine|address|deal)|(?:it\s+is)\s+(?:necessary|important)\s+to\s+(?:consider|examine|determine))",
    "preliminary_objection": r"(?:[Pp]reliminary\s+objection[s]?\s+(?:raised|taken|urged)|raised\s+(?:a\s+)?preliminary\s+objection)",
    "issues_at_trial": r"(?:[Ii]ssues?\s+(?:framed|raised|recorded|were\s+raised)\s+(?:at|for)\s+(?:the\s+)?trial|the\s+following\s+issues|admissions?\s+(?:recorded|and)\s+\d+\s+issues?)",
    "burden_of_proof": r"(?:[Bb]urden\s+of\s+proof|[Bb]eyond\s+(?:a\s+)?reasonable\s+doubt|balance\s+of\s+probabilities|prima\s+facie\s+(?:case|evidence))",
    "hereinafter_reference": r"(?:hereinafter\s+(?:referred\s+to\s+as|sometimes\s+referred\s+to\s+as)|hereinafter\s+called)",
    "cost_order": r"(?:with(?:out)?\s+costs?|[Nn]o\s+costs?|costs?\s+(?:fixed|assessed)\s+at\s+Rs\.|no\s+order\s+(?:as\s+to|for|regarding|with\s+regard\s+to)\s+costs?|(?:I|we)\s+(?:make|do)\s+no[r]?\s+order.*?costs?|bear\s+(?:their\s+own|his|her|its)\s+(?:own\s+)?costs?|entitled\s+to\s+(?:the\s+)?costs?|costs?\s+(?:of|to)\s+(?:this|the)\s+(?:appeal|action|case|petition|application)|(?:pay|paid)\s+Rs\.?\s*[\d,/]+.*?(?:as\s+)?costs?|(?:punitive|nominal|taxed)\s+costs?|subject\s+to\s+costs?)",
}
```

### Context Extraction Functions (Python Skeleton)

```python
import re

def extract_judge_names(text):
    """Extract judge names from Before: section."""
    match = re.search(r'(?:BEFORE|Before|Coram)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:Counsel|Argued|Heard))', text)
    if match:
        names_block = match.group(1)
        return [line.strip() for line in names_block.strip().split('\n') if line.strip() and 'J' in line]
    return []

def extract_judgment_author(text):
    """Extract which judge wrote the judgment (first name after header ends)."""
    match = re.search(r'(?:Decided\s+on|Written\s+Submissions)[\s\S]*?\n\s*([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+)\s*,?\s*(?:PC\s*,?\s*)?J', text)
    if match:
        return match.group(0).strip()
    return None

def extract_case_numbers(text):
    """Extract all case numbers from header."""
    return re.findall(r'(?:SC|HC|DC|CA|WP|HCCA|CHC)[^,\n]*?(?:No\.?\s*)?[\d/]+', text[:2000])

def extract_party_names(text):
    """Extract plaintiff/appellant and respondent/defendant names."""
    parties = {}
    petitioner_match = re.search(r'(?:Petitioner|Appellant|Plaintiff)\s*\n\s*\n?\s*([A-Z][^\n]+)', text[:2000])
    respondent_match = re.search(r'(?:Respondent|Defendant)\s*\n\s*\n?\s*([A-Z][^\n]+)', text[:2000])
    if petitioner_match:
        parties['petitioner'] = petitioner_match.group(1).strip()
    if respondent_match:
        parties['respondent'] = respondent_match.group(1).strip()
    return parties

def extract_questions_of_law(text):
    """Extract numbered questions of law."""
    # Look for questions after "questions of law" keyword
    match = re.search(r'questions?\s+of\s+law[\s\S]*?(?=\n\s*\n\s*[A-Z])', text, re.IGNORECASE)
    if match:
        block = match.group(0)
        questions = re.findall(r'[\(\[]?\s*[a-z\d]+\s*[\)\]]?\s*\.?\s*(Whether[\s\S]*?)(?=[\(\[]?\s*[a-z\d]+\s*[\)\]]|$)', block)
        return [q.strip() for q in questions if q.strip()]
    return []

def extract_statutes_mentioned(text):
    """Extract Acts, Ordinances, and Articles mentioned."""
    acts = re.findall(r'(?:the\s+)?(\w+(?:\s+\w+)*)\s+(?:Act|Ordinance)(?:\s+No\.?\s*\d+)?', text)
    articles = re.findall(r'Article\s+(\d+(?:\(\d+\))?(?:\([a-z]\))?)', text)
    sections = re.findall(r'Section\s+(\d+(?:\(\d+\))?)', text)
    return {
        'acts': list(set(acts)),
        'articles': list(set(articles)),
        'sections': list(set(sections))
    }

def extract_case_type(text):
    """Determine case type from case number prefix."""
    if re.search(r'SC\s*[\(/]?\s*FR', text[:500]):
        return "fundamental_rights_application"
    elif re.search(r'SC\s+CHC|CHC\s+Appeal', text[:500]):
        return "commercial_high_court_appeal"
    elif re.search(r'SC\s+Appeal', text[:500]):
        return "civil_appeal"
    elif re.search(r'Criminal|Cr\.?\s*App', text[:500], re.IGNORECASE):
        return "criminal_appeal"
    return "civil_appeal"

def extract_outcome(text):
    """Extract appeal outcome from end of document."""
    last_section = text[-3000:]  # Last ~3000 chars
    if re.search(r'appeal\s+is\s+allowed', last_section, re.IGNORECASE):
        return "allowed"
    elif re.search(r'appeal\s+is\s+dismissed', last_section, re.IGNORECASE):
        return "dismissed"
    elif re.search(r'application\s+is\s+(?:allowed|granted)', last_section, re.IGNORECASE):
        return "allowed"
    elif re.search(r'application\s+is\s+dismissed', last_section, re.IGNORECASE):
        return "dismissed"
    return "unknown"

def extract_lower_court(text):
    """Extract lower court name from case numbers."""
    if re.search(r'District\s+Court', text[:2000]):
        match = re.search(r'District\s+Court\s+of\s+(\w+)', text[:2000])
        return match.group(0) if match else "District Court"
    if re.search(r'High\s+Court', text[:2000]):
        return "High Court"
    return "lower court"
```

---

## IMPORTANT NOTES

### What These Clauses Are NOT

These 17 clauses are **NOT replacements for factual content**. They are:

- **Structural elements** (section headers, transition phrases)
- **Formulaic legal language** (burden of proof templates, concurrence blocks)
- **Procedural templates** (how appeals traveled through courts)

The LLM is **NOT generating new facts**. It is generating the **structural scaffolding** that connects the facts a judge has already written.

### When NOT to Offer AI Suggestion

Do NOT offer AI suggestion for these clause types (from your 28):

- CaseNumber, CaseYear (unique identifiers)
- JudgeNames, JudgeSignature (factual - who was on the bench)
- Petitioner, Respondent, Plaintiff, Defendant (names)
- PlaintiffAddress, DefendantAddress (facts)
- CounselForAppellant, CounselForRespondent (facts)
- ArguedOn, DecidedOn (dates)
- ClaimAmount (fact-specific monetary amount)
- LowerCourtNumber (unique identifier)

### Accuracy Expectations

| Clause                   | Expected Accuracy | Notes                                   |
| ------------------------ | ----------------- | --------------------------------------- |
| Judge Concurrence        | 99%+              | Near-perfect — pure formula             |
| Factual Background Label | 95%+              | Just a section heading                  |
| Cost Order               | 90%+              | Limited options                         |
| Disposition Formula      | 90%+              | Standard phrases                        |
| Conclusion Section       | 85%+              | Template-based                          |
| Procedural History       | 75-85%            | Depends on context extraction quality   |
| Leave to Appeal          | 75-85%            | Depends on available data               |
| Lower Court Findings     | 70-80%            | Needs court details                     |
| Argument Summaries       | 60-70%            | Structure accurate, content approximate |
| Legal Framework          | 60-70%            | Depends on statute extraction           |
| Issue Analysis           | 60-70%            | Depends on issue extraction             |
| Burden of Proof          | 80%+              | Formulaic                               |
| Question Answers         | 65-75%            | Needs analysis direction                |
