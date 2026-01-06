// src/constants/theme.js

/**
 * Design System Tokens
 * Centralizovaná definice barev, mezer a typografie pro celou aplikaci.
 */

export const COLORS = {
    primary: "#2E7D32", // Forest Green - hlavní akce
    secondary: "#5D4037", // Bark Brown - sekundární prvky
    accent: "#FFC107", // Amber - zvýraznění (např. varování)
    background: "#F5F5F5", // Light Grey - pozadí obrazovek
    surface: "#FFFFFF", // White - pozadí karet
    text: {
        primary: "#212121", // Téměř černá pro hlavní text
        secondary: "#757575", // Šedá pro popisky
        inverse: "#FFFFFF", // Text na tmavém pozadí
    },
    status: {
        error: "#D32F2F", // Červená pro chyby/silné napadení
        success: "#388E3C", // Zelená pro zdravý strom
        warning: "#FBC02D", // Žlutá pro podezření
    },
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16, // Standardní padding
    l: 24,
    xl: 32,
    xxl: 48,
};

export const TYPOGRAPHY = {
    header: {
        fontSize: 24,
        fontWeight: "700",
        lineHeight: 32,
    },
    subHeader: {
        fontSize: 18,
        fontWeight: "600",
        lineHeight: 26,
    },
    body: {
        fontSize: 16,
        fontWeight: "400",
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        fontWeight: "400",
        color: COLORS.text.secondary,
    },
};

export const RADIUS = {
    s: 4,
    m: 8, // Standardní zaoblení tlačítek
    l: 16, // Zaoblení karet
    round: 999, // Plně kulaté
};
