'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

const INTERVAL_MS = 60_000;

export default function Heartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const ping = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
      }
    };

    ping();
    const id = setInterval(ping, INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  return null;
}
