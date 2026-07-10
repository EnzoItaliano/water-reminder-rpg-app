import { pad2, localDateKey, mlToLiters, addIntake, startOfWeek } from '../history';

describe('pad2', () => {
  it('pads single digits', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
});

describe('localDateKey', () => {
  it('formats a local timestamp as YYYY-MM-DD', () => {
    const ts = new Date(2026, 6, 5, 8, 30).getTime(); // July 5 2026, local
    expect(localDateKey(ts)).toBe('2026-07-05');
  });
  it('zero-pads month and day', () => {
    const ts = new Date(2026, 0, 9, 23, 59).getTime(); // Jan 9 2026, local
    expect(localDateKey(ts)).toBe('2026-01-09');
  });
});

describe('mlToLiters', () => {
  it('converts and rounds to one decimal', () => {
    expect(mlToLiters(2000)).toBe(2);
    expect(mlToLiters(1450)).toBe(1.5);
    expect(mlToLiters(0)).toBe(0);
  });
});

describe('addIntake', () => {
  it('adds volume to the correct day', () => {
    const ts = new Date(2026, 6, 5, 8, 0).getTime();
    expect(addIntake({}, ts, 250)).toEqual({ '2026-07-05': 250 });
  });
  it('accumulates same-day volume', () => {
    const ts = new Date(2026, 6, 5, 8, 0).getTime();
    const later = new Date(2026, 6, 5, 20, 0).getTime();
    const first = addIntake({}, ts, 250);
    expect(addIntake(first, later, 250)).toEqual({ '2026-07-05': 500 });
  });
  it('does not mutate the input', () => {
    const input = { '2026-07-05': 250 };
    addIntake(input, new Date(2026, 6, 5, 9, 0).getTime(), 250);
    expect(input).toEqual({ '2026-07-05': 250 });
  });
});

describe('startOfWeek', () => {
  it('returns local midnight on the configured first weekday (Sunday)', () => {
    const now = new Date(2026, 6, 8, 15, 30); // some Wednesday-ish date
    const s = startOfWeek(now, 0);
    expect(s.getDay()).toBe(0);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    const diff = now.getTime() - s.getTime();
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(7 * 24 * 3600 * 1000);
  });
  it('honors Monday as first weekday', () => {
    const now = new Date(2026, 6, 8, 15, 30);
    const s = startOfWeek(now, 1);
    expect(s.getDay()).toBe(1);
  });
});
