import { documentDirectory, cacheDirectory, EncodingType, getInfoAsync, makeDirectoryAsync, createDownloadResumable, writeAsStringAsync, readAsStringAsync, deleteAsync } from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import axios from 'axios';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

const INTERNAL_DIR = `${documentDirectory}downloads/`;

export interface DownloadProgress {
    progress: number;
    downloadedSize: string;
    totalSize: string;
    speed: string;
}

export interface Quality {
    bandwidth: number;
    resolution: string;
    codecs: string;
    url: string;
}


export class Downloader {
    private static cancelled = false;
    private static activeDir: string | null = null;

    static async getDir() {
        if (this.activeDir) return this.activeDir;

        this.activeDir = INTERNAL_DIR;

        // Ensure the chosen directory exists
        const info = await getInfoAsync(this.activeDir);
        if (!info.exists) {
            await makeDirectoryAsync(this.activeDir, { intermediates: true });
        }
        return this.activeDir;
    }

    static async ensureDirExists() {
        await this.getDir();
    }

    private static async saveToGallery(fileUri: string) {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Media Library permissions not granted');
                return;
            }

            const asset = await MediaLibrary.createAssetAsync(fileUri);
            if (Platform.OS === 'android') {
                // Using the specific folder path requested by the user
                await MediaLibrary.createAlbumAsync('Download/Rogplay', asset, false);
            } else {
                const album = await MediaLibrary.getAlbumAsync('Rogplay');
                if (album) {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                } else {
                    await MediaLibrary.createAlbumAsync('Rogplay', asset);
                }
            }
        } catch (e) {
            console.error('Error saving to gallery:', e);
        }
    }

    static async downloadMp4(
        url: string,
        fileName: string,
        headers: any = {},
        onProgress?: (progress: DownloadProgress) => void
    ) {
        this.cancelled = false;
        const dir = await this.getDir();
        const fileUri = dir + fileName;

        const downloadResumable = createDownloadResumable(
            url,
            fileUri,
            { headers },
            (data) => {
                if (onProgress) {
                    const progress = data.totalBytesWritten / data.totalBytesExpectedToWrite;
                    onProgress({
                        progress,
                        downloadedSize: this.formatSize(data.totalBytesWritten),
                        totalSize: this.formatSize(data.totalBytesExpectedToWrite),
                        speed: 'N/A'
                    });
                }
            }
        );

        const result = await downloadResumable.downloadAsync();
        if (result?.uri) {
            await this.saveToGallery(result.uri);
        }
        return result?.uri;
    }

    static async downloadHls(
        url: string,
        fileName: string,
        headers: any = {},
        onProgress: (progress: DownloadProgress) => void,
        onQualityRequired: (qualities: Quality[]) => Promise<string>,
        options: { qualityUrl?: string } = {}
    ): Promise<string | null> {
        this.cancelled = false;
        const dir = await this.getDir();
        const outputPath = dir + fileName.replace('.m3u8', '') + '.ts';

        try {
            let playlistUrl = options.qualityUrl || url;
            let m3u8Data: any;
            try {
                m3u8Data = await this.parseM3U8Playlist(playlistUrl, headers);
            } catch (e) {
                console.error("Failed to parse playlist:", e);
                throw new Error("Failed to parse M3U8 playlist");
            }

            if (m3u8Data.isMaster) {
                const selectedUrl = await onQualityRequired(m3u8Data.qualities || []);
                return this.downloadHls(url, fileName, headers, onProgress, onQualityRequired, { qualityUrl: selectedUrl });
            }

            if (!m3u8Data.segments || m3u8Data.segments.length === 0) {
                throw new Error('No segments found');
            }

            const tempDir = `${dir}.temp_${Date.now()}/`;
            await makeDirectoryAsync(tempDir, { intermediates: true });

            let downloaded = 0;
            const totalSegments = m3u8Data.segments.length;
            const MAX_CONCURRENT = 10; // Increased to 10 for faster downloads

            // Split segments into chunks for concurrent processing
            for (let i = 0; i < totalSegments; i += MAX_CONCURRENT) {
                if (this.cancelled) break;

                const batch = m3u8Data.segments.slice(i, i + MAX_CONCURRENT);
                await Promise.all(batch.map(async (segment: any) => {
                    if (this.cancelled) return;

                    const segmentPath = `${tempDir}segment_${segment.index}.ts`;
                    let success = false;
                    let lastError = null;

                    for (let attempt = 0; attempt < 3; attempt++) {
                        if (this.cancelled) return;
                        try {
                            const response = await axios.get(segment.url, {
                                headers,
                                responseType: 'arraybuffer',
                                timeout: 30000,
                            });
                            const segFile = new File(segmentPath);
                            segFile.create({ overwrite: true });
                            segFile.write(new Uint8Array(response.data));

                            downloaded++;
                            if (onProgress) {
                                onProgress({
                                    progress: downloaded / totalSegments,
                                    downloadedSize: `${downloaded} / ${totalSegments} segments`,
                                    totalSize: `${totalSegments} segments`,
                                    speed: 'N/A'
                                });
                            }
                            success = true;
                            break; // success, exit retry loop
                        } catch (e) {
                            lastError = e;
                            if (attempt < 2) {
                                await new Promise(res => setTimeout(res, 500));
                            }
                        }
                    }
                    if (!success) {
                        console.error(`Failed to download segment ${segment.index} after 3 attempts`, lastError);
                        // Instead of throwing, we just log to try to get as much of the video as possible, 
                        // or we could throw to abort the download. Throwing is safer to not corrupt the file.
                        throw new Error(`Failed to download segment ${segment.index}`);
                    }
                }));
            }

            if (this.cancelled) {
                await deleteAsync(tempDir, { idempotent: true });
                return null;
            }

            const outputFile = new File(outputPath);
            if (outputFile.exists) {
                outputFile.delete();
            }
            outputFile.create();
            const handle = outputFile.open();

            try {
                for (let i = 0; i < totalSegments; i++) {
                    if (this.cancelled) break;

                    const segmentPath = `${tempDir}segment_${i}.ts`;
                    const segmentFile = new File(segmentPath);

                    if (segmentFile.exists) {
                        try {
                            const bytes = await segmentFile.bytes();
                            handle.offset = handle.size;
                            handle.writeBytes(bytes);
                        } catch (e) {
                            console.error(`Error merging segment ${i}`, e);
                        }
                        segmentFile.delete();
                    }
                }
            } finally {
                handle.close();
            }

            await deleteAsync(tempDir, { idempotent: true });

            // Only save if not cancelled
            if (!this.cancelled) {
                await this.saveToGallery(outputPath);
            }
            return outputPath;

        } catch (error) {
            console.error('HLS Download Error:', error);
            throw error;
        }
    }

    private static async parseM3U8Playlist(url: string, headers: any = {}) {
        try {
            const response = await axios.get(url, { headers, timeout: 15000 });
            const content = response.data;
            const lines = content.split('\n').map((l: string) => l.trim());

            // Generate base URLs for relative and absolute paths
            const urlObj = new URL(url);
            const domainUrl = urlObj.origin;
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

            const isMaster = lines.some((l: string) => l.startsWith('#EXT-X-STREAM-INF'));

            if (isMaster) {
                const qualities: Quality[] = [];
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                        const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
                        const resolutionMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/);
                        const codecsMatch = lines[i].match(/CODECS="([^"]+)"/);

                        let playlistUrl = lines[i + 1];
                        while (playlistUrl === "" && i + 2 < lines.length) {
                            i++;
                            playlistUrl = lines[i + 1];
                        }

                        if (playlistUrl && !playlistUrl.startsWith('#')) {
                            if (!playlistUrl.startsWith('http')) {
                                playlistUrl = playlistUrl.startsWith('/') ? domainUrl + playlistUrl : baseUrl + playlistUrl;
                            }
                            qualities.push({
                                bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
                                resolution: resolutionMatch ? resolutionMatch[1] : 'Unknown',
                                codecs: codecsMatch ? codecsMatch[1] : '',
                                url: playlistUrl
                            });
                        }
                    }
                }
                return { isMaster: true, qualities };
            }


            const segments: any[] = [];
            let segmentIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXTINF:')) {
                    let segmentUrl = lines[i + 1];
                    while (segmentUrl && (segmentUrl.startsWith('#') || segmentUrl === "")) {
                        i++;
                        segmentUrl = lines[i + 1];
                    }
                    if (segmentUrl) {
                        if (!segmentUrl.startsWith('http')) {
                            segmentUrl = segmentUrl.startsWith('/') ? domainUrl + segmentUrl : baseUrl + segmentUrl;
                        }
                        segments.push({ index: segmentIndex++, url: segmentUrl });
                    }
                }
            }
            return { isMaster: false, segments };
        } catch (e) {
            console.error("Error inside parseM3U8Playlist", e);
            throw e;
        }
    }

    static cancel() {
        this.cancelled = true;
    }

    private static formatSize(bytes: number) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
