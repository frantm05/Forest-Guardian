/**
 * @module formatters
 * @description Utility functions for formatting dates and grouping records.
 */

import { t } from './i18n';
import { TREE_TYPES } from '../services/aiServices';

/**
 * Formats an ISO date string into a human-readable format.
 * @param {string | number | Date} dateInput - Input date value
 * @returns {string} Formatted date, e.g. "12. 05. 2025 • 14:30"
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
 * Returns a date-only key string (YYYY-MM-DD) for grouping.
 */
const dateKey = (dateInput) => {
    const d = new Date(dateInput);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Returns a human-readable section title for a date key.
 * "Dnes", "Včera", or formatted date like "12. 03. 2026".
 */
export const getDateSectionTitle = (key, lang) => {
    const now = new Date();
    const todayKey = dateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dateKey(yesterday);

    if (key === todayKey) return t(lang, 'today');
    if (key === yesterdayKey) return t(lang, 'yesterday');

    const [y, m, d] = key.split('-');
    return `${d}. ${m}. ${y}`;
};

/**
 * Groups an array of history items by day into SectionList-compatible sections.
 * Items are assumed to be sorted newest-first.
 * @param {Array} items - History records with .date field
 * @param {string} lang - Language code for section titles
 * @returns {Array<{title: string, data: Array}>}
 */
export const groupByDay = (items, lang) => {
    const map = new Map();
    for (const item of items) {
        const key = item.date ? dateKey(item.date) : 'unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([key, data]) => ({
        title: getDateSectionTitle(key, lang),
        data,
    }));
};

/**
 * Returns the display label for a tree type, translated to the current language.
 * @param {object|null} tree - Tree type object from TREE_TYPES (or null).
 * @param {string} treeType - Tree type ID fallback.
 * @param {string} lang - Current language code.
 * @returns {string}
 */
export const getTreeDisplayLabel = (tree, treeType, lang) => {
    if (!tree) return treeType || t(lang, 'treeUnknown');
    if (tree.id === 'auto') return t(lang, tree.labelKey);
    return t(lang, tree.labelKey);
};

/**
 * Extracts uppercase initials from a full name string.
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
    if (!name) return '';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
};