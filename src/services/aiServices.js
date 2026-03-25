// src/services/aiServices.js
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

export const DETECTION_MODES = {
  SEGMENTATION: 'segmentation', // Nechali jsme jen jeden mód
};

export const TREE_TYPES = [
  { id: 'spruce', label: 'Smrk ztepilý (Picea abies)' },
  { id: 'larch', label: 'Modřín opadavý (Larix decidua)' },
  { id: 'pine', label: 'Borovice lesní (Pinus sylvestris)' },
  { id: 'unknown', label: 'Neznámý druh' },
];

const PEST_CLASSES = ['Lýkožrout modřínový', 'Lýkožrout lesklý', 'Lýkožrout smrkový', 'Zdravé dřevo / Pozadí'];

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

export const analyzeImage = async (imageUri, treeType) => {
  try {
    const { mobileNetModel, yoloModel } = await initModel();

    // ==========================================
    // FÁZE 1: YOLO DETEKCE (Hledání požerku)
    // ==========================================
    const yoloImg = await manipulateAsync(
      imageUri,
      [{ resize: { width: 224, height: 224 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    const rawYoloData = Buffer.from(yoloImg.base64, 'base64');
    const decodedYolo = jpeg.decode(rawYoloData, { useTArray: true });

    const yoloInput = new Float32Array(224 * 224 * 3);
    for (let i = 0, j = 0; i < decodedYolo.data.length; i += 4, j += 3) {
      yoloInput[j] = decodedYolo.data[i] / 255.0;         
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

    // Pokud YOLO nenajde nic relevantního (Hranice 12 %), rovnou vracíme Zdravé dřevo
    if (bestConf < 0.12 || !bestBox) {
      console.log("[AI Pipeline] Nalezeno pozadí/zdravé dřevo. Přeskakuji MobileNet.");
      return {
        type: 'segmentation',
        confidence: 1.0 - bestConf, // Obrácená jistota (jsme si jisti, že tam nic není)
        label: 'Zdravé dřevo / Neznámé',
        severity: 'info',
        recommendation: 'Na fotografii nebyl detekován žádný jasný znak požerku. Zkuste zabrat kůru detailněji a zaostřit.',
        treeContext: treeType
      };
    }

    // ==========================================
    // FÁZE 1.5: BEZPEČNÝ OŘEZ (Auto-Crop)
    // ==========================================
    console.log("[YOLO] Požerek potvrzen. Připravuji přesný výřez...");
    
    const relX = (bestBox.x - bestBox.w / 2) / 224.0;
    const relY = (bestBox.y - bestBox.h / 2) / 224.0;
    const relW = bestBox.w / 224.0;
    const relH = bestBox.h / 224.0;

    const baseImg = await manipulateAsync(imageUri, [{ resize: { width: 640, height: 640 } }], { format: SaveFormat.JPEG });
    
    // OPRAVA CHYBY: Striktní zaokrouhlení na celá čísla a pojistka proti nule
    let cropX = Math.max(0, Math.floor(relX * 640));
    let cropY = Math.max(0, Math.floor(relY * 640));
    let cropW = Math.max(10, Math.floor(relW * 640)); // Šířka bude VŽDY min. 10px
    let cropH = Math.max(10, Math.floor(relH * 640)); // Výška bude VŽDY min. 10px

    // Pojistka, aby ořez nepřesáhl okraj obrázku
    if (cropX + cropW > 640) cropW = 640 - cropX;
    if (cropY + cropH > 640) cropH = 640 - cropY;

    const croppedImg = await manipulateAsync(
      baseImg.uri,
      [
        { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }, 
        { resize: { width: 224, height: 224 } }
      ],
      { format: SaveFormat.JPEG, base64: true }
    );

    // ==========================================
    // FÁZE 2: MOBILENET KLASIFIKACE (Určení brouka z výřezu)
    // ==========================================
    const rawClassData = Buffer.from(croppedImg.base64, 'base64');
    const decodedClass = jpeg.decode(rawClassData, { useTArray: true });

    const mobileNetInput = new Float32Array(224 * 224 * 3);
    for (let i = 0, j = 0; i < decodedClass.data.length; i += 4, j += 3) {
      mobileNetInput[j] = decodedClass.data[i];         
      mobileNetInput[j + 1] = decodedClass.data[i + 1]; 
      mobileNetInput[j + 2] = decodedClass.data[i + 2]; 
    }

    let treeVector = [0, 1]; 
    if (treeType === 'larch') treeVector = [1, 0];
    const treeInput = new Float32Array(treeVector);
    
    let inputArray = mobileNetModel.inputs[0].shape.length === 4 
      ? [mobileNetInput, treeInput] 
      : [treeInput, mobileNetInput];

    const classOutput = await mobileNetModel.run(inputArray);
    const probabilities = classOutput[0];
    
    let maxProb = 0;
    let maxIndex = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIndex = i;
      }
    }

    // Pokud si je mozek hodně jistý, že výřez je vlastně zdravý, poslechneme ho
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
      recommendation: `Na základě AI fúze (detekce + klasifikace) zjištěn škůdce. Očekávaný druh na zvolené dřevině.`,
      treeContext: treeType
    };

  } catch (error) {
    console.error("Chyba v AI pipeline:", error);
    return null;
  }
};

export const testLoadModel = async () => { return await initModel(); };