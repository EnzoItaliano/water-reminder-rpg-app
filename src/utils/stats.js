export const defaultStats = {
    // Session Data
    currentSession: {
        isActive: false,
        startTime: 0,
        durationMinutes: 0, // Total time allowed
        waterGoalML: 0,
        totalCups: 0,
        cupsDrank: 0,
        drinkHistory: [], // Timestamps of drinks to enforce rate limit
        rateLimitWindow: 5, // Minutes (default, will be overwritten by session calc)
        monsterId: 'sand_slime',
        difficulty: 1,
        status: 'idle' // 'idle', 'running', 'won', 'lost'
    },
    // Persistent Data
    trophies: [], // History of won sessions { date, monsterId, difficulty, monsterIcon }
    totalWaterDrankML: 0,
    sessionsCompleted: 0,
    gold: 0,
    unlockedMonsters: ['sand_slime', 'cactus_golem', 'dust_phoenix', 'drought_king'],
    lastMonsterId: 'sand_slime',
    cupSizeML: 250
};

// Helper: Check if User is Rate Limited
// Volume based: prevent drinking more than maxVolumePerWindow (e.g. 500ml) in windowMinutes (e.g. 1 min)
export function isRateLimited(drinkHistory, cupSizeML, windowMinutes = 1, maxVolumePerWindow = 500) {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Filter drinks from the last window
    const recentDrinks = drinkHistory.filter(t => t > (now - windowMs));

    // Calculate volume drank in the window
    const recentVolume = recentDrinks.length * cupSizeML;

    // Reject if taking another drink exceeds the max volume allowed in this window
    return (recentVolume + cupSizeML) > maxVolumePerWindow;
}
