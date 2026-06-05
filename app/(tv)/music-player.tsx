import React, { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MusicPlayer, { MusicTrack } from '@/components/player/MusicPlayer';

export default function TVMusicPlayerScreen() {
    const router = useRouter();
    const { tracks: tracksParam, index, addonUrl, addonManifest } = useLocalSearchParams();

    const tracks: MusicTrack[] = useMemo(() => {
        if (!tracksParam || typeof tracksParam !== 'string') return [];
        try {
            return JSON.parse(tracksParam);
        } catch {
            return [];
        }
    }, [tracksParam]);

    const initialIndex = Number(index || 0);

    return (
        <MusicPlayer
            tracks={tracks}
            initialIndex={initialIndex}
            onBack={() => router.back()}
            addonUrl={addonUrl as string}
            addonManifest={addonManifest as string}
        />
    );
}
