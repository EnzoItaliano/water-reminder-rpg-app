import { defaultStats } from '../stats';

describe('defaultStats', () => {
  it('includes an empty dailyIntake map', () => {
    expect(defaultStats.dailyIntake).toEqual({});
  });
  it('defaults the week to start on Sunday', () => {
    expect(defaultStats.weekStartsOn).toBe(0);
  });
});
