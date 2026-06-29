import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { Platform } from 'react-native';

// ─── Type Definitions ──────────────────────────────────────────────

export type ThemeId = 'amoled' | 'glassmorphism' | 'material3' | 'minimal' | 'cinema';
export type AccentColorId = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'teal' | 'custom';
export type PosterStyleId = 'netflix' | 'plex' | 'cinematic' | 'modern_grid' | 'minimal_cards';
export type HomeLayoutId = 'netflix' | 'plex' | 'tv_grid' | 'minimal' | 'cinema';
export type BackgroundType = 'solid' | 'dynamic' | 'blur_poster' | 'daily_rotate' | 'uploaded';
export type AnimationIntensity = 'none' | 'reduced' | 'normal' | 'enhanced';
export type FontScale = 'small' | 'normal' | 'large' | 'xlarge';

export interface AccentColorDefinition {
  id: AccentColorId;
  label: string;
  primary: string;
  accent: string;
  glow: string;
  gradient: readonly [string, string, string];
}

export interface SectionConfig {
  id: string;
  type: 'catalog' | 'custom_playlist' | 'custom_collection' | 'tmdb_catalog';
  title: string;
  hidden: boolean;
  customTitle?: string;
  params?: Record<string, any>;
  order: number;
}

export interface HomeBuilderState {
  layout: HomeLayoutId;
  sections: SectionConfig[];
  showHeroBanner: boolean;
  heroBannerType: 'trending' | 'continue_watching' | 'featured';
  heroBannerStyle: 'traditional' | 'fullscreen';
}

export interface BackgroundConfig {
  type: BackgroundType;
  solidColor: string;
  uploadedUri: string | null;
  blurIntensity: number;
}

export interface ThemeCustomization {
  themePalette: ThemeId;
  accentColorId: AccentColorId;
  customHexAccent: string;
  borderRadius: number;
  posterStyle: PosterStyleId;
  fontScale: FontScale;
  animationIntensity: AnimationIntensity;
  backgroundBlurStrength: number;
  cardElevation: number;
  transparencyLevel: number;
}

// ─── Accent Color Definitions ──────────────────────────────────────

export const ACCENT_COLORS: AccentColorDefinition[] = [
  { id: 'blue', label: 'Blue', primary: '#3b82f6', accent: '#60a5fa', glow: 'rgba(59, 130, 246, 0.4)', gradient: ['#3b82f6', '#60a5fa', '#93c5fd'] as const },
  { id: 'purple', label: 'Purple', primary: '#8b5cf6', accent: '#a78bfa', glow: 'rgba(139, 92, 246, 0.4)', gradient: ['#8b5cf6', '#a78bfa', '#c4b5fd'] as const },
  { id: 'green', label: 'Green', primary: '#10b981', accent: '#34d399', glow: 'rgba(16, 185, 129, 0.4)', gradient: ['#10b981', '#34d399', '#6ee7b7'] as const },
  { id: 'red', label: 'Red', primary: '#ef4444', accent: '#f87171', glow: 'rgba(239, 68, 68, 0.4)', gradient: ['#ef4444', '#f87171', '#fca5a5'] as const },
  { id: 'orange', label: 'Orange', primary: '#f97316', accent: '#fb923c', glow: 'rgba(249, 115, 22, 0.4)', gradient: ['#f97316', '#fb923c', '#fdba74'] as const },
  { id: 'teal', label: 'Teal', primary: '#14b8a6', accent: '#2dd4bf', glow: 'rgba(20, 184, 166, 0.4)', gradient: ['#14b8a6', '#2dd4bf', '#5eead4'] as const },
  { id: 'custom', label: 'Custom', primary: '#6366f1', accent: '#818cf8', glow: 'rgba(99, 102, 241, 0.4)', gradient: ['#6366f1', '#818cf8', '#a5b4fc'] as const },
];

// ─── Theme Palette Definitions ─────────────────────────────────────

interface ThemePalette {
  background: string;
  surface: string;
  card: string;
  cardOverlay: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  notification: string;
  tabIconDefault: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  blurBackground: string;
  tvBackground: string;
  glassIntensity?: number;
  backdropOverlay?: string;
}

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  amoled: {
    background: '#000000',
    surface: '#0a0a0a',
    card: '#111111',
    cardOverlay: 'rgba(0, 0, 0, 0.85)',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    textMuted: '#606060',
    border: 'rgba(255, 255, 255, 0.06)',
    notification: '#ef4444',
    tabIconDefault: '#606060',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    blurBackground: 'rgba(0, 0, 0, 0.3)',
    tvBackground: '#000000',
  },
  glassmorphism: {
    background: '#0a0a14',
    surface: 'rgba(255, 255, 255, 0.05)',
    card: 'rgba(255, 255, 255, 0.08)',
    cardOverlay: 'rgba(255, 255, 255, 0.12)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.1)',
    notification: '#ef4444',
    tabIconDefault: 'rgba(255, 255, 255, 0.3)',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    blurBackground: 'rgba(10, 10, 20, 0.4)',
    tvBackground: '#0a0a14',
    glassIntensity: 30,
  },
  material3: {
    background: '#0f0f1a',
    surface: '#1a1a2e',
    card: '#222240',
    cardOverlay: 'rgba(34, 34, 64, 0.7)',
    text: '#ffffff',
    textSecondary: '#b0b0c8',
    textMuted: '#707090',
    border: 'rgba(255, 255, 255, 0.08)',
    notification: '#ef4444',
    tabIconDefault: '#707090',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    blurBackground: 'rgba(15, 15, 26, 0.5)',
    tvBackground: '#0f0f1a',
  },
  minimal: {
    background: '#0c0c0c',
    surface: '#141414',
    card: '#1a1a1a',
    cardOverlay: 'rgba(26, 26, 26, 0.7)',
    text: '#f0f0f0',
    textSecondary: '#909090',
    textMuted: '#505050',
    border: 'rgba(255, 255, 255, 0.04)',
    notification: '#ef4444',
    tabIconDefault: '#505050',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    blurBackground: 'rgba(12, 12, 12, 0.5)',
    tvBackground: '#0c0c0c',
  },
  cinema: {
    background: '#050508',
    surface: '#0d0d15',
    card: '#12121e',
    cardOverlay: 'rgba(5, 5, 8, 0.85)',
    text: '#ffffff',
    textSecondary: '#8888aa',
    textMuted: '#555570',
    border: 'rgba(255, 255, 255, 0.05)',
    notification: '#ef4444',
    tabIconDefault: '#555570',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    blurBackground: 'rgba(5, 5, 8, 0.4)',
    tvBackground: '#050508',
    backdropOverlay: 'rgba(0, 0, 0, 0.4)',
  },
};

// ─── Poster Style Configs ──────────────────────────────────────────

export interface PosterStyleConfig {
  id: PosterStyleId;
  label: string;
  tvAspectRatio: number;
  mobileAspectRatio: number;
  borderRadius: number;
  showMetadata: boolean;
  shadowElevation: number;
  scaleOnFocus: number;
  tvWidth: number;
}

export const POSTER_STYLES: Record<PosterStyleId, PosterStyleConfig> = {
  netflix: {
    id: 'netflix',
    label: 'Netflix Style',
    tvAspectRatio: 16 / 9,
    mobileAspectRatio: 2 / 3,
    borderRadius: 12,
    showMetadata: true,
    shadowElevation: 8,
    scaleOnFocus: 1.1,
    tvWidth: 260,
  },
  plex: {
    id: 'plex',
    label: 'Plex Style',
    tvAspectRatio: 2 / 3,
    mobileAspectRatio: 2 / 3,
    borderRadius: 4,
    showMetadata: true,
    shadowElevation: 4,
    scaleOnFocus: 1.05,
    tvWidth: 180,
  },
  cinematic: {
    id: 'cinematic',
    label: 'Cinematic',
    tvAspectRatio: 16 / 9,
    mobileAspectRatio: 16 / 9,
    borderRadius: 8,
    showMetadata: false,
    shadowElevation: 12,
    scaleOnFocus: 1.15,
    tvWidth: 320,
  },
  modern_grid: {
    id: 'modern_grid',
    label: 'Modern Grid',
    tvAspectRatio: 2 / 3,
    mobileAspectRatio: 2 / 3,
    borderRadius: 16,
    showMetadata: true,
    shadowElevation: 6,
    scaleOnFocus: 1.08,
    tvWidth: 220,
  },
  minimal_cards: {
    id: 'minimal_cards',
    label: 'Minimal Cards',
    tvAspectRatio: 16 / 9,
    mobileAspectRatio: 2 / 3,
    borderRadius: 2,
    showMetadata: false,
    shadowElevation: 1,
    scaleOnFocus: 1.03,
    tvWidth: 240,
  },
};

// ─── Home Layout Config ────────────────────────────────────────────

export const HOME_LAYOUT_CONFIG = {
  netflix: { showHero: true, heroStyle: 'full_width', sectionSpacing: 40, titleStyle: 'large' },
  plex: { showHero: false, heroStyle: 'none', sectionSpacing: 24, titleStyle: 'compact' },
  tv_grid: { showHero: false, heroStyle: 'none', sectionSpacing: 16, titleStyle: 'compact' },
  minimal: { showHero: false, heroStyle: 'none', sectionSpacing: 32, titleStyle: 'small' },
  cinema: { showHero: true, heroStyle: 'immersive', sectionSpacing: 48, titleStyle: 'large' },
} as const;

// ─── Default Home Sections ─────────────────────────────────────────

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'continue_watching', type: 'catalog', title: 'Continue Watching', hidden: false, order: 0 },
  { id: 'trending_movies', type: 'catalog', title: 'Trending Movies', hidden: false, order: 1 },
  { id: 'trending_series', type: 'catalog', title: 'Trending Series', hidden: false, order: 2 },
  { id: 'bollywood', type: 'catalog', title: 'Bollywood', hidden: false, order: 3 },
  { id: 'trending_anime', type: 'catalog', title: 'Trending Anime', hidden: false, order: 4 },
  { id: 'kdrama', type: 'catalog', title: 'K-Drama', hidden: false, order: 5 },
];

// ─── Compute Theme Colors ──────────────────────────────────────────

export function computeThemeColors(
  paletteId: ThemeId,
  accentId: AccentColorId,
  customHex: string,
  borderRadius: number,
  cardElevation: number,
  animationIntensity: AnimationIntensity,
): Record<string, any> {
  const palette = THEME_PALETTES[paletteId] || THEME_PALETTES.amoled;
  const accentDef = ACCENT_COLORS.find(a => a.id === accentId) || ACCENT_COLORS[0];
  const primaryColor = accentId === 'custom' && customHex ? customHex : accentDef.primary;
  const accentColor = accentId === 'custom' && customHex ? customHex : accentDef.accent;

  const alpha = (hex: string, a: number) => {
    const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
    return hex + alphaHex;
  };

  const isAmoled = paletteId === 'amoled';

  return {
    ...palette,
    primary: primaryColor,
    accent: accentColor,
    glow: alpha(primaryColor, 0.4),
    tint: primaryColor,
    tabIconSelected: primaryColor,
    borderRadius,
    cardElevation,
    animationIntensity,
    isAmoled,
    gradients: isAmoled ? {
      primary: ['#000000', '#000000'],
      surface: ['#000000', '#000000'],
      fade: ['#000000', '#000000'],
      premium: ['#000000', '#000000'],
    } : {
      primary: accentId === 'custom'
        ? [customHex || accentDef.primary, accentDef.accent]
        : [accentDef.gradient[0], accentDef.gradient[1]],
      surface: [palette.card, palette.background],
      fade: ['transparent', palette.background],
      premium: accentDef.gradient,
    },
  };
}

// ─── Theme Store ────────────────────────────────────────────────────

interface ThemeState {
  // Customization
  themePalette: ThemeId;
  accentColorId: AccentColorId;
  customHexAccent: string;
  borderRadius: number;
  posterStyle: PosterStyleId;
  fontScale: FontScale;
  animationIntensity: AnimationIntensity;
  backgroundBlurStrength: number;
  cardElevation: number;
  transparencyLevel: number;

  // Background
  backgroundConfig: BackgroundConfig;

  // Home Builder
  homeBuilder: HomeBuilderState;
  sectionOrder: string[];
  hiddenSections: string[];
  customSectionTitles: Record<string, string>;
  customSections: SectionConfig[];

  // Computed
  computeThemeColors: (legacyThemeName: string) => Record<string, any>;

  // Actions
  setThemePalette: (palette: ThemeId) => void;
  setAccentColor: (id: AccentColorId) => void;
  setCustomHexAccent: (hex: string) => void;
  setBorderRadius: (radius: number) => void;
  setPosterStyle: (style: PosterStyleId) => void;
  setFontScale: (scale: FontScale) => void;
  setAnimationIntensity: (intensity: AnimationIntensity) => void;
  setBackgroundBlurStrength: (strength: number) => void;
  setCardElevation: (elevation: number) => void;
  setTransparencyLevel: (level: number) => void;

  setBackgroundConfig: (config: Partial<BackgroundConfig>) => void;
  setHomeLayout: (layout: HomeLayoutId) => void;
  setShowHeroBanner: (show: boolean) => void;
  setHeroBannerStyle: (style: 'traditional' | 'fullscreen') => void;
  resetToDefaults: () => void;
}

const defaultBackground: BackgroundConfig = {
  type: 'solid',
  solidColor: '#000000',
  uploadedUri: null,
  blurIntensity: 10,
};

const defaultHomeBuilder: HomeBuilderState = {
  layout: 'netflix',
  sections: DEFAULT_SECTIONS,
  showHeroBanner: true,
  heroBannerType: 'trending',
  heroBannerStyle: 'traditional',
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => {
      const computeColors = (legacyThemeName: string) => {
        const state = get();
        return computeThemeColors(
          state.themePalette,
          state.accentColorId,
          state.customHexAccent,
          state.borderRadius,
          state.cardElevation,
          state.animationIntensity,
        );
      };

      return {
        // Defaults
        themePalette: 'amoled' as ThemeId,
        accentColorId: 'blue' as AccentColorId,
        customHexAccent: '#6366f1',
        borderRadius: 12,
        posterStyle: 'netflix' as PosterStyleId,
        fontScale: 'normal' as FontScale,
        animationIntensity: 'normal' as AnimationIntensity,
        backgroundBlurStrength: 10,
        cardElevation: 5,
        transparencyLevel: 0,
        backgroundConfig: { ...defaultBackground },
        homeBuilder: { ...defaultHomeBuilder, sections: [...DEFAULT_SECTIONS] },
        sectionOrder: DEFAULT_SECTIONS.map(s => s.id),
        hiddenSections: [],
        customSectionTitles: {},
        customSections: [],

        computeThemeColors: computeColors,

        // Actions
        setThemePalette: (palette) => set({ themePalette: palette }),
        setAccentColor: (id) => set({ accentColorId: id }),
        setCustomHexAccent: (hex) => set({ customHexAccent: hex }),
        setBorderRadius: (radius) => set({ borderRadius: Math.max(0, Math.min(32, radius)) }),
        setPosterStyle: (style) => set({ posterStyle: style }),
        setFontScale: (scale) => set({ fontScale: scale }),
        setAnimationIntensity: (intensity) => set({ animationIntensity: intensity }),
        setBackgroundBlurStrength: (strength) => set({ backgroundBlurStrength: Math.max(0, Math.min(100, strength)) }),
        setCardElevation: (elevation) => set({ cardElevation: Math.max(0, Math.min(24, elevation)) }),
        setTransparencyLevel: (level) => set({ transparencyLevel: Math.max(0, Math.min(100, level)) }),

        setBackgroundConfig: (config) => set(s => ({ backgroundConfig: { ...s.backgroundConfig, ...config } })),
        setHomeLayout: (layout) => set(s => ({ homeBuilder: { ...s.homeBuilder, layout } })),
        setShowHeroBanner: (show) => set(s => ({ homeBuilder: { ...s.homeBuilder, showHeroBanner: show } })),
        setHeroBannerStyle: (style) => set(s => ({ homeBuilder: { ...s.homeBuilder, heroBannerStyle: style } })),





        resetToDefaults: () => set({
          themePalette: 'amoled',
          accentColorId: 'blue',
          customHexAccent: '#6366f1',
          borderRadius: 12,
          posterStyle: 'netflix',
          fontScale: 'normal',
          animationIntensity: 'normal',
          backgroundBlurStrength: 10,
          cardElevation: 5,
          transparencyLevel: 0,
          backgroundConfig: { ...defaultBackground },
          homeBuilder: { ...defaultHomeBuilder, sections: [...DEFAULT_SECTIONS] },
          sectionOrder: DEFAULT_SECTIONS.map(s => s.id),
          hiddenSections: [],
          customSectionTitles: {},
          customSections: [],
        }),
      };
    },
    {
      name: 'app-theme-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
