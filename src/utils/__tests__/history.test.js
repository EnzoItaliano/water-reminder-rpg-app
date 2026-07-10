import { pad2, localDateKey, mlToLiters, addIntake, startOfWeek, buildSeries, hasData } from '../history';

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

const WD = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']; // by getDay()
const MO = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
const opts = { weekStartsOn: 0, weekdayInitials: WD, monthInitials: MO };

describe('buildSeries year', () => {
  it('sums each elapsed month and ignores other years', () => {
    const daily = {
      '2025-12-31': 999,
      '2026-01-10': 1000,
      '2026-01-20': 500,
      '2026-03-05': 2000,
    };
    const now = new Date(2026, 2, 15); // March
    const series = buildSeries(daily, 'year', now, opts);
    expect(series).toEqual([
      { key: '2026-01', ml: 1500, label: 'M0' },
      { key: '2026-02', ml: 0, label: 'M1' },
      { key: '2026-03', ml: 2000, label: 'M2' },
    ]);
  });
});

describe('buildSeries month', () => {
  it('emits one point per elapsed day with thinned labels', () => {
    const daily = { '2026-07-01': 1000, '2026-07-03': 500 };
    const now = new Date(2026, 6, 3); // July 3
    const series = buildSeries(daily, 'month', now, opts);
    expect(series).toEqual([
      { key: '2026-07-01', ml: 1000, label: '1' },
      { key: '2026-07-02', ml: 0, label: '' },
      { key: '2026-07-03', ml: 500, label: '3' },
    ]);
  });
});

describe('buildSeries week', () => {
  it('emits one point per elapsed day from week start through today', () => {
    const now = new Date(2026, 6, 8, 12, 0);
    const series = buildSeries({}, 'week', now, opts);
    expect(series.length).toBe(now.getDay() + 1); // Sunday..today inclusive
    expect(series[series.length - 1].key).toBe('2026-07-08');
    expect(series[series.length - 1].label).toBe(WD[now.getDay()]);
  });
});

describe('hasData', () => {
  it('is false when all points are zero', () => {
    expect(hasData([{ ml: 0 }, { ml: 0 }])).toBe(false);
  });
  it('is true when any point has volume', () => {
    expect(hasData([{ ml: 0 }, { ml: 5 }])).toBe(true);
  });
});
