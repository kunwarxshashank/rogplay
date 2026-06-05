import { Stack } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';

export default function SettingsLayout() {
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: currentColors.background },
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="general" options={{ headerShown: false }} />
            <Stack.Screen name="playback" options={{ headerShown: false }} />
            <Stack.Screen name="maintenance" options={{ headerShown: false }} />
            <Stack.Screen name="account" options={{ headerShown: false }} />
            <Stack.Screen name="cinema" options={{ headerShown: false }} />
        </Stack>
    );
}
