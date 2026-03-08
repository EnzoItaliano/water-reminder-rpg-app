import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import { getMonsterImage } from '../utils/images';

export const MonsterSprite = ({ monsterId, difficulty, size = 220 }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const source = getMonsterImage(monsterId, difficulty);

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Animated.Image
                source={source}
                style={[
                    styles.image,
                    {
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 220,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
