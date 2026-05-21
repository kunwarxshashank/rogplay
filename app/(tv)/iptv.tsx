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

/** Build the Xtreme Codes m3u_plus URL from credentials */
function buildXtremeM3uUrl(server: string, username: string, password: string): string {
    const base = server.endsWith('/') ? server.slice(0, -1) : server;
    return `${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
}

type AddTab = 'm3u' | 'xtreme';

function useIptvLogic() {
    const [addTab, setAddTab] = useState<AddTab>('m3u');
    const [title, setTitle] = useState('');
    const [m3uUrl, setM3uUrl] = useState('');
    const [xtremeServer, setXtremeServer] = useState('');
    const [xtremeUsername, setXtremeUsername] = useState('');
    const [xtremePassword, setXtremePassword] = useState('');
    const [xtremeIsDirectUrl, setXtremeIsDirectUrl] = useState(false);
    const [xtremeDirectUrl, setXtremeDirectUrl] = useState('');
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
            await FileSystem.copyAsync({ from: file.uri, to: destinationPath });
            addPlaylist({ title: title.trim() || file.name.replace('.m3u', ''), url: destinationPath, type: 'local' });
            setTitle(''); setM3uUrl('');
            Alert.alert('Success', 'Playlist added from file');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleAddUrl = () => {
        if (!m3uUrl.trim()) { Alert.alert('Error', 'Please enter a valid M3U URL'); return; }
        addPlaylist({ title: title.trim() || 'IPTV Playlist', url: m3uUrl.trim(), type: 'remote' });
        setTitle(''); setM3uUrl('');
        Alert.alert('Success', 'Playlist added successfully');
    };

    const handleAddXtreme = () => {
        let finalUrl = '';
        let finalUsername = '';
        let finalServer = '';
        let finalPassword = '';

        if (xtremeIsDirectUrl) {
            if (!xtremeDirectUrl.trim()) { Alert.alert('Error', 'Please enter a direct Xtreme Codes URL'); return; }
            finalUrl = xtremeDirectUrl.trim();
            try {
                const parsedUrl = new URL(finalUrl);
                finalServer = parsedUrl.origin;
                finalUsername = parsedUrl.searchParams.get('username') || 'Direct API';
                finalPassword = parsedUrl.searchParams.get('password') || '';
            } catch (e) {
                const userMatch = finalUrl.match(/[?&]username=([^&]+)/i);
                finalUsername = userMatch ? decodeURIComponent(userMatch[1]) : 'Direct API';
                const passMatch = finalUrl.match(/[?&]password=([^&]+)/i);
                finalPassword = passMatch ? decodeURIComponent(passMatch[1]) : '';
            }
        } else {
            if (!xtremeServer.trim()) { Alert.alert('Error', 'Please enter the server URL'); return; }
            if (!xtremeUsername.trim() || !xtremePassword.trim()) { Alert.alert('Error', 'Please enter username and password'); return; }
            finalUrl = buildXtremeM3uUrl(xtremeServer.trim(), xtremeUsername.trim(), xtremePassword.trim());
            finalUsername = xtremeUsername.trim();
            finalServer = xtremeServer.trim();
            finalPassword = xtremePassword.trim();
        }

        addPlaylist({
            title: title.trim() || `${finalUsername} (Xtreme)`,
            url: finalUrl,
            type: 'xtreme',
            xtremeServer: finalServer,
            xtremeUsername: finalUsername,
            xtremePassword: finalPassword,
        });

        setTitle(''); setXtremeServer(''); setXtremeUsername(''); setXtremePassword(''); setXtremeDirectUrl('');
        Alert.alert('Success', 'Xtreme Codes playlist added successfully');
    };

    const handlePlaylistPress = (item: IptvPlaylist) => {
        if (item.type === 'xtreme') {
            router.push({
                pathname: '/(tv)/xtreme-dashboard',
                params: {
                    title: item.title,
                    serverUrl: item.xtremeServer,
                    username: item.xtremeUsername,
                    password: item.xtremePassword
                }
            });
        } else {
            router.push({ pathname: '/(tv)/addon-browser', params: { title: item.title, url: item.url, type: 'iptv' } });
        }
    };

    return {
        addTab, setAddTab, title, setTitle, m3uUrl, setM3uUrl,
        xtremeServer, setXtremeServer, xtremeUsername, setXtremeUsername, xtremePassword, setXtremePassword,
        xtremeIsDirectUrl, setXtremeIsDirectUrl, xtremeDirectUrl, setXtremeDirectUrl,
        loading, playlists, addPlaylist, removePlaylist,
        activeColors, handlePickFile, handleAddUrl, handleAddXtreme, handlePlaylistPress
    };
}

export default function TVIptvScreen() {
    const {
        addTab, setAddTab, title, setTitle, m3uUrl, setM3uUrl,
        xtremeServer, setXtremeServer, xtremeUsername, setXtremeUsername, xtremePassword, setXtremePassword,
        xtremeIsDirectUrl, setXtremeIsDirectUrl, xtremeDirectUrl, setXtremeDirectUrl,
        playlists, removePlaylist, activeColors, handlePickFile, handleAddUrl, handleAddXtreme, handlePlaylistPress
    } = useIptvLogic();

    const [isUrlFocused, setIsUrlFocused] = useState(false);
    const [isTitleFocused, setIsTitleFocused] = useState(false);
    const [isServerFocused, setIsServerFocused] = useState(false);
    const [isUserFocused, setIsUserFocused] = useState(false);
    const [isPassFocused, setIsPassFocused] = useState(false);
    const [isDirectUrlFocused, setIsDirectUrlFocused] = useState(false);

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
                        <MaterialIcons
                            name={item.type === 'local' ? 'insert-drive-file' : item.type === 'xtreme' ? 'vpn-key' : 'tv'}
                            size={28}
                            color={activeColors.primary}
                        />
                    </View>
                    <View style={[styles.addonInfo, { marginLeft: 20 }]}>
                        <Text style={[styles.addonName, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.addonType, { color: activeColors.textSecondary }]} numberOfLines={1}>
                            {item.type === 'local' ? 'Local M3U' : item.type === 'xtreme' ? `Xtreme · ${item.xtremeUsername}` : item.url}
                        </Text>
                    </View>
                </View>
            </TVFocusable>
            <TVFocusable
                style={styles.cardDeleteBtn}
                onFocus={() => { }}
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
                    <Text style={{ color: activeColors.textSecondary, fontSize: 16 }}>{playlists.length} saved</Text>
                </View>

                {/* Tab Switcher */}
                <View style={[styles.tabRow, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                    <TVFocusable
                        style={[styles.tab, addTab === 'm3u' && { backgroundColor: activeColors.primary }]}
                        onPress={() => setAddTab('m3u')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="link" size={20} color={addTab === 'm3u' ? '#fff' : activeColors.textSecondary} />
                            <Text style={[styles.tabText, { color: addTab === 'm3u' ? '#fff' : activeColors.textSecondary }]}>M3U</Text>
                        </View>
                    </TVFocusable>
                    <TVFocusable
                        style={[styles.tab, addTab === 'xtreme' && { backgroundColor: activeColors.primary }]}
                        onPress={() => setAddTab('xtreme')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name="vpn-key" size={20} color={addTab === 'xtreme' ? '#fff' : activeColors.textSecondary} />
                            <Text style={[styles.tabText, { color: addTab === 'xtreme' ? '#fff' : activeColors.textSecondary }]}>Xtreme Codes</Text>
                        </View>
                    </TVFocusable>
                </View>

                <View style={styles.addSection}>
                    {/* Title input */}
                    <View style={styles.inputRow}>
                        <TVFocusable
                            style={[styles.inputWrapper, {
                                backgroundColor: activeColors.card,
                                borderColor: isTitleFocused ? activeColors.primary : activeColors.border,
                                borderWidth: isTitleFocused ? 2 : 1
                            }]}
                            onPress={() => { }}
                        >
                            <TextInput
                                style={[styles.textInput, { color: activeColors.text }]}
                                placeholder="Playlist Title (optional)"
                                placeholderTextColor={activeColors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                onFocus={() => setIsTitleFocused(true)}
                                onBlur={() => setIsTitleFocused(false)}
                            />
                        </TVFocusable>
                        {addTab === 'm3u' && (
                            <TVFocusable
                                style={[styles.iconBtn, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                                onPress={handlePickFile}
                            >
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <MaterialIcons name="attach-file" size={28} color={activeColors.text} />
                                </View>
                            </TVFocusable>
                        )}
                    </View>

                    {addTab === 'm3u' ? (
                        <View style={styles.inputRow}>
                            <TVFocusable
                                style={[styles.inputWrapper, {
                                    backgroundColor: activeColors.card,
                                    borderColor: isUrlFocused ? activeColors.primary : activeColors.border,
                                    borderWidth: isUrlFocused ? 2 : 1
                                }]}
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
                    ) : (
                        <View style={{ gap: 16 }}>
                            {/* Mode Toggle */}
                            <View style={styles.subTabRow}>
                                <TVFocusable
                                    style={[styles.subTab, !xtremeIsDirectUrl && { backgroundColor: activeColors.primary + '30' }]}
                                    onPress={() => setXtremeIsDirectUrl(false)}
                                >
                                    <Text style={[styles.subTabText, { color: !xtremeIsDirectUrl ? activeColors.primary : activeColors.textSecondary }]}>Credentials</Text>
                                </TVFocusable>
                                <TVFocusable
                                    style={[styles.subTab, xtremeIsDirectUrl && { backgroundColor: activeColors.primary + '30' }]}
                                    onPress={() => setXtremeIsDirectUrl(true)}
                                >
                                    <Text style={[styles.subTabText, { color: xtremeIsDirectUrl ? activeColors.primary : activeColors.textSecondary }]}>Direct URL</Text>
                                </TVFocusable>
                            </View>

                            {xtremeIsDirectUrl ? (
                                <View style={styles.inputRow}>
                                    <TVFocusable
                                        style={[styles.inputWrapper, {
                                            backgroundColor: activeColors.card,
                                            borderColor: isDirectUrlFocused ? activeColors.primary : activeColors.border,
                                            borderWidth: isDirectUrlFocused ? 2 : 1
                                        }]}
                                        onPress={() => { }}
                                    >
                                        <TextInput
                                            style={[styles.textInput, { color: activeColors.text }]}
                                            placeholder="e.g. http://server.com/get.php?username=...&type=m3u_plus"
                                            placeholderTextColor={activeColors.textSecondary}
                                            value={xtremeDirectUrl}
                                            onChangeText={setXtremeDirectUrl}
                                            onFocus={() => setIsDirectUrlFocused(true)}
                                            onBlur={() => setIsDirectUrlFocused(false)}
                                            autoCapitalize="none"
                                            keyboardType="url"
                                        />
                                    </TVFocusable>
                                    <TVFocusable
                                        style={[styles.iconBtn, { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}
                                        onPress={handleAddXtreme}
                                    >
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <MaterialIcons name="vpn-key" size={28} color="#fff" />
                                        </View>
                                    </TVFocusable>
                                </View>
                            ) : (
                                <>
                                    {/* Server URL */}
                                    <View style={styles.inputRow}>
                                        <TVFocusable
                                            style={[styles.inputWrapper, {
                                                backgroundColor: activeColors.card,
                                                borderColor: isServerFocused ? activeColors.primary : activeColors.border,
                                                borderWidth: isServerFocused ? 2 : 1
                                            }]}
                                            onPress={() => { }}
                                        >
                                            <TextInput
                                                style={[styles.textInput, { color: activeColors.text }]}
                                                placeholder="Server URL (e.g. http://provider.com)"
                                                placeholderTextColor={activeColors.textSecondary}
                                                value={xtremeServer}
                                                onChangeText={setXtremeServer}
                                                onFocus={() => setIsServerFocused(true)}
                                                onBlur={() => setIsServerFocused(false)}
                                                autoCapitalize="none"
                                            />
                                        </TVFocusable>
                                    </View>
                                    {/* Username + Password */}
                                    <View style={styles.inputRow}>
                                        <TVFocusable
                                            style={[styles.inputWrapper, {
                                                backgroundColor: activeColors.card,
                                                borderColor: isUserFocused ? activeColors.primary : activeColors.border,
                                                borderWidth: isUserFocused ? 2 : 1
                                            }]}
                                            onPress={() => { }}
                                        >
                                            <TextInput
                                                style={[styles.textInput, { color: activeColors.text }]}
                                                placeholder="Username"
                                                placeholderTextColor={activeColors.textSecondary}
                                                value={xtremeUsername}
                                                onChangeText={setXtremeUsername}
                                                onFocus={() => setIsUserFocused(true)}
                                                onBlur={() => setIsUserFocused(false)}
                                                autoCapitalize="none"
                                            />
                                        </TVFocusable>
                                        <TVFocusable
                                            style={[styles.inputWrapper, {
                                                backgroundColor: activeColors.card,
                                                borderColor: isPassFocused ? activeColors.primary : activeColors.border,
                                                borderWidth: isPassFocused ? 2 : 1
                                            }]}
                                            onPress={() => { }}
                                        >
                                            <TextInput
                                                style={[styles.textInput, { color: activeColors.text }]}
                                                placeholder="Password"
                                                placeholderTextColor={activeColors.textSecondary}
                                                value={xtremePassword}
                                                onChangeText={setXtremePassword}
                                                onFocus={() => setIsPassFocused(true)}
                                                onBlur={() => setIsPassFocused(false)}
                                                secureTextEntry
                                            />
                                        </TVFocusable>
                                        <TVFocusable
                                            style={[styles.iconBtn, { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}
                                            onPress={handleAddXtreme}
                                        >
                                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                <MaterialIcons name="vpn-key" size={28} color="#fff" />
                                            </View>
                                        </TVFocusable>
                                    </View>
                                </>
                            )}
                        </View>
                    )}
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
    container: { flex: 1 },
    content: { flex: 1, paddingTop: 100, paddingHorizontal: 40 },
    header: { marginBottom: 20 },
    tabRow: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 4,
        gap: 4,
        maxWidth: 500,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    tabText: { fontSize: 16, fontWeight: '600' },
    subTabRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    subTab: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
    subTabText: { fontSize: 15, fontWeight: '600' },
    addSection: { marginBottom: 30, maxWidth: 900, gap: 16 },
    inputRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
    inputWrapper: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    textInput: { fontSize: 18, width: '100%', height: '100%' },
    iconBtn: {
        width: 60,
        height: 60,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: { paddingBottom: 50 },
    addonCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    cardDeleteBtn: { padding: 12, borderRadius: 12, marginLeft: 10 },
    addonMainArea: { flex: 1 },
    iconContainer: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    addonInfo: { marginLeft: 20, flex: 1 },
    addonName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    addonType: { fontSize: 14 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
});
