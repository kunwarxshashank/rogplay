import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useAddonsStore } from '@/store/addonsStore';
import { Platform } from 'react-native';

const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

export interface UserData {
    id: string;
    _id?: string;
    name?: string;
    username?: string;
    email: string;
    isPremium?: boolean;
    ispremium?: boolean;
    addons?: string[];
    [key: string]: any;
}

export const normalizeUser = (userData: UserData, defaultName = 'User'): any => {
    return {
        ...userData,
        id: userData.id || userData._id || 'temp',
        name: userData.name || userData.username || defaultName,
        email: userData.email,
        isPremium: !!(userData.isPremium || userData.ispremium)
    };
};

export const handleAuthSuccess = (token: string, userData: UserData) => {
    const normalizedUser = normalizeUser(userData);
    useAuthStore.getState().setAuth(token, normalizedUser);

    // Sync addons if available
    if (normalizedUser.addons && normalizedUser.addons.length > 0) {
        useAddonsStore.getState().loadAddons(normalizedUser.addons);
    }
};

export const getAuthRedirectPath = () => {
    return Platform.isTV ? '/(tv)' : '/(mobile)';
};

export const signInWithGoogle = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken;

        if (!idToken) {
            throw new Error('Google Sign-In: idToken is missing');
        }

        const response = await axios.post(`${DB_BASEURL}/google-login`, {
            idToken,
        });

        if (response.status === 200) {
            const { token } = response.data;
            const userData = response.data.user || response.data;
            handleAuthSuccess(token, userData);
            return { success: true };
        } else {
            throw new Error('Server authentication failed');
        }
    } catch (error: any) {
        let errorMessage = 'Google Sign-In failed';

        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            errorMessage = 'Sign-In cancelled';
        } else if (error.code === statusCodes.IN_PROGRESS) {
            errorMessage = 'Sign-In already in progress';
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            errorMessage = 'Google Play Services not available';
        } else if (error.code === '10' || (statusCodes as any).DEVELOPER_ERROR === error.code) {
            errorMessage = 'Configuration error (DEVELOPER_ERROR). Please check your Google Cloud Console settings and SHA-1 fingerprints.';
            console.error('DEVELOPER_ERROR: Possible causes:\n1. Incorrect SHA-1 in Google Console.\n2. Incorrect webClientId in .env.\n3. Package name mismatch in Google Console.');
        } else {
            console.error('Google Sign-In Error:', error);
            errorMessage = error.response?.data?.message || error.message || errorMessage;
        }

        return { success: false, error: errorMessage };
    }
};

export const signInAsGuest = () => {
    const guestUser: any = {
        id: 'guest_' + Math.random().toString(36).substr(2, 9),
        name: 'Guest User',
        email: 'guest@rogplay.live',
        isPremium: false,
    };
    useAuthStore.getState().setAuth('GUEST_TOKEN_' + Date.now(), guestUser);
    return { success: true };
};
