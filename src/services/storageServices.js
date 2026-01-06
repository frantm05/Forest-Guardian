// src/services/storageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@forest_guardian_history';

/**
 * Načte celou historii detekcí.
 */
export const getHistory = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Chyba při načítání historie:', e);
        return [];
    }
};

/**
 * Uloží nový výsledek detekce.
 * @param {object} newRecord 
 */
export const saveRecord = async (newRecord) => {
    try {
        const currentHistory = await getHistory();
        // Přidáme nové na začátek pole
        const updatedHistory = [
            { id: Date.now().toString(), date: new Date().toISOString(), ...newRecord },
            ...currentHistory
        ];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
        console.error('Chyba při ukládání:', e);
    }
};

/**
 * Vymaže celou historii (pro debug nebo úklid).
 */
export const clearHistory = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error(e);
    }
};