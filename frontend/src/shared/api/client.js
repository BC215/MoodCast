import axios from "axios";
import { useAuthStore } from "../../stores/useAuthStore";

// Vercel 배포 환경에서는 VITE_BACKSERVER='/api'
// 로컬 개발 환경(.env)에서는 VITE_BACKSERVER='http://localhost:8080/api'
const API_BASE_URL = import.meta.env.VITE_BACKSERVER;

if (!API_BASE_URL) {
  console.error(
    "VITE_BACKSERVER 환경 변수가 설정되지 않았습니다. .env 파일을 확인하거나 빌드 설정을 점검하세요.",
  );
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 요청 인터셉터: 모든 요청에 인증 토큰을 자동으로 추가합니다.
apiClient.interceptors.request.use(
  (config) => {
    // Zustand 스토어에서 직접 상태를 가져옵니다. (컴포넌트 외부이므로 hook 사용 불가)
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
