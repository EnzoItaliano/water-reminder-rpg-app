# Clickable Notification + "Drink" Action Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reminder notifications tappable (opens the app) and add a "Drink" action button that logs a cup of water without opening the app.

**Architecture:** All game logic (cup counting, rate limiting, win detection) lives in JS (`GameContext`), so the native side only *records* drink taps and hands them to JS. The Kotlin `NotificationService` gets a content `PendingIntent` (tap → launch app) and a "Drink" action whose `PendingIntent` fires back into the already-running foreground service. The service appends the tap timestamp to a SharedPreferences queue, pings JS in real time via a device event (the JS thread keeps running in the background while the foreground service holds the process alive), dismisses the reminder, and shows a toast. JS consumes the queue atomically (read-and-clear) on the event, on app resume, and after initial load — so drinks count even if the tap happened while the app process was dead, and the two delivery paths can never double-count. Timestamps (not a counter) are queued so rate limiting and the daily-intake history use the real tap time.

**Tech Stack:** Expo SDK 54 / React Native 0.81.5 (new architecture, bridgeless), Kotlin Android foreground service, jest-expo for JS unit tests.

## Global Constraints

- New architecture is enabled: talk to JS from native via `ReactHost.currentReactContext` + `emitDeviceEvent` — do NOT use the old `reactInstanceManager` bridge APIs.
- Kotlin sources exist in two synced copies: `plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/` (source of truth, copied by `plugins/withNotificationModule.js` at prebuild) and `android/app/src/main/java/com/enzod/waterreminderrpg/` (committed build tree). Every Kotlin change: edit the plugin copy, then sync it byte-identical to the `android/` copy with `Copy-Item`.
- Notification IDs are fixed by existing code: `1001` sticky foreground, `1` drink reminder, `2` session failed. Channel id: `"fight_channel"`.
- Notification strings are hardcoded English in Kotlin (existing convention) — keep the new "Drink" label and toast in English.
- Event name: `"onNotificationDrink"`. SharedPreferences file: `"notification_drinks"`, key `"pending"`, value: JSON array of epoch-millis.
- Tests: `npm test` (jest-expo preset, node env, matches `**/__tests__/**/*.test.js`). Dev machine is Windows — use PowerShell / `gradlew.bat`.
- Per project CLAUDE.md: after all code changes, run `graphify update .`.

---

### Task 1: `isRateLimited` accepts an evaluation timestamp

The rate limiter currently hardcodes `Date.now()`. Queued notification taps must be evaluated at their *real* tap time, so the function needs an `at` parameter (defaulting to `Date.now()` to preserve existing callers).

**Files:**
- Modify: `src/utils/stats.js:30-42`
- Test: `src/utils/__tests__/stats.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `isRateLimited(drinkHistory: number[], cupSizeML: number, windowMinutes = 1, maxVolumePerWindow = 500, at = Date.now()): boolean` — used by Task 2.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/__tests__/stats.test.js` (also extend the import on line 1):

```js
import { defaultStats, isRateLimited } from '../stats';
```

```js
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
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `npm test -- stats.test`
Expected: FAIL — "rejects a third 250ml cup" gets `false` instead of `true` (the current implementation compares against the real `Date.now()`, which is far past `base`).

- [ ] **Step 3: Implement the `at` parameter**

Replace `isRateLimited` in `src/utils/stats.js` with:

```js
// Helper: Check if User is Rate Limited
// Volume based: prevent drinking more than maxVolumePerWindow (e.g. 500ml) in windowMinutes (e.g. 1 min)
// `at` is the moment the drink happens — defaults to now, but queued
// notification taps are evaluated at their original tap time.
export function isRateLimited(drinkHistory, cupSizeML, windowMinutes = 1, maxVolumePerWindow = 500, at = Date.now()) {
    const windowMs = windowMinutes * 60 * 1000;

    // Filter drinks from the last window
    const recentDrinks = drinkHistory.filter(t => t > (at - windowMs));

    // Calculate volume drank in the window
    const recentVolume = recentDrinks.length * cupSizeML;

    // Reject if taking another drink exceeds the max volume allowed in this window
    return (recentVolume + cupSizeML) > maxVolumePerWindow;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- stats.test`
Expected: PASS (all `stats.test.js` cases).

- [ ] **Step 5: Commit**

```powershell
git add src/utils/stats.js src/utils/__tests__/stats.test.js
git commit -m "feat: allow isRateLimited to evaluate at a given timestamp"
```

---

### Task 2: Pure drink-application util `applyDrinkTimestamps`

Extract the drink-logging logic out of `GameContext.drinkWater` into a pure, unit-testable function that can apply a *batch* of timestamps in one stats update (several queued taps must not overwrite each other through stale React state).

**Files:**
- Create: `src/utils/drinks.js`
- Test: `src/utils/__tests__/drinks.test.js`

**Interfaces:**
- Consumes: `isRateLimited(history, cupSizeML, undefined, undefined, at)` from Task 1 (`src/utils/stats.js`); `addIntake(dailyIntake, timestampMs, ml)` from `src/utils/history.js`.
- Produces: `applyDrinkTimestamps(stats, timestamps: number[]): { stats, applied: number, rejected: number, won: boolean }` — used by Task 3. Returns the *same* `stats` reference when the session is not running; otherwise a new stats object (input never mutated).

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/drinks.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- drinks.test`
Expected: FAIL — "Cannot find module '../drinks'".

- [ ] **Step 3: Implement `src/utils/drinks.js`**

```js
// Pure drink-application logic shared by the in-app button and the
// notification "Drink" action (no React/RN imports).
import { isRateLimited } from './stats';
import { addIntake } from './history';

// Applies drink taps (epoch-millis timestamps) to a stats object in
// chronological order, respecting the volume rate limit at each tap's own
// time. Never mutates the input. Returns:
//   { stats, applied, rejected, won }
// `stats` is the input reference when nothing could apply (session not
// running), otherwise a new object ready for saveStats.
export function applyDrinkTimestamps(stats, timestamps) {
    const session = stats.currentSession;
    if (session.status !== 'running' || timestamps.length === 0) {
        return { stats, applied: 0, rejected: timestamps.length, won: false };
    }

    const cupSize = stats.cupSizeML || 250;
    const newSession = { ...session, drinkHistory: [...session.drinkHistory] };
    const newStats = { ...stats, currentSession: newSession };
    let applied = 0;

    for (const ts of [...timestamps].sort((a, b) => a - b)) {
        if (newSession.cupsDrank >= newSession.totalCups) break;
        if (isRateLimited(newSession.drinkHistory, cupSize, undefined, undefined, ts)) continue;
        newSession.cupsDrank++;
        newSession.drinkHistory.push(ts);
        newStats.totalWaterDrankML += cupSize;
        newStats.dailyIntake = addIntake(newStats.dailyIntake || {}, ts, cupSize);
        applied++;
    }

    return {
        stats: newStats,
        applied,
        rejected: timestamps.length - applied,
        won: newSession.cupsDrank >= newSession.totalCups,
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- drinks.test`
Expected: PASS (all 7 cases).

- [ ] **Step 5: Commit**

```powershell
git add src/utils/drinks.js src/utils/__tests__/drinks.test.js
git commit -m "feat: add pure applyDrinkTimestamps util for batched drink logging"
```

---

### Task 3: Wire `GameContext` to the util and the notification drink queue

`drinkWater` delegates to the new util; a new `consumeNotificationDrinks` pulls queued tap timestamps from the native module (Task 5 implements it — JS guards with an existence check, so order doesn't matter at runtime) and listeners keep it hooked to the device event and app resume.

**Files:**
- Modify: `src/context/GameContext.js`

**Interfaces:**
- Consumes: `applyDrinkTimestamps` (Task 2); `NotificationModule.consumePendingDrinks(): Promise<number[]>` (Task 5); `"onNotificationDrink"` device event (Task 4).
- Produces: unchanged public context API — `drinkWater()` keeps its exact return shape (`undefined` when not running, `{success:false, reason:'limit'}`, `{success:true, result:'won'}`, `{success:true}`).

- [ ] **Step 1: Update imports**

In `src/context/GameContext.js`, change:

```js
import { defaultStats, isRateLimited } from '../utils/stats';
import { addIntake } from '../utils/history';
```

to:

```js
import { defaultStats } from '../utils/stats';
import { applyDrinkTimestamps } from '../utils/drinks';
```

and change:

```js
import { NativeModules } from 'react-native';
```

to:

```js
import { NativeModules, DeviceEventEmitter, AppState } from 'react-native';
```

- [ ] **Step 2: Replace `drinkWater` with `applyDrinks` + thin wrappers**

Replace the entire current `drinkWater` function (the block starting `const drinkWater = async () => {` and ending with its closing `};`) with:

```js
    const applyDrinks = async (timestamps) => {
        if (stats.currentSession.status !== 'running') return;

        const { stats: newStats, applied, won } = applyDrinkTimestamps(stats, timestamps);

        if (applied === 0) {
            return { success: false, reason: 'limit' };
        }

        if (won) {
            await endSession('won', newStats);
            return { success: true, result: 'won' };
        }

        await saveStats(newStats);
        return { success: true };
    };

    const drinkWater = () => applyDrinks([Date.now()]);

    // Pulls tap timestamps queued by the notification "Drink" action.
    // Native clears the queue atomically, so the event / resume / load
    // paths can never double-count the same tap.
    const consumeNotificationDrinks = async () => {
        if (!NotificationModule || !NotificationModule.consumePendingDrinks) return;
        try {
            const timestamps = await NotificationModule.consumePendingDrinks();
            if (timestamps && timestamps.length > 0) {
                await applyDrinks(timestamps);
            }
        } catch (e) {
            console.error("Failed to consume notification drinks", e);
        }
    };
```

- [ ] **Step 3: Register the listeners**

Add this effect right after the existing periodic-check `useEffect` (the one with the 1-second interval). The `loading` guard matters: consuming before stats are loaded would clear the native queue while the in-memory session still looks idle, silently dropping the drinks.

```js
    // Drinks logged from the notification's "Drink" action: consume on load,
    // in real time via the device event, and again whenever the app resumes.
    useEffect(() => {
        if (loading) return;

        consumeNotificationDrinks();

        const drinkSub = DeviceEventEmitter.addListener('onNotificationDrink', consumeNotificationDrinks);
        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') consumeNotificationDrinks();
        });
        return () => {
            drinkSub.remove();
            appStateSub.remove();
        };
    }, [stats, loading]);
```

(Keyed on `stats` like the existing interval effect, so the handlers never close over stale state.)

- [ ] **Step 4: Run the full test suite for regressions**

Run: `npm test`
Expected: PASS — all suites (`stats`, `drinks`, `history`, `chartGeometry`, `smoke`).

- [ ] **Step 5: Commit**

```powershell
git add src/context/GameContext.js
git commit -m "feat: log drinks from notification taps via GameContext"
```

---

### Task 4: `NotificationService.kt` — tap-to-open, Drink action, timestamp queue

All three notifications get a content intent (tap → launch app). The reminder notification gets a "Drink" action that fires a `PendingIntent.getService` back into this service — safe from the background because the notification only exists while the service is already running in the foreground (and a tap on a stale notification still works: notification interaction grants a temporary background-start exemption; the handler then `stopSelf()`s). No activity is started from the action, so Android 12+ trampoline restrictions don't apply.

**Files:**
- Modify: `plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/NotificationService.kt` (then sync to `android/app/src/main/java/com/enzod/waterreminderrpg/NotificationService.kt`)

**Interfaces:**
- Consumes: nothing new.
- Produces: companion functions `NotificationService.queueDrink(context: Context, timestampMs: Long)` and `NotificationService.consumeDrinks(context: Context): List<Long>` (used by Task 5); device event `"onNotificationDrink"` (consumed by Task 3); intent action `"DRINK_WATER"`.

- [ ] **Step 1: Replace the plugin copy with the full new content**

Replace the entire content of `plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/NotificationService.kt` with:

```kotlin
package com.enzod.waterreminderrpg

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.widget.Toast
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import org.json.JSONArray

class NotificationService : Service() {

    companion object {
        private const val DRINK_PREFS = "notification_drinks"
        private const val DRINK_KEY = "pending"

        // Called from the service (main thread) and NotificationModule (RN
        // native-modules thread) — @Synchronized guards the read-modify-write.
        @Synchronized
        fun queueDrink(context: Context, timestampMs: Long) {
            val prefs = context.getSharedPreferences(DRINK_PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(DRINK_KEY, "[]"))
            arr.put(timestampMs)
            prefs.edit().putString(DRINK_KEY, arr.toString()).apply()
        }

        @Synchronized
        fun consumeDrinks(context: Context): List<Long> {
            val prefs = context.getSharedPreferences(DRINK_PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(DRINK_KEY, "[]"))
            prefs.edit().remove(DRINK_KEY).apply()
            return (0 until arr.length()).map { arr.getLong(it) }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var drinkReminderRunnable: Runnable? = null
    private var expireRunnable: Runnable? = null
    private var isServiceRunning = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            when (intent.action) {
                "START_REMINDERS" -> {
                    val intervalInSeconds = intent.getIntExtra("INTERVAL", 60)
                    val endTimeMillis = intent.getLongExtra("END_TIME", 0L)
                    startReminders(intervalInSeconds, endTimeMillis)
                }
                "STOP_REMINDERS" -> {
                    stopReminders()
                    stopSelf()
                }
                "DRINK_WATER" -> {
                    handleDrinkAction()
                    // A tap on a stale notification can start the service
                    // fresh; don't leave it idling in that case.
                    if (!isServiceRunning) stopSelf()
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun openAppPendingIntent(): PendingIntent? {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
        return PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun drinkActionPendingIntent(): PendingIntent {
        val intent = Intent(this, NotificationService::class.java).setAction("DRINK_WATER")
        return PendingIntent.getService(
            this, 1, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun handleDrinkAction() {
        queueDrink(this, System.currentTimeMillis())

        // Wake the JS side immediately if the React context is alive;
        // otherwise the queued timestamp is consumed on next app launch/resume.
        try {
            (application as? ReactApplication)
                ?.reactHost
                ?.currentReactContext
                ?.emitDeviceEvent("onNotificationDrink", null)
        } catch (e: Exception) {
            // JS unavailable — the queue covers it.
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1)
        Toast.makeText(this, "Water logged! 💧", Toast.LENGTH_SHORT).show()
    }

    private fun startReminders(intervalInSeconds: Int, endTimeMillis: Long) {
        if (isServiceRunning) return
        isServiceRunning = true

        createNotificationChannel(this)

        // The foreground service needs an initial sticky notification
        val foregroundNotification: Notification = NotificationCompat.Builder(this, "fight_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Fight is Active!")
            .setContentText("Water reminders are running in the background.")
            .setPriority(NotificationCompat.PRIORITY_LOW) // Make it silent
            .setContentIntent(openAppPendingIntent())
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1001, foregroundNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1001, foregroundNotification)
        }

        expireRunnable = Runnable {
            sendFailedNotification()
            stopReminders()
            stopSelf()
        }

        val delayMillis = endTimeMillis - System.currentTimeMillis()
        if (delayMillis > 0) {
            handler.postDelayed(expireRunnable!!, delayMillis)
        } else {
            handler.post(expireRunnable!!)
        }

        drinkReminderRunnable = object : Runnable {
            override fun run() {
                val builder = NotificationCompat.Builder(this@NotificationService, "fight_channel")
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle("Drink Water!")
                    .setContentText("It's time to drink a cup of water to defeat the monster!")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(openAppPendingIntent())
                    .addAction(0, "Drink", drinkActionPendingIntent())

                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.notify(1, builder.build())

                handler.postDelayed(this, (intervalInSeconds * 1000).toLong())
            }
        }

        handler.postDelayed(drinkReminderRunnable!!, (intervalInSeconds * 1000).toLong())
    }

    private fun sendFailedNotification() {
        val builder = NotificationCompat.Builder(this, "fight_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Session Failed!")
            .setContentText("The monster escaped! You didn't drink enough water in time.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(openAppPendingIntent())

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(2, builder.build())
    }

    private fun stopReminders() {
        drinkReminderRunnable?.let { handler.removeCallbacks(it) }
        expireRunnable?.let { handler.removeCallbacks(it) }
        drinkReminderRunnable = null
        expireRunnable = null
        isServiceRunning = false
        // Drop any reminder still showing so its Drink button can't outlive the session
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            stopForeground(true)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        stopReminders()
        super.onDestroy()
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Fight Notifications"
            val descriptionText = "Notifications during fights"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel("fight_channel", name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
```

- [ ] **Step 2: Sync the committed android copy**

```powershell
Copy-Item plugins\notification-module\android\src\main\java\com\enzod\waterreminderrpg\NotificationService.kt android\app\src\main\java\com\enzod\waterreminderrpg\NotificationService.kt -Force
```

- [ ] **Step 3: Compile check**

Run (from the repo root): `cd android; .\gradlew.bat :app:compileDebugKotlin; cd ..`
Expected: `BUILD SUCCESSFUL`. (First run may take a few minutes.)

- [ ] **Step 4: Commit**

```powershell
git add plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/NotificationService.kt android/app/src/main/java/com/enzod/waterreminderrpg/NotificationService.kt
git commit -m "feat: tappable reminder notification with Drink action"
```

---

### Task 5: `NotificationModule.kt` — expose the queue to JS + content intent on failed notification

**Files:**
- Modify: `plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/NotificationModule.kt` (then sync to `android/app/src/main/java/com/enzod/waterreminderrpg/NotificationModule.kt`)

**Interfaces:**
- Consumes: `NotificationService.consumeDrinks(context): List<Long>` (Task 4 companion).
- Produces: `@ReactMethod consumePendingDrinks(promise: Promise)` resolving a JS `number[]` of epoch-millis — consumed by Task 3.

- [ ] **Step 1: Replace the plugin copy with the full new content**

Replace the entire content of `plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/NotificationModule.kt` with:

```kotlin
package com.enzod.waterreminderrpg

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NotificationModule"
    }

    @ReactMethod
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val context = reactApplicationContext
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                reactApplicationContext.currentActivity?.let { activity ->
                    ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
                }
            }
        }
    }

    @ReactMethod
    fun startDrinkReminders(intervalInSeconds: Int, endTimeMillis: Double) {
        val context = reactApplicationContext

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                // We still schedule it, but the OS might block until permission is granted
            }
        }
        
        val intent = Intent(context, NotificationService::class.java)
        intent.action = "START_REMINDERS"
        intent.putExtra("INTERVAL", intervalInSeconds)
        intent.putExtra("END_TIME", endTimeMillis.toLong())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @ReactMethod
    fun stopDrinkReminders() {
        val context = reactApplicationContext
        val intent = Intent(context, NotificationService::class.java)
        intent.action = "STOP_REMINDERS"
        context.startService(intent) // stopSelf handled inside service
    }

    // Drains the tap timestamps queued by the notification's "Drink" action.
    // Read-and-clear is atomic (synchronized in NotificationService), so the
    // JS event / resume / load paths can never see the same tap twice.
    @ReactMethod
    fun consumePendingDrinks(promise: Promise) {
        try {
            val timestamps = NotificationService.consumeDrinks(reactApplicationContext)
            val result = Arguments.createArray()
            for (ts in timestamps) {
                result.pushDouble(ts.toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("consume_pending_drinks_failed", e)
        }
    }

    @ReactMethod
    fun sendSessionFailedNotification() {
        val context = reactApplicationContext
        createNotificationChannel(context)

        val builder = NotificationCompat.Builder(context, "fight_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Session Failed!")
            .setContentText("The monster escaped! You didn't drink enough water in time.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            val contentIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            builder.setContentIntent(contentIntent)
        }

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // notify(2) for a separate ID
        notificationManager.notify(2, builder.build())
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Fight Notifications"
            val descriptionText = "Notifications during fights"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel("fight_channel", name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
```

- [ ] **Step 2: Sync the committed android copy**

```powershell
Copy-Item plugins\notification-module\android\src\main\java\com\enzod\waterreminderrpg\NotificationModule.kt android\app\src\main\java\com\enzod\waterreminderrpg\NotificationModule.kt -Force
```

- [ ] **Step 3: Compile check**

Run: `cd android; .\gradlew.bat :app:compileDebugKotlin; cd ..`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Commit**

```powershell
git add plugins/notification-module/android/src/main/java/com/enzod/waterreminderrpg/NotificationModule.kt android/app/src/main/java/com/enzod/waterreminderrpg/NotificationModule.kt
git commit -m "feat: expose queued notification drinks to JS"
```

---

### Task 6: End-to-end verification on device + graph update

**Files:**
- Modify: `graphify-out/` (regenerated)

- [ ] **Step 1: Full JS test suite**

Run: `npm test`
Expected: PASS, no regressions.

- [ ] **Step 2: Build and install on a device/emulator**

Run: `npx expo run:android`
Expected: app builds, installs, and launches.

- [ ] **Step 3: Manual scenario walkthrough**

Start a short session (e.g. 0.5 L over ~3 minutes so reminders fire quickly), then:

1. Background the app. When "Drink Water!" appears, **tap its body** → the app comes to the foreground.
2. On the next reminder, **tap "Drink"** → toast "Water logged! 💧" shows, the notification dismisses, the app does *not* open. Reopen the app → `cupsDrank` increased and the stats chart reflects the intake.
3. Swipe the app away from recents while the service is still running, tap "Drink" on the next reminder, then relaunch the app → the queued drink is applied on load.
4. Drink the final cup via the notification button → session ends as won (trophy + gold), the sticky "Fight is Active!" notification disappears, and no reminder lingers.
5. Tap the sticky "Fight is Active!" notification during a session → app opens.

- [ ] **Step 4: Update the knowledge graph**

Run: `graphify update .`
Expected: graph refreshed without API cost (AST-only).

- [ ] **Step 5: Final commit (graph artifacts, if tracked)**

```powershell
git status
git add graphify-out
git commit -m "chore: refresh knowledge graph after notification changes"
```

(Skip the commit if `graphify-out/` shows no changes or is untracked.)
