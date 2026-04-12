import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultStats, isRateLimited } from '../utils/stats';
import { AVAILABLE_MONSTERS } from '../utils/monsters';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

import { NativeModules } from 'react-native';
const { NotificationModule } = NativeModules;

export const GameProvider = ({ children }) => {
    const [stats, setStats] = useState(defaultStats);
    const [loading, setLoading] = useState(true);

    // Load Stats on Mount
    useEffect(() => {
        loadStats();
    }, []);

    // Save Stats logic (debounced or explicit?)
    // For critical actions, we will save explicitly.
    const saveStats = async (newStats) => {
        try {
            await AsyncStorage.setItem('userStats', JSON.stringify(newStats));
            setStats(newStats);
        } catch (e) {
            console.error("Failed to save stats", e);
        }
    };

    const loadStats = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('userStats');
            let savedStats = jsonValue != null ? JSON.parse(jsonValue) : defaultStats;

            // Merge helper to ensure structure updates don't break
            savedStats = { ...defaultStats, ...savedStats };
            if (!savedStats.currentSession) savedStats.currentSession = defaultStats.currentSession;

            // Migration for unlocked monsters
            if (!savedStats.unlockedMonsters) {
                savedStats.unlockedMonsters = ['sand_slime', 'cactus_golem', 'dust_phoenix', 'drought_king'];
            }

            setStats(savedStats);
            checkSessionState(savedStats);
        } catch (e) {
            console.error("Failed to load stats", e);
        } finally {
            setLoading(false);
        }
    };

    // Periodic Check (instead of background worker)
    useEffect(() => {
        const interval = setInterval(() => {
            if (stats.currentSession.status === 'running') {
                checkSessionState(stats);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [stats]);

    const checkSessionState = (currentStats) => {
        if (currentStats.currentSession.status === 'running') {
            const now = Date.now();
            const elapsedMinutes = (now - currentStats.currentSession.startTime) / 60000;

            if (elapsedMinutes > currentStats.currentSession.durationMinutes) {
                // Time Expired -> Lost
                endSession('lost', currentStats);
            }
        }
    };


    const startSession = async (liters, minutes, monsterId) => {
        try {
            const cupSize = stats.cupSizeML || 250;
            const totalCups = Math.ceil((liters * 1000) / cupSize);
            const difficulty = Math.max(1, Math.min(10, totalCups - 3));

            const newStats = { ...stats };
            newStats.currentSession = {
                isActive: true,
                status: 'running',
                startTime: Date.now(),
                durationMinutes: minutes,
                waterGoalML: liters * 1000,
                totalCups: totalCups,
                difficulty: difficulty,
                cupsDrank: 0,
                drinkHistory: [],
                monsterId: monsterId,
                rateLimitWindow: minutes / totalCups
            };
            newStats.lastMonsterId = monsterId;

            await saveStats(newStats);

            // e.g. 60 mins / 4 cups = reminder every 15 mins
            const intervalMinutes = minutes / totalCups;
            const intervalSeconds = Math.floor(intervalMinutes * 60);
            const endTimeMillis = newStats.currentSession.startTime + (minutes * 60 * 1000);

            if (NotificationModule && NotificationModule.startDrinkReminders) {
                NotificationModule.startDrinkReminders(intervalSeconds, endTimeMillis);
            }
        } catch (error) {
            alert("Failed to start session: " + error.message);
        }
    };


    const drinkWater = async () => {
        if (stats.currentSession.status !== 'running') return;

        // Rate Limit
        if (isRateLimited(stats.currentSession.drinkHistory, stats.cupSizeML || 250)) {
            return { success: false, reason: 'limit' };
        }

        const newStats = { ...stats };
        const session = newStats.currentSession;

        session.cupsDrank++;
        session.drinkHistory.push(Date.now());
        const cupSize = stats.cupSizeML || 250;
        newStats.totalWaterDrankML += cupSize;

        if (session.cupsDrank >= session.totalCups) {
            await endSession('won', newStats);
            return { success: true, result: 'won' };
        }

        await saveStats(newStats);
        return { success: true };
    };

    const endSession = async (result, currentStats = stats) => {
        console.log(`Ending session: ${result}`);

        if (NotificationModule && NotificationModule.stopDrinkReminders) {
            NotificationModule.stopDrinkReminders();
        }

        const newStats = { ...currentStats };
        const session = newStats.currentSession;

        session.isActive = false;
        session.status = result;

        if (result === 'won') {
            newStats.sessionsCompleted++;
            newStats.gold = (newStats.gold || 0) + session.difficulty;
            newStats.trophies.push({
                date: Date.now(),
                monsterId: session.monsterId,
                difficulty: session.difficulty,
                monsterIcon: "👹"
            });
        }

        await saveStats(newStats);
    };

    const resetToIdle = async () => {
        if (NotificationModule && NotificationModule.stopDrinkReminders) {
            NotificationModule.stopDrinkReminders();
        }
        const newStats = { ...stats };
        newStats.currentSession = {
            ...defaultStats.currentSession,
            status: 'idle',
            isActive: false
        };
        await saveStats(newStats);
    };

    const buyMonster = async (monsterId, cost) => {
        if (stats.gold >= cost && !stats.unlockedMonsters.includes(monsterId)) {
            const newStats = { ...stats };
            newStats.gold -= cost;
            newStats.unlockedMonsters.push(monsterId);
            await saveStats(newStats);
            return true;
        }
        return false;
    };

    const updateCupSize = async (newSize) => {
        const newStats = { ...stats };
        newStats.cupSizeML = newSize;
        await saveStats(newStats);
    };

    return (
        <GameContext.Provider value={{
            stats,
            loading,
            startSession,
            drinkWater,
            resetToIdle,
            endSession,
            buyMonster,
            updateCupSize,
            availableMonsters: AVAILABLE_MONSTERS
        }}>
            {children}
        </GameContext.Provider>
    );
};
