import axios from "axios";
import { useAuthStore, logoutAndRedirect } from "../../stores/useAuthStore";

const BACKSERVER = (import.meta.env.VITE_BACKSERVER || "/api").trim();
const NORMALIZED_BACKSERVER = BACKSERVER.replace(/\/+$/, "");

axios.defaults.baseURL = NORMALIZED_BACKSERVER || "/api";

let refreshPromise = null;

axios.interceptors.request.use(
  (config) => {
    // Vercel 환경에서 발생하는 /api/api/... 중복 경로 생성 방지 로직
    // baseURL이 이미 /api로 설정되어 있으므로, url에 포함된 /api/는 제거합니다.
    if (config.url && config.url.startsWith("/api/")) {
      config.url = config.url.replace(/^\/api\//, "/");
    }

    // Zustand 상태를 거치지 않고, 브라우저의 sessionStorage에서 직접 토큰을 꺼냅니다.
    let token = window.sessionStorage.getItem("moodcast-access-token");

    if (token && token !== "undefined" && token !== "null") {
      token = token.replace(/^"|"$/g, ""); // 🚨 불필요한 앞뒤 따옴표 완벽 제거
      config.headers = config.headers || {};
      config.headers.Authorization = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = originalRequest?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");
    const isRefreshRequest = requestUrl.includes("/auth/refresh");
    const shouldTryRefresh =
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh &&
      !isLoginRequest &&
      !isRefreshRequest;

    if (!shouldTryRefresh) {
      // 🚨 재시도할 수 없는 401/403 에러인 경우 로컬 스토리지를 완전히 폭파시켜 무한 루프를 막습니다.
      if ((status === 401 || status === 403) && !isLoginRequest) {
        window.sessionStorage.removeItem("moodcast-access-token");
        window.sessionStorage.removeItem("moodcast-member");
        try {
          useAuthStore.setState({
            isLoggedIn: false,
            accessToken: null,
            member: null,
          });
        } catch (e) {}
        if (typeof window !== "undefined") {
          window.location.replace("/auth/login");
        }
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            "/auth/refresh",
            {},
            {
              withCredentials: true,
              _skipAuthRefresh: true,
            },
          )
          .then((res) => {
            const { accessToken, member } = res.data || {};
            useAuthStore.getState().setAuthData(accessToken, member);
            return accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      return axios(originalRequest);
    } catch (refreshError) {
      // 🚨 토큰 갱신 실패 시에도 스토리지를 먼저 완전히 폭파시킵니다.
      window.sessionStorage.removeItem("moodcast-access-token");
      window.sessionStorage.removeItem("moodcast-member");
      try {
        useAuthStore.setState({
          isLoggedIn: false,
          accessToken: null,
          member: null,
        });
      } catch (e) {}
      logoutAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);

export default axios;
