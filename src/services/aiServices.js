// src/services/aiServices.js

/**
 * Typy detekce podporované aplikací (dle Tezí)
 */
export const DETECTION_MODES = {
  OBJECT: 'object_detection', // Hledání brouků (bounding boxes)
  SEGMENTATION: 'segmentation', // Hledání požerků (pixel map)
};

/**
 * Podporované druhy stromů
 */
export const TREE_TYPES = [
  { id: 'spruce', labelKey: 'treeSpruce', icon: '🌲', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'pine', labelKey: 'treePine', icon: '🌲', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'oak', labelKey: 'treeOak', icon: '🌳', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'beech', labelKey: 'treeBeech', icon: '🌳', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'birch', labelKey: 'treeBirch', icon: '🌳', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'larch', labelKey: 'treeLarch', icon: '🌲', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'fir', labelKey: 'treeFir', icon: '🌲', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'unknown', labelKey: 'treeUnknown', icon: '🔍', defaultMode: DETECTION_MODES.OBJECT },
];

/**
 * Simuluje (nebo provádí) inferenci AI modelu.
 * * @param {string} imageUri - Cesta k fotce
 * @param {string} mode - 'object_detection' nebo 'segmentation'
 * @param {string} treeType - ID stromu (např. 'spruce')
 */
export const analyzeImage = async (imageUri, mode, treeType) => {
  console.log(`Spouštím analýzu: Mode=${mode}, Tree=${treeType}`);

  // TODO: Zde bude reálné volání TFLite modelu
  // const model = await tf.loadGraphModel(...);
  // const prediction = model.predict(imageTensor);

  return new Promise((resolve) => {
    setTimeout(() => {
      // MOCK DATA - Simulace výsledků pro účely UI a obhajoby
      // V reálu zde vrátíš data z TFLite
      
      if (mode === DETECTION_MODES.OBJECT) {
        resolve({
          type: 'detection',
          confidence: 0.94,
          label: 'Lýkožrout smrkový',
          box: { x: 50, y: 100, w: 200, h: 200 },
          severity: 'high',
          treeContext: treeType
        });
      } else {
        resolve({
          type: 'segmentation',
          confidence: 0.88,
          label: 'Požerky',
          mask: 'base64_string_of_mask...',
          severity: 'medium',
          treeContext: treeType
        });
      }
    }, 2500); // 2.5s zpoždění pro efekt "přemýšlení"
  });
};