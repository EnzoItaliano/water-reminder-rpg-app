import { applyDrinkTimestamps } from '../drinks';
import { defaultStats } from '../stats';
import { localDateKey } from '../history';

const base = 1_700_000_000_000;

function runningStats(sessionOverrides = {}) {
  return {
    ...defaultStats,
    cupSizeML: 250,
    dailyIntake: {},
    currentSession: {
      ...defaultStats.currentSession,
      status: 'running',
      isActive: true,
      startTime: base - 1000,
      durationMinutes: 60,
      totalCups: 4,
      cupsDrank: 0,
      drinkHistory: [],
      ...sessionOverrides,
    },
  };
}

describe('applyDrinkTimestamps', () => {
  it('applies a single tap: cup, history, totals and daily intake', () => {
    const result = applyDrinkTimestamps(runningStats(), [base]);
    expect(result.applied).toBe(1);
    expect(result.rejected).toBe(0);
    expect(result.won).toBe(false);
    expect(result.stats.currentSession.cupsDrank).toBe(1);
    expect(result.stats.currentSession.drinkHistory).toEqual([base]);
    expect(result.stats.totalWaterDrankML).toBe(250);
    expect(result.stats.dailyIntake[localDateKey(base)]).toBe(250);
  });

  it('rate-limits the third cup inside the same minute', () => {
    const result = applyDrinkTimestamps(runningStats(), [base, base, base]);
    expect(result.applied).toBe(2);
    expect(result.rejected).toBe(1);
    expect(result.stats.currentSession.cupsDrank).toBe(2);
  });

  it('applies taps spaced beyond the window', () => {
    const result = applyDrinkTimestamps(runningStats(), [base, base + 61_000, base + 122_000]);
    expect(result.applied).toBe(3);
    expect(result.stats.currentSession.cupsDrank).toBe(3);
  });

  it('wins on the final cup and credits extras as water only', () => {
    const result = applyDrinkTimestamps(runningStats({ totalCups: 2 }), [
      base,
      base + 61_000,
      base + 122_000,
    ]);
    expect(result.applied).toBe(3);
    expect(result.rejected).toBe(0);
    expect(result.won).toBe(true);
    expect(result.stats.currentSession.cupsDrank).toBe(2);
    expect(result.stats.totalWaterDrankML).toBe(750);
  });

  it('applies unsorted taps in chronological order', () => {
    const result = applyDrinkTimestamps(runningStats(), [base + 61_000, base]);
    expect(result.stats.currentSession.drinkHistory).toEqual([base, base + 61_000]);
  });

  it('credits water without touching the fight when the session is not running', () => {
    const stats = { ...runningStats(), currentSession: { ...defaultStats.currentSession, status: 'idle' } };
    const result = applyDrinkTimestamps(stats, [base]);
    expect(result.applied).toBe(1);
    expect(result.won).toBe(false);
    expect(result.stats).not.toBe(stats);
    expect(result.stats.totalWaterDrankML).toBe(250);
    expect(result.stats.dailyIntake[localDateKey(base)]).toBe(250);
    expect(result.stats.currentSession.cupsDrank).toBe(stats.currentSession.cupsDrank);
  });

  it('credits taps after the session deadline as water only', () => {
    const stats = runningStats({ startTime: base - 1000, durationMinutes: 60, totalCups: 4 });
    const result = applyDrinkTimestamps(stats, [base - 1000 + 60 * 60000 + 5000]);
    expect(result.applied).toBe(1);
    expect(result.stats.currentSession.cupsDrank).toBe(0);
    expect(result.won).toBe(false);
    expect(result.stats.totalWaterDrankML).toBe(250);
  });

  it('replays a late-consumed final tap inside the window into a win', () => {
    const stats = runningStats({ totalCups: 2, cupsDrank: 1, drinkHistory: [base] });
    const result = applyDrinkTimestamps(stats, [base + 61_000]);
    expect(result.won).toBe(true);
    expect(result.stats.currentSession.cupsDrank).toBe(2);
    expect(result.applied).toBe(1);
  });

  it('returns the same reference for an empty timestamps array', () => {
    const stats = runningStats();
    const result = applyDrinkTimestamps(stats, []);
    expect(result.stats).toBe(stats);
    expect(result.applied).toBe(0);
    expect(result.rejected).toBe(0);
  });

  it('does not mutate the input stats', () => {
    const stats = runningStats();
    applyDrinkTimestamps(stats, [base]);
    expect(stats.currentSession.cupsDrank).toBe(0);
    expect(stats.currentSession.drinkHistory).toEqual([]);
    expect(stats.totalWaterDrankML).toBe(0);
    expect(stats.dailyIntake).toEqual({});
  });
});
