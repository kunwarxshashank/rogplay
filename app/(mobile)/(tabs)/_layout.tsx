import React, { useEffect } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Platform, View, StyleSheet, Text, BackHandler, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { BlurView } from 'expo-blur';
import MiniPlayer from '@/components/player/MiniPlayer';

const TabItem = React.memo(({ focused, name, activeColor, inactiveColor, iconFamily = 'MaterialIcons' }: any) => {
    const IconComponent = iconFamily === 'Ionicons' ? Ionicons : MaterialIcons;
    return <IconComponent name={name} size={28} color={focused ? activeColor : inactiveColor} />;
});


const BackHandlerManager = () => {
    const pathname = usePathname();
    const { confirmExit } = useSettingsStore();



    useEffect(() => {

        const backAction = () => {
            // Only confirm exit if we are on the Home screen (or base tabs route)
            // and the setting is enabled.
            const isBaseRoute = pathname === '/' ||
                pathname === '/(tabs)' ||
                pathname === '/(tabs)/' ||
                pathname === '/(mobile)' ||
                pathname === '/(mobile)/' ||
                pathname === '/(mobile)/(tabs)' ||
                pathname === '/(mobile)/(tabs)/index';

            if (confirmExit && isBaseRoute) {
                Alert.alert(
                    "Exit App",
                    "Are you sure you want to exit?",
                    [
                        { text: "Cancel", onPress: () => null, style: "cancel" },
                        { text: "YES", onPress: () => BackHandler.exitApp() }
                    ]
                );
                return true; // Intercept back press
            }
            return false; // Default behavior
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [pathname, confirmExit]);

    return null;
};

export default function TabLayout() {
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    const screenOptions = React.useMemo(() => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
            position: 'absolute' as const,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            shadowColor: 'transparent',
            height: 85,
            paddingBottom: Platform.OS === 'ios' ? 30 : 5,
            paddingTop: 5,
            elevation: 0,
        },
        tabBarBackground: () => (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: currentColors.primary,
        tabBarInactiveTintColor: currentColors.textSecondary,
        tabBarItemStyle: {
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            backgroundColor: 'transparent',
            borderRadius: 0,
        },
        lazy: true,
        freezeOnBlur: true,
    }), [currentColors.primary, currentColors.textSecondary]);

    const homeIcon = React.useCallback(({ focused }: any) => (
        <TabItem
            focused={focused}
            name="home-outline"
            iconFamily="Ionicons"
            activeColor={currentColors.primary}
            inactiveColor={currentColors.textSecondary}
        />
    ), [currentColors]);

    const cinemaIcon = React.useCallback(({ focused }: any) => (
        <TabItem
            focused={focused}
            name="movie-filter"
            activeColor={currentColors.primary}
            inactiveColor={currentColors.textSecondary}
        />
    ), [currentColors]);

    const localMusicIcon = React.useCallback(({ focused }: any) => (
        <TabItem
            focused={focused}
            name="library-music"
            activeColor={currentColors.primary}
            inactiveColor={currentColors.textSecondary}
        />
    ), [currentColors]);

    const addonsIcon = React.useCallback(({ focused }: any) => (
        <TabItem
            focused={focused}
            name="apps"
            iconFamily="Ionicons"
            activeColor={currentColors.primary}
            inactiveColor={currentColors.textSecondary}
        />
    ), [currentColors]);

    const toolsIcon = React.useCallback(({ focused }: any) => (
        <TabItem
            focused={focused}
            name="construct-outline"
            iconFamily="Ionicons"
            activeColor={currentColors.primary}
            inactiveColor={currentColors.textSecondary}
        />
    ), [currentColors]);

    const settingsIcon = React.useCallback(({ focused }: any) => (

        <TabItem
            focused={focused}
            name="settings-outline"
            iconFamily="Ionicons"
            activeColor={currentColors.primary}
            inactiveColor={currentColors.textSecondary}
        />
    ), [currentColors]);

    return (
        <>
            <BackHandlerManager />
            <Tabs screenOptions={screenOptions}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: homeIcon,

                    }}
                />
                <Tabs.Screen
                    name="cinema"
                    options={{
                        title: 'Cinema',
                        tabBarIcon: cinemaIcon,
                    }}
                />
                <Tabs.Screen
                    name="local-music"
                    options={{
                        title: 'Music',
                        tabBarIcon: localMusicIcon,
                    }}
                />
                <Tabs.Screen
                    name="addons"
                    options={{
                        title: 'Addons',
                        tabBarIcon: addonsIcon,
                    }}
                />
                <Tabs.Screen
                    name="tools"
                    options={{
                        title: 'Tools',
                        tabBarIcon: toolsIcon,
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: settingsIcon,
                    }}
                />
            </Tabs>
            <MiniPlayer />
        </>
    );
}

const styles = StyleSheet.create({});
