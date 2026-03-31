// src/services/aiServices.js
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') global.Buffer = Buffer;

export const TREE_TYPES = [
  { id: 'auto', label: 'Automatická detekce' },
  { id: 'spruce', label: 'Smrk ztepilý (Picea abies)' },
  { id: 'larch', label: 'Modřín opadavý (Larix decidua)' },
  { id: 'pine', label: 'Borovice lesní (Pinus sylvestris)' },
];

// YOLOv8-seg class names — must match data.yaml order from RoboFlow export
// Model output [1,38,8400]: nc = 38 − 4(bbox) − 32(mask coeffs) = 2
// Třídy odpovídají data.yaml z RoboFlow datasetu "pozerky" (abecedně)
const PEST_CLASSES = ['Ips cembrae', 'Pityogenes chalcographus'];

// České názvy pro zobrazení v UI
const PEST_LABELS = {
  'Ips cembrae': 'Lýkožrout modřínový (Ips cembrae)',
  'Pityogenes chalcographus': 'Lýkožrout lesklý (Pityogenes chalcographus)',
};

const YOLO_INPUT_SIZE = 640;
const YOLO_CONF_THRESHOLD = 0.25;
const YOLO_IOU_THRESHOLD = 0.45;
const YOLO_NUM_MASK_COEFFS = 32; // YOLOv8-seg mask prototype count
const YOLO_MASK_THRESHOLD = 0.5;

// Mapování škůdce → hostitelský strom
const PEST_HOST_TREES = {
  'Ips cembrae': ['Modřín'],
  'Pityogenes chalcographus': ['Smrk', 'Borovice', 'Modřín'],
};

const TREE_ID_TO_NAME = {
  'spruce': 'Smrk',
  'larch': 'Modřín',
  'pine': 'Borovice',
  'auto': null,
};

// ==========================================
// MODEL STATE
// ==========================================
let yoloModel = null;

// ==========================================
// MODEL LOADING
// ==========================================
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 50));

export const initModelsWithProgress = async (onProgress) => {
  const total = 1;

  if (!yoloModel) {
    const name = 'YOLOv8 Detector';
    onProgress?.({ step: 1, total, modelName: name, status: 'loading' });
    await yieldToUI();
    try {
      yoloModel = await loadTensorflowModel(require('./../assets/models/best_float16.tflite'));
      console.warn('[Models] YOLOv8 loaded. Outputs:', JSON.stringify(yoloModel.outputs?.map(o => ({ name: o.name, shape: o.shape }))));
      onProgress?.({ step: 1, total, modelName: name, status: 'done' });
    } catch (err) {
      onProgress?.({ step: 1, total, modelName: name, status: 'error', error: err });
      throw err;
    }
    await yieldToUI();
  } else {
    onProgress?.({ step: 1, total, modelName: 'YOLOv8 (cached)', status: 'done' });
  }

  console.warn('[Models] All loaded.');
  return true;
};

export const initModel = async () => {
  if (!yoloModel) {
    yoloModel = await loadTensorflowModel(require('./../assets/models/best_float16.tflite'));
  }
};

export const areModelsLoaded = () => !!yoloModel;

// ==========================================
// YOLOv8-SEG INFERENCE PIPELINE
// ==========================================
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const computeIoU = (a, b) => {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (areaA + areaB - inter + 1e-6);
};

const nms = (detections, iouThreshold) => {
  detections.sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  for (const det of detections) {
    let dominated = false;
    for (const k of kept) {
      if (computeIoU(det.bbox, k.bbox) > iouThreshold) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(det);
  }
  return kept;
};

/**
 * Parse YOLOv8-seg TFLite output.
 * Output 0: [1, 4+nc+nm, N] — detections (column-major, standard Ultralytics).
 * nm = YOLO_NUM_MASK_COEFFS (32). nc is computed from shape.
 */
const parseYoloSegOutput = (rawDetections, detShape, protoShape) => {
  // detShape is e.g. [1, 38, 8400], protoShape e.g. [1, 160, 160, 32]
  const rowSize = detShape[1];
  const N = detShape[2];
  // nm (mask coefficients) comes from the prototype tensor's last dimension
  const nm = protoShape ? protoShape[protoShape.length - 1] : YOLO_NUM_MASK_COEFFS;
  const nc = rowSize - 4 - nm;

  console.warn(`[YOLO-parse] rowSize=${rowSize}, N=${N}, nm=${nm}, nc=${nc}`);

  if (nc <= 0) {
    console.warn(`[YOLO] Cannot parse: nc=${nc} (shape ${JSON.stringify(detShape)})`);
    return [];
  }

  const detections = [];

  for (let i = 0; i < N; i++) {
    // Column-major: value at (row, col) = rawDetections[row * N + col]
    const cx = rawDetections[0 * N + i];
    const cy = rawDetections[1 * N + i];
    const w  = rawDetections[2 * N + i];
    const h  = rawDetections[3 * N + i];

    // Class confidences
    let maxConf = 0, maxClassIdx = 0;
    for (let c = 0; c < nc; c++) {
      const conf = rawDetections[(4 + c) * N + i];
      if (conf > maxConf) { maxConf = conf; maxClassIdx = c; }
    }

    if (maxConf < YOLO_CONF_THRESHOLD) continue;

    // Mask coefficients (nm values)
    const maskCoeffs = new Float32Array(nm);
    for (let m = 0; m < nm; m++) {
      maskCoeffs[m] = rawDetections[(4 + nc + m) * N + i];
    }

    // Normalize bbox to [0,1]
    const x1 = (cx - w / 2) / YOLO_INPUT_SIZE;
    const y1 = (cy - h / 2) / YOLO_INPUT_SIZE;
    const x2 = (cx + w / 2) / YOLO_INPUT_SIZE;
    const y2 = (cy + h / 2) / YOLO_INPUT_SIZE;

    detections.push({
      bbox: [clamp(x1, 0, 1), clamp(y1, 0, 1), clamp(x2, 0, 1), clamp(y2, 0, 1)],
      confidence: maxConf,
      classIndex: maxClassIdx,
      className: maxClassIdx < PEST_CLASSES.length ? PEST_CLASSES[maxClassIdx] : `class_${maxClassIdx}`,
      maskCoeffs,
    });
  }

  return nms(detections, YOLO_IOU_THRESHOLD);
};

/**
 * Generate instance segmentation mask for a detection from mask prototypes.
 * Prototypes: [1, protoH, protoW, nm] (e.g. [1, 160, 160, 32]).
 * Returns a binary mask at (protoH × protoW) resolution.
 */
const generateInstanceMask = (maskCoeffs, protoData, protoH, protoW, nm = YOLO_NUM_MASK_COEFFS) => {
  const mask = new Float32Array(protoH * protoW);

  for (let y = 0; y < protoH; y++) {
    for (let x = 0; x < protoW; x++) {
      let sum = 0;
      for (let m = 0; m < nm; m++) {
        // Proto layout [1, H, W, nm]: index = y * W * nm + x * nm + m
        sum += maskCoeffs[m] * protoData[y * protoW * nm + x * nm + m];
      }
      mask[y * protoW + x] = sigmoid(sum) > YOLO_MASK_THRESHOLD ? 1.0 : 0.0;
    }
  }

  // Crop mask to detection bbox (pixels outside bbox → 0)
  return mask;
};

/**
 * Crop an instance mask to its detection bounding box.
 */
const cropMaskToBbox = (mask, protoH, protoW, bbox) => {
  const [bx1, by1, bx2, by2] = bbox;
  const sx = Math.floor(bx1 * protoW);
  const ex = Math.ceil(bx2 * protoW);
  const sy = Math.floor(by1 * protoH);
  const ey = Math.ceil(by2 * protoH);

  for (let y = 0; y < protoH; y++) {
    for (let x = 0; x < protoW; x++) {
      if (x < sx || x > ex || y < sy || y > ey) {
        mask[y * protoW + x] = 0;
      }
    }
  }
  return mask;
};

/**
 * Run YOLOv8-seg on an image.
 * Returns { detections, protoData, protoH, protoW } where each detection
 * includes maskCoeffs that can be combined with protoData.
 */
const runYoloDetection = async (imageUri) => {
  if (!yoloModel) throw new Error('YOLO model not loaded');

  const resized = await manipulateAsync(
    imageUri,
    [{ resize: { width: YOLO_INPUT_SIZE, height: YOLO_INPUT_SIZE } }],
    { format: SaveFormat.JPEG, base64: true }
  );

  const decoded = jpeg.decode(Buffer.from(resized.base64, 'base64'), { useTArray: true });
  const pixels = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;
  const input = new Float32Array(pixels * 3);
  for (let i = 0, j = 0; i < decoded.data.length; i += 4, j += 3) {
    input[j]     = decoded.data[i]     / 255.0;
    input[j + 1] = decoded.data[i + 1] / 255.0;
    input[j + 2] = decoded.data[i + 2] / 255.0;
  }

  const output = await yoloModel.run([input]);

  // Output 0: detections [1, 4+nc+32, N]
  const detShape = yoloModel.outputs?.[0]?.shape || [1, 38, 8400];
  // Output 1: mask prototypes [1, protoH, protoW, nm]
  const protoShape = yoloModel.outputs?.[1]?.shape || [1, 160, 160, 32];
  const protoH = protoShape[1];
  const protoW = protoShape[2];
  const protoData = output[1]; // Float32Array of [1, 160, 160, 32]

  console.warn('[YOLO] Det shape:', JSON.stringify(detShape), 'Proto shape:', JSON.stringify(protoShape));

  const nm = protoShape[protoShape.length - 1];
  const detections = parseYoloSegOutput(output[0], detShape, protoShape);
  console.warn(`[YOLO] ${detections.length} detections after NMS`);

  return { detections, protoData, protoH, protoW, nm };
};

// ==========================================
// TREE-TYPE FILTERING (processAiResults)
// ==========================================
/**
 * Filter and re-rank AI predictions based on the selected tree species.
 * If treeType is 'auto' (user doesn't know), predictions are returned as-is.
 * Otherwise, penalize pests that don't live on the selected tree.
 */
const processAiResults = (predictions, treeType) => {
  const treeName = TREE_ID_TO_NAME[treeType] || null;

  // Auto-detection: trust the model fully
  if (!treeName) return predictions;

  const filtered = predictions.map(prediction => {
    const allowedTrees = PEST_HOST_TREES[prediction.className];
    // Penalize pest that doesn't live on the selected tree
    if (allowedTrees && !allowedTrees.includes(treeName)) {
      return { ...prediction, confidence: prediction.confidence * 0.1 };
    }
    return prediction;
  });

  return filtered.sort((a, b) => b.confidence - a.confidence);
};

// ==========================================
// INSTANCE MASK → JPEG OVERLAY
// ==========================================
/**
 * Encode a YOLO instance mask (protoH×protoW) as a colored JPEG overlay URI.
 */
const instanceMaskToUri = (instMask, protoH, protoW, color = { r: 34, g: 197, b: 94 }) => {
  const jpegPixels = new Uint8Array(protoH * protoW * 4);
  for (let i = 0; i < protoH * protoW; i++) {
    if (instMask[i] > 0) {
      jpegPixels[i * 4] = color.r;
      jpegPixels[i * 4 + 1] = color.g;
      jpegPixels[i * 4 + 2] = color.b;
      jpegPixels[i * 4 + 3] = 255;
    } else {
      jpegPixels[i * 4 + 3] = 255;
    }
  }
  const encoded = jpeg.encode({ width: protoW, height: protoH, data: Buffer.from(jpegPixels) }, 80);
  return `data:image/jpeg;base64,${Buffer.from(encoded.data).toString('base64')}`;
};

// ==========================================
// MAIN API — detectPests (automatic YOLOv8-seg detection)
// ==========================================
/**
 * Full auto-detection + segmentation on the image.
 * The model finds pest damage areas itself and generates masks.
 * Returns result object ready for AnalysisScreen.
 */
export const detectPests = async (imageUri, treeType = 'auto') => {
  if (!yoloModel) throw new Error('YOLO model not loaded');

  const { detections: rawDetections, protoData, protoH, protoW, nm } = await runYoloDetection(imageUri);
  const filtered = processAiResults(rawDetections, treeType);

  if (filtered.length === 0) {
    return {
      type: 'detection',
      confidence: 1.0,
      label: 'Zdravá kůra / Nejde o škůdce',
      severity: 'info',
      recommendation: 'V obraze nebylo detekováno žádné napadení kůrovcem.',
      treeContext: treeType,
      maskUri: null,
      detections: [],
    };
  }

  // Generate instance masks for all detections (limit to top 10)
  const withMasks = filtered.slice(0, 10).map(det => {
    try {
      const instMask = generateInstanceMask(det.maskCoeffs, protoData, protoH, protoW, nm);
      cropMaskToBbox(instMask, protoH, protoW, det.bbox);
      return { ...det, maskUri: instanceMaskToUri(instMask, protoH, protoW) };
    } catch {
      return { ...det, maskUri: null };
    }
  });

  const best = withMasks[0];
  const bestLabel = PEST_LABELS[best.className] || best.className;
  return {
    type: 'detection',
    confidence: best.confidence,
    label: bestLabel,
    severity: best.confidence > 0.60 ? 'critical' : 'warning',
    recommendation: `Detekováno ${withMasks.length}× poškození kůry. Nejsilnější: ${bestLabel} (${Math.round(best.confidence * 100)} %).`,
    treeContext: treeType,
    maskUri: best.maskUri,
    detections: withMasks,
  };
};

// Legacy wrapper for backward compatibility
export const analyzeImage = async (imageUri, treeType) => {
  try {
    await initModel();
    return await detectPests(imageUri, treeType);
  } catch (error) {
    console.error("Kritická chyba v AI pipeline:", error);
    return null;
  }
};