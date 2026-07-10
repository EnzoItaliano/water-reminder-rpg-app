import { mlToLiters } from './history';

// Round up to the next "nice" 1/2/5 x 10^n value. The axis floors at 500 ml.
export function niceCeil(ml) {
  if (ml <= 500) return 500;
  const pow = Math.pow(10, Math.floor(Math.log10(ml)));
  const frac = ml / pow;
  let niceFrac;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 5) niceFrac = 5;
  else niceFrac = 10;
  return niceFrac * pow;
}

export function computeChartGeometry(points, opts) {
  const { width, height, padTop, padBottom, padLeft, padRight, tickCount } = opts;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxMl = points.reduce((m, p) => Math.max(m, p.ml), 0);
  const niceMax = niceCeil(maxMl);

  const n = points.length;
  const xAt = (i) => (n === 1 ? padLeft + plotW / 2 : padLeft + (plotW * i) / (n - 1));
  const yAt = (ml) => padTop + plotH * (1 - ml / niceMax);

  const dots = points.map((p, i) => ({ x: xAt(i), y: yAt(p.ml) }));
  const line = dots.map((d) => `${d.x},${d.y}`).join(' ');

  const xLabels = [];
  points.forEach((p, i) => {
    if (p.label) xLabels.push({ x: xAt(i), label: p.label });
  });

  const yTicks = [];
  for (let t = 0; t <= tickCount; t++) {
    const value = (niceMax * t) / tickCount;
    yTicks.push({ y: padTop + plotH * (1 - t / tickCount), liters: mlToLiters(value) });
  }

  return { line, dots, yTicks, xLabels, niceMax };
}
