const BaseColors = {
  // ============================================================
  // TASKFLOW BRAND
  // ============================================================

  // Primary TaskFlow action color
  primary: "#FF7A00",
  primaryHover: "#E96800",
  primaryPressed: "#D85F00",
  primaryLight: "#FFF1E4",
  primaryTrack: "#FF7A00",

  // TaskFlow dark foundation
  navy: "#071A33",
  navyDeep: "#041225",
  navyLight: "#102B4A",
  navySoft: "#173B5F",

  // ============================================================
  // BACKGROUNDS
  // ============================================================

  background: "#F5F6F8",
  backgroundSoft: "#F8F9FB",
  backgroundSelected: "#FFF1E4",
  backgroundElement: "#FFFFFF",

  surface: "#FFFFFF",
  surfaceMuted: "#F1F3F6",

  // ============================================================
  // TEXT
  // ============================================================

  text: "#101828",
  textStrong: "#071A33",
  textSecondary: "#667085",
  textMuted: "#98A2B3",

  textOnDark: "#FFFFFF",
  textOnPrimary: "#FFFFFF",

  // ============================================================
  // BORDERS
  // ============================================================

  border: "#E4E7EC",
  borderLight: "#EAECF0",
  borderStrong: "#D0D5DD",

  // ============================================================
  // SEMANTIC COLORS
  // These are NOT brand colors.
  // They are reserved for status/information.
  // ============================================================

  success: "#12B76A",
  successLight: "#ECFDF3",

  warning: "#F79009",
  warningLight: "#FFFAEB",

  danger: "#F04438",
  dangerLight: "#FEF3F2",

  info: "#2E90FA",
  infoLight: "#EFF8FF",

  // ============================================================
  // PRIORITIES
  // ============================================================

  priorityLow: "#12B76A",
  priorityMedium: "#F79009",
  priorityHigh: "#F04438",

  // ============================================================
  // LIFE AREAS
  // ============================================================

  spiritual: "#7F56D9",
  health: "#12B76A",
  relationship: "#EC4899",
  career: "#2E90FA",
  other: "#667085",

  // ============================================================
  // UTILITY COLORS
  // ============================================================

  overlay: "rgba(4, 18, 37, 0.55)",
  shadow: "rgba(7, 26, 51, 0.10)",
  shadowStrong: "rgba(7, 26, 51, 0.16)",

  // These aliases are kept for compatibility with
  // existing screens/components.
  blue: "#2E90FA",
  blueLight: "#EFF8FF",

  green: "#12B76A",
  greenLight: "#ECFDF3",

  red: "#F04438",
  redLight: "#FEF3F2",

  orange: "#FF7A00",
  orangeLight: "#FFF1E4",

  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ThemePalette = typeof BaseColors;
export type ThemeScheme = "light" | "dark";

export const Colors: ThemePalette & {
  light: ThemePalette;
  dark: ThemePalette;
} = {
  ...BaseColors,

  light: BaseColors,

  // Keep the same visual language for now.
  // Dark mode can be refined separately after
  // the main application is visually consistent.
  dark: BaseColors,
};

// ============================================================
// SPACING
// ============================================================

export const Spacing = {
  0: 0,

  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,

  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
} as const;

// ============================================================
// BORDER RADII
// ============================================================

export const Radii = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
} as const;

// ============================================================
// FONTS
// ============================================================

export const Fonts = {
  regular: "System",
  medium: "System",
  semibold: "System",
  bold: "System",
  extraBold: "System",
} as const;

export const FontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extraBold: "800" as const,
  heavy: "800" as const,
} as const;

export const fontWeight = FontWeights;

// ============================================================
// FONT SIZES
// ============================================================

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
  hero: 44,
  base: 15,
} as const;

export const fontSize = FontSizes;

// ============================================================
// LINE HEIGHTS
// ============================================================

export const LineHeights = {
  tight: 1.15,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.65,
  loose: 1.8,
} as const;

export const lineHeight = LineHeights;

// ============================================================
// SHADOWS
// ============================================================

export const Shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  card: {
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },

  elevated: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },

  floating: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

export const createShadows = (shadowColor?: string) => {
  const color = shadowColor ?? Colors.shadow;

  return {
    none: Shadows.none,

    card: {
      ...Shadows.card,
      shadowColor: color,
    },

    elevated: {
      ...Shadows.elevated,
      shadowColor: color,
    },

    floating: {
      ...Shadows.floating,
      shadowColor: color,
    },
  };
};

// ============================================================
// LAYOUT
// ============================================================

export const Layout = {
  maxContentWidth: 1180,
  maxFormWidth: 520,
  maxModalWidth: 560,

  desktopSidebarWidth: 248,
  collapsedSidebarWidth: 76,

  headerHeight: 72,
  mobileHeaderHeight: 64,
  bottomTabHeight: 72,

  screenPadding: 24,
  screenPaddingMobile: 16,
  screenPaddingDesktop: 32,

  cardPadding: 20,
  cardPaddingLarge: 24,

  mobileBreakpoint: 600,
  tabletBreakpoint: 900,
  desktopBreakpoint: 1100,
} as const;

// ============================================================
// COMPLETE TASKFLOW THEME
// ============================================================

export const Theme = {
  colors: Colors,
  spacing: Spacing,
  radii: Radii,
  fonts: Fonts,
  fontWeights: FontWeights,
  fontSizes: FontSizes,
  lineHeights: LineHeights,
  shadows: Shadows,
  layout: Layout,
} as const;

export default Theme;