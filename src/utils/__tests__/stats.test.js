import { defaultStats, isRateLimited } from '../stats';

describe('defaultStats', () => {
  it('includes an empty dailyIntake map', () => {
    expect(defaultStats.dailyIntake).toEqual({});
  });
  it('defaults the week to start on Sunday', () => {
    expect(defaultStats.weekStartsOn).toBe(0);
  });
});

describe('isRateLimited', () => {
  const base = 1_700_000_000_000;

  it('rejects a third 250ml cup inside the 1-minute window, evaluated at `at`', () => {
    const history = [base - 30_000, base - 20_000];
    expect(isRateLimited(history, 250, 1, 500, base)).toBe(true);
  });

  it('allows drinking again once the window has passed', () => {
    const history = [base - 30_000, base - 20_000];
    expect(isRateLimited(history, 250, 1, 500, base + 61_000)).toBe(false);
  });

  it('allows the first two 250ml cups', () => {
    expect(isRateLimited([], 250, 1, 500, base)).toBe(false);
    expect(isRateLimited([base - 10_000], 250, 1, 500, base)).toBe(false);
  });
});
