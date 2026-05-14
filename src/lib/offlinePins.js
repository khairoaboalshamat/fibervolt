/**
 * Offline sync queue and caching system
 * - Cache: stores existing pins for offline access
 * - Sync Queue: stores pin edits, new pins, and sales to sync when online
 */

const CACHE_KEY = 'pin_cache';
const SYNC_QUEUE_KEY = 'offline_sync_queue';
const CACHE_TIMESTAMP_KEY = 'pin_cache_timestamp';

// === PIN CACHE (for offline viewing of existing pins) ===

export function getPinCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function cachePins(pins) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(pins));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function getCacheTimestamp() {
  try {
    const ts = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    return ts ? parseInt(ts) : null;
  } catch {
    return null;
  }
}

// === SYNC QUEUE (for offline edits and new pins) ===

export function getSyncQueue() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToSyncQueue(action, data) {
  const queue = getSyncQueue();
  const entry = {
    _syncId: Date.now() + Math.random(),
    action, // 'create', 'update', 'sale'
    data,
    timestamp: Date.now(),
  };
  queue.push(entry);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  return entry._syncId;
}

export function removeFromSyncQueue(syncId) {
  const queue = getSyncQueue().filter(p => p._syncId !== syncId);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function clearSyncQueue() {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

/**
 * Flush the sync queue — processes all queued actions (create, update, sale).
 * Returns count of successfully synced items.
 */
export async function flushSyncQueue(handlers) {
  const queue = getSyncQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const item of queue) {
    const { _syncId, action, data } = item;
    const handler = handlers[action];
    
    if (handler) {
      try {
        await handler(data);
        removeFromSyncQueue(_syncId);
        synced++;
      } catch (error) {
        // Keep item in queue if sync fails
        console.error(`Failed to sync ${action}:`, error);
      }
    }
  }
  return synced;
}

// Legacy offline queue support (new pins without customer data)
export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(pin) {
  return addToSyncQueue('create', pin);
}

export function removeFromOfflineQueue(offlineId) {
  removeFromSyncQueue(offlineId);
}

export function clearOfflineQueue() {
  clearSyncQueue();
}

/**
 * Legacy flush function for backward compatibility
 */
export async function flushOfflineQueue(createFn) {
  return flushSyncQueue({ create: createFn });
}