import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';

export type ApkDownloadProgress = {
    /** 0..1 */
    progress: number;
    bytesWritten: number;
    totalBytes: number;
};

function getAndroidPackage(): string {
    return (
        Constants.expoConfig?.android?.package ??
        (Constants as unknown as { manifest?: { android?: { package?: string } } }).manifest?.android
            ?.package ??
        'com.rogplay.org'
    );
}

/**
 * Open the download link via external browser so Android can download it natively.
 */
export async function downloadApkAndOpenInstaller(
    apkUrl: string,
    onProgress?: (p: ApkDownloadProgress) => void
): Promise<void> {
    if (!apkUrl || typeof apkUrl !== 'string') {
        throw new Error('Invalid APK URL provided');
    }

    try {
        new URL(apkUrl);
    } catch {
        throw new Error('Invalid APK URL format');
    }

    // Immediately pass progress to 1 to signify completion if there's any UI waiting on it
    onProgress?.({
        progress: 1,
        bytesWritten: 100,
        totalBytes: 100,
    });

    console.log('[APK] Redirecting to download link:', apkUrl);
    await Linking.openURL(apkUrl);
}

export async function openInstallUnknownAppsSettings(): Promise<void> {
    const pkg = getAndroidPackage();
    try {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
            data: `package:${pkg}`,
        });
    } catch (error) {
        console.warn('[APK] Could not open unknown apps settings, trying general settings:', error);
        try {
            await Linking.openSettings();
        } catch (settingsError) {
            console.error('[APK] Could not open settings:', settingsError);
            throw new Error('Please manually enable "Install unknown apps" in your device settings.');
        }
    }
}
