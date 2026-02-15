import { File, Directory, Paths } from 'expo-file-system/next';
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGES_DIR_NAME = 'forest_guardian';

/**
 * Získá referenci na složku obrázků a zajistí, že existuje.
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
 * Uloží obrázek do lokálního úložiště a vrátí novou cestu.
 * @param {string} uri - Dočasná URI fotky z kamery
 * @returns {Promise<string>} - Trvalá cesta k souboru
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
    console.error('Chyba při ukládání obrázku:', e);
    return uri;
  }
};

/**
 * Smaže obrázek z lokálního úložiště.
 * @param {string} uri - Cesta k souboru
 */
export const deleteImage = async (uri) => {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.error('Chyba při mazání obrázku:', e);
  }
};

/**
 * Zmenší obrázek pro AI analýzu.
 * @param {string} uri - Cesta k obrázku
 * @param {number} [width=640] - Cílová šířka
 * @returns {Promise<string>} - URI zmenšeného obrázku
 */
export const resizeImageForAnalysis = async (uri, width = 640) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.error('Chyba při resize obrázku:', e);
    return uri;
  }
};

/**
 * Spočítá celkovou velikost uložených obrázků (v MB).
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
    console.error('Chyba při čtení velikosti úložiště:', e);
    return 0;
  }
};

/**
 * Smaže všechny uložené obrázky.
 */
export const clearAllImages = async () => {
  try {
    const dir = new Directory(Paths.document, IMAGES_DIR_NAME);
    if (dir.exists) {
      dir.delete();
    }
    // Znovu vytvoříme prázdnou složku
    getImagesDirectory();
  } catch (e) {
    console.error('Chyba při mazání všech obrázků:', e);
  }
};