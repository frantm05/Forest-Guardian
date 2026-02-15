import { useState, useCallback } from 'react';
import { DETECTION_MODES, TREE_TYPES } from '../services/aiServices';

/**
 * Custom hook pro stav UI kamery (vybraný strom, režim detekce, modály).
 * @returns {object}
 */
const useInterface = () => {
  const [selectedTree, setSelectedTree] = useState(TREE_TYPES[0]);
  const [mode, setMode] = useState(DETECTION_MODES.OBJECT);
  const [showTreeModal, setShowTreeModal] = useState(false);

  const openTreeModal = useCallback(() => setShowTreeModal(true), []);
  const closeTreeModal = useCallback(() => setShowTreeModal(false), []);

  const selectTree = useCallback((tree) => {
    setSelectedTree(tree);
    setShowTreeModal(false);
  }, []);

  const toggleMode = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  return {
    selectedTree,
    mode,
    showTreeModal,
    openTreeModal,
    closeTreeModal,
    selectTree,
    toggleMode,
    treeTypes: TREE_TYPES,
    detectionModes: DETECTION_MODES,
  };
};

export default useInterface;