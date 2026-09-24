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
    BackHandler,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zustandStorage } from '@/store/mmkv';
import * as Updates from 'expo-updates';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import appConfigJson from '../app.json';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');

interface UpdateConfig {
    appname: string;
    version: string;
    apklink: string;
    telegram?: string;
    versionname?: string;
    /** When set, update is offered if this is greater than the installed app `versionCode` (recommended for APK sideload). */
    androidVersionCode?: number;
    releaseNotes?: string[];
}

function getInstalledAndroidVersionCode(): number {
    const android = appConfigJson.expo?.android as { versionCode?: number } | undefined;
    return typeof android?.versionCode === 'number' ? android.versionCode : 0;
}

function shouldOfferNativeUpdate(data: UpdateConfig): boolean {
    const currentVersion = appConfigJson.expo.version;
    const currentVc = getInstalledAndroidVersionCode();

    if (
        typeof data.androidVersionCode === 'number' &&
        Number.isFinite(data.androidVersionCode) &&
        data.androidVersionCode > currentVc
    ) {
        return true;
    }
    return !!(data.version && data.version !== currentVersion);
}

export function AppUpdateModal() {
    const { colors: currentColors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<UpdateConfig | null>(null);
    const [isOtaAvailable, setIsOtaAvailable] = useState(false);
    const [isUpdatingOta, setIsUpdatingOta] = useState(false);

    useEffect(() => {
        const checkForUpdate = async () => {
            try {
                const ignoredAtStr = await zustandStorage.getItem('lastUpdateIgnoredAt');
                if (ignoredAtStr) {
                    const ignoredAt = parseInt(ignoredAtStr, 10);
                    if (Date.now() - ignoredAt < 3 * 24 * 60 * 60 * 1000) {
                        console.log('[AppUpdate] Snoozed for 3 days, skipping update check.');
                        return;
                    }
                }

                if (!__DEV__) {
                    try {
                        const update = await Updates.checkForUpdateAsync();
                        if (update.isAvailable) {
                            setIsOtaAvailable(true);
                            setVisible(true);
                            return;
                        }
                    } catch (otaError) {
                        console.log('[AppUpdate] OTA check skipped/failed:', otaError);
                    }
                }

                const configUrl =
                    process.env.EXPO_PUBLIC_APP_CONFIG ||
                    'https://raw.githubusercontent.com/rogplay/public/refs/heads/main/config.json';
                const response = await fetch(configUrl);
                const data: UpdateConfig = await response.json();

                if (shouldOfferNativeUpdate(data)) {
                    setConfig(data);
                    setVisible(true);
                }
            } catch (error) {
                console.error('[AppUpdate] Check failed:', error);
            }
        };

        checkForUpdate();
    }, []);

    useEffect(() => {
        if (visible) {
            const backAction = () => {
                // If they press back button, we can either ignore or treat as snooze
                handleClose();
                return true;
            };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }
    }, [visible]);

    const handleClose = () => {
        zustandStorage.setItem('lastUpdateIgnoredAt', Date.now().toString());
        setVisible(false);
    };

    const handleUpdate = async () => {
        if (isOtaAvailable) {
            try {
                setIsUpdatingOta(true);
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
            } catch (error) {
                console.error('[AppUpdate] Failed to install OTA update:', error);
                setIsUpdatingOta(false);
            }
            return;
        }

        if (config?.apklink) {
            Linking.openURL(config.apklink);
        }
    };

    const handleTelegram = () => {
        if (config?.telegram) {
            Linking.openURL(config.telegram);
        }
    };

    if (!visible) return null;
    if (!isOtaAvailable && !config) return null;

    const primaryDisabled = isUpdatingOta;

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={[styles.container, Platform.isTV && styles.tvContainer, currentColors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
                    {Platform.OS !== 'web' && !currentColors.isAmoled && (
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                    )}
                    {!currentColors.isAmoled && (
                        <LinearGradient
                            colors={currentColors.gradients.surface || ['#1e293b', '#0f172a']}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    {!isUpdatingOta && (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="close-circle" size={30} color={currentColors.text} />
                        </TouchableOpacity>
                    )}

                    <Image
                        source={require('../assets/images/appupdate.png')}
                        style={styles.illustration}
                        resizeMode="contain"
                    />

                    <View style={styles.content}>
                        <Text style={[styles.title, { color: currentColors.text }]}>Update Available</Text>
                        {/* <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                            {isOtaAvailable
                                ? 'A minor update is available. Please apply it to continue using the app.'
                                : `A new version of ${config?.appname} is available.`}
                        </Text> */}

                        {!isOtaAvailable && config && (
                            <View style={styles.versionBadge}>
                                <Text style={styles.versionLabel}>Current: {appConfigJson.expo.version}</Text>
                                <View style={[styles.arrow, { backgroundColor: currentColors.primary + '40' }]}>
                                    <Text style={[styles.arrowText, { color: currentColors.primary }]}>→</Text>
                                </View>
                                <Text style={[styles.versionValue, { color: currentColors.primary }]}>
                                    New: {config.version} {config.versionname ? `(${config.versionname})` : ''}
                                </Text>
                            </View>
                        )}

                        {!isOtaAvailable && config?.releaseNotes && config.releaseNotes.length > 0 && (
                            <View style={styles.releaseNotesContainer}>
                                <Text style={[styles.releaseNotesTitle, { color: currentColors.text }]}>What's New</Text>
                                {config.releaseNotes.map((note, index) => (
                                    <View key={index} style={styles.releaseNoteItem}>
                                        <View style={[styles.bullet, { backgroundColor: currentColors.primary }]} />
                                        <Text style={[styles.releaseNoteText, { color: currentColors.textSecondary }]}>{note}</Text>
                                    </View>
                                ))}
                            </View>
                        )}



                        <View style={styles.buttonStack}>
                            <TVFocusable
                                onPress={handleUpdate}
                                hasTVPreferredFocus
                                disabled={primaryDisabled}
                                style={styles.buttonWrapper}
                            >
                                {({ focused }) => (
                                    <LinearGradient
                                        colors={
                                            focused
                                                ? currentColors.gradients.primary
                                                : [currentColors.primary, currentColors.primary]
                                        }
                                        style={styles.primaryButton}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {isUpdatingOta ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.buttonText}>
                                                {isOtaAvailable ? 'Apply Update' : 'Update Now'}
                                            </Text>
                                        )}
                                    </LinearGradient>
                                )}
                            </TVFocusable>

                            {!isOtaAvailable && config?.telegram && (
                                <TVFocusable onPress={handleTelegram} style={styles.buttonWrapper}>
                                    {({ focused }) => (
                                        <View
                                            style={[
                                                styles.secondaryButton,
                                                {
                                                    borderColor: focused ? currentColors.primary : currentColors.border,
                                                },
                                                focused && { backgroundColor: currentColors.primary + '10' },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.secondaryButtonText,
                                                    {
                                                        color: focused
                                                            ? currentColors.primary
                                                            : currentColors.textSecondary,
                                                    },
                                                ]}
                                            >
                                                Join Community
                                            </Text>
                                        </View>
                                    )}
                                </TVFocusable>
                            )}
                        </View>
                    </View>
                </View>
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
    progressBlock: {
        width: '100%',
        marginBottom: 24,
    },
    progressLabel: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        marginBottom: 8,
        textAlign: 'center',
    },
    progressTrack: {
        height: 10,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    progressFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressPct: {
        marginTop: 8,
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        textAlign: 'center',
    },
    progressPending: {
        width: '100%',
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    progressPendingText: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
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
    releaseNotesContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    releaseNotesTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 12,
    },
    releaseNoteItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        marginRight: 10,
    },
    releaseNoteText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        flex: 1,
        lineHeight: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        borderRadius: 20,
    },
});
