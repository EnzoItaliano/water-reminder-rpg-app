import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Bar = ({ percentage, color, height = 15 }) => {
    return (
        <View style={[styles.container, { height }]}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percentage))}%`, backgroundColor: color }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#222',
        borderWidth: 2,
        borderColor: '#000',
        marginBottom: 10,
    },
    fill: {
        height: '100%',
    },
});
