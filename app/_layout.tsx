import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold
} from '@expo-google-fonts/outfit';
import {
    Inter_400Regular,
    Inter_600SemiBold
} from '@expo-google-fonts/inter';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
// import { TVSidebar } from '@/components/TVSidebar';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAddonsStore } from '@/store/addonsStore';
import { useRouter, useSegments } from 'expo-router';
import { AppUpdateModal } from '@/components/AppUpdateModal';
import { AppToast } from '@/components/AppToast';


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
        Inter_400Regular,
        Inter_600SemiBold,
    });

    const pathname = usePathname();
    const segments = useSegments();
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { theme: currentThemeName } = useSettingsStore();
    const currentColors = Colors[currentThemeName] || Colors.dark;

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    useEffect(() => {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
        const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

        if (!webClientId) {
            console.warn('Google Sign-In: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing');
        }

        GoogleSignin.configure({
            webClientId: webClientId,
            iosClientId: iosClientId,
            offlineAccess: true,
            forceCodeForRefreshToken: true,
        });
    }, []);

    // Ensure addons are loaded early (so screens that depend on them don't show "please add addons" when addons exist)
    useEffect(() => {
        useAddonsStore.getState().loadAddons().catch(err => {
            console.error('Failed to preload addons:', err);
        });
    }, []);

    // Handle incoming links (Intents)
    useEffect(() => {
        const getPlayerPath = () => Platform.isTV ? '/(tv)/player' : '/(mobile)/player';

        const handleUrl = (url: string) => {
            if (!url) return;

            // Ignore internal Expo Development Client URLs
            if (url.includes('expo-development-client')) {
                return;
            }

            console.log('Incoming Intent URL:', url);

            // 1. Handle rogplay:// links with addons
            if (url.startsWith('rogplay://')) {
                // Check if it's an addon installer link (ends with .json)
                const path = url.replace('rogplay://', '');
                if (path.toLowerCase().endsWith('.json')) {
                    const addonUrl = `https://${path}`;

                    // Add the addon
                    useAddonsStore.getState().addAddon(addonUrl)
                        .then(() => {
                            console.log('Addon added successfully from deep link');
                            router.push('/(tabs)/addons');
                        })
                        .catch(err => {
                            console.error('Failed to add addon from deep link:', err);
                            // If it fails (maybe already exists), still navigate to see it
                            router.push('/(tabs)/addons');
                        });
                    return;
                }

                // Handle regular player deep links
                const parsed = Linking.parse(url);
                if (parsed.path === 'player' || (parsed.queryParams && parsed.queryParams.url)) {
                    router.push({
                        pathname: getPlayerPath() as any,
                        params: parsed.queryParams as any
                    });
                    return;
                }
            }

            // 2. Handle play:// links (replace with http://)
            if (url.startsWith('play://')) {
                const videoUrl = url.replace('play://', 'https://');
                const filename = videoUrl.split('/').pop()?.split('?')[0] || 'External Stream';

                router.push({
                    pathname: getPlayerPath() as any,
                    params: {
                        url: videoUrl,
                        title: decodeURIComponent(filename)
                    }
                });
                return;
            }

            // 3. Handle direct video files (file://, content://, or direct http links)
            const isVideoFile = url.startsWith('file://') ||
                url.startsWith('content://') ||
                ((url.startsWith('http://') || url.startsWith('https://')) && (
                    url.toLowerCase().split('?')[0].endsWith('.mp4') ||
                    url.toLowerCase().split('?')[0].endsWith('.mkv') ||
                    url.toLowerCase().split('?')[0].endsWith('.m3u8') ||
                    url.toLowerCase().split('?')[0].endsWith('.avi') ||
                    url.toLowerCase().split('?')[0].endsWith('.ts') ||
                    url.toLowerCase().split('?')[0].endsWith('.webm') ||
                    url.toLowerCase().split('?')[0].endsWith('.mov') ||
                    url.toLowerCase().split('?')[0].endsWith('.flv')
                ));

            if (isVideoFile) {
                // Determine title from filename if possible
                const filename = url.split('/').pop()?.split('?')[0] || 'External Video';

                router.push({
                    pathname: getPlayerPath() as any,
                    params: {
                        url: url,
                        title: decodeURIComponent(filename)
                    }
                });
            }
        };

        // Check initial URL
        Linking.getInitialURL().then(url => {
            if (url) handleUrl(url);
        });

        // Listen for new URLs while app is running
        const subscription = Linking.addEventListener('url', (event) => {
            handleUrl(event.url);
        });

        return () => subscription.remove();
    }, [loaded]);

    useEffect(() => {
        if (!loaded) return;

        const segs = segments as string[];
        const inAuthGroup = segs[0] === '(auth)';
        const loggedIn = isAuthenticated;

        if (!loggedIn) {
            // If not logged in and not in auth group, redirect to login
            if (!inAuthGroup) {
                router.replace(Platform.isTV ? '/(auth)/tvlogin' : '/(auth)/login');
            } else {
                // Already in auth group, check if TV login is needed
                const subRoute = (segs.length > 1 ? segs[1] : '') || '';
                if (Platform.isTV && (subRoute === 'login' || subRoute === 'signup')) {
                    router.replace('/(auth)/tvlogin');
                }
            }
        } else if (loggedIn && inAuthGroup) {
            // If logged in but in auth group, redirect to platform-appropriate home
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
                // Default for TV is cinema (handled by targetPath = /(tv))
                // unless home is explicitly set to local-videos
                if (defaultScreen === 'home') targetPath = '/(tv)/local-videos';
            }

            router.replace(targetPath as any);
        } else if (loggedIn) {
            // Basic cross-platform check
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
        </GestureHandlerRootView>
    );
}
