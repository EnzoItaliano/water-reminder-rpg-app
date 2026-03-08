import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { PixelText } from './PixelText';

export const ActionBtn = ({ title, onPress, color = '#e74c3c', borderColor = '#c0392b', disabled = false, style }) => {
    return (
        <TouchableOpacity
            style={[
                styles.actionBtn,
                { backgroundColor: disabled ? '#7f8c8d' : color, borderBottomColor: disabled ? '#555' : borderColor },
                style
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            <PixelText size={10} style={{ textAlign: 'center' }}>{title}</PixelText>
        </TouchableOpacity>
    );
};

export const IconBtn = ({ icon, onPress }) => {
    return (
        <TouchableOpacity style={styles.iconBtn} onPress={onPress}>
            <PixelText size={16}>{icon}</PixelText>
        </TouchableOpacity>
    );
};

export const SmallBtn = ({ title, onPress }) => {
    return (
        <TouchableOpacity style={styles.smallBtn} onPress={onPress}>
            <PixelText size={8}>{title}</PixelText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        width: '100%',
        padding: 10,
        borderBottomWidth: 4,
        marginBottom: 10,
    },
    iconBtn: {
        padding: 5,
        marginLeft: 10,
    },
    smallBtn: {
        backgroundColor: '#555',
        borderWidth: 1,
        borderColor: '#000',
        padding: 5,
        marginTop: 5,
        alignItems: 'center',
    }
});
