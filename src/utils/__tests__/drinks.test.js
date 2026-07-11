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

  it('reports a win when the last cup is reached and drops extras', () => {
    const result = applyDrinkTimestamps(runningStats({ totalCups: 2 }), [
      base,
      base + 61_000,
      base + 122_000,
    ]);
    expect(result.applied).toBe(2);
    expect(result.rejected).toBe(1);
    expect(result.won).toBe(true);
  });

  it('applies unsorted taps in chronological order', () => {
    const result = applyDrinkTimestamps(runningStats(), [base + 61_000, base]);
    expect(result.stats.currentSession.drinkHistory).toEqual([base, base + 61_000]);
  });

  it('ignores taps when the session is not running', () => {
    const stats = { ...runningStats(), currentSession: { ...defaultStats.currentSession, status: 'idle' } };
    const result = applyDrinkTimestamps(stats, [base]);
    expect(result.applied).toBe(0);
    expect(result.rejected).toBe(1);
    expect(result.stats).toBe(stats);
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
