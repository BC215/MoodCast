import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../stores/useAuthStore";
import AuthToast from "./components/AuthToast";
import {
  getGoogleRedirectUri,
  getKakaoRedirectUri,
  getNaverRedirectUri,
  GOOGLE_OAUTH_MODE_KEY,
  GOOGLE_OAUTH_REMEMBER_KEY,
  GOOGLE_OAUTH_STATE_KEY,
  KAKAO_OAUTH_MODE_KEY,
  KAKAO_OAUTH_REMEMBER_KEY,
  KAKAO_OAUTH_STATE_KEY,
  NAVER_OAUTH_MODE_KEY,
  NAVER_OAUTH_REMEMBER_KEY,
  NAVER_OAUTH_STATE_KEY,
  OAUTH_MODE_LINK,
  SOCIAL_SIGNUP_PENDING_KEY,
} from "./socialAuth";
import { getApiMessage, getToastDuration } from "./authFeedback";
import styles from "./LoginPage.module.css";

export const SocialCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessToken, setAuthData } = useAuthStore();
  const calledRef = useRef(false);
  const [toast, setToast] = useState({ show: false, type: "", message: "" }); // import.meta.env.VITE_BACKSERVER || "/api";
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "/api";
  const pathname = window.location.pathname;
  const provider = pathname.includes("/auth/google/")
    ? "google"
    : pathname.includes("/auth/naver/")
      ? "naver"
      : "kakao";
  const providerConfig = {
    kakao: {
      label: "카카오",
      stateKey: KAKAO_OAUTH_STATE_KEY,
      modeKey: KAKAO_OAUTH_MODE_KEY,
      rememberKey: KAKAO_OAUTH_REMEMBER_KEY,
      redirectUri: getKakaoRedirectUri(),
    },
    google: {
      label: "Google",
      stateKey: GOOGLE_OAUTH_STATE_KEY,
      modeKey: GOOGLE_OAUTH_MODE_KEY,
      rememberKey: GOOGLE_OAUTH_REMEMBER_KEY,
      redirectUri: getGoogleRedirectUri(),
    },
    naver: {
      label: "네이버",
      stateKey: NAVER_OAUTH_STATE_KEY,
      modeKey: NAVER_OAUTH_MODE_KEY,
      rememberKey: NAVER_OAUTH_REMEMBER_KEY,
      redirectUri: getNaverRedirectUri(),
    },
  }[provider];
  const providerLabel = providerConfig.label;
  const stateKey = providerConfig.stateKey;
  const modeKey = providerConfig.modeKey;
  const rememberKey = providerConfig.rememberKey;
  const redirectUri = providerConfig.redirectUri;
  const loginUrl = `${BACKSERVER}/oauth/${provider}/login`;
  const linkUrl = `${BACKSERVER}/oauth/${provider}/link`;

  const showToast = (type, message) => {
    setToast({ show: true, type, message, duration: getToastDuration(type) });
  };

  const getSocialLoginErrorMessage = (error) => {
    const data = error?.response?.data;

    if (data?.status === "EMAIL_CONFLICT" || error?.response?.status === 409) {
      return `이미 MoodCast 계정으로 가입된 이메일입니다. 기존 계정으로 로그인한 뒤 설정에서 ${providerLabel} 계정을 연결해주세요.`;
    }

    return getApiMessage(
      error,
      error.message || `${providerLabel} 로그인 설정을 확인해주세요.`,
    );
  };

  useEffect(() => {
    if (calledRef.current) {
      return;
    }
    calledRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const savedState = window.sessionStorage.getItem(stateKey);
    const oauthMode = window.sessionStorage.getItem(modeKey);
    const remember = window.sessionStorage.getItem(rememberKey) === "true";
    window.sessionStorage.removeItem(stateKey);
    window.sessionStorage.removeItem(modeKey);
    window.sessionStorage.removeItem(rememberKey);

    if (!code) {
      showToast("error", `${providerLabel} 인증 코드가 없습니다.`);
      setTimeout(() => navigate("/auth/login", { replace: true }), 1200);
      return;
    }

    if (!savedState || savedState !== state) {
      showToast(
        "error",
        `${providerLabel} 로그인 요청 정보가 올바르지 않습니다.`,
      );
      setTimeout(() => navigate("/auth/login", { replace: true }), 1200);
      return;
    }

    if (oauthMode === OAUTH_MODE_LINK) {
      if (!accessToken) {
        showToast("error", `로그인 후 ${providerLabel} 계정을 연결해주세요.`);
        setTimeout(() => navigate("/auth/login", { replace: true }), 1200);
        return;
      }

      axios
        .post(
          linkUrl,
          {
            code,
            redirectUri,
            state,
          },
          {
            headers: {
              Authorization: "Bearer " + accessToken,
            },
          },
        )
        .then((res) => {
          showToast(
            "success",
            res.data?.message || `${providerLabel} 계정이 연결되었습니다.`,
          );
          setTimeout(() => navigate("/app/settings", { replace: true }), 900);
        })
        .catch((err) => {
          showToast(
            "error",
            getApiMessage(
              err,
              err.message || `${providerLabel} 계정 연결 정보를 확인해주세요.`,
            ),
          );
          setTimeout(() => navigate("/app/settings", { replace: true }), 1600);
        });
      return;
    }

    axios
      .post(
        loginUrl,
        {
          code,
          redirectUri,
          state,
          remember,
        },
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        if (res.data?.accessToken) {
          setAuthData(res.data.accessToken, res.data.member);
          navigate("/app/feed", { replace: true });
          return;
        }

        if (res.data?.status === "NEED_EXTRA_SIGNUP") {
          window.sessionStorage.setItem(
            SOCIAL_SIGNUP_PENDING_KEY,
            JSON.stringify({ ...res.data, remember }),
          );
          navigate("/auth/social/signup", { replace: true });
          return;
        }

        throw new Error(`${providerLabel} 로그인 응답이 올바르지 않습니다.`);
      })
      .catch((err) => {
        showToast("error", getSocialLoginErrorMessage(err));
        setTimeout(() => navigate("/auth/login", { replace: true }), 1600);
      });
  }, [
    accessToken,
    linkUrl,
    loginUrl,
    modeKey,
    navigate,
    providerLabel,
    redirectUri,
    rememberKey,
    searchParams,
    setAuthData,
    stateKey,
  ]);

  return (
    <main className={styles.page}>
      <AuthToast toast={toast} />
      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <img src="/MoodCast-logo.svg" alt="" aria-hidden="true" />
            <strong>MoodCast</strong>
          </div>
          <h1>{providerLabel} 로그인</h1>
          <p>로그인 정보를 확인하고 있습니다</p>
        </header>
      </section>
    </main>
  );
};

export default SocialCallbackPage;
