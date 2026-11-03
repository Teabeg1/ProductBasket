/**
 * Строгая валидация эмодзи (Sprint 4 Block 3.5).
 * Разрешает ТОЛЬКО эмодзи (Extended_Pictographic), полностью блокируя
 * буквы (латиницу и кириллицу), цифры, пробелы и служебные знаки.
 */

const EMOJI_COMPONENT_REGEX = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200D|\uFE0F)+$/u;
const BASE_EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}]/u;
const FORBIDDEN_CHARS_REGEX = /[\p{L}\p{N}\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/u;

export function isStrictEmoji(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (FORBIDDEN_CHARS_REGEX.test(trimmed)) return false;
  if (!BASE_EMOJI_REGEX.test(trimmed)) return false;
  return EMOJI_COMPONENT_REGEX.test(trimmed);
}
