/**
 * @module fileServices
 * @description Local file system operations for image storage, resizing, and cleanup.
 */
import { File, Directory, Paths } from 'expo-file-system/next';

const IMAGES_DIR_NAME = 'forest_guardian';

/**
 * Returns a reference to the images directory, creating it if necessary.
 * @returns {Directory}
 */
const getImagesDirectory = () => {
  const dir = new Directory(Paths.document, IMAGES_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
};

/**
 * Copies a temporary camera image to persistent local storage.
 * @param {string} uri - Temporary photo URI from the camera
 * @returns {Promise<string>} Permanent file path
 */
export const saveImageLocally = async (uri) => {
  try {
    const dir = getImagesDirectory();
    const filename = `img_${Date.now()}.jpg`;
    const sourceFile = new File(uri);
    const destination = new File(dir, filename);
    sourceFile.copy(destination);
    return destination.uri;
  } catch (e) {
    console.error('Failed to save image:', e);
    return uri;
  }
};

/**
 * Deletes an image from local storage.
 * @param {string} uri - File path to delete
 */
export const deleteImage = async (uri) => {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.error('Failed to delete image:', e);
  }
};

/**
 * Calculates total storage used by saved images (in MB).
 * @returns {Promise<number>}
 */
export const getStorageUsedMB = async () => {
  try {
    const dir = getImagesDirectory();
    const files = dir.list();
    let totalBytes = 0;
    for (const item of files) {
      if (item instanceof File && item.exists) {
        totalBytes += item.size || 0;
      }
    }
    return Math.round(totalBytes / (1024 * 1024));
  } catch (e) {
    console.error('Failed to read storage size:', e);
    return 0;
  }
};

/**
 * Deletes all saved images and recreates the empty directory.
 */
export const clearAllImages = async () => {
  try {
    const dir = new Directory(Paths.document, IMAGES_DIR_NAME);
    if (dir.exists) {
      dir.delete();
    }
    // Recreate empty directory
    getImagesDirectory();
  } catch (e) {
    console.error('Failed to clear all images:', e);
  }
};