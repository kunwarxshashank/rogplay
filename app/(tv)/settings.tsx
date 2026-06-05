import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Dimensions } from 'react-native';
import { useSettingsStore, AppTheme } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
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
        cinemaContinueWatching, cinemaPlatforms, cinemaHomeSlider, cinemaFilters, cinemaCardSize,
        setSetting
    } = useSettingsStore();

    const [activeTab, setActiveTab] = React.useState('general');

    const c = Colors[theme] || Colors.dark;

    const settingsValues: any = {
        confirmExit, pipEnabled, resizeButtonEnabled,
        longPressSpeedEnabled, doubleTapSeekEnabled,
        playbackGesturesEnabled, autoRotate,
    };

    const renderToggle = (item: typeof PLAYER_SETTINGS[0]) => {
        const value = settingsValues[item.key];
        return (
            <TVFocusable
                key={item.key}
                style={[
                    styles.toggleRow,
                    { backgroundColor: hexAlpha(c.card, 0.4), borderColor: c.border },
                ]}
                onPress={() => toggleSetting(item.key as any)}
                focusedScale={1.02}
                focusedBorderColor={c.primary}
                nativeID={`tv-setting-${item.key}`}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.toggleIconWrap, { backgroundColor: hexAlpha(c.text, 0.05) }]}>
                        <MaterialCommunityIcons name={item.icon} size={20} color={c.textSecondary} />
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
                </View>
            </TVFocusable>
        );
    };

    const renderThemeItem = (item: typeof THEMES[0]) => {
        const isActive = theme === item.id;
        return (
            <TVFocusable
                key={item.id}
                style={[
                    styles.compactCard,
                    {
                        backgroundColor: hexAlpha(c.card, 0.4),
                        borderColor: isActive ? item.color : c.border
                    },
                ]}
                onPress={() => setSetting('theme', item.id)}
                focusedScale={1.03}
                focusedBorderColor={item.color}
                nativeID={`tv-theme-${item.id}`}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.compactIconWrap, { backgroundColor: item.color + '20' }]}>
                        <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                    </View>
                    <Text style={[styles.compactLabel, { color: isActive ? item.color : c.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {isActive && (
                        <MaterialCommunityIcons name="check-circle" size={18} color={item.color} style={styles.compactCheck} />
                    )}
                </View>
            </TVFocusable>
        );
    };

    const renderDefaultScreenItem = (item: typeof DEFAULT_SCREENS[0]) => {
        const isActive = (defaultScreen || 'home') === item.id;
        return (
            <TVFocusable
                key={item.id}
                style={[
                    styles.compactCard,
                    {
                        backgroundColor: hexAlpha(c.card, 0.4),
                        borderColor: isActive ? c.primary : c.border
                    },
                ]}
                onPress={() => setSetting('defaultScreen', item.id)}
                focusedScale={1.03}
                focusedBorderColor={c.primary}
                nativeID={`tv-screen-${item.id}`}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.compactIconWrap, { backgroundColor: hexAlpha(c.text, 0.05) }]}>
                        <MaterialCommunityIcons
                            name={item.icon as any}
                            size={20}
                            color={isActive ? c.primary : c.textSecondary}
                        />
                    </View>
                    <Text style={[
                        styles.compactLabel,
                        { color: isActive ? c.text : c.textSecondary },
                    ]}>{item.name}</Text>
                    {isActive && (
                        <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />
                    )}
                </View>
            </TVFocusable>
        );
    };

    const SETTINGS_TABS = [
        { id: 'general', label: 'General', icon: 'cogs' },
        { id: 'cinema', label: 'Cinema', icon: 'movie-open' },
        { id: 'playback', label: 'Playback', icon: 'play-circle-outline' },
        { id: 'appearance', label: 'Appearance', icon: 'palette' },
        { id: 'about', label: 'About', icon: 'information-outline' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIconWrap}>
                        <MaterialCommunityIcons name="cog" size={24} color={c.text} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: c.text }]}>Settings</Text>
                        <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                            Customize Rogplay TV to your preference
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                {/* ── LEFT PANE: TABS ──────────────────────── */}
                <View style={styles.leftPane}>
                    {SETTINGS_TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (

                            <TVFocusable
                                key={tab.id}
                                style={[
                                    styles.tabItem,
                                    isActive && { backgroundColor: hexAlpha(c.primary, 0.15) }
                                ]}
                                onPress={() => setActiveTab(tab.id)}
                                focusedScale={1.03}
                                focusedBorderColor={c.primary}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons
                                        name={tab.icon as any}
                                        style={{ padding: 2, paddingRight: 5 }}
                                        size={20}
                                        color={isActive ? c.primary : c.textSecondary}
                                    />
                                    <Text style={[styles.tabLabel, { color: isActive ? c.primary : c.textSecondary }]}>
                                        {tab.label}
                                    </Text>
                                </View>
                            </TVFocusable>
                        );
                    })}
                </View>

                {/* ── RIGHT PANE: CONTENT ────────────────────── */}
                <ScrollView
                    style={styles.rightPane}
                    contentContainerStyle={styles.rightPaneContent}
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'general' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>General</Text>
                            <View style={styles.listContainer}>
                                {PLAYER_SETTINGS.filter(item => item.key === 'confirmExit').map(item => renderToggle(item))}
                            </View>

                            <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Default Screen</Text>
                            <View style={styles.gridContainer}>
                                {DEFAULT_SCREENS.map(renderDefaultScreenItem)}
                            </View>
                        </View>
                    )}

                    {activeTab === 'cinema' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>Cinema</Text>
                            <View style={styles.listContainer}>
                                {([
                                    { key: 'cinemaContinueWatching', label: 'Continue Watching', desc: 'Show resumable content row', icon: 'history', value: cinemaContinueWatching },
                                    { key: 'cinemaPlatforms', label: 'Show Platforms', desc: 'OTT platforms row (TMDB addon)', icon: 'television-play', value: cinemaPlatforms },
                                    { key: 'cinemaHomeSlider', label: 'Show Home Slider', desc: 'Trending hero slider at top', icon: 'image-multiple', value: cinemaHomeSlider },
                                    { key: 'cinemaFilters', label: 'Show Filters', desc: 'Genre/year filter bar', icon: 'filter-variant', value: cinemaFilters },
                                ] as const).map(item => (
                                    <TVFocusable
                                        key={item.key}
                                        style={[styles.toggleRow, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: c.border }]}
                                        onPress={() => toggleSetting(item.key as any)}
                                        focusedScale={1.02}
                                        focusedBorderColor={c.primary}
                                        nativeID={`tv-cinema-${item.key}`}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={[styles.toggleIconWrap, { backgroundColor: hexAlpha(c.text, 0.05) }]}>
                                                <MaterialCommunityIcons name={item.icon as any} size={20} color={c.textSecondary} />
                                            </View>
                                            <View style={styles.toggleInfo}>
                                                <Text style={[styles.toggleLabel, { color: c.text }]}>{item.label}</Text>
                                                <Text style={[styles.toggleDesc, { color: c.textSecondary }]} numberOfLines={1}>{item.desc}</Text>
                                            </View>
                                            <Switch
                                                value={item.value}
                                                onValueChange={() => toggleSetting(item.key as any)}
                                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: hexAlpha(c.primary, 0.5) }}
                                                thumbColor={item.value ? c.primary : '#94a3b8'}
                                                style={styles.switchSize}
                                            />
                                        </View>
                                    </TVFocusable>
                                ))}
                            </View>

                            <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Card Size</Text>
                            <View style={styles.gridContainer}>
                                {(['small', 'medium', 'large'] as const).map(size => {
                                    const isActive = cinemaCardSize === size;
                                    const icons = { small: 'view-grid', medium: 'view-module', large: 'view-agenda' };
                                    return (
                                        <TVFocusable
                                            key={size}
                                            style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                                            onPress={() => setSetting('cinemaCardSize', size)}
                                            focusedScale={1.03}
                                            focusedBorderColor={c.primary}
                                            nativeID={`tv-cardsize-${size}`}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.compactIconWrap, { backgroundColor: hexAlpha(c.text, 0.05) }]}>
                                                    <MaterialCommunityIcons name={icons[size] as any} size={20} color={isActive ? c.primary : c.textSecondary} />
                                                </View>
                                                <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>
                                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                                </Text>
                                                {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                                            </View>
                                        </TVFocusable>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {activeTab === 'playback' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>Playback</Text>
                            <View style={styles.listContainer}>
                                {PLAYER_SETTINGS.filter(item => item.key !== 'confirmExit').map(item => renderToggle(item))}
                            </View>
                        </View>
                    )}

                    {activeTab === 'appearance' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>Appearance</Text>
                            <View style={styles.gridContainer}>
                                {THEMES.map(renderThemeItem)}
                            </View>
                        </View>
                    )}

                    {activeTab === 'about' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>About</Text>
                            <View style={[styles.aboutCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: c.border }]}>
                                <View style={styles.aboutRow}>
                                    <View style={[styles.aboutLogoWrap, { backgroundColor: hexAlpha(c.primary, 0.1), borderColor: hexAlpha(c.primary, 0.2), borderWidth: 1 }]}>
                                        <MaterialCommunityIcons name="play-box" size={32} color={c.primary} />
                                    </View>
                                    <View style={styles.aboutInfo}>
                                        <Text style={[styles.aboutAppName, { color: c.text }]}>RogPlay TV</Text>
                                        <Text style={[styles.aboutVersion, { color: c.textSecondary }]}>Version {appConfigJson.expo.version}</Text>
                                        <Text style={[styles.aboutAuthor, { color: c.textSecondary }]}>© {new Date().getFullYear()} Rogplay TV. All rights reserved.</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: 60,
        paddingHorizontal: 44,
        paddingBottom: 60,
    },

    /* ── Header ────────────────────────────── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerIconWrap: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
        opacity: 0.7,
        fontFamily: 'Inter_400Regular',
    },

    /* ── Layout ───────────────────────────── */
    content: {
        flex: 1,
        flexDirection: 'row',
        gap: 40,
    },
    leftPane: {
        width: 180,
        gap: 6,
    },
    rightPane: {
        flex: 1,
    },
    rightPaneContent: {
        paddingBottom: 40,
    },

    /* ── Tabs ──────────────────────────────── */
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabLabel: {
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
    },

    /* ── Sections ──────────────────────────── */
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 16,
    },

    /* ── Lists & Grids ─────────────────────── */
    listContainer: {
        gap: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },

    /* ── Toggle Row (Smaller Cards) ────────── */
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    toggleIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    toggleInfo: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
    },
    toggleDesc: {
        fontSize: 13,
        marginTop: 2,
        opacity: 0.6,
        fontFamily: 'Inter_400Regular',
    },
    switchSize: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
        marginLeft: 12,
    },

    /* ── Compact Cards (Themes / Screens) ──── */
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%', // 2 columns
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    compactIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',

        marginRight: 12,
    },
    compactLabel: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
    },
    compactCheck: {
        marginLeft: 8,
    },

    /* ── About ─────────────────────────────── */
    aboutCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 24,
    },
    aboutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    aboutLogoWrap: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aboutInfo: {
        flex: 1,
    },
    aboutAppName: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
    },
    aboutVersion: {
        fontSize: 14,
        marginTop: 4,
        fontFamily: 'Inter_500Medium',
    },
    aboutAuthor: {
        fontSize: 13,
        marginTop: 12,
        opacity: 0.5,
        fontFamily: 'Inter_400Regular',
    },
});
