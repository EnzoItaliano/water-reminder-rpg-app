import React, { useState, useEffect } from 'react';
import { isRateLimited } from '../utils/stats';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useGame } from '../context/GameContext';
import { PixelText } from '../components/PixelText';
import { ActionBtn, SmallBtn } from '../components/Buttons';
import { Bar } from '../components/Bar';
import { useTranslation } from 'react-i18next';
import { MonsterSprite } from '../components/MonsterSprite';

export default function HomeScreen({ navigation }) {
    const { t } = useTranslation();
    const { stats, startSession, drinkWater, resetToIdle, endSession, availableMonsters } = useGame();
    const session = stats.currentSession;

    // Config State
    const [liters, setLiters] = useState("1.0");
    const [hours, setHours] = useState("4.0");
    const [selectedMonsterIdx, setSelectedMonsterIdx] = useState(0);

    const cupSizeL = (stats.cupSizeML || 250) / 1000;

    // Sync selected monster with session or default
    useEffect(() => {
        if (session.status === 'idle') {
            // Find last monster or default
            const lastId = stats.lastMonsterId;
            const idx = availableMonsters.findIndex(m => m.id === lastId);
            if (idx !== -1) setSelectedMonsterIdx(idx);
        }
    }, [session.status, stats.lastMonsterId, availableMonsters]);

    // Timer Tick for UI updates
    const [_, setTick] = useState(0);
    useEffect(() => {
        let interval;
        if (session.status === 'running') {
            interval = setInterval(() => {
                setTick(t => t + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [session.status]);

    // Helpers
    const getCurrentMonster = () => availableMonsters[selectedMonsterIdx];

    // Filter accessible monsters for chooser (based on unlocked)
    // Actually the chooser logic in extension allows scrolling through ALL available or just Unlocked?
    // Extension: "getUnlockedMonsters".
    const unlockedMonsters = availableMonsters.filter(m => stats.unlockedMonsters.includes(m.id));

    // We need to manage index relative to UNLOCKED list for the chooser.
    const [chooserIndex, setChooserIndex] = useState(0);

    useEffect(() => {
        // When unlocked list changes or initial load, set chooser index to match selectedMonsterIdx
        // But selectedMonsterIdx is index in ALL monsters.
        // We need to find the current monster in the unlocked list.
        const currentM = availableMonsters[selectedMonsterIdx];
        const idx = unlockedMonsters.findIndex(m => m.id === currentM.id);
        if (idx !== -1) setChooserIndex(idx);
        else setChooserIndex(0);
    }, [selectedMonsterIdx, unlockedMonsters.length]);

    const handlePrevMonster = () => {
        let newIdx = chooserIndex - 1;
        if (newIdx < 0) newIdx = unlockedMonsters.length - 1;
        setChooserIndex(newIdx);
        // Upate global selection
        const m = unlockedMonsters[newIdx];
        const globalIdx = availableMonsters.findIndex(am => am.id === m.id);
        setSelectedMonsterIdx(globalIdx);
    };

    const handleNextMonster = () => {
        let newIdx = chooserIndex + 1;
        if (newIdx >= unlockedMonsters.length) newIdx = 0;
        setChooserIndex(newIdx);
        const m = unlockedMonsters[newIdx];
        const globalIdx = availableMonsters.findIndex(am => am.id === m.id);
        setSelectedMonsterIdx(globalIdx);
    };

    // Duration Input Mode
    const [inputMode, setInputMode] = useState('duration'); // 'duration' or 'endTime'

    const formatEndTime = (hoursVal) => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + hoursVal * 60);
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    };

    // Derived Display Values
    const lVal = parseFloat(liters) || 0;
    const hVal = parseFloat(hours) || 0;
    const cupSizeML = stats.cupSizeML || 250;
    const cups = Math.ceil((lVal * 1000) / cupSizeML);
    const difficulty = Math.max(1, Math.min(10, cups - 3));

    // Render Views
    if (session.status === 'running') {
        const now = Date.now();
        const elapsed = now - session.startTime;
        const remaining = (session.durationMinutes * 60 * 1000) - elapsed;
        const minutesLeft = Math.floor(Math.max(0, remaining) / 60000);
        const secondsLeft = Math.floor((Math.max(0, remaining) % 60000) / 1000);

        const timePercent = Math.max(0, (remaining / (session.durationMinutes * 60 * 1000)) * 100);
        const waterPercent = Math.min(100, (session.cupsDrank / session.totalCups) * 100);
        const monsterPercent = 100 - waterPercent;

        const rateLimited = isRateLimited(session.drinkHistory, stats.cupSizeML || 250);

        return (
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.battleScene}>
                    <MonsterSprite monsterId={session.monsterId} difficulty={session.difficulty} />
                    <Bar percentage={monsterPercent} color="#e74c3c" />
                </View>

                        <View style={styles.statsRow}>
                            <PixelText>{t('home.timeLeft')}</PixelText>
                            <PixelText size={14} style={{ marginVertical: 5 }}>{minutesLeft}:{secondsLeft.toString().padStart(2, '0')}</PixelText>
                            <Bar percentage={timePercent} color="#3498db" />
                        </View>

                        <View style={styles.statsRow}>
                            <PixelText>{t('home.waterDrank')}</PixelText>
                            <PixelText size={14} style={{ marginVertical: 5 }}>{t('home.cupsProgress', { drank: session.cupsDrank, total: session.totalCups })}</PixelText>
                            <Bar percentage={waterPercent} color="#00cec9" />
                        </View>

                        <ActionBtn 
                            title={rateLimited ? t('home.cooldown') : t('home.drinkWater')} 
                            onPress={rateLimited ? () => {} : drinkWater} 
                            color={rateLimited ? "#7f8c8d" : "#3498db"} 
                            borderColor={rateLimited ? "#555" : "#2980b9"} 
                        />
                <SmallBtn title={t('home.giveUp')} onPress={() => endSession('lost')} />
                {/* Note: endSession('lost') records a loss and clears alarms, matching the extension logic */}
            </ScrollView>
        );
    }

    if (session.status === 'won' || session.status === 'lost') {
        const isWon = session.status === 'won';
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <PixelText size={16} color={isWon ? "#f1c40f" : "#c0392b"} style={{ marginBottom: 20, textAlign: 'center' }}>
                    {isWon ? t('home.victory') : t('home.defeat')}
                </PixelText>
                <PixelText style={{ textAlign: 'center', color: '#aaa', marginBottom: 20 }}>
                    {isWon ? t('home.victoryMsg') : t('home.defeatMsg')}
                </PixelText>
                <ActionBtn title={isWon ? t('home.claimTrophy') : t('home.tryAgain')} onPress={resetToIdle} />
            </View>
        );
    }

    // Config View
    const displayedMonster = unlockedMonsters[chooserIndex] || availableMonsters[0];

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <PixelText style={{ textAlign: 'center', marginBottom: 20, color: '#44bd32' }}>{t('home.startSession')}</PixelText>

            <View style={styles.groupContainer}>
                <View style={{ marginBottom: 10 }}>
                    <PixelText size={8} color="#bdc3c7">
                        {t('home.waterGoal')}
                    </PixelText>
                </View>
                <View style={styles.durationChooser}>
                    <SmallBtn title="-" onPress={() => setLiters(prev => {
                        const val = parseFloat(prev) || 0;
                        return Math.max(cupSizeL, val - cupSizeL).toFixed(2);
                    })} />
                    <PixelText style={{ fontSize: 10, flex: 1, textAlign: 'center' }}>
                        {parseFloat(liters).toFixed(2)} L
                    </PixelText>
                    <SmallBtn title="+" onPress={() => setLiters(prev => {
                        const val = parseFloat(prev) || 0;
                        return (val + cupSizeL).toFixed(2);
                    })} />
                </View>
            </View>

            <View style={styles.chooser}>
                <SmallBtn title="<" onPress={handlePrevMonster} />
                <View style={{ alignItems: 'center' }}>
                    <View style={styles.preview}>
                        <MonsterSprite monsterId={displayedMonster.id} difficulty={difficulty} size={90} />
                    </View>
                    <PixelText size={8} color="#bdc3c7" style={{ marginTop: 5 }}>{displayedMonster.name}</PixelText>
                </View>
                <SmallBtn title=">" onPress={handleNextMonster} />
            </View>

            {/* Duration Input Group matching extension style */}
            <View style={styles.groupContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <PixelText size={8} color="#bdc3c7" style={{ marginBottom: 0 }}>
                        {inputMode === 'duration' ? t('home.durationHours') : t('home.endTime')}
                    </PixelText>
                    <SmallBtn
                        title={t('home.switch')}
                        onPress={() => setInputMode(prev => prev === 'duration' ? 'endTime' : 'duration')}
                    />
                </View>
                <View style={styles.durationChooser}>
                    <SmallBtn title="-" onPress={() => setHours(prev => {
                        const val = parseFloat(prev);
                        return Math.max(1.0, val - 0.5).toFixed(1);
                    })} />
                    <PixelText style={{ fontSize: 10, flex: 1, textAlign: 'center' }}>
                        {inputMode === 'duration'
                            ? `${String(Math.floor(parseFloat(hours))).padStart(2, '0')}:${(parseFloat(hours) % 1 === 0) ? '00' : '30'}`
                            : formatEndTime(parseFloat(hours))}
                    </PixelText>
                    <SmallBtn title="+" onPress={() => setHours(prev => {
                        const val = parseFloat(prev);
                        return (val + 0.5).toFixed(1);
                    })} />
                </View>
            </View>

            <View style={styles.infoRow}>
                <PixelText>{t('home.cups')} <PixelText color="#f1c40f">{cups}</PixelText></PixelText>
                <PixelText>{t('home.diff')} <PixelText color="#f1c40f">{difficulty}</PixelText></PixelText>
            </View>

            <ActionBtn
                title={t('home.fightMonster')}
                onPress={() => startSession(lVal, hVal * 60, displayedMonster.id)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#222',
        padding: 20,
    },
    chooser: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderWidth: 2,
        borderColor: '#000',
        padding: 10,
        marginBottom: 10,
    },
    preview: {
        width: 100,
        height: 100,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    battleScene: {
        alignItems: 'center',
        marginBottom: 20,
    },
    statsRow: {
        marginBottom: 15,
    },
    groupContainer: {
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: '#000',
        padding: 10,
        marginBottom: 10,
    },
    groupLabel: {
        marginBottom: 10,
    },
    durationChooser: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#555',
        padding: 5,
    }
});
