import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import axios from 'axios';

const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

interface Transaction {
    _id: string;
    paymentId: string;
    amount: number;
    status: string;
    subscriptionStart: string;
    subscriptionEnd: string;
    createdAt: string;
}

interface TransactionHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    currentColors: any;
    userEmail: string;
}

export function TransactionHistoryModal({ visible, onClose, currentColors, userEmail }: TransactionHistoryModalProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && userEmail) {
            fetchTransactions();
        }
    }, [visible, userEmail]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${DB_BASEURL}/transactions`, { email: userEmail });
            setTransactions(response.data);
        } catch (err) {
            setError('Failed to load transaction history.');
            console.error('Transaction history error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const renderItem = ({ item }: { item: Transaction }) => {
        const isSuccess = item.status === 'success';

        return (
            <View style={[styles.transactionCard, { backgroundColor: currentColors.surface }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: isSuccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                            <MaterialIcons name={isSuccess ? 'check-circle' : 'error'} size={20} color={isSuccess ? '#22c55e' : '#ef4444'} />
                        </View>
                        <Text style={[styles.amountText, { color: currentColors.text }]}>
                            Amount: {item.amount}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isSuccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: isSuccess ? '#22c55e' : '#ef4444' }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={[styles.label, { color: currentColors.textSecondary }]}>Date</Text>
                    <Text style={[styles.value, { color: currentColors.text }]}>{formatDate(item.createdAt || item.subscriptionStart)}</Text>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={[styles.label, { color: currentColors.textSecondary }]}>Payment ID</Text>
                    <Text style={[styles.value, { color: currentColors.text }]} selectable>{item.paymentId}</Text>
                </View>

                {isSuccess && (
                    <View style={styles.detailsRow}>
                        <Text style={[styles.label, { color: currentColors.textSecondary }]}>Valid Until</Text>
                        <Text style={[styles.value, { color: currentColors.text }]}>{formatDate(item.subscriptionEnd)}</Text>
                    </View>
                )}
            </View>
        );
    };

    const content = (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: currentColors.text }]}>Transaction History</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={currentColors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <MaterialIcons name="error-outline" size={48} color={currentColors.error} />
                    <Text style={[styles.errorText, { color: currentColors.text }]}>{error}</Text>
                    <TouchableOpacity style={[styles.retryBtn, { backgroundColor: currentColors.primary }]} onPress={fetchTransactions}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : transactions.length === 0 ? (
                <View style={styles.centerContainer}>
                    <MaterialIcons name="receipt-long" size={64} color={currentColors.textSecondary} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>No transactions found.</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item._id || item.paymentId}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            {currentColors.isAmoled ? (
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    {content}
                </View>
            ) : (
                <BlurView intensity={100} tint="dark" style={{ flex: 1 }}>
                    {content}
                </BlurView>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.isTV ? 40 : 20,
    },
    backButton: {
        marginRight: 15,
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        marginTop: 12,
        marginBottom: 20,
        textAlign: 'center',
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryBtnText: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        marginTop: 16,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    transactionCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    amountText: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    value: {
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
    },
});
