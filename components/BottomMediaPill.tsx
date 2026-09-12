import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { BlurView } from 'expo-blur';

interface BottomMediaPillProps {
    activeTab: 'videos' | 'music';
}

export default function BottomMediaPill({ activeTab }: BottomMediaPillProps) {
    const router = useRouter();
    const { colors: currentColors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.pillContainer, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                <TouchableOpacity
                    onPress={() => {
                        if (activeTab !== 'videos') router.navigate('/(mobile)/(tabs)/');
                    }}
                    style={[
                        styles.tabBtn,
                        activeTab === 'videos' ? { backgroundColor: currentColors.primary } : null
                    ]}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'videos' ? '#fff' : currentColors.textSecondary }
                    ]}>Videos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        if (activeTab !== 'music') router.navigate('/(mobile)/(tabs)/local-music');
                    }}
                    style={[
                        styles.tabBtn,
                        activeTab === 'music' ? { backgroundColor: currentColors.primary } : null
                    ]}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'music' ? '#fff' : currentColors.textSecondary }
                    ]}>Music</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 110 : 95,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
        pointerEvents: 'box-none'
    },
    pillContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    tabBtn: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tabText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
    }
});
