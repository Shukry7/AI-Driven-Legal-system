/**
 * Translation PDF Service
 * 
 * Simple PDF generation using browser print dialog.
 * Opens translated content in a new window and triggers print/save as PDF.
 */

import { normalizeSinhalaUnicode } from "./sinhalaUnicode";
import type { TranslationJobResult } from "@/config/api";

export type TranslationResult = TranslationJobResult;

/**
 * Process text based on language
 */
function processText(text: string, lang: string): string {
  if (!text) return "";
  if (lang === "si") {
    return normalizeSinhalaUnicode(text);
  }
  return text;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate simple HTML document with translated content
 */
function generateHtml(result: TranslationResult): string {
  const targetLang = result.target_language;
  const translatedSections = result.translated_sections || [];
  
  // Build content
  let content = "";
  
  if (translatedSections.length > 0) {
    translatedSections.forEach((section) => {
      const text = processText(section.translated_content, targetLang);
      const escapedText = escapeHtml(text);
      // Preserve line breaks
      content += `<p>${escapedText.replace(/\n/g, "<br>")}</p>\n`;
    });
  } else if (result.raw_translated_text) {
    const text = processText(result.raw_translated_text, targetLang);
    const escapedText = escapeHtml(text);
    const paragraphs = escapedText.split(/\n\n+/);
    paragraphs.forEach((para) => {
      if (para.trim()) {
        content += `<p>${para.replace(/\n/g, "<br>")}</p>\n`;
      }
    });
  }

  // Font based on language
  let fontFamily = "'Times New Roman', serif";
  if (targetLang === "si") {
    fontFamily = "'Noto Sans Sinhala', 'Iskoola Pota', sans-serif";
  } else if (targetLang === "ta") {
    fontFamily = "'Noto Sans Tamil', 'Latha', sans-serif";
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${result.filename || "Translation"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala&family=Noto+Sans+Tamil&display=swap');
    
    @page {
      size: A4;
      margin: 20mm;
    }
    
    body {
      font-family: ${fontFamily};
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: white;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }
    
    p {
      margin: 0 0 12px 0;
      text-align: justify;
    }
    
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Download translation as PDF using browser print dialog
 */
export async function downloadTranslationPdf(
  result: TranslationResult,
  _includeSource: boolean = false
): Promise<void> {
  const html = generateHtml(result);
  
  // Open in new window and print
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Could not open print window. Please allow popups.");
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for fonts then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

/**
 * Download translation as plain text file
 */
export function downloadTranslationTxt(
  result: TranslationResult,
  includeSource: boolean = false
): void {
  const targetLang = result.target_language;
  let content = "";
  
  if (includeSource && result.source_sections?.length > 0) {
    result.source_sections.forEach((src, i) => {
      const trans = result.translated_sections?.[i];
      content += `--- Section ${i + 1} ---\n`;
      content += `[Original]\n${src.content}\n\n`;
      if (trans) {
        const text = processText(trans.translated_content, targetLang);
        content += `[${targetLang === "si" ? "Sinhala" : "Tamil"}]\n${text}\n\n`;
      }
    });
  } else {
    result.translated_sections?.forEach((section) => {
      const text = processText(section.translated_content, targetLang);
      content += text + "\n\n";
    });
  }
  
  if (!content && result.raw_translated_text) {
    content = processText(result.raw_translated_text, targetLang);
  }
  
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.filename || "translation"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download translation as JSON file
 */
export function downloadTranslationJson(result: TranslationResult): void {
  const data = {
    filename: result.filename,
    source_language: result.source_language,
    target_language: result.target_language,
    translated_at: result.completed_at,
    sections: result.translated_sections?.map((s, i) => ({
      id: s.id,
      original: result.source_sections?.[i]?.content || "",
      translated: processText(s.translated_content, result.target_language),
      confidence: s.confidence,
    })),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.filename || "translation"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
