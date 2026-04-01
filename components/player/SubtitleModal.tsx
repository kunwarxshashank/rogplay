
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';

interface Track {
    title?: string;
    language?: string;
    uri?: string;
}

interface SubtitleModalProps {
    visible: boolean;
    textTracks: Track[];
    selectedTextTrack: number;
    subtitleDelay: number; // In milliseconds
    onSelectText: (index: number) => void;
    onImportSubtitle?: () => void;
    onAdjustDelay: (delay: number) => void;
    onApply: () => void;
    onCancel: () => void;
}

const SubtitleModal: React.FC<SubtitleModalProps> = ({
    visible,
    textTracks,
    selectedTextTrack,
    subtitleDelay,
    onSelectText,
    onImportSubtitle,
    onAdjustDelay,
    onApply,
    onCancel
}) => {
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
            setIsLandscape(result.window.width > result.window.height);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        const { width, height } = Dimensions.get('window');
        setIsLandscape(width > height);

        return () => subscription?.remove();
    }, []);

    const { width, height } = screenData;
    const isTV = Platform.isTV;

    const getResponsiveSize = (mobile: number, tablet: number, tv: number) => {
        if (isTV) return tv;
        if (width >= 768) return tablet;
        return mobile;
    };

    const shouldUseHorizontalLayout = () => {
        return isTV || isLandscape;
    };

    const getMaxTrackListHeight = () => {
        const availableHeight = height * (shouldUseHorizontalLayout() ? 0.7 : 0.4);
        return Math.max(availableHeight, 200);
    };

    const formatDelay = (ms: number) => {
        const seconds = (ms / 1000).toFixed(1);
        return `${seconds > "0" ? '+' : ''}${seconds}s`;
    };

    const TrackItem = ({ track, index, isSelected, onSelect }: { track: Track, index: number, isSelected: boolean, onSelect: (index: number) => void }) => {
        let displayText = '';
        let subText = '';

        if (index === -1) {
            displayText = 'OFF';
        } else {
            displayText = track.title || `Subtitle ${index + 1}`;
            subText = track.language || 'Unknown';
            if (track.uri) {
                subText = 'External File';
            }
        }

        return (
            <TVFocusable
                autoFlex={false}
                style={[
                    styles.trackItem,
                    isSelected && { backgroundColor: activeColors.primary + '20', borderColor: activeColors.primary + '60' },
                    { minHeight: getResponsiveSize(44, 48, 52) }
                ]}
                onPress={() => onSelect(index)}
                focusedBackgroundColor={activeColors.surface + '40'}
                focusedBorderColor={activeColors.primary}
            >
                {({ focused }) => (
                    <View style={styles.trackContentRow}>
                        <View style={styles.trackContent}>
                            <Text style={[
                                styles.trackText,
                                { color: activeColors.text },
                                isSelected && { color: activeColors.primary, fontWeight: 'bold' },
                                focused && { color: activeColors.text, fontWeight: 'bold' },
                                { fontSize: getResponsiveSize(13, 15, 17) }
                            ]}>
                                {displayText}
                            </Text>
                            {subText ? (
                                <Text style={[
                                    styles.trackSubText,
                                    { color: activeColors.textSecondary },
                                    isSelected && { color: activeColors.primary + 'CC' },
                                    focused && { color: activeColors.textSecondary },
                                    { fontSize: getResponsiveSize(11, 13, 15) }
                                ]}>
                                    {subText}
                                </Text>
                            ) : null}
                        </View>
                        {isSelected && (
                            <MaterialIcons
                                name="check-circle"
                                size={getResponsiveSize(18, 20, 22)}
                                color={activeColors.primary}
                            />
                        )}
                    </View>
                )}
            </TVFocusable>
        );
    };

    return (
        <Modal
            transparent={true}
            statusBarTranslucent={true}
            visible={visible}
            animationType='fade'
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onCancel}
                />

                <View style={[
                    styles.modalContainer,
                    {
                        width: isTV ? '70%' : (isLandscape ? '90%' : '92%'),
                        height: isTV ? '80%' : (isLandscape ? '90%' : '75%'),
                        maxWidth: 1000,
                        backgroundColor: activeColors.background,
                        borderColor: activeColors.border,
                        maxHeight: height * 0.9,
                    }
                ]}>
                    <SafeAreaView style={styles.modalContent}>
                        <View style={[
                            styles.header,
                            {
                                borderBottomColor: activeColors.border,
                                padding: isTV ? 20 : (isLandscape ? 10 : 16)
                            }
                        ]}>
                            <View style={styles.headerLeft}>
                                <MaterialIcons
                                    name="subtitles"
                                    size={getResponsiveSize(22, 24, 28)}
                                    color={activeColors.primary}
                                />
                                <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, 20, 24), color: activeColors.text }]}>
                                    Subtitles Configuration
                                </Text>
                            </View>
                            <TVFocusable
                                autoFlex={false}
                                style={styles.closeBtn}
                                onPress={onCancel}
                                focusedBackgroundColor={activeColors.error}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={getResponsiveSize(22, 24, 28)}
                                    color={Platform.isTV ? "#fff" : activeColors.text}
                                />
                            </TVFocusable>
                        </View>

                        <View style={styles.contentContainer}>
                            <View style={[styles.mainLayout, shouldUseHorizontalLayout() && styles.horizontalLayout]}>
                                {/* Left/Top Section: Track List */}
                                <View style={[styles.tracksSection, shouldUseHorizontalLayout() && { flex: 1.2 }]}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: activeColors.textSecondary }]}>Select Track</Text>
                                        {/* {onImportSubtitle && (
                                            <TVFocusable
                                                autoFlex={false}
                                                style={[styles.importBtn, { backgroundColor: activeColors.primary + '20' }]}
                                                onPress={onImportSubtitle}
                                                focusedBackgroundColor={activeColors.primary}
                                            >
                                                {({ focused }) => (
                                                    <View style={styles.importBtnContent}>
                                                        <MaterialIcons name="file-upload" size={16} color={focused ? "#fff" : activeColors.primary} />
                                                        <Text style={[styles.importText, { color: focused ? "#fff" : activeColors.primary }]}>Import External</Text>
                                                    </View>
                                                )}
                                            </TVFocusable>
                                        )} */}
                                    </View>

                                    <ScrollView
                                        style={styles.tracksList}
                                        showsVerticalScrollIndicator={true}
                                        contentContainerStyle={styles.tracksContent}
                                    >
                                        <TrackItem
                                            track={{ language: 'OFF' }}
                                            index={-1}
                                            isSelected={selectedTextTrack === -1}
                                            onSelect={onSelectText}
                                        />
                                        {textTracks.map((track, index) => (
                                            <TrackItem
                                                key={`sub-${index}`}
                                                track={track}
                                                index={index}
                                                isSelected={selectedTextTrack === index}
                                                onSelect={onSelectText}
                                            />
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Right/Bottom Section: Delay Adjustment */}
                                <View style={[
                                    styles.delaySection,
                                    { backgroundColor: activeColors.surface, borderColor: activeColors.border },
                                    shouldUseHorizontalLayout() && { flex: 1, marginLeft: 16, marginBottom: 0, marginTop: 0 }
                                ]}>
                                    <View style={[
                                        styles.delayHeader,
                                        {
                                            paddingVertical: isLandscape ? 8 : 16,
                                            marginBottom: isLandscape ? 8 : 16
                                        }
                                    ]}>
                                        <MaterialIcons name="sync" size={20} color={activeColors.primary} />
                                        <Text style={[styles.delayTitle, { color: activeColors.text }]}>Subtitle Sync</Text>
                                    </View>

                                    <View style={styles.delayDisplay}>
                                        <Text style={[
                                            styles.delayValue,
                                            {
                                                color: activeColors.text,
                                                fontSize: isLandscape ? 24 : 32
                                            }
                                        ]}>{formatDelay(subtitleDelay)}</Text>
                                        <Text style={[styles.delaySubtext, { color: activeColors.textSecondary }]}>Adjust timing for delay or fast subtitles</Text>
                                    </View>

                                    <View style={styles.delayControls}>
                                        <View style={styles.delayRow}>
                                            <TVFocusable
                                                autoFlex={false}
                                                style={[styles.delayBtn, { backgroundColor: activeColors.background }]}
                                                onPress={() => onAdjustDelay(subtitleDelay - 100)}
                                                focusedBackgroundColor={activeColors.primary}
                                            >
                                                <Text style={[styles.delayBtnText, { color: activeColors.text }]}>-0.1s</Text>
                                            </TVFocusable>

                                            <TVFocusable
                                                autoFlex={false}
                                                style={[styles.delayBtn, { backgroundColor: activeColors.background }]}
                                                onPress={() => onAdjustDelay(subtitleDelay + 100)}
                                                focusedBackgroundColor={activeColors.primary}
                                            >
                                                <Text style={[styles.delayBtnText, { color: activeColors.text }]}>+0.1s</Text>
                                            </TVFocusable>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={[
                            styles.footer,
                            {
                                borderTopColor: activeColors.border,
                                padding: isLandscape ? 10 : 16
                            }
                        ]}>
                            <TVFocusable
                                autoFlex={false}
                                style={[styles.cancelButton, { backgroundColor: activeColors.surface }]}
                                onPress={onCancel}
                                focusedBackgroundColor={activeColors.error}
                            >
                                <Text style={[styles.buttonText, { color: activeColors.text }]}>Cancel</Text>
                            </TVFocusable>

                            <TVFocusable
                                autoFlex={false}
                                style={[styles.applyButton, { backgroundColor: activeColors.primary }]}
                                onPress={onApply}
                                focusedBackgroundColor={activeColors.primary}
                                hasTVPreferredFocus={true}
                            >
                                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Done</Text>
                            </TVFocusable>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        borderRadius: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    modalContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontWeight: '700',
    },
    closeBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    contentContainer: {
        flex: 1,
        padding: 16,
    },
    mainLayout: {
        flex: 1,
    },
    horizontalLayout: {
        flexDirection: 'row',
    },
    tracksSection: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    importBtn: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    importBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    importText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    tracksList: {
        flex: 1,
    },
    tracksContent: {
        paddingBottom: 16,
    },
    trackItem: {
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    trackContentRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    trackContent: {
        flex: 1,
    },
    trackText: {
        fontWeight: '600',
    },
    trackSubText: {
        marginTop: 2,
        opacity: 0.7,
    },
    delaySection: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 16,
        marginBottom: 8,
    },
    delayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    delayTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    delayDisplay: {
        alignItems: 'center',
        marginBottom: 20,
    },
    delayValue: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    delaySubtext: {
        fontSize: 12,
        textAlign: 'center',
    },
    delayControls: {
        gap: 12,
    },
    delayRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    delayBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    delayBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        borderTopWidth: 1,
    },
    cancelButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    applyButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

export default React.memo(SubtitleModal);
