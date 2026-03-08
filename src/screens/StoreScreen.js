import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useGame } from '../context/GameContext';
import { PixelText } from '../components/PixelText';
import { getMonsterImage } from '../utils/images';

export default function StoreScreen() {
    const { stats, availableMonsters, buyMonster } = useGame();
    const unlocked = stats.unlockedMonsters || [];
    const gold = stats.gold || 0;

    const purchasable = availableMonsters.filter(m => !unlocked.includes(m.id));

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <PixelText size={16} color="#f1c40f" style={{ textAlign: 'center', marginBottom: 10 }}>
                💰 MONSTER SHOP 💰
            </PixelText>
            <PixelText style={{ textAlign: 'center', marginBottom: 20 }}>
                GOLD: <PixelText color="#f1c40f">{gold}</PixelText>
            </PixelText>

            <View style={styles.grid}>
                {purchasable.map(monster => {
                    const cost = monster.cost;
                    const canAfford = gold >= cost;
                    const source = getMonsterImage(monster.id, 1);

                    return (
                        <View key={monster.id} style={styles.card}>
                            <Image source={source} style={styles.icon} resizeMode="contain" />
                            <PixelText size={8} style={{ height: 20, textAlign: 'center' }}>{monster.name}</PixelText>
                            <PixelText size={8} color="#f1c40f" style={{ marginVertical: 5 }}>💰 {cost}</PixelText>

                            <TouchableOpacity
                                onPress={() => buyMonster(monster.id, cost)}
                                disabled={!canAfford}
                                style={[styles.btn, { backgroundColor: canAfford ? '#f1c40f' : '#7f8c8d' }]}
                            >
                                <PixelText size={8} color="black">{canAfford ? 'BUY' : 'NEED GOLD'}</PixelText>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Placeholders */}
                {[1, 2, 3].map(i => (
                    <View key={i} style={styles.card}>
                        <View style={[styles.icon, { justifyContent: 'center', alignItems: 'center' }]}>
                            <PixelText size={20} color="#555">?</PixelText>
                        </View>
                        <PixelText size={8} color="#777">Coming Soon</PixelText>
                        <PixelText size={8} color="#555" style={{ marginVertical: 5 }}>---</PixelText>
                        <View style={[styles.btn, { backgroundColor: '#333' }]}>
                            <PixelText size={8} color="#555">LOCKED</PixelText>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#222',
        padding: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    card: {
        width: '45%',
        backgroundColor: '#2a2a2a',
        borderWidth: 2,
        borderColor: '#555',
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    icon: {
        width: 60,
        height: 60,
        marginBottom: 5,
        backgroundColor: '#444',
        borderWidth: 2,
        borderColor: '#000',
    },
    btn: {
        width: '100%',
        padding: 5,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderColor: '#000',
    }
});
