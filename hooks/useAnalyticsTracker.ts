import { useEffect, useRef } from 'react';
import { useAnalyticsStore, ViewingSession } from '@/store/analyticsStore';

export function useAnalyticsTracker() {
  const logSession = useAnalyticsStore(s => s.logSession);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      useAnalyticsStore.getState().refreshData();
    }
  }, []);

  const trackSession = (session: Omit<ViewingSession, 'id'>) => {
    logSession({
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });
  };

  return { trackSession };
}
