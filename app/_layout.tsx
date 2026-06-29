import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';
import {
    Inter_400Regular,
    Inter_600SemiBold
} from '@expo-google-fonts/inter';
import {
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold
} from '@expo-google-fonts/playfair-display';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/hooks/useTheme';
import { useAddonsStore } from '@/store/addonsStore';
import { useRouter, useSegments } from 'expo-router';
import { AppUpdateModal } from '@/components/AppUpdateModal';
import { AppToast } from '@/components/AppToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as NavigationBar from 'expo-navigation-bar';
import { initializeFirebase } from '@/services/firebase';
import notifee, { EventType } from '@notifee/react-native';

notifee.onBackgroundEvent(async ({ type, detail }) => {
    // Handle background events
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id) {
        console.log('Background action pressed', detail.pressAction.id);
    }
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
        Outfit_800ExtraBold,
        Inter_400Regular,
        Inter_600SemiBold,
        PlayfairDisplay_400Regular,
        PlayfairDisplay_500Medium,
        PlayfairDisplay_600SemiBold,
        PlayfairDisplay_700Bold,
    });

    const pathname = usePathname();
    const segments = useSegments();
    const router = useRouter();
    const [initialIntentProcessed, setInitialIntentProcessed] = useState(false);
    const { isAuthenticated } = useAuthStore();
    const { colors: currentColors } = useTheme();

    useEffect(() => {
        if ((loaded || error) && initialIntentProcessed) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error, initialIntentProcessed]);

    useEffect(() => {
        NavigationBar.setBackgroundColorAsync('transparent');
        NavigationBar.setButtonStyleAsync('light');
    }, []);

    useEffect(() => {
        initializeFirebase();
    }, []);

    useEffect(() => {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        GoogleSignin.configure({
            webClientId: webClientId,
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            offlineAccess: true,
            forceCodeForRefreshToken: true,
        });
    }, []);

    useEffect(() => {
        useAddonsStore.getState().loadAddons().catch(err => {
            console.error('Failed to preload addons:', err);
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        const getPlayerPath = () => Platform.isTV ? '/(tv)/player' : '/(mobile)/player';

        const done = () => {
            if (!cancelled) setInitialIntentProcessed(true);
        };

        const handleUrl = (url: string, isInitial: boolean) => {
            if (!url || url.includes('expo-development-client')) {
                if (isInitial) done();
                return;
            }

            if (url.startsWith('rogplay://')) {
                const path = url.replace('rogplay://', '');
                if (path.toLowerCase().endsWith('.json')) {
                    const addonUrl = `https://${path}`;
                    useAddonsStore.getState().addAddon(addonUrl)
                        .then(() => router.push(Platform.isTV ? '/(tv)/addons' : '/(mobile)/addons'))
                        .catch(err => {
                            console.error('Failed to add addon from deep link:', err);
                            router.push(Platform.isTV ? '/(tv)/addons' : '/(mobile)/addons');
                        })
                        .finally(() => { if (isInitial) done(); });
                    return;
                }

                const parsed = Linking.parse(url);
                if (parsed.path === 'player' || (parsed.queryParams && parsed.queryParams.url)) {
                    router.push({ pathname: getPlayerPath() as any, params: parsed.queryParams as any });
                    if (isInitial) done();
                    return;
                }
            }

            if (url.startsWith('play://')) {
                const videoUrl = url.replace('play://', 'https://');
                const filename = videoUrl.split('/').pop()?.split('?')[0] || 'External Stream';
                router.push({
                    pathname: getPlayerPath() as any,
                    params: { url: videoUrl, title: decodeURIComponent(filename) }
                });
                if (isInitial) done();
                return;
            }

            const isVideoFile = url.startsWith('file://') || url.startsWith('content://') ||
                ((url.startsWith('http://') || url.startsWith('https://')) &&
                    ['.mp4', '.mkv', '.m3u8', '.avi', '.ts', '.webm', '.mov', '.flv'].some(ext =>
                        url.toLowerCase().split('?')[0].endsWith(ext)
                    ));

            if (isVideoFile) {
                const filename = url.split('/').pop()?.split('?')[0] || 'External Video';
                router.push({
                    pathname: getPlayerPath() as any,
                    params: { url, title: decodeURIComponent(filename) }
                });
            }

            if (isInitial) done();
        };

        Linking.getInitialURL().then(url => {
            if (url) handleUrl(url, true);
            else done();
        });

        const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url, false));
        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, [loaded]);

    useEffect(() => {
        if (!loaded) return;

        const segs = segments as string[];
        const inAuthGroup = segs[0] === '(auth)';
        const loggedIn = isAuthenticated;

        if (!loggedIn) {
            if (!inAuthGroup) {
                router.replace(Platform.isTV ? '/(auth)/tvlogin' : '/(auth)/login');
            } else {
                const subRoute = (segs.length > 1 ? segs[1] : '') || '';
                if (Platform.isTV && (subRoute === 'login' || subRoute === 'signup')) {
                    router.replace('/(auth)/tvlogin');
                }
            }
        } else if (loggedIn && inAuthGroup) {
            const { defaultScreen } = useSettingsStore.getState();
            let targetPath = Platform.isTV ? '/(tv)' : '/(mobile)';

            if (defaultScreen && defaultScreen !== 'home') {
                if (Platform.isTV) {
                    if (defaultScreen === 'addons') targetPath = '/(tv)/addons';
                    else if (defaultScreen === 'tools') targetPath = '/(tv)/tools';
                    else if (defaultScreen === 'cinema') targetPath = '/(tv)';
                    else if (defaultScreen === 'home') targetPath = '/(tv)/local-videos';
                } else {
                    targetPath = `/(mobile)/${defaultScreen}`;
                    if ((defaultScreen as string) === 'home') targetPath = '/(mobile)';
                }
            } else if (Platform.isTV) {
                if (defaultScreen === 'home') targetPath = '/(tv)/local-videos';
            }

            router.replace(targetPath as any);
        } else if (loggedIn) {
            if (Platform.isTV && (segs[0] === '(mobile)' || segs[0] === '(tabs)')) {
                router.replace('/(tv)');
            } else if (!Platform.isTV && segs[0] === '(tv)') {
                router.replace('/(mobile)');
            }
        }
    }, [isAuthenticated, segments, loaded]);

    const theme = {
        ...DarkTheme,
        colors: {
            ...DarkTheme.colors,
            background: currentColors.background,
            card: currentColors.card,
            text: currentColors.text,
            primary: currentColors.primary,
            border: currentColors.border,
        }
    };

    if (!loaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ErrorBoundary>
                <ThemeProvider value={theme}>
                    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: currentColors.background }}>
                        <View style={{ flex: 1 }}>
                            <Stack
                                screenOptions={{
                                    headerShown: false,
                                    contentStyle: { backgroundColor: currentColors.background },
                                    headerStyle: { backgroundColor: currentColors.background },
                                    headerTintColor: currentColors.text,
                                }}
                            >
                                <Stack.Screen name="(mobile)" options={{ headerShown: false }} />
                                <Stack.Screen name="(tv)" options={{ headerShown: false }} />
                                <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                                <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
                                <Stack.Screen name="(auth)/tvlogin" options={{ headerShown: false }} />
                                <Stack.Screen name="index" options={{ headerShown: false }} />
                                <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                            </Stack>
                        </View>
                    </View>
                    <AppUpdateModal />
                    <AppToast />
                    <StatusBar style="light" />
                </ThemeProvider>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}
