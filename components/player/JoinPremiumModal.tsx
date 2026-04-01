import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    Pressable,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const isTV = Platform.isTV;

interface JoinPremiumModalProps {
    visible: boolean;
    onClose: () => void;
    onUpgrade?: () => void;
}

/** TV-friendly Pressable with focus styling */
function FocusablePressable({ style, focusedStyle, children, ...props }: any) {
    const [isFocused, setIsFocused] = useState(false);
    if (!isTV) {
        return (
            <TouchableOpacity activeOpacity={0.75} {...props} style={style}>
                {children}
            </TouchableOpacity>
        );
    }
    return (
        <Pressable
            focusable
            isTVSelectable
            accessible
            {...props}
            onFocus={(e: any) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e: any) => { setIsFocused(false); props.onBlur?.(e); }}
            style={[style, isFocused && focusedStyle]}
        >
            {children}
        </Pressable>
    );
}

/** Return rgba with custom alpha from a hex color */
function hexAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const FEATURES = [
    { icon: 'groups', label: 'Watch Party — watch with friends in real-time' },
    { icon: 'hd', label: 'Premium quality streaming' },
    { icon: 'speed', label: 'Priority server access' },
    { icon: 'support-agent', label: 'Priority support' },
];

export default function JoinPremiumModal({ visible, onClose, onUpgrade }: JoinPremiumModalProps) {
    const { theme } = useSettingsStore();
    const router = useRouter();
    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients?.primary || [c.primary, c.accent || c.primary];
    const premiumGradients = c.gradients?.premium || ['#f59e0b', '#fbbf24', '#f59e0b'];

    const focusedStyle = {
        borderColor: c.primary,
        shadowColor: c.primary,
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
        transform: [{ scale: 1.03 }],
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={s.backdrop}>
                <View style={[s.modal, { backgroundColor: c.surface || '#0d111b', borderColor: hexAlpha(c.primary, 0.2) }]}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={[s.iconCircle, { backgroundColor: hexAlpha('#fbbf24', 0.1), borderColor: hexAlpha('#fbbf24', 0.2) }]}>
                            <MaterialCommunityIcons name="crown" size={isTV ? 32 : 26} color="#fbbf24" />
                        </View>
                        <FocusablePressable
                            onPress={onClose}
                            style={[s.closeBtn, { borderColor: 'transparent' }]}
                            focusedStyle={{ borderColor: c.primary, backgroundColor: hexAlpha(c.primary, 0.15) }}
                        >
                            <MaterialIcons name="close" size={isTV ? 28 : 22} color={c.textMuted || '#64748b'} />
                        </FocusablePressable>
                    </View>

                    {/* Title */}
                    <Text style={[s.title, { color: c.text || '#fff' }]}>
                        Premium Feature
                    </Text>
                    <Text style={[s.subtitle, { color: c.textSecondary || '#94a3b8' }]}>
                        Watch Party is available exclusively for Premium members. Upgrade now to enjoy watching together with friends!
                    </Text>

                    {/* Features */}
                    <View style={s.featuresContainer}>
                        {FEATURES.map((feature, index) => (
                            <View key={index} style={s.featureRow}>
                                <View style={[s.featureIcon, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                                    <MaterialIcons name={feature.icon as any} size={isTV ? 22 : 18} color={c.primary} />
                                </View>
                                <Text style={[s.featureText, { color: c.textSecondary || '#d1d5db' }]}>
                                    {feature.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Upgrade Button */}
                    <FocusablePressable
                        onPress={() => {
                            onClose();
                            if (onUpgrade) {
                                onUpgrade();
                            } else {
                                // Default redirect to profile
                                router.push(isTV ? '/(tv)/account' : '/settings/account');
                            }
                        }}
                        style={s.upgradeBtn}
                        focusedStyle={{
                            borderColor: '#fbbf24',
                            transform: [{ scale: 1.03 }],
                            shadowColor: '#fbbf24',
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 6,
                        }}
                    >
                        <LinearGradient
                            colors={gradients}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.upgradeBtnGradient}
                        >
                            <MaterialCommunityIcons name="crown" size={isTV ? 24 : 20} color="#fbbf24" />
                            <Text style={s.upgradeBtnText}>
                                Upgrade to Premium
                            </Text>
                        </LinearGradient>
                    </FocusablePressable>

                    {/* Dismiss */}
                    <FocusablePressable
                        onPress={onClose}
                        style={[s.dismissBtn, { borderColor: 'transparent' }]}
                        focusedStyle={{
                            borderColor: hexAlpha(c.textMuted || '#64748b', 0.4),
                            backgroundColor: hexAlpha(c.textMuted || '#64748b', 0.06),
                        }}
                    >
                        <Text style={[s.dismissBtnText, { color: c.textMuted || '#6b7280' }]}>
                            Maybe Later
                        </Text>
                    </FocusablePressable>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: isTV ? 540 : '90%',
        maxWidth: isTV ? 540 : 420,
        borderRadius: isTV ? 28 : 22,
        padding: isTV ? 32 : 22,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isTV ? 20 : 14,
    },
    iconCircle: {
        width: isTV ? 60 : 50,
        height: isTV ? 60 : 50,
        borderRadius: isTV ? 20 : 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    closeBtn: {
        padding: isTV ? 10 : 6,
        borderRadius: isTV ? 14 : 10,
        borderWidth: 2,
    },
    title: {
        fontSize: isTV ? 28 : 21,
        fontWeight: '800',
        marginBottom: isTV ? 10 : 6,
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: isTV ? 17 : 13,
        lineHeight: isTV ? 26 : 19,
        marginBottom: isTV ? 24 : 18,
    },
    featuresContainer: {
        gap: isTV ? 14 : 10,
        marginBottom: isTV ? 28 : 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isTV ? 14 : 10,
    },
    featureIcon: {
        width: isTV ? 42 : 34,
        height: isTV ? 42 : 34,
        borderRadius: isTV ? 12 : 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: isTV ? 16 : 13,
        flex: 1,
        fontWeight: '500',
    },
    upgradeBtn: {
        borderRadius: isTV ? 16 : 14,
        overflow: 'hidden',
        marginBottom: isTV ? 14 : 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    upgradeBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: isTV ? 18 : 14,
        gap: isTV ? 12 : 8,
    },
    upgradeBtnText: {
        color: '#fff',
        fontSize: isTV ? 20 : 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    dismissBtn: {
        alignItems: 'center',
        paddingVertical: isTV ? 14 : 10,
        borderRadius: isTV ? 14 : 12,
        borderWidth: 2,
    },
    dismissBtnText: {
        fontSize: isTV ? 17 : 14,
        fontWeight: '600',
    },
});
