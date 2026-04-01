import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Dimensions } from 'react-native';
import { useSettingsStore, AppTheme } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import appConfigJson from '@/app.json';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

const THEMES: { id: AppTheme; name: string; color: string; gradient: readonly [string, string]; icon: any }[] = [
    { id: 'dark', name: 'Original Dark', color: '#6366f1', gradient: ['#6366f1', '#a855f7'], icon: 'weather-night' },
    { id: 'dark_red', name: 'Crimson Red', color: '#f43f5e', gradient: ['#f43f5e', '#fb7185'], icon: 'fire' },
    { id: 'dark_yellow', name: 'Amber Gold', color: '#eab308', gradient: ['#eab308', '#fbbf24'], icon: 'white-balance-sunny' },
    { id: 'dark_blue', name: 'Ocean Blue', color: '#3b82f6', gradient: ['#3b82f6', '#60a5fa'], icon: 'waves' },
    { id: 'dark_pink', name: 'Rose Pink', color: '#ec4899', gradient: ['#ec4899', '#f472b6'], icon: 'heart' },
    { id: 'light', name: 'Light Mode', color: '#94a3b8', gradient: ['#e2e8f0', '#cbd5e1'], icon: 'weather-sunny' },
];

const PLAYER_SETTINGS: { key: string; label: string; desc: string; icon: any; iconPack?: 'community' }[] = [
    { key: 'confirmExit', label: 'Confirm on Exit', desc: 'Ask before closing the player', icon: 'logout' },
    { key: 'pipEnabled', label: 'Picture in Picture', desc: 'Continue playing in a small window', icon: 'picture-in-picture-bottom-right' },
    { key: 'resizeButtonEnabled', label: 'Resize Button', desc: 'Show aspect ratio toggle in player', icon: 'aspect-ratio' },
    { key: 'longPressSpeedEnabled', label: 'Long Press 2× Speed', desc: 'Hold to fast-forward at 2× speed', icon: 'fast-forward' },
    { key: 'doubleTapSeekEnabled', label: 'Double Tap Seek', desc: 'Tap sides to skip forward or back', icon: 'gesture-tap' },
    { key: 'playbackGesturesEnabled', label: 'Playback Gestures', desc: 'Swipe to control volume & brightness', icon: 'gesture-swipe' },
    { key: 'autoRotate', label: 'Auto Rotate', desc: 'Rotate screen with device orientation', icon: 'phone-rotate-landscape' },
];

const DEFAULT_SCREENS: { id: string; name: string; icon: any; gradient: readonly [string, string] }[] = [
    { id: 'home', name: 'Home', icon: 'folder', gradient: ['#6366f1', '#818cf8'] },
    { id: 'cinema', name: 'Cinema', icon: 'movie-open', gradient: ['#ec4899', '#f472b6'] },
    { id: 'addons', name: 'Addons', icon: 'view-grid-plus', gradient: ['#3b82f6', '#60a5fa'] },
    { id: 'tools', name: 'Tools', icon: 'hammer-wrench', gradient: ['#f59e0b', '#fbbf24'] },
];

export default function TVSettingsScreen() {
    const {
        theme,
        confirmExit, toggleSetting,
        pipEnabled, resizeButtonEnabled,
        longPressSpeedEnabled, doubleTapSeekEnabled,
        playbackGesturesEnabled, autoRotate,
        defaultScreen,
        setSetting
    } = useSettingsStore();

    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients || { primary: [c.primary, c.primary] };

    const settingsValues: any = {
        confirmExit, pipEnabled, resizeButtonEnabled,
        longPressSpeedEnabled, doubleTapSeekEnabled,
        playbackGesturesEnabled, autoRotate,
    };

    const renderThemeCard = (item: typeof THEMES[0]) => {
        const isActive = theme === item.id;
        return (
            <TVFocusable
                key={item.id}
                style={[
                    styles.themeCard,
                    { borderColor: isActive ? item.color : c.border },
                    isActive && { borderWidth: 2 },
                ]}
                onPress={() => setSetting('theme', item.id)}
                focusedScale={1.06}
                focusedBorderColor={item.color}
                nativeID={`tv-theme-${item.id}`}
            >
                <LinearGradient
                    colors={[item.gradient[0] + '30', item.gradient[1] + '10', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.themeIconWrap, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={[styles.themeName, { color: isActive ? item.color : c.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
                {isActive && (
                    <View style={[styles.themeCheck, { backgroundColor: item.color }]}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    </View>
                )}
            </TVFocusable>
        );
    };

    const renderToggle = (item: typeof PLAYER_SETTINGS[0], index: number) => {
        const value = settingsValues[item.key];
        return (
            <TVFocusable
                key={item.key}
                style={[
                    styles.toggleRow,
                    { backgroundColor: hexAlpha(c.card, 0.8), borderColor: value ? hexAlpha(c.primary, 0.25) : c.border },
                ]}
                onPress={() => toggleSetting(item.key as any)}
                focusedScale={1.02}
                nativeID={`tv-setting-${item.key}`}
            >
                <View style={[styles.toggleIconWrap, { backgroundColor: value ? hexAlpha(c.primary, 0.15) : hexAlpha(c.text, 0.05) }]}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={value ? c.primary : c.textSecondary} />
                </View>
                <View style={styles.toggleInfo}>
                    <Text style={[styles.toggleLabel, { color: c.text }]}>{item.label}</Text>
                    <Text style={[styles.toggleDesc, { color: c.textSecondary }]} numberOfLines={1}>{item.desc}</Text>
                </View>
                <Switch
                    value={value}
                    onValueChange={() => toggleSetting(item.key as any)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: hexAlpha(c.primary, 0.5) }}
                    thumbColor={value ? c.primary : '#94a3b8'}
                    style={styles.switchSize}
                />
            </TVFocusable>
        );
    };

    const renderDefaultScreen = (item: typeof DEFAULT_SCREENS[0]) => {
        const isActive = (defaultScreen || 'home') === item.id;
        return (
            <TVFocusable
                key={item.id}
                style={[
                    styles.screenCard,
                    { borderColor: isActive ? c.primary : c.border },
                    isActive && { borderWidth: 2 },
                ]}
                onPress={() => setSetting('defaultScreen', item.id)}
                focusedScale={1.06}
                nativeID={`tv-screen-${item.id}`}
            >
                <LinearGradient
                    colors={isActive
                        ? [item.gradient[0] + '25', item.gradient[1] + '08', 'transparent']
                        : ['transparent', 'transparent']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.screenIconWrap, { backgroundColor: isActive ? item.gradient[0] + '20' : hexAlpha(c.text, 0.05) }]}>
                    <MaterialCommunityIcons
                        name={item.icon as any}
                        size={26}
                        color={isActive ? item.gradient[0] : c.textSecondary}
                    />
                </View>
                <Text style={[
                    styles.screenName,
                    { color: isActive ? c.text : c.textSecondary },
                ]}>{item.name}</Text>
                {isActive && (
                    <View style={[styles.screenActiveDot, { backgroundColor: c.primary }]} />
                )}
            </TVFocusable>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── Header ─────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.headerIconWrap}>
                            <LinearGradient
                                colors={gradients.primary as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <MaterialCommunityIcons name="cog" size={24} color="#fff" />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: c.text }]}>Settings</Text>
                            <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                                Customize your experience
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Two-Column Layout ──────────────────────── */}
                <View style={styles.columns}>

                    {/* ── LEFT COLUMN ──────────────────────── */}
                    <View style={styles.leftCol}>

                        {/* Appearance */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="palette" size={18} color={c.primary} />
                                <Text style={[styles.sectionTitle, { color: c.primary }]}>Appearance</Text>
                            </View>
                            <View style={styles.themesGrid}>
                                {THEMES.map(renderThemeCard)}
                            </View>
                        </View>

                        {/* Default Screen */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="home" size={18} color={c.primary} />
                                <Text style={[styles.sectionTitle, { color: c.primary }]}>Default Screen</Text>
                            </View>
                            <View style={styles.screensGrid}>
                                {DEFAULT_SCREENS.map(renderDefaultScreen)}
                            </View>
                            <Text style={[styles.screenHint, { color: c.textSecondary }]}>
                                Choose the screen that opens when you start the app.
                            </Text>
                        </View>

                        {/* About */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="information-outline" size={18} color={c.primary} />
                                <Text style={[styles.sectionTitle, { color: c.primary }]}>About</Text>
                            </View>
                            <View style={[styles.aboutCard, { backgroundColor: hexAlpha(c.card, 0.8), borderColor: c.border }]}>
                                <LinearGradient
                                    colors={[c.primary + '08', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.aboutRow}>
                                    <View style={[styles.aboutLogoWrap, { backgroundColor: c.primary + '15' }]}>
                                        <MaterialCommunityIcons name="play-box" size={28} color={c.primary} />
                                    </View>
                                    <View style={styles.aboutInfo}>
                                        <Text style={[styles.aboutAppName, { color: c.text }]}>RogPlay TV</Text>
                                        <Text style={[styles.aboutVersion, { color: c.textSecondary }]}>{appConfigJson.expo.version} TV Edition</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── RIGHT COLUMN ─────────────────────── */}
                    <View style={styles.rightCol}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="play-circle-outline" size={18} color={c.primary} />
                                <Text style={[styles.sectionTitle, { color: c.primary }]}>Player</Text>
                            </View>
                            <View style={styles.togglesList}>
                                {PLAYER_SETTINGS.map((item, index) => renderToggle(item, index))}
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const LEFT_COL_RATIO = 0.48;
const RIGHT_COL_RATIO = 0.52;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingTop: 60,
        paddingHorizontal: 44,
        paddingBottom: 60,
    },

    /* ── Header ────────────────────────────── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 30,
        fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
        opacity: 0.8,
        fontFamily: 'Outfit_500Medium',
    },

    /* ── Columns ───────────────────────────── */
    columns: {
        flexDirection: 'row',
        gap: 32,
    },
    leftCol: {
        flex: LEFT_COL_RATIO,
    },
    rightCol: {
        flex: RIGHT_COL_RATIO,
    },

    /* ── Sections ──────────────────────────── */
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },

    /* ── Themes ─────────────────────────────── */
    themesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    themeCard: {
        width: '30%',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
    },
    themeIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    themeName: {
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
        textAlign: 'center',
    },
    themeCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* ── Player Toggles ────────────────────── */
    togglesList: {
        gap: 8,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    toggleIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    toggleInfo: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    toggleDesc: {
        fontSize: 11,
        marginTop: 2,
        opacity: 0.7,
        fontFamily: 'Outfit_500Medium',
    },
    switchSize: {
        transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }],
        marginLeft: 8,
        marginRight: 8,
    },

    /* ── Default Screens ───────────────────── */
    screensGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    screenCard: {
        width: '22%',
        paddingVertical: 16,
        paddingHorizontal: 10,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
    },
    screenIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    screenName: {
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
        textAlign: 'center',
    },
    screenActiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
    },
    screenHint: {
        fontSize: 12,
        marginTop: 10,
        opacity: 0.7,
        fontFamily: 'Outfit_400Regular',
    },

    /* ── About ─────────────────────────────── */
    aboutCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
    },
    aboutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    aboutLogoWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aboutInfo: {
        flex: 1,
    },
    aboutAppName: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
    },
    aboutVersion: {
        fontSize: 13,
        marginTop: 3,
        opacity: 0.7,
        fontFamily: 'Outfit_400Regular',
    },
});
