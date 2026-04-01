import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';

export default function Index() {
    const { defaultScreen } = useSettingsStore();

    let targetPath = Platform.isTV ? "/(tv)" : "/(mobile)";

    if (defaultScreen && defaultScreen !== 'home') {
        if (Platform.isTV) {
            // Map mobile/common names to TV routes
            if (defaultScreen === 'addons') targetPath = '/(tv)/addons';
            else if (defaultScreen === 'tools') targetPath = '/(tv)/tools';
            else if (defaultScreen === 'cinema') targetPath = '/(tv)';
            else if (defaultScreen === 'home') targetPath = '/(tv)/local-videos';
        } else {
            targetPath = `/(mobile)/${defaultScreen}`;
            // Special case for home which should go to tabs
            if ((defaultScreen as string) === 'home') targetPath = '/(mobile)';
        }
    } else if (Platform.isTV && defaultScreen === 'home') {
        targetPath = '/(tv)/local-videos';
    }

    return <Redirect href={targetPath as any} />;
}
