import React from 'react';
import { Text } from 'react-native';

export const PixelText = ({ style, children, size = 10, color = 'white' }) => {
    return (
        <Text style={[{ fontFamily: 'PressStart2P_400Regular', fontSize: size, color: color }, style]}>
            {children}
        </Text>
    );
};
