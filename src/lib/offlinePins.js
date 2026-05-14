/**
 * Offline pin caching and queue system
 * - Cache: stores existing pins for offline access
 * - Queue: stores unsaved pins to be synced when online
 */

const CACHE_KEY = 'pin_cache';
const QUEUE_KEY = 'offline_pin_queue';
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

// === OFFLINE QUEUE (for unsaved pins) ===

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(pin) {
  const queue = getOfflineQueue();
  const entry = { ...pin, _offlineId: Date.now() + Math.random() };
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry._offlineId;
}

export function removeFromOfflineQueue(offlineId) {
  const queue = getOfflineQueue().filter(p => p._offlineId !== offlineId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Flush the queue — tries to create each queued pin.
 * Returns count of successfully synced pins.
 */
export async function flushOfflineQueue(createFn) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const pin of queue) {
    const { _offlineId, ...pinData } = pin;
    await createFn(pinData);
    removeFromOfflineQueue(_offlineId);
    synced++;
  }
  return synced;
}