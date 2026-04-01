/**
 * @module storageServices
 * @description AsyncStorage-backed persistence for detection history records.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@forest_guardian_history';

/**
 * Loads the full detection history array.
 * @returns {Promise<Array>}
 */
export const getHistory = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load history:', e);
        return [];
    }
};

/**
 * Persists a new detection record (prepended to history).
 * @param {object} newRecord
 */
export const saveRecord = async (newRecord) => {
    try {
        const currentHistory = await getHistory();
        const updatedHistory = [
            { id: Date.now().toString(), date: new Date().toISOString(), ...newRecord },
            ...currentHistory
        ];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
        console.error('Failed to save record:', e);
    }
};

/**
 * Deletes a single history record by ID.
 * @param {string} id - Record ID to remove
 */
export const deleteRecord = async (id) => {
    try {
        const currentHistory = await getHistory();
        const updatedHistory = currentHistory.filter(item => item.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
        console.error('Failed to delete record:', e);
    }
};

/**
 * Clears the entire detection history.
 */
export const clearHistory = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('Failed to clear history:', e);
    }
};