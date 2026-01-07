// Supreme Court Judgment Mock Data - Believers Church case
export const supremeCourtMissingClauses = [
  {
    id: 1,
    name: 'Argument Date',
    severity: 'high' as const,
    description: 'Date when the case was argued is missing',
    expectedLocation: 'After Counsel section',
    suggestion: 'Specify the date when oral arguments were presented',
    predictedText: '',
    isPredictable: false,
    placeholderText: '[Enter Argument Date]',
    inputType: 'date' as const,
    userInputValue: ''
  },
  {
    id: 2,
    name: 'Decision Date',
    severity: 'high' as const,
    description: 'Date of judgment is missing',
    expectedLocation: 'After Argued on',
    suggestion: 'Specify the date when the judgment was delivered',
    predictedText: '',
    isPredictable: false,
    placeholderText: '[Enter Decision Date]',
    inputType: 'date' as const,
    userInputValue: ''
  },
  {
    id: 3,
    name: "Judge's Opening Statement",
    severity: 'medium' as const,
    description: 'Standard judicial introduction clause missing',
    expectedLocation: 'Before main judgment',
    suggestion: 'Should include formal opening statement contextualizing the case',
    predictedText: 'This Court has carefully considered the submissions of the learned Counsel for both parties, examined the record of proceedings, and reviewed the relevant statutory provisions and precedents. The following judgment sets forth our findings and conclusions on the matters in dispute.',
    confidence: 0.89,
    jurisdiction: 'Sri Lanka',
    rationale: 'Supreme Court judgments typically include a formal opening statement before the substantive analysis.',
    alternatives: [
      'Having heard the learned Counsel for the parties and upon consideration of the documents on record, this Court proceeds to deliver its judgment on the application for leave to appeal.',
      'This application came before us for determination. After hearing submissions and examining the materials on record, we deliver the following judgment.'
    ],
    isPredictable: true,
    userInputValue: ''
  },
  {
    id: 4,
    name: 'Procedural History Clause',
    severity: 'medium' as const,
    description: 'Detailed procedural history section is incomplete',
    expectedLocation: 'After case facts',
    suggestion: 'Should provide comprehensive timeline of all previous proceedings',
    predictedText: 'The procedural history of this matter is as follows: The action was instituted in the District Court of Nawalapitiya seeking declaration of title and eviction. The matter proceeded through preliminary stages until 24.09.2020 when it was called for further trial. Following the dismissal due to non-appearance, the Petitioner filed an application under Section 87(3) of the Civil Procedure Code, which was refused by order dated 16.12.2021. The subsequent leave to appeal application was filed in the Civil Appellate High Court on 03.01.2022 and dismissed on 17.03.2023.',
    confidence: 0.85,
    jurisdiction: 'Sri Lanka',
    rationale: 'Court judgments require a clear procedural timeline for appellate review and legal precedent purposes.',
    alternatives: [
      'This case has traversed through multiple stages of adjudication: initial filing in District Court, dismissal on 24.09.2020, Section 87(3) application dismissed on 16.12.2021, and subsequent dismissal by the Civil Appellate High Court on 17.03.2023.',
      'The matter originated in the District Court, was dismissed for non-appearance, followed by an unsuccessful Section 87(3) application, and a leave to appeal application dismissed by the Civil Appellate High Court.'
    ],
    isPredictable: true,
    userInputValue: ''
  },
  {
    id: 5,
    name: 'Legal Framework Section',
    severity: 'low' as const,
    description: 'Overview of applicable statutory provisions is abbreviated',
    expectedLocation: 'Before legal analysis',
    suggestion: 'Should provide comprehensive outline of relevant legal provisions',
    predictedText: 'The legal framework governing this matter is primarily found in the Civil Procedure Code, specifically Sections 87(3) and 88(2). Section 87(3) provides the mechanism for setting aside default judgments, while Section 88(2) prescribes the appeal procedure from orders made under Section 87(3). The High Court of the Provinces (Special Provisions) Act No.19 of 1990 as amended by Act No. 54 of 2006 provides the appellate jurisdiction. Recent amendments by Act No. 5 of 2022 and Act No. 17 of 2022 have modified these procedures.',
    confidence: 0.91,
    jurisdiction: 'Sri Lanka',
    rationale: 'Comprehensive legal framework sections enhance clarity and serve as reference for future cases.',
    alternatives: [
      'The applicable statutory provisions include: (1) Civil Procedure Code Sections 87(3) and 88(2); (2) High Court Act as amended; (3) Recent amendments by Acts 5/2022 and 17/2022.',
      'This matter is governed by provisions of the Civil Procedure Code concerning default judgments and appeals, as amended by recent legislation.'
    ],
    isPredictable: true,
    userInputValue: ''
  },
  {
    id: 6,
    name: 'Judge Signature',
    severity: 'high' as const,
    description: 'Primary judge signature is missing',
    expectedLocation: 'End of judgment',
    suggestion: 'Requires signature of Justice Janak De Silva',
    predictedText: '',
    isPredictable: false,
    placeholderText: '[Judge Signature Required]',
    inputType: 'signature' as const,
    userInputValue: ''
  },
  {
    id: 7,
    name: 'Second Judge Signature',
    severity: 'high' as const,
    description: 'Concurring judge signature is missing',
    expectedLocation: 'After Vijith K. Malalgoda agreement',
    suggestion: 'Requires signature of Justice Vijith K. Malalgoda',
    predictedText: '',
    isPredictable: false,
    placeholderText: '[Second Judge Signature Required]',
    inputType: 'signature' as const,
    userInputValue: ''
  },
  {
    id: 8,
    name: 'Third Judge Signature',
    severity: 'high' as const,
    description: 'Third concurring judge signature is missing',
    expectedLocation: 'After A. L. Shiran Gooneratne agreement',
    suggestion: 'Requires signature of Justice A. L. Shiran Gooneratne',
    predictedText: '',
    isPredictable: false,
    placeholderText: '[Third Judge Signature Required]',
    inputType: 'signature' as const,
    userInputValue: ''
  },
  {
    id: 9,
    name: 'Signature Date',
    severity: 'high' as const,
    description: 'Date of signature is missing',
    expectedLocation: 'After primary judge signature',
    suggestion: 'Date when the judgment was signed',
    predictedText: '',
    isPredictable: false,
    placeholderText: '[Enter Signature Date]',
    inputType: 'date' as const,
    userInputValue: ''
  }
];
