// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/theme';

// Import obrazovek
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.HOME}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#F5F6F4' },
          gestureEnabled: true,
          ...TransitionPresets.SlideFromRightIOS,
        }}
      >
        <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
        <Stack.Screen 
          name={ROUTES.CAMERA} 
          component={CameraScreen} 
          options={{
            ...TransitionPresets.ModalSlideFromBottomIOS,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen name={ROUTES.ANALYSIS} component={AnalysisScreen} />
        <Stack.Screen name={ROUTES.HISTORY} component={HistoryScreen} />
        <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;