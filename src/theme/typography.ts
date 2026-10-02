import { Platform, TextStyle, useWindowDimensions } from 'react-native';

/**
 * Recommended maximum font scale multipliers to preserve UI integrity
 * at extreme device accessibility font sizes (e.g. 1.5x - 3.0x+).
 *
 * Layout-critical chrome (buttons, tab bars, badges) are gently capped
 * to avoid clipping and layout overflow, while content and body text
 * can scale freely for optimal legibility.
 */
export const FONT_SCALE_LIMITS = {
  /** Buttons, action chips, small pressables */
  button: 1.25,
  /** Bottom tab navigation labels */
  tabBar: 1.2,
  /** Small decorative badges, tags, emblems (e.g. Rx tag) */
  badge: 1.15,
  /** Form inputs, labels, and helper texts */
  input: 1.3,
  /** Page headers, brand titles, modal titles */
  header: 1.3,
  /** Data tables (GridTable, invoice itemized rows) */
  table: 1.25,
  /** General body, card descriptions, paragraphs */
  body: 1.6,
  /** Captions, subtitles, secondary metadata */
  caption: 1.4,
} as const;

export type FontScaleCategory = keyof typeof FONT_SCALE_LIMITS;

/**
 * Custom hook that returns the current device font scale.
 * Reactively updates when the user adjusts their OS font size setting.
 */
export const useFontScale = (): number => {
  const { fontScale } = useWindowDimensions();
  return fontScale || 1;
};

/**
 * Helper to calculate an accessibility-aware font size with an optional multiplier ceiling.
 */
export const getScaledFontSize = (
  baseSize: number,
  fontScale: number = 1,
  maxMultiplier?: number
): number => {
  const effectiveScale = maxMultiplier ? Math.min(fontScale, maxMultiplier) : fontScale;
  return Math.round(baseSize * effectiveScale);
};

export const Typography = {
  fontFamilies: {
    // Niconne for branding, screen titles, and accent headings
    heading: Platform.select({
      ios: 'Niconne',
      android: 'Niconne',
      default: 'Georgia',
    }),
    // Valley Sans (or clean geometric sans fallback) for high-legibility medical tables, numbers, and inputs
    body: Platform.select({
      ios: 'ValleySans',
      android: 'ValleySans',
      default: 'System',
    }),
    mono: Platform.select({
      ios: 'Courier New',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Base font sizes
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 30,
  },

  // Font scale limits for layout protection
  limits: FONT_SCALE_LIMITS,

  // Pre-composed typography styles
  styles: {
    brandTitle: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 0.5,
    } as TextStyle,
    screenTitle: {
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.2,
    } as TextStyle,
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.1,
    } as TextStyle,
    body: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    } as TextStyle,
    bodyBold: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    } as TextStyle,
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    } as TextStyle,
    tableHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    } as TextStyle,
    tableCell: {
      fontSize: 13,
      fontWeight: '400',
    } as TextStyle,
    numeric: {
      fontSize: 14,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    } as TextStyle,
  },
};

export default Typography;
