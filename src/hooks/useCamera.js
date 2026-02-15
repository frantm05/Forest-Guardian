import { useState, useRef, useCallback } from 'react';
import { useCameraPermissions } from 'expo-camera';

/**
 * Custom hook zapouzdřující veškerou logiku kamery.
 * @returns {object} - Stav a metody kamery
 */
const useCamera = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [flash, setFlash] = useState('off');
  const [isTakingPicture, setIsTakingPicture] = useState(false);

  const toggleFlash = useCallback(() => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  }, []);

  const takePicture = useCallback(async (options = { quality: 0.7 }) => {
    if (!cameraRef.current || isTakingPicture) return null;

    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync(options);
      return photo;
    } catch (e) {
      console.error('Chyba při focení:', e);
      return null;
    } finally {
      setIsTakingPicture(false);
    }
  }, [isTakingPicture]);

  return {
    cameraRef,
    permission,
    requestPermission,
    flash,
    toggleFlash,
    takePicture,
    isTakingPicture,
    isPermissionGranted: permission?.granted ?? false,
  };
};

export default useCamera;