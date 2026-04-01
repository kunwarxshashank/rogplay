import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Dimensions, Linking, Alert, ActivityIndicator, Platform } from 'react-native';
import { Colors, Layout } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { TVFocusable } from '@/components/TVFocusable';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { PlansModal } from '@/components/PlansModal';

const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

const { width } = Dimensions.get('window');

export default function AccountScreen() {
    const router = useRouter();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
    const { user, logout } = useAuthStore();
    const [isModalVisible, setModalVisible] = useState(false);
    const isGuest = !user || user.id === 'guest';

    const isPremium = user?.isPremium || false;
    const [permission, requestPermission] = useCameraPermissions();
    const [isScannerVisible, setScannerVisible] = useState(false);
    const [scanning, setScanning] = useState(false);
    const { token } = useAuthStore();

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    };

    const handleLogout = () => {
        logout();
        if (router.canGoBack()) router.back();
        router.replace(Platform.isTV ? '/tvlogin' : '/login');
    };

    const handleLogin = () => {
        if (user?.id === 'guest') {
            logout();
        }
        router.replace(Platform.isTV ? '/tvlogin' : '/login');
    };

    const handleTVLoginStart = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes');
                return;
            }
        }
        setScannerVisible(true);
    };

    const onCodeScanned = async ({ data }: { data: string }) => {
        if (scanning) return;
        try {
            const qrData = JSON.parse(data);
            if (qrData.type === 'login_qr' && qrData.sessionId) {
                setScanning(true);
                await axios.post(`${DB_BASEURL}/qr/authorize`, {
                    sessionId: qrData.sessionId,
                    token: token,
                    user: user
                });
                Alert.alert('Success', 'Logged in on TV successfully!');
                setScannerVisible(false);
            }
        } catch (err) {
            console.error('Invalid QR code', err);
        } finally {
            setScanning(false);
        }
    };


    const PREMIUM_FEATURES = [
        { icon: 'devices', title: 'Multi-Device Login', desc: 'Use your account on unlimited devices' },
        { icon: 'sync', title: 'Cloud Addon & Favourite Sync', desc: 'Automatically sync addons and Favourites across all devices' },
        { icon: 'celebration', title: 'Watch Party', desc: 'Watch Party with your friends' },
        { icon: 'tips-and-updates', title: 'Early Updates', desc: 'Get early access to new features' },
        { icon: 'support', title: 'Support Community', desc: 'Help Developers and Addon Creators directly' }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Platform.isTV ? 'transparent' : currentColors.background }]}>
            {Platform.isTV && (
                <View style={[styles.tvHeader, { paddingHorizontal: 54, paddingTop: 60, marginBottom: 20 }]}>
                    <Text style={[styles.title, { color: currentColors.text, fontSize: 34, fontFamily: 'Outfit_800ExtraBold' }]}>Account Details</Text>
                    <Text style={[styles.subtitle, { color: currentColors.textSecondary, fontSize: 16, fontFamily: 'Outfit_400Regular' }]}>Manage your profile, subscription, and account settings.</Text>
                </View>
            )}
            {!Platform.isTV && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>Account</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <LinearGradient
                    colors={currentColors.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileCard}
                >
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: user?.profilepic || 'https://cdn-icons-png.flaticon.com/512/3541/3541871.png' }}
                                style={styles.avatar}
                            />
                            {isPremium && (
                                <View style={styles.premiumBadge}>
                                    <MaterialCommunityIcons name="crown" size={14} color="#FFD700" />
                                </View>
                            )}
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{user?.name ? user.name : 'Guest User'}</Text>
                            <Text style={styles.userEmail}>{user?.email ? user.email : 'Sign in to access premium features'}</Text>
                        </View>
                    </View>

                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Status</Text>
                            <Text style={styles.statusValue}>{isPremium ? 'GOD' : 'HUMAN'}</Text>
                        </View>
                        <View style={styles.statusDivider} />
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Valid Until</Text>
                            <Text style={styles.statusValue}>{isPremium ? formatDate(user?.subscriptionEnd) : 'N/A'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {!isPremium && (
                    <View style={styles.premiumFeaturesContainer}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Why Upgrade ?</Text>
                        <View style={styles.featuresList}>
                            {PREMIUM_FEATURES.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <View style={[styles.featureIconContainer, { backgroundColor: `${currentColors.primary}15` }]}>
                                        <MaterialIcons name={feature.icon as any} size={20} color={currentColors.primary} />
                                    </View>
                                    <View style={styles.featureText}>
                                        <Text style={[styles.featureTitle, { color: currentColors.text }]}>{feature.title}</Text>
                                        <Text style={[styles.featureDesc, { color: currentColors.textSecondary }]}>{feature.desc}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TVFocusable
                            onPress={() => {
                                if (isGuest) {
                                    handleLogin();
                                } else if (!Platform.isTV) {
                                    setModalVisible(true);
                                }
                            }}
                            style={styles.upgradeButton}
                            disabled={Platform.isTV && !isGuest}
                        >
                            <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.upgradeGradient}
                            >
                                <MaterialCommunityIcons name="crown" size={24} color="#000" />
                                <Text style={styles.upgradeText}>
                                    {Platform.isTV && !isGuest
                                        ? "Login Your Account in Mobile and You can upgrade from there"
                                        : "Upgrade Now !"}
                                </Text>
                                {(isGuest || !Platform.isTV) && <MaterialIcons name="chevron-right" size={24} color="#000" />}
                            </LinearGradient>
                        </TVFocusable>
                    </View>
                )}


                <View style={styles.authSection}>

                    {user && user.id !== 'guest' && !Platform.isTV && (
                        <TVFocusable onPress={handleTVLoginStart} style={styles.authItemWrapper}>
                            <View style={[styles.authItem, { backgroundColor: currentColors.surface }]}>
                                <View style={styles.authItemLeft}>
                                    <View style={[styles.authIconCircle, { backgroundColor: `${currentColors.primary}15` }]}>
                                        <MaterialIcons name="tv" size={20} color={currentColors.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.authItemLabel, { color: currentColors.text }]}>Login in TV</Text>
                                        <Text style={[styles.authItemDesc, { color: currentColors.textSecondary }]}>Scan QR on your TV screen</Text>
                                    </View>
                                </View>
                                <MaterialIcons name="qr-code-scanner" size={20} color={currentColors.textSecondary} />
                            </View>
                        </TVFocusable>
                    )}

                    {user && user.id !== 'guest' ? (
                        <TVFocusable onPress={handleLogout} style={styles.authItemWrapper}>
                            <View style={[styles.authItem, { backgroundColor: currentColors.surface }]}>
                                <View style={styles.authItemLeft}>
                                    <View style={[styles.authIconCircle, { backgroundColor: `${currentColors.error}15` }]}>
                                        <MaterialIcons name="logout" size={20} color={currentColors.error} />
                                    </View>
                                    <Text style={[styles.authItemLabel, { color: currentColors.error }]}>Logout</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={20} color={currentColors.textSecondary} />
                            </View>
                        </TVFocusable>
                    ) : (
                        <TVFocusable onPress={handleLogin} style={styles.authItemWrapper}>
                            <View style={[styles.authItem, { backgroundColor: currentColors.surface }]}>
                                <View style={styles.authItemLeft}>
                                    <View style={[styles.authIconCircle, { backgroundColor: `${currentColors.primary}15` }]}>
                                        <MaterialIcons name="login" size={20} color={currentColors.primary} />
                                    </View>
                                    <Text style={[styles.authItemLabel, { color: currentColors.text }]}>Login or Sign Up</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={20} color={currentColors.textSecondary} />
                            </View>
                        </TVFocusable>
                    )}


                </View>

                <Text style={styles.versionText}>ROGFOX v1.2.0 Beta</Text>
            </ScrollView>

            {/* TV Login Scanner Modal */}
            <Modal
                visible={isScannerVisible}
                animationType="slide"
                onRequestClose={() => setScannerVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={styles.scannerHeader}>
                        <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.scannerBackButton}>
                            <MaterialIcons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.scannerTitle}>Login in TV</Text>
                    </View>

                    <View style={styles.cameraWrapper}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            onBarcodeScanned={onCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ['qr'],
                            }}
                        />
                        <View style={styles.scannerOverlay}>
                            <View style={styles.scannerFrame} />
                            <Text style={styles.scannerHint}>Point at the QR code on your TV</Text>
                        </View>
                    </View>

                    {scanning && (
                        <BlurView intensity={80} tint="dark" style={styles.scanningOverlay}>
                            <ActivityIndicator size="large" color={currentColors.primary} />
                            <Text style={styles.scanningText}>Authorizing TV Session...</Text>
                        </BlurView>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Plans Modal */}
            <PlansModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                currentColors={currentColors}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold' },
    tvHeader: {
        paddingHorizontal: 20,
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        opacity: 0.8,
    },
    content: {
        paddingHorizontal: Platform.isTV ? 50 : 20,
        paddingBottom: 40,
        paddingTop: Platform.isTV ? 40 : 0,
    },
    profileCard: {
        borderRadius: 24,
        padding: 20,
        marginTop: 10,
        ...Layout.shadows.lg,
        width: '100%',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    premiumBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#000',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    userDetails: {
        marginLeft: 16,
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
    },
    userEmail: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    statusRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 16,
        padding: 12,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
    },
    statusDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    statusLabel: {
        fontSize: 10,
        fontFamily: 'Inter_600SemiBold',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusValue: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
        marginTop: 2,
    },
    upgradeButton: {
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
    },
    upgradeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    upgradeText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#000',
    },
    premiumFeaturesContainer: {
        marginTop: 24,
        width: '100%',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 16,
        marginLeft: 4,
    },
    featuresList: {
        gap: 16,
        marginBottom: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
    },
    featureDesc: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    closeModalButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    closeModalText: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
    },
    versionText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#64748b',
        opacity: 0.6,
    },
    authSection: {
        marginTop: 30,
        width: '100%',
    },
    authItemWrapper: {
        borderRadius: 16,
        marginBottom: 10,
    },
    authItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    authItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    authItemLabel: {
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
        marginLeft: 14,
    },
    authItemDesc: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginLeft: 14,
        marginTop: 2,
    },
    scannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#000',
    },
    scannerBackButton: {
        marginRight: 15,
    },
    scannerTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
    },
    cameraWrapper: {
        flex: 1,
        position: 'relative',
    },
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 24,
        backgroundColor: 'transparent',
    },
    scannerHint: {
        color: '#fff',
        marginTop: 30,
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningText: {
        color: '#fff',
        marginTop: 15,
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
});
