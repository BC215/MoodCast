const API_BASE = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

export function buildWebSocketUrl(path) {
  const baseUrl = new URL(API_BASE);
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  baseUrl.pathname = path;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl.toString();
}

export const websocketBaseUrl = buildWebSocketUrl('/ws-chat');
export const groupChatWebsocketBaseUrl = buildWebSocketUrl('/ws-stomp');
