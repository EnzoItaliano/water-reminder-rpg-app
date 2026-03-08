import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { GameProvider } from './src/context/GameContext';
import HomeScreen from './src/screens/HomeScreen';
import TrophyScreen from './src/screens/TrophyScreen';
import StoreScreen from './src/screens/StoreScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import { PixelText } from './src/components/PixelText';
import { TouchableOpacity, NativeModules, Platform, View } from 'react-native';

const { NotificationModule } = NativeModules;

const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#222',
    card: '#222',
    text: '#fff',
    border: '#000',
  },
};

function AppContent() {

  return (
    <NavigationContainer theme={MyTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#222', borderBottomWidth: 2, borderBottomColor: '#000' },
          headerTitleStyle: { fontFamily: 'PressStart2P_400Regular', fontSize: 12, color: 'white' },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
          tabBarStyle: { backgroundColor: '#222', borderTopWidth: 2, borderTopColor: '#000', paddingBottom: 15, paddingTop: 5, height: 70 },
          tabBarActiveTintColor: '#3498db',
          tabBarInactiveTintColor: '#aaa',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'WATER RPG',
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{marginBottom: 5}}>HOME</PixelText>,
            tabBarIcon: () => <PixelText size={16}>🏠</PixelText>,
          }}
        />
        <Tab.Screen
          name="Trophies"
          component={TrophyScreen}
          options={{
            title: 'TROPHIES',
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{marginBottom: 5}}>TROPHIES</PixelText>,
            tabBarIcon: () => <PixelText size={16}>🏆</PixelText>,
          }}
        />
        <Tab.Screen
          name="Store"
          component={StoreScreen}
          options={{
            title: 'STORE',
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{marginBottom: 5}}>STORE</PixelText>,
            tabBarIcon: () => <PixelText size={16}>🛒</PixelText>,
          }}
        />
        <Tab.Screen
          name="Config"
          component={ConfigScreen}
          options={{
            title: 'SETTINGS',
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{marginBottom: 5}}>CONFIG</PixelText>,
            tabBarIcon: () => <PixelText size={16}>⚙️</PixelText>,
          }}
        />
      </Tab.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  useEffect(() => {
    if (Platform.OS === 'android' && NotificationModule && NotificationModule.requestNotificationPermission) {
      NotificationModule.requestNotificationPermission();
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
