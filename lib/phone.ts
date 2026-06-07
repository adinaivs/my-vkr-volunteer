// ─────────────────────────────────────────────────────────────────────────────
// Утилиты для кыргызских номеров телефона.
// Формат: +996 XXX XXX XXX (код страны +996 и 9 цифр номера).
// ─────────────────────────────────────────────────────────────────────────────

export const PHONE_PREFIX = '+996';

/**
 * Форматирует ввод пользователя в маску «+996 XXX XXX XXX».
 * Всегда сохраняет префикс +996, оставляет только цифры, ограничивает
 * длину до 9 цифр после кода и расставляет пробелы группами 3-3-3.
 */
export function formatKgPhone(input: string): string {
  // Берём только цифры из всего, что ввёл пользователь
  let digits = input.replace(/\D/g, '');

  // Убираем код страны 996, если он есть в начале
  if (digits.startsWith('996')) {
    digits = digits.slice(3);
  }

  // Максимум 9 цифр номера
  digits = digits.slice(0, 9);

  if (!digits) return PHONE_PREFIX + ' ';

  // Группируем по 3: XXX XXX XXX
  const groups = digits.match(/.{1,3}/g) || [];
  return `${PHONE_PREFIX} ${groups.join(' ')}`;
}

/**
 * Проверяет, что номер — корректный кыргызский: +996 и ровно 9 цифр.
 */
export function isValidKgPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return /^996\d{9}$/.test(digits);
}

/**
 * Приводит номер к каноничному виду «+996XXXXXXXXX» (без пробелов)
 * для хранения в БД и сравнения.
 */
export function normalizeKgPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('996')) {
    digits = digits.slice(3);
  }
  return PHONE_PREFIX + digits;
}
