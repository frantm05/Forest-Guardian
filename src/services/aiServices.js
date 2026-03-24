// src/services/aiServices.js
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

export const DETECTION_MODES = {
  OBJECT: 'object_detection',
  SEGMENTATION: 'segmentation',
};

export const TREE_TYPES = [
  { id: 'spruce', labelKey: 'treeSpruce', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'larch', labelKey: 'treeLarch', icon: '🌳', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'pine', labelKey: 'treePine', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'unknown', labelKey: 'treeUnknown', icon: '❓', defaultMode: DETECTION_MODES.SEGMENTATION },
];

const PEST_CLASSES = ['Lýkožrout modřínový', 'Lýkožrout lesklý', 'Lýkožrout smrkový', 'Zdravé dřevo / Pozadí'];

let mobileNetModel = null;
let yoloModel = null;

export const initModel = async () => {
  if (!mobileNetModel) {
    console.log("Načítám MobileNetV4 klasifikátor...");
    mobileNetModel = await loadTensorflowModel(require('./../assets/models/forest_guardian_model.tflite'));
  }
  if (!yoloModel) {
    console.log("Načítám YOLOv8-seg detektor...");
    yoloModel = await loadTensorflowModel(require('./../assets/models/yolo_seg.tflite'));
  }
  return { mobileNetModel, yoloModel };
};

export const analyzeImage = async (imageUri, mode, treeType) => {
  try {
    const { mobileNetModel, yoloModel } = await initModel();

    // ==========================================
    // FÁZE 1: YOLO DETEKCE (Hledání požerku)
    // ==========================================
    console.log("Fáze 1: Zpracování pro YOLO...");
    const yoloImg = await manipulateAsync(
      imageUri,
      [{ resize: { width: 224, height: 224 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    const rawYoloData = Buffer.from(yoloImg.base64, 'base64');
    const decodedYolo = jpeg.decode(rawYoloData, { useTArray: true });

    // YOLO vyžaduje normalizaci pixelů (dělení / 255.0)
    const yoloInput = new Float32Array(224 * 224 * 3);
    for (let i = 0, j = 0; i < decodedYolo.data.length; i += 4, j += 3) {
      yoloInput[j] = decodedYolo.data[i] / 255.0;         // R
      yoloInput[j + 1] = decodedYolo.data[i + 1] / 255.0; // G
      yoloInput[j + 2] = decodedYolo.data[i + 2] / 255.0; // B
    }

    const yoloOutput = await yoloModel.run([yoloInput]);
    const predictions = yoloOutput[0]; 
    
    // Rozšifrování YOLO tenzoru [1, 37, 1029]
    const numAnchors = 1029;
    let bestConf = 0;
    let bestBox = null;

    for (let i = 0; i < numAnchors; i++) {
      const conf = predictions[4 * numAnchors + i]; // Confidence skóre
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

    console.log(`Nejlepší nalezený požerek má jistotu: ${(bestConf * 100).toFixed(1)}%`);

    let finalImageBase64 = yoloImg.base64;

    // Pokud YOLO našlo požerek s jistotou alespoň 20 %, provedeme Auto-Crop
    if (bestConf > 0.20 && bestBox) {
      console.log("Požerek nalezen, provádím ořez (Smart Cropping)...");
      
      const relX = (bestBox.x - bestBox.w / 2) / 224.0;
      const relY = (bestBox.y - bestBox.h / 2) / 224.0;
      const relW = bestBox.w / 224.0;
      const relH = bestBox.h / 224.0;

      // Změníme fotku na známý rozměr, abychom ji mohli přesně oříznout
      const baseImg = await manipulateAsync(imageUri, [{ resize: { width: 640, height: 640 } }], { format: SaveFormat.JPEG });
      
      const cropX = Math.max(0, relX * 640);
      const cropY = Math.max(0, relY * 640);
      const cropW = Math.min(640 - cropX, relW * 640);
      const cropH = Math.min(640 - cropY, relH * 640);

      const croppedImg = await manipulateAsync(
        baseImg.uri,
        [
          { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }, 
          { resize: { width: 224, height: 224 } } // Znovu zmenšíme na 224 pro MobileNet
        ],
        { format: SaveFormat.JPEG, base64: true }
      );
      finalImageBase64 = croppedImg.base64;
    } else {
      console.log("Na fotce nebyl nalezen jasný požerek. Posílám do MobileNetu celý obraz.");
    }

    // ==========================================
    // FÁZE 2: MOBILENET KLASIFIKACE (Určení brouka)
    // ==========================================
    console.log("Fáze 2: Klasifikace druhu škůdce...");
    const rawClassData = Buffer.from(finalImageBase64, 'base64');
    const decodedClass = jpeg.decode(rawClassData, { useTArray: true });

    // MobileNet jsme v minulém kroku učili BEZ dělení 255.0
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

    console.log("Výsledek klasifikace:", PEST_CLASSES[maxIndex], maxProb);

    return {
      type: mode,
      confidence: maxProb,
      label: PEST_CLASSES[maxIndex],
      severity: maxProb > 0.70 ? 'critical' : 'warning',
      recommendation: bestConf > 0.20 
        ? `Automaticky vyříznuto (Jistota řezu ${(bestConf*100).toFixed(0)}%). Analyzováno Edge AI fúzí.`
        : "Žádný zřetelný požerek nebyl detekován, analyzován celý snímek.",
      treeContext: treeType
    };

  } catch (error) {
    console.error("Chyba v AI pipeline:", error);
    return null;
  }
};

export const testLoadModel = async () => { return await initModel(); };