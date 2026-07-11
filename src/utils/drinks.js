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
