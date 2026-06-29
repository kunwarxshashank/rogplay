import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import { useAddonsStore } from '@/store/addonsStore';
import { handleAuthSuccess, signInWithGoogle, signInAsGuest } from '@/services/authService';
import { useTheme } from '@/hooks/useTheme';

const { width, height } = Dimensions.get('window');
const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

export default function TVLoginScreen() {
    const { colors: currentColors } = useTheme();
    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [status, setStatus] = useState<'pending' | 'scanned' | 'completed' | 'expired'>('pending');

    useEffect(() => {
        generateQR();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (sessionId && status !== 'completed' && status !== 'expired') {
            interval = setInterval(checkStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [sessionId, status]);

    const generateQR = async () => {
        try {
            const response = await axios.get(`${DB_BASEURL}/qr/generate`);
            setSessionId(response.data.sessionId);
            setQrValue(JSON.stringify({
                type: 'login_qr',
                sessionId: response.data.sessionId,
            }));
            setStatus('pending');
        } catch (err) {
            console.error('Failed to generate QR', err);
        }
    };

    const checkStatus = async () => {
        if (!sessionId) return;
        try {
            const response = await axios.get(`${DB_BASEURL}/qr/status/${sessionId}`);
            if (response.data.status === 'completed') {
                setStatus('completed');
                const { token } = response.data;
                const userData = response.data.user || response.data;
                handleAuthSuccess(token, userData);

                router.replace('/');
            } else if (response.data.status === 'expired') {
                setStatus('expired');
            } else if (response.data.status === 'scanned') {
                setStatus('scanned');
            }
        } catch (err) {
            console.error('Failed to check status', err);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${DB_BASEURL}/validate`, { email, password });
            if (response.status === 200) {
                const { token } = response.data;
                const userData = response.data.user || response.data;
                handleAuthSuccess(token, userData);

                router.replace('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        const result = await signInWithGoogle();

        if (result.success) {
            router.replace('/');
        } else if (result.error !== 'Sign-In cancelled') {
            setError(result.error || 'Google Sign-In failed');
        }

        setLoading(false);
    };

    const handleGuestLogin = () => {
        setLoading(true);
        try {
            signInAsGuest();
            router.replace('/');
        } catch (err) {
            setError('Failed to login as guest');
            setLoading(false);
        }
    };

    const qrSize = Math.min(240, height * 0.35);

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            {currentColors.isAmoled ? (
                <View style={StyleSheet.absoluteFill} />
            ) : (
                <LinearGradient
                    colors={[currentColors.primary + '30', currentColors.background + 'FA', currentColors.background]}
                    locations={[0, 0.25, 1]}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {!currentColors.isAmoled && (
              <View style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: currentColors.primary + '15', transform: [{ scale: 2 }] }} />
            )}

            <View style={styles.contentWrapper}>
                {/* Header Section */}
                <View style={styles.centerSection}>
                    <View style={styles.header}>
                        <LinearGradient
                            colors={currentColors.gradients.primary}
                            style={styles.logoContainer}
                        >
                            <Image
                                source={require('@/assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </LinearGradient>
                        <Text style={[styles.title, { color: currentColors.text }]}>Login to Rogplay</Text>
                        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                            Scan the QR code or use your Google account
                        </Text>
                    </View>

                    <View style={styles.mainContent}>
                        {/* Left Side: QR Login */}
                        <View style={styles.qrSection}>
                            <View style={[styles.qrWrapper, { padding: 16 }]}>
                                {qrValue ? (
                                    <>
                                        <View style={styles.qrShadow}>
                                            <QRCode
                                                value={qrValue}
                                                size={qrSize}
                                                color="#000"
                                                backgroundColor="#fff"
                                                logo={require('@/assets/icon.png')}
                                                logoSize={qrSize * 0.2}
                                                logoBackgroundColor="transparent"
                                            />
                                        </View>
                                        {status === 'scanned' && (
                                            <View style={[styles.qrOverlay, currentColors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
                                                {!currentColors.isAmoled && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                                                <ActivityIndicator size="large" color={currentColors.primary} />
                                                <Text style={styles.qrOverlayText}>Code Scanned! Confirming...</Text>
                                            </View>
                                        )}
                                        {status === 'expired' && (
                                            <View style={[styles.qrOverlay, currentColors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
                                                {!currentColors.isAmoled && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                                                <MaterialIcons name="refresh" size={50} color="#fff" />
                                                <TouchableOpacity onPress={generateQR}>
                                                    <Text style={styles.qrOverlayText}>Code Expired. Refresh?</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View style={{ width: qrSize, height: qrSize, justifyContent: 'center', alignItems: 'center' }}>
                                        <ActivityIndicator size="large" color={currentColors.primary} />
                                    </View>
                                )}
                            </View>

                            <View style={styles.stepsContainer}>
                                <View style={styles.stepItem}>
                                    <View style={[styles.stepNumber, { backgroundColor: currentColors.primary }]}>
                                        <Text style={styles.stepNumberText}>1</Text>
                                    </View>
                                    <Text style={[styles.stepText, { color: currentColors.text }]}>Open Rogplay on your phone</Text>
                                </View>
                                <View style={styles.stepItem}>
                                    <View style={[styles.stepNumber, { backgroundColor: currentColors.primary }]}>
                                        <Text style={styles.stepNumberText}>2</Text>
                                    </View>
                                    <Text style={[styles.stepText, { color: currentColors.text }]}>Go to Profile {'>'} Login in TV</Text>
                                </View>
                                <View style={styles.stepItem}>
                                    <View style={[styles.stepNumber, { backgroundColor: currentColors.primary }]}>
                                        <Text style={styles.stepNumberText}>3</Text>
                                    </View>
                                    <Text style={[styles.stepText, { color: currentColors.text }]}>Point your camera at this screen</Text>
                                </View>
                            </View>
                        </View>

                        {/* Divider Line */}
                        <View style={[styles.verticalDivider, { backgroundColor: currentColors.border }]} />

                        {/* Right Side: Google Login */}
                        <View style={styles.authSection}>
                            <View style={styles.googleSection}>
                                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Other Options</Text>
                                <Text style={[styles.sectionSubtitle, { color: currentColors.textSecondary }]}>
                                    Sign in using your Google account or continue as Guest
                                </Text>

                                <TouchableOpacity
                                    style={[styles.googleButton, { backgroundColor: 'white', marginBottom: 16 }]}
                                    onPress={handleGoogleLogin}
                                    activeOpacity={0.8}
                                >
                                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.googleIcon} />
                                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.googleButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}
                                    onPress={handleGuestLogin}
                                    activeOpacity={0.8}
                                >
                                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                    <MaterialCommunityIcons name="account-off" size={24} color={currentColors.text} style={{ marginRight: 16, zIndex: 1 }} />
                                    <Text style={[styles.googleButtonText, { color: currentColors.text, zIndex: 1 }]}>Continue as Guest</Text>
                                </TouchableOpacity>

                                {error && (
                                    <View style={styles.errorContainer}>
                                        <MaterialIcons name="error-outline" size={20} color="#ff4444" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 40,
    },
    centerSection: {
        width: '90%',
        maxWidth: 1000,
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30, // Reduced margin
    },
    logoContainer: {
        width: 60, // Scaled down logo
        height: 60,
        borderRadius: 16,
        padding: 10,
        marginBottom: 10,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 32, // Scaled down font
        fontFamily: 'Outfit_700Bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        opacity: 0.7,
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flex: 1, // Let it push and center naturally
    },
    qrSection: {
        flex: 1,
        alignItems: 'center',
        paddingRight: 40,
        justifyContent: 'center', // Center content vertically
    },
    authSection: {
        flex: 1,
        paddingLeft: 40, // Reduced padding
        justifyContent: 'center',
    },
    googleSection: {
        width: '100%',
        maxWidth: 400,
    },
    sectionTitle: {
        fontSize: 24, // Scaled down font
        fontFamily: 'Outfit_700Bold',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        marginBottom: 20,
        lineHeight: 20,
    },
    verticalDivider: {
        width: 1,
        height: '70%',
        opacity: 0.1,
    },
    qrWrapper: {
        backgroundColor: '#fff',
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    qrShadow: {
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
    },
    qrOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrOverlayText: {
        color: '#fff',
        marginTop: 15,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 18,
    },
    stepsContainer: {
        marginTop: 20, // Scaled down spacing
        width: '100%',
        maxWidth: 350,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Scaled down margin
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
    },
    stepText: {
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        flex: 1,
    },
    googleButton: {
        height: 56, // Slightly scaled down height
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    googleIcon: {
        width: 22,
        height: 22,
        marginRight: 12,
    },
    googleButtonText: {
        color: '#000',
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        backgroundColor: 'rgba(255,68,68,0.1)',
        padding: 12,
        borderRadius: 12,
    },
    errorText: {
        color: '#ff4444',
        marginLeft: 12,
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
        flex: 1,
    },
});
