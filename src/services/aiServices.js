// src/services/aiServices.js
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { toByteArray } from 'base64-js';

// --- NASTAVENÍ Aplikace ---
export const DETECTION_MODES = {
  OBJECT: 'object_detection',
  SEGMENTATION: 'segmentation',
};

// Sdílený seznam dřevin pro kameru, analýzu i historii.
export const TREE_TYPES = [
  { id: 'spruce', labelKey: 'treeSpruce', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'pine', labelKey: 'treePine', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'larch', labelKey: 'treeLarch', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'oak', labelKey: 'treeOak', icon: '🌳', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'beech', labelKey: 'treeBeech', icon: '🌳', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'birch', labelKey: 'treeBirch', icon: '🌳', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'fir', labelKey: 'treeFir', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'unknown', labelKey: 'treeUnknown', icon: '🤖', defaultMode: DETECTION_MODES.SEGMENTATION },
];

const PEST_CLASSES = ['Lýkožrout modřínový', 'Lýkožrout lesklý', 'Lýkožrout smrkový'];
const UNKNOWN_PEST_LABEL = 'Neznámý původce';

const buildFallbackResult = (mode, treeType, reason) => ({
  type: mode,
  confidence: 0,
  label: UNKNOWN_PEST_LABEL,
  severity: 'low',
  recommendation: reason
    ? `Analýza nebyla jednoznačná (${reason}). Zkuste detailnější fotografii při lepším osvětlení.`
    : 'Na snímku nebyl spolehlivě rozpoznán známý požerek. Pořiďte detailnější fotografii při lepším osvětlení.',
  treeContext: treeType,
});

const toNumberArray = (value) => {
  if (!value) return [];

  if (ArrayBuffer.isView(value)) {
    return Array.from(value);
  }

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'number') {
      return value;
    }
    if (value.length > 0 && ArrayBuffer.isView(value[0])) {
      return Array.from(value[0]);
    }
    return [];
  }

  return [];
};

const findFirstNumericArrayLike = (value, depth = 0) => {
  if (!value || depth > 4) return null;

  if (ArrayBuffer.isView(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'number') {
      return value;
    }

    for (const item of value) {
      const found = findFirstNumericArrayLike(item, depth + 1);
      if (found) return found;
    }

    return null;
  }

  if (typeof value === 'object') {
    const candidates = [value.data, value.value, value.values, value.output, ...Object.values(value)];
    for (const candidate of candidates) {
      const found = findFirstNumericArrayLike(candidate, depth + 1);
      if (found) return found;
    }
  }

  return null;
};

const extractProbabilities = (rawOutput) => {
  const firstNumericArrayLike = findFirstNumericArrayLike(rawOutput);
  return toNumberArray(firstNumericArrayLike);
};

const toProbabilities = (values) => {
  if (!values.length) return [];

  const allBetweenZeroAndOne = values.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  const sum = values.reduce((acc, v) => acc + v, 0);

  if (allBetweenZeroAndOne && Math.abs(sum - 1) < 0.05) {
    return values;
  }

  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const denom = exps.reduce((acc, v) => acc + v, 0);
  if (!Number.isFinite(denom) || denom === 0) {
    return [];
  }

  return exps.map((v) => v / denom);
};

let aiModel = null;

// --- INICIALIZACE MODELU ---
export const initModel = async () => {
  if (!aiModel) {
    console.log("Načítám TFLite model...");
    aiModel = await loadTensorflowModel(require('./../assets/models/forest_guardian_model.tflite'));
    console.log("Model připraven!");
  }
  return aiModel;
};

// --- HLAVNÍ FUNKCE ANALÝZY ---
export const analyzeImage = async (imageUri, mode, treeType) => {
  try {
    const model = await initModel();

    // 1. Zmenšení fotky na 224x224 a převod na Base64 (JPEG)
    const manipResult = await manipulateAsync(
      imageUri,
      [{ resize: { width: 224, height: 224 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    // 2. Dekódování JPEG do hrubých pixelů (RGBA)
    const rawImageData = toByteArray(manipResult.base64);
    const decodedImage = jpeg.decode(rawImageData, { useTArray: true });

    // 3. Převod RGBA pixelů do Float32Array (RGB, normalizace 0-1)
    // Přesně tak, jak jsme to dělali v Pythonu (img / 255.0)
    const float32Data = new Float32Array(224 * 224 * 3);
    for (let i = 0, j = 0; i < decodedImage.data.length; i += 4, j += 3) {
      float32Data[j] = decodedImage.data[i] / 255.0;         // R
      float32Data[j + 1] = decodedImage.data[i + 1] / 255.0; // G
      float32Data[j + 2] = decodedImage.data[i + 2] / 255.0; // B
    }

    // 4. Převod druhu stromu na One-Hot vektor (Multimodální fúze)
    // V Pythonu jsme měli: Modřín = [1, 0], Ostatní = [0, 1]
    let treeVector = [0, 1]; 
    if (treeType === 'larch') {
      treeVector = [1, 0];
    }
    const treeFloat32Data = new Float32Array(treeVector);

    // 5. INFERENCE (Spuštění sítě)
    // Předáváme 2 vstupy: Obraz a Vektor stromu
    const output = await model.run([float32Data, treeFloat32Data]);

    // react-native-fast-tflite vrací výstup v různých tvarech podle modelu/platformy
    const rawScores = extractProbabilities(output);
    const probabilities = toProbabilities(rawScores);

    if (probabilities.length === 0) {
      console.warn('Model output does not contain valid probabilities.', output);
      return buildFallbackResult(mode, treeType, 'neplatný výstup modelu');
    }
    
    // Nalezení vítěze (nejvyšší pravděpodobnost)
    let maxProb = 0;
    let maxIndex = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIndex = i;
      }
    }

    if (!Number.isFinite(maxProb) || maxProb < 0) {
      return buildFallbackResult(mode, treeType, 'neplatná confidence');
    }

    const predictedLabel = PEST_CLASSES[maxIndex] || UNKNOWN_PEST_LABEL;
    const isUnknown = maxProb < 0.4;

    // 6. Formátování výsledku pro UI
    return {
      type: mode,
      confidence: maxProb,
      label: isUnknown ? UNKNOWN_PEST_LABEL : predictedLabel,
      severity: maxProb > 0.7 ? 'high' : maxProb > 0.45 ? 'medium' : 'low',
      recommendation: isUnknown
        ? 'Na snímku nebyl spolehlivě rozpoznán známý požerek. Pořiďte detailnější fotografii při lepším osvětlení.'
        : 'Detekováno na základě struktury požerku. Očekávaný škůdce na zvolené dřevině.',
      treeContext: treeType
    };

  } catch (error) {
    console.error("Chyba při inferenci modelu:", error);
    return buildFallbackResult(mode, treeType, 'interní chyba inferenční vrstvy');
  }
};

// Funkce z testu, kterou jsi volal v HomeScreen.
// Necháme ji tu jen pro formu, aby ti nespadl kód, než ji smažeš.
export const testLoadModel = async () => {
  return await initModel();
};