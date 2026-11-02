const toastListeners = new Set();
const connectionListeners = new Set();

let connectionState = 'online';

export function subscribeToasts(listener) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

export function pushToast({ type = 'info', message, timeout = 4500 }) {
  if (!message) return;
  const toast = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    timeout
  };
  toastListeners.forEach((listener) => listener(toast));
}

export function subscribeConnection(listener) {
  connectionListeners.add(listener);
  listener(connectionState);
  return () => connectionListeners.delete(listener);
}

export function setConnectionState(next) {
  if (next === connectionState) return;
  const previous = connectionState;
  connectionState = next;
  connectionListeners.forEach((listener) => listener(connectionState));
  if (previous === 'online' && next === 'offline') {
    pushToast({
      type: 'warning',
      message: 'Perda de comunicação com 192.168.100.10 (timeout ou erro de rede).',
      timeout: 6000
    });
  }
}

export function getConnectionState() {
  return connectionState;
}
