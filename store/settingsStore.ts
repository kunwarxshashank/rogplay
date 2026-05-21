import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { Platform } from 'react-native';

export type AppTheme = 'dark' | 'dark_red' | 'dark_yellow' | 'dark_blue' | 'dark_pink' | 'light';

interface SettingsState {
    theme: AppTheme;
    defaultScreen: 'home' | 'cinema' | 'addons' | 'tools';
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
    toggleSetting: (key: keyof SettingsState) => void;
    setSetting: (key: keyof SettingsState, value: any) => void;
    setHasSeenAddonFTUE: (val: boolean) => void;
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
        }),
        {
            name: 'app-settings',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
