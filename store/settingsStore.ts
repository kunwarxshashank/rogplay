import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { Platform } from 'react-native';

export type AppTheme = 'dark' | 'dark_red' | 'dark_yellow' | 'dark_blue' | 'dark_pink' | 'light';

export type PosterStyle = 'netflix' | 'plex' | 'cinematic' | 'modern_grid' | 'minimal_cards';

export type HomeLayout = 'netflix' | 'plex' | 'tv_grid' | 'minimal' | 'cinema';

interface SettingsState {
    theme: AppTheme;
    defaultScreen: 'home' | 'cinema' | 'addons' | 'tools' | 'local-music';
    confirmExit: boolean;
    pipEnabled: boolean;
    resizeButtonEnabled: boolean;
    longPressSpeedEnabled: boolean;
    doubleTapSeekEnabled: boolean;
    playbackGesturesEnabled: boolean;
    autoRotate: boolean;
    defaultQuality: 'AUTO' | '720p' | '1080p' | '4K';
    autoSubtitles: boolean;
    forceLandscape: boolean;
    hasSeenAddonFTUE: boolean;
    // Cinema settings
    cinemaContinueWatching: boolean;
    cinemaPlatforms: boolean;
    cinemaHomeSlider: boolean;
    cinemaFilters: boolean;
    cinemaCardSize: 'small' | 'medium' | 'large';
    autoSelectHealthiestSource: boolean;
    // Debrid settings
    debridProvider: 'none' | 'realdebrid' | 'alldebrid' | 'premiumize' | 'torbox';
    debridApiKey: string;
    // Theme & Home Builder persistence keys
    posterStyle: PosterStyle;
    homeLayout: HomeLayout;
    sectionOrder: string[];
    hiddenSections: string[];
    hiddenTabs: string[];
    accentColor: string;
    toggleSetting: (key: keyof SettingsState) => void;
    setSetting: (key: keyof SettingsState, value: any) => void;
    setHasSeenAddonFTUE: (val: boolean) => void;
    setHiddenTabs: (tabs: string[]) => void;
    resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'dark',
            defaultScreen: Platform.isTV ? 'cinema' : 'home',
            confirmExit: true,
            pipEnabled: true,
            resizeButtonEnabled: true,
            longPressSpeedEnabled: true,
            doubleTapSeekEnabled: true,
            playbackGesturesEnabled: true,
            autoRotate: true,
            defaultQuality: 'AUTO',
            autoSubtitles: true,
            forceLandscape: false,
            hasSeenAddonFTUE: false,
            // Cinema defaults
            cinemaContinueWatching: true,
            cinemaPlatforms: true,
            cinemaHomeSlider: true,
            cinemaFilters: true,
            cinemaCardSize: 'medium',
            autoSelectHealthiestSource: false,
            // Debrid defaults
            debridProvider: 'none',
            debridApiKey: '',
            // Theme & Home Builder defaults
            posterStyle: 'netflix',
            homeLayout: 'netflix',
            sectionOrder: [],
            hiddenSections: [],
            hiddenTabs: [],
            accentColor: '#3b82f6',

            toggleSetting: (key) => set((state: any) => {
                if (key === 'theme') {
                    const themes: AppTheme[] = ['dark', 'dark_red', 'dark_yellow', 'dark_blue', 'dark_pink', 'light'];
                    const nextIndex = (themes.indexOf(state.theme) + 1) % themes.length;
                    return { theme: themes[nextIndex] };
                }
                return { [key]: !state[key] };
            }),
            setSetting: (key, value) => set({ [key]: value }),
            setHasSeenAddonFTUE: (val) => set({ hasSeenAddonFTUE: val }),
            setHiddenTabs: (tabs) => set({ hiddenTabs: tabs }),
            resetToDefaults: () => set({
                theme: 'dark',
                defaultScreen: Platform.isTV ? 'cinema' : 'home',
                confirmExit: true,
                pipEnabled: true,
                resizeButtonEnabled: true,
                longPressSpeedEnabled: true,
                doubleTapSeekEnabled: true,
                playbackGesturesEnabled: true,
                autoRotate: true,
                defaultQuality: 'AUTO',
                autoSubtitles: true,
                forceLandscape: false,
                hasSeenAddonFTUE: false,
                cinemaContinueWatching: true,
                cinemaPlatforms: true,
                cinemaHomeSlider: true,
                cinemaFilters: true,
                cinemaCardSize: 'medium',
                autoSelectHealthiestSource: false,
                debridProvider: 'none',
                debridApiKey: '',
                posterStyle: 'netflix',
                homeLayout: 'netflix',
                sectionOrder: [],
                hiddenSections: [],
                hiddenTabs: [],
                accentColor: '#3b82f6',
            }),
        }),
        {
            name: 'app-settings',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
