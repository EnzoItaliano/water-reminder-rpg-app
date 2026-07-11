// Pure drink-application logic shared by the in-app button and the
// notification "Drink" action (no React/RN imports).
import { isRateLimited } from './stats';
import { addIntake } from './history';

// Applies drink taps (epoch-millis timestamps) in chronological order.
// Every tap that passes the volume rate limit is credited as water drunk
// (totals + daily intake). A tap additionally counts toward the session's
// fight when the session is running, the tap happened inside the session
// window, and cups remain — so a final tap made in time still wins the
// fight even when it is consumed after the deadline. Never mutates the
// input. Returns { stats, applied, rejected, won }: `applied` = taps
// credited as water, `rejected` = rate-limited taps, `won` = the session
// reached its final cup. `stats` is the input reference only when
// `timestamps` is empty.
export function applyDrinkTimestamps(stats, timestamps) {
    if (timestamps.length === 0) {
        return { stats, applied: 0, rejected: 0, won: false };
    }

    const session = stats.currentSession;
    const sessionRunning = session.status === 'running';
    const sessionEndTime = session.startTime + session.durationMinutes * 60000;
    const cupSize = stats.cupSizeML || 250;

    const newSession = { ...session, drinkHistory: [...session.drinkHistory] };
    const newStats = { ...stats, currentSession: newSession };
    // Rate limiting sees every credited tap, whether or not it joined the fight.
    const history = [...newSession.drinkHistory];
    let applied = 0;

    for (const ts of [...timestamps].sort((a, b) => a - b)) {
        if (isRateLimited(history, cupSize, undefined, undefined, ts)) continue;
        history.push(ts);
        newStats.totalWaterDrankML += cupSize;
        newStats.dailyIntake = addIntake(newStats.dailyIntake || {}, ts, cupSize);
        applied++;
        if (sessionRunning && ts <= sessionEndTime && newSession.cupsDrank < newSession.totalCups) {
            newSession.cupsDrank++;
            newSession.drinkHistory.push(ts);
        }
    }

    return {
        stats: newStats,
        applied,
        rejected: timestamps.length - applied,
        won: sessionRunning && newSession.cupsDrank >= newSession.totalCups,
    };
}
