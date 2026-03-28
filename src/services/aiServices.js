// src/services/aiServices.js
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

export const DETECTION_MODES = {
  SEGMENTATION: 'segmentation',
};

export const TREE_TYPES = [
  { id: 'spruce', label: 'Smrk ztepilý (Picea abies)' },
  { id: 'larch', label: 'Modřín opadavý (Larix decidua)' },
  { id: 'pine', label: 'Borovice lesní (Pinus sylvestris)' },
  { id: 'unknown', label: 'Neznámý druh' },
];

const PEST_CLASSES = ['Lýkožrout modřínový', 'Lýkožrout lesklý', 'Lýkožrout smrkový', 'Zdravé dřevo / Pozadí'];

let mobileNetModel = null;
let samEncoder = null;
let samDecoder = null;

export const initModel = async () => {
  if (!mobileNetModel) {
    console.log("Načítám nový MobileNetV3-Large mozek...");
    mobileNetModel = await loadTensorflowModel(require('./../assets/models/forest_guardian_model.tflite'));
  }
  if (!samEncoder) {
    console.log("Načítám Qualcomm SAM Encoder...");
    samEncoder = await loadTensorflowModel(require('./../assets/models/mobilesam-mobilesamencoder.tflite'));
  }
  if (!samDecoder) {
    console.log("Načítám Qualcomm SAM Decoder...");
    samDecoder = await loadTensorflowModel(require('./../assets/models/mobilesam-mobilesamdecoder.tflite'));
  }
  return { mobileNetModel, samEncoder, samDecoder };
};

// Pomocná funkce pro výpočet velikosti tenzoru (ošetřuje i záporné batch sizes jako -1)
const getTensorSize = (shape) => shape.reduce((a, b) => Math.max(1, a) * Math.max(1, b), 1);

export const analyzeImage = async (imageUri, treeType, samBox) => {
  try {
    const { mobileNetModel, samEncoder, samDecoder } = await initModel();
    let mobileNetInput = null;
    let samMaskUriResult = null;

    console.log("=== START DYNAMICKÉ AI PIPELINE ===");

    if (!samBox) throw new Error("Chybí nápověda z UI (Laso).");

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const buildFallbackMobileNetInput = async () => {
      const targetSize = 800;
      const baseImg = await manipulateAsync(
        imageUri,
        [{ resize: { width: targetSize, height: targetSize } }],
        { format: SaveFormat.JPEG }
      );

      const minX = Number.isFinite(samBox?.percentMinX) ? samBox.percentMinX : 0;
      const minY = Number.isFinite(samBox?.percentMinY) ? samBox.percentMinY : 0;
      const maxX = Number.isFinite(samBox?.percentMaxX) ? samBox.percentMaxX : minX + 0.1;
      const maxY = Number.isFinite(samBox?.percentMaxY) ? samBox.percentMaxY : minY + 0.1;

      const safeMinX = clamp(minX, 0, 0.999);
      const safeMinY = clamp(minY, 0, 0.999);
      const safeMaxX = clamp(Math.max(maxX, safeMinX + 0.01), 0.001, 1);
      const safeMaxY = clamp(Math.max(maxY, safeMinY + 0.01), 0.001, 1);

      const cropX = clamp(Math.floor(safeMinX * targetSize), 0, targetSize - 1);
      const cropY = clamp(Math.floor(safeMinY * targetSize), 0, targetSize - 1);
      const cropX2 = clamp(Math.ceil(safeMaxX * targetSize), cropX + 1, targetSize);
      const cropY2 = clamp(Math.ceil(safeMaxY * targetSize), cropY + 1, targetSize);
      const cropW = Math.max(1, cropX2 - cropX);
      const cropH = Math.max(1, cropY2 - cropY);

      const croppedImg = await manipulateAsync(
        baseImg.uri,
        [
          { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
          { resize: { width: 224, height: 224 } },
        ],
        { format: SaveFormat.JPEG, base64: true }
      );

      const decoded = jpeg.decode(Buffer.from(croppedImg.base64, 'base64'), { useTArray: true });
      const result = new Float32Array(224 * 224 * 3);
      for (let i = 0, j = 0; i < decoded.data.length; i += 4, j += 3) {
        result[j] = decoded.data[i];
        result[j + 1] = decoded.data[i + 1];
        result[j + 2] = decoded.data[i + 2];
      }

      return result;
    };

    try {
      // ==========================================
      // FÁZE 1: SAM ENCODER
      // ==========================================
      console.log("[SAM] Generuji Embeddings z fotky...");
      const encoderSize = 1024;

      const encoderImg = await manipulateAsync(
        imageUri,
        [{ resize: { width: encoderSize, height: encoderSize } }],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );

      const decodedEncoder = jpeg.decode(Buffer.from(encoderImg.base64, 'base64'), { useTArray: true });
      const encoderInput = new Float32Array(encoderSize * encoderSize * 3);
      for (let i = 0, j = 0; i < decodedEncoder.data.length; i += 4, j += 3) {
        encoderInput[j] = decodedEncoder.data[i] / 255.0;
        encoderInput[j + 1] = decodedEncoder.data[i + 1] / 255.0;
        encoderInput[j + 2] = decodedEncoder.data[i + 2] / 255.0;
      }

      const encoderInputsArray = samEncoder.inputs.map(() => encoderInput);
      const encoderOutput = await samEncoder.run(encoderInputsArray);
      const imageEmbeddings = encoderOutput[0];

      // ==========================================
      // FÁZE 2: STRIKTNÍ SAM DECODER (bez hádání)
      // ==========================================
      console.log("[SAM] Osahávám Decoder a připravuji masku...");
      console.log("[SAM] Vstupy Decoderu:", samDecoder.inputs.map(inp => ({
        name: inp?.name,
        shape: inp?.shape,
        dtype: inp?.dataType ?? inp?.dtype ?? inp?.type,
      })));
      const pt1X = samBox.percentMinX * encoderSize;
      const pt1Y = samBox.percentMinY * encoderSize;
      const pt2X = samBox.percentMaxX * encoderSize;
      const pt2Y = samBox.percentMaxY * encoderSize;

      const createTypedTensor = (inp, size, fillValue = 0) => {
        const dtype = String(inp?.dataType || inp?.dtype || inp?.type || '').toLowerCase();
        const tensor = dtype.includes('int') ? new Int32Array(size) : new Float32Array(size);
        if (fillValue !== 0) tensor.fill(fillValue);
        return tensor;
      };

      const decoderInputsArray = [];
      let hasEmbedding = false;
      let hasCoords = false;
      let hasLabels = false;
      let hasMaskInput = false;
      let hasHasMaskInput = false;
      let unsupportedInput = null;

      for (const inp of samDecoder.inputs) {
        const name = String(inp?.name || '').toLowerCase();
        const shape = Array.isArray(inp?.shape) ? inp.shape : [];
        const size = getTensorSize(shape.length > 0 ? shape : [1]);
        const rank = shape.length;

        if (name.includes('embed') || size === 256 * 64 * 64) {
          decoderInputsArray.push(imageEmbeddings);
          hasEmbedding = true;
          continue;
        }

        if (name.includes('coord') || name.includes('point_coords') || (rank >= 2 && size === 4)) {
          const coords = createTypedTensor(inp, size);
          if (size >= 4) {
            coords[0] = pt1X;
            coords[1] = pt1Y;
            coords[2] = pt2X;
            coords[3] = pt2Y;
          } else if (size >= 2) {
            coords[0] = (pt1X + pt2X) / 2;
            coords[1] = (pt1Y + pt2Y) / 2;
          }
          decoderInputsArray.push(coords);
          hasCoords = true;
          continue;
        }

        if (name.includes('label') || name.includes('point_labels')) {
          const labels = createTypedTensor(inp, size);
          if (size >= 2) {
            labels[0] = 2;
            labels[1] = 3;
          } else if (size >= 1) {
            labels[0] = 1;
          }
          decoderInputsArray.push(labels);
          hasLabels = true;
          continue;
        }

        // POZOR: Jméno 'has_mask_input' obsahuje podřetězec 'mask_input',
        // proto musí být 'has_mask' kontrolováno jako první.
        if (name.includes('has_mask') || (name.includes('has') && size === 1)) {
          decoderInputsArray.push(createTypedTensor(inp, size));
          hasHasMaskInput = true;
          continue;
        }

        if (name.includes('mask_input') || (rank >= 3 && size === 256 * 256)) {
          decoderInputsArray.push(createTypedTensor(inp, size));
          hasMaskInput = true;
          continue;
        }

        if (name.includes('orig') || name.includes('im_size') || name.includes('image_size')) {
          const imageSizeInput = createTypedTensor(inp, size);
          if (size >= 2) {
            imageSizeInput[0] = encoderSize;
            imageSizeInput[1] = encoderSize;
          }
          decoderInputsArray.push(imageSizeInput);
          continue;
        }

        unsupportedInput = `${inp?.name || 'unknown'} (${JSON.stringify(shape)})`;
        break;
      }

      if (unsupportedInput) {
        throw new Error(`Neznámý vstup Decoderu: ${unsupportedInput}`);
      }
      if (!hasEmbedding || !hasCoords || !hasLabels || !hasMaskInput || !hasHasMaskInput) {
        throw new Error('Decoder kontrakt není kompatibilní (chybí povinné vstupy).');
      }

      const decoderOutput = await samDecoder.run(decoderInputsArray);
      const maskOutput = decoderOutput?.[0];
      if (!maskOutput || !maskOutput.length) {
        throw new Error('Decoder nevrátil platnou masku.');
      }

      // ==========================================
      // FÁZE 3: ZČERNĚNÍ A OŘEZ (Čistý JS)
      // ==========================================
      console.log("[JS Engine] Aplikuji masku...");
      const maskSize = 256;
      const maskImg = await manipulateAsync(
        imageUri,
        [{ resize: { width: maskSize, height: maskSize } }],
        { format: SaveFormat.JPEG, base64: true }
      );
      const decodedMaskImg = jpeg.decode(Buffer.from(maskImg.base64, 'base64'), { useTArray: true });
      const pixels256 = decodedMaskImg.data;

      let minX = maskSize;
      let minY = maskSize;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < maskSize; y++) {
        for (let x = 0; x < maskSize; x++) {
          const idx = y * maskSize + x;
          if (maskOutput[idx] > 0.0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          } else {
            const pIdx = idx * 4;
            pixels256[pIdx] = 0;
            pixels256[pIdx + 1] = 0;
            pixels256[pIdx + 2] = 0;
          }
        }
      }

      if (maxX < minX) {
        throw new Error('Decoder vrátil prázdnou masku.');
      }

      // Zakódujeme maskovaný obrázek zpět do JPEG pro zobrazení v UI
      let samMaskUri = null;
      try {
        const maskJpegEncoded = jpeg.encode(
          { width: maskSize, height: maskSize, data: Buffer.from(pixels256) },
          80
        );
        samMaskUri = `data:image/jpeg;base64,${Buffer.from(maskJpegEncoded.data).toString('base64')}`;
      } catch (encodeErr) {
        console.warn('[Mask] Nelze zakódovat maskovaný obrázek:', encodeErr?.message);
      }
      samMaskUriResult = samMaskUri;

      const cropX = clamp(minX, 0, maskSize - 1);
      const cropY = clamp(minY, 0, maskSize - 1);
      const cropW = Math.max(1, clamp(maxX - minX, 1, maskSize - cropX));
      const cropH = Math.max(1, clamp(maxY - minY, 1, maskSize - cropY));

      const netSize = 224;
      mobileNetInput = new Float32Array(netSize * netSize * 3);
      for (let y = 0; y < netSize; y++) {
        for (let x = 0; x < netSize; x++) {
          const srcX = cropX + Math.floor((x / netSize) * cropW);
          const srcY = cropY + Math.floor((y / netSize) * cropH);
          const srcIdx = (srcY * maskSize + srcX) * 4;
          const dstIdx = (y * netSize + x) * 3;
          mobileNetInput[dstIdx] = pixels256[srcIdx];
          mobileNetInput[dstIdx + 1] = pixels256[srcIdx + 1];
          mobileNetInput[dstIdx + 2] = pixels256[srcIdx + 2];
        }
      }
    } catch (samStageError) {
      console.warn('[Fallback] SAM Decoder stage přeskočen:', samStageError?.message || samStageError);
      mobileNetInput = await buildFallbackMobileNetInput();
    }

    // ==========================================
    // FÁZE 4: DYNAMICKÝ MOBILENET KLASIFIKÁTOR
    // ==========================================
    console.log("[MobileNet] Posuzuji čistý vyříznutý požerek...");
    
    let treeVector = [0, 0, 0]; // Neznámý strom (Sama se rozhodne jen z obrazu)
    if (treeType === 'larch') treeVector = [1, 0, 0];
    else if (treeType === 'spruce') treeVector = [0, 1, 0];
    else if (treeType === 'pine') treeVector = [0, 0, 1];

    const treeInput = new Float32Array(treeVector);
    
    // Zaručíme naprostou kompatibilitu s MobileNetem (bez ohledu na pořadí vrstev)
    let mobileNetInputsArray = [];
    for (const inp of mobileNetModel.inputs) {
      if (inp.shape.length === 4) {
        mobileNetInputsArray.push(mobileNetInput);
      } else {
        mobileNetInputsArray.push(treeInput);
      }
    }

    const classOutput = await mobileNetModel.run(mobileNetInputsArray);
    const probabilities = classOutput[0];
    
    let maxProb = 0;
    let maxIndex = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIndex = i;
      }
    }

    console.log(`[Výsledek MobileNet]: ${PEST_CLASSES[maxIndex]} s jistotou ${(maxProb*100).toFixed(1)}%`);

    if (PEST_CLASSES[maxIndex] === 'Zdravé dřevo / Pozadí') {
      return {
        type: 'segmentation',
        confidence: maxProb,
        label: 'Zdravá kůra / Nejde o škůdce',
        severity: 'info',
        recommendation: 'Zakroužkovaný objekt neodpovídá škůdci. Model vyhodnotil, že se jedná pravděpodobně o přirozenou anomálii kůry, suk nebo stín.',
        treeContext: treeType,
        maskUri: samMaskUriResult,
      };
    }

    return {
      type: 'segmentation',
      confidence: maxProb,
      label: PEST_CLASSES[maxIndex],
      severity: maxProb > 0.60 ? 'critical' : 'warning',
      recommendation: `Škůdce detekován. Očekávaný druh na zvolené dřevině.`,
      treeContext: treeType,
      maskUri: samMaskUriResult,
    };

  } catch (error) {
    console.error("Kritická chyba v AI pipeline:", error);
    return null;
  }
};

export const testLoadModel = async () => { return await initModel(); };