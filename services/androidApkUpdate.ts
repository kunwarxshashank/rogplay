import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
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
        'com.rogplay.app'
    );
}

/**
 * Download the APK internally and launch the Android package installer natively.
 */
export async function downloadApkAndOpenInstaller(
    apkUrl: string,
    onProgress?: (p: ApkDownloadProgress) => void
): Promise<void> {
    if (Platform.OS !== 'android') {
        throw new Error('APK updates are only supported on Android.');
    }

    if (!apkUrl || typeof apkUrl !== 'string') {
        throw new Error('Invalid APK URL provided');
    }

    try {
        new URL(apkUrl);
    } catch {
        throw new Error('Invalid APK URL format');
    }

    console.log('[APK] Starting in-app download for:', apkUrl);
    const destinationUri = `${FileSystem.documentDirectory}update.apk`;

    // 1. Resolve redirect manually (GitHub releases redirect to S3, which can break Expo downloader)
    let finalUrl = apkUrl;
    try {
        const headRes = await fetch(apkUrl, { method: 'HEAD' });
        if (headRes.url && headRes.url !== apkUrl) {
            finalUrl = headRes.url;
            console.log('[APK] Resolved redirect URL:', finalUrl);
        }
    } catch (e) {
        console.warn('[APK] Failed to resolve redirect, using original URL:', e);
    }

    // 2. Retry loop for transient SSL/Network errors
    let result: FileSystem.FileSystemDownloadResult | undefined;
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
        try {
            // Clean up any existing file
            const fileInfo = await FileSystem.getInfoAsync(destinationUri);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(destinationUri);
            }

            const downloadResumable = FileSystem.createDownloadResumable(
                finalUrl,
                destinationUri,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                        'Accept': 'application/vnd.android.package-archive, application/octet-stream, */*',
                    }
                },
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesExpectedToWrite > 0
                        ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                        : 0;
                    
                    onProgress?.({
                        progress,
                        bytesWritten: downloadProgress.totalBytesWritten,
                        totalBytes: downloadProgress.totalBytesExpectedToWrite,
                    });
                }
            );

            result = await downloadResumable.downloadAsync();
            
            if (result && result.uri && result.status >= 200 && result.status < 400) {
                break; // Success!
            } else {
                throw new Error(`Download failed with status ${result?.status}`);
            }
        } catch (error) {
            lastError = error;
            console.warn(`[APK] Download failed, retries left: ${retries - 1}. Error:`, error);
            retries--;
            if (retries === 0) break;
            // Wait 1.5s before retry
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    if (!result || !result.uri || result.status >= 400) {
        throw lastError || new Error('Download failed to produce a valid file URI.');
    }

    console.log('[APK] Download completed. Generating content URI for:', result.uri);
    
    // Generate content:// URI required by Android 7+ (FileProvider)
    let contentUri: string;
    try {
        contentUri = await FileSystem.getContentUriAsync(result.uri);
    } catch (e) {
        console.error('[APK] Failed to generate content URI:', e);
        throw new Error('Failed to access downloaded APK for installation.');
    }

    console.log('[APK] Launching package installer for:', contentUri);

    try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
        });
    } catch (e) {
        console.error('[APK] Failed to launch installer intent:', e);
        throw new Error('Could not open the installer. Please enable Install Unknown Apps.');
    }
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
