import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Alert, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useIptvStore, IptvPlaylist } from '@/store/iptvStore';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';

function useIptvLogic() {
    const [title, setTitle] = useState('');
    const [m3uUrl, setM3uUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { playlists, addPlaylist, removePlaylist } = useIptvStore();
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;

    const handlePickFile = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
            if (res.canceled) return;

            const file = res.assets[0];
            const fileName = `${Date.now()}_${file.name}`;
            const destinationPath = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.copyAsync({
                from: file.uri,
                to: destinationPath
            });

            addPlaylist({
                title: title.trim() || file.name.replace('.m3u', ''),
                url: destinationPath,
                type: 'local'
            });
            setTitle('');
            setM3uUrl('');
            Alert.alert('Success', 'Playlist added from file');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleAddUrl = () => {
        if (!m3uUrl.trim()) {
            Alert.alert('Error', 'Please enter a valid M3U URL');
            return;
        }

        addPlaylist({
            title: title.trim() || 'IPTV Playlist',
            url: m3uUrl,
            type: 'remote'
        });
        setTitle('');
        setM3uUrl('');
        Alert.alert('Success', 'Playlist added successfully');
    };

    const handlePlaylistPress = (item: IptvPlaylist) => {
        // Navigate to stream list with playlist params
        // Assuming addon-browser or dedicated iptv player
        router.push({
            pathname: '/(tv)/addon-browser',
            params: {
                title: item.title,
                url: item.url,
                type: 'iptv'
            }
        });
    };

    return {
        title, setTitle, m3uUrl, setM3uUrl, loading, router, playlists, addPlaylist, removePlaylist,
        activeColors, handlePickFile, handleAddUrl, handlePlaylistPress
    };
}

export default function TVIptvScreen() {
    const {
        title, setTitle, m3uUrl, setM3uUrl, playlists, removePlaylist,
        activeColors, handlePickFile, handleAddUrl, handlePlaylistPress
    } = useIptvLogic();

    const [isUrlFocused, setIsUrlFocused] = useState(false);
    const [isTitleFocused, setIsTitleFocused] = useState(false);

    const renderAddon = ({ item }: { item: IptvPlaylist }) => (
        <View style={[styles.addonCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            <TVFocusable
                style={styles.addonMainArea}
                onPress={() => handlePlaylistPress(item)}
                onLongPress={() => Alert.alert('Remove Playlist?', `Remove ${item.title}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', onPress: () => removePlaylist(item.id) }
                ])}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '15' }]}>
                        <MaterialIcons name={item.type === 'local' ? "insert-drive-file" : "tv"} size={28} color={activeColors.primary} />
                    </View>
                    <View style={[styles.addonInfo, { marginLeft: 20 }]}>
                        <Text style={[styles.addonName, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.addonType, { color: activeColors.textSecondary }]} numberOfLines={1}>
                            {item.type === 'local' ? 'Local M3U' : item.url}
                        </Text>
                    </View>
                </View>
            </TVFocusable>
            <TVFocusable
                style={styles.cardDeleteBtn}
                onFocus={() => { }} // Optional: provide feedback
                onPress={() => Alert.alert('Remove Playlist?', `Remove ${item.title}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', onPress: () => removePlaylist(item.id) }
                ])}
            >
                <MaterialIcons name="delete-outline" size={24} color={activeColors.error} />
            </TVFocusable>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <View>
                        <Text style={{ color: activeColors.textSecondary, fontSize: 16 }}>{playlists.length} saved</Text>
                    </View>
                </View>

                <View style={styles.addSection}>
                    <View style={styles.inputRow}>
                        <TVFocusable
                            style={[
                                styles.inputWrapper,
                                {
                                    backgroundColor: activeColors.card,
                                    borderColor: isTitleFocused ? activeColors.primary : activeColors.border,
                                    borderWidth: isTitleFocused ? 2 : 1
                                }
                            ]}
                            onPress={() => { }}
                        >
                            <TextInput
                                style={[styles.textInput, { color: activeColors.text }]}
                                placeholder="Playlist Title"
                                placeholderTextColor={activeColors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                onFocus={() => setIsTitleFocused(true)}
                                onBlur={() => setIsTitleFocused(false)}
                            />
                        </TVFocusable>
                        <TVFocusable
                            style={[styles.iconBtn, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                            onPress={handlePickFile}
                        >
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <MaterialIcons name="attach-file" size={28} color={activeColors.text} />
                            </View>
                        </TVFocusable>
                    </View>

                    <View style={styles.inputRow}>
                        <TVFocusable
                            style={[
                                styles.inputWrapper,
                                {
                                    backgroundColor: activeColors.card,
                                    borderColor: isUrlFocused ? activeColors.primary : activeColors.border,
                                    borderWidth: isUrlFocused ? 2 : 1
                                }
                            ]}
                            onPress={() => { }}
                        >
                            <TextInput
                                style={[styles.textInput, { color: activeColors.text }]}
                                placeholder="Paste M3U URL here..."
                                placeholderTextColor={activeColors.textSecondary}
                                value={m3uUrl}
                                onChangeText={setM3uUrl}
                                onFocus={() => setIsUrlFocused(true)}
                                onBlur={() => setIsUrlFocused(false)}
                            />
                        </TVFocusable>
                        <TVFocusable
                            style={[styles.iconBtn, { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}
                            onPress={handleAddUrl}
                        >
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <MaterialIcons name="add" size={32} color="#fff" />
                            </View>
                        </TVFocusable>
                    </View>
                </View>

                <FlatList
                    data={playlists}
                    renderItem={renderAddon}
                    keyExtractor={(item) => item.id}
                    numColumns={Platform.isTV ? 3 : 2}
                    columnWrapperStyle={{ gap: 20 }}
                    contentContainerStyle={styles.list}
                />
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
        paddingTop: 100, // Top Bar
        paddingHorizontal: 40,
    },
    header: {
        marginBottom: 30,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    addSection: {
        marginBottom: 30,
        maxWidth: 800,
        gap: 20,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 20,
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 18,
        width: '100%',
        height: '100%',
    },
    iconBtn: {
        width: 60,
        height: 60,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingBottom: 50,
    },
    addonCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    cardDeleteBtn: {
        padding: 12,
        borderRadius: 12,
        marginLeft: 10,
    },
    addonMainArea: {
        flex: 1,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addonInfo: {
        marginLeft: 20,
        flex: 1,
    },
    addonName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    addonType: {
        fontSize: 14,
    }
});
