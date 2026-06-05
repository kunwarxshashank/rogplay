import { useState, useEffect, useCallback, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import type { MusicTrack } from '@/components/player/MusicPlayer';

export interface LocalAudioAsset {
    id: string;
    filename: string;
    uri: string;
    duration: number;
    modificationTime: number;
    albumId?: string;
}

export function useLocalMusic() {
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [filteredTracks, setFilteredTracks] = useState<MusicTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'title' | 'artist' | 'duration' | 'modificationTime'>('modificationTime');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        loadAudio();
        return () => { mountedRef.current = false; };
    }, [permissionResponse]);

    useEffect(() => {
        let list = [...tracks];

        list.sort((a, b) => {
            let valA: any;
            let valB: any;

            switch (sortBy) {
                case 'title':
                    valA = (a.title || '').toLowerCase();
                    valB = (b.title || '').toLowerCase();
                    break;
                case 'artist':
                    valA = (a.artist || '').toLowerCase();
                    valB = (b.artist || '').toLowerCase();
                    break;
                case 'duration':
                    valA = a.duration || 0;
                    valB = b.duration || 0;
                    break;
                case 'modificationTime':
                    valA = 0;
                    valB = 0;
                    break;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.artist && t.artist.toLowerCase().includes(q))
            );
        }

        setFilteredTracks(list);
    }, [searchQuery, tracks, sortBy, sortOrder]);

    const loadAudio = async () => {
        try {
            if (!permissionResponse || permissionResponse.status !== 'granted') {
                const perm = await requestPermission();
                if (perm.status !== 'granted') {
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 200,
                sortBy: MediaLibrary.SortBy.modificationTime,
            });

            const mapped: MusicTrack[] = media.assets.map((asset, i) => ({
                id: asset.id,
                title: asset.filename.replace(/\.[^/.]+$/, '') || 'Unknown',
                artist: '',
                poster: undefined,
                url: asset.uri,
                duration: asset.duration || 0,
            }));

            if (mountedRef.current) {
                setTracks(mapped);
                setFilteredTracks(mapped);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error loading audio:', error);
            if (mountedRef.current) setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAudio();
        setRefreshing(false);
    }, []);

    const formatDuration = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return {
        tracks,
        filteredTracks,
        loading,
        refreshing,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        onRefresh,
        formatDuration,
    };
}
