// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/theme';

// Import obrazovek (které vytvoříme níže)
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Stack = createStackNavigator();

/**
 * Hlavní navigátor aplikace.
 * Definuje přechody mezi obrazovkami a nastavení hlavičky.
 */
const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={ROUTES.HOME}
                screenOptions={{
                    headerStyle: {
                        backgroundColor: COLORS.primary,
                    },
                    headerTintColor: COLORS.text.inverse,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    cardStyle: { backgroundColor: COLORS.background }, // Globální pozadí
                }}
            >
                <Stack.Screen
                    name={ROUTES.HOME}
                    component={HomeScreen}
                    options={{ title: 'Forest Guardian' }}
                />
                <Stack.Screen
                    name={ROUTES.CAMERA}
                    component={CameraScreen}
                    options={{ title: 'Nová analýza', headerShown: false }} // Kamera bývá přes celou obrazovku
                />
                <Stack.Screen
                    name={ROUTES.ANALYSIS}
                    component={AnalysisScreen}
                    options={{ title: 'Výsledek detekce' }}
                />
                <Stack.Screen
                    name={ROUTES.HISTORY}
                    component={HistoryScreen}
                    options={{ title: 'Historie nálezů' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;