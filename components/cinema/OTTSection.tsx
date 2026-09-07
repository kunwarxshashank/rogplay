import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { Colors } from '@/constants/Colors';
import { PROVIDERS, PROVIDER_LOGOS, PROVIDER_NAMES } from '@/constants/Providers';
import { LinearGradient } from 'expo-linear-gradient';
import { TVFocusable } from '@/components/TVFocusable';
import { useTheme } from '@/hooks/useTheme';

function OTTSection({ onSelect }: { onSelect: (id: number, name: string) => void }) {
    const { colors: currentColors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.titleSection}>
                    <View style={[styles.titleBar, { backgroundColor: currentColors.primary }]} />
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>Platforms</Text>
                </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {Object.entries(PROVIDERS).map(([key, id]) => {
                    const providerId = id as number;
                    return (
                        <TVFocusable
                            key={providerId}
                            style={styles.tvItem}
                            onPress={() => onSelect(providerId, PROVIDER_NAMES[providerId])}
                            focusedScale={1.12}
                        >
                            {({ focused }: any) => (
                                <View style={styles.providerWrapper}>
                                    <View style={[
                                        styles.borderWrap,
                                        {
                                            borderColor: focused ? currentColors.primary : currentColors.border,
                                        },
                                        focused && {
                                            shadowColor: currentColors.primary,
                                            shadowOffset: { width: 0, height: 10 },
                                            shadowOpacity: 0.55,
                                            shadowRadius: 16,
                                            elevation: 15,
                                        }
                                    ]}>
                                        <LinearGradient
                                            colors={focused
                                                ? [currentColors.primary, currentColors.accent || '#a855f7']
                                                : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                                            style={styles.gradientBorder}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <View style={[styles.logoContainer, { backgroundColor: currentColors.isAmoled ? '#0a0a0a' : '#0e0e16' }]}>
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
        marginTop: 30,
        marginBottom: 32,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Platform.isTV ? 40 : 20,
        marginBottom: 18,
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    titleBar: {
        width: 4,
        height: 20,
        borderRadius: 2,
    },
    headerTitle: {
        fontSize: 21,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: -0.4,
    },
    seeAll: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
    },
    scrollContent: {
        paddingHorizontal: Platform.isTV ? 40 : 16,
        gap: Platform.isTV ? 5 : 4,
    },
    tvItem: {
        width: Platform.isTV ? 100 : 84,
        height: Platform.isTV ? 140 : 116,
    },
    providerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    borderWrap: {
        width: Platform.isTV ? 70 : 66,
        height: Platform.isTV ? 70 : 66,
        borderRadius: 22,
        overflow: 'hidden',
        padding: 1.5,
        borderWidth: 1.5,
    },
    gradientBorder: {
        flex: 1,
        borderRadius: 20,
        padding: 2,
    },
    logoContainer: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    name: {
        fontSize: 12.5,
        marginTop: 10,
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

