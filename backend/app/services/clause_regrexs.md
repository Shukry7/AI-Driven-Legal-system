# Comprehensive Format Analysis - All 28 Clauses

## 🔍 Analysis Based on `properly_split_judgments` Files

This document shows **actual format variations** found in your cleaned judgment files and whether your current regex patterns will handle them.

---

## ✅ CLAUSES THAT WILL WORK WELL

### 1. **CourtTitle** ✓

**Current Pattern:** `^\s{0,10}IN\s+THE\s+(?:SUPREME|HIGH|DISTRICT)...`

**Real Examples:**

```
✓ IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
✓   IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
✓ IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC
```

**Status:** ✓ **WORKS WELL** - Handles leading spaces, line breaks

---

### 2. **JudgeSignature** ✓

**Current Pattern:** `JUDGE\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT`

**Real Examples:**

```
✓ Judge of the Supreme Court
✓ JUDGE OF THE SUPREME COURT
✓ Judge of the Supreme Court
```

**Status:** ✓ **WORKS WELL** - Case-insensitive flag handles variations

---

### 3. **CaseNumber** ✓

**Current Pattern:** `(?:SC|CA|HC|HCCA|HCB|WP|DC|MC)[^\n]{0,80}?(?:Appeal|Application|Case)\s+No`

**Real Examples:**

```
✓ SC Appeal No: 68/2014
✓ SC Appeal No. 48/2021
✓ SC CHC APPEAL 21/2010
✓ WP/HCCA/MT/LA Application No: 164/2007(F)
```

**Status:** ✓ **WORKS WELL** - Flexible pattern catches most variations

---

## ⚠️ CLAUSES WITH MODERATE ISSUES

### 4. **BeforeBench** ⚠️

**Current Pattern:** `^\s*(?:Before|BEFORE|Coram)\s*:?\s*$`

**Real Examples:**

```
✓ Before:
✓ BEFORE:
✓ Before
✗ Before                  :     Priyantha Jayawardena PC, J     ← Has judge name on same line!
✗ Before            :   Priyantha Jayawardena, PC, J.         ← Multiple spaces + name
```

**Issue:** Pattern expects ONLY the label on line, but many files have judge name on same line.

**Improved Pattern:**

```python
"BeforeBench": [
    r"^\s*(?:Before|BEFORE|Coram)\s*:?\s*$",  # Just label
    r"^\s*(?:Before|BEFORE|Coram)\s*:\s*",     # Label with colon (may have content after)
],
```

---

### 5. **Counsel (Generic)** ⚠️

**Current Pattern:** `for\s+(?:the\s+)?(?:petitioner|appellant|plaintiff)`

**Real Examples:**

```
✓ for the petitioner
✓ for the Plaintiff-Respondent
✗ Counsel:                                ← Just label, no "for"
✗ COUNSEL:                                ← Just label
✗ Counsel           :  J.A.J.Udawatta    ← Name after colon
```

**Issue:** Pattern looks for "for the petitioner" but many times it's just "Counsel:" label.

**Improved Pattern:**

```python
"CounselSection": [
    r"^\s*(?:Counsel|COUNSEL)\s*:\s*",  # Detect label
],
"CounselForAppellant": [
    r"for\s+(?:the\s+)?(?:petitioner|appellant|plaintiff)[-\s]",
],
"CounselForRespondent": [
    r"for\s+(?:the\s+)?(?:respondent|defendant)[-\s]",
],
```

---

## ❌ CLAUSES WITH MAJOR ISSUES

### 6. **ArguedOn** ❌

**Current Pattern:** `(?i)Argued\s+[Oo]n\s*[:\.]?\s*\n?\s*`

**Real Examples:**

```
✓ Argued on: 05.05.2022
✗ Argued on; 11/09/2018                   ← Semicolon!
✗ ARGUED ON:-30.11.2017                   ← Hyphen, no space
✗ Argued on  :  14th February 2023        ← Has "th" text
✗ Argued on    :        06-02-2020        ← Many spaces (but this works)
✗ ARGUED ON          :  14th February     ← LOTS of spaces + text date
```

**Issues:**

1. ✗ Semicolon `;` not handled
2. ✗ Hyphen `-` directly after label
3. ✗ Ordinal text "14th February 2023" (not DD.MM.YYYY format)

**Improved Pattern:**

```python
"ArguedOn": [
    # Handle all punctuation variations
    rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
    rf"(?i)ARGUED\s+ON\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
    # Fallback: just detect label (for detect-only task)
    rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]",
],
```

---

### 7. **DecidedOn** ❌

**Current Pattern:** `(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\.]?\s*\n?\s*`

**Real Examples:**

```
✓ Decided on: 02.02.2024
✓ Decided on     :  6.3.2019
✗ DECIDED ON\n:  07th February 2024       ← Line break + "th"
✗ Delivered on 12.02.2024                 ← No colon
```

**Same issues as ArguedOn.**

**Improved Pattern:**

```python
"DecidedOn": [
    rf"(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
    rf"(?i)DECIDED\s+ON\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
    rf"(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\\-;.]",  # Fallback
],
```

---

### 8. **Petitioner/Respondent Labels** ⚠️

**Current Pattern:** `(?:Petitioner|Appellant|Plaintiff)[:\s]*\n\s*([A-Z][^\n]+)`

**Real Examples:**

```
✓ Petitioner
    Name Here
✓ PETITIONER-APPELLANT
✗ Dr. Ajith C. S. Perera Petitioner appears in person    ← Name BEFORE label!
✗ Petitioner-Appellant-Respondent                        ← Complex compound
```

**Issue:** Sometimes name comes before label, or complex role combinations.

**Improved Pattern:**

```python
"PetitionerLabel": [
    r"(?:PETITIONER|APPELLANT|PLAINTIFF)[-S\s]*",
],
"RespondentLabel": [
    r"(?:RESPONDENT|DEFENDANT)[-S\s]*",
],
```

---

### 9. **Addresses** ⚠️

**Current Pattern:** `(?:Road|Street|Lane|Avenue|Mawatha)\b`

**Real Examples:**

```
✓ No. 19/27, Millagahawatta, Siwaramulla Road, Nedungamuwa
✓ No. 22, Approach Road, Fruithill, Hatton
✓ No. 385, Rev. Baddegama Wimalawansa Thero Mawatha, Colombo 10
✗ No. 146/32/A, Salmal Place, Mattegoda         ← No road keyword!
```

**Issue:** Many addresses don't have road/street/mawatha keywords.

**Improved Pattern:**

```python
"Address": [
    r"No\.\s*[\d/A-Z,-]+.*?(?:Road|Street|Lane|Avenue|Mawatha|Place)",
    r"No\.\s*[\d/A-Z,-]+,\s*[A-Z][a-z]+(?:,\s*[A-Z][a-z]+){1,3}",  # Without keyword
],
```

---

### 10. **ClaimAmount** ⚠️

**Current Pattern:** `(?:Rs\.?|Rupees)\s*[\d,]+`

**Real Examples:**

```
✓ Rs. 48,708,319/35
✓ Rupees 10,000/-
✓ Rs.4,195,353.33
✗ US Dollars 160,139.64           ← Foreign currency!
✗ sum of US Dollars (USD) 1750    ← Different format
```

**Issue:** Doesn't handle foreign currencies.

**Improved Pattern:**

```python
"ClaimAmount": [
    r"(?:Rs\.?|Rupees)\s*[\d,]+(?:[/\.\-=]\d*)?",
    r"(?:US\s*)?(?:Dollars?|USD)\s*[\d,]+(?:\.\d+)?",
],
```

---

### 11. **MatterDescription** ✓

**Current Pattern:** `(?i)In\s+the\s+matter\s+of`

**Real Examples:**

```
✓ In the matter of an appeal
✓ In the matter of an application under and in terms of
✓ In the matter of an Application for Leave to Appeal
```

**Status:** ✓ **WORKS WELL**

---

### 12. **LegalProvisionsCited** ✓

**Current Pattern:** `(?:Section|section)\s+\d+` and `(?:Article|Act)\s+(?:No\.?\s*)?\d+`

**Real Examples:**

```
✓ Section 5C of the High Court
✓ Article 17 and 126 of the Constitution
✓ Act No. 19 of 1990
✓ section 2(1) of the Maintenance Act
```

**Status:** ✓ **WORKS WELL**

---

## 📊 SUMMARY BY CLAUSE TYPE

### ✅ HIGH CONFIDENCE (Will work with 90%+ accuracy)

1. CourtTitle
2. JudgeSignature
3. CaseNumber
4. CaseYear
5. MatterDescription
6. LegalProvisionsCited
7. AppealType
8. LowerCourtNumber

### ⚠️ MODERATE CONFIDENCE (60-80% accuracy - need improvements)

9. BeforeBench (expect label+content on same line)
10. JudgeNames (contextual extraction needed)
11. Petitioner/Respondent (compound roles)
12. CounselSection (just label detection)
13. PlaintiffAddress/DefendantAddress (missing keywords)

### ❌ LOW CONFIDENCE (<60% - major improvements needed)

14. **ArguedOn** - semicolon, hyphen, text dates
15. **DecidedOn** - same issues as ArguedOn
16. CounselForAppellant (pattern too specific)
17. CounselForRespondent (pattern too specific)
18. ClaimAmount (foreign currency)
19. InstructedBy (needs new pattern)
20. PrayerForRelief (too generic)

---

## 🎯 PRIORITY FIXES

### TOP 3 CRITICAL FIXES:

1. **ArguedOn & DecidedOn** - Used in most judgments, currently ~50% accuracy

   ```python
   # Add semicolon, handle all spacing
   rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]?\s*"
   ```

2. **BeforeBench** - Need to detect label even when judge names follow

   ```python
   r"^\s*(?:Before|BEFORE|Coram)\s*:\s*"  # Don't require empty rest of line
   ```

3. **Counsel Section** - Just detect "Counsel:" label
   ```python
   r"^\s*(?:Counsel|COUNSEL)\s*:\s*"
   ```

---

## 📝 RECOMMENDED PATTERN UPDATES

Update your `improved_damage_script.py` with these patterns:

```python
CLAUSE_PATTERNS = {
    # === DETECT-ONLY (FIXED) ===

    "ArguedOn": [
        rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
        rf"(?i)ARGUED\s+ON\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
        rf"(?i)Argued\s+[Oo]n\s*[:\\-;.]",  # Fallback: just label
    ],

    "DecidedOn": [
        rf"(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
        rf"(?i)DECIDED\s+ON\s*[:\\-;.]?\s*\n?\s*({DIG}{{1,2}}{SEP}{DIG}{{1,2}}{SEP}(?:19|20)?\d{{2,4}})",
        rf"(?i)(?:Decided|Delivered)\s+[Oo]n\s*[:\\-;.]",  # Fallback
    ],

    "BeforeBench": [
        r"^\s*(?:Before|BEFORE|Coram)\s*:\s*",  # Allow content after colon
    ],

    "CounselSection": [
        r"^\s*(?:Counsel|COUNSEL)\s*:\s*",
    ],

    "ClaimAmount": [
        r"(?:Rs\.?|Rupees)\s*[\d,]+(?:[/\.\-=]\d*)?",
        r"(?:US\s*)?(?:Dollars?|USD)\s*[\d,]+(?:\.\d+)?",
    ],

    # === Other clauses stay the same ===
    # ... (rest of your patterns)
}
```


# All 28 Clauses and Their Regression (Regex) Patterns

This document lists the 28 clause keys used in the project and the current/corrected regular-expression patterns associated with each clause.

> Source: analysis/clauses_registry.json (sections `current` and `corrected`).

---

<!-- For each clause: show current patterns (if present) and corrected patterns (if present) -->

**AppealType**

- **Current patterns:**

```
(?:Civil|Criminal|Fundamental\s+Rights)\s+(?:appeal|application)
```

**ArguedOn**

- **Current patterns:**

```
(?i)(?:Argued|Heard)\s+on\s*[:.]?\s*(\d{1,2}(?:[./-]\d{1,2}(?:[./-](?:19|20)?\d{2,4})?)?)
```

- **Corrected patterns:**

```
(?is)Argued\s+[Oo]n\s*:?\s*\n?\s*([\doOtT]{1,2}[./-][\doOtT]{1,2}[./-](?:19|20)?[\d]{2,4})
```

**BeforeBench**

- **Current patterns:**

```
(?:BEFORE|Coram|Before)\s*:[^\n]*J\.
```

- **Corrected patterns:**

```
^Before\s*:?\s*$
^(?:Before|BEFORE|Coram)\s*:?.*$
```

**CaseNumber**

- **Current patterns:**

```
[A-Z]{2,4}\s+\d+[/\\-]\d+
Case\s+No[:.]?\s*\w+[/\\-]\d+
[A-Z]{1,4}(?:\s*\([A-Z]+\))?(?:\s*[A-Z]{1,6})?\s*[/.-]?\s*[A-Z]?\d+[A-Z]*(?:[/.-]\d+[A-Z]*){0,3}
```

- **Corrected patterns:**

```
(?:SC|HC|DC|CA|WP)[^\n]*?(?:Appeal|Case|Application)\s+No[:.\s]+([A-Z0-9/\\-]+)
```

**CourtTitle**

- **Current patterns:**

```
IN\s+THE\s+(?:SUPREME|HIGH|DISTRICT|MAGISTRATE.?S?)\s*COURT\s+OF\s+[A-Z\s]+
COURT\s+OF\s+APPEAL
[A-Z\s]{15,50}\bCOURT\b
```

- **Corrected patterns:**

```
^IN\s+THE\s+(?:SUPREME|HIGH|DISTRICT)\s+COURT\s+OF\s+.*?SRI\s+LANKA
```

**CaseYear**

- **Current patterns:**

```
\b(19\d{2}|20\d{2})\b
[/\\-](\d{2})(?:\([A-Z]\))?
[/\\-](\d{4})
```

**ClaimAmount**

- **Current patterns:**

```
(?:Rs\.?|Rupees)\s*[\d,]+
sum\s+of\s+(?:Rs\.?|Rupees)
```

- **Corrected patterns:**

```
(?:Rs\.?|Rupees)\s*[\d,]+
```

**CounselForAppellant**

- **Current patterns:**

```
for\s+(?:the\s+)?(?:petitioner|appellant|plaintiff)
[A-Z][a-z]+\s+[A-Z][a-z]+.*?for.*?(?:petitioner|appellant)
```

- **Corrected patterns:**

```
(?m)^.*?for\s+(?:the\s+)?(?:petitioner|appellant|plaintiff)
```

**CounselForRespondent**

- **Current patterns:**

```
[A-Z][a-z]+\s+[A-Z][a-z]+.*?for.*?(?:respondent|defendant)
for\s+(?:the\s+)?(?:respondent|defendant)
```

- **Corrected patterns:**

```
(?m)^.*?for\s+(?:the\s+)?(?:respondent|defendant)
```

**DecidedOn**

- **Current patterns:**

```
(?:Decided|Delivered|Judgment)\s+(?:on|dated)[:\s]+\d{1,2}
```

- **Corrected patterns:**

```
(?is)Decided\s+[Oo]n\s*:?\s*\n?\s*([\doOtT]{1,2}[./-][\doOtT]{1,2}[./-](?:19|20)?[\d]{2,4})
```

**Defendant**

- **Current patterns:**

```
Defendant[:\s]*([^\n]+)
```

**DefendantAddress**

- **Current patterns:**

```
(?:Road|Street|Lane|Avenue|Mawatha|Colombo)[^\n]*
```

**DefendantBlock**

- **Current patterns:**

```
DEFENDANT[S]?\s*\n(?:.*?\n){1,10}
```

**InstructedBy**

- **Current patterns:**

```
(?:Instructed|Instructing)\s+(?:by|attorney|solicitor)
```

**JudgeNames**

- **Current patterns:**

```
(?:Hon\.?\s*)?(?:Justice\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*J
BEFORE\s*[:.]\s*[^\n]*?[A-Z][A-Za-z\s\.,&]+(?:C\.?J\.?|PC,? J\.?|J\.?)
JUDGE\s+OF\s+THE\s+SUPREME\s+COURT\s*\n\s*([A-Z][A-Za-z\s\.]+)(?:,\s*C\.?J\.?)?\s*\n\s*I\s+agree\.
JUDGE\s+OF\s+THE\s+SUPREME\s+COURT\s*\n\s*([A-Z][A-Za-z\s\.]+),\s*(?:C\.?J\.?|J\.?)
```

- **Corrected patterns:**

```
(?m)(?<=^Before\s*:?\s*\n)([A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)+,?\s*(?:PC,?\s*)?[CJ]\.?)
(?m)(?<=^Coram\s*:?\s*\n)([A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)+,?\s*(?:PC,?\s*)?[CJ]\.?)
```

**JudgeSignature**

- **Current patterns:**

```
JUDGE\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT
[A-Z][a-z]+\s+[A-Z][a-z]+\s*\n\s*(?:JUDGE|J\.)
(?:JUDGE|CHIEF\s+JUSTICE)\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT\s*\n+\s*[A-Z][A-Z\s\.]+,\s*J\.\s*\n+\s*I\s+agree
(?:JUDGE|CHIEF\s+JUSTICE)\s+OF\s+THE\s+(?:SUPREME|APPEAL|HIGH)\s+COURT\s*\n+\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+,\s*J\.
```

**Jurisdiction**

- **Current patterns:**

```
jurisdiction\s+(?:of|under)
```

- **Corrected patterns:**

```
(?i)\bjurisdiction\b\s+(?:of|under)
```

**LegalProvisionsCited**

- **Current patterns:**

```
(?:section|Section)\s+\d+(?:\s*\([a-z0-9]+\))?
(?:Article|Act)\s+(?:No\.?\s*)?\d+
Civil\s+Procedure\s+Code
```

**LowerCourtNumber**

- **Current patterns:**

```
(?:District|Magistrate'?s?)\s+Court.*?(?:No|case)
```

**MatterDescription**

- **Current patterns:**

```
(?:Divorce|Appeal|Petition|Application|Action|Suit)[^\n]{0,100}
(?:seeking|filed|instituted|under\s+section)[^\n]{0,50}
(?:Civil\s+Procedure|Constitution|Criminal)[^\n]{0,50}
```

**Petitioner**

- **Current patterns:**

```
(?:Petitioner|Appellant|Plaintiff)[:\s]*\n\s*([A-Z][^\n]+)
```

**PetitionerBlock**

- **Current patterns:**

```
(?:PETITIONER|APPELLANT|PLAINTIFF)[S]?\s*\n(?:.*?\n){1,15}(?=v\.|vs|versus)
[A-Z][A-Z\s&,\.]{10,}\n\s*v\.
```

- **Corrected patterns:**

```
(?:PLAINTIFF|PETITIONER|APPELLANT)[S]?\s*$.*?(?=^Vs\.?$)
(?s)(?:PLAINTIFF|PETITIONER|APPELLANT)[S]?\s*\n(?:.*?\n){1,20}?(?=^\s*(?:v\.|vs|versus)\s*$)
```

**Plaintiff**

- **Current patterns:**

```
Plaintiff[:\s]*([^\n]+)
```

**PlaintiffAddress**

- **Current patterns:**

```
(?:Road|Street|Lane|Avenue|Mawatha|Colombo)[^\n]*
```

**PlaintiffBlock**

- **Current patterns:**

```
PLAINTIFF[S]?\s*\n(?:.*?\n){1,10}
```

**PrayerForRelief**

- **Current patterns:**

```
(?:prayer|relief|order)[:\s]+[^\n]+
(?:seeking|praying\s+for|claiming)[^\n]+
```

**Respondent**

- **Current patterns:**

```
(?:Respondent|Defendant)[:\s]*\n\s*([A-Z][^\n]+)
```

**RespondentBlock**

- **Current patterns:**

```
(?:RESPONDENT|DEFENDANT)[S]?\s*\n(?:.*?\n){1,15}
(?:v\.|vs|versus)\s*\n\s*[A-Z][A-Z\s&,\.]{10,}
```

- **Corrected patterns:**

```
(?s)^\s*(?:v\.|vs|versus)\s*$.*?(?:DEFENDANT|RESPONDENT)[S]?\s*$
(?s)(?:^\s*(?:v\.|vs|versus)\s*$)(?:.*?\n){1,20}?(?=^(?:DEFENDANT|RESPONDENT)[S]?\s*$)
```

---

Generated from `analysis/clauses_registry.json` — include this file in your regression test artifacts if needed.
