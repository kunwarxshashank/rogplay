import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialIcons } from '@expo/vector-icons';
import { useIptvStore } from '@/store/iptvStore'; // Reusing store or create new logic?
import { useTheme } from '@/hooks/useTheme';
// Assuming simpler logic for just playing a URL

export default function TVNetworkStreamScreen() {
    const { colors: activeColors } = useTheme();
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handlePlay = () => {
        if (!url) {
            Alert.alert('Error', 'Please enter a stream URL');
            return;
        }
        router.push({
            pathname: '/(tv)/player',
            params: { url: url, title: 'Network Stream' }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: activeColors.text }]}>Network Stream</Text>

                <View style={styles.form}>
                    <TVFocusable
                        style={[
                            styles.inputContainer,
                            {
                                backgroundColor: activeColors.card,
                                borderColor: isFocused ? activeColors.primary : activeColors.border,
                                borderWidth: isFocused ? 2 : 1
                            }
                        ]}
                        onPress={() => { }}
                    >
                        <TextInput
                            style={[styles.input, { color: activeColors.text }]}
                            placeholder="Enter Stream URL (M3U8, MP4, MKV...)"
                            placeholderTextColor={activeColors.textSecondary}
                            value={url}
                            onChangeText={setUrl}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            autoCapitalize="none"
                        />
                    </TVFocusable>

                    <TVFocusable
                        style={[styles.playButton, { backgroundColor: activeColors.primary }]}
                        onPress={handlePlay}
                    >
                        <View style={styles.buttonContent}>
                            <MaterialIcons name="play-arrow" size={32} color="white" />
                            <Text style={styles.buttonText}>Play</Text>
                        </View>
                    </TVFocusable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingTop: 100,
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 60,
    },
    form: {
        width: '100%',
        maxWidth: 600,
        gap: 30,
    },
    inputContainer: {
        height: 70,
        borderRadius: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    input: {
        fontSize: 20,
        width: '100%',
        height: '100%',
    },
    playButton: {
        height: 70,
        borderRadius: 16,
    },
    buttonContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    }
});
