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
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

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
                        width: Math.min(width * 0.92, 760),
                        maxHeight: Math.min(height * 0.9, 820),
                    }
                ]}
            >
                <ScrollView
                    bounces={false}
                    alwaysBounceVertical={false}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.content, { padding: compactScreen ? 20 : 28 }]}> 
                        <View style={[styles.header, { marginBottom: compactScreen ? 20 : 28 }]}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    {
                                        backgroundColor: activeColors.primary + '20',
                                        width: compactScreen ? 64 : 80,
                                        height: compactScreen ? 64 : 80,
                                        borderRadius: compactScreen ? 32 : 40,
                                        marginBottom: compactScreen ? 14 : 20,
                                    }
                                ]}
                            >
                                <MaterialIcons name="extension" size={compactScreen ? 28 : 32} color={activeColors.primary} />
                            </View>
                            <Text style={[styles.title, { color: activeColors.text, fontSize: compactScreen ? 24 : 28 }]}>Add Extensions</Text>
                            <Text style={[styles.subtitle, { color: activeColors.textSecondary, fontSize: compactScreen ? 14 : 16, lineHeight: compactScreen ? 21 : 24 }]}>
                                Enhance your experience by installing community addons. Here's how:
                            </Text>
                        </View>

                        <View style={[styles.stepsContainer, { marginBottom: compactScreen ? 20 : 28 }]}> 
                            <Animated.View style={[styles.stepItem, getStepStyle(step1Opacity), compactScreen && styles.stepItemCompact]}>
                                <View style={[styles.stepNumber, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: activeColors.text, fontSize: compactScreen ? 16 : 18 }]}>Tap the Add Button</Text>
                                    <Text style={[styles.stepDesc, { color: activeColors.textSecondary }]}>Look for the + button at the top right of the screen.</Text>
                                </View>
                                <MaterialIcons name="add-circle" size={compactScreen ? 22 : 24} color={activeColors.primary} />
                            </Animated.View>

                            <Animated.View style={[styles.stepItem, getStepStyle(step2Opacity), compactScreen && styles.stepItemCompact]}>
                                <View style={[styles.stepNumber, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: activeColors.text, fontSize: compactScreen ? 16 : 18 }]}>Enter Addon URL</Text>
                                    <Text style={[styles.stepDesc, { color: activeColors.textSecondary }]}>Paste the provided JSON link or rogplay:// link into the input field.</Text>
                                </View>
                                <MaterialIcons name="link" size={compactScreen ? 22 : 24} color={activeColors.primary} />
                            </Animated.View>

                            <Animated.View style={[styles.stepItem, getStepStyle(step3Opacity), compactScreen && styles.stepItemCompact]}>
                                <View style={[styles.stepNumber, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: activeColors.text, fontSize: compactScreen ? 16 : 18 }]}>Install</Text>
                                    <Text style={[styles.stepDesc, { color: activeColors.textSecondary }]}>Tap Install and you're ready to explore new content!</Text>
                                </View>
                                <MaterialIcons name="download-done" size={compactScreen ? 22 : 24} color={activeColors.primary} />
                            </Animated.View>
                        </View>

                        <Animated.View style={getStepStyle(step3Opacity)}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: activeColors.primary, paddingVertical: compactScreen ? 14 : 16 }]}
                                onPress={onDismiss}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.buttonText, { fontSize: compactScreen ? 16 : 18 }]}>Got it, Let's Go!</Text>
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
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    stepItemCompact: {
        padding: 12,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    stepNumberText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
    stepContent: {
        flex: 1,
        marginRight: 16,
    },
    stepTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 4,
    },
    stepDesc: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        lineHeight: 18,
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
