// ═══════════════════════════════════════════════════════════════════════════
// KIRO VOICE — Text-to-Speech Utilities
// Cleans text for voice synthesis and detects emotion from content
// ═══════════════════════════════════════════════════════════════════════════

export type KiroVoiceEmotion = 'neutral' | 'happy' | 'excited' | 'thinking';

/**
 * Clean text for voice synthesis:
 * - Removes markdown, emojis, URLs, special chars
 * - Converts "UP" points references for better pronunciation
 * - Trims and normalizes whitespace
 */
export function cleanTextForVoice(text: string): string {
  return text
    // Remove markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove emojis
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    // Improve pronunciation
    .replace(/\bUP\b/g, 'puntos UP')
    // Clean whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect emotion from KIRO's response text for voice modulation.
 */
export function detectVoiceEmotion(text: string): KiroVoiceEmotion {
  const lower = text.toLowerCase();

  // Excited: achievements, milestones, important notifications
  if (
    /(\u{1F389}|\u{1F3C6}|\u{2B50}|logro|hito|increíble|impresionante|extraordinario)/iu.test(text) ||
    /nivel\s+\d+|subiste|desbloqueaste/i.test(lower)
  ) {
    return 'excited';
  }

  // Happy: greetings, celebrations, positive feedback
  if (
    /felicidades|bienvenid|genial|excelente|perfecto|aprobad|completad|éxito/i.test(lower) ||
    /[!]{2,}/.test(text) ||
    /:\)|feliz|celebr/i.test(lower)
  ) {
    return 'happy';
  }

  // Thinking: searching, processing
  if (
    /buscando|analizando|procesando|un momento|déjame ver|revisando|calculando/i.test(lower)
  ) {
    return 'thinking';
  }

  return 'neutral';
}

/**
 * Check if text is worth speaking (not too short, not just emojis/symbols).
 */
export function isSpeakableText(text: string): boolean {
  const cleaned = cleanTextForVoice(text);
  return cleaned.length >= 5;
}
