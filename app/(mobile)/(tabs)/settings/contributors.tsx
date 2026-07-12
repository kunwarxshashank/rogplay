import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useTheme } from '@/hooks/useTheme';
import { TVLayout } from '@/components/TVLayout';
import { TVFocusable } from '@/components/TVFocusable';
import { PlansModal } from '@/components/PlansModal';
import { useAuthStore } from '@/store/authStore';

const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

interface Contributor {
    _id: string;
    name: string;
}

export default function ContributorsScreen() {
    const { colors: currentColors } = useTheme();
    const router = useRouter();
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchContributors = async () => {
            try {
                const response = await axios.get(`${DB_BASEURL}/contributors`);
                setContributors(response.data);
            } catch (err) {
                console.error('Error fetching contributors:', err);
                setError('Failed to load contributors.');
            } finally {
                setLoading(false);
            }
        };

        fetchContributors();
    }, []);

    const renderItem = ({ item }: { item: Contributor }) => (
        <View style={[styles.card, { backgroundColor: currentColors.surface, borderColor: currentColors.primary + '1A' }]}>
            <View style={styles.cardInner}>
                <View style={[styles.avatarCircle, { backgroundColor: currentColors.primary + '1A' }]}>
                    <MaterialCommunityIcons name="crown" size={20} color={currentColors.primary} />
                </View>
                <Text style={[styles.name, { color: currentColors.text }]} numberOfLines={1}>
                    {item.name || 'Anonymous User'}
                </Text>
                <MaterialIcons name="workspace-premium" size={24} color={currentColors.primary} style={{ opacity: 0.8 }} />
            </View>
            <LinearGradient
                colors={[currentColors.primary + '80', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.goldLine}
            />
        </View>
    );

    const renderHeader = () => {
        if (user?.isPremium) return null;

        return (
            <TVFocusable onPress={() => setModalVisible(true)} style={styles.upgradeBannerWrapper}>
                <LinearGradient
                    colors={[currentColors.primary + '26', currentColors.primary + '0D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.upgradeBanner, { borderColor: currentColors.primary + '4D' }]}
                >
                    <View style={styles.upgradeBannerContent}>
                        <View style={[styles.upgradeIconCircle, { backgroundColor: currentColors.primary + '33' }]}>
                            <MaterialCommunityIcons name="star-shooting" size={24} color={currentColors.primary} />
                        </View>
                        <View style={styles.upgradeTextContainer}>
                            <Text style={[styles.upgradeTitle, { color: currentColors.text }]}>Support the Community</Text>
                            <Text style={[styles.upgradeSubtitle, { color: currentColors.textSecondary }]}>Upgrade your account to support app development and community.</Text>
                        </View>
                        <View style={[styles.upgradeButton, { backgroundColor: currentColors.primary }]}>
                            <Text style={styles.upgradeButtonText}>Upgrade</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TVFocusable>
        );
    };

    const renderContent = () => (
        <View style={styles.content}>
            {!Platform.isTV && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <View style={styles.titleWrapper}>
                        <Text style={[styles.title, { color: currentColors.text }]}>Premium Contributors</Text>
                        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>Our most valued supporters</Text>
                    </View>
                </View>
            )}

            {Platform.isTV && (
                <View style={styles.tvHeader}>
                    <Text style={[styles.title, { color: currentColors.text, fontSize: 32 }]}>Premium Contributors</Text>
                    <Text style={[styles.subtitle, { color: currentColors.textSecondary, fontSize: 16 }]}>Our most valued supporters</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <MaterialIcons name="error-outline" size={48} color={currentColors.error} />
                    <Text style={[styles.errorText, { color: currentColors.text }]}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={contributors}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    numColumns={Platform.isTV ? 2 : 1}
                    key={Platform.isTV ? 'tv-cols' : 'mobile-cols'}
                />
            )}

            <PlansModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                currentColors={currentColors}
            />
        </View>
    );

    if (Platform.isTV) {
        return (
            <TVLayout>
                <View style={{ flex: 1, backgroundColor: currentColors.background }}>
                    <LinearGradient
                        colors={[currentColors.primary + '0D', currentColors.background]}
                        locations={[0, 0.4]}
                        style={StyleSheet.absoluteFill}
                    />
                    {renderContent()}
                </View>
            </TVLayout>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <LinearGradient
                colors={[currentColors.primary + '0D', currentColors.background]}
                locations={[0, 0.3]}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }}>
                {renderContent()}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    tvHeader: {
        paddingHorizontal: 30,
        paddingTop: 40,
        paddingBottom: 20,
    },
    backBtn: {
        marginRight: 16,
    },
    titleWrapper: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        textAlign: 'center',
    },
    listContainer: {
        paddingHorizontal: Platform.isTV ? 30 : 20,
        paddingBottom: 40,
    },
    card: {
        flex: 1,
        marginVertical: 8,
        marginHorizontal: Platform.isTV ? 8 : 0,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        letterSpacing: 0.5,
    },
    goldLine: {
        height: 2,
        width: '30%',
    },
    upgradeBannerWrapper: {
        marginBottom: 20,
        borderRadius: 16,
        marginHorizontal: Platform.isTV ? 8 : 0,
    },
    upgradeBanner: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    upgradeBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    upgradeIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    upgradeTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    upgradeTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 4,
    },
    upgradeSubtitle: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        lineHeight: 16,
    },
    upgradeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    upgradeButtonText: {
        color: '#ffffff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
});
