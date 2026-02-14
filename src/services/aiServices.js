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
  { id: 'spruce', label: 'Smrk ztepilý (Picea abies)', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'pine', label: 'Borovice lesní (Pinus sylvestris)', defaultMode: DETECTION_MODES.SEGMENTATION },
  { id: 'oak', label: 'Dub (Quercus)', defaultMode: DETECTION_MODES.OBJECT },
  { id: 'unknown', label: 'Neznámý druh / Automaticky', defaultMode: DETECTION_MODES.OBJECT },
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
          box: { x: 50, y: 100, w: 200, h: 200 }, // Souřadnice pro vykreslení čtverce
          severity: 'high',
          recommendation: 'Okamžitá asanace napadeného stromu.',
          treeContext: treeType
        });
      } else {
        resolve({
          type: 'segmentation',
          confidence: 0.88,
          label: 'Požerky (Matečné chodby)',
          mask: 'base64_string_of_mask...', // V reálu zde bude maska
          severity: 'medium',
          recommendation: 'Sledovat vývoj, zkontrolovat výletové otvory.',
          treeContext: treeType
        });
      }
    }, 2500); // 2.5s zpoždění pro efekt "přemýšlení"
  });
};