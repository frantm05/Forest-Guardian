import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') global.Buffer = Buffer;

const log = (...args) => { console.warn(...args); };

export const TREE_TYPES = [
  { id: 'auto', labelKey: 'treeUnknown', latinKey: 'treeUnknownLatin' },
  { id: 'spruce', labelKey: 'treeSpruce', latinKey: 'treeSpruceLatin' },
  { id: 'larch', labelKey: 'treeLarch', latinKey: 'treeLarchLatin' },
  { id: 'pine', labelKey: 'treePine', latinKey: 'treePineLatin' },
];

const PEST_CLASSES = ['Ips cembrae', 'Pityogenes chalcographus'];

const PEST_LABELS = {
  'Ips cembrae': 'Lýkožrout modřínový (Ips cembrae)',
  'Pityogenes chalcographus': 'Lýkožrout lesklý (Pityogenes chalcographus)',
};

const YOLO_INPUT_SIZE = 640;
const YOLO_CONF_THRESHOLD = 0.25;
const YOLO_IOU_THRESHOLD = 0.45;
const YOLO_NUM_MASK_COEFFS = 32;
const YOLO_MASK_THRESHOLD = 0.5;

const PEST_HOST_TREES = {
  'Ips cembrae': ['Modřín'],
  'Pityogenes chalcographus': ['Smrk', 'Borovice'],
};

const TREE_ID_TO_NAME = {
  'spruce': 'Smrk',
  'larch': 'Modřín',
  'pine': 'Borovice',
  'auto': null,
};

let yoloModel = null;

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

  return true;
};

export const areModelsLoaded = () => !!yoloModel;

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

const parseYoloSegOutput = (rawDetections, detShape, protoShape) => {
  const nm = protoShape ? protoShape[protoShape.length - 1] : YOLO_NUM_MASK_COEFFS;
  const isEnd2End = detShape[1] > detShape[2];

  if (isEnd2End) {
    return parseYoloEnd2End(rawDetections, detShape, nm);
  }
  return parseYoloClassic(rawDetections, detShape, nm);
};

const parseYoloEnd2End = (raw, detShape, nm) => {
  const N = detShape[1];
  const features = detShape[2];
  const detections = [];

  let maxCoord = 0;
  for (let i = 0; i < Math.min(N, 50); i++) {
    const off = i * features;
    if (raw[off + 4] < YOLO_CONF_THRESHOLD) continue;
    maxCoord = Math.max(maxCoord, raw[off], raw[off + 1], raw[off + 2], raw[off + 3]);
  }
  const needsNormalize = maxCoord > 2.0;

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

  detections.sort((a, b) => b.confidence - a.confidence);
  return detections;
};

const parseYoloClassic = (raw, detShape, nm) => {
  const rowSize = detShape[1];
  const N = detShape[2];
  const nc = rowSize - 4 - nm;

  if (nc <= 0) {
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

const generateInstanceMask = (maskCoeffs, protoData, protoH, protoW, nm = YOLO_NUM_MASK_COEFFS, isNCHW = false) => {
  const mask = new Float32Array(protoH * protoW);

  for (let y = 0; y < protoH; y++) {
    for (let x = 0; x < protoW; x++) {
      let sum = 0;
      for (let m = 0; m < nm; m++) {
        const idx = isNCHW
          ? m * protoH * protoW + y * protoW + x
          : y * protoW * nm + x * nm + m;
        sum += maskCoeffs[m] * protoData[idx];
      }
      mask[y * protoW + x] = sigmoid(sum) > YOLO_MASK_THRESHOLD ? 1.0 : 0.0;
    }
  }

  return mask;
};

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

const inferProtoShape = (len) => {
  const nm = YOLO_NUM_MASK_COEFFS;
  const hw = Math.round(Math.sqrt(len / nm));
  if (hw * hw * nm === len) return [1, hw, hw, nm];
  return [1, 160, 160, 32];
};

const inferDetShape = (len) => {
  const nc = PEST_CLASSES.length;
  const nm = YOLO_NUM_MASK_COEFFS;
  const classicFeat = 4 + nc + nm;
  const classicN = 8400;

  if (len === classicFeat * classicN) {
    return [1, classicFeat, classicN];
  }

  const e2eFeat = 4 + 1 + 1 + nm;
  if (e2eFeat > 0 && len % e2eFeat === 0) {
    const maxDet = len / e2eFeat;
    if (maxDet > 0 && maxDet <= 1000) {
      return [1, maxDet, e2eFeat];
    }
  }

  return [1, 38, 8400];
};

const runYoloDetection = async (imageUri) => {
  if (!yoloModel) throw new Error('YOLO model not loaded');

  const resized = await manipulateAsync(
    imageUri,
    [{ resize: { width: YOLO_INPUT_SIZE, height: YOLO_INPUT_SIZE } }],
    { format: SaveFormat.JPEG, base64: true }
  );

  const decoded = jpeg.decode(Buffer.from(resized.base64, 'base64'), { useTArray: true });
  const pixels = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;

  const input = new Float32Array(3 * pixels);
  for (let i = 0, p = 0; i < decoded.data.length; i += 4, p++) {
    input[0 * pixels + p] = decoded.data[i]     / 255.0;
    input[1 * pixels + p] = decoded.data[i + 1] / 255.0;
    input[2 * pixels + p] = decoded.data[i + 2] / 255.0;
  }

  const inputName = yoloModel.inputNames[0];
  const inputTensor = new Tensor('float32', input, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]);
  const results = await yoloModel.run({ [inputName]: inputTensor });

  const outputNames = yoloModel.outputNames;

  let protoName = null, detName = null;
  let maxLen = 0;
  for (const name of outputNames) {
    const len = results[name].data?.length || 0;
    if (len > maxLen) {
      maxLen = len;
      protoName = name;
    }
  }
  let detMaxLen = 0;
  for (const name of outputNames) {
    if (name === protoName) continue;
    const len = results[name].data?.length || 0;
    if (len > detMaxLen) {
      detMaxLen = len;
      detName = name;
    }
  }
  if (outputNames.length < 2) {
    throw new Error(`Model has only ${outputNames.length} output tensor(s), expected 2+`);
  }
  if (maxLen < 100000 && detMaxLen > maxLen) {
    [protoName, detName] = [detName, protoName];
  }

  const protoTensor = results[protoName];
  const detTensor = results[detName];

  const protoShape = (protoTensor.dims?.length >= 4)
    ? Array.from(protoTensor.dims)
    : inferProtoShape(protoTensor.data?.length || 0);

  const detShape = (detTensor.dims?.length >= 3)
    ? Array.from(detTensor.dims)
    : inferDetShape(detTensor.data?.length || 0);

  const isProtoNCHW = protoShape[1] < protoShape[2];
  let protoH, protoW, nm;
  if (isProtoNCHW) {
    nm = protoShape[1];
    protoH = protoShape[2];
    protoW = protoShape[3];
  } else {
    protoH = protoShape[1];
    protoW = protoShape[2];
    nm = protoShape[3];
  }
  const protoData = protoTensor.data;

  const detections = parseYoloSegOutput(detTensor.data, detShape, [1, protoH, protoW, nm]);

  return { detections, protoData, protoH, protoW, nm, isProtoNCHW };
};

const processAiResults = (predictions, treeType) => {
  const treeName = TREE_ID_TO_NAME[treeType] || null;

  if (!treeName) {
    return predictions;
  }

  const filtered = predictions.map(prediction => {
    const allowedTrees = PEST_HOST_TREES[prediction.className];
    if (allowedTrees && allowedTrees.includes(treeName)) {
      const boosted = Math.min(prediction.confidence * 1.25, 1.0);
      return { ...prediction, confidence: boosted };
    }
    if (allowedTrees && !allowedTrees.includes(treeName)) {
      const penalized = prediction.confidence * 0.05;
      return { ...prediction, confidence: penalized };
    }
    return prediction;
  });

  return filtered.sort((a, b) => b.confidence - a.confidence);
};

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

const TTA_ROTATIONS = [0, 90, 180, 270];
const TTA_CONF_HIGH = 0.50;
const TTA_CONF_LOW  = 0.20;

const rotateImage = async (imageUri, angle) => {
  if (angle === 0) return imageUri;
  const result = await manipulateAsync(imageUri, [{ rotate: angle }], { format: SaveFormat.JPEG });
  return result.uri;
};

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

export const detectWithTTA = async (imageUri, treeType = 'auto') => {
  if (!yoloModel) throw new Error('YOLO model not loaded');

  let fallbackResult = null;

  for (const angle of TTA_ROTATIONS) {
    const rotatedUri = await rotateImage(imageUri, angle);
    const { detections: rawDets, protoData, protoH, protoW, nm, isProtoNCHW } =
      await runYoloDetection(rotatedUri);
    const filtered = processAiResults(rawDets, treeType);

    if (filtered.length === 0) continue;

    const bestConf = filtered[0].confidence;

    if (bestConf >= TTA_CONF_HIGH) {
      return buildTtaResult(filtered, protoData, protoH, protoW, nm, isProtoNCHW, angle, treeType);
    }

    if (bestConf >= TTA_CONF_LOW) {
      if (!fallbackResult || bestConf > fallbackResult.confidence) {
        fallbackResult = buildTtaResult(filtered, protoData, protoH, protoW, nm, isProtoNCHW, angle, treeType);
      }
    }
  }

  if (fallbackResult) {
    return fallbackResult;
  }

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
  };
};