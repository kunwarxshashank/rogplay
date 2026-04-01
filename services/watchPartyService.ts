/**
 * WatchParty Service — Socket.IO client for real-time room & playback sync
 *
 * Connection is fully lazy: no socket is created until the user
 * explicitly calls createRoom() or joinRoom(). This prevents
 * connection-error spam when WatchParty isn't being used.
 */
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.EXPO_PUBLIC_DB_BASEURL || 'http://localhost:3010';

let socket: Socket | null = null;
let connectionLogged = false;

/** Create a socket (lazy) and connect. Only called by room actions. */
export function getSocket(): Socket {
    if (!socket) {
        connectionLogged = false;
        socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 8000,
            timeout: 10000,
            autoConnect: true,   // starts connecting immediately
        });

        socket.on('connect', () => {
            console.log('[WatchParty] Connected:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[WatchParty] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            if (!connectionLogged) {
                console.warn('[WatchParty] Connection error:', err.message);
                connectionLogged = true;
            }
        });
    } else if (socket.disconnected) {
        // Socket exists but lost connection — reconnect without replacing it
        socket.connect();
    }
    return socket;
}

/** Check if the socket exists and is connected */
export function isConnected(): boolean {
    return !!socket && socket.connected;
}

/** Disconnect and cleanup */
export function disconnectSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        connectionLogged = false;
    }
}

// ── Room Actions (these trigger connection) ─────────────

export function createRoom(url: string, title: string, username: string) {
    getSocket().emit('wp:create', { url, title, username });
}

export function joinRoom(roomCode: string, username: string) {
    getSocket().emit('wp:join', { roomCode, username });
}

export function leaveRoom() {
    if (socket?.connected) socket.emit('wp:leave');
}

export function validateRoom(roomCode: string) {
    getSocket().emit('wp:validate', { roomCode });
}

// ── Playback Actions (only emit if connected) ──────────

export function sendPlay(position: number) {
    if (socket?.connected) socket.emit('wp:play', { position });
}

export function sendPause(position: number) {
    if (socket?.connected) socket.emit('wp:pause', { position });
}

export function sendSeek(position: number) {
    if (socket?.connected) socket.emit('wp:seek', { position });
}

export function sendBuffering() {
    if (socket?.connected) socket.emit('wp:buffering');
}

export function sendReady() {
    if (socket?.connected) socket.emit('wp:ready');
}

export function requestState() {
    if (socket?.connected) socket.emit('wp:request-state');
}

// ── Chat ────────────────────────────────────────────────

export function sendChat(message: string) {
    if (socket?.connected) socket.emit('wp:chat', { message });
}

// ── Event Listener Helpers ──────────────────────────────

export type WPPlayback = {
    url: string;
    title: string;
    isPlaying: boolean;
    position: number;
    speed: number;
    lastUpdated: number;
};

export type WPUser = {
    id: string;
    username: string;
    isHost: boolean;
};

export type WPRoomState = {
    roomCode: string;
    playback: WPPlayback;
    users: WPUser[];
    isHost: boolean;
};

export interface WPEventHandlers {
    onCreated?: (data: WPRoomState) => void;
    onJoined?: (data: WPRoomState) => void;
    onUserJoined?: (data: { id: string; username: string; users: WPUser[] }) => void;
    onUserLeft?: (data: { id: string; username: string; users: WPUser[] }) => void;
    onPlay?: (data: { position: number; timestamp: number }) => void;
    onPause?: (data: { position: number; timestamp: number }) => void;
    onSeek?: (data: { position: number; timestamp: number }) => void;
    onBuffering?: (data: { userId: string; username: string; bufferingCount: number; position: number }) => void;
    onAllReady?: (data: { position: number; timestamp: number }) => void;
    onState?: (data: { roomCode: string; playback: WPPlayback; users: WPUser[] }) => void;
    onPromoted?: (data: { message: string }) => void;
    onChat?: (data: { userId: string; username: string; message: string; timestamp: number }) => void;
    onError?: (data: { message: string }) => void;
}

/**
 * Subscribe to all WatchParty events on the EXISTING socket.
 * Only call this when a socket already exists (i.e., after create/join).
 * Returns cleanup function.
 */
export function subscribeEvents(handlers: WPEventHandlers): () => void {
    if (!socket) {
        // No socket yet — return a no-op cleanup
        return () => {};
    }

    const s = socket;

    if (handlers.onCreated) s.on('wp:created', handlers.onCreated);
    if (handlers.onJoined) s.on('wp:joined', handlers.onJoined);
    if (handlers.onUserJoined) s.on('wp:user-joined', handlers.onUserJoined);
    if (handlers.onUserLeft) s.on('wp:user-left', handlers.onUserLeft);
    if (handlers.onPlay) s.on('wp:play', handlers.onPlay);
    if (handlers.onPause) s.on('wp:pause', handlers.onPause);
    if (handlers.onSeek) s.on('wp:seek', handlers.onSeek);
    if (handlers.onBuffering) s.on('wp:buffering', handlers.onBuffering);
    if (handlers.onAllReady) s.on('wp:all-ready', handlers.onAllReady);
    if (handlers.onState) s.on('wp:state', handlers.onState);
    if (handlers.onPromoted) s.on('wp:promoted', handlers.onPromoted);
    if (handlers.onChat) s.on('wp:chat', handlers.onChat);
    if (handlers.onError) s.on('wp:error', handlers.onError);

    return () => {
        s.off('wp:created', handlers.onCreated);
        s.off('wp:joined', handlers.onJoined);
        s.off('wp:user-joined', handlers.onUserJoined);
        s.off('wp:user-left', handlers.onUserLeft);
        s.off('wp:play', handlers.onPlay);
        s.off('wp:pause', handlers.onPause);
        s.off('wp:seek', handlers.onSeek);
        s.off('wp:buffering', handlers.onBuffering);
        s.off('wp:all-ready', handlers.onAllReady);
        s.off('wp:state', handlers.onState);
        s.off('wp:promoted', handlers.onPromoted);
        s.off('wp:chat', handlers.onChat);
        s.off('wp:error', handlers.onError);
    };
}
