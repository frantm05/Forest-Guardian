import { useState, useCallback } from 'react';
import { TREE_TYPES } from '../services/aiServices';

/**
 * Custom hook pro stav UI kamery (vybraný strom, modály).
 * @returns {object}
 */
const useInterface = () => {
  const [selectedTree, setSelectedTree] = useState(TREE_TYPES[0]);
  const [showTreeModal, setShowTreeModal] = useState(false);

  const openTreeModal = useCallback(() => setShowTreeModal(true), []);
  const closeTreeModal = useCallback(() => setShowTreeModal(false), []);

  const selectTree = useCallback((tree) => {
    setSelectedTree(tree);
    setShowTreeModal(false);
  }, []);

  return {
    selectedTree,
    showTreeModal,
    openTreeModal,
    closeTreeModal,
    selectTree,
    treeTypes: TREE_TYPES,
  };
};

export default useInterface;