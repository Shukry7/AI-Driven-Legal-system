/**
 * ModelInsights
 * ─────────────
 * Shows a three-model comparison (Base mBART, Fine-Tuned, Google Translate)
 * using real BLEU evaluation results and sample translations from
 * Sri Lankan legal document translation evaluation.
 */
import { useState } from "react";
import {
  Scale,
  Trophy,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
  Languages,
  BarChart3,
  BookOpen,
  Sparkles,
  Server,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ModelInsightsProps {
  onBack: () => void;
}

/* ── BLEU Results ── */
interface BleuResult {
  model: string;
  bleu: number;
  icon: "base" | "finetuned" | "google";
}

const sinhalaBleu: BleuResult[] = [
  { model: "Base mBART", bleu: 4.76, icon: "base" },
  { model: "Fine-Tuned Model", bleu: 67.08, icon: "finetuned" },
  { model: "Google Translate", bleu: 25.79, icon: "google" },
];

const tamilBleu: BleuResult[] = [
  { model: "Base mBART", bleu: 11.68, icon: "base" },
  { model: "Fine-Tuned Model", bleu: 75.49, icon: "finetuned" },
  { model: "Google Translate", bleu: 22.12, icon: "google" },
];

/* ── Sample Translations ── */
interface SampleTranslation {
  id: string;
  english: string;
  referenceSi: string;
  baseSi: string;
  fineTunedSi: string;
  googleSi: string;
  referenceTa: string;
  baseTa: string;
  fineTunedTa: string;
  googleTa: string;
}

const sampleTranslations: SampleTranslation[] = [
  {
    id: "1",
    english:
      "We are of the view that the High Court was right in holding that the agreement to render consultancy services by RMI to Boeing is commercial in nature and that RMI and Boeing do stand in commercial relationship with each other.",
    referenceSi:
      "\u200D\u200Dවිසින් බෝයිං සමාගමට උපදේශන සේවා සැපයීම සඳහා වූ ගිවිසුම වාණිජමය ස්වභාවයකින් යුක්ත බවත් සහ බෝයිං එකිනෙකා සමඟ වාණිජ සබඳතා පවත්වාගෙන යන බවත් ශ්\u200Dරේෂ්ඨාධිකරණය නිවැරදිව තීන්දු කළ බව අපි විශ්වාස කරමුය.",
    baseSi:
      "අපි හිතන්නේ උසාවිය නිවැරදියි කියලා, RMI විසින් Boeingට උපදේශක සේවා ලබා දෙන එකඟතාව वाणिज्यමය ස්වභාවිකයි කියලා, ඒ වගේම RMI සහ Boeing අතර එකිනෙකා සමග वाणिज्य සම්බන්ධතාවයක් තියෙනවා කියලා.",
    fineTunedSi:
      "විසින් බෝයිං සමාගමට උපදේශන සේවා සැපයීම සඳහා වූ ගිවිසුම වාණිජමය ස්වභාවයකින් යුක්ත බවත් සහ බෝයිං එකිනෙකා සමඟ වාණිජ සම්බන්ධතාවයක් ඇති බවත් මහාධිකරණය නිවැරදිව තීන්දු කළ බව අපි විශ්වාස කරමුය.",
    googleSi:
      "RMI විසින් Boeing වෙත උපදේශන සේවා සැපයීමේ ගිවිසුම වාණිජමය ස්වභාවයක් ගන්නා බවත් RMI සහ Boeing එකිනෙකින් වාණිජ සබඳතාවයක පවතින බවත් මහාධිකරණය විසින් නිවැරදි බව අපගේ අදහසයි.",
    referenceTa:
      "ஆர்.எம்.ஐ.யின் ஆலோசனை சேவைகளை போயிங்கிற்கு வழங்கும் ஒப்பந்தம் வணிகத் தன்மையுடையது என்றும், ஆர்.எம்.ஐ. மற்றும் போயிங் ஒருவருக்கொருவர் வணிக உறவில் இருக்கிறார்கள் என்றும் உயர் நீதிமன்றம் தீர்மானித்தது சரியானது என்று நாங்கள் கருதுகிறோம்.",
    baseTa:
      "RMI நிறுவனத்தால் போயிங் நிறுவனத்திற்கு ஆலோசனை சேவைகளை வழங்குவதற்கான ஒப்பந்தம் வணிகரீதியாகும் என்றும், RMI மற்றும் போயிங் இருவரும் ஒருவருக்கொருவர் வர்த்தக உறவுகளில் இருப்பதாகவும் உயர்நீதி மன்றம் கூறியது சரியானது என்று நாங்கள் கருதி இருக்கிறோம்.",
    fineTunedTa:
      "ஆர்.எம்.ஐ.யின் ஆலோசனை சேவைகளை போயிங்கிற்கு வழங்கும் ஒப்பந்தம் வணிக இயல்புடையது என்றும், ஆர்.எம்.ஐ. மற்றும் போயிங் ஒருவருக்கொருவர் வணிக உறவில் இருக்கிறார்கள் என்றும் உயர்நீதிமன்றம் தீர்மானித்தது சரியானது என்றும் நாங்கள் கருதுகிறோம்.",
    googleTa:
      "போயிங்கிற்கு RMI மூலம் ஆலோசனை சேவைகளை வழங்குவதற்கான ஒப்பந்தம் வணிகரீதியானது என்றும் RMI மற்றும் போயிங்கும் ஒன்றுடன் ஒன்று வணிக உறவில் நிற்கின்றன என்றும் உயர் நீதிமன்றம் கூறியது சரியானது என்று நாங்கள் கருதுகிறோம்.",
  },
  {
    id: "2",
    english:
      "The essence of the dispute was whether the words \u2018Red Label\u2019 used with the \u2018Brooke Bond\u2019 trade mark bearing No.",
    referenceSi:
      "මෙම ආරවුලේ මූලික කරුණ වූයේ අංකය දරන \u201Cබෲක් බොන්ඩ්\u201D වෙළඳ ලකුණ සමඟ භාවිතා කළ \u201Cරෙඩ් ලේබල්\u201D යන වචන යන්නයි.",
    baseSi:
      "විනිශ්චයයේ ප් රකාරය තමයි \u201CRed Label\u201D කියන වචන \u201CBrooke Bond\u201D වෙළඳ නාමය නෝර්.",
    fineTunedSi:
      "මෙම ආරවුලේ මූලික කරුණ වූයේ අංකය දරන \u201Cබෲක් බොන්ඩ්\u201D වෙළඳ ලකුණ සමඟ භාවිතා කළ \u201Cරෙඩ් ලේබල්\u201D යන වචනද යන්නයි.",
    googleSi:
      "ආරවුලෙහි හරය වූයේ අංක 1 දරන \u201Cබෲක් බොන්ඩ්\u201D වෙළඳ ලකුණ සමඟ \u201Cරතු ලේබලය\u201D යන වචන භාවිතා කරන්නේද යන්නයි.",
    referenceTa:
      "சர்ச்சையின் சாராம்சம் என்னவென்றால், \u201Cப்ரூக் பாண்ட்\u201D வர்த்தகக் குறியுடன் பயன்படுத்தப்பட்ட \u201Cரெட் லேபிள்\u201D என்ற வார்த்தைகள்.",
    baseTa:
      "இந்த வழக்கின் முக்கியத்துவம் என்னவென்றால், \u201Cபுரோக் பத்திரத்தின்\u201D வர்த்தகச் சின்னத்தில் பயன்படுத்தப்பட்ட வார்த்தைகள் \u201Cஇறுப்புப் பெயர்\u201D என்பதா அல்லது \u201Cபுரோக் பத்திரத்தின்\u201D",
    fineTunedTa:
      "சர்ச்சையின் சாராம்சம் என்னவென்றால், \u201Cப்ரூக் பாண்ட்\u201D வர்த்தகக் குறியுடன் பயன்படுத்தப்பட்ட \u201Cரெட் லேபிள்\u201D என்ற வார்த்தைகள்.",
    googleTa:
      "சர்ச்சையின் சாராம்சம் என்னவென்றால், \u201Cபுரூக் பாண்ட்\u201D வர்த்தக முத்திரையுடன் \u201Cரெட் லேபிள்\u201D என்ற வார்த்தைகள் பயன்படுத்தப்பட்டதா என்பதுதான்.",
  },
  {
    id: "3",
    english:
      "At the conclusion of the trial the learned Judge of the Commercial High Court had proceeded to answer the aforesaid issue No.",
    referenceSi:
      "නඩු විභාගය අවසන් වූ විට වාණිජ මහාධිකරණයේ උගත් විනිසුරුවරයා ඉහත සඳහන් අංකයට පිළිතුරු දුන්නේය බව සලකනු ලැබේ.",
    baseSi:
      "නඩුවේ අවසානයෙදි, वाणिज्य උසාවියේ උගත් විනිසුරුතුමා ප් රශ්නේ අංක.",
    fineTunedSi:
      "නඩු විභාගය අවසන් වූ පසු වාණිජ මහාධිකරණයේ උගත් විනිසුරුවරයා ඉහත සඳහන් අංකයට පිළිතුරු දුන්නේය.",
    googleSi:
      "නඩු විභාගය අවසානයේ වාණිජ මහාධිකරණයේ උගත් විනිසුරුවරයා ඉහත කී ගැටලුවට පිළිතුරු දීමට කටයුතු කර ඇත.",
    referenceTa:
      "விசாரணை முடிவில் வணிக உயர் நீதிமன்றத்தின் கற்றறிந்த நீதிபதி குறித்த விடய எண்ணுக்கு பதிலளிக்க தொடர்ந்தார்.",
    baseTa:
      "இந்த வழக்கு முடிவடைந்தவுடன், வர்த்தக உயர்நீதி மன்றத்தின் கல்வியறிந்த நீதிபதி, முன்கூட்டிய கேள்வி ஒன்றுக்கு பதில் அளித்தார்.",
    fineTunedTa:
      "விசாரணை முடிவில் வணிக உயர் நீதிமன்றத்தின் கற்றறிந்த நீதிபதி குறித்த விடய எண்ணுக்கு பதிலளிக்க தொடர்ந்தார்.",
    googleTa:
      "விசாரணையின் முடிவில் வணிக உயர் நீதிமன்றத்தின் கற்றறிந்த நீதிபதி மேற்கூறிய பிரச்சினைக்கு பதிலளிக்கத் தொடர்ந்தார்.",
  },
  {
    id: "4",
    english:
      "If a claim for the price of goods sold and delivered under an unwritten contract is held to be governed by Section 7 of the Prescription Ordinance, the words \u201Cgoods sold and delivered\u201D in Section 8 become redundant.",
    referenceSi:
      "ලිඛිත නොවන ගිවිසුමක් යටතේ විකිණීමට ලක් කරන ලද සහ භාරදීමට ලක් කරන ලද භාණ්ඩවල මිල සඳහා වන ඉල්ලීමක් රෙසිප් නියෝගයේ 7 වන වගන්තිය යටතේ පාලනය වන බව තහවුරු වුවහොත්, 8 වන වගන්තියේ \u201Cවිකිණීමට ලක් කරන ලද සහ භාරදීමට ලක් කරන ලද භාණ්ඩ\u201D යන වචන අනවශ්\u200Dය වේ.",
    baseSi:
      "ලියකියවිලි රහිත කොන්ත් රාත්තුවක් යටතේ විකිණු සහ යැවූ goods වල මිල වෙනුවෙන් ඉල්ලීමක් නීතී විරෝධන නිතියේ धारा 7 මගින් පාලනය කල යුතු බව සලකුණක් නම්, धारा 8 හී වචන \u201C විකිණු සහ යැවූ goods \u201D අනවශ් ය වෙනවා.",
    fineTunedSi:
      "ලිඛිත නොවන ගිවිසුමක් යටතේ විකිණීමට ලක් කරන ලද සහ භාරදීමට ලක් කරන ලද භාණ්ඩවල මිල සඳහා වන ඉල්ලීමක් රෙසිප් නියෝගයේ 7 වන වගන්තිය යටතේ පාලනය වන බව තහවුරු වුවහොත්, 8 වන වගන්තියේ \u201Cවිකිණීමට ලක් කරන ලද සහ භාරදීමට ලක් කරන ලද භාණ්ඩ\u201D යන වචන අනවශ්ය වේ.",
    googleSi:
      "ලිඛිත නොවන කොන්ත්\u200Dරාත්තුවක් යටතේ විකුණන ලද සහ බෙදා හරින ලද භාණ්ඩවල මිල සඳහා හිමිකම් පෑමක් බෙහෙත් වට්ටෝරු ආඥාපනතේ 7 වන වගන්තිය මගින් පාලනය කරනු ලැබේ නම්, 8 වන වගන්තියේ \u201Cභාණ්ඩ විකුණා බෙදා හරින ලද\u201D යන වචන අතිරික්ත වේ.",
    referenceTa:
      "எழுத்துப்பூர்வமற்ற ஒப்பந்தத்தின் கீழ் விற்கப்பட்டு வழங்கப்பட்ட பொருட்களின் விலைக்கான கோரிக்கை Prescription Ordinance இன் பிரிவு 7 இன் கீழ் நிர்வகிக்கப்படுகிறது எனக் கருதப்பட்டால், பிரிவு 8 இல் \u201Cவிற்கப்பட்டு வழங்கப்பட்ட பொருட்கள்\u201D என்ற சொற்கள் தேவையற்றதாகின்றன.",
    baseTa:
      "ஒரு கையெழுத்திடப்படாத ஒப்பந்தத்தின்கீழ் விற்ற மற்றும் வழங்கப்பட்ட பொருட்களின் விலைக்கான கூலிக்கு விதிமுறைகள் விதிமுறைகள் விதிமுறைகள் விதியின் 7 ஆம் பிரிவினால் கட்டுப்படுத்தப்படும் என்று கருதப்பட்டால், 8 ஆம் பிரிவில் \u201Cவிற்ற மற்றும் வழங்கப்பட்ட பொருட்கள்\u201D என்ற வார்த்தைகள் தேவையற்றவையாகிவிடும்.",
    fineTunedTa:
      "எழுத்துப்பூர்வமற்ற ஒப்பந்தத்தின் கீழ் விற்கப்பட்டு வழங்கப்பட்ட பொருட்களின் விலைக்கான கோரிக்கை Prescription Ordinance இன் பிரிவு 7 இன் கீழ் நிர்வகிக்கப்படுகிறது எனக் கருதப்பட்டால், பிரிவு 8 இல் \u201Cவிற்கப்பட்டு வழங்கப்பட்ட பொருட்கள்\u201D என்ற சொற்கள் தேவையற்றதாகின்றன.",
    googleTa:
      "எழுதப்படாத ஒப்பந்தத்தின் கீழ் விற்கப்பட்ட மற்றும் விநியோகிக்கப்படும் பொருட்களின் விலைக்கான உரிமைகோரல், மருந்துச்சட்டத்தின் பிரிவு 7 ஆல் நிர்வகிக்கப்படும் எனில், பிரிவு 8 இல் உள்ள \u201Cவிற்பனை மற்றும் விநியோகிக்கப்படும் பொருட்கள்\u201D என்ற வார்த்தைகள் தேவையற்றதாகிவிடும்.",
  },
  {
    id: "5",
    english:
      "Hence even after a demand was made on the 2nd Defendant, it did not result in the 2nd Defendant stepping into the shoes of the Lessee in the lease agreement.",
    referenceSi:
      "එබැවින් දෙවන විත්තිකරුගෙන් ඉල්ලීමක් කළ පසුවත් එය දෙවන විත්තිකරු කුලී ගිවිසුමේ කුලියට ගත් තැනැත්තාගේ සපත්තුවට පත්වීමට හේතු වූයේ නැත.",
    baseSi:
      "ඒ නිසා දෙවෙනි විත්තිකරුවාට ඉල්ලීමක් කල පසු පවා, ඒකෙන් දෙවෙනි විත්තිකරුවා කුලී ගිවිසුමේ කුලියට දෙන කෙනාගේ සපත්තු වලට පැමිනෙන්නේ නැහැ.",
    fineTunedSi:
      "එබැවින් දෙවන විත්තිකරුගෙන් ඉල්ලීමක් කළ පසුවත් එය දෙවන විත්තිකරු කුලී ගිවිසුමේ කුලියට ගත් තැනැත්තාගේ සපත්තුවට පත්වීමට හේතු නොවීය.",
    googleSi:
      "එහෙයින් 2 වැනි විත්තිකරුගෙන් ඉල්ලීමක් කළ පසුවත්, බදු ගිවිසුමේ දී 2 වැනි විත්තිකරු බදුකරුගේ සපත්තුවට පා තැබුවේ නැත.",
    referenceTa:
      "எனவே, 2வது எதிர்வாதியிடம் கோரிக்கை செய்யப்பட்ட பிறகும், அது 2வது எதிர்வாதியை குத்தகை ஒப்பந்தத்தில் குத்தகைதாரரின் காலணிகளில் அடியெடுத்து வைக்க வழிவகுக்கவில்லை.",
    baseTa:
      "ஆகையால், இரண்டாம் குற்றவாளி மீது ஒரு கோரிக்கை விடுக்கப்பட்ட பின்னரும், அது இரண்டாம் குற்றவாளியின் வாடகை ஒப்பந்தத்தில் வாடகையாளரின் காலடியில் நுழைவதற்கு வழிவகுக்கவில்லை.",
    fineTunedTa:
      "எனவே, 2வது எதிர்வாதியிடம் கோரிக்கை செய்யப்பட்ட பிறகும், அது 2வது எதிர்வாதியை குத்தகை ஒப்பந்தத்தில் குத்தகைதாரரின் காலணிகளில் அடியெடுத்து வைக்க வழிவகுக்கவில்லை.",
    googleTa:
      "எனவே, 2வது பிரதிவாதியிடம் கோரிக்கை வைக்கப்பட்ட பிறகும், குத்தகை ஒப்பந்தத்தில் 2வது பிரதிவாதி குத்தகைதாரரின் காலணிக்குள் நுழையவில்லை.",
  },
];

/* ── Helpers ── */
const barColor = (icon: BleuResult["icon"]) => {
  switch (icon) {
    case "finetuned":
      return "bg-success";
    case "google":
      return "bg-warning";
    case "base":
      return "bg-muted-foreground/50";
  }
};

const barTextColor = (icon: BleuResult["icon"]) => {
  switch (icon) {
    case "finetuned":
      return "text-success";
    case "google":
      return "text-warning";
    case "base":
      return "text-muted-foreground";
  }
};

const modelIcon = (icon: BleuResult["icon"]) => {
  switch (icon) {
    case "finetuned":
      return <Sparkles className="w-4 h-4 text-success" />;
    case "google":
      return <Globe className="w-4 h-4 text-warning" />;
    case "base":
      return <Server className="w-4 h-4 text-muted-foreground" />;
  }
};

function BleuBarChart({ data, maxBleu = 100 }: { data: BleuResult[]; maxBleu?: number }) {
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.model}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="flex items-center gap-2 font-medium">
              {modelIcon(d.icon)}
              {d.model}
            </span>
            <span className={cn("font-semibold tabular-nums", barTextColor(d.icon))}>
              {d.bleu.toFixed(2)}
            </span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", barColor(d.icon))}
              style={{ width: `${(d.bleu / maxBleu) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

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

  const avgFineTuned = ((sinhalaBleu[1].bleu + tamilBleu[1].bleu) / 2).toFixed(1);
  const avgGoogle = ((sinhalaBleu[2].bleu + tamilBleu[2].bleu) / 2).toFixed(1);
  const avgBase = ((sinhalaBleu[0].bleu + tamilBleu[0].bleu) / 2).toFixed(1);
  const improvementOverGoogle = (
    ((sinhalaBleu[1].bleu + tamilBleu[1].bleu) / 2) -
    ((sinhalaBleu[2].bleu + tamilBleu[2].bleu) / 2)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Model Insights &amp; Evaluation
          </h2>
          <p className="text-muted-foreground mt-1">
            BLEU score evaluation comparing Base mBART, Fine-Tuned, and Google Translate on Sri Lankan legal text
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Trophy className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{avgFineTuned}</div>
                <div className="text-xs text-muted-foreground">Fine-Tuned Avg BLEU</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Globe className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{avgGoogle}</div>
                <div className="text-xs text-muted-foreground">Google Avg BLEU</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Server className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{avgBase}</div>
                <div className="text-xs text-muted-foreground">Base mBART Avg BLEU</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <BarChart3 className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">+{improvementOverGoogle}</div>
                <div className="text-xs text-muted-foreground">vs Google (BLEU pts)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BLEU Score Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="w-4 h-4 text-primary" />
              English → Sinhala BLEU Scores
            </CardTitle>
            <CardDescription>Higher is better (0–100 scale)</CardDescription>
          </CardHeader>
          <CardContent>
            <BleuBarChart data={sinhalaBleu} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="w-4 h-4 text-primary" />
              English → Tamil BLEU Scores
            </CardTitle>
            <CardDescription>Higher is better (0–100 scale)</CardDescription>
          </CardHeader>
          <CardContent>
            <BleuBarChart data={tamilBleu} />
          </CardContent>
        </Card>
      </div>

      {/* ── BLEU Score Results Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            BLEU Evaluation Results
          </CardTitle>
          <CardDescription>
            BLEU (Bilingual Evaluation Understudy) measures translation similarity to human references
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Model</th>
                  <th className="text-right py-2 px-4 font-medium text-muted-foreground">BLEU Score</th>
                  <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Rating</th>
                </tr>
              </thead>
              <tbody>
                {[...sinhalaBleu.map((b) => ({ ...b, lang: "Sinhala" })), ...tamilBleu.map((b) => ({ ...b, lang: "Tamil" }))].map(
                  (row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="flex items-center gap-2">
                          {modelIcon(row.icon)}
                          {row.model}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {row.lang}
                          </Badge>
                        </span>
                      </td>
                      <td className={cn("py-2.5 px-4 text-right font-semibold tabular-nums", barTextColor(row.icon))}>
                        {row.bleu.toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-4">
                        <Badge
                          variant={row.bleu >= 60 ? "default" : row.bleu >= 20 ? "secondary" : "outline"}
                          className={cn(
                            "text-[10px]",
                            row.bleu >= 60 && "bg-success text-success-foreground",
                            row.bleu >= 20 && row.bleu < 60 && "bg-warning/15 text-warning border-warning/30",
                            row.bleu < 20 && "text-muted-foreground"
                          )}
                        >
                          {row.bleu >= 60 ? "Excellent" : row.bleu >= 20 ? "Moderate" : "Poor"}
                        </Badge>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Sample Translations ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Sample Translations from All Models
          </CardTitle>
          <CardDescription>
            Side-by-side comparison of real legal text translations with human reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "si" | "ta")}>
            <TabsList className="mb-4">
              <TabsTrigger value="si">English → Sinhala</TabsTrigger>
              <TabsTrigger value="ta">English → Tamil</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {sampleTranslations.map((sample, idx) => {
                const isExpanded = expandedExamples.has(sample.id);
                const ref = activeTab === "si" ? sample.referenceSi : sample.referenceTa;
                const base = activeTab === "si" ? sample.baseSi : sample.baseTa;
                const ft = activeTab === "si" ? sample.fineTunedSi : sample.fineTunedTa;
                const google = activeTab === "si" ? sample.googleSi : sample.googleTa;
                const fontClass =
                  activeTab === "si" ? "font-['Noto_Sans_Sinhala']" : "font-['Noto_Sans_Tamil']";

                return (
                  <div key={sample.id} className="border rounded-lg overflow-hidden">
                    {/* Collapsible header */}
                    <button
                      onClick={() => toggleExample(sample.id)}
                      className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          Example {idx + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground line-clamp-1 text-left max-w-xl">
                          {sample.english}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Source (English) */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Source (English)
                          </h4>
                          <p className="text-sm bg-muted/30 p-3 rounded-lg leading-relaxed">
                            {sample.english}
                          </p>
                        </div>

                        {/* Reference */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2 text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Human Reference Translation
                          </h4>
                          <p
                            className={cn(
                              "text-sm p-3 rounded-lg border-2 border-primary/20 bg-primary/5 leading-relaxed",
                              fontClass
                            )}
                          >
                            {ref}
                          </p>
                        </div>

                        {/* 3-model grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Fine-Tuned */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-success" />
                              <h4 className="text-sm font-semibold">Fine-Tuned Model</h4>
                              <Badge className="ml-auto bg-success/15 text-success border-success/30 text-[10px]">
                                Best
                              </Badge>
                            </div>
                            <p
                              className={cn(
                                "text-sm p-3 rounded-lg border-2 border-success/20 bg-success/5 leading-relaxed min-h-[80px]",
                                fontClass
                              )}
                            >
                              {ft}
                            </p>
                          </div>

                          {/* Google Translate */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-warning" />
                              <h4 className="text-sm font-semibold">Google Translate</h4>
                            </div>
                            <p
                              className={cn(
                                "text-sm p-3 rounded-lg border-2 border-warning/20 bg-warning/5 leading-relaxed min-h-[80px]",
                                fontClass
                              )}
                            >
                              {google}
                            </p>
                          </div>

                          {/* Base mBART */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-muted-foreground" />
                              <h4 className="text-sm font-semibold">Base mBART</h4>
                            </div>
                            <p
                              className={cn(
                                "text-sm p-3 rounded-lg border bg-muted/20 leading-relaxed min-h-[80px]",
                                fontClass
                              )}
                            >
                              {base}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Key Findings ── */}
      <Card className="border-success/20 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Trophy className="w-8 h-8 text-success flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-3">Key Findings</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Fine-Tuned model dominates:</strong> BLEU of{" "}
                    <span className="text-success font-semibold">67.08</span> (Sinhala) and{" "}
                    <span className="text-success font-semibold">75.49</span> (Tamil) — over{" "}
                    <strong>2.5× higher</strong> than Google Translate
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Base mBART is inadequate:</strong> Without fine-tuning, BLEU scores of{" "}
                    <span className="text-muted-foreground font-semibold">4.76</span> (Sinhala) and{" "}
                    <span className="text-muted-foreground font-semibold">11.68</span> (Tamil) show
                    the model cannot produce usable legal translations
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Google Translate falls short:</strong> BLEU of{" "}
                    <span className="text-warning font-semibold">25.79</span> (Sinhala) and{" "}
                    <span className="text-warning font-semibold">22.12</span> (Tamil) — it lacks
                    domain-specific legal terminology
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Domain-specific fine-tuning is essential:</strong> Legal terminology,
                    court naming conventions, and statutory references require specialized training
                    that general-purpose translators cannot provide
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
