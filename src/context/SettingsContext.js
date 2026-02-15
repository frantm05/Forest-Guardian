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
};

const SettingsContext = createContext(undefined);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Načtení uložených nastavení při startu
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(SETTINGS_KEY);
        if (json) {
          const saved = JSON.parse(json);
          setSettings(prev => ({ ...prev, ...saved }));
        }
      } catch (e) {
        console.error('Chyba při načítání nastavení:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist při každé změně (po inicializaci)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(e =>
      console.error('Chyba při ukládání nastavení:', e)
    );
  }, [settings, loaded]);

  const updateSettings = useCallback((partial) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(async () => {
    setSettings(defaultSettings);
    await AsyncStorage.removeItem(SETTINGS_KEY).catch(() => {});
  }, []);

  // Přeložené labely jazyků
  const languages = [
    { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  const currentLanguage = languages.find(l => l.code === settings.language) || languages[0];

  // Dynamické barvy podle dark mode
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
 * Hook pro přístup k uživatelskému nastavení.
 */
export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings musí být použit uvnitř SettingsProvider');
  return ctx;
};