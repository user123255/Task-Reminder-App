
const BaseColors = {
  // ============================================================
  // TASKFLOW BRAND — MIDNIGHT NAVY + LAVENDER
  // ============================================================

  primary: "#7866E8",
  primaryHover: "#6553D5",
  primaryPressed: "#5644C4",
  primaryLight: "#EAE7FF",
  primaryTrack: "#7866E8",

  navy: "#18233F",
  navyDeep: "#111A30",
  navyLight: "#252F4D",
  navySoft: "#343F60",

  // BACKGROUNDS
  background: "#F7F7FC",
  backgroundSoft: "#FAFAFE",
  backgroundSelected: "#EAE7FF",
  backgroundElement: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F0FA",

  // TEXT
  text: "#252B40",
  textStrong: "#18233F",
  textSecondary: "#667085",
  textMuted: "#98A2B3",
  textOnDark: "#FFFFFF",
  textOnPrimary: "#FFFFFF",

  // BORDERS
  border: "#E4E7EC",
  borderLight: "#ECECF4",
  borderStrong: "#D0D5DD",

  // STATUS COLORS — UNIFIED BRAND TREATMENT
  success: "#6553D5",
  successLight: "#EAE7FF",
  warning: "#6553D5",
  warningLight: "#EAE7FF",
  danger: "#18233F",
  dangerLight: "#EAE7FF",
  info: "#7866E8",
  infoLight: "#EAE7FF",

  // PRIORITIES
  priorityLow: "#7866E8",
  priorityMedium: "#6553D5",
  priorityHigh: "#18233F",

  // LIFE AREAS
  spiritual: "#7866E8",
  health: "#6553D5",
  relationship: "#8B7DED",
  career: "#5644C4",
  other: "#667085",

  // UTILITY COLORS
  overlay: "rgba(17, 26, 48, 0.58)",
  shadow: "rgba(24, 35, 63, 0.10)",
  shadowStrong: "rgba(24, 35, 63, 0.16)",

  // COMPATIBILITY ALIASES
  blue: "#7866E8",
  blueLight: "#EAE7FF",
  green: "#6553D5",
  greenLight: "#EAE7FF",
  red: "#18233F",
  redLight: "#EAE7FF",
  orange: "#7866E8",
  orangeLight: "#EAE7FF",

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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },

  elevated: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },

  floating: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

export const createShadows = (shadowColor?: string) => {
  const color = shadowColor ?? Colors.shadow;

  return {
    none: Shadows.none,
    card: { ...Shadows.card, shadowColor: color },
    elevated: { ...Shadows.elevated, shadowColor: color },
    floating: { ...Shadows.floating, shadowColor: color },
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
