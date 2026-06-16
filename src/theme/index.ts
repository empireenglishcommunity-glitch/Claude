/**
 * Empire English Community — Design System
 * Extracted from the brand logo: royal gold on imperial black.
 */

export const colors = {
  // Imperial blacks
  black: '#0B0B0B',
  obsidian: '#121212',
  charcoal: '#1A1A1A',
  surface: '#1E1B14',
  surfaceRaised: '#262015',

  // Royal golds
  gold: '#D4AF37',
  goldBright: '#F1C40F',
  goldSoft: '#E8C766',
  goldDeep: '#9E7C1E',
  goldFaint: 'rgba(212, 175, 55, 0.12)',
  goldBorder: 'rgba(212, 175, 55, 0.35)',

  // Text
  textPrimary: '#F5ECD2',
  textSecondary: '#C9BE9E',
  textMuted: '#8A8266',

  // Accents for the colorful home tiles (imperial-tinted)
  tileAmber: '#C8881E',
  tilePurple: '#6E4FA3',
  tileCrimson: '#A8322D',
  tileEmerald: '#2E7D5B',

  // Feedback
  success: '#3FB07A',
  danger: '#C0392B',
  white: '#FFFFFF',
} as const;

export const gradients = {
  // Royal page background
  royalBg: ['#000000', '#0E0B05', '#1A1306'] as const,
  // Gold button / accents
  gold: ['#F1C40F', '#D4AF37', '#9E7C1E'] as const,
  goldSheen: ['#FBE9A0', '#D4AF37', '#A6801F'] as const,
  // Tiles
  amber: ['#E0A52E', '#9C6712'] as const,
  purple: ['#8A66C9', '#4E337E'] as const,
  crimson: ['#C5453F', '#7E211D'] as const,
  emerald: ['#3FA877', '#1E5C41'] as const,
  // Word screen hero
  hero: ['#1A1306', '#0B0B0B'] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  // Serif for imperial headings (system serif keeps it offline + zero-asset)
  serif: 'serif',
  // Clean sans for body
  sans: 'System',
  sizes: {
    hero: 40,
    title: 28,
    h2: 22,
    h3: 18,
    body: 16,
    small: 14,
    tiny: 12,
  },
} as const;

export const shadows = {
  gold: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const brand = {
  name: 'Empire',
  community: 'Empire English Community',
  sponsor: 'Sponsored by MacLempire',
  tagline: 'Speak like an Emperor.',
} as const;

export const theme = {
  colors,
  gradients,
  spacing,
  radii,
  typography,
  shadows,
  brand,
};

export type Theme = typeof theme;
export default theme;
