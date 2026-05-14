// Offline sync queue manager with localStorage persistence
const SYNC_QUEUE_KEY = 'offline_sync_queue';
const CONNECTIVITY_KEY = 'last_online_status';

export function initOfflineSync() {
  // Monitor online/offline status
  window.addEventListener('online', () => {
    localStorage.setItem(CONNECTIVITY_KEY, 'online');
    const event = new CustomEvent('app:online', { detail: { timestamp: Date.now() } });
    window.dispatchEvent(event);
  });

  window.addEventListener('offline', () => {
    localStorage.setItem(CONNECTIVITY_KEY, 'offline');
    const event = new CustomEvent('app:offline', { detail: { timestamp: Date.now() } });
    window.dispatchEvent(event);
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.log('Service Worker registration failed:', err);
    });
  }
}

export function isOnline() {
  return navigator.onLine;
}

export function getOfflineQueueSize() {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  return queue.length;
}

export function addToOfflineQueue(action, payload) {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  queue.push({
    id: `${action}-${Date.now()}`,
    action,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  return queue.length;
}

export function clearOfflineQueue() {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
}

export async function syncOfflineQueue(handlers) {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      const handler = handlers[item.action];
      if (handler) {
        await handler(item.payload);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to sync ${item.action}:`, error);
      item.retries = (item.retries || 0) + 1;
      // Keep items with < 3 retries
      if (item.retries < 3) {
        remaining.push(item);
      } else {
        failed++;
      }
    }
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed, remaining: remaining.length };
}

export function getSyncQueueItems() {
  return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
}