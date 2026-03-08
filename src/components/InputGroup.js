import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { PixelText } from './PixelText';

export const InputGroup = ({ label, value, onChangeText, placeholder, keyboardType = 'numeric' }) => {
    return (
        <View style={styles.group}>
            <PixelText size={8} color="#bdc3c7" style={styles.label}>{label}</PixelText>
            <TextInput
                style={styles.input}
                value={String(value)}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#555"
                keyboardType={keyboardType}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    group: {
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: '#000',
        padding: 10,
        marginBottom: 10,
    },
    label: {
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#222',
        color: 'white',
        fontFamily: 'PressStart2P_400Regular', // Will be loaded in App.js
        borderWidth: 1,
        borderColor: '#555',
        padding: 5,
        fontSize: 10, // slightly larger for mobile
    },
});
