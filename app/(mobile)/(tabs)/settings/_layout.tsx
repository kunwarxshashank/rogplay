import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsLayout() {
    const { colors: currentColors } = useTheme();

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
            <Stack.Screen name="theme" options={{ headerShown: false }} />
            <Stack.Screen name="insights" options={{ headerShown: false }} />
        </Stack>
    );
}
