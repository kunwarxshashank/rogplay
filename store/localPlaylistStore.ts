import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import type { MusicTrack } from '@/components/player/MusicPlayer';

export interface LocalPlaylist {
    id: string;
    name: string;
    tracks: MusicTrack[];
    createdAt: number;
    updatedAt: number;
}

interface LocalPlaylistState {
    playlists: LocalPlaylist[];
    createPlaylist: (name: string) => string;
    deletePlaylist: (id: string) => void;
    renamePlaylist: (id: string, name: string) => void;
    addTrackToPlaylist: (playlistId: string, track: MusicTrack) => void;
    removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
    getPlaylist: (id: string) => LocalPlaylist | undefined;
}

export const useLocalPlaylistStore = create<LocalPlaylistState>()(
    persist(
        (set, get) => ({
            playlists: [],

            createPlaylist: (name) => {
                const id = `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const playlist: LocalPlaylist = {
                    id,
                    name: name.trim(),
                    tracks: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                set(s => ({ playlists: [...s.playlists, playlist] }));
                return id;
            },

            deletePlaylist: (id) => {
                set(s => ({ playlists: s.playlists.filter(p => p.id !== id) }));
            },

            renamePlaylist: (id, name) => {
                set(s => ({
                    playlists: s.playlists.map(p =>
                        p.id === id ? { ...p, name: name.trim(), updatedAt: Date.now() } : p
                    ),
                }));
            },

            addTrackToPlaylist: (playlistId, track) => {
                set(s => ({
                    playlists: s.playlists.map(p => {
                        if (p.id !== playlistId) return p;
                        const exists = p.tracks.some(t => t.url === track.url);
                        if (exists) return p;
                        return {
                            ...p,
                            tracks: [...p.tracks, track],
                            updatedAt: Date.now(),
                        };
                    }),
                }));
            },

            removeTrackFromPlaylist: (playlistId, trackId) => {
                set(s => ({
                    playlists: s.playlists.map(p =>
                        p.id === playlistId
                            ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId), updatedAt: Date.now() }
                            : p
                    ),
                }));
            },

            getPlaylist: (id) => {
                return get().playlists.find(p => p.id === id);
            },
        }),
        {
            name: 'local-playlists',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
