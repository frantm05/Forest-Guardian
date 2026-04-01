/**
 * @module AppNavigator
 * @description Stack navigator configuration with theme-aware card styles and screen transitions.
 */
import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

import { ROUTES } from '../constants/routes';
import { useSettings } from '../context/SettingsContext';

import LoadingScreen from '../screens/LoadingScreen';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { colors, settings } = useSettings();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.LOADING}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
          ...TransitionPresets.SlideFromRightIOS,
        }}
      >
        <Stack.Screen 
          name={ROUTES.LOADING} 
          component={LoadingScreen}
          options={{ gestureEnabled: false }}
        />
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