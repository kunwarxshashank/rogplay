import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/store/settingsStore';
import { Downloader, DownloadProgress, Quality } from '@/services/downloader';

export default function VideoDownloaderScreen() {
    const { url: passedUrl, title: passedTitle, headers: passedHeaders } = useLocalSearchParams();
    const [url, setUrl] = useState('');
    const [fileName, setFileName] = useState('');

    // Header States
    const [headerKey, setHeaderKey] = useState('');
    const [headerValue, setHeaderValue] = useState('');
    const [headersList, setHeadersList] = useState<{ key: string, value: string }[]>([]);
    const [isJsonHeadersEnabled, setIsJsonHeadersEnabled] = useState(false);
    const [jsonHeaders, setJsonHeaders] = useState('');

    // Download States
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState<DownloadProgress | null>(null);
    const [qualities, setQualities] = useState<Quality[]>([]);
    const [showQualityModal, setShowQualityModal] = useState(false);
    const [qualityResolver, setQualityResolver] = useState<((url: string) => void) | null>(null);

    const router = useRouter();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    const addHeader = () => {
        if (!headerKey.trim() || !headerValue.trim()) return;
        setHeadersList([...headersList, { key: headerKey.trim(), value: headerValue.trim() }]);
        setHeaderKey('');
        setHeaderValue('');
    };

    const removeHeader = (index: number) => {
        setHeadersList(headersList.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (passedUrl) {
            const decodedUrl = decodeURIComponent(passedUrl as string);
            const decodedTitle = passedTitle ? decodeURIComponent(passedTitle as string) : '';
            setUrl(decodedUrl);
            setFileName(decodedTitle);

            let headersObj: any = {};
            if (passedHeaders) {
                try {
                    const parsed = JSON.parse(passedHeaders as string);
                    setHeadersList(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
                    headersObj = parsed;
                } catch (e) {
                    console.error("Error parsing passed headers", e);
                }
            }

            startDownloadInternal(decodedUrl, decodedTitle, headersObj);
        }
    }, [passedUrl]);

    const startDownloadInternal = async (targetUrl: string, targetName: string, headersObj: any) => {
        if (!targetUrl) {
            Alert.alert('Error', 'Please enter a video URL');
            return;
        }

        const name = targetName.trim() || `video_${Date.now()}${(targetUrl.includes('.m3u8') ? '.m3u8' : '.mp4')}`;

        setIsDownloading(true);
        setProgress(null);

        try {
            if (targetUrl.includes('.m3u8')) {
                await Downloader.downloadHls(
                    targetUrl,
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
                    targetUrl,
                    name,
                    headersObj,
                    (p) => setProgress(p)
                );
            }
            Alert.alert('Success', 'Download completed successfully. Check your Downloads tab.');
            router.push('/downloads');
        } catch (error: any) {
            if (error.message !== 'Download cancelled') {
                Alert.alert('Download Failed', error.message || 'An unknown error occurred');
            }
        } finally {
            setIsDownloading(false);
            setProgress(null);
        }
    };

    const handleDownload = async () => {
        let headersObj: any = {};
        headersList.forEach(h => {
            headersObj[h.key] = h.value;
        });

        if (isJsonHeadersEnabled && jsonHeaders.trim()) {
            try {
                // Sanitize common mobile keyboard issues and standard JSON pitfalls
                const sanitized = jsonHeaders
                    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Smart double quotes
                    .replace(/[\u2018\u2019\u201A\u201B']/g, '"') // Smart/Standard single quotes -> double quotes
                    .replace(/[\x00-\x1F\x7F-\x9F]/g, '');       // Strip unescaped control characters

                const parsed = JSON.parse(sanitized);
                headersObj = { ...headersObj, ...parsed };
            } catch (e: any) {
                Alert.alert('Invalid Headers', `JSON Error: ${e.message}. \n\nPlease use double quotes (") for both keys and values (e.g. {"Key": "Value"}).`);
                return;
            }
        }

        await startDownloadInternal(url, fileName, headersObj);
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
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: currentColors.text }]}>Downloader</Text>
                    <View style={[styles.titleDot, { backgroundColor: currentColors.primary }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: currentColors.textSecondary }]}>Video URL</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: currentColors.card, color: currentColors.text, borderColor: currentColors.border }]}
                        placeholder="https://example.com/video.mp4 or .m3u8"
                        placeholderTextColor={currentColors.textSecondary}
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: currentColors.textSecondary }]}>Filename (Optional)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: currentColors.card, color: currentColors.text, borderColor: currentColors.border }]}
                        placeholder="movie_name (without extension)"
                        placeholderTextColor={currentColors.textSecondary}
                        value={fileName}
                        onChangeText={setFileName}
                    />
                </View>

                {/* Headers Section */}
                <View style={[styles.section, { borderColor: currentColors.border }]}>
                    <Text style={[styles.sectionTitle, { color: currentColors.text, marginBottom: 12 }]}>Custom Headers</Text>

                    <View style={styles.headerInputRow}>
                        <TextInput
                            style={[styles.smallInput, { flex: 1, backgroundColor: currentColors.card, color: currentColors.text, borderColor: currentColors.border }]}
                            placeholder="Key"
                            placeholderTextColor={currentColors.textSecondary}
                            value={headerKey}
                            onChangeText={setHeaderKey}
                        />
                        <TextInput
                            style={[styles.smallInput, { flex: 1.5, backgroundColor: currentColors.card, color: currentColors.text, borderColor: currentColors.border }]}
                            placeholder="Value"
                            placeholderTextColor={currentColors.textSecondary}
                            value={headerValue}
                            onChangeText={setHeaderValue}
                        />
                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: currentColors.primary }]} onPress={addHeader}>
                            <MaterialIcons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {headersList.map((header, index) => (
                        <View key={index} style={[styles.headerTag, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                            <View style={styles.tagInfo}>
                                <Text style={[styles.tagKey, { color: currentColors.primary }]}>{header.key}:</Text>
                                <Text style={[styles.tagValue, { color: currentColors.text }]} numberOfLines={1}>{header.value}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeHeader(index)}>
                                <MaterialIcons name="close" size={18} color={currentColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text, fontSize: 16 }]}>Use JSON Headers</Text>
                        <Switch
                            value={isJsonHeadersEnabled}
                            onValueChange={setIsJsonHeadersEnabled}
                            trackColor={{ false: '#767577', true: currentColors.primary }}
                        />
                    </View>

                    {isJsonHeadersEnabled && (
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top', backgroundColor: currentColors.card, color: currentColors.text, borderColor: currentColors.border, marginTop: 8 }]}
                            placeholder='{"Referer": "...", "Origin": "..."}'
                            placeholderTextColor={currentColors.textSecondary}
                            multiline
                            value={jsonHeaders}
                            onChangeText={setJsonHeaders}
                        />
                    )}
                </View>

                {isDownloading ? (
                    <View style={[styles.progressCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                        <ActivityIndicator size="large" color={currentColors.primary} />
                        <Text style={[styles.progressTitle, { color: currentColors.text }]}>Downloading...</Text>

                        {progress && (
                            <>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { backgroundColor: currentColors.primary, width: `${progress.progress * 100}%` }]} />
                                </View>
                                <View style={styles.progressStats}>
                                    <Text style={[styles.statsText, { color: currentColors.textSecondary }]}>{progress.downloadedSize}</Text>
                                    <View style={[styles.dot, { backgroundColor: currentColors.border }]} />
                                    <Text style={[styles.statsText, { color: currentColors.textSecondary }]}>{Math.round(progress.progress * 100)}%</Text>
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[styles.cancelBtn, { borderColor: currentColors.border }]} onPress={handleCancel}>
                            <Text style={{ color: '#ef4444', fontWeight: '700' }}>Cancel Download</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity onPress={handleDownload} style={styles.downloadBtn}>
                        <LinearGradient
                            colors={[currentColors.primary, currentColors.accent || '#818cf8']}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialIcons name="file-download" size={28} color="#fff" />
                            <Text style={styles.btnText}>Start Download</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <Modal visible={showQualityModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.card }]}>
                        <Text style={[styles.modalTitle, { color: currentColors.text }]}>Select Quality</Text>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {qualities.map((q, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.qualityItem, { borderBottomColor: currentColors.border }]}
                                    onPress={() => selectQuality(q.url)}
                                >
                                    <View>
                                        <Text style={[styles.qualityRes, { color: currentColors.text }]}>{q.resolution}</Text>
                                        <Text style={[styles.qualityInfo, { color: currentColors.textSecondary }]}>
                                            Bandwidth: {(q.bandwidth / 1000000).toFixed(2)} Mbps
                                        </Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color={currentColors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.modalClose, { backgroundColor: currentColors.primary }]}
                            onPress={() => setShowQualityModal(false)}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#060912',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    titleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
        opacity: 0.6,
    },
    input: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
        backgroundColor: '#0f1424',
    },
    section: {
        marginTop: 10,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 24,
        backgroundColor: '#0f1424',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
    },
    headerInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    smallInput: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        backgroundColor: '#1a1f35',
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTag: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        backgroundColor: '#1a1f35',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tagInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagKey: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
    },
    tagValue: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        flex: 1,
    },
    downloadBtn: {
        marginTop: 10,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    btnText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 10,
    },
    progressCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        backgroundColor: '#0f1424',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    progressTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        marginTop: 16,
        marginBottom: 20,
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    statsText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 10,
    },
    cancelBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 20,
    },
    qualityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    qualityRes: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 4,
    },
    qualityInfo: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
    },
    modalClose: {
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    }
});

