## Final-review fixes

Applied all four whole-branch review findings for the Stats-tab feature.

- **Fix 1 (chart overflow)**: `src/screens/StatsScreen.js` — `chartWidth` now subtracts an additional 24px (`chartPanel`'s `borderWidth: 2` + `padding: 10` per side) on top of the container's 20px side padding, so the polyline no longer overflows the panel's right border.

- **Fix 2 (y-axis tick exactness)**:
  - `src/utils/chartGeometry.js` — `niceCeil` now floors at 500 ml for any input `<= 500` (was only `<= 0`), so small maxima (e.g. 100, 200, 499 ml) round up to 500 ml instead of stopping short. Comment updated to state the axis floors at 500 ml.
  - `src/components/LineChart.js` — `TICK_COUNT` raised from 4 to 5, so with `niceMax` always one of {500, 1000, 2000, 5000, ...}, each tick step (`niceMax / 5`) lands on an exact 0.1 L multiple.
  - Added unit tests in `src/utils/__tests__/chartGeometry.test.js`: a `niceCeil` case covering 100/200/499 ml flooring to 500, and a `computeChartGeometry` case asserting `niceMax === 500` and `yTicks` liters `[0, 0.1, 0.2, 0.3, 0.4, 0.5]` for a single 250 ml point with `tickCount: 5`.

- **Fix 3 (double Date.now())**: `src/context/GameContext.js`, in `drinkWater()` — hoisted `const now = Date.now();` above `session.drinkHistory.push(...)` and reused it in the `addIntake(...)` call, so a single timestamp represents one drink event.

- **Fix 4 (x-label offset)**: `src/components/LineChart.js` — x-axis label `top` changed from the magic `height - 14` to `height - PAD_BOTTOM + 10`, which evaluates to the same value today (`PAD_BOTTOM = 24` → `height - 14`) but now tracks `PAD_BOTTOM` if it ever changes.

### Test command and output

```
npm test -- --ci
```

```
PASS src/utils/__tests__/stats.test.js
PASS src/utils/__tests__/history.test.js
PASS src/utils/__tests__/chartGeometry.test.js
PASS src/utils/__tests__/smoke.test.js

Test Suites: 4 passed, 4 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        1.554 s
Ran all test suites.
```

25/25 tests passed (23 existing + 2 new), pristine output, no warnings or failures.
