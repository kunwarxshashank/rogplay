import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore, THEME_PALETTES, ACCENT_COLORS, POSTER_STYLES, HOME_LAYOUT_CONFIG, ThemeId, AccentColorId, PosterStyleId, HomeLayoutId, AnimationIntensity, FontScale } from '@/store/themeStore';
import { TVFocusable } from '@/components/TVFocusable';
import { useTheme } from '@/hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

const isTV = Platform.isTV || false;
const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

const FocusablePressable = ({ onPress, style, children, focusedScale = 1.02, focusedBorderColor }: any) => {
    if (isTV) {
        return (
            <TVFocusable
                onPress={onPress}
                style={style}
                focusedScale={focusedScale}
                focusedBorderColor={focusedBorderColor}
            >
                {children}
            </TVFocusable>
        );
    }
    return (
        <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.7}>
            {children}
        </TouchableOpacity>
    );
};

const THEMES: { id: ThemeId; name: string; color: string; gradient: readonly [string, string]; icon: any }[] = [
    { id: 'amoled', name: 'AMOLED', color: '#000000', gradient: ['#000000', '#1a1a2e'], icon: 'brightness-1' },
    { id: 'glassmorphism', name: 'Glassmorphism', color: '#6366f1', gradient: ['rgba(99,102,241,0.3)', 'rgba(99,102,241,0.1)'], icon: 'blur' },
    { id: 'material3', name: 'Material 3', color: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'], icon: 'material-design' },
    { id: 'minimal', name: 'Minimal', color: '#ffffff', gradient: ['#1a1a1a', '#0c0c0c'], icon: 'circle-outline' },
    { id: 'cinema', name: 'Cinema', color: '#ef4444', gradient: ['#ef4444', '#050508'], icon: 'theater' },
];

const POSTER_STYLE_ITEMS = Object.values(POSTER_STYLES);

const LAYOUT_ITEMS: { id: HomeLayoutId; label: string; icon: string }[] = [
    { id: 'netflix', label: 'Netflix', icon: 'play-box' },
    { id: 'plex', label: 'Plex', icon: 'view-dashboard' },
    { id: 'tv_grid', label: 'TV Grid', icon: 'grid' },
    { id: 'minimal', label: 'Minimal', icon: 'circle-outline' },
    { id: 'cinema', label: 'Cinema', icon: 'theater' },
];

const ANIMATION_INTENSITIES: { id: AnimationIntensity; label: string; }[] = [
    { id: 'none', label: 'None'},
    { id: 'reduced', label: 'Reduced' },
    { id: 'normal', label: 'Normal' },
    { id: 'enhanced', label: 'Enhanced'},
];

const FONT_SCALES: { id: FontScale; label: string }[] = [
    { id: 'small', label: 'Small' }, { id: 'normal', label: 'Normal' },
    { id: 'large', label: 'Large' }, { id: 'xlarge', label: 'X-Large' },
];

const HERO_SLIDER_ITEMS: { id: 'traditional' | 'fullscreen'; label: string; icon: string }[] = [
    { id: 'traditional', label: 'Traditional', icon: 'monitor' },
    { id: 'fullscreen', label: 'Fullscreen', icon: 'fullscreen' },
];

export default function ThemeSettings() {
    const router = useRouter();
    const settings = useSettingsStore();
    const themeStore = useThemeStore();
    const { colors: c } = useTheme();
    const [hexInput, setHexInput] = useState(themeStore.customHexAccent);
    const [activeSection, setActiveSection] = useState<string>('themes');

    const sections = [
        { id: 'themes', label: 'Themes', icon: 'palette' },
        { id: 'accent', label: 'Accent Color', icon: 'color-lens' },
        { id: 'posters', label: 'Poster Style', icon: 'photo-size-select-large' },
        { id: 'layout', label: 'Home Layout', icon: 'view-quilt' },
        { id: 'animation', label: 'Animations', icon: 'motion-photos-auto' },
        { id: 'fine', label: 'Fine Tuning', icon: 'tune' },
    ];

    const MobileSlider = ({ label, value, onChange, min, max, step, color }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; color: any }) => {
        const steps = Math.floor((max - min) / step);
        const pct = ((value - min) / (max - min)) * 100;
        return (
            <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 14, color: color.text }}>{label}</Text>
                    <View style={{ backgroundColor: hexAlpha(color.primary, 0.15), paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: color.primary }}>{value}</Text>
                    </View>
                </View>
                <View style={{ height: 6, backgroundColor: color.border, borderRadius: 3, position: 'relative', marginBottom: 4 }}>
                    <View style={{ width: `${pct}%`, height: 6, backgroundColor: color.primary, borderRadius: 3 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0 }}>
                    {Array.from({ length: steps + 1 }).map((_, i) => {
                        const isActive = i <= Math.round((value - min) / step);
                        const v = min + i * step;
                        const widthPct = Math.max(10, (100 / (steps + 1)) - 0.5);
                        return (
                            <TouchableOpacity
                                key={i}
                                onPress={() => onChange(v)}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                style={{ width: `${widthPct}%` as any, height: 28, justifyContent: 'center', alignItems: 'center' }}
                            >
                                <View style={{
                                    width: isActive ? 8 : 6,
                                    height: isActive ? 8 : 6,
                                    borderRadius: isActive ? 4 : 3,
                                    backgroundColor: isActive ? color.primary : color.textMuted + '50',
                                }} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: color.textMuted }}>{min}</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: color.textMuted }}>{max}</Text>
                </View>
            </View>
        );
    };

    const renderPicker = <T extends string>(
        items: { id: T; label: string; icon?: any }[],
        currentId: T,
        onSelect: (id: T) => void,
        cols = 2
    ) => (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isTV ? 14 : 8 }}>
            {items.map(item => {
                const isActive = currentId === item.id;
                return (
                    <FocusablePressable
                        key={item.id}
                        onPress={() => onSelect(item.id)}
                        style={[styles.pickerItem, {
                            backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : c.surface,
                            borderColor: isActive ? c.primary : c.border,
                            width: cols === 2 ? (isTV ? '47%' : '48%') : (isTV ? '22%' : '30%'),
                        }]}
                        focusedBorderColor={c.primary}
                        focusedScale={1.04}
                    >
                        {item.icon && (
                            <MaterialCommunityIcons name={item.icon} size={isTV ? 22 : 18} color={isActive ? c.primary : c.textSecondary} />
                        )}
                        <Text style={[styles.pickerLabel, { color: isActive ? c.primary : c.text, fontSize: isTV ? 16 : 14 }]}>{item.label}</Text>
                        {isActive && <MaterialIcons name="check" size={isTV ? 20 : 16} color={c.primary} />}
                    </FocusablePressable>
                );
            })}
        </View>
    );

    const renderSlider = (label: string, value: number, onChange: (v: number) => void, min = 0, max = 100, step = 5) => {
        return (
            <View style={[styles.sliderWrap, isTV && { marginBottom: 24 }]}>
                <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: c.text, fontSize: isTV ? 16 : 14 }]}>{label}</Text>
                    <Text style={[styles.sliderValue, { color: c.primary, fontSize: isTV ? 18 : 14 }]}>{value}</Text>
                </View>
                <View style={[styles.sliderTrack, { gap: isTV ? 8 : 4 }]}>
                    {Array.from({ length: Math.floor((max - min) / step) + 1 }).map((_, i) => {
                        const isActive = i <= Math.round((value - min) / step);
                        const stepStyle = {
                            backgroundColor: isActive ? c.primary : hexAlpha(c.text, 0.1),
                            width: isTV ? 32 : 22,
                            height: isTV ? 32 : 22,
                            borderRadius: isTV ? 16 : 11,
                        };
                        if (isTV) {
                            return (
                                <TVFocusable
                                    key={i}
                                    onPress={() => onChange(min + i * step)}
                                    style={stepStyle}
                                    focusedScale={1.3}
                                    focusedBorderColor={c.primary}
                                >
                                    <View style={{ width: '100%', height: '100%' }} />
                                </TVFocusable>
                            );
                        }
                        return (
                            <TouchableOpacity
                                key={i}
                                onPress={() => onChange(min + i * step)}
                                style={stepStyle}
                            />
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
            <LinearGradient
                colors={[c.primary + '20', c.background + 'FA', c.background]}
                locations={[0, 0.2, 1]}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.header, isTV && { paddingHorizontal: 40, paddingVertical: 24 }]}>
                <FocusablePressable onPress={() => router.back()} style={styles.backButton} focusedBorderColor={c.primary}>
                    <MaterialIcons name="arrow-back" size={isTV ? 28 : 24} color={c.text} />
                </FocusablePressable>
                <Text style={[styles.headerTitle, { color: c.text, fontSize: isTV ? 28 : 20 }]}>Theme</Text>
            </View>

            {isTV ? (
                <View style={{ flex: 1 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, marginHorizontal: 40, marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {sections.map(sec => (
                                <TVFocusable
                                    key={sec.id}
                                    onPress={() => setActiveSection(sec.id)}
                                    style={[styles.tvTab, { backgroundColor: activeSection === sec.id ? hexAlpha(c.primary, 0.2) : hexAlpha(c.card, 0.4), borderColor: activeSection === sec.id ? c.primary : c.border }]}
                                    focusedScale={1.05}
                                    focusedBorderColor={c.primary}
                                >
                                    <MaterialIcons name={sec.icon as any} size={18} color={activeSection === sec.id ? c.primary : c.textSecondary} />
                                    <Text style={[styles.tvTabLabel, { color: activeSection === sec.id ? c.primary : c.text }]}>{sec.label}</Text>
                                </TVFocusable>
                            ))}
                        </View>
                    </ScrollView>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
                        {activeSection === 'themes' && (
                            <View>
                                <Text style={[styles.sectionTitleTV, { color: c.text }]}>Choose Theme</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Select a visual style for your app</Text>
                                <View style={[styles.themeGrid, { gap: 16 }]}>
                                    {THEMES.map(theme => {
                                        const isActive = themeStore.themePalette === theme.id;
                                        return (
                                            <TVFocusable
                                                key={theme.id}
                                                onPress={() => {
                                                    themeStore.setThemePalette(theme.id);
                                                    settings.setSetting('theme', theme.id);
                                                }}
                                                style={[styles.themeCard, { borderColor: isActive ? c.primary : 'transparent', width: '18%' }]}
                                                focusedScale={1.06}
                                                focusedBorderColor={c.primary}
                                            >
                                                <LinearGradient colors={theme.gradient as any} style={styles.themeCardGradient}>
                                                    <MaterialCommunityIcons name={theme.icon as any} size={32} color="#fff" />
                                                    <Text style={[styles.themeCardName, { fontSize: 16 }]}>{theme.name}</Text>
                                                </LinearGradient>
                                                {isActive && (
                                                    <View style={[styles.themeCheck, { backgroundColor: c.primary, width: 28, height: 28, borderRadius: 14 }]}>
                                                        <MaterialIcons name="check" size={16} color="#fff" />
                                                    </View>
                                                )}
                                            </TVFocusable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {activeSection === 'accent' && (
                            <View>
                                <Text style={[styles.sectionTitleTV, { color: c.text }]}>Accent Color</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Personalize your app's primary color</Text>
                                <View style={[styles.colorGrid, { gap: 18 }]}>
                                    {ACCENT_COLORS.map(accent => {
                                        const isActive = themeStore.accentColorId === accent.id;
                                        const color = accent.id === 'custom' ? themeStore.customHexAccent : accent.primary;
                                        return (
                                            <TVFocusable
                                                key={accent.id}
                                                onPress={() => themeStore.setAccentColor(accent.id)}
                                                style={[styles.colorSwatch, { backgroundColor: color, borderColor: isActive ? '#fff' : 'transparent', borderWidth: isActive ? 3 : 0, width: 56, height: 56, borderRadius: 28 }]}
                                                focusedScale={1.15}
                                                focusedBorderColor={c.primary}
                                            >
                                                {isActive && <MaterialIcons name="check" size={22} color="#fff" />}
                                            </TVFocusable>
                                        );
                                    })}
                                </View>
                                {themeStore.accentColorId === 'custom' && (
                                    <View style={[styles.hexRow, { backgroundColor: hexAlpha(c.card, 0.4), borderColor: c.border, padding: 16, marginTop: 24 }]}>
                                        <Text style={[styles.hexLabel, { color: c.text, fontSize: 16 }]}>HEX:</Text>
                                        <TextInput
                                            style={[styles.hexInput, { color: c.text, borderColor: c.border, fontSize: 18, paddingVertical: 10 }]}
                                            value={hexInput}
                                            onChangeText={setHexInput}
                                            onEndEditing={() => { if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) themeStore.setCustomHexAccent(hexInput); }}
                                            placeholder="#6366f1"
                                            placeholderTextColor={c.textMuted}
                                            maxLength={7}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {activeSection === 'posters' && (
                            <View>
                                <Text style={[styles.sectionTitleTV, { color: c.text }]}>Poster Style</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Choose how content cards appear</Text>
                                {renderPicker(POSTER_STYLE_ITEMS.map(p => ({ id: p.id, label: p.label })), themeStore.posterStyle, (id) => themeStore.setPosterStyle(id as PosterStyleId))}
                            </View>
                        )}

                        {activeSection === 'layout' && (
                            <View>
                                <Text style={[styles.sectionTitleTV, { color: c.text }]}>Home Layout</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Choose your home screen layout</Text>
                                {renderPicker(LAYOUT_ITEMS, themeStore.homeBuilder.layout, (id) => themeStore.setHomeLayout(id as HomeLayoutId))}
                                <Text style={[styles.sectionTitleTV, { color: c.text, marginTop: 32 }]}>Home Slider Style</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Hero banner visual treatment</Text>
                                {renderPicker(HERO_SLIDER_ITEMS, themeStore.homeBuilder.heroBannerStyle, (id) => themeStore.setHeroBannerStyle(id))}
                            </View>
                        )}

                        {activeSection === 'animation' && (
                            <View>
                                <Text style={[styles.sectionTitleTV, { color: c.text }]}>Animation Intensity</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Control motion effects across the app</Text>
                                {renderPicker(ANIMATION_INTENSITIES.map(a => ({ id: a.id, label: a.label })), themeStore.animationIntensity, (id) => themeStore.setAnimationIntensity(id as AnimationIntensity))}
                                <Text style={[styles.sectionTitleTV, { color: c.text, marginTop: 32 }]}>Font Scale</Text>
                                {renderPicker(FONT_SCALES, themeStore.fontScale, (id) => themeStore.setFontScale(id as FontScale), 4)}
                            </View>
                        )}

                        {activeSection === 'fine' && (
                            <View>
                                <Text style={[styles.sectionTitleTV, { color: c.text }]}>Fine Tuning</Text>
                                <Text style={[styles.sectionDesc, { color: c.textSecondary, fontSize: 16 }]}>Fine-tune visual details</Text>
                                {renderSlider('Border Radius', themeStore.borderRadius, (v) => themeStore.setBorderRadius(v), 0, 32, 2)}
                                {renderSlider('Card Elevation', themeStore.cardElevation, (v) => themeStore.setCardElevation(v), 0, 24, 2)}
                                {renderSlider('Background Blur', themeStore.backgroundBlurStrength, (v) => themeStore.setBackgroundBlurStrength(v), 0, 100, 5)}
                                {renderSlider('Transparency', themeStore.transparencyLevel, (v) => themeStore.setTransparencyLevel(v), 0, 100, 5)}
                            </View>
                        )}
                    </ScrollView>
                </View>
            ) : (
                <View style={styles.mobileRoot}>
                    <View style={[styles.mobileTabBar, { borderBottomColor: c.border + '50' }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileTabScroll}>
                            {sections.map(sec => {
                                const isActive = activeSection === sec.id;
                                return (
                                    <TouchableOpacity
                                        key={sec.id}
                                        style={[styles.mobileTab, {
                                            backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : c.card + '99',
                                            borderColor: isActive ? c.primary : c.border,
                                        }]}
                                        onPress={() => setActiveSection(sec.id)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialIcons name={sec.icon as any} size={16} color={isActive ? c.primary : c.textSecondary} />
                                        <Text style={[styles.mobileTabLabel, { color: isActive ? c.primary : c.textSecondary }]}>{sec.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <ScrollView style={styles.mobileContent} contentContainerStyle={styles.mobileContentInner} showsVerticalScrollIndicator={false}>
                        {activeSection === 'themes' && (
                            <View style={styles.mobileSectionCard}>
                                <Text style={[styles.mobileSectionTitle, { color: c.text }]}>Choose Theme</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Select a visual style for your app</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                                    {THEMES.map(theme => {
                                        const isActive = themeStore.themePalette === theme.id;
                                        return (
                                            <TouchableOpacity
                                                key={theme.id}
                                                style={[styles.mobileThemeCard, { borderColor: isActive ? c.primary : 'transparent' }]}
                                                onPress={() => { themeStore.setThemePalette(theme.id); settings.setSetting('theme', theme.id); }}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient colors={theme.gradient as any} style={styles.mobileThemeGradient}>
                                                    <MaterialCommunityIcons name={theme.icon as any} size={28} color="#fff" />
                                                    <Text numberOfLines={1} style={styles.mobileThemeName}>{theme.name}</Text>
                                                </LinearGradient>
                                                {isActive && (
                                                    <View style={[styles.mobileThemeCheck, { backgroundColor: c.primary }]}>
                                                        <MaterialIcons name="check" size={14} color="#fff" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {activeSection === 'accent' && (
                            <View style={styles.mobileSectionCard}>
                                <Text style={[styles.mobileSectionTitle, { color: c.text }]}>Accent Color</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Personalize your app's primary color</Text>
                                <View style={styles.mobileColorGrid}>
                                    {ACCENT_COLORS.map(accent => {
                                        const isActive = themeStore.accentColorId === accent.id;
                                        const color = accent.id === 'custom' ? themeStore.customHexAccent : accent.primary;
                                        return (
                                            <TouchableOpacity
                                                key={accent.id}
                                                style={[styles.mobileColorSwatch, {
                                                    backgroundColor: color,
                                                    borderColor: isActive ? '#fff' : 'transparent',
                                                    borderWidth: isActive ? 3 : 0,
                                                    transform: [{ scale: isActive ? 1.1 : 1 }],
                                                }]}
                                                onPress={() => themeStore.setAccentColor(accent.id)}
                                                activeOpacity={0.7}
                                            >
                                                {isActive && <MaterialIcons name="check" size={20} color="#fff" />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {themeStore.accentColorId === 'custom' && (
                                    <View style={[styles.mobileHexRow, { backgroundColor: c.cardOverlay, borderColor: c.border }]}>
                                        <Text style={[styles.mobileHexLabel, { color: c.text }]}>#</Text>
                                        <TextInput
                                            style={[styles.mobileHexInput, { color: c.text, borderColor: c.border }]}
                                            value={hexInput.replace('#', '')}
                                            onChangeText={t => setHexInput('#' + t.replace('#', ''))}
                                            onEndEditing={() => { if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) themeStore.setCustomHexAccent(hexInput); }}
                                            placeholder="6366f1"
                                            placeholderTextColor={c.textMuted}
                                            maxLength={6}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {activeSection === 'posters' && (
                            <View style={styles.mobileSectionCard}>
                                <Text style={[styles.mobileSectionTitle, { color: c.text }]}>Poster Style</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Choose how content cards appear</Text>
                                <View style={{ gap: 8, marginTop: 4 }}>
                                    {POSTER_STYLE_ITEMS.map(p => {
                                        const isActive = themeStore.posterStyle === p.id;
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[styles.mobilePickerRow, {
                                                    backgroundColor: isActive ? hexAlpha(c.primary, 0.1) : c.card + '99',
                                                    borderColor: isActive ? c.primary : c.border,
                                                }]}
                                                onPress={() => themeStore.setPosterStyle(p.id as PosterStyleId)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.mobilePickerLabel, { color: c.text }]}>{p.label}</Text>
                                                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                                                        {`${p.borderRadius}px radius · ${p.id === 'netflix' || p.id === 'cinematic' ? '16:9' : '2:3'} · scale ${p.scaleOnFocus}x`}
                                                    </Text>
                                                </View>
                                                {isActive && <MaterialIcons name="check-circle" size={22} color={c.primary} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {activeSection === 'layout' && (
                            <View style={styles.mobileSectionCard}>
                                <Text style={[styles.mobileSectionTitle, { color: c.text }]}>Home Layout</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Choose your home screen layout</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {LAYOUT_ITEMS.map(item => {
                                        const isActive = themeStore.homeBuilder.layout === item.id;
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[styles.mobilePickerChip, {
                                                    backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : c.card + '99',
                                                    borderColor: isActive ? c.primary : c.border,
                                                }]}
                                                onPress={() => themeStore.setHomeLayout(item.id as HomeLayoutId)}
                                                activeOpacity={0.7}
                                            >
                                                <MaterialCommunityIcons name={item.icon as any} size={18} color={isActive ? c.primary : c.textSecondary} />
                                                <Text style={[styles.mobileChipLabel, { color: isActive ? c.primary : c.text }]}>{item.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <View style={{ height: 1, backgroundColor: c.border + '50', marginVertical: 20 }} />
                                <Text style={[styles.mobileSectionTitle, { color: c.text, fontSize: 16 }]}>Hero Slider Style</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Banner visual treatment</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {HERO_SLIDER_ITEMS.map(item => {
                                        const isActive = themeStore.homeBuilder.heroBannerStyle === item.id;
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[styles.mobilePickerChip, {
                                                    backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : c.card + '99',
                                                    borderColor: isActive ? c.primary : c.border, flex: 1,
                                                }]}
                                                onPress={() => themeStore.setHeroBannerStyle(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <MaterialCommunityIcons name={item.icon as any} size={18} color={isActive ? c.primary : c.textSecondary} />
                                                <Text style={[styles.mobileChipLabel, { color: isActive ? c.primary : c.text }]}>{item.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {activeSection === 'animation' && (
                            <View style={styles.mobileSectionCard}>
                                <Text style={[styles.mobileSectionTitle, { color: c.text }]}>Animation Intensity</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Control motion effects across the app</Text>
                                <View style={{ gap: 8 }}>
                                    {ANIMATION_INTENSITIES.map(a => {
                                        const isActive = themeStore.animationIntensity === a.id;
                                        return (
                                            <TouchableOpacity
                                                key={a.id}
                                                style={[styles.mobilePickerRow, {
                                                    backgroundColor: isActive ? hexAlpha(c.primary, 0.1) : c.card + '99',
                                                    borderColor: isActive ? c.primary : c.border,
                                                }]}
                                                onPress={() => themeStore.setAnimationIntensity(a.id as AnimationIntensity)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={[styles.mobilePickerLabel, { color: c.text }]}>{a.label}</Text>
                                                </View>
                                                {isActive && <MaterialIcons name="check-circle" size={22} color={c.primary} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <View style={{ height: 1, backgroundColor: c.border + '50', marginVertical: 20 }} />
                                <Text style={[styles.mobileSectionTitle, { color: c.text, fontSize: 16 }]}>Font Scale</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {FONT_SCALES.map(f => {
                                        const isActive = themeStore.fontScale === f.id;
                                        return (
                                            <TouchableOpacity
                                                key={f.id}
                                                style={[styles.mobilePickerChip, {
                                                    backgroundColor: isActive ? hexAlpha(c.primary, 0.15) : c.card + '99',
                                                    borderColor: isActive ? c.primary : c.border, flex: 1,
                                                }]}
                                                onPress={() => themeStore.setFontScale(f.id as FontScale)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.mobileChipLabel, {
                                                    color: isActive ? c.primary : c.text,
                                                    fontSize: f.id === 'small' ? 11 : f.id === 'normal' ? 13 : f.id === 'large' ? 15 : 17,
                                                }]}>{f.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {activeSection === 'fine' && (
                            <View style={styles.mobileSectionCard}>
                                <Text style={[styles.mobileSectionTitle, { color: c.text }]}>Fine Tuning</Text>
                                <Text style={[styles.mobileSectionDesc, { color: c.textSecondary }]}>Fine-tune visual details</Text>
                                <View style={{ gap: 20, marginTop: 4 }}>
                                    <MobileSlider label="Border Radius" value={themeStore.borderRadius} onChange={v => themeStore.setBorderRadius(v)} min={0} max={32} step={2} color={c} />
                                    <MobileSlider label="Card Elevation" value={themeStore.cardElevation} onChange={v => themeStore.setCardElevation(v)} min={0} max={24} step={2} color={c} />
                                    <MobileSlider label="Background Blur" value={themeStore.backgroundBlurStrength} onChange={v => themeStore.setBackgroundBlurStrength(v)} min={0} max={100} step={5} color={c} />
                                    <MobileSlider label="Transparency" value={themeStore.transparencyLevel} onChange={v => themeStore.setTransparencyLevel(v)} min={0} max={100} step={5} color={c} />
                                </View>
                            </View>
                        )}

                        {/* Reset to Defaults */}
                        <View style={[styles.mobileSectionCard, { borderColor: c.error + '40', marginTop: 8 }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    const themeStore = useThemeStore.getState();
                                    themeStore.resetToDefaults();
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="restore" size={24} color={c.error} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.mobilePickerLabel, { color: c.error }]}>Reset to Defaults</Text>
                                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                                        Restore all theme settings to their original values
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { marginRight: 15 },
    headerTitle: { fontFamily: 'Outfit_700Bold' },

    // Keep TV-specific styles
    sectionTitleTV: { fontSize: 26, fontFamily: 'Outfit_700Bold', marginBottom: 4 },
    sectionDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, opacity: 0.7 },
    sectionLabel: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', marginBottom: 12 },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    themeCard: { width: '18%', aspectRatio: 0.75, borderRadius: 16, overflow: 'hidden', borderWidth: 2 },
    themeCardGradient: { flex: 1, justifyContent: 'flex-end', padding: 14 },
    themeCardName: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold', marginTop: 8 },
    themeCheck: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    colorSwatch: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
    pickerLabel: { flex: 1, fontFamily: 'Outfit_500Medium' },
    sliderWrap: { marginBottom: 16 },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sliderLabel: { fontFamily: 'Outfit_500Medium' },
    sliderValue: { fontFamily: 'Outfit_700Bold' },
    sliderTrack: { flexDirection: 'row', alignItems: 'center' },
    sliderStep: {},
    tvTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, gap: 8 },
    tvTabLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },

    // ─── TV uses these — kept for backward compat ─────
    hexRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 10, marginTop: 24 },
    hexLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
    hexInput: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 18, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, letterSpacing: 2 },

    // ─── Mobile-optimized styles ─────────────────────────
    mobileRoot: { flex: 1 },
    mobileTabBar: { borderBottomWidth: 1, paddingBottom: 0 },
    mobileTabScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
    mobileTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, gap: 6 },
    mobileTabLabel: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    mobileContent: { flex: 1 },
    mobileContentInner: { padding: 16, gap: 12 },
    mobileSectionCard: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    mobileSectionTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', marginBottom: 2 },
    mobileSectionDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginBottom: 16 },

    mobileThemeCard: { width: 100, aspectRatio: 0.75, borderRadius: 16, overflow: 'hidden', borderWidth: 2 },
    mobileThemeGradient: { flex: 1, justifyContent: 'flex-end', padding: 12 },
    mobileThemeName: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold', marginTop: 4, },
    mobileThemeCheck: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },

    mobileColorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
    mobileColorSwatch: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },

    mobileHexRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10, marginTop: 16 },
    mobileHexLabel: { fontFamily: 'Outfit_700Bold', fontSize: 20 },
    mobileHexInput: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 18, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, letterSpacing: 2 },

    mobilePickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
    mobilePickerLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },

    mobilePickerChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
    mobileChipLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
});
