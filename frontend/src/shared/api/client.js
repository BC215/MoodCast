import axios from "axios";
import { useAuthStore, logoutAndRedirect } from "../../stores/useAuthStore";

// Vercel 배포 환경에서는 VITE_BACKSERVER='/api'
// 로컬 개발 환경(.env)에서는 VITE_BACKSERVER='http://localhost:8080/api' 또는 '/api'
const API_BASE_URL = import.meta.env.VITE_BACKSERVER;

if (!API_BASE_URL) {
  console.error(
    "VITE_BACKSERVER 환경 변수가 설정되지 않았습니다. .env 파일을 확인하거나 빌드 설정을 점검하세요.",
  );
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Refresh Token(HttpOnly 쿠키) 통신을 위해 반드시 필요합니다.
});

// 요청 인터셉터: 모든 요청에 인증 토큰을 자동으로 추가합니다.
apiClient.interceptors.request.use(
  (config) => {
    // 🚨 핵심 해결책: 만약 다른 컴포넌트에서 '/api/posts'로 잘못 호출했더라도
    // baseURL인 '/api'와 합쳐져 '/api/api/posts'가 되는 현상을 원천 차단합니다.
    if (config.url && config.url.startsWith("/api/")) {
      config.url = config.url.replace(/^\/api/, "");
    }

    // Zustand 스토어와 sessionStorage 모두에서 토큰을 찾아봅니다.
    const state = useAuthStore.getState();
    const token =
      state?.accessToken ||
      window.sessionStorage.getItem("moodcast-access-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 응답 인터셉터: 401 오류 발생 시 토큰 갱신(Refresh) 로직을 처리합니다.
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 백엔드에서 401 권한 없음 에러가 났고, 아직 재시도를 하지 않은 요청이라면
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        // 백엔드에 쿠키(Refresh Token)를 보내 새로운 Access Token을 요청합니다.
        const res = await apiClient.post("/auth/refresh");

        // 백엔드 응답 방식에 따라 헤더 또는 본문에서 토큰을 추출합니다.
        let newAccessToken = res.data?.accessToken || res.data?.token;
        const authHeader = res.headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
          newAccessToken = authHeader.substring(7);
        }

        if (newAccessToken) {
          const currentMember = useAuthStore.getState().member;
          useAuthStore.getState().setAuthData(newAccessToken, currentMember);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest); // 원래 실패했던 요청 재시도!
        }
      } catch (refreshError) {
        console.error(
          "토큰 갱신 실패. 강제 로그아웃 처리됩니다.",
          refreshError,
        );
        logoutAndRedirect();
      }
    }
    return Promise.reject(error);
  },
);
