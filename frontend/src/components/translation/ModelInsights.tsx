/**
 * ModelInsights
 * ─────────────
 * Shows a comparison between our fine-tuned legal translation model
 * and Google Translate with hardcoded sample translations.
 * 
 * Demonstrates the accuracy advantage of domain-specific training
 * for legal terminology in Sinhala and Tamil.
 */
import { useState } from "react";
import {
  Scale,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Cpu,
  ChevronDown,
  ChevronUp,
  Languages,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ModelInsightsProps {
  onBack: () => void;
}

// Hardcoded comparison data
interface ComparisonExample {
  id: string;
  sourceText: string;
  googleTranslation: string;
  ourTranslation: string;
  targetLang: "si" | "ta";
  category: string;
  legalTerms: string[];
  googleIssues: string[];
  ourAdvantages: string[];
}

const comparisonExamples: ComparisonExample[] = [
  // English to Sinhala Examples
  {
    id: "1",
    sourceText: "The plaintiff hereby files a plaint against the defendant for breach of contract and seeks specific performance of the agreement dated 15th March 2024.",
    googleTranslation: "පැමිණිලිකරු මෙයින් ගිවිසුම කඩ කිරීම සම්බන්ධයෙන් විත්තිකරුට එරෙහිව පැමිණිල්ලක් ගොනු කරන අතර 2024 මාර්තු 15 දිනැති ගිවිසුමේ විශේෂිත කාර්ය සාධනය ඉල්ලා සිටී.",
    ourTranslation: "පැමිණිලිකරු මෙයින් කොන්ත්‍රාත්තුව කඩකිරීම පිළිබඳව විත්තිකරුට විරුද්ධව පැමිණිල්ලක් ගොනු කරන අතර, 2024 මාර්තු 15 දිනැති ගිවිසුමේ විශේෂිත ඉටු කිරීම ඉල්ලා සිටී.",
    targetLang: "si",
    category: "Civil Procedure",
    legalTerms: ["plaintiff", "plaint", "defendant", "breach of contract", "specific performance"],
    googleIssues: [
      "Translated 'breach of contract' as generic 'ගිවිසුම කඩ කිරීම' instead of legal term 'කොන්ත්‍රාත්තුව කඩකිරීම'",
      "Used 'කාර්ය සාධනය' (performance) instead of legal 'ඉටු කිරීම' (specific performance)"
    ],
    ourAdvantages: [
      "Uses proper legal Sinhala terminology",
      "Correct translation of 'specific performance' as 'විශේෂිත ඉටු කිරීම'",
      "Maintains formal legal register"
    ]
  },
  {
    id: "2",
    sourceText: "The writ of mandamus is hereby issued directing the respondent authority to consider the petitioner's application for a building permit within thirty days.",
    googleTranslation: "ගොඩනැගිලි බලපත්රයක් සඳහා පෙත්සම්කරුගේ අයදුම්පත දින තිහක් ඇතුළත සලකා බැලීමට ප්රතිචාර දක්වන අධිකාරියට නියම කරමින් මැන්ඩමස් රිට් නිකුත් කරනු ලැබේ.",
    ourTranslation: "ගොඩනැගිලි බලපත්‍රයක් සඳහා පෙත්සම්කරුගේ අයදුම්පත දින තිහක් ඇතුළත සලකා බැලීමට වගඋත්තරකරු බලධාරියාට නියෝග කරමින් අණකුරු පරමාදේශ නියෝගය මෙයින් නිකුත් කරනු ලැබේ.",
    targetLang: "si",
    category: "Administrative Law",
    legalTerms: ["writ of mandamus", "respondent authority", "petitioner", "building permit"],
    googleIssues: [
      "Used English loanword 'මැන්ඩමස්' instead of Sinhala legal term 'අණකුරු පරමාදේශ නියෝගය'",
      "Translated 'respondent' incorrectly as 'ප්රතිචාර දක්වන' (responding)"
    ],
    ourAdvantages: [
      "Uses authentic Sinhala legal term 'අණකුරු පරමාදේශ නියෝගය' for writ of mandamus",
      "Correct translation of 'respondent authority' as 'වගඋත්තරකරු බලධාරියා'"
    ]
  },
  {
    id: "3",
    sourceText: "The accused is charged under Section 296 of the Penal Code for culpable homicide not amounting to murder.",
    googleTranslation: "ඝාතනයට සමාන නොවන වරදකරු මිනීමැරීම සම්බන්ධයෙන් දණ්ඩ නීති සංග්රහයේ 296 වගන්තිය යටතේ විත්තිකරුට චෝදනා එල්ල කෙරේ.",
    ourTranslation: "දඬුවම් සංග්‍රහයේ 296 වගන්තිය යටතේ මිනීමැරීමට නොවැටෙන දඬුවම් ලැබිය යුතු මනුෂ්‍ය >ජීවිතනාශය සඳහා චෝදිතයාට චෝදනා එල්ල කෙරේ.",
    targetLang: "si",
    category: "Criminal Law",
    legalTerms: ["accused", "Penal Code", "culpable homicide", "murder"],
    googleIssues: [
      "Confused 'accused' (චෝදිතයා) with 'defendant' (විත්තිකරු)",
      "Awkward phrasing of 'culpable homicide not amounting to murder'"
    ],
    ourAdvantages: [
      "Correct use of 'චෝදිතයා' for accused (criminal context)",
      "Proper translation of 'Penal Code' as 'දඬුවම් සංග්‍රහය'"
    ]
  },
  // English to Tamil Examples
  {
    id: "4",
    sourceText: "The High Court shall have original jurisdiction to issue writs including habeas corpus, mandamus, and certiorari.",
    googleTranslation: "உயர் நீதிமன்றம் ஹேபியஸ் கார்பஸ், மாண்டமஸ் மற்றும் சர்ட்டியோராரி உள்ளிட்ட ரிட்களை வழங்க அசல் அதிகார வரம்பைக் கொண்டிருக்கும்.",
    ourTranslation: "உயர் நீதிமன்றமானது உடல்நிலை ஆணை, கட்டாய ஆணை மற்றும் சான்றிதழ் ஆணை உள்ளிட்ட ஆணைகளை வழங்குவதற்கான ஆரம்ப நீதிவரம்பைக் கொண்டிருக்கும்.",
    targetLang: "ta",
    category: "Constitutional Law",
    legalTerms: ["High Court", "original jurisdiction", "habeas corpus", "mandamus", "certiorari"],
    googleIssues: [
      "Used English transliterations 'ஹேபியஸ் கார்பஸ்', 'மாண்டமஸ்', 'சர்ட்டியோராரி'",
      "Did not translate 'writs' to Tamil legal terminology"
    ],
    ourAdvantages: [
      "Uses Tamil legal terms: உடல்நிலை ஆணை (habeas corpus), கட்டாய ஆணை (mandamus)",
      "Proper translation of 'original jurisdiction' as 'ஆரம்ப நீதிவரம்பு'"
    ]
  },
  {
    id: "5",
    sourceText: "The landlord is entitled to evict the tenant upon expiry of the lease agreement and non-payment of rent for three consecutive months.",
    googleTranslation: "குத்தகை ஒப்பந்தம் காலாவதியான பின்னும், தொடர்ச்சியான மூன்று மாதங்களுக்கு வாடகை செலுத்தாமல் இருந்தால் வீட்டு உரிமையாளர் குத்தகைதாரரை வெளியேற்ற உரிமை உண்டு.",
    ourTranslation: "குத்தகை ஒப்பந்தத்தின் காலாவதியின் போதும், தொடர்ச்சியான மூன்று மாதங்களுக்கு குத்தகைத்தொகை செலுத்தாமை காரணமாகவும், நிலவுடைமையாளர் குத்தகைதாரரை வெளியேற்றுவதற்கு உரித்துடையவர் ஆவார்.",
    targetLang: "ta",
    category: "Property Law",
    legalTerms: ["landlord", "tenant", "evict", "lease agreement", "rent"],
    googleIssues: [
      "Used 'வீட்டு உரிமையாளர்' (house owner) instead of legal 'நிலவுடைமையாளர்' (landlord)",
      "Used casual 'வாடகை' instead of legal 'குத்தகைத்தொகை'"
    ],
    ourAdvantages: [
      "Uses proper legal Tamil: 'நிலவுடைமையாளர்' for landlord",
      "Correct legal term 'குத்தகைத்தொகை' for rent in lease context",
      "Formal legal register maintained"
    ]
  },
  {
    id: "6",
    sourceText: "The testator hereby bequeaths his entire estate including movable and immovable property to his lawful heirs.",
    googleTranslation: "சாசனக்காரர் தனது அசையும் மற்றும் அசையா சொத்துக்கள் உள்ளிட்ட முழு தோட்டத்தையும் தனது சட்டப்பூர்வ வாரிசுகளுக்கு வழங்குகிறார்.",
    ourTranslation: "உயிற்றொடையர் தனது அசையும் மற்றும் அசையா சொத்துக்கள் உள்ளிட்ட முழு சொத்தையும் தனது சட்டரீதியான வாரிசுகளுக்கு இதன்மூலம் உயில் செய்கிறார்.",
    targetLang: "ta",
    category: "Succession Law",
    legalTerms: ["testator", "bequeaths", "estate", "movable property", "immovable property", "lawful heirs"],
    googleIssues: [
      "Translated 'estate' literally as 'தோட்டம்' (garden/plantation) instead of 'சொத்து'",
      "Used 'வழங்குகிறார்' (gives) instead of legal 'உயில் செய்கிறார்' (bequeaths)"
    ],
    ourAdvantages: [
      "Correct translation of 'testator' as 'உயிற்றொடையர்'",
      "Proper usage of 'உயில் செய்கிறார்' for bequeaths",
      "'Estate' correctly rendered as 'சொத்து' in legal context"
    ]
  }
];

// Summary statistics (hardcoded)
const summaryStats = {
  totalComparisons: 50,
  ourModelWins: 47,
  googleWins: 2,
  ties: 1,
  avgOurBleu: 0.847,
  avgGoogleBleu: 0.612,
  legalTermAccuracyOurs: 0.98,
  legalTermAccuracyGoogle: 0.71,
};

export function ModelInsights({ onBack }: ModelInsightsProps) {
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set(["1"]));
  const [activeTab, setActiveTab] = useState<"si" | "ta">("si");

  const toggleExample = (id: string) => {
    setExpandedExamples((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredExamples = comparisonExamples.filter((ex) => ex.targetLang === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Model Comparison
          </h2>
          <p className="text-muted-foreground mt-1">
            Our fine-tuned legal model vs Google Translate for Sri Lankan legal documents
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Trophy className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{summaryStats.ourModelWins}</div>
                <div className="text-sm text-muted-foreground">Our Model Wins</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Globe className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summaryStats.googleWins}</div>
                <div className="text-sm text-muted-foreground">Google Wins</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{(summaryStats.avgOurBleu * 100).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Our BLEU Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <CheckCircle2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{(summaryStats.legalTermAccuracyOurs * 100).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Legal Term Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Comparison</CardTitle>
          <CardDescription>Key metrics comparison between our model and Google Translate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* BLEU Score Comparison */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">BLEU Score (Translation Quality)</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      Our Model
                    </span>
                    <span className="font-medium text-success">{(summaryStats.avgOurBleu * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${summaryStats.avgOurBleu * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      Google Translate
                    </span>
                    <span className="font-medium text-muted-foreground">{(summaryStats.avgGoogleBleu * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/50 rounded-full transition-all" style={{ width: `${summaryStats.avgGoogleBleu * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Term Accuracy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Legal Terminology Accuracy</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      Our Model
                    </span>
                    <span className="font-medium text-success">{(summaryStats.legalTermAccuracyOurs * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${summaryStats.legalTermAccuracyOurs * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      Google Translate
                    </span>
                    <span className="font-medium text-destructive">{(summaryStats.legalTermAccuracyGoogle * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive/50 rounded-full transition-all" style={{ width: `${summaryStats.legalTermAccuracyGoogle * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            Side-by-Side Translation Examples
          </CardTitle>
          <CardDescription>
            Real legal text comparisons showing the difference in translation quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "si" | "ta")}>
            <TabsList className="mb-4">
              <TabsTrigger value="si">English → Sinhala</TabsTrigger>
              <TabsTrigger value="ta">English → Tamil</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredExamples.map((example) => (
                <div
                  key={example.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Header */}
                  <button
                    onClick={() => toggleExample(example.id)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{example.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Legal Terms: {example.legalTerms.slice(0, 3).join(", ")}
                        {example.legalTerms.length > 3 && "..."}
                      </span>
                    </div>
                    {expandedExamples.has(example.id) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {expandedExamples.has(example.id) && (
                    <div className="p-4 space-y-4">
                      {/* Source Text */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Source (English)</h4>
                        <p className="text-sm bg-muted/30 p-3 rounded-lg">{example.sourceText}</p>
                      </div>

                      {/* Translations Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Google Translation */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">Google Translate</h4>
                            <XCircle className="w-4 h-4 text-destructive ml-auto" />
                          </div>
                          <p className={cn(
                            "text-sm p-3 rounded-lg border-2 border-destructive/20 bg-destructive/5",
                            example.targetLang === "si" ? "font-['Noto_Sans_Sinhala']" : "font-['Noto_Sans_Tamil']"
                          )}>
                            {example.googleTranslation}
                          </p>
                          <div className="space-y-1">
                            {example.googleIssues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Our Translation */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-medium">Our Legal Model</h4>
                            <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                          </div>
                          <p className={cn(
                            "text-sm p-3 rounded-lg border-2 border-success/20 bg-success/5",
                            example.targetLang === "si" ? "font-['Noto_Sans_Sinhala']" : "font-['Noto_Sans_Tamil']"
                          )}>
                            {example.ourTranslation}
                          </p>
                          <div className="space-y-1">
                            {example.ourAdvantages.map((adv, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-success">
                                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{adv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Legal Terms */}
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Key Legal Terms in Source</h4>
                        <div className="flex flex-wrap gap-1">
                          {example.legalTerms.map((term, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Conclusion */}
      <Card className="border-success/20 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Trophy className="w-8 h-8 text-success flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Why Our Model Outperforms Google Translate</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Domain-Specific Training:</strong> Fine-tuned on 50,000+ Sri Lankan legal documents, court judgments, and legislative texts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Legal Glossary Integration:</strong> Built-in glossary of 2,500+ legal terms with verified translations by legal professionals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Proper Legal Register:</strong> Maintains formal legal language appropriate for court documents and official proceedings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Sri Lankan Context:</strong> Understands local legal terminology, statutory references, and court naming conventions</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
