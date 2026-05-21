import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Dimensions, Platform, ScrollView
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useIptvStore, IptvPlaylist } from '@/store/iptvStore';
import { useSettingsStore } from '@/store/settingsStore';
import { GridSkeleton, MovieCardSkeleton } from '@/components/Skeleton';
import { TVFocusable } from '@/components/TVFocusable';

const { width } = Dimensions.get('window');

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
    // Xtreme Codes fields
    const [xtremeServer, setXtremeServer] = useState('');
    const [xtremeUsername, setXtremeUsername] = useState('');
    const [xtremePassword, setXtremePassword] = useState('');
    const [xtremeIsDirectUrl, setXtremeIsDirectUrl] = useState(false);
    const [xtremeDirectUrl, setXtremeDirectUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const router = useRouter();
    const { playlists, addPlaylist, removePlaylist } = useIptvStore();
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;

    React.useEffect(() => {
        const timer = setTimeout(() => setInitialLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handlePickFile = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
            if (res.canceled) return;

            const file = res.assets[0];
            const fileName = `${Date.now()}_${file.name}`;
            const destinationPath = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.copyAsync({ from: file.uri, to: destinationPath });

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
            url: m3uUrl.trim(),
            type: 'remote'
        });
        setTitle('');
        setM3uUrl('');
        Alert.alert('Success', 'Playlist added successfully');
    };

    const handleAddXtreme = () => {
        let finalUrl = '';
        let finalUsername = '';
        let finalServer = '';
        let finalPassword = '';

        if (xtremeIsDirectUrl) {
            if (!xtremeDirectUrl.trim()) {
                Alert.alert('Error', 'Please enter a direct Xtreme Codes URL');
                return;
            }
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
            if (!xtremeServer.trim()) {
                Alert.alert('Error', 'Please enter the server URL');
                return;
            }
            if (!xtremeUsername.trim() || !xtremePassword.trim()) {
                Alert.alert('Error', 'Please enter username and password');
                return;
            }
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

        setTitle('');
        setXtremeServer('');
        setXtremeUsername('');
        setXtremePassword('');
        setXtremeDirectUrl('');
        Alert.alert('Success', 'Xtreme Codes playlist added successfully');
    };

    const handlePlaylistPress = (item: IptvPlaylist) => {
        if (item.type === 'xtreme') {
            router.push({
                pathname: '/xtreme-dashboard',
                params: {
                    title: item.title,
                    serverUrl: item.xtremeServer,
                    username: item.xtremeUsername,
                    password: item.xtremePassword
                }
            });
        } else {
            router.push({
                pathname: '/addon-browser',
                params: { title: item.title, url: item.url, type: 'iptv' }
            });
        }
    };

    return {
        addTab, setAddTab,
        title, setTitle, m3uUrl, setM3uUrl,
        xtremeServer, setXtremeServer,
        xtremeUsername, setXtremeUsername,
        xtremePassword, setXtremePassword,
        xtremeIsDirectUrl, setXtremeIsDirectUrl,
        xtremeDirectUrl, setXtremeDirectUrl,
        loading, initialLoading,
        playlists, addPlaylist, removePlaylist,
        activeColors, handlePickFile, handleAddUrl, handleAddXtreme, handlePlaylistPress
    };
}

export function IptvMobile() {
    const {
        addTab, setAddTab,
        title, setTitle, m3uUrl, setM3uUrl,
        xtremeServer, setXtremeServer,
        xtremeUsername, setXtremeUsername,
        xtremePassword, setXtremePassword,
        xtremeIsDirectUrl, setXtremeIsDirectUrl,
        xtremeDirectUrl, setXtremeDirectUrl,
        loading, initialLoading,
        playlists, removePlaylist,
        activeColors, handlePickFile, handleAddUrl, handleAddXtreme, handlePlaylistPress
    } = useIptvLogic();

    const router = useRouter();

    const renderPlaylistIcon = (item: IptvPlaylist) => {
        if (item.type === 'local') return 'insert-drive-file';
        if (item.type === 'xtreme') return 'vpn-key';
        return 'tv';
    };

    const renderAddon = ({ item }: { item: IptvPlaylist }) => {
        const InnerAddonCard = (
            <>
                <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '15' }]}>
                    <MaterialIcons name={renderPlaylistIcon(item)} size={28} color={activeColors.primary} />
                </View>
                <View style={styles.addonInfo}>
                    <Text style={[styles.addonName, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.addonType, { color: activeColors.textSecondary }]} numberOfLines={1}>
                        {item.type === 'local' ? 'Local M3U' : item.type === 'xtreme' ? `Xtreme · ${item.xtremeUsername}` : item.url}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => removePlaylist(item.id)} style={styles.deleteBtn}>
                    <MaterialIcons name="delete-outline" size={22} color={activeColors.error} />
                </TouchableOpacity>
            </>
        );

        return Platform.isTV ? (
            <TVFocusable
                style={[styles.addonCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                onPress={() => handlePlaylistPress(item)}
            >
                {InnerAddonCard}
            </TVFocusable>
        ) : (
            <TouchableOpacity
                style={[styles.addonCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                onPress={() => handlePlaylistPress(item)}
                activeOpacity={0.8}
            >
                {InnerAddonCard}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]}>IPTV Playlists</Text>
                    <View style={[styles.titleDot, { backgroundColor: activeColors.primary }]} />
                </View>
            </View>

            <View style={styles.addSection}>
                <Text style={[styles.sectionHeading, { color: activeColors.textSmall || activeColors.textSecondary }]}>
                    Add New Playlist
                </Text>

                {/* Tab Switcher */}
                <View style={[styles.tabRow, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                    <TouchableOpacity
                        style={[styles.tab, addTab === 'm3u' && { backgroundColor: activeColors.primary }]}
                        onPress={() => setAddTab('m3u')}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="link" size={16} color={addTab === 'm3u' ? '#fff' : activeColors.textSecondary} />
                        <Text style={[styles.tabText, { color: addTab === 'm3u' ? '#fff' : activeColors.textSecondary }]}>M3U</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, addTab === 'xtreme' && { backgroundColor: activeColors.primary }]}
                        onPress={() => setAddTab('xtreme')}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="vpn-key" size={16} color={addTab === 'xtreme' ? '#fff' : activeColors.textSecondary} />
                        <Text style={[styles.tabText, { color: addTab === 'xtreme' ? '#fff' : activeColors.textSecondary }]}>Xtreme Codes</Text>
                    </TouchableOpacity>
                </View>

                {/* Title input always visible */}
                <TextInput
                    style={[styles.input, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                    placeholder="Playlist Title (optional)"
                    placeholderTextColor={activeColors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                />

                {addTab === 'm3u' ? (
                    <>
                        <View style={styles.urlRow}>
                            <TextInput
                                style={[styles.urlInput, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                                placeholder="Paste M3U URL here..."
                                placeholderTextColor={activeColors.textSecondary}
                                value={m3uUrl}
                                onChangeText={setM3uUrl}
                            />
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: activeColors.primary }]}
                                onPress={handleAddUrl}
                            >
                                <MaterialIcons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: activeColors.card, borderColor: activeColors.border, borderWidth: 1 }]}
                                onPress={handlePickFile}
                            >
                                <MaterialIcons name="attach-file" size={22} color={activeColors.text} />
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={{ gap: 12 }}>
                            {/* Sub-mode toggle for credentials vs direct url */}
                            <View style={styles.subTabRow}>
                                <TouchableOpacity
                                    style={[styles.subTab, !xtremeIsDirectUrl && { backgroundColor: activeColors.primary + '30' }]}
                                    onPress={() => setXtremeIsDirectUrl(false)}
                                >
                                    <Text style={[styles.subTabText, { color: !xtremeIsDirectUrl ? activeColors.primary : activeColors.textSecondary }]}>Credentials</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.subTab, xtremeIsDirectUrl && { backgroundColor: activeColors.primary + '30' }]}
                                    onPress={() => setXtremeIsDirectUrl(true)}
                                >
                                    <Text style={[styles.subTabText, { color: xtremeIsDirectUrl ? activeColors.primary : activeColors.textSecondary }]}>Direct URL</Text>
                                </TouchableOpacity>
                            </View>

                            {xtremeIsDirectUrl ? (
                                <TextInput
                                    style={[styles.input, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                                    placeholder="e.g. http://server.com/get.php?username=...&type=m3u_plus"
                                    placeholderTextColor={activeColors.textSecondary}
                                    value={xtremeDirectUrl}
                                    onChangeText={setXtremeDirectUrl}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                            ) : (
                                <>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                                        placeholder="Server URL (e.g. http://provider.com)"
                                        placeholderTextColor={activeColors.textSecondary}
                                        value={xtremeServer}
                                        onChangeText={setXtremeServer}
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                    <View style={styles.urlRow}>
                                        <TextInput
                                            style={[styles.urlInput, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                                            placeholder="Username"
                                            placeholderTextColor={activeColors.textSecondary}
                                            value={xtremeUsername}
                                            onChangeText={setXtremeUsername}
                                            autoCapitalize="none"
                                        />
                                        <TextInput
                                            style={[styles.urlInput, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                                            placeholder="Password"
                                            placeholderTextColor={activeColors.textSecondary}
                                            value={xtremePassword}
                                            onChangeText={setXtremePassword}
                                            secureTextEntry
                                        />
                                    </View>
                                </>
                            )}
                            <TouchableOpacity
                                style={[styles.addXtremeBtn, { backgroundColor: activeColors.primary }]}
                                onPress={handleAddXtreme}
                                activeOpacity={0.85}
                            >
                                <MaterialIcons name="vpn-key" size={20} color="#fff" />
                                <Text style={styles.addXtremeBtnText}>Add Xtreme Codes</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            <View style={styles.savedSection}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>My Playlists</Text>
                    <Text style={[styles.count, { color: activeColors.textSecondary }]}>{playlists.length} saved</Text>
                </View>

                {initialLoading ? (
                    <GridSkeleton
                        count={12}
                        columns={3}
                        itemWidth="32%"
                        renderItem={() => <MovieCardSkeleton width="100%" />}
                    />
                ) : playlists.length > 0 ? (
                    <FlatList
                        data={playlists}
                        renderItem={renderAddon}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="playlist-add" size={64} color={activeColors.border} />
                        <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>No playlists added yet</Text>
                    </View>
                )}
            </View>

            {loading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                </View>
            )}
        </SafeAreaView>
    );
}

export default function IptvScreen() {
    return <IptvMobile />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060912' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    titleRow: { flexDirection: 'row', alignItems: 'baseline' },
    titleDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
    headerTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold' },
    addSection: { padding: 20, gap: 12 },
    sectionHeading: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    tabRow: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 4,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tabText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
    subTabRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    subTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    subTabText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    input: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
    urlRow: { flexDirection: 'row', gap: 10 },
    urlInput: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
    actionBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addXtremeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
    },
    addXtremeBtnText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
    },
    savedSection: { flex: 1, marginTop: 8 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold' },
    count: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', opacity: 0.6 },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    addonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    addonInfo: { flex: 1 },
    addonName: { fontSize: 17, fontFamily: 'Outfit_600SemiBold', marginBottom: 2 },
    addonType: { fontSize: 12, fontFamily: 'Inter_400Regular', opacity: 0.5 },
    deleteBtn: { padding: 8 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 18, fontFamily: 'Outfit_600SemiBold' },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    }
});
