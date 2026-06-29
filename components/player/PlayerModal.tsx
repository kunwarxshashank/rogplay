import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { useTheme } from '@/hooks/useTheme';

interface Track {
    title?: string;
    language?: string;
    height?: number;
    width?: number;
    bitrate?: number;
}

interface PlayerModalProps {
    visible: boolean;
    audioTracks: Track[];
    videoTracks: Track[];
    selectedAudioTrack: number;
    selectedVideoTrack: number;
    onSelectAudio: (index: number) => void;
    onSelectVideo: (index: number) => void;
    onApply: () => void;
    onCancel: () => void;
}

interface TrackItemProps {
    track: Track;
    index: number;
    type: 'audio' | 'video';
    selectedIndex: number;
    onSelect: (index: number) => void;
    isTV: boolean;
    width: number;
    getResponsiveSize: (mobile: number, tablet: number, tv: number) => number;
    colors: any;
}

const TrackItem = React.memo(function TrackItem({
    track, index, type, selectedIndex, onSelect, isTV, width, getResponsiveSize, colors: themeColors
}: TrackItemProps) {
    const isSelected = selectedIndex === index;

    let displayText = '';
    let subText = '';

    if (type === 'audio') {
        displayText = track.title || `Audio ${index + 1}`;
        if (track.language) subText = track.language;
    } else if (type === 'video') {
        displayText = `${track.height}p`;
        subText = `${track.width} x ${track.height}`;
        if (track.bitrate) {
            subText += ` • ${Math.round(track.bitrate / 1000)}kbps`;
        }
    }

    return (
        <TVFocusable
            autoFlex={false}
            style={[
                styles.trackItem,
                isSelected && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary + '60' },
                { minHeight: getResponsiveSize(44, 48, 52) }
            ]}
            onPress={() => onSelect(index)}
            focusedBackgroundColor={themeColors.surface + '40'}
            focusedBorderColor={themeColors.primary}
        >
            {({ focused }) => (
                <View style={styles.trackContentRow}>
                    <View style={styles.trackContent}>
                        <Text style={[
                            styles.trackText,
                            { color: themeColors.text },
                            isSelected && { color: themeColors.primary, fontWeight: 'bold' },
                            focused && { color: themeColors.text, fontWeight: 'bold' },
                            { fontSize: getResponsiveSize(13, 15, 17) }
                        ]}>
                            {displayText}
                        </Text>
                        {subText ? (
                            <Text style={[
                                styles.trackSubText,
                                { color: themeColors.textSecondary },
                                isSelected && { color: themeColors.primary + 'CC' },
                                focused && { color: themeColors.textSecondary },
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
                            color={themeColors.primary}
                        />
                    )}
                </View>
            )}
        </TVFocusable>
    );
});

const PlayerModal: React.FC<PlayerModalProps> = ({
    visible,
    audioTracks,
    videoTracks,
    selectedAudioTrack,
    selectedVideoTrack,
    onSelectAudio,
    onSelectVideo,
    onApply,
    onCancel
}) => {
    const { colors: themeColors } = useTheme();
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

    const getResponsiveSize = useCallback((mobile: number, tablet: number, tv: number) => {
        if (isTV) return tv;
        if (width >= 768) return tablet;
        return mobile;
    }, [isTV, width]);

    const shouldUseHorizontalLayout = () => {
        return isTV || (isLandscape && width >= 768);
    };

    const renderTracks = (track: Track, index: number, type: 'audio' | 'video', selectedIndex: number, onSelect: (i: number) => void) => (
        <TrackItem
            key={`${type}-${index}`}
            track={track}
            index={index}
            type={type}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            isTV={isTV}
            width={width}
            getResponsiveSize={getResponsiveSize}
            colors={themeColors}
        />
    );

    return (
        <Modal
            transparent={true}
            statusBarTranslucent={true}
            visible={visible}
            animationType='slide'
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
                        width: shouldUseHorizontalLayout() ? '92%' : '95%',
                        height: shouldUseHorizontalLayout() ? '85%' : '80%',
                        maxWidth: shouldUseHorizontalLayout() ? 1100 : 500,
                        maxHeight: height * 0.9,
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                    }
                ]}>
                    <SafeAreaView style={styles.modalContent}>

                        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
                            <View style={styles.headerLeft}>
                                <MaterialIcons
                                    name="settings"
                                    size={getResponsiveSize(22, 24, 28)}
                                    color={themeColors.text}
                                />
                                <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, 20, 24), color: themeColors.text }]}>
                                    Player Settings
                                </Text>
                            </View>
                            <TVFocusable
                                autoFlex={false}
                                style={styles.closeBtn}
                                onPress={onCancel}
                                focusedBackgroundColor={themeColors.error}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={getResponsiveSize(22, 24, 28)}
                                    color={Platform.isTV ? "#fff" : themeColors.text}
                                />
                            </TVFocusable>
                        </View>

                        <View style={styles.contentContainer}>
                            <ScrollView
                                style={styles.bodyScroll}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={shouldUseHorizontalLayout() ? styles.horizontalBody : styles.verticalBody}
                            >
                                <View style={[
                                    styles.section,
                                    { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                                    shouldUseHorizontalLayout() && styles.horizontalSection
                                ]}>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name="audiotrack" size={getResponsiveSize(18, 20, 22)} color="#00C851" />
                                        <Text style={[styles.sectionTitle, { fontSize: getResponsiveSize(15, 17, 19), color: themeColors.text }]}>
                                            Audio
                                        </Text>
                                        <View style={[styles.badge, { backgroundColor: '#00C85130' }]}>
                                            <Text style={[styles.badgeText, { fontSize: getResponsiveSize(10, 11, 12), color: '#00C851' }]}>
                                                {audioTracks?.length || 0}
                                            </Text>
                                        </View>
                                    </View>
                                    {audioTracks && audioTracks.length > 0 ? (
                                        audioTracks.map((track, idx) => renderTracks(track, idx, 'audio', selectedAudioTrack, onSelectAudio))
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No audio tracks available</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={[
                                    styles.section,
                                    { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                                    shouldUseHorizontalLayout() && styles.horizontalSection
                                ]}>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name="high-quality" size={getResponsiveSize(18, 20, 22)} color="#FF6B35" />
                                        <Text style={[styles.sectionTitle, { fontSize: getResponsiveSize(15, 17, 19), color: themeColors.text }]}>
                                            Video
                                        </Text>
                                        <View style={[styles.badge, { backgroundColor: '#FF6B3530' }]}>
                                            <Text style={[styles.badgeText, { fontSize: getResponsiveSize(10, 11, 12), color: '#FF6B35' }]}>
                                                {videoTracks?.length || 0}
                                            </Text>
                                        </View>
                                    </View>
                                    {videoTracks && videoTracks.length > 0 ? (
                                        videoTracks.map((track, idx) => renderTracks(track, idx, 'video', selectedVideoTrack, onSelectVideo))
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No video tracks available</Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        </View>

                        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
                            <TVFocusable
                                autoFlex={false}
                                style={[styles.cancelButton, { backgroundColor: themeColors.surface }]}
                                onPress={onCancel}
                                focusedBackgroundColor={themeColors.error}
                            >
                                <View style={styles.buttonContent}>
                                    <MaterialIcons name="close" size={getResponsiveSize(16, 18, 20)} color={themeColors.text} />
                                    <Text style={[styles.buttonText, { fontSize: getResponsiveSize(14, 16, 18), color: themeColors.text }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </TVFocusable>

                            <TVFocusable
                                autoFlex={false}
                                style={[styles.applyButton, { backgroundColor: themeColors.primary }]}
                                onPress={onApply}
                                focusedBackgroundColor={themeColors.primary}
                                hasTVPreferredFocus={true}
                            >
                                <View style={styles.buttonContent}>
                                    <MaterialIcons name="check" size={getResponsiveSize(16, 18, 20)} color="#FFFFFF" />
                                    <Text style={[styles.buttonText, { fontSize: getResponsiveSize(14, 16, 18), color: '#FFFFFF' }]}>
                                        Apply
                                    </Text>
                                </View>
                            </TVFocusable>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};

export default React.memo(PlayerModal);

interface SpeedModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectSpeed: (speed: number) => void;
    selectedSpeed: number;
}

export const SpeedModal = React.memo(function SpeedModal({ visible, onClose, onSelectSpeed, selectedSpeed }: SpeedModalProps) {
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [currentSpeed, setCurrentSpeed] = useState(selectedSpeed);

    const quickSpeeds = [0.25, 1.0, 1.5, 2.0, 3.0];

    useEffect(() => {
        setCurrentSpeed(selectedSpeed);
    }, [selectedSpeed, visible]);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    const { width, height } = screenData;
    const isTV = Platform.isTV;
    const isLandscape = width > height;

    const getResponsiveSize = (mobile: number, tablet: number, tv: number) => {
        if (isTV) return tv;
        if (width >= 768) return tablet;
        return mobile;
    };

    const handleApply = () => {
        onSelectSpeed(currentSpeed);
        onClose();
    };

    const incrementSpeed = () => {
        setCurrentSpeed(prev => Math.min(prev + 0.05, 4.0));
    };

    const decrementSpeed = () => {
        setCurrentSpeed(prev => Math.max(prev - 0.05, 0.25));
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.speedModalOverlay}>
                <TouchableOpacity
                    style={styles.speedBackdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[
                    styles.speedModalContainer,
                    {
                        width: isTV ? '55%' : (isLandscape ? '70%' : '85%'),
                        maxWidth: isTV ? 600 : 500,
                        backgroundColor: '#121212',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                    }
                ]}>
                    <View style={styles.speedHeaderRow}>
                        <View style={styles.premiumBadge}>
                            <Text style={styles.premiumText}>P</Text>
                        </View>
                        <Text style={[styles.currentSpeedText, { fontSize: getResponsiveSize(24, 28, 36) }]}>
                            {currentSpeed.toFixed(1)}x
                        </Text>
                    </View>

                    <View style={styles.sliderSection}>
                        <TVFocusable
                            autoFlex={false}
                            style={styles.speedControlButton}
                            onPress={decrementSpeed}
                            focusedBackgroundColor="rgba(255, 255, 255, 0.2)"
                        >
                            <MaterialIcons name="remove" size={getResponsiveSize(24, 28, 32)} color="white" />
                        </TVFocusable>

                        <Slider
                            style={styles.slider}
                            minimumValue={0.25}
                            maximumValue={4.0}
                            step={0.05}
                            value={currentSpeed}
                            onValueChange={setCurrentSpeed}
                            minimumTrackTintColor="#FFFFFF"
                            maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                            thumbTintColor="#FFFFFF"
                        />

                        <TVFocusable
                            autoFlex={false}
                            style={styles.speedControlButton}
                            onPress={incrementSpeed}
                            focusedBackgroundColor="rgba(255, 255, 255, 0.2)"
                        >
                            <MaterialIcons name="add" size={getResponsiveSize(24, 28, 32)} color="white" />
                        </TVFocusable>
                    </View>

                    <View style={styles.quickSpeedsRow}>
                        {quickSpeeds.map((speed) => (
                            <TVFocusable
                                key={speed.toString()}
                                autoFlex={false}
                                style={[
                                    styles.quickSpeedBtn,
                                    currentSpeed === speed && styles.quickSpeedBtnActive
                                ]}
                                onPress={() => setCurrentSpeed(speed)}
                                focusedBackgroundColor="rgba(255, 255, 255, 0.3)"
                            >
                                <Text style={[
                                    styles.quickSpeedText,
                                    { fontSize: getResponsiveSize(14, 16, 18) },
                                    currentSpeed === speed && styles.quickSpeedTextActive
                                ]}>
                                    {speed === 1.0 ? '1.0' : speed}
                                </Text>
                                {Math.abs(currentSpeed - speed) < 0.01 && (
                                    <View style={styles.activeIndicator} />
                                )}
                            </TVFocusable>
                        ))}
                    </View>

                    <View style={styles.modalFooter}>
                        <TVFocusable
                            autoFlex={false}
                            style={styles.modalActionBtn}
                            onPress={onClose}
                            focusedBackgroundColor="rgba(255, 255, 255, 0.1)"
                        >
                            <Text style={styles.modalActionText}>Close</Text>
                        </TVFocusable>
                        <TVFocusable
                            autoFlex={false}
                            style={[styles.modalActionBtn, styles.modalApplyBtn]}
                            onPress={handleApply}
                            focusedBackgroundColor="rgba(255, 255, 255, 0.3)"
                            hasTVPreferredFocus={true}
                        >
                            <Text style={[styles.modalActionText, styles.modalApplyText]}>Apply</Text>
                        </TVFocusable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

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
        borderRadius: 16,
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
        padding: Platform.isTV ? 20 : 18,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontWeight: '600',
    },
    closeBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        padding: Platform.isTV ? 16 : 14,
    },
    bodyScroll: {
        flex: 1,
    },
    horizontalBody: {
        flexDirection: 'row',
        gap: Platform.isTV ? 12 : 10,
    },
    verticalBody: {
        flexGrow: 1,
    },
    section: {
        borderRadius: 12,
        padding: Platform.isTV ? 14 : 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    horizontalSection: {
        flex: 1,
        marginBottom: 0,
        minWidth: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionTitle: {
        fontWeight: '600',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        fontWeight: '600',
    },
    trackContentRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    trackItem: {
        borderRadius: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
        width: '100%',
    },
    trackContent: {
        flex: 1,
        marginRight: 8,
    },
    trackText: {
        fontWeight: '500',
    },
    trackSubText: {
        marginTop: 2,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontStyle: 'italic',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        padding: Platform.isTV ? 20 : 18,
        borderTopWidth: 1,
    },
    cancelButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    applyButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonText: {
        fontWeight: '600',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    speedModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    speedBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    speedModalContainer: {
        borderRadius: 24,
        padding: Platform.isTV ? 32 : 24,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    speedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    premiumBadge: {
        backgroundColor: '#FF0000',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    },
    currentSpeedText: {
        color: 'white',
        fontWeight: 'bold',
    },
    sliderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 16,
        marginBottom: 32,
    },
    slider: {
        flex: 1,
        height: 40,
    },
    speedControlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickSpeedsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 12,
        marginBottom: 32,
        flexWrap: 'wrap',
    },
    quickSpeedBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        minWidth: 70,
        alignItems: 'center',
        position: 'relative',
    },
    quickSpeedBtnActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    quickSpeedText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
    },
    quickSpeedTextActive: {
        color: 'white',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -6,
        width: 20,
        height: 3,
        backgroundColor: 'white',
        borderRadius: 2,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        width: '100%',
    },
    modalActionBtn: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
        minWidth: 120,
        alignItems: 'center',
    },
    modalApplyBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    modalActionText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalApplyText: {
        color: 'white',
    },
});
