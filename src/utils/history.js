// Pure helpers for the Consumption History (no React/RN imports).

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// Device-local calendar day as "YYYY-MM-DD".
export function localDateKey(timestampMs) {
  const d = new Date(timestampMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Millilitres -> litres, rounded to one decimal.
export function mlToLiters(ml) {
  return Math.round(ml / 100) / 10;
}

// Returns a NEW dailyIntake map with `ml` added to the day of `timestampMs`.
export function addIntake(dailyIntake, timestampMs, ml) {
  const key = localDateKey(timestampMs);
  const current = dailyIntake[key] || 0;
  return { ...dailyIntake, [key]: current + ml };
}

// Local midnight of the first day of `now`'s week.
// weekStartsOn: 0 = Sunday, 1 = Monday.
export function startOfWeek(now, weekStartsOn) {
  const diff = (now.getDay() - weekStartsOn + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
}
