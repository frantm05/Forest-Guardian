/**
 * @module SettingsContext
 * @description Global settings context providing user preferences, language, theme colors, and persistence via AsyncStorage.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors } from '../constants/theme';

const SETTINGS_KEY = '@forest_guardian_settings';

const defaultSettings = {
  name: 'Matěj Frantík',
  email: 'matej.frantic@email.cz',
  avatarUri: null,
  language: 'cs',
  darkMode: false,
  replicateApiKey: '',
};

const SettingsContext = createContext(undefined);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(SETTINGS_KEY);
        if (json) {
          const saved = JSON.parse(json);
          setSettings(prev => ({ ...prev, ...saved }));
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist settings on every change after initial load
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(e =>
      console.error('Failed to save settings:', e)
    );
  }, [settings, loaded]);

  const updateSettings = useCallback((partial) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(async () => {
    setSettings(defaultSettings);
    await AsyncStorage.removeItem(SETTINGS_KEY).catch(() => {});
  }, []);

  // Available language options
  const languages = [
    { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  const currentLanguage = languages.find(l => l.code === settings.language) || languages[0];

  // Dynamic color palette based on dark mode state
  const colors = getColors(settings.darkMode);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      resetSettings,
      languages,
      currentLanguage,
      loaded,
      colors,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Hook for accessing user settings, theme colors, and language configuration.
 * @returns {{ settings: object, updateSettings: function, resetSettings: function, languages: Array, currentLanguage: object, loaded: boolean, colors: object }}
 */
export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};