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
} from 'react-native';
import * as Updates from 'expo-updates';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import appConfigJson from '../app.json';
import { downloadApkAndOpenInstaller, openInstallUnknownAppsSettings } from '@/services/androidApkUpdate';
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
    const [isDownloadingApk, setIsDownloadingApk] = useState(false);
    const [apkDownloadProgress, setApkDownloadProgress] = useState(0);
    const [apkDownloadedBytes, setApkDownloadedBytes] = useState(0);
    const [apkDownloadTotalBytes, setApkDownloadTotalBytes] = useState<number | null>(null);

    useEffect(() => {
        const checkForUpdate = async () => {
            try {
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
            const backAction = () => true;
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }
    }, [visible]);

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

        if (Platform.OS === 'android' && config?.apklink) {
            try {
                setIsDownloadingApk(true);
                setApkDownloadProgress(0);
                setApkDownloadedBytes(0);
                setApkDownloadTotalBytes(null);

                // Add timeout for the download process
                const downloadPromise = downloadApkAndOpenInstaller(config.apklink, (p) => {
                    const totalBytes = p.totalBytes > 0 ? p.totalBytes : null;
                    const progress = totalBytes ? p.bytesWritten / totalBytes : 0;
                    setApkDownloadProgress(progress);
                    setApkDownloadedBytes(p.bytesWritten);
                    setApkDownloadTotalBytes(totalBytes);
                });

                // Set a reasonable timeout for the entire process
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Download timed out after 5 minutes')), 5 * 60 * 1000);
                });

                await Promise.race([downloadPromise, timeoutPromise]);

                // If we get here, the download and install intent were successful
                console.log('[AppUpdate] APK download and install intent completed successfully');

            } catch (error) {
                console.error('[AppUpdate] APK download/install failed:', error);
                const message = error instanceof Error ? error.message : 'Could not download or open the installer.';
                Alert.alert('Update failed', message, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Allow installs',
                        onPress: () => {
                            openInstallUnknownAppsSettings().catch(() => Linking.openSettings());
                        },
                    },
                    {
                        text: 'Try again',
                        onPress: () => {
                            // Retry the download
                            handleUpdate();
                        },
                    },
                    {
                        text: 'Manual install',
                        onPress: () => {
                            Alert.alert(
                                'Manual Installation (Android 7.0+)',
                                'Due to Android security restrictions, automatic installation may not work. To install manually:\n\n1. Open your file manager app\n2. Navigate to Android/data/com.rogplay.app/files\n3. Find the RogPlay APK file\n4. Tap to install\n\nMake sure "Install unknown apps" is enabled for your file manager in Settings > Apps > [File Manager] > Install unknown apps.',
                                [{ text: 'OK' }]
                            );
                        },
                    },
                ]);
            } finally {
                setIsDownloadingApk(false);
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

    const apkBusy = isDownloadingApk;
    const primaryDisabled = isUpdatingOta || apkBusy;

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const downloadPercent = apkDownloadTotalBytes ? Math.min(100, Math.round(apkDownloadProgress * 100)) : null;

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
                    <Image
                        source={require('../assets/images/appupdate.png')}
                        style={styles.illustration}
                        resizeMode="contain"
                    />

                    <View style={styles.content}>
                        <Text style={[styles.title, { color: currentColors.text }]}>Update Required</Text>
                        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
                            {isOtaAvailable
                                ? 'A minor update is available. Please apply it to continue using the app.'
                                : `A new version of ${config?.appname} is available. Please update to continue using the app.`}
                        </Text>

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

                        {apkBusy && (
                            <View style={styles.progressBlock}>
                                <Text style={[styles.progressLabel, { color: currentColors.textSecondary }]}>
                                    Downloading update…
                                </Text>
                                {downloadPercent !== null ? (
                                    <>
                                        <View style={[styles.progressTrack, { borderColor: currentColors.border }]}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${downloadPercent}%`,
                                                        backgroundColor: currentColors.primary,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.progressPct, { color: currentColors.text }]}>
                                            {downloadPercent}%
                                        </Text>
                                    </>
                                ) : (
                                    <View style={styles.progressPending}>
                                        <ActivityIndicator size="small" color={currentColors.primary} />
                                        <Text style={[styles.progressPendingText, { color: currentColors.text }]}>
                                            {apkDownloadedBytes > 0
                                                ? `${formatBytes(apkDownloadedBytes)} downloaded`
                                                : 'Connecting...'}
                                        </Text>
                                    </View>
                                )}
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
                                        {isUpdatingOta || apkBusy ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.buttonText}>
                                                {isOtaAvailable ? 'Apply Update' : 'Update Now'}
                                            </Text>
                                        )}
                                    </LinearGradient>
                                )}
                            </TVFocusable>

                            {!isOtaAvailable && config?.telegram && !apkBusy && (
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
});
