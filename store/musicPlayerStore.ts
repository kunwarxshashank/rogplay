import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import type { MusicTrack } from '@/components/player/MusicPlayer';

export enum RepeatMode {
    OFF = 'off',
    ALL = 'all',
    ONE = 'one',
}

interface MusicPlayerState {
    tracks: MusicTrack[];
    currentIndex: number;
    isPlaying: boolean;
    position: number;
    duration: number;
    repeatMode: RepeatMode;
    isShuffled: boolean;
    shuffleOrder: number[];
    isBuffering: boolean;
    addonUrl?: string;
    addonManifest?: string;
    videoRef: React.MutableRefObject<any>;

    setTracks: (tracks: MusicTrack[], startIndex?: number, addonUrl?: string, addonManifest?: string) => void;
    setPlaying: (playing: boolean) => void;
    togglePlaying: () => void;
    setPosition: (position: number) => void;
    setDuration: (duration: number) => void;
    setBuffering: (buffering: boolean) => void;
    nextTrack: () => void;
    prevTrack: () => void;
    seek: (time: number) => void;
    cycleRepeat: () => void;
    toggleShuffle: () => void;
    setCurrentIndex: (index: number) => void;
    reset: () => void;
}

const generateShuffleOrder = (length: number, currentIndex: number): number[] => {
    const order = Array.from({ length }, (_, i) => i)
        .filter(i => i !== currentIndex)
        .sort(() => Math.random() - 0.5);
    return [currentIndex, ...order];
};

const getNextIndex = (
    currentIndex: number,
    isShuffled: boolean,
    shuffleOrder: number[],
    totalTracks: number
): number => {
    if (totalTracks === 0) return currentIndex;
    if (isShuffled && shuffleOrder.length > 0) {
        const pos = shuffleOrder.indexOf(currentIndex);
        const nextPos = (pos + 1) % shuffleOrder.length;
        return shuffleOrder[nextPos];
    }
    return (currentIndex + 1) % totalTracks;
};

const getPrevIndex = (
    currentIndex: number,
    isShuffled: boolean,
    shuffleOrder: number[],
    totalTracks: number
): number => {
    if (totalTracks === 0) return currentIndex;
    if (isShuffled && shuffleOrder.length > 0) {
        const pos = shuffleOrder.indexOf(currentIndex);
        const prevPos = (pos - 1 + shuffleOrder.length) % shuffleOrder.length;
        return shuffleOrder[prevPos];
    }
    return (currentIndex - 1 + totalTracks) % totalTracks;
};

export const useMusicPlayerStore = create<MusicPlayerState>()(
    persist(
        (set, get) => ({
            tracks: [],
            currentIndex: 0,
            isPlaying: false,
            position: 0,
            duration: 0,
            repeatMode: RepeatMode.ALL,
            isShuffled: false,
            shuffleOrder: [],
            isBuffering: false,
            addonUrl: undefined,
            addonManifest: undefined,
            videoRef: { current: null },

            setTracks: (tracks, startIndex = 0, addonUrl, addonManifest) => {
                const { isShuffled } = get();
                set({
                    tracks,
                    currentIndex: startIndex,
                    isPlaying: true,
                    position: 0,
                    duration: 0,
                    isBuffering: true,
                    addonUrl,
                    addonManifest,
                    shuffleOrder: isShuffled && tracks.length > 1
                        ? generateShuffleOrder(tracks.length, startIndex)
                        : [],
                });
            },

            setPlaying: (playing) => set({ isPlaying: playing }),
            togglePlaying: () => set(s => ({ isPlaying: !s.isPlaying })),

            setPosition: (position) => set({ position }),
            setDuration: (duration) => set({ duration }),
            setBuffering: (buffering) => set({ isBuffering: buffering }),

            nextTrack: () => {
                const { currentIndex, isShuffled, shuffleOrder, tracks } = get();
                if (tracks.length === 0) return;
                const next = getNextIndex(currentIndex, isShuffled, shuffleOrder, tracks.length);
                set({ currentIndex: next, position: 0, isPlaying: true });
            },

            prevTrack: () => {
                const { currentIndex, isShuffled, shuffleOrder, tracks, position } = get();
                if (tracks.length === 0) return;
                if (position > 3000) {
                    set({ position: 0 });
                    const ref = get().videoRef.current;
                    if (ref) ref.seek(0);
                } else {
                    const prev = getPrevIndex(currentIndex, isShuffled, shuffleOrder, tracks.length);
                    set({ currentIndex: prev, position: 0, isPlaying: true });
                }
            },

            seek: (time) => {
                const ref = get().videoRef.current;
                if (ref) ref.seek(time);
                set({ position: time * 1000 });
            },

            cycleRepeat: () => {
                set(s => {
                    if (s.repeatMode === RepeatMode.OFF) return { repeatMode: RepeatMode.ALL };
                    if (s.repeatMode === RepeatMode.ALL) return { repeatMode: RepeatMode.ONE };
                    return { repeatMode: RepeatMode.OFF };
                });
            },

            toggleShuffle: () => {
                set(s => {
                    if (s.isShuffled) {
                        return { isShuffled: false, shuffleOrder: [] };
                    }
                    return {
                        isShuffled: true,
                        shuffleOrder: generateShuffleOrder(s.tracks.length, s.currentIndex),
                    };
                });
            },

            setCurrentIndex: (index) => set({ currentIndex: index, position: 0, isPlaying: true }),

            reset: () => set({
                tracks: [],
                currentIndex: 0,
                isPlaying: false,
                position: 0,
                duration: 0,
                repeatMode: RepeatMode.ALL,
                isShuffled: false,
                shuffleOrder: [],
                isBuffering: false,
                addonUrl: undefined,
                addonManifest: undefined,
            }),
        }),
        {
            name: 'music-player-state',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({
                tracks: state.tracks,
                currentIndex: state.currentIndex,
                isPlaying: state.isPlaying,
                position: state.position,
                duration: state.duration,
                repeatMode: state.repeatMode,
                isShuffled: state.isShuffled,
                shuffleOrder: state.shuffleOrder,
                addonUrl: state.addonUrl,
                addonManifest: state.addonManifest,
            }),
        }
    )
);
