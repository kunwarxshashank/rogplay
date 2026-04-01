import { create } from 'zustand';

export type ToastTone = 'success' | 'info';

interface ToastState {
    visible: boolean;
    message: string;
    tone: ToastTone;
    duration: number;
    showToast: (message: string, tone?: ToastTone, duration?: number) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    visible: false,
    message: '',
    tone: 'info',
    duration: 1800,
    showToast: (message, tone = 'info', duration = 1800) =>
        set({ visible: true, message, tone, duration }),
    hideToast: () => set({ visible: false }),
}));
