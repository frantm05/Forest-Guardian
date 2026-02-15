import { Camera } from 'expo-camera';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Zkontroluje a vyžádá si oprávnění ke kameře.
 * @returns {Promise<boolean>} - true pokud je oprávnění uděleno
 */
export const requestCameraPermission = async () => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      return true;
    }
    showPermissionAlert('kameře');
    return false;
  } catch (e) {
    console.error('Chyba při žádosti o oprávnění kamery:', e);
    return false;
  }
};

/**
 * Zobrazí alert s možností přesměrování do nastavení.
 * @param {string} permissionName - Název oprávnění pro zobrazení
 */
const showPermissionAlert = (permissionName) => {
  Alert.alert(
    'Oprávnění vyžadováno',
    `Pro správné fungování aplikace potřebujeme přístup k ${permissionName}. Povolte ho prosím v nastavení.`,
    [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Otevřít nastavení', onPress: () => openAppSettings() },
    ]
  );
};

/**
 * Otevře systémové nastavení aplikace.
 */
export const openAppSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};