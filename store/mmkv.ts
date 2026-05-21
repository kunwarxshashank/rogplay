import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

const isWeb = Platform.OS === 'web';

export const storage = isWeb ? undefined : createMMKV();

export const zustandStorage: StateStorage = {
    setItem: (name: string, value: string) => {
        if (isWeb) {
            try {
                window.localStorage.setItem(name, value);
            } catch (e) { }
            return;
        }
        return storage!.set(name, value);
    },
    getItem: (name: string) => {
        if (isWeb) {
            try {
                return window.localStorage.getItem(name) ?? null;
            } catch (e) {
                return null;
            }
        }
        const value = storage!.getString(name);
        return value ?? null;
    },
    removeItem: (name: string) => {
        if (isWeb) {
            try {
                window.localStorage.removeItem(name);
            } catch (e) { }
            return;
        }
        storage!.remove(name);
    },
};
