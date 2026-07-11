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

function dateKeyFromParts(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

// Build the plotted series for the current week/month/year window.
export function buildSeries(dailyIntake, period, now, options) {
  const { weekStartsOn, weekdayInitials, monthInitials } = options;

  if (period === 'year') {
    const y = now.getFullYear();
    const curMonth = now.getMonth();
    const points = [];
    for (let mo = 0; mo <= curMonth; mo++) {
      const prefix = `${y}-${pad2(mo + 1)}`;
      let ml = 0;
      for (const k in dailyIntake) {
        if (k.slice(0, 7) === prefix) ml += dailyIntake[k];
      }
      points.push({ key: prefix, ml, label: monthInitials[mo] });
    }
    return points;
  }

  if (period === 'month') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = now.getDate();
    const points = [];
    for (let day = 1; day <= today; day++) {
      const key = dateKeyFromParts(y, m, day);
      const showLabel = day === 1 || day % 5 === 0 || day === today;
      points.push({ key, ml: dailyIntake[key] || 0, label: showLabel ? String(day) : '' });
    }
    return points;
  }

  // week
  const start = startOfWeek(now, weekStartsOn);
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const points = [];
  const cursor = new Date(start);
  while (cursor <= todayMid) {
    const key = dateKeyFromParts(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    points.push({ key, ml: dailyIntake[key] || 0, label: weekdayInitials[cursor.getDay()] });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

export function hasData(points) {
  return points.some((p) => p.ml > 0);
}
