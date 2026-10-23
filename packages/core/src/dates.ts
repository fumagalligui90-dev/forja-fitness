/** Utilitários de data sensíveis a fuso horário (o servidor recebe o fuso do cliente). */

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "YYYY-MM-DD" do instante `date` no fuso `tz`. */
export function localDateKey(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts; // en-CA já formata como YYYY-MM-DD
}

/** Dia da semana (0 = domingo) do instante `date` no fuso `tz`. */
export function localWeekday(date: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Sequência de dias consecutivos com treino concluído, terminando hoje ou
 * ontem (não zera a sequência só porque o usuário ainda não treinou hoje).
 */
export function trainingStreak(dayKeys: Iterable<string>, todayKey: string): number {
  const days = new Set(dayKeys);
  let cursor = days.has(todayKey) ? todayKey : shiftKey(todayKey, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}

/** Idade completa em anos numa data de referência. */
export function ageOn(birthDate: string, ref: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  let age = ref.getUTCFullYear() - y;
  const beforeBirthday =
    ref.getUTCMonth() + 1 < m || (ref.getUTCMonth() + 1 === m && ref.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}
