import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Dimensions,
    Image,
    Linking,
    Platform,
    BackHandler
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';
import appConfigJson from '../app.json';

const { width, height } = Dimensions.get('window');

interface UpdateConfig {
    appname: string;
    version: string;
    apklink: string;
    telegram?: string;
    versionname?: string;
}

export function AppUpdateModal() {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<UpdateConfig | null>(null);
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    useEffect(() => {
        const checkForUpdate = async () => {
            try {
                // EXPO_PUBLIC_APP_CONFIG or APP_CONFIG from .env
                // process.env.APP_CONFIG might not be available directly in newer Expo version
                // but let's check what's used in the project.
                // Looking at .env: APP_CONFIG=https://raw.githubusercontent.com/rogplay/public/refs/heads/main/config.json
                const configUrl = process.env.EXPO_PUBLIC_APP_CONFIG || 'https://raw.githubusercontent.com/rogplay/public/refs/heads/main/config.json';

                const response = await fetch(configUrl);
                const data: UpdateConfig = await response.json();

                const currentVersion = appConfigJson.expo.version;

                if (data.version && data.version !== currentVersion) {
                    setConfig(data);
                    setVisible(true);
                }
            } catch (error) {
                console.error('[AppUpdate] Check failed:', error);
            }
        };

        checkForUpdate();
    }, []);

    // Prevent closing via back button on Android/TV
    useEffect(() => {
        if (visible) {
            const backAction = () => true; // Disable back button
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }
    }, [visible]);

    const handleUpdate = () => {
        if (config?.apklink) {
            Linking.openURL(config.apklink);
        }
    };

    const handleTelegram = () => {
        if (config?.telegram) {
            Linking.openURL(config.telegram);
        }
    };

    if (!visible || !config) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {Platform.OS !== 'web' && (
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                )}

                <LinearGradient
                    colors={currentColors.gradients.surface || ['#1e293b', '#0f172a']}
                    style={[
                        styles.container,
                        Platform.isTV && styles.tvContainer
                    ]}
                >
                    <Image
                        source={require('../assets/images/appupdate.png')}
                        style={styles.illustration}
                        resizeMode="contain"
                    />

                    <View style={styles.content}>
                        <Text style={[styles.title, { color: currentColors.text }]}>
                            Update Required
                        </Text>
                        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                            A new version of {config.appname} is available. Please update to continue using the app.
                        </Text>

                        <View style={styles.versionBadge}>
                            <Text style={styles.versionLabel}>
                                Current: {appConfigJson.expo.version}
                            </Text>
                            <View style={[styles.arrow, { backgroundColor: currentColors.primary + '40' }]}>
                                <Text style={[styles.arrowText, { color: currentColors.primary }]}>→</Text>
                            </View>
                            <Text style={[styles.versionValue, { color: currentColors.primary }]}>
                                New: {config.version} {config.versionname ? `(${config.versionname})` : ''}
                            </Text>
                        </View>

                        <View style={styles.buttonStack}>
                            <TVFocusable
                                onPress={handleUpdate}
                                hasTVPreferredFocus
                                style={styles.buttonWrapper}
                            >
                                {({ focused }) => (
                                    <LinearGradient
                                        colors={focused ? currentColors.gradients.primary : [currentColors.primary, currentColors.primary]}
                                        style={styles.primaryButton}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.buttonText}>Update Now</Text>
                                    </LinearGradient>
                                )}
                            </TVFocusable>

                            {config.telegram && (
                                <TVFocusable
                                    onPress={handleTelegram}
                                    style={styles.buttonWrapper}
                                >
                                    {({ focused }) => (
                                        <View style={[
                                            styles.secondaryButton,
                                            { borderColor: focused ? currentColors.primary : currentColors.border },
                                            focused && { backgroundColor: currentColors.primary + '10' }
                                        ]}>
                                            <Text style={[
                                                styles.secondaryButtonText,
                                                { color: focused ? currentColors.primary : currentColors.textSecondary }
                                            ]}>
                                                Join Community
                                            </Text>
                                        </View>
                                    )}
                                </TVFocusable>
                            )}
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: Math.min(width * 0.9, 450),
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    tvContainer: {
        width: Math.min(width * 0.5, 600),
        padding: 48,
    },
    illustration: {
        width: 180,
        height: 180,
        marginBottom: 24,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_400Regular',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    versionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: Layout.borderRadius.full,
        marginBottom: 32,
    },
    versionLabel: {
        fontSize: 14,
        color: '#94a3b8',
        fontFamily: 'Inter_600SemiBold',
    },
    arrow: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    arrowText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    versionValue: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
    },
    buttonStack: {
        width: '100%',
        gap: 12,
    },
    buttonWrapper: {
        width: '100%',
        height: 56,
        borderRadius: 16,
    },
    primaryButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
    },
    secondaryButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
    },
});
