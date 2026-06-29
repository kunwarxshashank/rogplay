import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Pressable,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import {
    getSocket,
    validateRoom,
    disconnectSocket,
} from '@/services/watchPartyService';
import JoinPremiumModal from '@/components/player/JoinPremiumModal';
import { useTheme } from '@/hooks/useTheme';

const isTV = Platform.isTV;
const { width: SCREEN_W } = Dimensions.get('window');

/** Return rgba with custom alpha from a hex color */
function hexAlpha(hex: string, alpha: number): string {
    const { colors: c } = useTheme();
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/** TV-friendly pressable with focus styling */
function FocusablePressable({ style, focusedStyle, children, disabled, ...props }: any) {
    const [isFocused, setIsFocused] = useState(false);
    if (!isTV) {
        return (
            <TouchableOpacity activeOpacity={0.75} disabled={disabled} {...props} style={[style, disabled && { opacity: 0.5 }]}>
                {children}
            </TouchableOpacity>
        );
    }
    return (
        <Pressable
            focusable={!disabled}
            isTVSelectable={!disabled}
            accessible
            {...props}
            disabled={disabled}
            onFocus={(e: any) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e: any) => { setIsFocused(false); props.onBlur?.(e); }}
            style={[style, disabled && { opacity: 0.5 }, isFocused && focusedStyle]}
        >
            {children}
        </Pressable>
    );
}

export default function JoinWatchPartyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuthStore();
    const { colors: c } = useTheme();
    const gradients = c.gradients?.primary || [c.primary, c.accent || c.primary];

    const [roomCode, setRoomCode] = useState((params.code as string) || '');
    const [username, setUsername] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [premiumModalVisible, setPremiumModalVisible] = useState(false);
    const isPremium = user?.isPremium || false;

    const focusedStyle = {
        borderColor: c.primary,
        shadowColor: c.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
        transform: [{ scale: 1.03 }],
    };

    useEffect(() => {
        return () => { disconnectSocket(); };
    }, []);

    const handleJoin = () => {
        if (!isPremium) {
            setPremiumModalVisible(true);
            return;
        }

        if (!roomCode.trim() || roomCode.trim().length < 6) {
            setError('Please enter a valid 6-character room code');
            return;
        }

        setLoading(true);
        setError(null);

        const s = getSocket();

        const onValidated = (data: any) => {
            setLoading(false);
            cleanup();
            disconnectSocket();
            router.replace({
                pathname: '/player',
                params: {
                    url: data.playback.url,
                    title: data.playback.title,
                    watchPartyCode: data.roomCode,
                    watchPartyUsername: username.trim() || 'Guest',
                },
            } as any);
        };

        const onError = (data: any) => {
            setLoading(false);
            setError(data.message || 'Room not found');
            cleanup();
        };

        s.on('wp:validated', onValidated);
        s.on('wp:error', onError);

        const timeout = setTimeout(() => {
            setLoading(false);
            setError('Connection timed out. Check your network and try again.');
            cleanup();
        }, 10000);

        function cleanup() {
            s.off('wp:validated', onValidated);
            s.off('wp:error', onError);
            clearTimeout(timeout);
        }

        validateRoom(roomCode.trim().toUpperCase());
    };

    return (
        <SafeAreaView style={[s.container, { backgroundColor: c.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={s.flex}
            >
                {/* Header */}
                <View style={s.header}>
                    <FocusablePressable
                        onPress={() => router.back()}
                        style={[s.backBtn, { backgroundColor: hexAlpha(c.primary, 0.08), borderColor: 'transparent' }]}
                        focusedStyle={{ borderColor: c.primary, backgroundColor: hexAlpha(c.primary, 0.18) }}
                    >
                        <MaterialIcons name="arrow-back" size={isTV ? 30 : 22} color={c.text} />
                    </FocusablePressable>
                    <View style={[s.headerIconWrap, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                        <MaterialCommunityIcons name="party-popper" size={isTV ? 28 : 22} color={c.primary} />
                    </View>
                    <View style={s.headerTextCol}>
                        <Text style={[s.headerTitle, { color: c.text }]}>Join WatchParty</Text>
                        <Text style={[s.headerSub, { color: c.textSecondary }]}>Enter a room code to start</Text>
                    </View>
                </View>

                {/* TV: horizontal side-by-side layout | Mobile: vertical stack */}
                <View style={[s.content, isTV && s.contentTV]}>
                    {/* ─── Left / Top: Illustration ─── */}
                    <View style={[s.illustration, isTV && s.illustrationTV]}>
                        <View style={[s.illustrationCircle, { backgroundColor: hexAlpha(c.primary, 0.08), borderColor: hexAlpha(c.primary, 0.15) }]}>
                            <MaterialCommunityIcons name="movie-open" size={isTV ? 48 : 44} color={c.primary} />
                        </View>
                        <Text style={[s.illustrationTitle, { color: c.text }]}>
                            Watch Together
                        </Text>
                        <Text style={[s.illustrationText, { color: c.textSecondary }]}>
                            Enjoy videos with friends in perfect sync — in real-time
                        </Text>
                        {isTV && (
                            <View style={s.tvFeatures}>
                                {[
                                    { icon: 'sync', label: 'Synced playback' },
                                    { icon: 'chat', label: 'Live chat' },
                                    { icon: 'people', label: 'Multiple viewers' },
                                ].map((f, i) => (
                                    <View key={i} style={[s.tvFeatureRow, { borderColor: c.border }]}>
                                        <View style={[s.tvFeatureIcon, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                                            <MaterialIcons name={f.icon as any} size={16} color={c.primary} />
                                        </View>
                                        <Text style={[s.tvFeatureText, { color: c.textSecondary }]}>{f.label}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ─── Right / Bottom: Form ─── */}
                    <View style={[s.formCard, isTV && s.formCardTV, { backgroundColor: c.surface || c.card, borderColor: c.border }]}>
                        {/* Username */}
                        <View style={s.fieldGroup}>
                            <View style={s.labelRow}>
                                <MaterialIcons name="person" size={isTV ? 16 : 14} color={c.textMuted || c.textSecondary} />
                                <Text style={[s.label, { color: c.textSecondary }]}>Your Name</Text>
                            </View>
                            <TextInput
                                style={[s.input, {
                                    backgroundColor: c.background,
                                    borderColor: c.border,
                                    color: c.text,
                                }]}
                                placeholder="Enter your name"
                                placeholderTextColor={c.textMuted || c.textSecondary}
                                value={username}
                                onChangeText={setUsername}
                                maxLength={20}
                            />
                        </View>

                        {/* Room Code */}
                        <View style={s.fieldGroup}>
                            <View style={s.labelRow}>
                                <MaterialIcons name="meeting-room" size={isTV ? 16 : 14} color={c.textMuted || c.textSecondary} />
                                <Text style={[s.label, { color: c.textSecondary }]}>Room Code</Text>
                            </View>

                            <TextInput
                                style={[s.input, s.codeInput, {
                                    backgroundColor: c.background,
                                    borderColor: c.border,
                                    color: c.text,
                                }]}
                                placeholder="Enter code here"
                                placeholderTextColor={c.textMuted || c.textSecondary}
                                value={roomCode}
                                onChangeText={(t) => setRoomCode(t.toUpperCase().slice(0, 6))}
                                maxLength={6}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                autoFocus={!isTV}
                            />
                        </View>

                        {/* Error */}
                        {error && (
                            <View style={[s.errorContainer, { backgroundColor: hexAlpha(c.error || '#ef4444', 0.08) }]}>
                                <MaterialIcons name="error-outline" size={isTV ? 18 : 16} color={c.error || '#ef4444'} />
                                <Text style={[s.errorText, { color: c.error || '#ef4444' }]}>{error}</Text>
                            </View>
                        )}

                        {/* Join Button */}
                        <FocusablePressable
                            onPress={handleJoin}
                            disabled={loading || roomCode.trim().length < 6}
                            style={[s.joinBtnWrap, (loading || roomCode.trim().length < 6) && s.disabledBtn]}
                            focusedStyle={focusedStyle}
                        >
                            <LinearGradient
                                colors={gradients}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.joinBtnGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size={isTV ? 'large' : 'small'} />
                                ) : (
                                    <>
                                        <MaterialIcons name="login" size={isTV ? 22 : 22} color="#fff" />
                                        <Text style={s.joinBtnText}>Join Party</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </FocusablePressable>

                        {/* Help text */}
                        <View style={s.helpRow}>
                            <MaterialIcons name="info-outline" size={isTV ? 14 : 14} color={c.textMuted || c.textSecondary} />
                            <Text style={[s.helpText, { color: c.textMuted || c.textSecondary }]}>
                                Ask the party host for the 6-character room code
                            </Text>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <JoinPremiumModal
                visible={premiumModalVisible}
                onClose={() => setPremiumModalVisible(false)}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isTV ? 40 : 20,
        paddingTop: isTV ? 16 : 16,
        paddingBottom: isTV ? 10 : 12,
        gap: isTV ? 12 : 10,
    },
    backBtn: {
        padding: isTV ? 10 : 8,
        borderRadius: isTV ? 12 : 10,
        borderWidth: 2,
    },
    headerIconWrap: {
        width: isTV ? 40 : 36,
        height: isTV ? 40 : 36,
        borderRadius: isTV ? 12 : 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextCol: {
        flex: 1,
    },
    headerTitle: {
        fontSize: isTV ? 22 : 20,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    headerSub: {
        fontSize: isTV ? 13 : 12,
        marginTop: 1,
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    contentTV: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 60,
        gap: 40,
    },

    // Illustration
    illustration: {
        alignItems: 'center',
        marginBottom: 20,
    },
    illustrationTV: {
        flex: 1,
        marginBottom: 0,
        maxWidth: 380,
    },
    illustrationCircle: {
        width: isTV ? 88 : 84,
        height: isTV ? 88 : 84,
        borderRadius: isTV ? 26 : 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: isTV ? 14 : 14,
        borderWidth: 1,
    },
    illustrationTitle: {
        fontSize: isTV ? 24 : 20,
        fontWeight: '800',
        marginBottom: isTV ? 6 : 4,
        letterSpacing: 0.3,
    },
    illustrationText: {
        fontSize: isTV ? 15 : 14,
        textAlign: 'center',
        maxWidth: isTV ? 320 : 280,
        lineHeight: isTV ? 22 : 20,
    },
    tvFeatures: {
        marginTop: 20,
        gap: 8,
        width: '100%',
        maxWidth: 260,
    },
    tvFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
    },
    tvFeatureIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tvFeatureText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Form Card
    formCard: {
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        gap: 16,
    },
    formCardTV: {
        flex: 1,
        maxWidth: 460,
        borderRadius: 22,
        padding: 24,
        gap: 16,
    },
    fieldGroup: {
        gap: isTV ? 6 : 8,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isTV ? 6 : 5,
    },
    label: {
        fontSize: isTV ? 12 : 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        borderRadius: isTV ? 12 : 12,
        paddingHorizontal: isTV ? 16 : 16,
        paddingVertical: isTV ? 12 : 12,
        fontSize: isTV ? 17 : 15,
        borderWidth: 1,
    },
    codeInput: {
        textAlign: 'center',
        fontSize: isTV ? 22 : 20,
        letterSpacing: 6,
        fontWeight: '700',
        marginTop: isTV ? 8 : 6,
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: isTV ? 10 : 10,
        borderRadius: isTV ? 10 : 8,
    },
    errorText: {
        fontSize: isTV ? 13 : 13,
        flex: 1,
        fontWeight: '500',
    },

    // Join button
    joinBtnWrap: {
        borderRadius: isTV ? 14 : 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginTop: isTV ? 4 : 4,
    },
    joinBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: isTV ? 14 : 15,
        gap: isTV ? 10 : 8,
    },
    joinBtnText: {
        color: '#fff',
        fontSize: isTV ? 18 : 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    disabledBtn: {
        opacity: 0.4,
    },

    // Help
    helpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: isTV ? 6 : 8,
    },
    helpText: {
        fontSize: isTV ? 12 : 12,
        fontWeight: '500',
    },
});
