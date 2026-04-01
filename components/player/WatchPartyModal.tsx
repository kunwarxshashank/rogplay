import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Platform,
    Pressable,
    Share,
    FlatList,
    Alert,
    Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WPUser } from '@/services/watchPartyService';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';

const isTV = Platform.isTV;
const { width: SCREEN_W } = Dimensions.get('window');

// ─── TV-friendly Pressable ──────────────────────────────
function FocusablePressable({ style, focusedStyle, children, ...props }: any) {
    const [isFocused, setIsFocused] = useState(false);
    if (!isTV) {
        return (
            <TouchableOpacity activeOpacity={0.75} {...props} style={style}>
                {children}
            </TouchableOpacity>
        );
    }
    return (
        <Pressable
            focusable
            isTVSelectable
            accessible
            {...props}
            onFocus={(e: any) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e: any) => { setIsFocused(false); props.onBlur?.(e); }}
            style={[style, isFocused && focusedStyle]}
        >
            {children}
        </Pressable>
    );
}

// ─── Props ──────────────────────────────────────────────

interface WatchPartyModalProps {
    visible: boolean;
    onClose: () => void;
    isInRoom: boolean;
    isHost: boolean;
    roomCode: string | null;
    users: WPUser[];
    error: string | null;
    bufferingUser: string | null;
    onCreateRoom: (username: string) => void;
    onJoinRoom: (code: string, username: string) => void;
    onLeaveRoom: () => void;
}

// ─── Helpers ────────────────────────────────────────────

/** Return rgba with custom alpha from a hex color */
function hexAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Main Component ─────────────────────────────────────

export default function WatchPartyModal({
    visible,
    onClose,
    isInRoom,
    isHost,
    roomCode,
    users,
    error,
    bufferingUser,
    onCreateRoom,
    onJoinRoom,
    onLeaveRoom,
}: WatchPartyModalProps) {
    const { theme } = useSettingsStore();
    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients?.primary || [c.primary, c.accent || c.primary];

    const [screen, setScreen] = useState<'menu' | 'join'>('menu');
    const [username, setUsername] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [creating, setCreating] = useState(false);

    const handleClose = () => {
        setScreen('menu');
        setJoinCode('');
        onClose();
    };

    const handleCreate = () => {
        const name = username.trim() || 'Host';
        setCreating(true);
        onCreateRoom(name);
    };

    React.useEffect(() => {
        if (isInRoom && roomCode) setCreating(false);
    }, [isInRoom, roomCode]);

    const handleJoin = () => {
        if (!joinCode.trim()) return;
        const name = username.trim() || 'Guest';
        onJoinRoom(joinCode.trim().toUpperCase(), name);
    };

    const handleShareCode = async () => {
        if (!roomCode) return;
        try {
            if (Platform.OS !== 'web') {
                await Share.share({ message: `Join my WatchParty! Room code: ${roomCode}` });
            }
        } catch { }
    };

    const handleCopyCode = async () => {
        if (!roomCode) return;
        try {
            await Share.share({ message: roomCode });
        } catch {
            Alert.alert('Room Code', roomCode);
        }
    };

    // ─── Dynamic styles ─────────────────────────────────
    const themed = {
        modal: {
            backgroundColor: c.surface || '#0d111b',
            borderColor: hexAlpha(c.primary, 0.2),
        },
        headerIcon: c.primary,
        title: { color: c.text || '#fff' },
        subtitle: { color: c.textSecondary || '#94a3b8' },
        input: {
            backgroundColor: c.background || '#04070d',
            borderColor: c.border || 'rgba(255,255,255,0.08)',
            color: c.text || '#fff',
        },
        primaryBtn: gradients,
        secondaryBorder: hexAlpha(c.primary, 0.3),
        secondaryBg: hexAlpha(c.primary, 0.08),
        secondaryText: c.primary,
        codeContainer: {
            backgroundColor: hexAlpha(c.primary, 0.06),
            borderColor: hexAlpha(c.primary, 0.15),
        },
        codeText: c.primary,
        codeCopyBg: hexAlpha(c.primary, 0.12),
        hostAvatarBg: c.primary,
        hostBadgeBg: hexAlpha(c.primary, 0.15),
        hostBadgeText: c.primary,
        errorColor: c.error || '#ef4444',
        warningColor: c.warning || '#fbbf24',
        focusedBorder: c.primary,
    };

    const focusedStyle = {
        borderColor: themed.focusedBorder,
        shadowColor: themed.focusedBorder,
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
        transform: [{ scale: 1.03 }],
    };

    // ── Render in-room view ─────────────────────────────
    if (isInRoom && roomCode) {
        return (
            <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
                <View style={s.backdrop}>
                    <View style={[s.modal, themed.modal]}>
                        {/* Header */}
                        <View style={s.header}>
                            <View style={[s.headerIconWrap, { backgroundColor: hexAlpha(c.primary, 0.12) }]}>
                                <MaterialCommunityIcons name="party-popper" size={isTV ? 28 : 22} color={themed.headerIcon} />
                            </View>
                            <View style={s.headerTextCol}>
                                <Text style={[s.title, themed.title]}>WatchParty</Text>
                                <Text style={[s.headerSub, themed.subtitle]}>Watching together</Text>
                            </View>
                            <FocusablePressable
                                onPress={handleClose}
                                style={[s.closeBtn, { borderColor: 'transparent' }]}
                                focusedStyle={{ borderColor: c.primary, backgroundColor: hexAlpha(c.primary, 0.15) }}
                            >
                                <MaterialIcons name="close" size={isTV ? 28 : 22} color={c.textMuted || '#64748b'} />
                            </FocusablePressable>
                        </View>

                        {/* Room Code Card */}
                        <View style={[s.codeCard, themed.codeContainer]}>
                            <Text style={[s.codeLabel, themed.subtitle]}>ROOM CODE</Text>
                            <View style={s.codeCharRow}>
                                {roomCode.split('').map((ch, i) => (
                                    <View key={i} style={[s.codeCharBox, { borderColor: hexAlpha(c.primary, 0.2) }]}>
                                        <Text style={[s.codeChar, { color: themed.codeText }]}>{ch}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={s.codeActions}>
                                <FocusablePressable
                                    onPress={handleCopyCode}
                                    style={[s.codeActionBtn, { backgroundColor: themed.codeCopyBg }]}
                                    focusedStyle={focusedStyle}
                                >
                                    <MaterialIcons name="content-copy" size={isTV ? 20 : 16} color={c.primary} />
                                    <Text style={[s.codeActionText, { color: c.primary }]}>Copy</Text>
                                </FocusablePressable>
                                {Platform.OS !== 'web' && (
                                    <FocusablePressable
                                        onPress={handleShareCode}
                                        style={[s.codeActionBtn, { backgroundColor: themed.codeCopyBg }]}
                                        focusedStyle={focusedStyle}
                                    >
                                        <MaterialIcons name="share" size={isTV ? 20 : 16} color={c.primary} />
                                        <Text style={[s.codeActionText, { color: c.primary }]}>Share</Text>
                                    </FocusablePressable>
                                )}
                            </View>
                        </View>

                        {/* Buffering indicator */}
                        {bufferingUser && (
                            <View style={[s.bufferingBanner, { borderColor: hexAlpha(themed.warningColor, 0.25) }]}>
                                <MaterialIcons name="hourglass-top" size={isTV ? 22 : 18} color={themed.warningColor} />
                                <Text style={[s.bufferingText, { color: themed.warningColor }]}>
                                    Waiting for {bufferingUser} to buffer…
                                </Text>
                            </View>
                        )}

                        {/* Users list */}
                        <View style={s.sectionHeader}>
                            <MaterialIcons name="people" size={isTV ? 20 : 16} color={c.textMuted || '#64748b'} />
                            <Text style={[s.sectionTitle, themed.subtitle]}>
                            Viewers ({users.length})
                        </Text>
                        </View>
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item.id}
                            style={s.usersList}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={[s.userRow, { borderColor: c.border || 'rgba(255,255,255,0.05)' }]}>
                                    <View style={[
                                        s.userAvatar,
                                        { backgroundColor: item.isHost ? themed.hostAvatarBg : (c.card || '#121723') },
                                    ]}>
                                        <Text style={s.userAvatarText}>
                                            {item.username.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={s.userInfo}>
                                        <Text style={[s.userName, { color: c.text || '#fff' }]}>{item.username}</Text>
                                    {item.isHost && (
                                            <View style={[s.hostBadge, { backgroundColor: themed.hostBadgeBg }]}>
                                                <MaterialIcons name="star" size={10} color={themed.hostBadgeText} />
                                                <Text style={[s.hostBadgeText, { color: themed.hostBadgeText }]}>HOST</Text>
                                        </View>
                                    )}
                                    </View>
                                    <View style={[s.statusDot, { backgroundColor: c.success || '#10b981' }]} />
                                </View>
                            )}
                        />

                        {/* Error */}
                        {error && (
                            <View style={[s.errorContainer, { backgroundColor: hexAlpha(themed.errorColor, 0.08) }]}>
                                <MaterialIcons name="error-outline" size={16} color={themed.errorColor} />
                                <Text style={[s.errorText, { color: themed.errorColor }]}>{error}</Text>
                            </View>
                        )}

                        {/* Leave button */}
                        <FocusablePressable
                            onPress={() => { onLeaveRoom(); handleClose(); }}
                            style={[s.leaveBtn, { borderColor: hexAlpha(themed.errorColor, 0.2) }]}
                            focusedStyle={{
                                borderColor: themed.errorColor,
                                backgroundColor: hexAlpha(themed.errorColor, 0.15),
                                transform: [{ scale: 1.02 }],
                            }}
                        >
                            <MaterialIcons name="exit-to-app" size={isTV ? 22 : 18} color={themed.errorColor} />
                            <Text style={[s.leaveBtnText, { color: themed.errorColor }]}>Leave Party</Text>
                        </FocusablePressable>
                    </View>
                </View>
            </Modal>
        );
    }

    // ── Render lobby / create / join screens ────────────
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={s.backdrop}>
                <View style={[s.modal, themed.modal]}>
                    {/* Header */}
                    <View style={s.header}>
                        {screen !== 'menu' && (
                            <FocusablePressable
                                onPress={() => setScreen('menu')}
                                style={[s.backBtn, { borderColor: 'transparent' }]}
                                focusedStyle={{ borderColor: c.primary, backgroundColor: hexAlpha(c.primary, 0.12) }}
                            >
                                <MaterialIcons name="arrow-back" size={isTV ? 28 : 22} color={c.textSecondary || '#94a3b8'} />
                            </FocusablePressable>
                        )}
                        <View style={[s.headerIconWrap, { backgroundColor: hexAlpha(c.primary, 0.12) }]}>
                            <MaterialCommunityIcons name="party-popper" size={isTV ? 28 : 22} color={themed.headerIcon} />
                        </View>
                        <View style={s.headerTextCol}>
                            <Text style={[s.title, themed.title]}>WatchParty</Text>
                            <Text style={[s.headerSub, themed.subtitle]}>
                                {screen === 'menu' ? 'Watch together' : 'Join a room'}
                            </Text>
                        </View>
                        <FocusablePressable
                            onPress={handleClose}
                            style={[s.closeBtn, { borderColor: 'transparent' }]}
                            focusedStyle={{ borderColor: c.primary, backgroundColor: hexAlpha(c.primary, 0.15) }}
                        >
                            <MaterialIcons name="close" size={isTV ? 28 : 22} color={c.textMuted || '#64748b'} />
                        </FocusablePressable>
                    </View>

                    {error && (
                        <View style={[s.errorContainer, { backgroundColor: hexAlpha(themed.errorColor, 0.08) }]}>
                            <MaterialIcons name="error-outline" size={16} color={themed.errorColor} />
                            <Text style={[s.errorText, { color: themed.errorColor }]}>{error}</Text>
                        </View>
                    )}

                    {/* MENU SCREEN */}
                    {screen === 'menu' && (
                        <View style={s.menuContainer}>
                            <Text style={[s.menuSubtitle, themed.subtitle]}>
                                Watch together with friends in real-time. Create a room or join with a code.
                            </Text>

                            <TextInput
                                style={[s.input, themed.input]}
                                placeholder="Your name (optional)"
                                placeholderTextColor={c.textMuted || '#64748b'}
                                value={username}
                                onChangeText={setUsername}
                                maxLength={20}
                            />

                            {/* Create Button */}
                            <FocusablePressable
                                onPress={handleCreate}
                                disabled={creating}
                                style={[s.gradientBtnWrap, creating && s.disabledBtn]}
                                focusedStyle={focusedStyle}
                            >
                                <LinearGradient
                                    colors={themed.primaryBtn}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={s.gradientBtn}
                            >
                                {creating ? (
                                    <>
                                            <MaterialIcons name="hourglass-top" size={isTV ? 24 : 20} color="#fff" />
                                            <Text style={s.gradientBtnText}>Creating…</Text>
                                    </>
                                ) : (
                                    <>
                                            <MaterialCommunityIcons name="rocket-launch" size={isTV ? 24 : 20} color="#fff" />
                                            <Text style={s.gradientBtnText}>Create Party</Text>
                                    </>
                                )}
                                </LinearGradient>
                            </FocusablePressable>

                            {/* Join Button */}
                            <FocusablePressable
                                onPress={() => setScreen('join')}
                                disabled={creating}
                                style={[s.secondaryBtn, { backgroundColor: themed.secondaryBg, borderColor: themed.secondaryBorder }]}
                                focusedStyle={focusedStyle}
                            >
                                <MaterialIcons name="group-add" size={isTV ? 24 : 20} color={themed.secondaryText} />
                                <Text style={[s.secondaryBtnText, { color: themed.secondaryText }]}>Join Party</Text>
                            </FocusablePressable>
                        </View>
                    )}

                    {/* JOIN SCREEN */}
                    {screen === 'join' && (
                        <View style={s.menuContainer}>
                            <Text style={[s.menuSubtitle, themed.subtitle]}>
                                Enter the 6-character room code shared by the host.
                            </Text>

                            <View style={s.codeInputRow}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            s.codeInputBox,
                                            {
                                                borderColor: joinCode[i]
                                                    ? c.primary
                                                    : (c.border || 'rgba(255,255,255,0.08)'),
                                                backgroundColor: joinCode[i]
                                                    ? hexAlpha(c.primary, 0.06)
                                                    : (c.background || '#04070d'),
                                            },
                                        ]}
                                    >
                                        <Text style={[s.codeInputChar, { color: c.text || '#fff' }]}>
                                            {joinCode[i] || ''}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Hidden real text input that captures keyboard */}
                            <TextInput
                                style={s.hiddenInput}
                                value={joinCode}
                                onChangeText={(t) => setJoinCode(t.toUpperCase().slice(0, 6))}
                                maxLength={6}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                autoFocus={!isTV}
                                caretHidden
                            />

                            {/* TV fallback: show a visible input for TV keyboard */}
                            {isTV && (
                                <TextInput
                                    style={[s.input, themed.input, s.tvCodeInput]}
                                    placeholder="Enter code"
                                    placeholderTextColor={c.textMuted || '#64748b'}
                                    value={joinCode}
                                    onChangeText={(t) => setJoinCode(t.toUpperCase().slice(0, 6))}
                                    maxLength={6}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                />
                            )}

                            <FocusablePressable
                                onPress={handleJoin}
                                disabled={joinCode.trim().length < 6}
                                style={[s.gradientBtnWrap, joinCode.trim().length < 6 && s.disabledBtn]}
                                focusedStyle={focusedStyle}
                            >
                                <LinearGradient
                                    colors={themed.primaryBtn}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={s.gradientBtn}
                            >
                                    <MaterialIcons name="login" size={isTV ? 24 : 20} color="#fff" />
                                    <Text style={s.gradientBtnText}>Join Party</Text>
                                </LinearGradient>
                            </FocusablePressable>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: isTV ? 560 : '90%',
        maxWidth: isTV ? 560 : 440,
        borderRadius: isTV ? 28 : 22,
        padding: isTV ? 32 : 22,
        borderWidth: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: isTV ? 24 : 18,
        gap: isTV ? 14 : 10,
    },
    headerIconWrap: {
        width: isTV ? 48 : 38,
        height: isTV ? 48 : 38,
        borderRadius: isTV ? 14 : 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextCol: {
        flex: 1,
    },
    title: {
        fontSize: isTV ? 26 : 19,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    headerSub: {
        fontSize: isTV ? 15 : 12,
        marginTop: 1,
    },
    closeBtn: {
        padding: isTV ? 10 : 6,
        borderRadius: isTV ? 14 : 10,
        borderWidth: 2,
    },
    backBtn: {
        padding: isTV ? 10 : 6,
        borderRadius: isTV ? 14 : 10,
        borderWidth: 2,
        marginRight: 4,
    },

    // Menu
    menuContainer: {
        gap: isTV ? 16 : 12,
    },
    menuSubtitle: {
        fontSize: isTV ? 17 : 13,
        lineHeight: isTV ? 24 : 18,
        marginBottom: isTV ? 4 : 2,
    },

    // Inputs
    input: {
        borderRadius: isTV ? 16 : 12,
        paddingHorizontal: isTV ? 20 : 16,
        paddingVertical: isTV ? 16 : 12,
        fontSize: isTV ? 20 : 15,
        borderWidth: 1,
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        height: 0,
        width: 0,
    },
    tvCodeInput: {
        textAlign: 'center',
        fontSize: isTV ? 28 : 20,
        letterSpacing: 6,
        fontWeight: '700',
    },

    // Code input boxes (join screen)
    codeInputRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: isTV ? 10 : 7,
    },
    codeInputBox: {
        width: isTV ? 56 : 42,
        height: isTV ? 64 : 50,
        borderRadius: isTV ? 14 : 10,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    codeInputChar: {
        fontSize: isTV ? 30 : 22,
        fontWeight: '800',
    },

    // Gradient primary button
    gradientBtnWrap: {
        borderRadius: isTV ? 16 : 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: isTV ? 18 : 14,
        gap: isTV ? 12 : 8,
    },
    gradientBtnText: {
        color: '#fff',
        fontSize: isTV ? 20 : 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    disabledBtn: {
        opacity: 0.4,
    },

    // Secondary button
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: isTV ? 18 : 14,
        borderRadius: isTV ? 16 : 14,
        gap: isTV ? 12 : 8,
        borderWidth: 1,
    },
    secondaryBtnText: {
        fontSize: isTV ? 20 : 16,
        fontWeight: '600',
    },

    // In-room: code card
    codeCard: {
        borderRadius: isTV ? 18 : 14,
        padding: isTV ? 24 : 16,
        alignItems: 'center',
        marginBottom: isTV ? 20 : 14,
        borderWidth: 1,
    },
    codeLabel: {
        fontSize: isTV ? 13 : 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: isTV ? 14 : 10,
    },
    codeCharRow: {
        flexDirection: 'row',
        gap: isTV ? 8 : 5,
        marginBottom: isTV ? 16 : 10,
    },
    codeCharBox: {
        width: isTV ? 52 : 40,
        height: isTV ? 58 : 46,
        borderRadius: isTV ? 12 : 8,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    codeChar: {
        fontSize: isTV ? 30 : 22,
        fontWeight: '800',
    },
    codeActions: {
        flexDirection: 'row',
        gap: isTV ? 12 : 8,
    },
    codeActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isTV ? 18 : 14,
        paddingVertical: isTV ? 10 : 7,
        borderRadius: isTV ? 10 : 8,
        gap: isTV ? 8 : 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    codeActionText: {
        fontSize: isTV ? 15 : 12,
        fontWeight: '600',
    },

    // Buffering
    bufferingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251,191,36,0.06)',
        padding: isTV ? 16 : 12,
        borderRadius: isTV ? 14 : 10,
        marginBottom: isTV ? 16 : 10,
        gap: isTV ? 10 : 8,
        borderWidth: 1,
    },
    bufferingText: {
        fontSize: isTV ? 16 : 13,
        flex: 1,
        fontWeight: '500',
    },

    // Users section
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isTV ? 8 : 6,
        marginBottom: isTV ? 12 : 8,
    },
    sectionTitle: {
        fontSize: isTV ? 15 : 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    usersList: {
        maxHeight: isTV ? 260 : 180,
        marginBottom: isTV ? 20 : 14,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: isTV ? 12 : 8,
        paddingHorizontal: isTV ? 12 : 8,
        gap: isTV ? 14 : 10,
        borderBottomWidth: 1,
    },
    userAvatar: {
        width: isTV ? 44 : 34,
        height: isTV ? 44 : 34,
        borderRadius: isTV ? 14 : 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: isTV ? 18 : 14,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: isTV ? 10 : 6,
    },
    userName: {
        fontSize: isTV ? 18 : 14,
        fontWeight: '600',
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isTV ? 10 : 7,
        paddingVertical: isTV ? 4 : 2,
        borderRadius: 6,
        gap: 3,
    },
    hostBadgeText: {
        fontSize: isTV ? 11 : 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statusDot: {
        width: isTV ? 10 : 8,
        height: isTV ? 10 : 8,
        borderRadius: isTV ? 5 : 4,
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: isTV ? 14 : 10,
        borderRadius: isTV ? 12 : 8,
        marginBottom: isTV ? 14 : 10,
        gap: isTV ? 10 : 6,
    },
    errorText: {
        fontSize: isTV ? 15 : 12,
        flex: 1,
        fontWeight: '500',
    },

    // Leave
    leaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: isTV ? 16 : 12,
        borderRadius: isTV ? 14 : 12,
        gap: isTV ? 10 : 8,
        backgroundColor: 'rgba(239,68,68,0.06)',
        borderWidth: 1,
    },
    leaveBtnText: {
        fontSize: isTV ? 18 : 15,
        fontWeight: '600',
    },
});
