import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { useThemeStore, POSTER_STYLES } from '@/store/themeStore';
import { useTheme } from '@/hooks/useTheme';

interface MovieCardProps {
    item: any;
    type?: 'movie' | 'tv';
    addonType?: string;
    catalogTypeRaw?: string | undefined;
    width?: number;
    showType?: boolean;
    style?: any;
    onPress?: () => void;
}

function MovieCard({ item, type, addonType, catalogTypeRaw, width: propWidth, showType = false, style, onPress }: MovieCardProps) {
    const { colors: currentColors } = useTheme();
    const posterStyleKey = useThemeStore((s) => s.posterStyle);
    const themeBorderRadius = useThemeStore((s) => s.borderRadius);
    const cardElevation = useThemeStore((s) => s.cardElevation);
    const router = useRouter();

    const posterStyle = POSTER_STYLES[posterStyleKey] || POSTER_STYLES.netflix;
    const mediaType = (type || item.media_type || 'movie') as 'movie' | 'tv';

    const width = propWidth || (Platform.isTV ? posterStyle.tvWidth : 130);
    const aspectRatio = Platform.isTV ? posterStyle.tvAspectRatio : posterStyle.mobileAspectRatio;
    const borderRadius = themeBorderRadius || posterStyle.borderRadius;

    const posterUrl = useMemo(() => {
        const makeImageUrl = (path?: string) => {
            if (!path) return null;
            if (typeof path !== 'string') return null;
            if (path.startsWith('http://') || path.startsWith('https://')) return path;
            return `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${path}`;
        };

        if (Platform.isTV && item.backdrop_path) return makeImageUrl(item.backdrop_path);
        if (item.poster_path) return makeImageUrl(item.poster_path);
        if (item.poster) return makeImageUrl(item.poster);
        if (item.logo) return makeImageUrl(item.logo);
        if (item.image) return makeImageUrl(item.image);
        if (item.thumbnail) return makeImageUrl(item.thumbnail);
        return null;
    }, [item.backdrop_path, item.poster_path, item.poster, item.logo, item.image, item.thumbnail]);

    const isCustomStremioId = (id: string) => {
        if (!id) return false;
        if (id.startsWith('tt')) return false;
        if (!isNaN(Number(id))) return false;
        if (id.includes(':')) return true;
        return /^[a-zA-Z][a-zA-Z0-9]+/.test(id) && isNaN(Number(id));
    };

    const handlePress = async () => {
        if (onPress) {
            onPress();
            return;
        }

        const itemId = item.id?.toString() || '';
        const finalAddonType = addonType || item.addonType;
        const streamUrl = item.url || item.movieUrl || item.link || item.source || '';

        if (finalAddonType === 'music') {
            const baseUrl = item._addonUrl || '';
            const manifestStr = item._addonManifestStr || '';
            let trackUrl = streamUrl;
            let trackHeaders = item.headers || {};
            if (!trackUrl && baseUrl) {
                try {
                    const cleanBase = baseUrl.replace(/\/manifest\.json$/, '');
                    const res = await fetch(`${cleanBase}/stream/movie/${itemId}.json`);
                    if (res.ok) {
                        const data = await res.json();
                        const streams = data.streams || [];
                        if (streams.length > 0) {
                            trackUrl = streams[0].url || trackUrl;
                            trackHeaders = streams[0].headers || trackHeaders;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch music stream:', e);
                }
            }
            const params: any = {
                tracks: JSON.stringify([{
                    id: itemId, title: item.title || item.name || 'Unknown Track',
                    artist: item.artist || item.subtitle || '', poster: posterUrl,
                    url: trackUrl, headers: trackHeaders,
                }]),
                index: '0', addonUrl: baseUrl, addonManifest: manifestStr,
            };
            router.push({ pathname: Platform.isTV ? '/(tv)/music-player' : '/music-player', params });
            return;
        }

        if (finalAddonType === 'serveraddon') {
            // exclusive server addon music
            if(item.addontype === "music"){
                console.log("ok")
            }
            const params: any = {
                query: item.title || item.name || '', type: 'addon',
                movieUrl: streamUrl, title: item.title || item.name, poster: posterUrl,
            };
            router.push({ pathname: Platform.isTV ? '/(tv)/server-selection' : '/server-selection', params });
            return;
        }

        if (finalAddonType === 'stremio' && isCustomStremioId(itemId)) {
            const stremioAddonUrl = item._addonUrl || item.stremioAddonUrl || '';
            const params: any = {
                selectedItemId: itemId, selectedItemType: item.type || catalogTypeRaw || mediaType,
                title: item.title || item.name, url: stremioAddonUrl,
                manifest: item._addonManifestStr || ''
            };
            router.push({ pathname: Platform.isTV ? '/(tv)/stremio-browser' : '/stremio-browser', params });
            return;
        }

        const finalUrl = item._addonUrl || item.stremioAddonUrl;
        const finalManifest = item._addonManifestStr || item.stremioAddonManifest;

        if (Platform.isTV) {
            router.push({ pathname: '/(tv)/details/[type]/[id]', params: { id: itemId, type: mediaType, ...(finalUrl ? { url: finalUrl, manifest: finalManifest } : {}) } });
        } else {
            router.push({ pathname: '/(mobile)/details/[type]/[id]', params: { id: itemId, type: mediaType, ...(finalUrl ? { url: finalUrl, manifest: finalManifest } : {}) } });
        }
    };

    const focusedScale = posterStyle.scaleOnFocus;
    const shadowElevation = cardElevation || posterStyle.shadowElevation;

    if (Platform.isTV) {
        return (
            <TVFocusable style={[styles.container, { width }, style]} onPress={handlePress} focusedScale={focusedScale} autoFlex={false}>
                {({ focused }: any) => (
                    <View
                        style={[
                            styles.posterContainer,
                            {
                                aspectRatio,
                                borderRadius,
                                borderColor: focused ? currentColors.glow : 'rgba(255,255,255,0.15)',
                                borderWidth: focused ? 3 : (posterStyle.id === 'minimal_cards' ? 0 : 1),
                                elevation: focused ? shadowElevation + 15 : shadowElevation,
                                shadowOpacity: focused ? 0.9 : 0.4,
                                shadowRadius: focused ? 25 : 10,
                            },
                            focused && { shadowColor: currentColors.primary }
                        ]}
                    >
                        <View style={[StyleSheet.absoluteFill, styles.posterBackdrop]} />
                        {posterUrl ? (
                            <OptimizedImage source={{ uri: posterUrl }} style={styles.poster} />
                        ) : (
                            <View style={styles.placeholder}>
                                <MaterialIcons name="movie" size={width * 0.3} color={currentColors.textSecondary} />
                            </View>
                        )}

                        {posterStyle.showMetadata && (
                            currentColors.isAmoled ? (
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)', '#000000']} style={[styles.gradient, { borderRadius }]} />
                            ) : (
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)']} style={[styles.gradient, { borderRadius }]} />
                            )
                        )}

                        {item.vote_average > 0 && (
                            <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                                <MaterialIcons name="star" size={12} color="#FFD700" />
                                <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                            </View>
                        )}

                        {posterStyle.showMetadata && (
                            <View style={styles.tvOverlay}>
                                <Text style={styles.tvTitle} numberOfLines={1}>
                                    {item.title || item.name}
                                </Text>
                                <View style={styles.tvMeta}>
                                    {item.release_date || item.first_air_date ? (
                                        <Text style={styles.tvYear}>{(item.release_date || item.first_air_date).split('-')[0]}</Text>
                                    ) : null}
                                    <View style={styles.dotSeparator} />
                                    <Text style={styles.tvMediaType}>{mediaType.toUpperCase()}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </TVFocusable>
        );
    }

    const year = (item.release_date || item.first_air_date || '').split('-')[0];

    return (
        <TouchableOpacity style={[styles.container, { width }, style]} onPress={handlePress} activeOpacity={0.85}>
            <View style={[styles.posterContainer, { aspectRatio, borderRadius, borderColor: currentColors.border, borderWidth: 1, elevation: shadowElevation }]}>
                <View style={[StyleSheet.absoluteFill, styles.posterBackdrop]} />
                {posterUrl ? <OptimizedImage source={{ uri: posterUrl }} style={styles.poster} /> : (
                    <View style={styles.placeholder}>
                        <MaterialIcons name="movie" size={width * 0.3} color={currentColors.textSecondary} />
                    </View>
                )}

                {/* Soft bottom gradient for legibility */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
                    locations={[0.45, 0.7, 1]}
                    style={[styles.gradient, { borderRadius }]}
                />

                {item.vote_average > 0 && (
                    <View style={styles.ratingBadge}>
                        <MaterialIcons name="star" size={11} color="#f5c518" />
                        <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                    </View>
                )}

                {showType && (
                    <View style={[styles.typeBadge, { backgroundColor: currentColors.primary }]}>
                        <Text style={styles.typeText}>{mediaType.toUpperCase()}</Text>
                    </View>
                )}

                {/* Play affordance on poster */}
                <View style={[styles.playChip, { backgroundColor: currentColors.primary }]}>
                    <MaterialIcons name="play-arrow" size={16} color="#fff" />
                </View>
            </View>
            {posterStyle.showMetadata && (
                <View style={styles.info}>
                    <Text style={[styles.title, { color: currentColors.text }]} numberOfLines={1}>{item.title || item.name}</Text>
                    {year ? (
                        <View style={styles.metaLine}>
                            <Text style={[styles.year, { color: currentColors.textSecondary }]}>{year}</Text>
                            <View style={[styles.metaDot, { backgroundColor: currentColors.textSecondary }]} />
                            <Text style={[styles.year, { color: currentColors.textSecondary }]}>{mediaType === 'tv' ? 'Series' : 'Movie'}</Text>
                        </View>
                    ) : null}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 14 },
    posterContainer: {
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    poster: { width: '100%', height: '100%' },
    posterBackdrop: { backgroundColor: '#1a1a1a' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
    ratingBadge: {
        position: 'absolute',
        top: 7,
        left: 7,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    ratingText: { color: '#fff', fontSize: 10.5, fontFamily: 'Inter_700Bold' },
    typeBadge: { position: 'absolute', top: 7, right: 7, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    typeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
    playChip: {
        position: 'absolute',
        bottom: 7,
        right: 7,
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    info: { marginTop: 8, paddingHorizontal: 2 },
    title: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.6 },
    year: { fontSize: 11, fontFamily: 'Inter_400Regular' },
    tvOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 30 },
    tvTitle: { 
        color: '#fff', 
        fontSize: 18, 
        fontFamily: 'Outfit_700Bold', 
        letterSpacing: -0.2,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4 
    },
    tvMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
    tvYear: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Inter_500Medium' },
    dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
    tvMediaType: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 }
});

export default React.memo(MovieCard, (prev, next) => {
    return (
        prev.item?.id === next.item?.id &&
        prev.type === next.type &&
        prev.addonType === next.addonType &&
        prev.catalogTypeRaw === next.catalogTypeRaw &&
        prev.width === next.width &&
        prev.showType === next.showType &&
        prev.onPress === next.onPress
    );
});
