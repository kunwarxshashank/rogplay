import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import MovieList from '@/components/cinema/MovieList';
import { fetchAddonCatalog } from '@/hooks/useCinemaAddon';

export default function TVCinemaCatalogScreen() {
    const { title, type, catalogRawType, addonType, addonManifestStr, addonUrl, url } = useLocalSearchParams();
    const router = useRouter();
    const { colors: currentColors } = useTheme();

    const fetchFunction = useMemo(() => {
        return (page?: number) => {
            const p = page || 1;
            if (addonType === 'tmdbaddon') {
                return fetchAddonCatalog(url as string, p, addonType as string);
            } else {
                return fetchAddonCatalog(
                    url as string, 
                    p, 
                    addonType as string, 
                    { url: addonUrl as string, manifestStr: addonManifestStr as string }, 
                    catalogRawType as string
                );
            }
        };
    }, [url, addonType, addonUrl, addonManifestStr, catalogRawType]);

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={currentColors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: currentColors.text }]}>{(title as string) || "Catalog"}</Text>
            </View>

            <MovieList
                title={(title as string) || "Catalog"}
                type={(type as string) || 'all'}
                fetchFunction={fetchFunction}
                paginated={true}
                addonType={addonType as string}
                catalogRawType={catalogRawType as string}
                addonManifestStr={addonManifestStr as string}
                mode="grid"
                hideTitle={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 10,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Outfit_700Bold',
    }
});
