import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IptvPlaylist {
    id: string;
    title: string;
    url: string;
    type: 'remote' | 'local';
    createdAt: number;
}

interface IptvState {
    playlists: IptvPlaylist[];
    currentChannels: any[];
    addPlaylist: (playlist: Omit<IptvPlaylist, 'id' | 'createdAt'>) => void;
    removePlaylist: (id: string) => void;
    setCurrentChannels: (channels: any[]) => void;
}

export const useIptvStore = create<IptvState>()(
    persist(
        (set) => ({
            playlists: [],
            currentChannels: [],
            addPlaylist: (playlist) => set((state) => ({
                playlists: [
                    {
                        ...playlist,
                        id: Date.now().toString(),
                        createdAt: Date.now(),
                    },
                    ...state.playlists,
                ],
            })),
            removePlaylist: (id) => set((state) => ({
                playlists: state.playlists.filter((p) => p.id !== id),
            })),
            setCurrentChannels: (channels) => set({ currentChannels: channels }),
        }),
        {
            name: 'iptv-playlists',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
