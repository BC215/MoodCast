import axios from 'axios';
import { useAuthStore, logoutAndRedirect } from '../../stores/useAuthStore';

const BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';
axios.defaults.baseURL = BACKSERVER;

let refreshPromise = null;

axios.interceptors.request.use(
  (config) => {
    // 요청을 보낼 때마다 현재 저장된 토큰을 가져옴
    // 토큰이 있으면 Authorization 헤더에 붙여서 보냄
    const state = useAuthStore.getState ? useAuthStore.getState() : null;
    const token = state?.accessToken || window.sessionStorage.getItem('moodcast-access-token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
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
    const requestUrl = originalRequest?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');
    const shouldTryRefresh =
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh &&
      !isLoginRequest &&
      !isRefreshRequest;

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            '/auth/refresh',
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
      logoutAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);

export default axios;
