import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPersonDetails } from '@/services/tmdb';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { TVFocusable } from '@/components/TVFocusable';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function TVPersonScreen() {
    const { colors: c } = useTheme();
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [person, setPerson] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getPersonDetails(id as string).then(data => {
                setPerson(data);
                setLoading(false);
            }).catch(e => {
                console.error(e);
                setLoading(false);
            });
        }
    }, [id]);

    if (loading || !person) {
        return (
            <View style={[styles.container, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={c.primary} />
            </View>
        );
    }

    const credits = person.combined_credits?.cast || [];
    // Sort by popularity or release date
    const sortedCredits = credits.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

    const renderCredit = ({ item, index }: { item: any; index: number }) => (
        <TVFocusable
            key={`${item.id}-${item.media_type}`}
            style={styles.creditCard}
            onPress={() => router.push(`/(tv)/details/${item.media_type}/${item.id}` as any)}
            nativeID={`tv-person-credit-${item.id}`}
            focusedScale={1.05}
            focusedBorderColor={c.primary}
            hasTVPreferredFocus={index === 0}
        >
            {item.poster_path ? (
                <Image
                    source={{ uri: `https://image.tmdb.org/t/p/w300${item.poster_path}` }}
                    style={styles.creditPoster}
                />
            ) : (
                <View style={[styles.creditPoster, styles.placeholder, { backgroundColor: c.card }]}>
                    <MaterialIcons name="movie" size={40} color={c.textSecondary} />
                </View>
            )}
            <View style={styles.creditInfo}>
                <Text style={[styles.creditTitle, { color: c.text }]} numberOfLines={2}>
                    {item.title || item.name}
                </Text>
            </View>
        </TVFocusable>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <View style={styles.content}>
                <View style={styles.leftSidebar}>
                    {person.profile_path ? (
                        <Image
                            source={{ uri: `https://image.tmdb.org/t/p/w500${person.profile_path}` }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={[styles.profileImage, styles.placeholder, { backgroundColor: c.card }]}>
                            <MaterialIcons name="person" size={80} color={c.textSecondary} />
                        </View>
                    )}
                    <Text style={[styles.name, { color: c.text }]}>{person.name}</Text>
                    {person.known_for_department && (
                        <Text style={[styles.department, { color: c.textSecondary }]}>
                            {person.known_for_department}
                        </Text>
                    )}
                    
                    <TVFocusable
                        style={[styles.backBtn, { borderColor: 'rgba(255,255,255,0.2)' }]}
                        onPress={() => router.back()}
                        nativeID="tv-person-back"
                        focusedScale={1.05}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={c.text} />
                        <Text style={[styles.backBtnText, { color: c.text }]}>Back</Text>
                    </TVFocusable>
                </View>

                <View style={styles.rightContent}>
                    {person.biography ? (
                        <View style={styles.bioSection}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>Biography</Text>
                            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                                <Text style={[styles.bioText, { color: c.textSecondary }]}>
                                    {person.biography}
                                </Text>
                            </ScrollView>
                        </View>
                    ) : null}

                    {sortedCredits.length > 0 && (
                        <View style={styles.creditsSection}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>Known For</Text>
                            <FlatList
                                data={sortedCredits}
                                renderItem={renderCredit}
                                keyExtractor={(item, idx) => `${item.id}-${item.media_type}-${idx}`}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 40, paddingBottom: 20 }}
                                ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                            />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        padding: 40,
        paddingTop: 60,
    },
    leftSidebar: {
        width: 300,
        alignItems: 'center',
        marginRight: 40,
    },
    profileImage: {
        width: 240,
        height: 360,
        borderRadius: 16,
        marginBottom: 20,
        backgroundColor: '#1a1a2e',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    department: {
        fontSize: 18,
        marginBottom: 30,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 20,
    },
    backBtnText: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    rightContent: {
        flex: 1,
    },
    bioSection: {
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    bioText: {
        fontSize: 16,
        lineHeight: 26,
    },
    creditsSection: {
        flex: 1,
    },
    creditCard: {
        width: 160,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    creditPoster: {
        width: '100%',
        height: 240,
        resizeMode: 'cover',
    },
    creditInfo: {
        padding: 12,
    },
    creditTitle: {
        fontSize: 14,
        fontWeight: '600',
    }
});
