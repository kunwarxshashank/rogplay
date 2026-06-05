import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { useMusicPlayerStore } from '@/store/musicPlayerStore';

export default function MusicEngine() {
    const videoRef = useRef<any>(null);
    const lastUpdateRef = useRef(0);

    const tracks = useMusicPlayerStore(s => s.tracks);
    const currentIndex = useMusicPlayerStore(s => s.currentIndex);
    const isPlaying = useMusicPlayerStore(s => s.isPlaying);
    const setPosition = useMusicPlayerStore(s => s.setPosition);
    const setDuration = useMusicPlayerStore(s => s.setDuration);
    const setBuffering = useMusicPlayerStore(s => s.setBuffering);
    const nextTrack = useMusicPlayerStore(s => s.nextTrack);
    const videoRefStore = useMusicPlayerStore(s => s.videoRef);

    const currentTrack = tracks[currentIndex];

    // Sync video ref to store
    useEffect(() => {
        videoRefStore.current = videoRef.current;
    }, [videoRef.current]);

    const onProgress = useCallback((data: any) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < 250) return;
        lastUpdateRef.current = now;
        setPosition(data.currentTime * 1000);
        if (data.seekableDuration) setDuration(data.seekableDuration * 1000);
    }, [setPosition, setDuration]);

    const onEnd = useCallback(() => {
        const repeatMode = useMusicPlayerStore.getState().repeatMode;
        if (repeatMode === 'one') {
            const ref = videoRef.current;
            if (ref) ref.seek(0);
            setPosition(0);
        } else {
            nextTrack();
        }
    }, [nextTrack, setPosition]);

    const onLoad = useCallback((data: any) => {
        setDuration(data.duration * 1000);
        setBuffering(false);
    }, [setDuration, setBuffering]);

    const onBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
        setBuffering(isBuffering);
    }, [setBuffering]);

    const onError = useCallback((e: any) => {
        console.error('Music playback error:', e);
        setBuffering(false);
    }, [setBuffering]);

    if (!currentTrack?.url) return null;

    return (
        <View style={styles.hidden}>
            <Video
                ref={videoRef}
                source={{
                    uri: currentTrack.url,
                    headers: currentTrack.headers || {},
                }}
                style={styles.hidden}
                paused={!isPlaying}
                rate={1.0}
                volume={1.0}
                muted={false}
                resizeMode="contain"
                playInBackground={true}
                progressUpdateInterval={250}
                onProgress={onProgress}
                onLoad={onLoad}
                onEnd={onEnd}
                onBuffer={onBuffer}
                onError={onError}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    hidden: {
        width: 0,
        height: 0,
        opacity: 0,
        position: 'absolute',
    },
});
