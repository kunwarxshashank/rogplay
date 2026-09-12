import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useTheme } from '@/hooks/useTheme';
import { TVFocusable } from '@/components/TVFocusable';

export default function TVAccountScreen() {
    const router = useRouter();
    const { colors: c } = useTheme();
    const { user, logout } = useAuthStore();
    const analytics = useAnalyticsStore();

    const isGuest = !user || user.id === 'guest' || user?.email?.includes('guest@rogplay');
    const isPremium = user?.isPremium || false;

    // Helper for hex opacity
    const alpha = (hex: string, opacity: number) => {
        const a = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return hex + a;
    };

    const handleLogout = () => {
        logout();
        if (router.canGoBack()) router.back();
        router.replace('/tvlogin');
    };

    const handleLogin = () => {
        if (isGuest) logout();
        router.replace('/tvlogin');
    };

    const handleTransaction = () => {
        if (isGuest) return;
        // In TV, we could open a modal or navigate to a transaction page.
        // For now, it's just a placeholder or could redirect.
    };

    const formatDate = (dateString?: string | number) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <View style={styles.header}>
                <TVFocusable
                    onPress={() => router.back()}
                    style={[styles.backButton, { backgroundColor: alpha(c.text, 0.05) }]}
                    focusedScale={1.1}
                    autoFlex={false}
                >
                    <MaterialIcons name="arrow-back" size={28} color={c.text} />
                </TVFocusable>
                <View>
                    <Text style={[styles.headerTitle, { color: c.text }]}>Profile & Account</Text>
                    <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>Manage your TV streaming experience</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.bentoGrid}>

                    {/* BENTO 1: Main Profile Card (Spans 2 columns) */}
                    <TVFocusable
                        style={[styles.bentoBox, styles.span2, { borderColor: isPremium ? '#FFD700' : 'transparent', borderWidth: isPremium ? 2 : 0 }]}
                        focusedScale={1.02}
                        focusedBorderColor={isPremium ? '#FFD700' : c.primary}
                        autoFlex={false}
                    >
                        <LinearGradient
                            colors={isPremium ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'] : [alpha(c.primary, 0.15), alpha(c.primary, 0.05)]}
                            style={styles.bentoGradient}
                        />
                        <View style={styles.profileContent}>
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={{ uri: user?.profilepic || 'https://cdn-icons-png.flaticon.com/512/3541/3541871.png' }}
                                    style={[styles.avatar, { borderColor: isPremium ? '#FFD700' : c.primary }]}
                                />
                                {isPremium && (
                                    <View style={styles.premiumBadge}>
                                        <MaterialCommunityIcons name="crown" size={16} color="#000" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.profileDetails}>
                                <Text style={[styles.profileName, { color: c.text }]}>{isGuest ? 'Guest User' : user?.name}</Text>
                                <Text style={[styles.profileEmail, { color: c.textSecondary }]}>{isGuest ? 'Sign in to sync your watch history' : user?.email}</Text>
                                <View style={styles.statusRow}>
                                    <View style={[styles.statusChip, { backgroundColor: isPremium ? '#FFD700' : alpha(c.text, 0.1) }]}>
                                        <Text style={[styles.statusText, { color: isPremium ? '#000' : c.text }]}>
                                            {isPremium ? 'CONTRIBUTOR' : (isGuest ? 'GUEST' : 'USER')}
                                        </Text>
                                    </View>
                                    {isPremium && (
                                        <Text style={[styles.validityText, { color: c.textSecondary }]}>Valid till: {formatDate(user?.subscriptionEnd)}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </TVFocusable>

                    {/* BENTO 2: Insights (Span 1) */}
                    <TVFocusable
                        style={[styles.bentoBox, { backgroundColor: alpha(c.card, 0.5) }]}
                        focusedScale={1.05}
                        focusedBorderColor={c.primary}
                        autoFlex={false}
                        onPress={() => router.push('/(tv)/settings?tab=insights')}
                    >
                        <View style={styles.actionBlock}>
                            <MaterialCommunityIcons name="chart-bar" size={32} color={c.primary} />
                            <Text style={[styles.actionBlockTitle, { color: c.text, textAlign: 'center' }]}>Insights</Text>
                            <Text style={[styles.actionBlockSub, { color: c.textMuted, textAlign: 'center' }]}>View your watch stats</Text>
                        </View>
                    </TVFocusable>

                    {/* BENTO 3: Authentication Action (Span 1) */}
                    <TVFocusable
                        style={[styles.bentoBox, { backgroundColor: alpha(isGuest ? c.primary : c.error, 0.1) }]}
                        focusedScale={1.05}
                        focusedBorderColor={isGuest ? c.primary : c.error}
                        autoFlex={false}
                        onPress={isGuest ? handleLogin : handleLogout}
                    >
                        <View style={styles.actionBlock}>
                            <View style={[styles.iconCircle, { backgroundColor: alpha(isGuest ? c.primary : c.error, 0.2), marginBottom: 12 }]}>
                                <MaterialCommunityIcons name={isGuest ? "login" : "logout"} size={26} color={isGuest ? c.primary : c.error} />
                            </View>
                            <Text style={[styles.actionBlockTitle, { color: isGuest ? c.primary : c.error, textAlign: 'center' }]}>
                                {isGuest ? 'Login to TV' : 'Logout from TV'}
                            </Text>
                        </View>
                    </TVFocusable>

                    {/* BENTO 4: Why Upgrade Premium (Span 2) */}
                    <TVFocusable
                        style={[styles.bentoBox, styles.span2, { backgroundColor: alpha('#FFD700', 0.1) }]}
                        focusedScale={1.03}
                        focusedBorderColor="#FFD700"
                        autoFlex={false}
                        onPress={() => {
                            // Can show plans modal or just information
                        }}
                    >
                        <View style={[styles.actionRow, { paddingVertical: 10 }]}>
                            <View style={[styles.iconCircle, { backgroundColor: alpha('#FFD700', 0.2) }]}>
                                <MaterialCommunityIcons name="crown" size={32} color="#FFD700" />
                            </View>
                            <View style={styles.actionDetails}>
                                <Text style={[styles.actionTitle, { color: '#FFD700' }]}>Why Upgrade?</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                                    {['Multi-Device', 'Cloud Sync', 'Watch Party', 'Early Updates'].map((feature, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: alpha('#FFD700', 0.1), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                            <MaterialIcons name="check" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                                            <Text style={{ color: c.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </TVFocusable>

                    {/* BENTO 5: Transaction History (Span 1) */}
                    {!isGuest && (
                        <TVFocusable
                            style={[styles.bentoBox, { backgroundColor: alpha(c.card, 0.5) }]}
                            focusedScale={1.05}
                            focusedBorderColor={c.primary}
                            autoFlex={false}
                            onPress={handleTransaction}
                        >
                            <View style={styles.actionBlock}>
                                <MaterialCommunityIcons name="receipt" size={32} color={c.textSecondary} />
                                <Text style={[styles.actionBlockTitle, { color: c.text }]}>Transactions</Text>
                                <Text style={[styles.actionBlockSub, { color: c.textMuted }]}>View billing history</Text>
                            </View>
                        </TVFocusable>
                    )}

                    {/* BENTO 6: App Version (Span 1) */}
                    {/* <TVFocusable
                        style={[styles.bentoBox, { backgroundColor: alpha(c.card, 0.3) }]}
                        focusedScale={1.05}
                        focusedBorderColor={c.border}
                        autoFlex={false}
                    >
                        <View style={styles.actionBlock}>
                            <MaterialCommunityIcons name="television-play" size={32} color={c.primary} />
                            <Text style={[styles.actionBlockTitle, { color: c.text }]}>RogPlay TV</Text>
                            <Text style={[styles.actionBlockSub, { color: c.textMuted }]}>Version 1.0.0</Text>
                        </View>
                    </TVFocusable> */}

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 54,
        paddingTop: 54,
        paddingBottom: 24,
    },
    backButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 24,
    },
    headerTitle: {
        fontSize: 34,
        fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_400Regular',
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 54,
        paddingBottom: 60,
    },
    bentoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    bentoBox: {
        width: '31.5%', // 3 columns with 20px gap approx
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 180,
    },
    span2: {
        width: '65.5%', // Spans 2 columns
    },
    bentoGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 30,
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
    },
    premiumBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFD700',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#000',
    },
    profileDetails: {
        marginLeft: 30,
        flex: 1,
    },
    profileName: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: -0.5,
    },
    profileEmail: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        marginTop: 4,
        opacity: 0.8,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 12,
    },
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1,
    },
    validityText: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
    },
    statsCard: {
        padding: 30,
        flex: 1,
        justifyContent: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statsValue: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
    },
    statsLabel: {
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
        marginTop: 4,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 30,
        flex: 1,
    },
    actionDetails: {
        flex: 1,
        marginLeft: 20,
    },
    actionTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_600SemiBold',
    },
    actionSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        marginTop: 4,
    },
    actionBlock: {
        padding: 30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBlockTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        marginTop: 16,
    },
    actionBlockSub: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        marginTop: 4,
    }
});
