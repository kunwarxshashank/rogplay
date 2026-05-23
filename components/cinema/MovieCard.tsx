import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';

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

function MovieCard({ item, type, addonType, catalogTypeRaw, width = 120, showType = false, style, onPress }: MovieCardProps) {
    const router = useRouter();
    const theme = useSettingsStore((state) => state.theme);
    const currentColors = useMemo(() => Colors[theme] || Colors.dark, [theme]);

    const mediaType = (type || item.media_type || 'movie') as 'movie' | 'tv';

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

    /**
     * Detects if an ID is a custom Stremio ID (e.g. "kisskh:12572", "onetouchtv:456")
     * as opposed to a TMDB numeric ID or IMDb "tt..." ID.
     */
    const isCustomStremioId = (id: string) => {
        if (!id) return false;
        if (id.startsWith('tt')) return false;           // IMDb ID
        if (!isNaN(Number(id))) return false;             // Numeric TMDB ID
        if (id.includes(':')) return true;               // e.g. kisskh:12572
        // Check for non-numeric non-tt string IDs with known prefixes
        return /^[a-zA-Z][a-zA-Z0-9]+/.test(id) && isNaN(Number(id));
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
            return;
        }

        const itemId = item.id?.toString() || '';
        const finalAddonType = addonType || item.addonType;
        const streamUrl = item.url || item.movieUrl || item.link || item.source || '';

        // ── serveraddon: items have a direct stream URL, skip details entirely ──
        if (finalAddonType === 'serveraddon' && streamUrl) {
            const params: any = {
                query: item.title || item.name || '',
                type: 'addon',
                movieUrl: item.url || item.movieUrl || item.link || item.source || '',
                title: item.title || item.name,
                poster: posterUrl,
            };
            if (Platform.isTV) {
                router.push({ pathname: '/(tv)/server-selection', params });
            } else {
                router.push({ pathname: '/server-selection', params });
            }
            return;
        }

        // ── stremioaddon with custom ID (kisskh:xxx etc): use stremio-browser ──
        if (finalAddonType === 'stremio' && isCustomStremioId(itemId)) {
            const stremioAddonUrl = item._addonUrl || item.stremioAddonUrl || '';
            const params: any = {
                selectedItemId: itemId,
                selectedItemType: item.type || catalogTypeRaw || mediaType,
                title: item.title || item.name,
                url: stremioAddonUrl,
                manifest: item._addonManifestStr || ''
            };
            console.log('Routing to stremio-browser with url:', stremioAddonUrl);
            if (Platform.isTV) {
                router.push({ pathname: '/(tv)/stremio-browser', params });
            } else {
                router.push({ pathname: '/stremio-browser', params });
            }
            return;
        }

        // ── tmdbaddon / stremioaddon with standard IDs → TMDB details page ──
        if (Platform.isTV) {
            router.push({ pathname: '/(tv)/details/[type]/[id]', params: { id: itemId, type: mediaType } });
        } else {
            router.push({ pathname: '/(mobile)/details/[type]/[id]', params: { id: itemId, type: mediaType } });
        }
    };


    if (Platform.isTV) {
        return (
            <TVFocusable style={[styles.container, { width }, style]} onPress={handlePress} focusedScale={1.1}>
                {({ focused }: any) => (
                    <View
                        style={[
                            styles.posterContainer,
                            {
                                backgroundColor: '#000',
                                borderColor: focused ? currentColors.primary : 'rgba(255,255,255,0.1)',
                                borderWidth: 2,
                            },
                            focused && {
                                shadowColor: currentColors.primary,
                                shadowOffset: { width: 0, height: 15 },
                                shadowOpacity: 0.5,
                                shadowRadius: 20,
                                elevation: 20,
                            },
                        ]}
                    >
                        {posterUrl ? (
                            <Image source={{ uri: posterUrl }} style={styles.poster} />
                        ) : (
                            <View style={styles.placeholder}>
                                <MaterialIcons name="movie" size={width * 0.3} color={currentColors.textSecondary} />
                            </View>
                        )}

                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)']} style={styles.gradient} />

                        {item.vote_average > 0 && (
                            <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                                <MaterialIcons name="star" size={12} color="#FFD700" />
                                <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                            </View>
                        )}

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
                    </View>
                )}
            </TVFocusable>
        );
    }

    return (
        <TouchableOpacity style={[styles.container, { width }, style]} onPress={handlePress} activeOpacity={0.8}>
            <View style={[styles.posterContainer, { backgroundColor: currentColors.card }]}>
                {posterUrl ? <Image source={{ uri: posterUrl }} style={styles.poster} /> : (
                    <View style={styles.placeholder}>
                        <MaterialIcons name="movie" size={width * 0.3} color={currentColors.textSecondary} />
                    </View>
                )}

                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

                {item.vote_average > 0 && (
                    <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <MaterialIcons name="star" size={12} color="#FFD700" />
                        <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                    </View>
                )}

                {showType && (
                    <View style={[styles.typeBadge, { backgroundColor: currentColors.primary }]}>
                        <Text style={styles.typeText}>{mediaType.toUpperCase()}</Text>
                    </View>
                )}
            </View>
            <View style={styles.info}>
                <Text style={[styles.title, { color: currentColors.text }]} numberOfLines={1}>{item.title || item.name}</Text>
                {item.release_date || item.first_air_date ? (
                    <Text style={[styles.year, { color: currentColors.textSecondary }]}>{(item.release_date || item.first_air_date).split('-')[0]}</Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 12 },
    posterContainer: {
        aspectRatio: Platform.isTV ? 16 / 9 : 2 / 3,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    poster: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
    ratingBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
    ratingText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
    typeBadge: { position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
    info: { marginTop: 8, paddingHorizontal: 2 },
    title: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    year: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
    tvOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 20 },
    tvTitle: { color: '#fff', fontSize: 16, fontWeight: '900', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 },
    tvMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    tvYear: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Outfit_500Medium' },
    dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' },
    tvMediaType: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 }
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
