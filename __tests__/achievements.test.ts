/**
 * Юнит-тесты: Логика системы достижений и Trust Score
 */

// ── Вспомогательные функции ────────────────────────────────────────────────

/** Возвращает название достижения по количеству завершённых проектов */
function getAchievementByProjectCount(count: number): string | null {
  if (count >= 10) return 'Эксперт';
  if (count >= 5)  return 'Активист';
  if (count >= 1)  return 'Новичок';
  return null;
}

/**
 * Рассчитывает рейтинг надёжности волонтёра (Trust Score).
 * Формула: (процент задач в срок * 0.6) + (средняя оценка / 5 * 100 * 0.4) - штраф за отказы
 */
function calculateTrustScore(
  completedOnTime: number,
  totalTasks: number,
  averageRating: number,
  cancellations: number
): number {
  if (totalTasks === 0) return 0;
  const onTimeRate = (completedOnTime / totalTasks) * 100;
  const ratingScore = (averageRating / 5) * 100;
  const penalty = cancellations * 5;
  const score = onTimeRate * 0.6 + ratingScore * 0.4 - penalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Проверяет, истёк ли срок действия партнёрской награды */
function isRewardExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// ── Тесты ──────────────────────────────────────────────────────────────────

describe('Сценарий 6. Функция getAchievementByProjectCount()', () => {
  test('0 проектов — достижение не выдаётся', () => {
    expect(getAchievementByProjectCount(0)).toBeNull();
  });

  test('1 проект — выдаётся достижение "Новичок"', () => {
    expect(getAchievementByProjectCount(1)).toBe('Новичок');
  });

  test('3 проекта — остаётся "Новичок"', () => {
    expect(getAchievementByProjectCount(3)).toBe('Новичок');
  });

  test('5 проектов — выдаётся достижение "Активист"', () => {
    expect(getAchievementByProjectCount(5)).toBe('Активист');
  });

  test('10 проектов — выдаётся достижение "Эксперт"', () => {
    expect(getAchievementByProjectCount(10)).toBe('Эксперт');
  });
});

describe('Сценарий 7. Функция calculateTrustScore()', () => {
  test('Все задачи выполнены в срок, высокий рейтинг — высокий Trust Score', () => {
    const score = calculateTrustScore(10, 10, 5, 0);
    expect(score).toBe(100);
  });

  test('Нет выполненных задач — Trust Score = 0', () => {
    expect(calculateTrustScore(0, 0, 0, 0)).toBe(0);
  });

  test('Половина задач в срок, средний рейтинг, без отказов', () => {
    const score = calculateTrustScore(5, 10, 3, 0);
    // onTimeRate=50, ratingScore=60 → 50*0.6 + 60*0.4 = 30+24 = 54
    expect(score).toBe(54);
  });

  test('Отказы снижают Trust Score', () => {
    const withoutCancellations = calculateTrustScore(10, 10, 5, 0);
    const withCancellations    = calculateTrustScore(10, 10, 5, 3);
    expect(withCancellations).toBeLessThan(withoutCancellations);
  });

  test('Trust Score не может быть отрицательным', () => {
    const score = calculateTrustScore(0, 10, 0, 20);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('Сценарий 8. Функция isRewardExpired()', () => {
  test('Дата в будущем — награда активна', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(isRewardExpired(future)).toBe(false);
  });

  test('Дата в прошлом — награда истекла', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isRewardExpired(past)).toBe(true);
  });
});
