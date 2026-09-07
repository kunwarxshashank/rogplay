import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';

export default function Index() {
    const { defaultScreen } = useSettingsStore();

    let targetPath = Platform.isTV ? "/(tv)" : "/(mobile)";

    if (defaultScreen) {
        if (Platform.isTV) {
            // Map mobile/common names to TV routes
            if (defaultScreen === 'addons') targetPath = '/(tv)/addons';
            else if (defaultScreen === 'tools') targetPath = '/(tv)/tools';
            else if (defaultScreen === 'cinema') targetPath = '/(tv)';
            else if (defaultScreen === 'home') targetPath = '/(tv)/local-videos';
        } else {
            // Default screens (cinema, local-music, addons, tools, settings) are all inside (tabs)
            if (defaultScreen === 'home') {
                targetPath = '/(mobile)/(tabs)';
            } else {
                targetPath = `/(mobile)/(tabs)/${defaultScreen}`;
            }
        }
    }

    return <Redirect href={targetPath as any} />;
}
