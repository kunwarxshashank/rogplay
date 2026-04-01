/**
 * useWatchParty — React hook for WatchParty state & playback sync
 *
 * Usage in a player component:
 *   const wp = useWatchParty({ videoRef, position, duration, isPlaying, ... });
 *   // wp.isInRoom, wp.roomCode, wp.users, wp.createRoom(), wp.joinRoom(), ...
 *
 * Sync strategy:
 *   - Play/Pause/Seek events are synced immediately.
 *   - Buffering is DEBOUNCED (3 s) so micro-buffers during normal HLS
 *     streaming don't cascade into an infinite pause/seek loop.
 *   - When all clients finish buffering the server tells everyone to
 *     resume WITHOUT re-seeking, avoiding a second buffering wave.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    getSocket,
    disconnectSocket,
    createRoom as wsCreateRoom,
    joinRoom as wsJoinRoom,
    leaveRoom as wsLeaveRoom,
    sendPlay,
    sendPause,
    sendSeek,
    sendBuffering,
    sendReady,
    subscribeEvents,
    WPUser,
    WPPlayback,
} from '@/services/watchPartyService';

interface UseWatchPartyProps {
    /** react-native-video ref */
    videoRef: React.RefObject<any>;
    /** current position in MILLISECONDS (as stored by the player) */
    position: number;
    /** current duration in MILLISECONDS */
    duration: number;
    /** whether video is currently playing */
    isPlaying: boolean;
    /** call to set isPlaying state */
    setIsPlaying: (playing: boolean) => void;
    /** the video URL currently loaded */
    url: string;
    /** title to show in the room */
    title: string;
}

export interface WatchPartyState {
    isInRoom: boolean;
    isHost: boolean;
    roomCode: string | null;
    users: WPUser[];
    error: string | null;
    bufferingUser: string | null;
    /** Create a new watch party room */
    createRoom: (username: string) => void;
    /** Join an existing room */
    joinRoom: (code: string, username: string) => void;
    /** Leave the current room */
    leaveRoom: () => void;
    /** Call when local user plays (syncs to others) */
    onLocalPlay: () => void;
    /** Call when local user pauses (syncs to others) */
    onLocalPause: () => void;
    /** Call when local user seeks (syncs to others) */
    onLocalSeek: (position: number) => void;
    /** Call when buffering starts */
    onLocalBuffering: () => void;
    /** Call when buffering ends */
    onLocalReady: () => void;
}

// Tolerance for position drift before forcing a seek (seconds)
const SYNC_TOLERANCE = 2;
// How long to wait before broadcasting a buffering event (ms).
// Micro-buffers shorter than this are ignored entirely.
const BUFFER_DEBOUNCE_MS = 3000;
// Duration of the sync lock after receiving a remote event (ms).
// Must be long enough to cover the buffering caused by a remote seek.
const SYNC_LOCK_MS = 2500;

export function useWatchParty({
    videoRef,
    position,
    duration,
    isPlaying,
    setIsPlaying,
    url,
    title,
}: UseWatchPartyProps): WatchPartyState {
    const [isInRoom, setIsInRoom] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [users, setUsers] = useState<WPUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [bufferingUser, setBufferingUser] = useState<string | null>(null);

    // Ref to prevent sync loops: when we receive a remote event and apply it
    // locally, the local player will fire onProgress/onPlay etc. — we must
    // NOT re-send those.
    const syncLock = useRef(false);
    const syncLockTimeout = useRef<any>(null);
    const positionRef = useRef(position);
    positionRef.current = position;

    // Buffering debounce refs
    const bufferDebounceTimer = useRef<any>(null);
    const didBroadcastBuffering = useRef(false);

    /** Temporarily lock outgoing sync events (to prevent echo loops) */
    const lockSync = useCallback((ms: number = SYNC_LOCK_MS) => {
        syncLock.current = true;
        if (syncLockTimeout.current) clearTimeout(syncLockTimeout.current);
        syncLockTimeout.current = setTimeout(() => {
            syncLock.current = false;
        }, ms);
    }, []);

    // ── Socket event handlers ───────────────────────────
    // NOTE: All positions over the wire are in SECONDS.
    // positionRef.current is in MILLISECONDS (from the player).
    // videoRef.current.seek() expects SECONDS.
    useEffect(() => {
        if (!isInRoom) return;

        const cleanup = subscribeEvents({
            onPlay: (data) => {
                lockSync();
                setIsPlaying(true);
                // data.position is in seconds; positionRef is in ms
                const localSec = positionRef.current / 1000;
                const drift = Math.abs(localSec - data.position);
                if (drift > SYNC_TOLERANCE && videoRef.current) {
                    videoRef.current.seek(data.position);
                }
            },
            onPause: (data) => {
                lockSync();
                setIsPlaying(false);
                const localSec = positionRef.current / 1000;
                const drift = Math.abs(localSec - data.position);
                if (drift > SYNC_TOLERANCE && videoRef.current) {
                    videoRef.current.seek(data.position);
                }
            },
            onSeek: (data) => {
                lockSync();
                if (videoRef.current) {
                    videoRef.current.seek(data.position); // seconds
                }
            },
            onBuffering: (data) => {
                // Just show who is buffering — do NOT pause local playback.
                // Pausing everyone on every micro-buffer creates a cascade.
                setBufferingUser(data.username);
            },
            onAllReady: (_data) => {
                // Everyone finished buffering — just clear the banner.
                // Do NOT seek; positions are close enough and re-seeking
                // would trigger another buffering wave.
                setBufferingUser(null);
            },
            onUserJoined: (data) => {
                setUsers(data.users);
            },
            onUserLeft: (data) => {
                setUsers(data.users);
            },
            onPromoted: () => {
                setIsHost(true);
            },
            onState: (data) => {
                lockSync();
                setUsers(data.users);
                setIsPlaying(data.playback.isPlaying);
                if (videoRef.current) {
                    videoRef.current.seek(data.playback.position); // seconds
                }
            },
            onError: (data) => {
                setError(data.message);
                setTimeout(() => setError(null), 5000);
            },
        });

        return cleanup;
    }, [isInRoom, lockSync, setIsPlaying, videoRef]);

    // ── Room Actions ────────────────────────────────────
    const createRoom = useCallback((username: string) => {
        setError(null);
        const s = getSocket();

        // One-time listener for room creation
        const onCreated = (data: any) => {
            setIsInRoom(true);
            setIsHost(data.isHost);
            setRoomCode(data.roomCode);
            setUsers(data.users);
            s.off('wp:created', onCreated);
            s.off('wp:error', onCreateError);
        };
        const onCreateError = (data: any) => {
            setError(data.message);
            setTimeout(() => setError(null), 5000);
            s.off('wp:created', onCreated);
            s.off('wp:error', onCreateError);
        };
        s.on('wp:created', onCreated);
        s.on('wp:error', onCreateError);

        // Emit create — socket.io buffers this if still connecting
        wsCreateRoom(url, title, username);
    }, [url, title]);

    const joinRoom = useCallback((code: string, username: string) => {
        setError(null);
        const s = getSocket();

        const onJoined = (data: any) => {
            setIsInRoom(true);
            setIsHost(data.isHost);
            setRoomCode(data.roomCode);
            setUsers(data.users);

            // Sync to the room's current playback state (position is in seconds).
            // Use a longer lock to cover the buffering caused by the initial seek.
            lockSync(5000);
            setIsPlaying(data.playback.isPlaying);
            if (videoRef.current && data.playback.position > 0) {
                videoRef.current.seek(data.playback.position);
            }
            s.off('wp:joined', onJoined);
            s.off('wp:error', onJoinError);
        };
        const onJoinError = (data: any) => {
            setError(data.message);
            setTimeout(() => setError(null), 5000);
            s.off('wp:joined', onJoined);
            s.off('wp:error', onJoinError);
        };
        s.on('wp:joined', onJoined);
        s.on('wp:error', onJoinError);

        wsJoinRoom(code, username);
    }, [lockSync, setIsPlaying, videoRef]);

    const leaveRoom = useCallback(() => {
        wsLeaveRoom();
        setIsInRoom(false);
        setIsHost(false);
        setRoomCode(null);
        setUsers([]);
        setBufferingUser(null);
        // Clean up buffering debounce
        if (bufferDebounceTimer.current) {
            clearTimeout(bufferDebounceTimer.current);
            bufferDebounceTimer.current = null;
        }
        didBroadcastBuffering.current = false;
        disconnectSocket();
    }, []);

    // ── Local player action forwarding ──────────────────
    // positionRef is in ms; all socket sends must be in seconds
    const onLocalPlay = useCallback(() => {
        if (!isInRoom || syncLock.current) return;
        sendPlay(positionRef.current / 1000);
    }, [isInRoom]);

    const onLocalPause = useCallback(() => {
        if (!isInRoom || syncLock.current) return;
        sendPause(positionRef.current / 1000);
    }, [isInRoom]);

    const onLocalSeek = useCallback((pos: number) => {
        // pos is already in seconds (callers convert before calling)
        if (!isInRoom || syncLock.current) return;
        sendSeek(pos);
    }, [isInRoom]);

    /**
     * Debounced buffering: only notify the room if buffering lasts longer
     * than BUFFER_DEBOUNCE_MS. Short micro-buffers (normal in HLS/DASH)
     * are silently ignored.
     */
    const onLocalBuffering = useCallback(() => {
        if (!isInRoom || syncLock.current) return;

        // Cancel any pending debounce timer
        if (bufferDebounceTimer.current) clearTimeout(bufferDebounceTimer.current);

        // Start a debounce: only broadcast after BUFFER_DEBOUNCE_MS
        bufferDebounceTimer.current = setTimeout(() => {
            if (!syncLock.current && isInRoom) {
                sendBuffering();
                didBroadcastBuffering.current = true;
            }
        }, BUFFER_DEBOUNCE_MS);
    }, [isInRoom]);

    const onLocalReady = useCallback(() => {
        if (!isInRoom) return;

        // Cancel pending debounce — if buffering was < 3s, never sent it
        if (bufferDebounceTimer.current) {
            clearTimeout(bufferDebounceTimer.current);
            bufferDebounceTimer.current = null;
        }

        // Only send wp:ready if we actually broadcast wp:buffering earlier
        if (didBroadcastBuffering.current) {
            sendReady();
            didBroadcastBuffering.current = false;
        }
    }, [isInRoom]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isInRoom) {
                wsLeaveRoom();
                disconnectSocket();
            }
            if (syncLockTimeout.current) clearTimeout(syncLockTimeout.current);
            if (bufferDebounceTimer.current) clearTimeout(bufferDebounceTimer.current);
        };
    }, []);

    return {
        isInRoom,
        isHost,
        roomCode,
        users,
        error,
        bufferingUser,
        createRoom,
        joinRoom,
        leaveRoom,
        onLocalPlay,
        onLocalPause,
        onLocalSeek,
        onLocalBuffering,
        onLocalReady,
    };
}
