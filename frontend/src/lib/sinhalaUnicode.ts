/**
 * Sinhala Unicode Normalizer
 * 
 * Handles proper formation of Sinhala conjunct consonants by inserting
 * Zero Width Joiner (ZWJ - U+200D) characters where needed.
 * 
 * Problem:
 * When text is extracted from PDFs or translated, the ZWJ character is often missing,
 * causing conjunct consonants to display incorrectly:
 * - Without ZWJ: ප්ර (broken)
 * - With ZWJ: ප්‍ර (proper conjunct)
 */

// U+200D - Zero Width Joiner
const ZWJ = '\u200D';

// Sinhala Virama (්) - U+0DCA
const VIRAMA = '\u0DCA';

// Sinhala consonants (covers the main range)
const SINHALA_CONSONANTS = [
  'ක', 'ඛ', 'ග', 'ඝ', 'ඞ',  // Velars
  'ච', 'ඡ', 'ජ', 'ඣ', 'ඤ',  // Palatals
  'ට', 'ඨ', 'ඩ', 'ඪ', 'ණ',  // Retroflexes
  'ත', 'ථ', 'ද', 'ධ', 'න',  // Dentals
  'ප', 'ඵ', 'බ', 'භ', 'ම',  // Labials
  'ය', 'ර', 'ල', 'ව',        // Semi-vowels
  'ශ', 'ෂ', 'ස', 'හ', 'ළ', 'ෆ'  // Sibilants and others
];

// Characters that commonly follow virama to form conjuncts (need ZWJ)
const CONJUNCT_FORMING_CHARS = ['ර', 'ය', 'ව'];

// Build regex pattern for consonant + virama + conjunct-forming char (missing ZWJ)
const consonantPattern = SINHALA_CONSONANTS.join('');
const conjunctPattern = CONJUNCT_FORMING_CHARS.join('');
const MISSING_ZWJ_REGEX = new RegExp(
  `([${consonantPattern}])${VIRAMA}(?!${ZWJ})([${conjunctPattern}])`,
  'g'
);

/**
 * Normalize Sinhala text by inserting ZWJ characters where needed
 * to form proper conjunct consonants.
 * 
 * @param text - Input text that may contain improperly formed Sinhala conjuncts
 * @returns Normalized text with proper ZWJ insertion
 * 
 * @example
 * normalizeSinhalaUnicode("ප්රජාතන්ත්රවාදී")
 * // Returns: "ප්‍රජාතන්ත්‍රවාදී"
 * 
 * normalizeSinhalaUnicode("ශ්රී ලංකාව")
 * // Returns: "ශ්‍රී ලංකාව"
 */
export function normalizeSinhalaUnicode(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Check if text contains Sinhala characters (U+0D80 to U+0DFF)
  const hasSinhala = /[\u0D80-\u0DFF]/.test(text);
  if (!hasSinhala) {
    return text;
  }

  // Insert ZWJ where missing
  // Pattern: consonant + virama + conjunct_char (without ZWJ between virama and char)
  // Replace with: consonant + virama + ZWJ + conjunct_char
  return text.replace(MISSING_ZWJ_REGEX, `$1${VIRAMA}${ZWJ}$2`);
}

/**
 * Check if text contains any Sinhala characters
 */
export function hasSinhalaText(text: string): boolean {
  if (!text) return false;
  return /[\u0D80-\u0DFF]/.test(text);
}

/**
 * Check if text contains any Tamil characters
 */
export function hasTamilText(text: string): boolean {
  if (!text) return false;
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Normalize text for display based on detected language
 */
export function normalizeDisplayText(text: string): string {
  if (!text) return text;
  
  // Apply Sinhala normalization if needed
  if (hasSinhalaText(text)) {
    return normalizeSinhalaUnicode(text);
  }
  
  return text;
}
