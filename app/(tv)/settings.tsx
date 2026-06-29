import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Dimensions, TextInput, Platform } from 'react-native';
import { useSettingsStore, AppTheme } from '@/store/settingsStore';
import { useThemeStore, THEME_PALETTES, ACCENT_COLORS, POSTER_STYLES, HOME_LAYOUT_CONFIG, ThemeId, AccentColorId, PosterStyleId, HomeLayoutId, AnimationIntensity, FontScale } from '@/store/themeStore';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import appConfigJson from '@/app.json';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsStore } from '@/store/analyticsStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

const THEMES: { id: ThemeId; name: string; color: string; gradient: readonly [string, string]; icon: any; desc: string }[] = [
    { id: 'amoled', name: 'AMOLED', color: '#000000', gradient: ['#000000', '#1a1a2e'], icon: 'brightness-1', desc: 'Pure black, max battery' },
    { id: 'glassmorphism', name: 'Glassmorphism', color: '#6366f1', gradient: ['rgba(99,102,241,0.3)', 'rgba(99,102,241,0.1)'], icon: 'blur', desc: 'Frosted glass depth' },
    { id: 'material3', name: 'Material 3', color: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'], icon: 'material-design', desc: 'Dynamic color system' },
    { id: 'minimal', name: 'Minimal', color: '#ffffff', gradient: ['#1a1a1a', '#0c0c0c'], icon: 'circle-outline', desc: 'Clean, content-first' },
    { id: 'cinema', name: 'Cinema', color: '#ef4444', gradient: ['#ef4444', '#050508'], icon: 'theater', desc: 'Theater-inspired drama' },
];

const POSTER_STYLE_ITEMS = Object.values(POSTER_STYLES);

const LAYOUT_ITEMS: { id: HomeLayoutId; name: string; icon: any; desc: string }[] = [
    { id: 'netflix', name: 'Netflix', icon: 'play-box', desc: 'Hero + content rows' },
    { id: 'plex', name: 'Plex', icon: 'view-dashboard', desc: 'Dashboard layout' },
    { id: 'tv_grid', name: 'TV Grid', icon: 'grid', desc: 'Traditional grid' },
    { id: 'minimal', name: 'Minimal', icon: 'circle-outline', desc: 'Content-first' },
    { id: 'cinema', name: 'Cinema', icon: 'theater', desc: 'Immersive backdrops' },
];

const HERO_SLIDER_ITEMS: { id: 'traditional' | 'fullscreen'; name: string; icon: any; desc: string }[] = [
    { id: 'traditional', name: 'Traditional', icon: 'slideshow', desc: 'Multi-layer gradients' },
    { id: 'fullscreen', name: 'Fullscreen', icon: 'fullscreen', desc: 'Details-page aesthetic' },
];

const FONT_SCALES: { id: FontScale; label: string }[] = [
    { id: 'small', label: 'Small' },
    { id: 'normal', label: 'Normal' },
    { id: 'large', label: 'Large' },
    { id: 'xlarge', label: 'X-Large' },
];

const ANIMATION_INTENSITIES: { id: AnimationIntensity; label: string; icon: any }[] = [
    { id: 'none', label: 'None', icon: 'animation-off' },
    { id: 'reduced', label: 'Reduced', icon: 'animation-play-outline' },
    { id: 'normal', label: 'Normal', icon: 'animation-play' },
    { id: 'enhanced', label: 'Enhanced', icon: 'motion' },
];

export default function TVSettingsScreen() {
    const {
        theme,
        confirmExit, toggleSetting,
        pipEnabled, resizeButtonEnabled,
        longPressSpeedEnabled, doubleTapSeekEnabled,
        playbackGesturesEnabled, autoRotate,
        defaultScreen,
        cinemaContinueWatching, cinemaPlatforms, cinemaHomeSlider, cinemaFilters, cinemaCardSize, autoSelectHealthiestSource,
        debridProvider, debridApiKey,
        setSetting
    } = useSettingsStore();

    const themeStore = useThemeStore();
    const { colors: c } = useTheme();

    const [activeTab, setActiveTab] = useState('appearance');
    const [hexInput, setHexInput] = useState(themeStore.customHexAccent);
    const [tvApiKeyInput, setTvApiKeyInput] = useState(debridApiKey);

    const settingsValues: any = {
        confirmExit, pipEnabled, resizeButtonEnabled,
        longPressSpeedEnabled, doubleTapSeekEnabled,
        playbackGesturesEnabled, autoRotate, autoSelectHealthiestSource
    };

    const renderToggle = (item: typeof PLAYER_SETTINGS[0]) => {
        const value = settingsValues[item.key];
        return (
            <TVFocusable
                key={item.key}
                style={[styles.toggleRow, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: c.border }]}
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

    const renderThemeCard = (item: typeof THEMES[0]) => {
        const isActive = themeStore.themePalette === item.id;
        return (
            <TVFocusable
                key={item.id}
                autoFlex={true}
                style={[styles.themeCard, { borderColor: isActive ? item.color || c.primary : 'transparent' }]}
                onPress={() => {
                    themeStore.setThemePalette(item.id);
                    setSetting('theme', item.id);
                }}
                focusedScale={1.04}
                focusedBorderColor={item.color || c.primary}
                nativeID={`tv-theme-${item.id}`}
            >
                <LinearGradient colors={item.gradient as any} style={styles.themeCardGradient}>
                    <View style={styles.themeCardContent}>
                        <MaterialCommunityIcons name={item.icon as any} size={28} color="#fff" style={{ opacity: 0.8 }} />
                        <Text style={styles.themeCardName}>{item.name}</Text>
                        <Text style={styles.themeCardDesc}>{item.desc}</Text>
                    </View>
                    {isActive && (
                        <View style={[styles.themeCardCheck, { backgroundColor: c.primary }]}>
                            <MaterialCommunityIcons name="check" size={16} color="#fff" />
                        </View>
                    )}
                </LinearGradient>
            </TVFocusable>
        );
    };

    const renderAccentColor = (item: typeof ACCENT_COLORS[0]) => {
        const isActive = themeStore.accentColorId === item.id;
        const color = item.id === 'custom' ? themeStore.customHexAccent : item.primary;
        return (
            <TVFocusable
                key={item.id}
                style={[styles.colorSwatch, {
                    backgroundColor: color,
                    borderColor: isActive ? '#fff' : 'transparent',
                    borderWidth: isActive ? 3 : 0,
                }]}
                onPress={() => themeStore.setAccentColor(item.id)}
                focusedScale={1.15}
                focusedBorderColor={color}
            >
                {isActive && <MaterialCommunityIcons name="check" size={20} color="#fff" />}
            </TVFocusable>
        );
    };

    const renderPosterStyle = (item: typeof POSTER_STYLE_ITEMS[0]) => {
        const isActive = themeStore.posterStyle === item.id;
        return (
            <TVFocusable
                key={item.id}
                style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                onPress={() => themeStore.setPosterStyle(item.id)}
                focusedScale={1.03}
                focusedBorderColor={c.primary}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.compactIconWrap, { backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : hexAlpha(c.text, 0.05) }]}>
                        <MaterialCommunityIcons
                            name={item.id === 'netflix' ? 'movie' : item.id === 'plex' ? 'view-list' : item.id === 'cinematic' ? 'image-filter-hdr' : item.id === 'modern_grid' ? 'grid' : 'card-bulleted'}
                            size={20}
                            color={isActive ? c.primary : c.textSecondary}
                        />
                    </View>
                    <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>{item.label}</Text>
                    {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                </View>
            </TVFocusable>
        );
    };

    const renderLayoutItem = (item: typeof LAYOUT_ITEMS[0]) => {
        const isActive = themeStore.homeBuilder.layout === item.id;
        return (
            <TVFocusable
                key={item.id}
                style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                onPress={() => themeStore.setHomeLayout(item.id)}
                focusedScale={1.03}
                focusedBorderColor={c.primary}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.compactIconWrap, { backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : hexAlpha(c.text, 0.05) }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={20} color={isActive ? c.primary : c.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>{item.name}</Text>
                        <Text style={[styles.compactDesc, { color: c.textMuted }]}>{item.desc}</Text>
                    </View>
                    {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                </View>
            </TVFocusable>
        );
    };

    const renderSlider = (label: string, value: number, onChange: (v: number) => void, min = 0, max = 100, step = 5) => {
        const steps = Math.floor((max - min) / step);
        const currentStep = Math.round((value - min) / step);
        return (
            <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.text }]}>{label}</Text>
                    <Text style={[styles.sliderValue, { color: c.primary }]}>{value}</Text>
                </View>
                <View style={styles.sliderTrack}>
                    {Array.from({ length: steps + 1 }).map((_, i) => {
                        const isActive = i <= currentStep;
                        return (
                            <TVFocusable
                                key={i}
                                style={[styles.sliderStep, { backgroundColor: isActive ? c.primary : hexAlpha(c.text, 0.1) }]}
                                onPress={() => onChange(min + i * step)}
                                focusedScale={1.3}
                                focusedBorderColor={isActive ? c.primary : 'transparent'}
                                autoFlex={false}
                            />
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderSection = (title: string) => (
        <View style={styles.sectionSeparator}>
            <View style={[styles.sectionSeparatorLine, { backgroundColor: c.primary }]} />
            <Text style={[styles.sectionSeparatorText, { color: c.text }]}>{title}</Text>
        </View>
    );

    const SETTINGS_TABS = [
        { id: 'general', label: 'General', icon: 'cogs' },
        { id: 'cinema', label: 'Cinema', icon: 'movie-open' },
        { id: 'playback', label: 'Playback', icon: 'play-circle-outline' },
        { id: 'appearance', label: 'Appearance', icon: 'palette' },
        { id: 'debrid', label: 'Debrid', icon: 'cloud-sync' },
        { id: 'insights', label: 'Insights', icon: 'chart-bar' },
        { id: 'about', label: 'About', icon: 'information' },
    ];

    const PLAYER_SETTINGS: { key: string; label: string; desc: string; icon: any; iconPack?: 'community' }[] = [
        { key: 'confirmExit', label: 'Confirm on Exit', desc: 'Ask before closing the player', icon: 'logout' },
        { key: 'pipEnabled', label: 'Picture in Picture', desc: 'Continue playing in a small window', icon: 'picture-in-picture-bottom-right' },
        { key: 'resizeButtonEnabled', label: 'Resize Button', desc: 'Show aspect ratio toggle in player', icon: 'aspect-ratio' },
        { key: 'longPressSpeedEnabled', label: 'Long Press 2× Speed', desc: 'Hold to fast-forward at 2× speed', icon: 'fast-forward' },
        { key: 'doubleTapSeekEnabled', label: 'Double Tap Seek', desc: 'Tap sides to skip forward or back', icon: 'gesture-tap' },
        { key: 'playbackGesturesEnabled', label: 'Playback Gestures', desc: 'Swipe to control volume & brightness', icon: 'gesture-swipe' },
        { key: 'autoRotate', label: 'Auto Rotate', desc: 'Rotate screen with device orientation', icon: 'phone-rotate-landscape' },
        { key: 'autoSelectHealthiestSource', label: 'Auto-Select Best Source', desc: 'Automatically skip selection screen with the highest health score stream', icon: 'auto-fix' },
    ];

    const DEFAULT_SCREENS: { id: string; name: string; icon: any; gradient: readonly [string, string] }[] = [
        { id: 'home', name: 'Home', icon: 'folder', gradient: ['#6366f1', '#818cf8'] },
        { id: 'cinema', name: 'Cinema', icon: 'movie-open', gradient: ['#ec4899', '#f472b6'] },
        { id: 'addons', name: 'Addons', icon: 'view-grid-plus', gradient: ['#3b82f6', '#60a5fa'] },
        { id: 'tools', name: 'Tools', icon: 'hammer-wrench', gradient: ['#f59e0b', '#fbbf24'] },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerIconWrap, { backgroundColor: hexAlpha(c.primary, 0.15) }]}>
                        <MaterialCommunityIcons name="cog" size={24} color={c.primary} />
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
                                style={[styles.tabItem, isActive && { backgroundColor: hexAlpha(c.primary, 0.15), borderColor: hexAlpha(c.primary, 0.3) }]}
                                onPress={() => setActiveTab(tab.id)}
                                focusedScale={1.03}
                                focusedBorderColor={c.primary}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons
                                        name={tab.icon as any}
                                        style={{ padding: 2, paddingRight: 8 }}
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

                    {/* Reset Button */}
                    <View style={{ marginTop: 20 }}>
                        <TVFocusable
                            style={[styles.resetBtn, { backgroundColor: hexAlpha(c.error, 0.15), borderColor: hexAlpha(c.error, 0.3) }]}
                            onPress={() => themeStore.resetToDefaults()}
                            focusedScale={1.03}
                            focusedBorderColor={c.error}
                        >
                            <MaterialCommunityIcons name="restore" size={18} color={c.error} />
                            <Text style={[styles.resetBtnText, { color: c.error }]}>Reset Defaults</Text>
                        </TVFocusable>
                    </View>
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
                                {DEFAULT_SCREENS.map((item) => {
                                    const isActive = (defaultScreen || 'home') === item.id;
                                    return (
                                        <TVFocusable
                                            key={item.id}
                                            style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                                            onPress={() => setSetting('defaultScreen', item.id)}
                                            focusedScale={1.03}
                                            focusedBorderColor={c.primary}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.compactIconWrap, { backgroundColor: hexAlpha(c.text, 0.05) }]}>
                                                    <MaterialCommunityIcons name={item.icon as any} size={20} color={isActive ? c.primary : c.textSecondary} />
                                                </View>
                                                <Text style={[styles.compactLabel, { color: isActive ? c.text : c.textSecondary }]}>{item.name}</Text>
                                                {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                                            </View>
                                        </TVFocusable>
                                    );
                                })}
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
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.compactIconWrap, { backgroundColor: hexAlpha(c.text, 0.05) }]}>
                                                    <MaterialCommunityIcons name={icons[size] as any} size={20} color={isActive ? c.primary : c.textSecondary} />
                                                </View>
                                                <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>{size.charAt(0).toUpperCase() + size.slice(1)}</Text>
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

                    {/* ────────────────────────────────────────────── */}
                    {/* APPEARANCE TAB - New Theme Engine */}
                    {/* ────────────────────────────────────────────── */}
                    {activeTab === 'appearance' && (
                        <View style={styles.section}>
                            {/* Theme Selection */}
                            {renderSection('Theme')}
                            <View style={styles.themeGrid}>
                                {THEMES.map(renderThemeCard)}
                            </View>

                            {/* Accent Color */}
                            {renderSection('Accent Color')}
                            <View style={styles.colorGrid}>
                                {ACCENT_COLORS.map(renderAccentColor)}
                            </View>
                            {themeStore.accentColorId === 'custom' && (
                                <View style={[styles.hexInputRow, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: c.border }]}>
                                    <Text style={[styles.hexLabel, { color: c.text }]}>HEX:</Text>
                                    <TextInput
                                        style={[styles.hexInput, { color: c.text, borderColor: c.border }]}
                                        value={hexInput}
                                        onChangeText={setHexInput}
                                        onEndEditing={() => {
                                            if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
                                                themeStore.setCustomHexAccent(hexInput);
                                            }
                                        }}
                                        placeholder="#6366f1"
                                        placeholderTextColor={c.textMuted}
                                        maxLength={7}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            )}

                            {/* Poster Style */}
                            {renderSection('Poster Style')}
                            <View style={styles.gridContainer}>
                                {POSTER_STYLE_ITEMS.map(renderPosterStyle)}
                            </View>

                            {/* Layout */}
                            {renderSection('Home Layout')}
                            <View style={styles.gridContainer}>
                                {LAYOUT_ITEMS.map(renderLayoutItem)}
                            </View>

                            {/* Home Slider Style */}
                            {renderSection('Home Slider')}
                            <View style={styles.gridContainer}>
                                {HERO_SLIDER_ITEMS.map(item => {
                                    const isActive = themeStore.homeBuilder.heroBannerStyle === item.id;
                                    return (
                                        <TVFocusable
                                            key={item.id}
                                            style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                                            onPress={() => themeStore.setHeroBannerStyle(item.id)}
                                            focusedScale={1.03}
                                            focusedBorderColor={c.primary}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.compactIconWrap, { backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : hexAlpha(c.text, 0.05) }]}>
                                                    <MaterialCommunityIcons name={item.icon as any} size={20} color={isActive ? c.primary : c.textSecondary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>{item.name}</Text>
                                                    <Text style={[styles.compactDesc, { color: c.textMuted }]}>{item.desc}</Text>
                                                </View>
                                                {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                                            </View>
                                        </TVFocusable>
                                    );
                                })}
                            </View>

                            {/* Animation Intensity */}
                            {renderSection('Animation Intensity')}
                            <View style={styles.gridContainer}>
                                {ANIMATION_INTENSITIES.map(item => {
                                    const isActive = themeStore.animationIntensity === item.id;
                                    return (
                                        <TVFocusable
                                            key={item.id}
                                            style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                                            onPress={() => themeStore.setAnimationIntensity(item.id)}
                                            focusedScale={1.03}
                                            focusedBorderColor={c.primary}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.compactIconWrap, { backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : hexAlpha(c.text, 0.05) }]}>
                                                    <MaterialCommunityIcons name={item.icon as any} size={20} color={isActive ? c.primary : c.textSecondary} />
                                                </View>
                                                <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>{item.label}</Text>
                                                {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                                            </View>
                                        </TVFocusable>
                                    );
                                })}
                            </View>

                            {/* Font Scale */}
                            {renderSection('Font Scale')}
                            <View style={styles.gridContainer}>
                                {FONT_SCALES.map(item => {
                                    const isActive = themeStore.fontScale === item.id;
                                    return (
                                        <TVFocusable
                                            key={item.id}
                                            style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                                            onPress={() => themeStore.setFontScale(item.id)}
                                            focusedScale={1.03}
                                            focusedBorderColor={c.primary}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text, fontSize: item.id === 'xlarge' ? 18 : item.id === 'large' ? 16 : item.id === 'normal' ? 14 : 12 }]}>
                                                    {item.label}
                                                </Text>
                                                {isActive && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} style={styles.compactCheck} />}
                                            </View>
                                        </TVFocusable>
                                    );
                                })}
                            </View>

                            {/* Fine Tuning */}
                            {renderSection('Fine Tuning')}
                            <View style={styles.slidersContainer}>
                                {renderSlider('Border Radius', themeStore.borderRadius, (v) => themeStore.setBorderRadius(v), 0, 32, 2)}
                                {renderSlider('Card Elevation', themeStore.cardElevation, (v) => themeStore.setCardElevation(v), 0, 24, 2)}
                                {renderSlider('Background Blur', themeStore.backgroundBlurStrength, (v) => themeStore.setBackgroundBlurStrength(v), 0, 100, 5)}
                                {renderSlider('Transparency', themeStore.transparencyLevel, (v) => themeStore.setTransparencyLevel(v), 0, 100, 5)}
                            </View>
                        </View>
                    )}

                    {activeTab === 'insights' && (
                        <View style={styles.section}>
                            <TVInsightsTab colors={c} />
                        </View>
                    )}

                    {activeTab === 'debrid' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>Debrid Integration</Text>
                            <Text style={{ color: c.textSecondary, marginBottom: 20 }}>Connect your Debrid service to unrestrict torrents and magnet links for high-speed streaming.</Text>

                            {/* Select Provider */}
                            {renderSection('Provider')}
                            <View style={[styles.gridContainer, { marginBottom: 24 }]}>
                                {[{id: 'none', label: 'Disabled'}, {id: 'realdebrid', label: 'Real-Debrid'}, {id: 'alldebrid', label: 'AllDebrid'}, {id: 'premiumize', label: 'Premiumize'}, {id: 'torbox', label: 'TorBox'}].map(item => {
                                    const isActive = debridProvider === item.id;
                                    return (
                                        <TVFocusable
                                            key={item.id}
                                            style={[styles.compactCard, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: isActive ? c.primary : c.border }]}
                                            onPress={() => setSetting('debridProvider', item.id)}
                                            focusedScale={1.03}
                                            focusedBorderColor={c.primary}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.compactIconWrap, { backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : hexAlpha(c.text, 0.05) }]}>
                                                    <MaterialCommunityIcons name={isActive ? "radiobox-marked" : "radiobox-blank"} size={20} color={isActive ? c.primary : c.textSecondary} />
                                                </View>
                                                <Text style={[styles.compactLabel, { color: isActive ? c.primary : c.text }]}>{item.label}</Text>
                                            </View>
                                        </TVFocusable>
                                    );
                                })}
                            </View>

                            {/* API Key */}
                            {debridProvider !== 'none' && (
                                <>
                                    {renderSection('API Key')}
                                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: hexAlpha(c.card, 0.6) }]}
                                            value={tvApiKeyInput}
                                            onChangeText={setTvApiKeyInput}
                                            placeholder="Enter API Key"
                                            placeholderTextColor={c.textMuted}
                                            secureTextEntry
                                        />
                                        <TVFocusable 
                                            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: c.primary, borderRadius: 8 }}
                                            onPress={() => setSetting('debridApiKey', tvApiKeyInput)}
                                            focusedScale={1.05}
                                        >
                                            <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold' }}>Save Key</Text>
                                        </TVFocusable>
                                    </View>
                                </>
                            )}
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

function TVInsightsTab({ colors: c }: { colors: any }) {
    const data = useAnalyticsStore();
    const p = data.personality || { title: 'The Curious Viewer', description: 'Start watching to discover your viewing personality!', emoji: '🎬', traits: ['Curious'], color: c.primary };
    const genreStats = (data.genreStats || []).sort((a, b) => b.hoursWatched - a.hoursWatched);
    const hoursLifetime = data.totalWatchTimeMs / 3600000;

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            <View style={[localStyles.insightHero, { backgroundColor: hexAlpha(c.primary, 0.15), borderColor: hexAlpha(c.primary, 0.3) }]}>
                <View style={localStyles.insightHeroContent}>
                    <Text style={{ fontSize: 14, color: c.textSecondary, fontFamily: 'Inter_400Regular' }}>Welcome back</Text>
                    <Text style={{ fontSize: 28, color: c.text, fontFamily: 'Outfit_700Bold', marginVertical: 4 }}>{data.userName}</Text>
                    <Text style={{ fontSize: 16, color: c.primary, fontFamily: 'Outfit_600SemiBold' }}>
                        {hoursLifetime.toFixed(0)} hours streamed
                    </Text>
                </View>
                <View style={[localStyles.insightEmojiWrap, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                    <Text style={{ fontSize: 48 }}>{p.emoji}</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[localStyles.insightStatCard, { backgroundColor: hexAlpha(c.primary, 0.1), borderColor: hexAlpha(c.primary, 0.2) }]}>
                    <Text style={{ fontSize: 11, color: c.textMuted, fontFamily: 'Inter_400Regular' }}>TODAY</Text>
                    <Text style={{ fontSize: 22, color: c.primary, fontFamily: 'Outfit_700Bold' }}>{data.hoursToday.toFixed(1)}h</Text>
                </View>
                <View style={[localStyles.insightStatCard, { backgroundColor: hexAlpha(c.success, 0.1), borderColor: hexAlpha(c.success, 0.2) }]}>
                    <Text style={{ fontSize: 11, color: c.textMuted, fontFamily: 'Inter_400Regular' }}>MONTH</Text>
                    <Text style={{ fontSize: 22, color: c.success, fontFamily: 'Outfit_700Bold' }}>{data.hoursMonth.toFixed(0)}h</Text>
                </View>
                <View style={[localStyles.insightStatCard, { backgroundColor: hexAlpha(c.warning, 0.1), borderColor: hexAlpha(c.warning, 0.2) }]}>
                    <Text style={{ fontSize: 11, color: c.textMuted, fontFamily: 'Inter_400Regular' }}>LIFETIME</Text>
                    <Text style={{ fontSize: 22, color: c.warning, fontFamily: 'Outfit_700Bold' }}>{hoursLifetime.toFixed(0)}h</Text>
                </View>
            </View>

            <View style={[localStyles.insightCard, { backgroundColor: hexAlpha(c.card, 0.3), borderColor: c.border }]}>
                <Text style={{ fontSize: 16, color: c.text, fontFamily: 'Outfit_700Bold', marginBottom: 16 }}>Top Genres</Text>
                <View style={{ gap: 10 }}>
                    {genreStats.slice(0, 5).map((g, i) => (
                        <View key={g.genre} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ width: 20, fontSize: 14, color: c.textSecondary, fontFamily: 'Outfit_700Bold' }}>#{i + 1}</Text>
                            <View style={[localStyles.genreBarBg, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                                <View style={[localStyles.genreBarFill, { width: `${Math.min((g.hoursWatched / genreStats[0].hoursWatched) * 100, 100)}%`, backgroundColor: i === 0 ? c.primary : hexAlpha(c.primary, 0.4 + 0.6 * (1 - i / 5)) }]} />
                            </View>
                            <Text style={{ width: 80, fontSize: 13, color: c.text, fontFamily: 'Outfit_600SemiBold' }}>{g.genre}</Text>
                            <Text style={{ fontSize: 12, color: c.textSecondary, fontFamily: 'Inter_400Regular' }}>{g.hoursWatched.toFixed(0)}h</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[localStyles.insightCard, { backgroundColor: hexAlpha(c.card, 0.3), borderColor: c.border }]}>
                <Text style={{ fontSize: 16, color: c.text, fontFamily: 'Outfit_700Bold', marginBottom: 12 }}>Personality</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={{ fontSize: 40 }}>{p.emoji}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, color: c.text, fontFamily: 'Outfit_700Bold' }}>{p.title}</Text>
                        <Text style={{ fontSize: 13, color: c.textSecondary, fontFamily: 'Inter_400Regular', marginTop: 4 }}>{p.description}</Text>
                    </View>
                </View>
            </View>

            <View style={[localStyles.insightCard, { backgroundColor: hexAlpha(c.card, 0.3), borderColor: c.border }]}>
                <Text style={{ fontSize: 16, color: c.text, fontFamily: 'Outfit_700Bold', marginBottom: 12 }}>Achievements</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {data.achievements.filter(a => a.unlockedAt).slice(0, 8).map(a => (
                        <View key={a.id} style={[localStyles.achBadge, { backgroundColor: hexAlpha(getRarityColor(a.rarity), 0.15), borderColor: hexAlpha(getRarityColor(a.rarity), 0.3) }]}>
                            <Text style={{ fontSize: 16 }}>{a.icon}</Text>
                            <Text style={{ fontSize: 11, color: c.text, fontFamily: 'Outfit_600SemiBold' }}>{a.title}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[localStyles.insightCard, { backgroundColor: hexAlpha(c.card, 0.3), borderColor: c.border }]}>
                <Text style={{ fontSize: 16, color: c.text, fontFamily: 'Outfit_700Bold', marginBottom: 12 }}>Devices</Text>
                <View style={{ gap: 10 }}>
                    {Object.entries(data.deviceSessions || {}).map(([device, pct], i) => (
                        <View key={device} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <MaterialCommunityIcons
                                name={({ 'Android TV': 'television', 'Mobile': 'cellphone', 'Windows': 'laptop', 'Web': 'web' } as Record<string, string>)[device] as any || 'devices'}
                                size={20} color={[c.primary, c.success, c.info, c.warning][i]} />
                            <View style={[localStyles.genreBarBg, { backgroundColor: hexAlpha(c.primary, 0.1), flex: 1 }]}>
                                <View style={[localStyles.genreBarFill, {
                                    width: `${pct}%`, backgroundColor: [c.primary, c.success, c.info, c.warning][i],
                                }]} />
                            </View>
                            <Text style={{ fontSize: 13, color: c.text, fontFamily: 'Outfit_600SemiBold', width: 40, textAlign: 'right' }}>{pct}%</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[localStyles.insightCard, { backgroundColor: hexAlpha(c.card, 0.3), borderColor: c.border }]}>
                <Text style={{ fontSize: 16, color: c.text, fontFamily: 'Outfit_700Bold', marginBottom: 8 }}>Discovery Insights</Text>
                <View style={{ gap: 8 }}>
                    {(function () {
                        const facts = [];
                        if (data.totalSessions > 0) {
                            facts.push(`Explored ${data.discoveredGenres?.length || 0} genres`);
                            if (data.habits?.activeDay !== 'N/A') facts.push(`Most active on ${data.habits.activeDay}`);
                            if (data.habits?.activeTime !== 'N/A') facts.push(`Prefers ${data.habits.activeTime}`);
                        }
                        return facts.length > 0 ? facts.slice(0, 3).map((fact, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginTop: 6 }} />
                                <Text style={{ fontSize: 13, color: c.textSecondary, fontFamily: 'Inter_400Regular', flex: 1 }}>{fact}</Text>
                            </View>
                        )) : (
                            <Text style={{ fontSize: 13, color: c.textSecondary, fontFamily: 'Inter_400Regular' }}>Start watching to see insights.</Text>
                        );
                    })()}
                </View>
            </View>
        </ScrollView>
    );
}

function getRarityColor(rarity: string): string {
    const map: Record<string, string> = { common: '#94a3b8', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };
    return map[rarity] || '#94a3b8';
}

const localStyles = StyleSheet.create({
    insightHero: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 16 },
    insightHeroContent: { flex: 1 },
    insightEmojiWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    insightStatCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 16, gap: 4 },
    insightCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
    genreBarBg: { height: 20, borderRadius: 10, flex: 1, overflow: 'hidden' },
    genreBarFill: { height: 20, borderRadius: 10 },
    achBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', paddingTop: 60, paddingHorizontal: 44, paddingBottom: 60 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    headerIconWrap: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
    headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: 0.2 },
    headerSubtitle: { fontSize: 14, marginTop: 2, opacity: 0.7, fontFamily: 'Inter_400Regular' },

    content: { flex: 1, flexDirection: 'row', gap: 40 },
    leftPane: { width: 180, gap: 6 },
    rightPane: { flex: 1 },
    rightPaneContent: { paddingBottom: 80 },

    tabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: 'transparent' },
    tabLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 16 },

    listContainer: { gap: 8 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
    toggleIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
    toggleDesc: { fontSize: 13, marginTop: 2, opacity: 0.6, fontFamily: 'Inter_400Regular' },
    switchSize: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], marginLeft: 12 },

    compactCard: { flexDirection: 'row', alignItems: 'center', width: '48%', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
    compactIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    compactLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
    compactDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
    compactCheck: { marginLeft: 8 },

    // ── Theme Cards ────────────────────────────────
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
    themeCard: { width: '18%', aspectRatio: 0.75, borderRadius: 16, overflow: 'hidden', borderWidth: 2 },
    themeCardGradient: { flex: 1, justifyContent: 'flex-end', padding: 14 },
    themeCardContent: { gap: 4 },
    themeCardName: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 8 },
    themeCardDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'Inter_400Regular' },
    themeCardCheck: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    // ── Color Picker ────────────────────────────────
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
    colorSwatch: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

    hexInputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 16 },
    hexLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
    hexInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 16, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },

    // ── Sliders ─────────────────────────────────────
    slidersContainer: { gap: 20, marginTop: 8 },
    sliderContainer: { gap: 8 },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sliderLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
    sliderValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
    sliderTrack: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    sliderStep: { width: 24, height: 24, borderRadius: 12 },

    // ── Section Separator ──────────────────────────
    sectionSeparator: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8, gap: 12 },
    sectionSeparatorLine: { width: 4, height: 24, borderRadius: 2 },
    sectionSeparatorText: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },

    // ── Home Builder ───────────────────────────────
    homeBuilder: { marginTop: 8 },
    hintText: { fontSize: 13, fontFamily: 'Inter_400Regular', opacity: 0.7 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    sectionRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    sectionRowTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
    sectionRowSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
    sectionRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionArrowBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

    // ── Reset ──────────────────────────────────────
    resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
    resetBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

    // ── About ──────────────────────────────────────
    aboutCard: { borderRadius: 16, borderWidth: 1, padding: 24 },
    aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    aboutLogoWrap: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    aboutInfo: { flex: 1 },
    aboutAppName: { fontSize: 22, fontFamily: 'Inter_700Bold' },
    aboutVersion: { fontSize: 14, marginTop: 4, fontFamily: 'Inter_500Medium' },
    aboutAuthor: { fontSize: 13, marginTop: 12, opacity: 0.5, fontFamily: 'Inter_400Regular' },
});
