// src/services/aiServices.js
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

export const DETECTION_MODES = {
  SEGMENTATION: 'segmentation',
};

export const TREE_TYPES = [
  { id: 'spruce', label: 'Smrk ztepilý (Picea abies)', labelKey: 'treeSpruce' },
  { id: 'larch', label: 'Modřín opadavý (Larix decidua)', labelKey: 'treeLarch' },
  { id: 'pine', label: 'Borovice lesní (Pinus sylvestris)', labelKey: 'treePine' },
  { id: 'unknown', label: 'Neznámý druh', labelKey: 'treeUnknown' },
];

const PEST_CLASSES = ['Lýkožrout modřínový', 'Lýkožrout lesklý', 'Lýkožrout smrkový', 'Zdravé dřevo / Pozadí'];

// Padding kolem YOLO bounding boxu (15 % z rozměru boxu na každou stranu)
const CROP_PADDING_RATIO = 0.15;

let mobileNetModel = null;
let yoloModel = null;

export const initModel = async () => {
  if (!mobileNetModel) {
    mobileNetModel = await loadTensorflowModel(require('./../assets/models/forest_guardian_model.tflite'));
  }
  if (!yoloModel) {
    yoloModel = await loadTensorflowModel(require('./../assets/models/yolo_seg.tflite'));
  }
  return { mobileNetModel, yoloModel };
};

/**
 * Sestaví tree-context vektor pro MobileNet na základě druhu dřeviny.
 */
const buildTreeVector = (treeType) => {
  switch (treeType) {
    case 'larch':  return [1, 0];
    case 'spruce': return [0, 1];
    case 'pine':   return [0.5, 0.5];
    default:       return [0.5, 0.5];
  }
};

// ==========================================
// FÁZE 1: YOLO DETEKCE (Hledání požerku)
// Vrací bounding box + relativní souřadnice
// ==========================================
export const detectPestRegion = async (imageUri) => {
  const { yoloModel } = await initModel();

  console.log('[YOLO] Připravuji vstup pro detekci...');
  const yoloImg = await manipulateAsync(
    imageUri,
    [{ resize: { width: 224, height: 224 } }],
    { compress: 0.9, format: SaveFormat.JPEG, base64: true }
  );

  const rawYoloData = Buffer.from(yoloImg.base64, 'base64');
  const decodedYolo = jpeg.decode(rawYoloData, { useTArray: true });

  const yoloInput = new Float32Array(224 * 224 * 3);
  for (let i = 0, j = 0; i < decodedYolo.data.length; i += 4, j += 3) {
    yoloInput[j]     = decodedYolo.data[i]     / 255.0;
    yoloInput[j + 1] = decodedYolo.data[i + 1] / 255.0;
    yoloInput[j + 2] = decodedYolo.data[i + 2] / 255.0;
  }

  const yoloOutput = await yoloModel.run([yoloInput]);
  const predictions = yoloOutput[0];

  const numAnchors = 1029;
  let bestConf = 0;
  let bestBox = null;

  for (let i = 0; i < numAnchors; i++) {
    const conf = predictions[4 * numAnchors + i];
    if (conf > bestConf) {
      bestConf = conf;
      bestBox = {
        x: predictions[0 * numAnchors + i],
        y: predictions[1 * numAnchors + i],
        w: predictions[2 * numAnchors + i],
        h: predictions[3 * numAnchors + i]
      };
    }
  }

  console.log(`[YOLO] Nejlepší nalezený objekt má jistotu: ${(bestConf * 100).toFixed(1)}%`);

  if (bestConf < 0.12 || !bestBox) {
    console.log('[YOLO] Žádný požerek nedetekován (pod 12 %).');
    return { detected: false, confidence: bestConf };
  }

  // Relativní souřadnice bounding boxu (0-1) s paddingem
  const rawRelX = (bestBox.x - bestBox.w / 2) / 224.0;
  const rawRelY = (bestBox.y - bestBox.h / 2) / 224.0;
  const rawRelW = bestBox.w / 224.0;
  const rawRelH = bestBox.h / 224.0;

  const padW = rawRelW * CROP_PADDING_RATIO;
  const padH = rawRelH * CROP_PADDING_RATIO;

  const region = {
    relX: Math.max(0, rawRelX - padW),
    relY: Math.max(0, rawRelY - padH),
    relW: Math.min(1 - Math.max(0, rawRelX - padW), rawRelW + 2 * padW),
    relH: Math.min(1 - Math.max(0, rawRelY - padH), rawRelH + 2 * padH),
  };

  console.log(`[YOLO] Detekovaná oblast (rel): x=${region.relX.toFixed(3)} y=${region.relY.toFixed(3)} w=${region.relW.toFixed(3)} h=${region.relH.toFixed(3)}`);

  return { detected: true, confidence: bestConf, region };
};

// ==========================================
// FÁZE 2: MOBILENET KLASIFIKACE
// Ořízne a klasifikuje oblast zadanou přes region
// ==========================================
export const classifyPestRegion = async (imageUri, region, treeType) => {
  const { mobileNetModel } = await initModel();

  console.log(`[MobileNet] Ořezávám oblast a klasifikuji (dřevina: ${treeType || 'unknown'})...`);

  const baseImg = await manipulateAsync(
    imageUri,
    [{ resize: { width: 640, height: 640 } }],
    { format: SaveFormat.JPEG }
  );

  let cropX = Math.max(0, Math.floor(region.relX * 640));
  let cropY = Math.max(0, Math.floor(region.relY * 640));
  let cropW = Math.max(10, Math.floor(region.relW * 640));
  let cropH = Math.max(10, Math.floor(region.relH * 640));

  if (cropX + cropW > 640) cropW = 640 - cropX;
  if (cropY + cropH > 640) cropH = 640 - cropY;

  const croppedImg = await manipulateAsync(
    baseImg.uri,
    [
      { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
      { resize: { width: 224, height: 224 } }
    ],
    { compress: 0.95, format: SaveFormat.JPEG, base64: true }
  );

  const rawClassData = Buffer.from(croppedImg.base64, 'base64');
  const decodedClass = jpeg.decode(rawClassData, { useTArray: true });

  const mobileNetInput = new Float32Array(224 * 224 * 3);
  for (let i = 0, j = 0; i < decodedClass.data.length; i += 4, j += 3) {
    mobileNetInput[j]     = decodedClass.data[i];
    mobileNetInput[j + 1] = decodedClass.data[i + 1];
    mobileNetInput[j + 2] = decodedClass.data[i + 2];
  }

  const treeVector = buildTreeVector(treeType);
  const treeInput = new Float32Array(treeVector);
  console.log(`[MobileNet] Tree vektor: [${treeVector}]`);

  const inputArray = mobileNetModel.inputs[0].shape.length === 4
    ? [mobileNetInput, treeInput]
    : [treeInput, mobileNetInput];

  const classOutput = await mobileNetModel.run(inputArray);
  const probabilities = classOutput[0];

  let maxProb = 0;
  let maxIndex = 0;
  for (let i = 0; i < probabilities.length; i++) {
    console.log(`  [MobileNet] Třída "${PEST_CLASSES[i]}": ${(probabilities[i] * 100).toFixed(1)}%`);
    if (probabilities[i] > maxProb) {
      maxProb = probabilities[i];
      maxIndex = i;
    }
  }

  console.log(`[Výsledek MobileNet]: ${PEST_CLASSES[maxIndex]} s jistotou ${(maxProb * 100).toFixed(1)}%`);

  if (PEST_CLASSES[maxIndex] === 'Zdravé dřevo / Pozadí') {
    return {
      type: 'segmentation',
      confidence: maxProb,
      label: 'Zdravé dřevo / Neznámé',
      severity: 'info',
      recommendation: 'Detekován tvar, ale textura neodpovídá škůdci. Pravděpodobně přirozená anomálie kůry.',
      treeContext: treeType
    };
  }

  return {
    type: 'segmentation',
    confidence: maxProb,
    label: PEST_CLASSES[maxIndex],
    severity: maxProb > 0.60 ? 'critical' : 'warning',
    recommendation: 'Na základě AI fúze (detekce + klasifikace) zjištěn škůdce. Očekávaný druh na zvolené dřevině.',
    treeContext: treeType
  };
};

// ==========================================
// Pohodlný wrapper: celá pipeline najednou
// ==========================================
export const analyzeImage = async (imageUri, treeType) => {
  try {
    console.log('=== START AI PIPELINE ===');
    console.log(`[Pipeline] imageUri: ${imageUri ? '✓' : '✗'}, treeType: ${treeType}`);

    const detection = await detectPestRegion(imageUri);

    if (!detection.detected) {
      return {
        type: 'segmentation',
        confidence: 1.0 - detection.confidence,
        label: 'Zdravé dřevo / Neznámé',
        severity: 'info',
        recommendation: 'Na fotografii nebyl detekován žádný jasný znak požerku. Zkuste zabrat kůru detailněji a zaostřit.',
        treeContext: treeType
      };
    }

    return await classifyPestRegion(imageUri, detection.region, treeType);
  } catch (error) {
    console.error('Chyba v AI pipeline:', error);
    return null;
  }
};

export const testLoadModel = async () => { return await initModel(); };