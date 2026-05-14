import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOfflineQueue } from '@/lib/offlinePins';

export default function OfflineBanner({ onSync }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setQueueCount(getOfflineQueue().length);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => setQueueCount(getOfflineQueue().length), 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await onSync();
    setQueueCount(getOfflineQueue().length);
    setSyncing(false);
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 3000);
  };

  const showBanner = !isOnline || queueCount > 0;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
            !isOnline
              ? 'bg-red-500/10 border-red-500/20 text-red-700'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-700'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>You're offline — pins will sync when reconnected</span>
            </>
          ) : queueCount > 0 ? (
            <>
              <Wifi className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{queueCount} pin{queueCount > 1 ? 's' : ''} queued</span>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="ml-1 flex items-center gap-1 underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : justSynced ? 'Synced!' : 'Sync now'}
              </button>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}