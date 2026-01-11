import { useState, useEffect } from 'react';
import { 
  Play, 
  Loader2, 
  Download, 
  Copy, 
  CheckCircle2, 
  BookOpen,
  FileText,
  Info,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TranslationWorkspaceProps {
  file: File;
  sourceLanguage: string;
  targetLanguage: string;
  onBack: () => void;
  onComplete: () => void;
}

const sourceDocument = {
  sections: [
    {
      id: 'header',
      type: 'header',
      content: 'CIVIL CASE NO. 2024/0341\n\nBEFORE THE DISTRICT COURT OF COLOMBO',
      keywords: ['CIVIL CASE', 'DISTRICT COURT']
    },
    {
      id: 'parties',
      type: 'parties',
      content: 'IN THE MATTER OF:\n\nSilva & Partners (Pvt) Ltd.\n... Plaintiff\n\nvs.\n\nPerera Holdings Corporation\n... Defendant',
      keywords: ['Plaintiff', 'Defendant']
    },
    {
      id: 'clause1',
      type: 'clause',
      content: '1. The Plaintiff is a company duly incorporated under the Companies Act No. 07 of 2007 and carries on business at No. 123, Union Place, Colombo 02.',
      keywords: ['Companies Act No. 07 of 2007', 'incorporated']
    },
    {
      id: 'clause2',
      type: 'clause',
      content: '2. The Defendant is a corporation registered under the said Act and carries on business at No. 45, Galle Road, Colombo 03.',
      keywords: ['corporation', 'registered']
    },
    {
      id: 'clause3',
      type: 'clause',
      content: '3. The Plaintiff avers that on or about the 15th day of March 2023, the parties entered into a written agreement for the supply of goods and services.',
      keywords: ['avers', 'written agreement', 'supply of goods']
    }
  ]
};

const translatedContent = {
  si: {
    sections: [
      {
        id: 'header',
        content: 'සිවිල් නඩුව අංක 2024/0341\n\nකොළඹ දිසා අධිකරණය ඉදිරියේ',
        confidence: 0.96
      },
      {
        id: 'parties',
        content: 'මෙම කාරණයේ:\n\nසිල්වා ඇන්ඩ් පාට්නර්ස් (පෞද්ගලික) සමාගම\n... පැමිණිලිකරු\n\nඑදිරිව\n\nපෙරේරා හෝල්ඩින්ග්ස් සමාගම\n... විත්තිකරු',
        confidence: 0.94
      },
      {
        id: 'clause1',
        content: '1. පැමිණිලිකරු 2007 අංක 07 දරන සමාගම් පනත යටතේ නිසි පරිදි සංස්ථාපිත සමාගමක් වන අතර කොළඹ 02, යූනියන් පෙදෙස, අංක 123 හිදී ව්‍යාපාර කරයි.',
        confidence: 0.92
      },
      {
        id: 'clause2',
        content: '2. විත්තිකරු එම පනත යටතේ ලියාපදිංචි සංස්ථාවක් වන අතර කොළඹ 03, ගාලු පාර, අංක 45 හිදී ව්‍යාපාර කරයි.',
        confidence: 0.95
      },
      {
        id: 'clause3',
        content: '3. පැමිණිලිකරු ප්‍රකාශ කරන්නේ 2023 මාර්තු 15 වන දින හෝ ඒ පමණ කාලයේදී, පාර්ශවයන් භාණ්ඩ හා සේවා සැපයීම සඳහා ලිඛිත ගිවිසුමකට එළඹි බවයි.',
        confidence: 0.89
      }
    ]
  },
  ta: {
    sections: [
      {
        id: 'header',
        content: 'சிவில் வழக்கு எண் 2024/0341\n\nகொழும்பு மாவட்ட நீதிமன்றத்தின் முன்',
        confidence: 0.95
      },
      {
        id: 'parties',
        content: 'இந்த விவகாரத்தில்:\n\nசில்வா & பார்ட்னர்ஸ் (பிரைவேட்) லிமிடெட்\n... வாதி\n\nஎதிராக\n\nபெரேரா ஹோல்டிங்ஸ் கார்ப்பரேஷன்\n... பிரதிவாதி',
        confidence: 0.93
      },
      {
        id: 'clause1',
        content: '1. வாதி 2007 ஆம் ஆண்டின் 07 ஆம் இலக்க நிறுவனங்கள் சட்டத்தின் கீழ் முறையாக இணைக்கப்பட்ட நிறுவனமாகும், கொழும்பு 02, யூனியன் பிளேஸ், எண் 123 இல் வணிகம் செய்கிறது.',
        confidence: 0.91
      },
      {
        id: 'clause2',
        content: '2. பிரதிவாதி குறிப்பிட்ட சட்டத்தின் கீழ் பதிவு செய்யப்பட்ட நிறுவனமாகும், கொழும்பு 03, காலி வீதி, எண் 45 இல் வணிகம் செய்கிறது.',
        confidence: 0.94
      },
      {
        id: 'clause3',
        content: '3. வாதி கூறுவது என்னவெனில், 2023 மார்ச் 15 ஆம் திகதி அல்லது அதன் அருகில், தரப்பினர் பொருட்கள் மற்றும் சேவைகளை வழங்குவதற்கான எழுத்துப்பூர்வ ஒப்பந்தத்தில் நுழைந்தனர்.',
        confidence: 0.88
      }
    ]
  }
};

const glossaryTerms = [
  { en: 'Plaintiff', si: 'පැමිණිලිකරු', ta: 'வாதி', category: 'Civil Law' },
  { en: 'Defendant', si: 'විත්තිකරු', ta: 'பிரதிவாதி', category: 'Civil Law' },
  { en: 'District Court', si: 'දිසා අධිකරණය', ta: 'மாவட்ட நீதிமன்றம்', category: 'Courts' },
  { en: 'incorporated', si: 'සංස්ථාපිත', ta: 'இணைக்கப்பட்ட', category: 'Corporate Law' },
  { en: 'agreement', si: 'ගිවිසුම', ta: 'ஒப்பந்தம்', category: 'Contract Law' }
];

export function TranslationWorkspace({ 
  file, 
  sourceLanguage, 
  targetLanguage, 
  onBack,
  onComplete 
}: TranslationWorkspaceProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationComplete, setTranslationComplete] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const targetLangKey = targetLanguage as keyof typeof translatedContent;
  const translatedSections = translatedContent[targetLangKey]?.sections || translatedContent.si.sections;

  const handleTranslate = () => {
    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      setTranslationComplete(true);
      toast.success('Translation completed successfully');
    }, 3000);
  };

  const handleCopy = () => {
    const fullText = translatedSections.map(s => s.content).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageLabel = (code: string) => {
    const labels: Record<string, string> = { en: 'English', si: 'Sinhala', ta: 'Tamil' };
    return labels[code] || code;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.8) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={onBack} className="hover:text-foreground transition-colors">
              Translation
            </button>
            <ChevronRight className="w-4 h-4" />
            <span>Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{file.name}</h2>
          <p className="text-muted-foreground mt-1">
            {getLanguageLabel(sourceLanguage)} → {getLanguageLabel(targetLanguage)}
          </p>
        </div>
        
        {/* Model Info */}
        <Card className="bg-muted/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">mBART Fine-Tuned Legal Model</p>
                <p className="text-xs text-muted-foreground">Stage 1 - Sri Lankan Legal Corpus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Actions (sticky) */}
      <div className="sticky top-0 z-20 bg-background border-b border-border -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={onBack} 
            size="default"
          >
            Back to Upload
          </Button>

          {translationComplete && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Export DOCX
              </Button>
              <Button 
                onClick={onComplete} 
                size="default"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete & Save
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace - 3 Pane Layout */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
        {/* Left Pane - Original Document */}
        <div className="col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Original Document
                </CardTitle>
                <Badge variant="outline">{getLanguageLabel(sourceLanguage)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {sourceDocument.sections.map((section) => (
                  <div 
                    key={section.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedSection === section.id 
                        ? "border-accent bg-accent/5" 
                        : "border-transparent hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {section.type}
                      </Badge>
                    </div>
                    <p className="text-sm legal-text whitespace-pre-line text-foreground">
                      {section.content}
                    </p>
                    {section.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {section.keywords.map((keyword, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                  {keyword}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Legal term from glossary</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Pane - Controls */}
        <div className="col-span-2 flex flex-col items-center justify-center gap-4">
          {!translationComplete ? (
            <Button 
              size="lg" 
              onClick={handleTranslate}
              disabled={isTranslating}
              className="w-full gap-2"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Translate
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Complete</span>
            </div>
          )}

          {isTranslating && (
            <div className="text-center">
              <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent animate-pulse-subtle" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Processing clauses...</p>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            disabled 
            className="w-full text-xs"
          >
            Improve (Stage 2)
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Advanced refinement model not available
          </p>
        </div>

        {/* Right Pane - Translated Output */}
        <div className="col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Translated Output
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getLanguageLabel(targetLanguage)}</Badge>
                  {translationComplete && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!translationComplete && !isTranslating && (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Click "Translate" to start</p>
                </div>
              )}
              
              {isTranslating && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent mb-4" />
                    <p className="text-sm text-muted-foreground">Generating translation...</p>
                  </div>
                </div>
              )}

              {translationComplete && (
                <div className="space-y-4">
                  {translatedSections.map((section, index) => (
                    <div 
                      key={section.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selectedSection === section.id 
                          ? "border-accent bg-accent/5" 
                          : "border-transparent hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Section {index + 1}
                        </Badge>
                        <span className={cn("text-xs font-medium", getConfidenceColor(section.confidence))}>
                          {Math.round(section.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm legal-text whitespace-pre-line text-foreground">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Glossary Panel (at the bottom of the page) */}
      {/* {translationComplete && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <CardTitle className="text-base">Legal Glossary Terms Used</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {glossaryTerms.map((term, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="cursor-help">
                        {term.en}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p><strong>SI:</strong> {term.si}</p>
                        <p><strong>TA:</strong> {term.ta}</p>
                        <p className="text-muted-foreground">{term.category}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Bottom Actions (removed; actions are now at top) */}
    </div>
  );
}
