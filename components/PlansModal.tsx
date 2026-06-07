import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform, ScrollView } from 'react-native';
import { Colors, Layout } from '@/constants/Colors';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TVFocusable } from '@/components/TVFocusable';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuthStore } from '@/store/authStore';

const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;
const rzp_key = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;

interface PlansModalProps {
    visible: boolean;
    onClose: () => void;
    currentColors: any;
}

const PLANS = [
    {
        title: 'Starter',
        price: '1$',
        amount: 1,
        days: 30
    },
    {
        title: 'Premium',
        price: '2$',
        amount: 2,
        days: 90,
        popular: true
    },
    {
        title: 'Ultimate',
        price: '5$',
        amount: 5,
        days: 360
    },
];

const RUPEEPLANS = [
    {
        title: 'Starter',
        price: '₹79',
        amount: 79,
        days: 30
    },
    {
        title: 'Premium',
        price: '₹199',
        amount: 199,
        days: 90,
        popular: true
    },
    {
        title: 'Ultimate',
        price: '₹499',
        amount: 499,
        days: 360
    },
];

export const PlansModal: React.FC<PlansModalProps> = ({ visible, onClose, currentColors }) => {
    const { user, token } = useAuthStore();
    const [isRupees, setIsRupees] = useState(false);

    const activePlans = isRupees ? RUPEEPLANS : PLANS;

    const handlePayment = (amount: number, validityInDays: number) => {
        if (!user?.email) {
            Alert.alert('Login Required', 'Please log in to purchase a subscription.');
            return;
        }

        if (!RazorpayCheckout) {
            Alert.alert(
                'Module Missing',
                'Payment module unavailable. Development Build required for Razorpay.'
            );
            return;
        }

        const options = {
            description: 'RogPlay Premium Subscription',
            image: 'https://cdn-icons-png.flaticon.com/512/3541/3541871.png',
            currency: isRupees ? 'INR' : 'USD',
            key: rzp_key,
            amount: amount * 100,
            name: 'RogPlay',
            prefill: {
                email: user.email,
                name: user.name,
            },
            theme: { color: currentColors.primary },
        };

        RazorpayCheckout.open(options)
            .then((data: any) => {
                updatePaymentStatus(amount, validityInDays, data.razorpay_payment_id);
            })
            .catch((error: any) => {
                const errorMsg = error.description || (error.code ? `Error: ${error.code}` : 'Transaction cancelled');
                Alert.alert('Payment Failed', errorMsg);
            });
    };

    const updatePaymentStatus = async (amount: number, validityInDays: number, paymentId: string) => {
        try {
            const validityEndDate = new Date();
            validityEndDate.setDate(validityEndDate.getDate() + validityInDays);

            const response = await axios.post(`${DB_BASEURL}/payment`, {
                email: user?.email,
                paymentId,
                amount,
                status: 'success',
                ispremium: true,
                validityInDays,
                subscriptionStart: new Date(),
                subscriptionEnd: validityEndDate,
            });

            if (response.status === 200) {
                const updatedUser = {
                    ...user!,
                    isPremium: true,
                    subscriptionEnd: validityEndDate.toISOString(),
                };
                useAuthStore.getState().setAuth(token!, updatedUser);
                Alert.alert('Welcome to Premium!', 'Your features are now unlocked. Enjoy your ad-free experience!');
                onClose();
            }
        } catch (error) {
            Alert.alert('Error', 'Payment verified but account update failed. Our team will verify it manually.');
        }
    };

    const renderPlanCard = (plan: typeof PLANS[0], idx: number) => {
        const isTV = Platform.isTV;

        return (
            <TVFocusable
                key={idx}
                style={[
                    styles.planCardContainer,
                    { width: isTV ? '90%' : '100%' }
                ]}
                onPress={() => handlePayment(plan.amount, plan.days)}
            >
                {({ focused }) => (
                    <LinearGradient
                        colors={focused
                            ? [currentColors.primary + '33', currentColors.primary + '11']
                            : [currentColors.card + '88', currentColors.card + '44']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                            styles.planCard,
                            { borderColor: focused ? currentColors.primary : currentColors.border + '44' },
                            plan.popular && !focused && { borderColor: currentColors.primary + '66' }
                        ]}
                    >
                        {plan.popular && (
                            <View style={[styles.popularTag, { backgroundColor: currentColors.primary }]}>
                                <Text style={styles.popularTagText}>MOST POPULAR</Text>
                            </View>
                        )}

                        <View style={styles.cardLeft}>
                            <View style={[styles.statusDot, { backgroundColor: plan.popular ? currentColors.primary : currentColors.textSecondary }]} />
                            <View>
                                <Text style={[styles.planTitle, { color: currentColors.text }]}>{plan.title}</Text>
                                <View style={[styles.durationPill, { backgroundColor: currentColors.background + '88' }]}>
                                    <Text style={[styles.durationText, { color: currentColors.textSecondary }]}>{plan.days} DAYS ACCESS</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardRight}>
                            <View style={styles.priceContainer}>
                                <Text style={[styles.priceCurrency, { color: currentColors.primary }]}>
                                    {isRupees ? '₹' : '$'}
                                </Text>
                                <Text style={[styles.priceValue, { color: currentColors.text }]}>{plan.amount}</Text>
                            </View>
                            <View style={[styles.actionCircle, { backgroundColor: focused ? currentColors.primary : currentColors.border + '88' }]}>
                                <MaterialIcons
                                    name={focused ? "check" : "chevron-right"}
                                    size={20}
                                    color={focused ? "#fff" : currentColors.textSecondary}
                                />
                            </View>
                        </View>
                    </LinearGradient>
                )}
            </TVFocusable>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                <View style={[styles.modalContent, { backgroundColor: currentColors.background, borderColor: currentColors.border }]}>

                    <View style={styles.modalHeader}>
                        <View style={styles.headerGlow} />
                        <View style={styles.headerContent}>
                            <View style={styles.crownContainer}>
                                <LinearGradient
                                    colors={['#FFD700', '#FFA500']}
                                    style={styles.crownCircle}
                                >
                                    <MaterialCommunityIcons name="crown" size={32} color="#fff" />
                                </LinearGradient>
                                <View style={[styles.crownPulse, { backgroundColor: '#FFD70044' }]} />
                            </View>

                            <Text style={[styles.modalTitle, { color: '#fff' }]}>Upgrade Your Experience</Text>
                            <Text style={[styles.modalSubtitle, { color: currentColors.textSecondary }]}>
                                Support Development & Community to Add Cool Features & Building Awesome Addons For You.
                            </Text>

                            <View style={styles.currencyToggle}>
                                <TouchableOpacity
                                    onPress={() => setIsRupees(false)}
                                    style={[styles.toggleBtn, !isRupees && { backgroundColor: currentColors.primary }]}
                                >
                                    <Text style={[styles.toggleText, { color: !isRupees ? '#fff' : currentColors.textSecondary }]}>USD</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setIsRupees(true)}
                                    style={[styles.toggleBtn, isRupees && { backgroundColor: currentColors.primary }]}
                                >
                                    <Text style={[styles.toggleText, { color: isRupees ? '#fff' : currentColors.textSecondary }]}>INR</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <View style={[styles.closeCircle, { backgroundColor: currentColors.border }]}>
                                <MaterialIcons name="close" size={20} color={currentColors.text} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.plansList}>
                        {activePlans.map((plan, idx) => renderPlanCard(plan, idx))}
                    </View>

                    <View style={styles.footerSection}>
                        <View style={[styles.secureBadge, { borderColor: currentColors.border + '44' }]}>
                            <MaterialIcons name="security" size={14} color={currentColors.primary} />
                            <Text style={[styles.secureText, { color: currentColors.textSecondary }]}>SECURE ENCRYPTED PAYMENT</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: Platform.isTV ? '60%' : '92%',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...Layout.shadows.xl,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 32,
        paddingTop: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerGlow: {
        position: 'absolute',
        top: -100,
        width: 200,
        height: 200,
        backgroundColor: '#6366f133',
        borderRadius: 100,
        filter: 'blur(50px)',
    },
    crownContainer: {
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    crownCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...Layout.shadows.md,
    },
    crownPulse: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        zIndex: -1,
    },
    modalTitle: {
        fontSize: 26,
        fontFamily: 'Outfit_700Bold',
        textAlign: 'center',
        includeFontPadding: false,
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: 'Outfit_400Regular',
        textAlign: 'center',
        marginTop: 6,
        opacity: 0.8,
        maxWidth: '80%',
    },
    closeBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    closeCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    currencyToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    toggleBtn: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 8,
    },
    toggleText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
    },
    plansList: {
        gap: 14,
    },
    planCardContainer: {
        height: 76,
        alignSelf: 'center',
    },
    planCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 20,
        paddingHorizontal: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    popularTag: {
        position: 'absolute',
        top: 0,
        right: 40,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    popularTagText: {
        color: '#fff',
        fontSize: 9,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    planTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        includeFontPadding: false,
    },
    durationPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    durationText: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
    },
    cardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    priceCurrency: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        marginTop: 2,
    },
    priceValue: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        includeFontPadding: false,
    },
    actionCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerSection: {
        marginTop: 32,
        alignItems: 'center',
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
    },
    secureText: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1,
    },
    footerNote: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 11,
        fontFamily: 'Outfit_400Regular',
        opacity: 0.8,
    },
});
