import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialIcons } from '@expo/vector-icons';
import { Downloader, DownloadProgress, Quality } from '@/services/downloader';
import { LinearGradient } from 'expo-linear-gradient';

export default function TVVideoDownloaderScreen() {
    const { url: passedUrl, title: passedTitle, headers: passedHeaders } = useLocalSearchParams();
    const [url, setUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [isFocused, setIsFocused] = useState('');

    // Download States
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState<DownloadProgress | null>(null);
    const [qualities, setQualities] = useState<Quality[]>([]);
    const [showQualityModal, setShowQualityModal] = useState(false);
    const [qualityResolver, setQualityResolver] = useState<((url: string) => void) | null>(null);

    const router = useRouter();
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;

    useEffect(() => {
        if (passedUrl) {
            const decodedUrl = decodeURIComponent(passedUrl as string);
            const decodedTitle = passedTitle ? decodeURIComponent(passedTitle as string) : '';
            setUrl(decodedUrl);
            setFileName(decodedTitle);

            // Auto start if passed? Maybe better to let user confirm on TV
            // let headersObj = {};
            // if (passedHeaders) { ... }
        }
    }, [passedUrl]);

    const startDownload = async () => {
        if (!url) {
            Alert.alert('Error', 'Please enter a video URL');
            return;
        }

        let headersObj: any = {};
        if (passedHeaders) {
            try {
                headersObj = JSON.parse(passedHeaders as string);
            } catch (e) { }
        }

        const name = fileName.trim() || `video_${Date.now()}${(url.includes('.m3u8') ? '.m3u8' : '.mp4')}`;

        setIsDownloading(true);
        setProgress(null);

        try {
            if (url.includes('.m3u8')) {
                await Downloader.downloadHls(
                    url,
                    name,
                    headersObj,
                    (p) => setProgress(p),
                    (qs) => {
                        return new Promise((resolve) => {
                            setQualities(qs);
                            setQualityResolver(() => resolve);
                            setShowQualityModal(true);
                        });
                    }
                );
            } else {
                await Downloader.downloadMp4(
                    url,
                    name,
                    headersObj,
                    (p) => setProgress(p)
                );
            }
            Alert.alert('Success', 'Download completed successfully.');
            // Maybe redirect to downloads list?
        } catch (error: any) {
            if (error.message !== 'Download cancelled') {
                Alert.alert('Download Failed', error.message || 'An unknown error occurred');
            }
        } finally {
            setIsDownloading(false);
            setProgress(null);
        }
    };

    const handleCancel = () => {
        Downloader.cancel();
        setIsDownloading(false);
    };

    const selectQuality = (url: string) => {
        if (qualityResolver) {
            qualityResolver(url);
            setShowQualityModal(false);
            setQualities([]);
            setQualityResolver(null);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: activeColors.text }]}>Video Downloader</Text>

                <View style={styles.form}>
                    <TVFocusable
                        style={[
                            styles.inputContainer,
                            {
                                backgroundColor: activeColors.card,
                                borderColor: isFocused === 'url' ? activeColors.primary : activeColors.border,
                                borderWidth: isFocused === 'url' ? 2 : 1
                            }
                        ]}
                        onPress={() => { }}
                    >
                        <TextInput
                            style={[styles.input, { color: activeColors.text }]}
                            placeholder="Video URL"
                            placeholderTextColor={activeColors.textSecondary}
                            value={url}
                            onChangeText={setUrl}
                            onFocus={() => setIsFocused('url')}
                            onBlur={() => setIsFocused('')}
                            autoCapitalize="none"
                        />
                    </TVFocusable>

                    <TVFocusable
                        style={[
                            styles.inputContainer,
                            {
                                backgroundColor: activeColors.card,
                                borderColor: isFocused === 'name' ? activeColors.primary : activeColors.border,
                                borderWidth: isFocused === 'name' ? 2 : 1
                            }
                        ]}
                        onPress={() => { }}
                    >
                        <TextInput
                            style={[styles.input, { color: activeColors.text }]}
                            placeholder="Filename (Optional)"
                            placeholderTextColor={activeColors.textSecondary}
                            value={fileName}
                            onChangeText={setFileName}
                            onFocus={() => setIsFocused('name')}
                            onBlur={() => setIsFocused('')}
                        />
                    </TVFocusable>

                    {isDownloading ? (
                        <View style={[styles.progressCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                            <ActivityIndicator size="large" color={activeColors.primary} />
                            <Text style={[styles.progressText, { color: activeColors.text }]}>Downloading... {progress ? `${Math.round(progress.progress * 100)}%` : ''}</Text>
                            {progress && (
                                <Text style={{ color: activeColors.textSecondary }}>{progress.downloadedSize}</Text>
                            )}
                            <TVFocusable style={[styles.cancelBtn, { borderColor: 'red', marginTop: 20 }]} onPress={handleCancel}>
                                <Text style={{ color: 'red', fontWeight: 'bold' }}>Cancel</Text>
                            </TVFocusable>
                        </View>
                    ) : (
                        <TVFocusable
                            style={[styles.downloadBtn, { backgroundColor: activeColors.primary }]}
                            onPress={startDownload}
                        >
                            <MaterialIcons name="file-download" size={32} color="white" />
                            <Text style={styles.btnText}>Start Download</Text>                        </TVFocusable>
                    )}
                </View>
            </View>

            <Modal visible={showQualityModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                        <Text style={[styles.modalTitle, { color: activeColors.text }]}>Select Quality</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {qualities.map((q, idx) => (
                                <TVFocusable
                                    key={idx}
                                    style={[styles.qualityItem, { borderColor: activeColors.border }]}
                                    onPress={() => selectQuality(q.url)}
                                    hasTVPreferredFocus={idx === 0}
                                    nativeID={`tv-quality-${idx}`}
                                >
                                    <Text style={[styles.qualityText, { color: activeColors.text }]}>{q.resolution}</Text>
                                    <Text style={{ color: activeColors.textSecondary }}>{(q.bandwidth / 1000000).toFixed(2)} Mbps</Text>
                                </TVFocusable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingTop: 80,
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 50,
    },
    form: {
        width: '100%',
        maxWidth: 600,
        gap: 24,
    },
    inputContainer: {
        height: 70,
        borderRadius: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    input: {
        fontSize: 20,
        width: '100%',
        height: '100%',
    },
    downloadBtn: {
        height: 70,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 20,
    },
    btnText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    progressCard: {
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    progressText: {
        fontSize: 20,
        marginTop: 20,
        marginBottom: 10,
    },
    cancelBtn: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        borderWidth: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: 500,
        padding: 30,
        borderRadius: 16,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    qualityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    qualityText: {
        fontSize: 18,
        fontWeight: 'bold',
    }
});
