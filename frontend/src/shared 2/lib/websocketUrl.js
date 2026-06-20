// Vercel 프록시를 거치지 않고 EC2 백엔드로 직접 연결하기 위한 환경 변수
const WEBSOCKET_SERVER_URL = (
  import.meta.env.VITE_WEBSOCKET_SERVER || "http://localhost:8080"
).trim();

function resolveBaseUrl(value) {
  const normalizedValue = String(value || "").trim();

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue.replace(/\/+$/, "");
  }
  // Vercel 환경에서는 window.location.origin이 https://mood-cast-sooty.vercel.app 이므로
  // http://localhost:8080 같은 로컬 주소나 /api 같은 상대 경로가 들어오면
  // window.location.origin을 붙여서 절대 경로로 만들어줍니다.
  // 하지만 웹소켓은 직접 EC2 IP로 연결하므로 이 로직은 사용하지 않습니다.
  return normalizedValue.replace(/\/+$/, "");
}

export function buildWebSocketUrl(path = "/ws-chat") {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;

  // 🚨 EC2 백엔드 주소를 직접 사용합니다.
  const resolvedUrl = new URL(
    `${resolveBaseUrl(WEBSOCKET_SERVER_URL)}${normalizedPath}`,
  );

  resolvedUrl.protocol = resolvedUrl.protocol === "https:" ? "wss:" : "ws:";
  resolvedUrl.search = "";
  resolvedUrl.hash = "";

  return resolvedUrl.toString();
}

export const websocketBaseUrl = buildWebSocketUrl("/ws-chat");
export const groupChatWebsocketBaseUrl = buildWebSocketUrl("/ws-stomp");
