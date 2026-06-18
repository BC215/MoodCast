const API_BASE = (import.meta.env.VITE_BACKSERVER || "/api").trim();

function resolveBaseUrl(value) {
  const normalizedValue = String(value || "").trim();

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue.replace(/\/+$/, "");
  }

  return `${window.location.origin}${normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`}`.replace(
    /\/+$/,
    "",
  );
}

export function buildWebSocketUrl(path = "/ws-chat") {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  const resolvedUrl = new URL(`${resolveBaseUrl(API_BASE)}${normalizedPath}`);

  resolvedUrl.protocol = resolvedUrl.protocol === "https:" ? "wss:" : "ws:";
  resolvedUrl.search = "";
  resolvedUrl.hash = "";

  return resolvedUrl.toString();
}

export const websocketBaseUrl = buildWebSocketUrl("/ws-chat");
export const groupChatWebsocketBaseUrl = buildWebSocketUrl("/ws-stomp");
