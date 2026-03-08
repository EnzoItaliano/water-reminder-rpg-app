import React, { useEffect } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import './src/i18n';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // You can adjust these base values depending on your preferred look.
  // With newer Android edge-to-edge behavior, insets.bottom is > 0 for both!
  // Gesture navigation typically has a small inset (e.g., 16-34 for the handle).
  // 3-button navigation has a larger inset (typically 48 or more for the buttons).
  const isGestureNav = insets.bottom > 0 && insets.bottom < 40;

  // Set these back to normal sizes, or feel free to test with exaggerated values like 200 again!
  const dynamicHeight = isGestureNav ? 50 + insets.bottom : 110;
  const dynamicPaddingBottom = isGestureNav ? 5 + (insets.bottom / 2) : 15;

  return (
    <NavigationContainer theme={MyTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#222', borderBottomWidth: 2, borderBottomColor: '#000' },
          headerTitleStyle: { fontFamily: 'PressStart2P_400Regular', fontSize: 12, color: 'white' },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
          tabBarStyle: {
            backgroundColor: '#222',
            borderTopWidth: 2,
            borderTopColor: '#000',
            paddingBottom: dynamicPaddingBottom,
            paddingTop: 5,
            height: dynamicHeight
          },
          tabBarActiveTintColor: '#3498db',
          tabBarInactiveTintColor: '#aaa',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: t('tabs.title_home'),
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{ marginBottom: 5 }}>{t('tabs.home')}</PixelText>,
            tabBarIcon: () => <PixelText size={16}>🏠</PixelText>,
          }}
        />
        <Tab.Screen
          name="Trophies"
          component={TrophyScreen}
          options={{
            title: t('tabs.title_trophies'),
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{ marginBottom: 5 }}>{t('tabs.trophies')}</PixelText>,
            tabBarIcon: () => <PixelText size={16}>🏆</PixelText>,
          }}
        />
        <Tab.Screen
          name="Store"
          component={StoreScreen}
          options={{
            title: t('tabs.title_store'),
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{ marginBottom: 5 }}>{t('tabs.store')}</PixelText>,
            tabBarIcon: () => <PixelText size={16}>🛒</PixelText>,
          }}
        />
        <Tab.Screen
          name="Config"
          component={ConfigScreen}
          options={{
            title: t('tabs.title_config'),
            tabBarLabel: ({ color }) => <PixelText size={8} color={color} style={{ marginBottom: 5 }}>{t('tabs.config')}</PixelText>,
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
    <SafeAreaProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SafeAreaProvider>
  );
}
