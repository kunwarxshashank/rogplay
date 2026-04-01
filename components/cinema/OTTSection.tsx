import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { Colors } from '@/constants/Colors';
import { PROVIDERS, PROVIDER_LOGOS, PROVIDER_NAMES } from '@/constants/Providers';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';

function OTTSection({ onSelect }: { onSelect: (id: number, name: string) => void }) {
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.titleSection}>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>Platforms</Text>
                    <View style={[styles.indicator, { backgroundColor: currentColors.primary }]} />
                </View>
                {/* <TouchableOpacity>
                    <Text style={[styles.seeAll, { color: currentColors.primary }]}>See all</Text>
                </TouchableOpacity> */}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {Object.entries(PROVIDERS).map(([key, id]) => {
                    const providerId = id as number;
                    return (
                        <TVFocusable
                            key={providerId}
                            style={styles.tvItem}
                            onPress={() => onSelect(providerId, PROVIDER_NAMES[providerId])}
                            focusedScale={1.15}
                        >
                            {({ focused }: any) => (
                                <View style={styles.providerWrapper}>
                                    <View style={[
                                        styles.borderWrap,
                                        {
                                            borderColor: focused ? currentColors.primary : 'rgba(255,255,255,0.1)',
                                            borderWidth: 2,
                                        },
                                        focused && {
                                            shadowColor: currentColors.primary,
                                            shadowOffset: { width: 0, height: 12 },
                                            shadowOpacity: 0.6,
                                            shadowRadius: 15,
                                            elevation: 15,
                                        }
                                    ]}>
                                        <LinearGradient
                                            colors={focused ? [currentColors.primary, currentColors.accent || '#a855f7'] : ['transparent', 'transparent']}
                                            style={styles.gradientBorder}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <View style={styles.logoContainer}>
                                                <Image
                                                    source={PROVIDER_LOGOS[providerId]}
                                                    style={styles.logo}
                                                />
                                            </View>
                                        </LinearGradient>
                                    </View>
                                    <Text style={[
                                        styles.name,
                                        {
                                            color: focused ? currentColors.text : currentColors.textSecondary,
                                            fontFamily: focused ? 'Outfit_700Bold' : 'Outfit_500Medium',
                                        },
                                    ]} numberOfLines={1}>
                                        {PROVIDER_NAMES[providerId]}
                                    </Text>
                                    {focused && <View style={[styles.focusIndicator, { backgroundColor: currentColors.primary }]} />}
                                </View>
                            )}
                        </TVFocusable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Platform.isTV ? 40 : 20,
        marginBottom: 20,
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        marginRight: 8,
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    seeAll: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
    },
    scrollContent: {
        paddingHorizontal: Platform.isTV ? 40 : 15,
    },
    tvItem: {
        width: 100,
        marginRight: 5,
        height: 140,
    },
    providerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    borderWrap: {
        width: 70,
        height: 70,
        borderRadius: 40,
        overflow: 'hidden',
        padding: 2,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    gradientBorder: {
        flex: 1,
        borderRadius: 38,
        padding: 2,
    },
    logoContainer: {
        flex: 1,
        borderRadius: 36,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    logo: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    name: {
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
        width: '100%',
    },
    focusIndicator: {
        width: 20,
        height: 4,
        borderRadius: 2,
        marginTop: 6,
    }
});

export default React.memo(OTTSection);

