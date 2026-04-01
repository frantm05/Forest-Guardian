/**
 * @module aiServices
 * @description On-device AI inference pipeline: YOLOv8-seg pest detection, instance segmentation,
 *              optional SAM mask refinement, and tree-species-based result filtering.
 */
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') global.Buffer = Buffer;

const log = (...args) => { if (__DEV__) console.warn(...args); };

export const TREE_TYPES = [
  { id: 'auto', labelKey: 'treeUnknown', latinKey: 'treeUnknownLatin' },
  { id: 'spruce', labelKey: 'treeSpruce', latinKey: 'treeSpruceLatin' },
  { id: 'larch', labelKey: 'treeLarch', latinKey: 'treeLarchLatin' },
  { id: 'pine', labelKey: 'treePine', latinKey: 'treePineLatin' },
];

// YOLOv8-seg class names — must match data.yaml order from the RoboFlow export
const PEST_CLASSES = ['Ips cembrae', 'Pityogenes chalcographus'];

// Display labels with common + Latin names
const PEST_LABELS = {
  'Ips cembrae': 'Lýkožrout modřínový (Ips cembrae)',
  'Pityogenes chalcographus': 'Lýkožrout lesklý (Pityogenes chalcographus)',
};

const YOLO_INPUT_SIZE = 640;
const YOLO_CONF_THRESHOLD = 0.25;
const YOLO_IOU_THRESHOLD = 0.45;
const YOLO_NUM_MASK_COEFFS = 32; // YOLOv8-seg mask prototype count
const YOLO_MASK_THRESHOLD = 0.5;

// Pest-to-host tree mapping for result filtering
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

const loadOnnxSession = async () => {
  const asset = Asset.fromModule(require('./../assets/models/best.onnx'));
  await asset.downloadAsync();
  const session = await InferenceSession.create(asset.localUri);
  log('[Models] ONNX loaded. Inputs:', JSON.stringify(session.inputNames), 'Outputs:', JSON.stringify(session.outputNames));
  return session;
};

export const initModelsWithProgress = async (onProgress) => {
  const total = 1;

  if (!yoloModel) {
    const name = 'YOLO26 Detector';
    onProgress?.({ step: 1, total, modelName: name, status: 'loading' });
    await yieldToUI();
    try {
      yoloModel = await loadOnnxSession();
      onProgress?.({ step: 1, total, modelName: name, status: 'done' });
    } catch (err) {
      onProgress?.({ step: 1, total, modelName: name, status: 'error', error: err });
      throw err;
    }
    await yieldToUI();
  } else {
    onProgress?.({ step: 1, total, modelName: 'YOLO26 (cached)', status: 'done' });
  }

  log('[Models] All loaded.');
  return true;
};

export const initModel = async () => {
  if (!yoloModel) {
    yoloModel = await loadOnnxSession();
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
 * Parse YOLO segmentation TFLite output.
 * Supports two formats:
 *   - Classic YOLOv8:    [1, 4+nc+nm, N] column-major, needs NMS
 *   - YOLO26 end2end:    [1, N, 4+1+1+nm] row-major, already post-processed
 * nm = YOLO_NUM_MASK_COEFFS (32).
 */
const parseYoloSegOutput = (rawDetections, detShape, protoShape) => {
  const nm = protoShape ? protoShape[protoShape.length - 1] : YOLO_NUM_MASK_COEFFS;

  // Detect end2end format: [1, N, features] where N > features
  // Classic YOLOv8: [1, features, N] where features < N (e.g. [1,38,8400])
  // YOLO26 e2e:     [1, N, features] where N > features  (e.g. [1,300,38])
  const isEnd2End = detShape[1] > detShape[2];

  log(`[YOLO-parse] shape=${JSON.stringify(detShape)}, nm=${nm}, end2end=${isEnd2End}`);

  if (isEnd2End) {
    return parseYoloEnd2End(rawDetections, detShape, nm);
  }
  return parseYoloClassic(rawDetections, detShape, nm);
};

/**
 * YOLO26 end2end: [1, N, features]
 * Each row: [x1, y1, x2, y2, confidence, class_id, mask_coeff_0…mask_coeff_31]
 * Bboxes may be in pixel coords (0–640) or already normalized (0–1).
 */
const parseYoloEnd2End = (raw, detShape, nm) => {
  const N = detShape[1];        // e.g. 300
  const features = detShape[2]; // e.g. 38 = 4+1+1+32
  const detections = [];

  // First pass: check if coords are in pixel space or already normalized
  let maxCoord = 0;
  for (let i = 0; i < Math.min(N, 50); i++) {
    const off = i * features;
    if (raw[off + 4] < YOLO_CONF_THRESHOLD) continue;
    maxCoord = Math.max(maxCoord, raw[off], raw[off + 1], raw[off + 2], raw[off + 3]);
  }
  const needsNormalize = maxCoord > 2.0; // pixel coords if max > 2
  log(`[YOLO-e2e] maxCoord=${maxCoord.toFixed(2)}, needsNormalize=${needsNormalize}`);

  for (let i = 0; i < N; i++) {
    const off = i * features;
    const conf = raw[off + 4];
    if (conf < YOLO_CONF_THRESHOLD) continue;

    const classIdx = Math.round(raw[off + 5]);

    let x1 = raw[off + 0];
    let y1 = raw[off + 1];
    let x2 = raw[off + 2];
    let y2 = raw[off + 3];

    if (needsNormalize) {
      x1 /= YOLO_INPUT_SIZE;
      y1 /= YOLO_INPUT_SIZE;
      x2 /= YOLO_INPUT_SIZE;
      y2 /= YOLO_INPUT_SIZE;
    }

    const maskCoeffs = new Float32Array(nm);
    for (let m = 0; m < nm; m++) {
      maskCoeffs[m] = raw[off + 6 + m];
    }

    detections.push({
      bbox: [clamp(x1, 0, 1), clamp(y1, 0, 1), clamp(x2, 0, 1), clamp(y2, 0, 1)],
      confidence: conf,
      classIndex: classIdx,
      className: classIdx < PEST_CLASSES.length ? PEST_CLASSES[classIdx] : `class_${classIdx}`,
      maskCoeffs,
    });
  }

  // End2end model already did NMS internally — just sort by confidence
  detections.sort((a, b) => b.confidence - a.confidence);
  return detections;
};

/**
 * Classic YOLOv8-seg: [1, 4+nc+nm, N] column-major, needs manual NMS.
 */
const parseYoloClassic = (raw, detShape, nm) => {
  const rowSize = detShape[1];
  const N = detShape[2];
  const nc = rowSize - 4 - nm;

  if (nc <= 0) {
    log(`[YOLO] Cannot parse classic: nc=${nc} (shape ${JSON.stringify(detShape)})`);
    return [];
  }

  const detections = [];

  for (let i = 0; i < N; i++) {
    const cx = raw[0 * N + i];
    const cy = raw[1 * N + i];
    const w  = raw[2 * N + i];
    const h  = raw[3 * N + i];

    let maxConf = 0, maxClassIdx = 0;
    for (let c = 0; c < nc; c++) {
      const conf = raw[(4 + c) * N + i];
      if (conf > maxConf) { maxConf = conf; maxClassIdx = c; }
    }

    if (maxConf < YOLO_CONF_THRESHOLD) continue;

    const maskCoeffs = new Float32Array(nm);
    for (let m = 0; m < nm; m++) {
      maskCoeffs[m] = raw[(4 + nc + m) * N + i];
    }

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
 * Supports both NHWC [1, H, W, nm] and NCHW [1, nm, H, W] proto layouts.
 * Returns a binary mask at (protoH × protoW) resolution.
 */
const generateInstanceMask = (maskCoeffs, protoData, protoH, protoW, nm = YOLO_NUM_MASK_COEFFS, isNCHW = false) => {
  const mask = new Float32Array(protoH * protoW);

  for (let y = 0; y < protoH; y++) {
    for (let x = 0; x < protoW; x++) {
      let sum = 0;
      for (let m = 0; m < nm; m++) {
        const idx = isNCHW
          ? m * protoH * protoW + y * protoW + x    // NCHW: [1, nm, H, W]
          : y * protoW * nm + x * nm + m;            // NHWC: [1, H, W, nm]
        sum += maskCoeffs[m] * protoData[idx];
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
 * Infer proto shape [1, H, W, nm] from flat data length.
 */
const inferProtoShape = (len) => {
  const nm = YOLO_NUM_MASK_COEFFS; // 32
  const hw = Math.round(Math.sqrt(len / nm));
  if (hw * hw * nm === len) return [1, hw, hw, nm];
  return [1, 160, 160, 32];
};

/**
 * Infer detection tensor shape from flat data length.
 * End2end YOLO26-seg: [1, maxDet, 38] (maxDet typically 300)
 * Classic YOLOv8-seg: [1, 38, 8400]
 */
const inferDetShape = (len) => {
  const nc = PEST_CLASSES.length; // 2
  const nm = YOLO_NUM_MASK_COEFFS; // 32
  const classicFeat = 4 + nc + nm; // 38
  const classicN = 8400;

  // Classic: 38 * 8400 = 319200
  if (len === classicFeat * classicN) {
    return [1, classicFeat, classicN];
  }

  // End2end: len = maxDet * features (features = 38 for 2 classes)
  const e2eFeat = 4 + 1 + 1 + nm; // 38
  if (e2eFeat > 0 && len % e2eFeat === 0) {
    const maxDet = len / e2eFeat;
    if (maxDet > 0 && maxDet <= 1000) {
      return [1, maxDet, e2eFeat];
    }
  }

  log(`[YOLO] Cannot infer det shape from len=${len}`);
  return [1, 38, 8400];
};

/**
 * Run YOLO segmentation on an image using ONNX Runtime.
 * Automatically identifies detection vs prototype tensors and infers shapes.
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

  // ONNX expects NCHW layout: [1, 3, H, W]
  const input = new Float32Array(3 * pixels);
  for (let i = 0, p = 0; i < decoded.data.length; i += 4, p++) {
    input[0 * pixels + p] = decoded.data[i]     / 255.0; // R
    input[1 * pixels + p] = decoded.data[i + 1] / 255.0; // G
    input[2 * pixels + p] = decoded.data[i + 2] / 255.0; // B
  }

  const inputName = yoloModel.inputNames[0];
  const inputTensor = new Tensor('float32', input, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]);
  const results = await yoloModel.run({ [inputName]: inputTensor });

  // ========== DIAGNOSTIC LOGGING ==========
  const outputNames = yoloModel.outputNames;
  log(`[YOLO] ${outputNames.length} output tensors: ${JSON.stringify(outputNames)}`);
  for (const name of outputNames) {
    const t = results[name];
    const len = t.data?.length || 0;
    const dims = t.dims;
    const first20 = Array.from(t.data?.slice?.(0, 20) || []).map(v => +v.toFixed(4));
    log(`[YOLO] "${name}": dims=${JSON.stringify(dims)}, len=${len}, first20=${JSON.stringify(first20)}`);
  }

  // ========== IDENTIFY PROTO vs DETECTION TENSORS ==========
  // Proto tensor is much larger (e.g. 160*160*32 = 819200) than detections
  let protoName = null, detName = null;
  let maxLen = 0;
  for (const name of outputNames) {
    const len = results[name].data?.length || 0;
    if (len > maxLen) {
      maxLen = len;
      protoName = name;
    }
  }
  // Detection tensor is the largest among the rest
  let detMaxLen = 0;
  for (const name of outputNames) {
    if (name === protoName) continue;
    const len = results[name].data?.length || 0;
    if (len > detMaxLen) {
      detMaxLen = len;
      detName = name;
    }
  }
  // Safety: if only 1 output or proto is smaller than det, swap
  if (outputNames.length < 2) {
    throw new Error(`Model has only ${outputNames.length} output tensor(s), expected 2+`);
  }
  if (maxLen < 100000 && detMaxLen > maxLen) {
    [protoName, detName] = [detName, protoName];
  }
  log(`[YOLO] det="${detName}" (len=${results[detName]?.data?.length}), proto="${protoName}" (len=${results[protoName]?.data?.length})`);

  // ========== RESOLVE SHAPES ==========
  const protoTensor = results[protoName];
  const detTensor = results[detName];

  const protoShape = (protoTensor.dims?.length >= 4)
    ? Array.from(protoTensor.dims)
    : inferProtoShape(protoTensor.data?.length || 0);

  const detShape = (detTensor.dims?.length >= 3)
    ? Array.from(detTensor.dims)
    : inferDetShape(detTensor.data?.length || 0);

  // Detect NCHW [1, nm, H, W] vs NHWC [1, H, W, nm] proto layout.
  // ONNX typically outputs NCHW where dim[1] is small (nm=32) and dim[2]==dim[3] (160).
  const isProtoNCHW = protoShape[1] < protoShape[2];
  let protoH, protoW, nm;
  if (isProtoNCHW) {
    // [1, nm, H, W]
    nm = protoShape[1];
    protoH = protoShape[2];
    protoW = protoShape[3];
  } else {
    // [1, H, W, nm]
    protoH = protoShape[1];
    protoW = protoShape[2];
    nm = protoShape[3];
  }
  const protoData = protoTensor.data;

  log(`[YOLO] Det shape: ${JSON.stringify(detShape)}, Proto shape: ${JSON.stringify(protoShape)}, protoNCHW=${isProtoNCHW}`);

  // ========== PARSE DETECTIONS ==========
  const detections = parseYoloSegOutput(detTensor.data, detShape, [1, protoH, protoW, nm]);

  if (detections.length > 0) {
    const d = detections[0];
    log(`[YOLO] Top det: class=${d.className}(${d.classIndex}), conf=${d.confidence.toFixed(4)}, bbox=[${d.bbox.map(v => v.toFixed(3))}]`);
  }
  log(`[YOLO] ${detections.length} detections total`);

  return { detections, protoData, protoH, protoW, nm, isProtoNCHW };
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
// TTA (Test-Time Augmentation)
// ==========================================
const TTA_ROTATIONS = [0, 90, 180, 270];

/**
 * Rotate image using expo-image-manipulator.
 * Positive angle = CCW (expo convention).
 */
const rotateImage = async (imageUri, angle) => {
  if (angle === 0) return imageUri;
  const result = await manipulateAsync(imageUri, [{ rotate: angle }], { format: SaveFormat.JPEG });
  return result.uri;
};

/**
 * Reverse a normalized bbox [x1,y1,x2,y2] from CCW-rotated space back to original.
 * Assumes square input (YOLO 640×640).
 */
const rotateBboxBack = (bbox, angle) => {
  if (angle === 0) return bbox;
  const [rx1, ry1, rx2, ry2] = bbox;
  switch (angle) {
    case 90:  return [clamp(1 - ry2, 0, 1), clamp(rx1, 0, 1), clamp(1 - ry1, 0, 1), clamp(rx2, 0, 1)];
    case 180: return [clamp(1 - rx2, 0, 1), clamp(1 - ry2, 0, 1), clamp(1 - rx1, 0, 1), clamp(1 - ry1, 0, 1)];
    case 270: return [clamp(ry1, 0, 1), clamp(1 - rx2, 0, 1), clamp(ry2, 0, 1), clamp(1 - rx1, 0, 1)];
    default:  return bbox;
  }
};

/**
 * Reverse a flat instance mask (h×w) from CCW-rotated space back to original orientation.
 */
const rotateMaskBack = (mask, h, w, angle) => {
  if (angle === 0) return mask;
  const out = new Float32Array(h * w);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      let sr, sc;
      switch (angle) {
        case 90:  sr = w - 1 - c; sc = r;         break;
        case 180: sr = h - 1 - r; sc = w - 1 - c; break;
        case 270: sr = c;         sc = h - 1 - r; break;
      }
      out[r * w + c] = mask[sr * w + sc];
    }
  }
  return out;
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

  const { detections: rawDetections, protoData, protoH, protoW, nm, isProtoNCHW } = await runYoloDetection(imageUri);
  const filtered = processAiResults(rawDetections, treeType);

  if (filtered.length === 0) {
    return {
      type: 'detection',
      confidence: 1.0,
      label: 'noPestFound',
      severity: 'info',
      recommendation: 'noPestFoundDesc',
      treeContext: treeType,
      maskUri: null,
      detections: [],
    };
  }

  // Generate instance masks for all detections (limit to top 10)
  // Convert Float32Array maskCoeffs → plain Array to avoid React Navigation serialization warnings
  const withMasks = filtered.slice(0, 10).map(det => {
    try {
      const instMask = generateInstanceMask(det.maskCoeffs, protoData, protoH, protoW, nm, isProtoNCHW);
      cropMaskToBbox(instMask, protoH, protoW, det.bbox);
      const { maskCoeffs, ...rest } = det;
      return { ...rest, maskUri: instanceMaskToUri(instMask, protoH, protoW) };
    } catch {
      const { maskCoeffs, ...rest } = det;
      return { ...rest, maskUri: null };
    }
  });

  const best = withMasks[0];
  const bestLabel = PEST_LABELS[best.className] || best.className;
  return {
    type: 'detection',
    confidence: best.confidence,
    label: bestLabel,
    severity: best.confidence > 0.60 ? 'critical' : 'warning',
    recommendation: `Detected ${withMasks.length}x bark damage. Strongest: ${bestLabel} (${Math.round(best.confidence * 100)}%).`,
    treeContext: treeType,
    maskUri: best.maskUri,
    detections: withMasks,
  };
};

// ==========================================
// TTA-ENHANCED DETECTION
// ==========================================
const TTA_CONF_HIGH = 0.50;   // Above this → accept immediately, skip TTA
const TTA_CONF_LOW  = 0.20;   // Between LOW and HIGH → try TTA for better result

/**
 * Print a formatted summary table of all TTA rotation attempts.
 */
const printTtaSummary = (ttaLog) => {
  log('[TTA] ═══════════════════════════════════════════');
  log('[TTA]  ROTATION SUMMARY');
  log('[TTA] ───────────────────────────────────────────');
  for (const entry of ttaLog) {
    const conf = entry.bestConf > 0 ? (entry.bestConf * 100).toFixed(1) + '%' : '  — ';
    const icon = entry.status === 'accepted' ? '✓'
      : entry.status === 'fallback' || entry.status === 'fallback-updated' ? '~'
      : entry.status === 'empty' ? '✗'
      : '·';
    log(`[TTA]  ${icon}  ${String(entry.angle).padStart(3)}°  │  dets: ${entry.detections}  │  conf: ${conf.padStart(6)}  │  ${entry.status}`);
  }
  log('[TTA] ═══════════════════════════════════════════');
};

/**
 * Build a final result object from filtered detections + proto data,
 * applying bbox/mask back-rotation when angle ≠ 0.
 */
const buildTtaResult = (filtered, protoData, protoH, protoW, nm, isProtoNCHW, angle, treeType) => {
  const withMasks = filtered.slice(0, 10).map(det => {
    try {
      let instMask = generateInstanceMask(det.maskCoeffs, protoData, protoH, protoW, nm, isProtoNCHW);
      const correctedBbox = rotateBboxBack(det.bbox, angle);
      if (angle !== 0) {
        instMask = rotateMaskBack(instMask, protoH, protoW, angle);
      }
      cropMaskToBbox(instMask, protoH, protoW, correctedBbox);
      const { maskCoeffs, bbox, ...rest } = det;
      return { ...rest, bbox: correctedBbox, maskUri: instanceMaskToUri(instMask, protoH, protoW) };
    } catch {
      const correctedBbox = rotateBboxBack(det.bbox, angle);
      const { maskCoeffs, bbox, ...rest } = det;
      return { ...rest, bbox: correctedBbox, maskUri: null };
    }
  });

  const best = withMasks[0];
  const bestLabel = PEST_LABELS[best.className] || best.className;
  return {
    type: 'detection',
    confidence: best.confidence,
    label: bestLabel,
    severity: best.confidence > 0.60 ? 'critical' : 'warning',
    recommendation: `Detected ${withMasks.length}x bark damage. Strongest: ${bestLabel} (${Math.round(best.confidence * 100)}%).`,
    treeContext: treeType,
    maskUri: best.maskUri,
    detections: withMasks,
    rotationUsed: angle,
  };
};

/**
 * Test-Time Augmentation with smart early-exit:
 *
 *  1. Run inference at 0°.
 *     • conf ≥ 0.50  → return immediately (high-confidence hit).
 *     • 0.20 ≤ conf < 0.50  → save as fallback, try 90°/180°/270°
 *       for a result above 0.50. If none found → return the 0° fallback.
 *     • no detection → try remaining rotations; first hit wins.
 *
 *  2. If all 4 rotations produce nothing → "no pest found".
 */
export const detectWithTTA = async (imageUri, treeType = 'auto') => {
  if (!yoloModel) throw new Error('YOLO model not loaded');

  let fallbackResult = null; // stashed low-confidence result
  const ttaLog = [];         // rotation attempt log

  for (const angle of TTA_ROTATIONS) {
    log(`[TTA] Trying rotation ${angle}°...`);
    const rotatedUri = await rotateImage(imageUri, angle);
    const { detections: rawDets, protoData, protoH, protoW, nm, isProtoNCHW } =
      await runYoloDetection(rotatedUri);
    const filtered = processAiResults(rawDets, treeType);

    if (filtered.length === 0) {
      ttaLog.push({ angle, detections: 0, bestConf: 0, status: 'empty' });
      log(`[TTA] No detections at ${angle}°, trying next...`);
      continue;
    }

    const bestConf = filtered[0].confidence;
    log(`[TTA] Found ${filtered.length} detection(s) at ${angle}°, best conf=${bestConf.toFixed(3)}`);

    // High-confidence → accept immediately
    if (bestConf >= TTA_CONF_HIGH) {
      ttaLog.push({ angle, detections: filtered.length, bestConf, status: 'accepted' });
      log(`[TTA] High confidence (${bestConf.toFixed(3)} ≥ ${TTA_CONF_HIGH}) at ${angle}° → accepting`);
      printTtaSummary(ttaLog);
      const result = buildTtaResult(filtered, protoData, protoH, protoW, nm, isProtoNCHW, angle, treeType);
      result.ttaLog = ttaLog;
      return result;
    }

    // Low-confidence → stash as fallback (keep best across rotations)
    if (bestConf >= TTA_CONF_LOW) {
      if (!fallbackResult || bestConf > fallbackResult.confidence) {
        const status = !fallbackResult ? 'fallback' : 'fallback-updated';
        ttaLog.push({ angle, detections: filtered.length, bestConf, status });
        log(`[TTA] Low confidence (${bestConf.toFixed(3)}) at ${angle}° → ${status}`);
        fallbackResult = buildTtaResult(filtered, protoData, protoH, protoW, nm, isProtoNCHW, angle, treeType);
      } else {
        ttaLog.push({ angle, detections: filtered.length, bestConf, status: 'skipped-worse' });
        log(`[TTA] Lower conf (${bestConf.toFixed(3)} ≤ ${fallbackResult.confidence.toFixed(3)}) at ${angle}° → skipped`);
      }
      continue;
    }

    // Below TTA_CONF_LOW
    ttaLog.push({ angle, detections: filtered.length, bestConf, status: 'below-threshold' });
  }

  // Summary
  printTtaSummary(ttaLog);

  // Return stashed fallback if we have one
  if (fallbackResult) {
    log(`[TTA] No high-conf hit; returning fallback (conf=${fallbackResult.confidence.toFixed(3)}, rot=${fallbackResult.rotationUsed}°)`);
    fallbackResult.ttaLog = ttaLog;
    return fallbackResult;
  }

  log('[TTA] No detections after all 4 rotations.');
  return {
    type: 'detection',
    confidence: 1.0,
    label: 'noPestFound',
    severity: 'info',
    recommendation: 'noPestFoundDesc',
    treeContext: treeType,
    maskUri: null,
    detections: [],
    rotationUsed: null,
    ttaLog,
  };
};

// Legacy wrapper — now uses TTA-enhanced detection
export const analyzeImage = async (imageUri, treeType) => {
  try {
    await initModel();
    return await detectWithTTA(imageUri, treeType);
  } catch (error) {
    console.error('Critical error in AI pipeline:', error);
    return null;
  }
};