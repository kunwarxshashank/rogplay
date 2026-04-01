import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * TV Remote D-pad event types from React Native's TVEventHandler
 */
export type TVRemoteEventType =
    | 'select'
    | 'playPause'
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'back'
    | 'menu'
    | 'rewind'
    | 'fastForward'
    | 'stop'
    | 'longSelect';

export interface UseTVRemoteOptions {
    /** Called when center/enter/select is pressed. Action: 0=Down, 1=Up, 2=LongDown? */
    onSelect?: (action?: number) => void;
    /** Called on play/pause media key */
    onPlayPause?: (action?: number) => void;
    /** Called on D-pad up */
    onUp?: (action?: number) => void;
    /** Called on D-pad down */
    onDown?: (action?: number) => void;
    /** Called on D-pad left */
    onLeft?: (action?: number) => void;
    /** Called on D-pad right */
    onRight?: (action?: number) => void;
    /** Called on back/return button */
    onBack?: (action?: number) => void;
    /** Called on menu button */
    onMenu?: (action?: number) => void;
    /** Called on rewind media key */
    onRewind?: (action?: number) => void;
    /** Called on fast-forward media key */
    onFastForward?: (action?: number) => void;
    /** Called on stop media key */
    onStop?: (action?: number) => void;
    /** Called on long press of center/select */
    onLongSelect?: (action?: number) => void;
    /** Master switch to enable/disable all handlers. Default: true */
    enabled?: boolean;
}

/**
 * useTVRemote - A centralized hook for handling Android TV / Fire TV remote events.
 *
 * Uses React Native's TVEventHandler class (available in RN 0.81.x).
 * Auto-cleans up on unmount. Provides a clean callback-based API.
 *
 * @example
 * ```tsx
 * useTVRemote({
 *   onSelect: () => handlePlayPause(),
 *   onLeft: () => seekBackward(),
 *   onRight: () => seekForward(),
 *   onBack: () => router.back(),
 *   enabled: !isModalOpen,
 * });
 * ```
 */
export function useTVRemote(options: UseTVRemoteOptions) {
    // Store the latest options in a ref so the TVEventHandler callback
    // always sees current values without needing to re-register.
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        if (!Platform.isTV) return;

        let eventHandler: any = null;

        try {
            // TVEventHandler is available as a class in react-native on Android TV builds
            const TVEventHandler = require('react-native').TVEventHandler;
            if (!TVEventHandler) return;

            eventHandler = new TVEventHandler();
            eventHandler.enable(null, (_cmp: any, evt: any) => {
                if (!evt) return;

                const opts = optionsRef.current;
                if (opts.enabled === false) return;

                const { eventType, eventKeyAction } = evt;

                switch (eventType) {
                    case 'select':
                        opts.onSelect?.(eventKeyAction);
                        break;
                    case 'playPause':
                        opts.onPlayPause?.(eventKeyAction);
                        break;
                    case 'up':
                        opts.onUp?.(eventKeyAction);
                        break;
                    case 'down':
                        opts.onDown?.(eventKeyAction);
                        break;
                    case 'left':
                        opts.onLeft?.(eventKeyAction);
                        break;
                    case 'right':
                        opts.onRight?.(eventKeyAction);
                        break;
                    case 'back':
                        opts.onBack?.(eventKeyAction);
                        break;
                    case 'menu':
                        opts.onMenu?.(eventKeyAction);
                        break;
                    case 'rewind':
                        opts.onRewind?.(eventKeyAction);
                        break;
                    case 'fastForward':
                        opts.onFastForward?.(eventKeyAction);
                        break;
                    case 'stop':
                        opts.onStop?.(eventKeyAction);
                        break;
                    case 'longSelect':
                        opts.onLongSelect?.(eventKeyAction);
                        break;
                }
            });
        } catch (e) {
            console.warn('[useTVRemote] Failed to initialize TVEventHandler:', e);
        }

        return () => {
            try {
                if (eventHandler) {
                    eventHandler.disable();
                }
            } catch (e) {
                // Silent cleanup failure
            }
        };
    }, []); // Only mount/unmount — options are read from ref
}
