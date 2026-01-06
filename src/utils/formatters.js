// src/utils/formatters.js

/**
 * Zformátuje ISO datum string na čitelný formát.
 * @param {string | number | Date} dateInput - Vstupní datum
 * @returns {string} - Např. "12. 05. 2025 • 14:30"
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return '';

    const date = new Date(dateInput);

    return new Intl.DateTimeFormat('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date).replace(',', ' •');
};

/**
 * Převede skóre spolehlivosti (0-1) na procenta.
 * @param {number} confidence 
 * @returns {string} - Např. "98%"
 */
export const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
};