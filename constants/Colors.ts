import { THEME_PALETTES, ACCENT_COLORS, computeThemeColors } from '@/store/themeStore';

const baseDark = {
    background: '#04070d',
    surface: '#0d111b',
    card: '#121723',
    cardOverlay: 'rgba(18, 23, 35, 0.7)',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(255, 255, 255, 0.08)',
    notification: '#ef4444',
    tabIconDefault: '#94a3b8',
    success: '#10b981',
    error: '#f43f5e',
    warning: '#f59e0b',
    info: '#3b82f6',
    blurBackground: 'rgba(13, 17, 27, 0.5)',
    tvBackground: '#020408',
};

const gradients = {
    primary: ['#6366f1', '#4338ca'],
    surface: ['rgba(26, 24, 41, 0.8)', 'rgba(14, 13, 23, 0.95)'],
    fade: ['transparent', '#0E0D17'],
    premium: ['#818cf8', '#6366f1', '#4338ca'],
};

export const Colors: Record<string, any> = {
    // ─── Legacy themes (backward compat) ─────────────────
    dark: {
        ...baseDark,
        background: '#0E0D17',
        surface: '#151322',
        card: '#1A1829',
        cardOverlay: 'rgba(26, 24, 41, 0.7)',
        blurBackground: 'rgba(14, 13, 23, 0.5)',
        tvBackground: '#0E0D17',
        border: 'rgba(255, 255, 255, 0.2)',
        primary: '#6366f1',
        accent: '#818cf8',
        glow: 'rgba(99, 102, 241, 0.4)',
        tint: '#6366f1',
        tabIconSelected: '#6366f1',
        gradients: {
            primary: ['#6366f1', '#4338ca'],
            surface: ['rgba(26, 24, 41, 0.8)', 'rgba(14, 13, 23, 0.95)'],
            fade: ['transparent', '#0E0D17'],
            premium: ['#818cf8', '#6366f1', '#4338ca'],
        }
    },
    dark_red: {
        ...baseDark,
        primary: '#f43f5e',
        accent: '#ef4444',
        glow: 'rgba(244, 63, 94, 0.3)',
        tint: '#f43f5e',
        tabIconSelected: '#f43f5e',
        gradients: {
            primary: ['#f43f5e', '#fb7185'],
            surface: ['#1e293b', '#0f172a'],
            fade: ['transparent', '#060912'],
            premium: ['#f59e0b', '#fbbf24', '#f59e0b'],
        }
    },
    dark_yellow: {
        ...baseDark,
        primary: '#eab308',
        accent: '#f59e0b',
        glow: 'rgba(234, 179, 8, 0.3)',
        tint: '#eab308',
        tabIconSelected: '#eab308',
        gradients: {
            primary: ['#eab308', '#fbbf24'],
            surface: ['#1e293b', '#0f172a'],
            fade: ['transparent', '#060912'],
            premium: ['#f59e0b', '#fbbf24', '#f59e0b'],
        }
    },
    dark_blue: {
        ...baseDark,
        primary: '#3b82f6',
        accent: '#06b6d4',
        glow: 'rgba(59, 130, 246, 0.3)',
        tint: '#3b82f6',
        tabIconSelected: '#3b82f6',
        gradients: {
            primary: ['#3b82f6', '#60a5fa'],
            surface: ['#1e293b', '#0f172a'],
            fade: ['transparent', '#060912'],
            premium: ['#f59e0b', '#fbbf24', '#f59e0b'],
        }
    },
    dark_pink: {
        ...baseDark,
        primary: '#ec4899',
        accent: '#d946ef',
        glow: 'rgba(236, 72, 153, 0.3)',
        tint: '#ec4899',
        tabIconSelected: '#ec4899',
        gradients: {
            primary: ['#ec4899', '#f472b6'],
            surface: ['#1e293b', '#0f172a'],
            fade: ['transparent', '#060912'],
            premium: ['#f59e0b', '#fbbf24', '#f59e0b'],
        }
    },
    light: {
        primary: '#6366f1',
        background: '#ffffff',
        card: '#f8fafc',
        text: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        notification: '#ef4444',
        tint: '#6366f1',
        tabIconDefault: '#94a3b8',
        tabIconSelected: '#6366f1',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
    },

    // ─── NEW: Dynamic theme system aliases ──────────────
    amoled: computeThemeColors('amoled', 'blue', '#6366f1', 12, 5, 'normal'),
    glassmorphism: computeThemeColors('glassmorphism', 'blue', '#6366f1', 16, 8, 'normal'),
    material3: computeThemeColors('material3', 'blue', '#6366f1', 20, 6, 'normal'),
    minimal: computeThemeColors('minimal', 'blue', '#6366f1', 4, 2, 'normal'),
    cinema: computeThemeColors('cinema', 'blue', '#6366f1', 8, 10, 'enhanced'),
};

export const Layout = {
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
        full: 9999,
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 12,
        }
    }
};
