import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { useGame } from '../context/GameContext';
import { PixelText } from '../components/PixelText';
import { getMonsterImage } from '../utils/images';
import { useTranslation } from 'react-i18next';

export default function TrophyScreen() {
    const { t } = useTranslation();
    const { stats, availableMonsters } = useGame();

    const LEVELS = [1, 2, 3, 4, 5, 6];

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <PixelText size={16} color="#ffd700" style={{ textAlign: 'center', marginBottom: 20 }}>
                {t('trophies.title')}
            </PixelText>

            {availableMonsters.map(monster => {
                const wins = stats.trophies.filter(t => t.monsterId === monster.id);

                return (
                    <View key={monster.id} style={styles.row}>
                        <View style={styles.header}>
                            <PixelText color="#bdc3c7">{monster.name}</PixelText>
                            <PixelText size={8} color="#7f8c8d">{t('trophies.wins')} {wins.length}</PixelText>
                        </View>
                        <View style={styles.iconsRow}>
                            {LEVELS.map(lvl => {
                                // Difficulty mapping matches UI.js logic
                                const matchesLevel = (difficulty, level) => {
                                    if (level === 1) return difficulty >= 1 && difficulty <= 2;
                                    if (level === 2) return difficulty >= 3 && difficulty <= 4;
                                    if (level === 3) return difficulty >= 5 && difficulty <= 6;
                                    if (level === 4) return difficulty >= 7 && difficulty <= 8;
                                    if (level === 5) return difficulty === 9;
                                    if (level === 6) return difficulty === 10;
                                    return false;
                                };

                                const count = wins.filter(w => matchesLevel(w.difficulty, lvl)).length;
                                const isUnlocked = count > 0;

                                // We need to mock the image source for the level icon
                                // Since we don't have getMonsterImage returning by level index directly (it takes difficulty),
                                // we need to reverse map level to a sample difficulty.
                                const sampleDiff = lvl === 6 ? 10 : (lvl === 5 ? 9 : lvl * 2 - 1);
                                const source = getMonsterImage(monster.id, sampleDiff);

                                return (
                                    <View key={lvl} style={styles.iconWrapper}>
                                        <Image
                                            source={source}
                                            style={[styles.icon, { opacity: isUnlocked ? 1 : 0.3, tintColor: isUnlocked ? undefined : 'gray' }]}
                                            resizeMode="contain"
                                        />
                                        {isUnlocked && (
                                            <View style={styles.badge}>
                                                <PixelText size={8} color="black">{count}</PixelText>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#222',
        padding: 10,
    },
    row: {
        backgroundColor: '#2a2a2a',
        borderWidth: 2,
        borderColor: '#000',
        padding: 10,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        paddingBottom: 5,
    },
    iconsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    iconWrapper: {
        width: 30,
        height: 30,
        position: 'relative',
    },
    icon: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#f1c40f',
        borderRadius: 10,
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    }
});
