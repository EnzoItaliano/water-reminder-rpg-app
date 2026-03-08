import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { PixelText } from '../components/PixelText';
import { SmallBtn } from '../components/Buttons';

export default function ConfigScreen() {
    const { stats, updateCupSize } = useGame();
    // Default to 250 if undefined in older saves
    const currentSize = stats.cupSizeML || 250;

    const handleMinus = () => {
        if (currentSize > 100) {
            updateCupSize(currentSize - 50);
        }
    };

    const handlePlus = () => {
        if (currentSize < 500) {
            updateCupSize(currentSize + 50);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.groupContainer}>
                <View style={{ marginBottom: 10 }}>
                    <PixelText size={10} color="#bdc3c7" style={{ textAlign: 'center' }}>
                        CUP SIZE (ML)
                    </PixelText>
                </View>
                <View style={styles.chooser}>
                    <SmallBtn title="-" onPress={handleMinus} />
                    <PixelText style={{ fontSize: 14, flex: 1, textAlign: 'center' }}>
                        {currentSize} ml
                    </PixelText>
                    <SmallBtn title="+" onPress={handlePlus} />
                </View>
            </View>

            <PixelText size={8} color="#7f8c8d" style={{ textAlign: 'center', marginTop: 20, lineHeight: 14 }}>
                This size is used to calculate how many cups you need to drink to reach your daily goal.
            </PixelText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
        padding: 20,
        justifyContent: 'flex-start',
    },
    groupContainer: {
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: '#000',
        padding: 15,
        marginTop: 20,
    },
    chooser: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#555',
        padding: 5,
    }
});
