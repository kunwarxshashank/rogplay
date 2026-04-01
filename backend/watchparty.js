/**
 * WatchParty — real-time room & playback sync via Socket.IO
 *
 * Events:
 *   wp:create   → host creates a room  (sends {url, title, username})
 *   wp:join     → guest joins a room   (sends {roomCode, username})
 *   wp:leave    → user leaves room
 *   wp:play     → play event from any participant
 *   wp:pause    → pause event from any participant
 *   wp:seek     → seek event           (sends {position})
 *   wp:buffering→ a client is buffering
 *   wp:ready    → a client finished buffering
 *   wp:chat     → simple text chat      (sends {message})
 *
 * Server → Client:
 *   wp:created      → room created (roomCode, room state)
 *   wp:joined       → successfully joined
 *   wp:user-joined  → another user joined
 *   wp:user-left    → another user left
 *   wp:play         → everyone play
 *   wp:pause        → everyone pause
 *   wp:seek         → everyone seek
 *   wp:buffering    → someone is buffering
 *   wp:all-ready    → everyone finished buffering
 *   wp:state        → full state sync
 *   wp:chat         → chat message broadcast
 *   wp:error        → error message
 */

const rooms = new Map(); // roomCode → RoomState

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createRoomState(hostId, hostName, url, title) {
    return {
        hostId,
        users: new Map([[hostId, { username: hostName, isHost: true }]]),
        playback: {
            url,
            title,
            isPlaying: true,
            position: 0,
            speed: 1.0,
            lastUpdated: Date.now(),
        },
        bufferingUsers: new Set(),
        createdAt: Date.now(),
    };
}

/**
 * Compute estimated current position based on stored state
 */
function estimatedPosition(playback) {
    if (!playback.isPlaying) return playback.position;
    const elapsed = (Date.now() - playback.lastUpdated) / 1000;
    return playback.position + elapsed * playback.speed;
}

function getUserList(room) {
    const list = [];
    room.users.forEach((u, id) => {
        list.push({ id, username: u.username, isHost: u.isHost });
    });
    return list;
}

/**
 * Attach WatchParty handlers to a Socket.IO server instance
 */
function attachWatchParty(io) {
    // Clean up stale rooms every 5 minutes
    setInterval(() => {
        const now = Date.now();
        const MAX_AGE = 6 * 60 * 60 * 1000; // 6 hours
        rooms.forEach((room, code) => {
            if (room.users.size === 0 || now - room.createdAt > MAX_AGE) {
                rooms.delete(code);
            }
        });
    }, 5 * 60 * 1000);

    io.on('connection', (socket) => {
        let currentRoom = null; // roomCode this socket is in

        // ── CREATE ──────────────────────────────────────────
        socket.on('wp:create', ({ url, title, username }) => {
            if (!url) {
                return socket.emit('wp:error', { message: 'URL is required' });
            }

            // Leave any existing room first
            if (currentRoom) leaveRoom(socket);

            let roomCode;
            do {
                roomCode = generateRoomCode();
            } while (rooms.has(roomCode));

            const room = createRoomState(socket.id, username || 'Host', url, title || 'Untitled');
            rooms.set(roomCode, room);
            currentRoom = roomCode;
            socket.join(roomCode);

            socket.emit('wp:created', {
                roomCode,
                playback: { ...room.playback },
                users: getUserList(room),
                isHost: true,
            });

            console.log(`[WatchParty] Room ${roomCode} created by ${username || 'Host'}`);
        });

        // ── JOIN ────────────────────────────────────────────
        socket.on('wp:join', ({ roomCode, username }) => {
            if (!roomCode) {
                return socket.emit('wp:error', { message: 'Room code is required' });
            }

            const code = roomCode.toUpperCase().trim();
            const room = rooms.get(code);

            if (!room) {
                return socket.emit('wp:error', { message: 'Room not found. Check the code and try again.' });
            }

            // Leave any existing room first
            if (currentRoom) leaveRoom(socket);

            const name = username || `Guest ${room.users.size + 1}`;
            room.users.set(socket.id, { username: name, isHost: false });
            currentRoom = code;
            socket.join(code);

            // Compute current position for the joiner
            const currentPosition = estimatedPosition(room.playback);
            room.playback.position = currentPosition;
            room.playback.lastUpdated = Date.now();

            // Tell the joiner the full state
            socket.emit('wp:joined', {
                roomCode: code,
                playback: { ...room.playback },
                users: getUserList(room),
                isHost: false,
            });

            // Tell everyone else
            socket.to(code).emit('wp:user-joined', {
                id: socket.id,
                username: name,
                users: getUserList(room),
            });

            console.log(`[WatchParty] ${name} joined room ${code}`);
        });

        // ── VALIDATE (check room exists without joining) ────
        socket.on('wp:validate', ({ roomCode }) => {
            if (!roomCode) {
                return socket.emit('wp:error', { message: 'Room code is required' });
            }

            const code = roomCode.toUpperCase().trim();
            const room = rooms.get(code);

            if (!room) {
                return socket.emit('wp:error', { message: 'Room not found. Check the code and try again.' });
            }

            // Send back room info so the join-page can navigate to the player
            socket.emit('wp:validated', {
                roomCode: code,
                playback: { ...room.playback },
                users: getUserList(room),
            });
        });

        // ── PLAY ────────────────────────────────────────────
        socket.on('wp:play', ({ position }) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            room.playback.isPlaying = true;
            room.playback.position = position ?? estimatedPosition(room.playback);
            room.playback.lastUpdated = Date.now();

            socket.to(currentRoom).emit('wp:play', {
                position: room.playback.position,
                timestamp: room.playback.lastUpdated,
            });
        });

        // ── PAUSE ───────────────────────────────────────────
        socket.on('wp:pause', ({ position }) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            room.playback.isPlaying = false;
            room.playback.position = position ?? estimatedPosition(room.playback);
            room.playback.lastUpdated = Date.now();

            socket.to(currentRoom).emit('wp:pause', {
                position: room.playback.position,
                timestamp: room.playback.lastUpdated,
            });
        });

        // ── SEEK ────────────────────────────────────────────
        socket.on('wp:seek', ({ position }) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            room.playback.position = position;
            room.playback.lastUpdated = Date.now();

            socket.to(currentRoom).emit('wp:seek', {
                position,
                timestamp: room.playback.lastUpdated,
            });
        });

        // ── BUFFERING ───────────────────────────────────────
        // The client debounces this (3 s) so only sustained buffers arrive.
        // We do NOT pause everyone or modify room.playback — that caused a
        // cascade of pause → seek → buffer → pause.  Instead we just track
        // who is buffering and notify others (excluding the sender).
        socket.on('wp:buffering', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            room.bufferingUsers.add(socket.id);

            // Notify everyone EXCEPT the sender (use socket.to, not io.to)
            socket.to(currentRoom).emit('wp:buffering', {
                userId: socket.id,
                username: room.users.get(socket.id)?.username || 'Someone',
                bufferingCount: room.bufferingUsers.size,
            });
        });

        // ── READY (done buffering) ─────────────────────────
        socket.on('wp:ready', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            // Only act if this user was actually in the buffering set
            const wasBuf = room.bufferingUsers.has(socket.id);
            room.bufferingUsers.delete(socket.id);

            if (wasBuf && room.bufferingUsers.size === 0) {
                // Everyone is ready — tell clients to clear the banner.
                // Do NOT include a position or force a seek — that triggers
                // another buffering wave.
                room.playback.lastUpdated = Date.now();

                io.to(currentRoom).emit('wp:all-ready', {
                    timestamp: room.playback.lastUpdated,
                });
            }
        });

        // ── CHAT ────────────────────────────────────────────
        socket.on('wp:chat', ({ message }) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            const user = room.users.get(socket.id);
            io.to(currentRoom).emit('wp:chat', {
                userId: socket.id,
                username: user?.username || 'Unknown',
                message,
                timestamp: Date.now(),
            });
        });

        // ── REQUEST STATE (for re-sync) ─────────────────────
        socket.on('wp:request-state', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;

            const currentPosition = estimatedPosition(room.playback);
            room.playback.position = currentPosition;
            room.playback.lastUpdated = Date.now();

            socket.emit('wp:state', {
                roomCode: currentRoom,
                playback: { ...room.playback },
                users: getUserList(room),
            });
        });

        // ── LEAVE / DISCONNECT ──────────────────────────────
        function leaveRoom(sock) {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) {
                currentRoom = null;
                return;
            }

            const user = room.users.get(sock.id);
            room.users.delete(sock.id);
            room.bufferingUsers.delete(sock.id);
            sock.leave(currentRoom);

            if (room.users.size === 0) {
                rooms.delete(currentRoom);
                console.log(`[WatchParty] Room ${currentRoom} deleted (empty)`);
            } else {
                // If host left, promote next user
                if (user?.isHost) {
                    const nextUser = room.users.entries().next().value;
                    if (nextUser) {
                        nextUser[1].isHost = true;
                        room.hostId = nextUser[0];
                        io.to(nextUser[0]).emit('wp:promoted', { message: 'You are now the host' });
                    }
                }

                sock.to(currentRoom).emit('wp:user-left', {
                    id: sock.id,
                    username: user?.username || 'Unknown',
                    users: getUserList(room),
                });
            }

            console.log(`[WatchParty] ${user?.username || 'Unknown'} left room ${currentRoom}`);
            currentRoom = null;
        }

        socket.on('wp:leave', () => leaveRoom(socket));
        socket.on('disconnect', () => leaveRoom(socket));
    });
}

module.exports = { attachWatchParty };
