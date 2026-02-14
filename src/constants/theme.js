// src/constants/theme.js

export const COLORS = {
  // Primární paleta (Forest Modern)
  primary: '#2D5A27',    // Deep Forest Green - hlavní akce, hlavičky
  primaryDark: '#1B3E18', // Tmavší varianta pro stavy onPress
  secondary: '#8D6E63',  // Bark Brown - sekundární prvky, ikony
  accent: '#E65100',     // Alert Orange - pro detekci kůrovce (vysoké riziko)
  
  // Neutrální tóny
  background: '#F8F9FA', // Off-white - mnohem příjemnější než čistá bílá
  surface: '#FFFFFF',    // Karty
  surfaceVariant: '#F0F4F0', // Jemně nazelenalé pozadí pro aktivní prvky
  
  // Text
  text: {
    primary: '#1A1C19',  // Téměř černá (Soft Black)
    secondary: '#424940', // Tmavě šedá s nádechem zelené
    tertiary: '#72796F',  // Popisky
    inverse: '#FFFFFF',
  },
  
  // Stavy
  status: {
    safe: '#2E7D32',
    warning: '#F9A825',
    danger: '#C62828',
  },
  
  // Overlay (pro kameru)
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export const SPACING = {
  xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  s: 8,   // Menší prvky
  m: 16,  // Karty a tlačítka (moderní standard je kulatější)
  l: 24,  // Modaly
  full: 999,
};

export const SHADOWS = {
  light: {
    shadowColor: "#2D5A27",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heavy: { // Pro plovoucí tlačítka (FAB)
    shadowColor: "#2D5A27",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  }
};

export const TYPOGRAPHY = {
  header: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: COLORS.text.primary },
  subHeader: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary },
  body: { fontSize: 16, lineHeight: 24, color: COLORS.text.secondary },
  caption: { fontSize: 13, color: COLORS.text.tertiary },
  button: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
};