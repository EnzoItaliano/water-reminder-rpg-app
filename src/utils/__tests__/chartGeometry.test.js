import { niceCeil, computeChartGeometry } from '../chartGeometry';

describe('niceCeil', () => {
  it('floors empty data to 500 ml', () => {
    expect(niceCeil(0)).toBe(500);
  });
  it('rounds up to nice 1/2/5 values', () => {
    expect(niceCeil(500)).toBe(500);
    expect(niceCeil(1500)).toBe(2000);
    expect(niceCeil(2000)).toBe(2000);
    expect(niceCeil(2100)).toBe(5000);
  });
  it('floors small maxima to 500 ml so tick labels stay exact', () => {
    expect(niceCeil(100)).toBe(500);
    expect(niceCeil(200)).toBe(500);
    expect(niceCeil(499)).toBe(500);
  });
});

const opts = {
  width: 100, height: 100,
  padTop: 0, padBottom: 0, padLeft: 0, padRight: 0,
  tickCount: 2,
};

describe('computeChartGeometry', () => {
  it('maps points to a 0-baseline polyline', () => {
    const g = computeChartGeometry(
      [{ label: 'a', ml: 0 }, { label: 'b', ml: 1000 }],
      opts
    );
    expect(g.niceMax).toBe(1000);
    expect(g.line).toBe('0,100 100,0');
    expect(g.dots).toEqual([{ x: 0, y: 100 }, { x: 100, y: 0 }]);
    expect(g.yTicks.length).toBe(3);
    expect(g.yTicks[0]).toEqual({ y: 100, liters: 0 });
    expect(g.yTicks[2]).toEqual({ y: 0, liters: 1 });
  });

  it('centers a single point', () => {
    const g = computeChartGeometry([{ label: 'x', ml: 500 }], opts);
    expect(g.dots[0].x).toBe(50);
  });

  it('excludes empty labels from xLabels', () => {
    const g = computeChartGeometry(
      [{ label: 'keep', ml: 100 }, { label: '', ml: 200 }],
      opts
    );
    expect(g.xLabels).toEqual([{ x: 0, label: 'keep' }]);
  });

  it('returns empty geometry for no points', () => {
    const g = computeChartGeometry([], opts);
    expect(g.line).toBe('');
    expect(g.dots).toEqual([]);
  });

  it('produces tick liters that are exact 0.1 multiples with 5 ticks', () => {
    const g = computeChartGeometry([{ label: 'a', ml: 250 }], { ...opts, tickCount: 5 });
    expect(g.niceMax).toBe(500);
    expect(g.yTicks.map((t) => t.liters)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });
});
