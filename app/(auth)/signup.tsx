import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Layout } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { useAddonsStore } from '@/store/addonsStore';
import { handleAuthSuccess, signInWithGoogle, normalizeUser } from '@/services/authService';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');
const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

export default function SignupScreen() {
    const { colors: currentColors } = useTheme();
    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${DB_BASEURL}/create`, {
                name,
                email,
                password,
                ispremium: false,
                validity: 0,
            });

            if (response.status === 200 || response.status === 201) {
                const { token } = response.data;
                const userData = response.data.user || response.data;
                handleAuthSuccess(token, userData);

                router.replace('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
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
              <View style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: currentColors.primary + '15', transform: [{ scale: 2 }] }} />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
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
                        <Text style={[styles.title, { color: currentColors.text }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                            Join the community and start streaming
                        </Text>
                    </View>

                    <View style={[styles.formContainer, currentColors.isAmoled ? { backgroundColor: '#000000' } : { overflow: 'hidden' }]}>
                        {!currentColors.isAmoled && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                        {error && (
                            <View style={[styles.errorContainer, { backgroundColor: currentColors.error + '20' }]}>
                                <Text style={[styles.errorText, { color: currentColors.error }]}>{error}</Text>
                            </View>
                        )}

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Full Name</Text>
                            <View style={[styles.inputContainer, { backgroundColor: currentColors.isAmoled ? '#000' : 'transparent', borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}>
                                {!currentColors.isAmoled && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                                <MaterialCommunityIcons name="account-outline" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: currentColors.text }]}
                                    placeholder="John Doe"
                                    placeholderTextColor={currentColors.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Email</Text>
                            <View style={[styles.inputContainer, { backgroundColor: currentColors.isAmoled ? '#000' : 'transparent', borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}>
                                {!currentColors.isAmoled && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                                <MaterialCommunityIcons name="email-outline" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: currentColors.text }]}
                                    placeholder="your@email.com"
                                    placeholderTextColor={currentColors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Password</Text>
                            <View style={[styles.inputContainer, { backgroundColor: currentColors.isAmoled ? '#000' : 'transparent', borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}>
                                {!currentColors.isAmoled && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                                <MaterialCommunityIcons name="lock-outline" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: currentColors.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={currentColors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <MaterialCommunityIcons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={currentColors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Confirm Password</Text>
                            <View style={[styles.inputContainer, { backgroundColor: currentColors.isAmoled ? '#000' : 'transparent', borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}>
                                {!currentColors.isAmoled && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                                <MaterialCommunityIcons name="lock-check-outline" size={20} color={currentColors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: currentColors.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={currentColors.textMuted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={currentColors.gradients.primary}
                                style={styles.signupButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.signupButtonText}>
                                    {loading ? 'Creating Account...' : 'Sign Up'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={[styles.divider, { backgroundColor: currentColors.border }]} />
                            <Text style={[styles.dividerText, { color: currentColors.textMuted }]}>OR</Text>
                            <View style={[styles.divider, { backgroundColor: currentColors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={[styles.googleButton, { backgroundColor: '#fff' }]}
                            onPress={handleGoogleSignup}
                        >
                            <MaterialCommunityIcons name="google" size={20} color="#000" />
                            <Text style={styles.googleButtonText}>Sign Up with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: currentColors.textSecondary }]}>
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={[styles.loginText, { color: currentColors.primary }]}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: 40,
        paddingBottom: 20,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...Layout.shadows.md,
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 22,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
    },
    formContainer: {
        borderRadius: 20,
        padding: Layout.spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    logoImage: {
        width: 38,
        height: 38,
        borderRadius: 8,
    },
    errorContainer: {
        padding: Layout.spacing.sm,
        borderRadius: Layout.borderRadius.sm,
        marginBottom: Layout.spacing.md,
    },
    errorText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        textAlign: 'center',
    },
    inputWrapper: {
        marginBottom: Layout.spacing.md,
    },
    inputLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        marginBottom: 6,
        marginLeft: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
    },
    signupButton: {
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Layout.spacing.sm,
        marginBottom: Layout.spacing.lg,
    },
    signupButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
        fontSize: 16,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.lg,
    },
    divider: {
        flex: 1,
        height: 1,
        opacity: 0.5,
    },
    dividerText: {
        marginHorizontal: 12,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 11,
    },
    googleButton: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    googleButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#000',
        fontSize: 15,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
    },
    loginText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 13,
    },
});
