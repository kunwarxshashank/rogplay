import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    interpolate,
    Extrapolate,
    SharedValue
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import * as Linking from 'expo-linking';

interface AddonsFTUEProps {
    onDismiss: () => void;
}

export function AddonsFTUE({ onDismiss }: AddonsFTUEProps) {
    const { colors: activeColors } = useTheme();
    const { width, height } = useWindowDimensions();

    const compactScreen = height < 760 || width < 380;

    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

    // Step animations
    const step1Opacity = useSharedValue(0);
    const step2Opacity = useSharedValue(0);
    const step3Opacity = useSharedValue(0);

    useEffect(() => {
        // Main container fade and slide up
        opacity.value = withTiming(1, { duration: 400 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 100 });

        // Staggered sequence for the steps
        step1Opacity.value = withDelay(400, withTiming(1, { duration: 500 }));
        step2Opacity.value = withDelay(800, withTiming(1, { duration: 500 }));
        step3Opacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    }, []);

    const containerStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }]
        };
    });

    const getStepStyle = (animValue: SharedValue<number>) => {
        return useAnimatedStyle(() => {
            return {
                opacity: animValue.value,
                transform: [
                    {
                        translateX: interpolate(
                            animValue.value,
                            [0, 1],
                            [-20, 0],
                            Extrapolate.CLAMP
                        )
                    }
                ]
            };
        });
    };

    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay, activeColors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
            {!activeColors.isAmoled && (
                <BlurView
                    intensity={70}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                    experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                />
            )}
            <Animated.View
                style={[
                    styles.container,
                    containerStyle,
                    {
                        width: Math.min(width * 0.90, 420),
                        maxHeight: Math.min(height * 0.85, 700),
                    }
                ]}
            >
                <ScrollView
                    bounces={false}
                    alwaysBounceVertical={false}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.content, { padding: 20 }]}>
                        <View style={[styles.header, { marginBottom: 16 }]}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    {
                                        backgroundColor: activeColors.primary + '20',
                                        width: 56,
                                        height: 56,
                                        borderRadius: 28,
                                        marginBottom: 12,
                                    }
                                ]}
                            >
                                <MaterialIcons name="extension" size={28} color={activeColors.primary} />
                            </View>
                            <Text style={[styles.title, { color: activeColors.text, fontSize: 22 }]}>Add Extensions</Text>
                            <Text style={[styles.subtitle, { color: activeColors.textSecondary, fontSize: 13, lineHeight: 18 }]}>
                                Enhance your experience by installing addons. Here's how:
                            </Text>
                        </View>

                        <View style={[styles.stepsContainer, { marginBottom: 20 }]}>
                            <Animated.View style={[styles.stepItem, getStepStyle(step1Opacity)]}>
                                <View style={[styles.stepNumber, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: activeColors.text, fontSize: 15 }]}>Tap the Add Button</Text>
                                    <Text style={[styles.stepDesc, { color: activeColors.textSecondary }]}>Look for the + button at the top right of the screen.</Text>
                                </View>
                                <MaterialIcons name="add-circle" size={20} color={activeColors.primary} />
                            </Animated.View>

                            <Animated.View style={[styles.stepItem, getStepStyle(step2Opacity)]}>
                                <View style={[styles.stepNumber, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: activeColors.text, fontSize: 15 }]}>Enter Addon URL</Text>
                                    <Text style={[styles.stepDesc, { color: activeColors.textSecondary }]}>Paste the provided JSON link or rogplay:// link into the input field.</Text>
                                </View>
                                <MaterialIcons name="link" size={20} color={activeColors.primary} />
                            </Animated.View>

                            <Animated.View style={[styles.stepItem, getStepStyle(step3Opacity)]}>
                                <View style={[styles.stepNumber, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: activeColors.text, fontSize: 15 }]}>Install</Text>
                                    <Text style={[styles.stepDesc, { color: activeColors.textSecondary }]}>Tap Install and you're ready to explore new content!</Text>
                                </View>
                                <MaterialIcons name="download-done" size={20} color={activeColors.primary} />
                            </Animated.View>
                        </View>

                        <Animated.View style={getStepStyle(step3Opacity)}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: activeColors.primary, paddingVertical: 12 }]}
                                onPress={onDismiss}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.buttonText, { fontSize: 16 }]}>Got it, Let's Go!</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View style={[getStepStyle(step3Opacity), { marginTop: 12, alignItems: 'center', paddingHorizontal: 4 }]}>
                            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: activeColors.textSecondary, textAlign: 'center', lineHeight: 14 }}>
                                By using the app & addons, you acknowledge that you are solely responsible for the content you access. We do not host any addons or media content.
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL('https://rogplay.github.io/addonspolicy.html')} style={{ marginTop: 4 }} activeOpacity={0.7}>
                                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: activeColors.primary, textDecorationLine: 'underline' }}>Privacy Policy</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        backgroundColor: 'rgba(15, 20, 36, 0.95)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        lineHeight: 24,
    },
    stepsContainer: {
        gap: 16,
        marginBottom: 28,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    stepItemCompact: {
        padding: 10,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 12,
    },
    stepContent: {
        flex: 1,
        marginRight: 12,
    },
    stepTitle: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        lineHeight: 16,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 20,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
    }
});
