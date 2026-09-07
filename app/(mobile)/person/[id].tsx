import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPersonDetails } from '@/services/tmdb';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { BlurView } from 'expo-blur';

export default function PersonScreen() {
    const { colors: currentColors } = useTheme();
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
            <View style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={currentColors.primary} />
            </View>
        );
    }

    const credits = person.combined_credits?.cast || [];
    // Sort by popularity or release date
    const sortedCredits = credits.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

    const renderCredit = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.creditCard} 
            activeOpacity={0.7}
            onPress={() => router.push(`/details/${item.media_type}/${item.id}` as any)}
        >
            {item.poster_path ? (
                <Image
                    source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.poster_path}` }}
                    style={styles.creditPoster}
                />
            ) : (
                <View style={[styles.creditPoster, styles.placeholder, { backgroundColor: currentColors.card }]}>
                    <MaterialIcons name="movie" size={32} color={currentColors.textSecondary} />
                </View>
            )}
            <Text style={[styles.creditTitle, { color: currentColors.text }]} numberOfLines={2}>
                {item.title || item.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <SafeAreaView style={styles.headerSafeArea}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileSection}>
                    {person.profile_path ? (
                        <Image
                            source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${person.profile_path}` }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={[styles.profileImage, styles.placeholder, { backgroundColor: currentColors.card }]}>
                            <MaterialIcons name="person" size={80} color={currentColors.textSecondary} />
                        </View>
                    )}
                    <Text style={[styles.name, { color: currentColors.text }]}>{person.name}</Text>
                    {person.known_for_department && (
                        <Text style={[styles.department, { color: currentColors.textSecondary }]}>
                            {person.known_for_department}
                        </Text>
                    )}
                </View>

                {person.biography ? (
                    <View style={styles.bioSection}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Biography</Text>
                        <Text style={[styles.bioText, { color: currentColors.textSecondary }]}>
                            {person.biography}
                        </Text>
                    </View>
                ) : null}

                {sortedCredits.length > 0 && (
                    <View style={styles.creditsSection}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text, marginBottom: 16 }]}>Known For</Text>
                        <View style={styles.creditsGrid}>
                            {sortedCredits.map((item: any) => (
                                <View key={`${item.id}-${item.media_type}`} style={styles.gridItem}>
                                    {renderCredit({ item })}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        marginHorizontal: 16,
    },
    iconButton: {
        width: 44, 
        height: 44, 
        borderRadius: 22,
        justifyContent: 'center', 
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 8
    },
    content: {
        paddingTop: 100,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    profileImage: {
        width: 140,
        height: 210,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    department: {
        fontSize: 16,
    },
    bioSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    bioText: {
        fontSize: 15,
        lineHeight: 24,
    },
    creditsSection: {
        
    },
    creditsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '31%',
        marginBottom: 16,
    },
    creditCard: {
        width: '100%',
    },
    creditPoster: {
        width: '100%',
        aspectRatio: 2/3,
        borderRadius: 8,
        marginBottom: 8,
    },
    creditTitle: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    }
});
