import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function MobileLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="player" options={{ headerShown: false, orientation: 'all' }} />
            <Stack.Screen name="server-selection" options={{ headerShown: false }} />
            <Stack.Screen name="addon-browser" options={{ headerShown: false }} />
            <Stack.Screen name="stremio-browser" options={{ headerShown: false }} />
            <Stack.Screen name="iptv" options={{ headerShown: false }} />
            <Stack.Screen name="network-stream" options={{ headerShown: false }} />
            <Stack.Screen name="video-downloader" options={{ headerShown: false }} />
            <Stack.Screen name="downloads" options={{ headerShown: false }} />
            <Stack.Screen name="favourites" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="join-watchparty" options={{ headerShown: false }} />
            <Stack.Screen name="details/provider" options={{ headerShown: false }} />
            <Stack.Screen name="details/[type]/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="season/[tvId]/[seasonNumber]" options={{ headerShown: false }} />
        </Stack>
    );
}
