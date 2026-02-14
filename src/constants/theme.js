// src/constants/theme.js

export const COLORS = {
  // Primární barvy z UI designu
  primary: '#166534',    // green-800 - Hlavní lesní zelená
  primaryLight: '#22c55e', // green-500 - Jasná zelená pro akcenty
  primaryDark: '#052e16', // green-950 - Tmavé pozadí
  
  // Sekundární
  secondary: '#f4f4f5',  // zinc-100 - Pozadí karet
  accent: '#eab308',     // yellow-500 - Varování/Pozor
  destructive: '#ef4444', // red-500 - Kritický stav

  // Neutrální (Zinc paleta)
  background: '#ffffff', // Čistá bílá
  surface: '#ffffff',
  border: '#e4e4e7',     // zinc-200 - Jemné ohraničení
  
  // Text
  text: {
    primary: '#09090b',  // zinc-950 - Hlavní text
    secondary: '#71717a', // zinc-500 - Popisky
    inverse: '#ffffff',   // Text na tmavém pozadí
  },
};

export const SPACING = {
  xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  s: 6,   // Smal radius (badges)
  m: 12,  // Medium radius (buttons, inputs)
  l: 16,  // Large radius (cards)
  xl: 24, // Extra large (modals)
  full: 999,
};

// Moderní stíny ve stylu "Shadcn/Tailwind"
export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: "#166534", // Barevný stín pro primary prvky
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  }
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', color: COLORS.text.primary, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '600', color: COLORS.text.primary, letterSpacing: -0.5 },
  h3: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary },
  body: { fontSize: 16, lineHeight: 24, color: COLORS.text.secondary },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text.primary },
  caption: { fontSize: 12, color: COLORS.text.secondary },
};