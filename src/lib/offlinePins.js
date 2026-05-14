/**
 * Offline pin queue — stores unsaved pins in localStorage and flushes when online.
 */

const QUEUE_KEY = 'offline_pin_queue';

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