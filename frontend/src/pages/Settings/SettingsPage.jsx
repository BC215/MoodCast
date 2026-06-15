import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { DesktopShell } from "../../components/layout/DesktopShell";
import { MobileShell } from "../../components/layout/MobileShell";
import { useIsDesktop } from "../../hooks/useViewportWidth";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  startGoogleLink,
  startKakaoLink,
  startNaverLink,
} from "../Auth/socialAuth";
import AuthToast from "../Auth/components/AuthToast";
import AuthConfirmModal from "../Auth/components/AuthConfirmModal";
import { getApiMessage, getToastDuration } from "../Auth/authFeedback";
import styles from "./SettingsPage.module.css";

const sections = ["계정", "보안"];
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[?!@#$%^&*])[A-Za-z\d?!@#$%^&*]{8,20}$/;
const passwordPolicyMessage =
  "비밀번호는 영문, 숫자, 특수문자(? ! @ # $ % ^ & *)를 포함한 8~20자입니다.";
const AUTH_CODE_TTL = 180;
const AUTH_CODE_COOLDOWN = 60;
const normalizeAuthCode = (value) => value.replace(/\D/g, "").slice(0, 6);
const formatAuthTime = (seconds) => {
  const minute = Math.floor(seconds / 60);
  const second = String(seconds % 60).padStart(2, "0");
  return `${minute}:${second}`;
};
const initialPasswordForm = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirm: "",
};
const initialWithdrawForm = {
  confirmText: "",
  authCode: "",
};

export function SettingsPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const { accessToken, member, clearAuthData } = useAuthStore(); // import.meta.env.VITE_BACKSERVER || "http://localhost:8080";
  const BACKSERVER = "http://localhost:8080";
  const [kakaoLinked, setKakaoLinked] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [naverLinked, setNaverLinked] = useState(false);
  const [kakaoCanUnlink, setKakaoCanUnlink] = useState(false);
  const [googleCanUnlink, setGoogleCanUnlink] = useState(false);
  const [naverCanUnlink, setNaverCanUnlink] = useState(false);
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(true);
  const [kakaoLinkModalOpen, setKakaoLinkModalOpen] = useState(false);
  const [googleLinkModalOpen, setGoogleLinkModalOpen] = useState(false);
  const [naverLinkModalOpen, setNaverLinkModalOpen] = useState(false);
  const [unlinkModal, setUnlinkModal] = useState(null);
  const [passwordSuccessModalOpen, setPasswordSuccessModalOpen] =
    useState(false);
  const [passwordSuccessModal, setPasswordSuccessModal] = useState({
    title: "비밀번호가 변경되었습니다.",
    description: "보안을 위해 다시 로그인해주세요.",
  });
  const [withdrawConfirmModalOpen, setWithdrawConfirmModalOpen] =
    useState(false);
  const [withdrawSuccessModalOpen, setWithdrawSuccessModalOpen] =
    useState(false);
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false);
  const [logoutAllSuccessOpen, setLogoutAllSuccessOpen] = useState(false);
  const [withdrawPanelOpen, setWithdrawPanelOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [withdrawForm, setWithdrawForm] = useState(initialWithdrawForm);
  const [withdrawEmailCodeSent, setWithdrawEmailCodeSent] = useState(false);
  const [withdrawEmailCooldown, setWithdrawEmailCooldown] = useState(0);
  const [withdrawEmailExpireTime, setWithdrawEmailExpireTime] = useState(0);
  const [withdrawEmailVerified, setWithdrawEmailVerified] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [isWithdrawEmailSending, setIsWithdrawEmailSending] = useState(false);
  const [isWithdrawEmailVerifying, setIsWithdrawEmailVerifying] =
    useState(false);
  const [isSocialUnlinkLoading, setIsSocialUnlinkLoading] = useState(false);
  const [isLogoutAllLoading, setIsLogoutAllLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  const showToast = (type, message) => {
    const duration = getToastDuration(type);
    setToast({ show: true, type, message, duration });
    setTimeout(
      () => setToast({ show: false, type: "", message: "" }),
      duration,
    );
  };

  useEffect(() => {
    if (withdrawEmailCooldown <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setWithdrawEmailCooldown((value) => value - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [withdrawEmailCooldown]);

  useEffect(() => {
    if (withdrawEmailExpireTime <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setWithdrawEmailExpireTime((value) => value - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [withdrawEmailExpireTime]);

  const loadSocialStatuses = async () => {
    if (!accessToken) {
      return;
    }

    const headers = {
      Authorization: "Bearer " + accessToken,
    };

    const [kakaoResult, googleResult, naverResult] = await Promise.allSettled([
      axios.get(`${BACKSERVER}/oauth/kakao/status`, { headers }),
      axios.get(`${BACKSERVER}/oauth/google/status`, { headers }),
      axios.get(`${BACKSERVER}/oauth/naver/status`, { headers }),
    ]);

    const kakaoData =
      kakaoResult.status === "fulfilled" ? kakaoResult.value.data : {};
    const googleData =
      googleResult.status === "fulfilled" ? googleResult.value.data : {};
    const naverData =
      naverResult.status === "fulfilled" ? naverResult.value.data : {};

    setKakaoLinked(Boolean(kakaoData?.linked));
    setKakaoCanUnlink(Boolean(kakaoData?.canUnlink));
    setGoogleLinked(Boolean(googleData?.linked));
    setGoogleCanUnlink(Boolean(googleData?.canUnlink));
    setNaverLinked(Boolean(naverData?.linked));
    setNaverCanUnlink(Boolean(naverData?.canUnlink));

    const passwordStatus = [kakaoData, googleData, naverData].find(
      (data) => typeof data?.passwordLoginEnabled === "boolean",
    );
    if (passwordStatus) {
      setPasswordLoginEnabled(Boolean(passwordStatus.passwordLoginEnabled));
    }
  };

  const handleKakaoLink = () => {
    if (kakaoLinked) {
      if (!kakaoCanUnlink) {
        showToast(
          "error",
          "카카오 계정은 마지막 로그인 수단입니다. 보안에서 비밀번호를 설정하거나 다른 소셜을 연결한 뒤 해제해주세요.",
        );
        return;
      }

      setUnlinkModal({ provider: "kakao", label: "카카오" });
      return;
    }

    setKakaoLinkModalOpen(true);
  };

  const confirmKakaoLink = () => {
    try {
      setKakaoLinkModalOpen(false);
      startKakaoLink();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const handleGoogleLink = () => {
    if (googleLinked) {
      if (!googleCanUnlink) {
        showToast(
          "error",
          "Google 계정은 마지막 로그인 수단입니다. 보안에서 비밀번호를 설정하거나 다른 소셜을 연결한 뒤 해제해주세요.",
        );
        return;
      }

      setUnlinkModal({ provider: "google", label: "Google" });
      return;
    }

    setGoogleLinkModalOpen(true);
  };

  const confirmGoogleLink = () => {
    try {
      setGoogleLinkModalOpen(false);
      startGoogleLink();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const handleNaverLink = () => {
    if (naverLinked) {
      if (!naverCanUnlink) {
        showToast(
          "error",
          "네이버 계정은 마지막 로그인 수단입니다. 보안에서 비밀번호를 설정하거나 다른 소셜을 연결한 뒤 해제해주세요.",
        );
        return;
      }

      setUnlinkModal({ provider: "naver", label: "네이버" });
      return;
    }

    setNaverLinkModalOpen(true);
  };

  const confirmNaverLink = () => {
    try {
      setNaverLinkModalOpen(false);
      startNaverLink();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const confirmSocialUnlink = async () => {
    if (!unlinkModal) {
      return;
    }

    try {
      setIsSocialUnlinkLoading(true);
      const res = await axios.delete(
        `${BACKSERVER}/oauth/${unlinkModal.provider}/link`,
        {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        },
      );

      setUnlinkModal(null);
      await loadSocialStatuses();
      showToast(
        "success",
        res.data?.message || `${unlinkModal.label} 계정 연결이 해제되었습니다.`,
      );
    } catch (error) {
      showToast(
        "error",
        getApiMessage(
          error,
          `${unlinkModal.label} 계정 연결 해제에 실패했습니다.`,
        ),
      );
    } finally {
      setIsSocialUnlinkLoading(false);
    }
  };

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWithdrawInputChange = (event) => {
    const { name, value } = event.target;
    setWithdrawForm((prev) => ({
      ...prev,
      [name]: name === "authCode" ? normalizeAuthCode(value) : value,
    }));

    if (name === "authCode" && withdrawEmailVerified) {
      setWithdrawEmailVerified(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    const payload = {
      currentPassword: passwordForm.currentPassword.trim(),
      newPassword: passwordForm.newPassword.trim(),
      newPasswordConfirm: passwordForm.newPasswordConfirm.trim(),
    };

    if (!payload.currentPassword) {
      showToast("error", "현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!passwordRegex.test(payload.newPassword)) {
      showToast("error", passwordPolicyMessage);
      return;
    }

    if (payload.newPassword !== payload.newPasswordConfirm) {
      showToast("error", "새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setIsPasswordLoading(true);
      await axios.post(`${BACKSERVER}/auth/password/change`, payload, {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
        withCredentials: true,
      });

      clearAuthData();
      setPasswordForm(initialPasswordForm);
      setPasswordSuccessModal({
        title: "비밀번호가 변경되었습니다.",
        description: "보안을 위해 다시 로그인해주세요.",
      });
      setPasswordSuccessModalOpen(true);
    } catch (error) {
      showToast("error", getApiMessage(error, "비밀번호 변경에 실패했습니다."));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handlePasswordSetup = async (event) => {
    event.preventDefault();

    const payload = {
      newPassword: passwordForm.newPassword.trim(),
      newPasswordConfirm: passwordForm.newPasswordConfirm.trim(),
    };

    if (!passwordRegex.test(payload.newPassword)) {
      showToast("error", passwordPolicyMessage);
      return;
    }

    if (payload.newPassword !== payload.newPasswordConfirm) {
      showToast("error", "새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setIsPasswordLoading(true);
      await axios.post(`${BACKSERVER}/auth/password/setup`, payload, {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
        withCredentials: true,
      });

      clearAuthData();
      setPasswordForm(initialPasswordForm);
      setPasswordSuccessModal({
        title: "비밀번호가 설정되었습니다.",
        description:
          "보안을 위해 다시 로그인해주세요. 이제 일반 로그인도 사용할 수 있습니다.",
      });
      setPasswordSuccessModalOpen(true);
    } catch (error) {
      showToast("error", getApiMessage(error, "비밀번호 설정에 실패했습니다."));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const confirmPasswordSuccess = () => {
    setPasswordSuccessModalOpen(false);
    navigate("/auth/login", { replace: true });
  };

  const requestLogoutAll = () => {
    setLogoutAllConfirmOpen(true);
  };

  const confirmLogoutAll = async () => {
    if (!accessToken) {
      showToast("error", "로그인이 필요합니다.");
      return;
    }

    try {
      setIsLogoutAllLoading(true);
      await axios.post(
        `${BACKSERVER}/auth/logout/all`,
        {},
        {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
          withCredentials: true,
        },
      );

      clearAuthData();
      setLogoutAllConfirmOpen(false);
      setLogoutAllSuccessOpen(true);
    } catch (error) {
      showToast(
        "error",
        getApiMessage(error, "모든 기기 로그아웃에 실패했습니다."),
      );
    } finally {
      setIsLogoutAllLoading(false);
    }
  };

  const confirmLogoutAllSuccess = () => {
    setLogoutAllSuccessOpen(false);
    navigate("/auth/login", { replace: true });
  };

  const renderLogoutAllPanel = () => (
    <div className={styles.securityActionPanel}>
      <div>
        <strong>모든 기기에서 로그아웃</strong>
        <p>분실한 기기나 공용 PC에 남아있는 로그인 세션을 종료합니다.</p>
      </div>
      <button
        type="button"
        className={styles.outlineDangerButton}
        onClick={requestLogoutAll}
        disabled={isLogoutAllLoading}
      >
        {isLogoutAllLoading ? "처리 중" : "모든 기기 로그아웃"}
      </button>
    </div>
  );

  const toggleWithdrawPanel = () => {
    if (withdrawPanelOpen) {
      setWithdrawForm(initialWithdrawForm);
      setWithdrawEmailCodeSent(false);
      setWithdrawEmailCooldown(0);
      setWithdrawEmailExpireTime(0);
      setWithdrawEmailVerified(false);
    }

    setWithdrawPanelOpen((prev) => !prev);
  };

  const sendWithdrawEmailCode = async () => {
    if (withdrawEmailCooldown > 0) {
      showToast(
        "error",
        `${withdrawEmailCooldown}초 후 다시 요청할 수 있습니다.`,
      );
      return;
    }

    try {
      setIsWithdrawEmailSending(true);
      const res = await axios.post(
        `${BACKSERVER}/auth/withdraw/email/send`,
        {},
        {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        },
      );

      setWithdrawEmailCodeSent(true);
      setWithdrawEmailCooldown(AUTH_CODE_COOLDOWN);
      setWithdrawEmailExpireTime(AUTH_CODE_TTL);
      setWithdrawEmailVerified(false);
      setWithdrawForm((prev) => ({
        ...prev,
        authCode: "",
      }));
      showToast(
        "success",
        res.data?.message || "탈퇴 확인 이메일 인증번호를 발송했습니다.",
      );
      if (res.data?.authCode) {
        console.log("개발용 탈퇴 인증번호:", res.data.authCode);
      }
    } catch (error) {
      showToast(
        "error",
        getApiMessage(error, "탈퇴 확인 이메일 인증번호 발송에 실패했습니다."),
      );
    } finally {
      setIsWithdrawEmailSending(false);
    }
  };

  const verifyWithdrawEmailCode = async () => {
    if (!withdrawEmailCodeSent) {
      showToast("error", "먼저 이메일 인증번호를 발송해주세요.");
      return;
    }

    if (withdrawEmailExpireTime <= 0) {
      showToast("error", "인증번호가 만료되었습니다. 다시 요청해주세요.");
      return;
    }

    if (normalizeAuthCode(withdrawForm.authCode).length !== 6) {
      showToast("error", "이메일 인증번호 6자리를 입력해주세요.");
      return;
    }

    try {
      setIsWithdrawEmailVerifying(true);
      const res = await axios.post(
        `${BACKSERVER}/auth/withdraw/email/verify`,
        {
          authCode: normalizeAuthCode(withdrawForm.authCode),
        },
        {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        },
      );

      setWithdrawEmailVerified(true);
      setWithdrawEmailExpireTime(0);
      showToast(
        "success",
        res.data?.message || "탈퇴 이메일 인증이 완료되었습니다.",
      );
    } catch (error) {
      showToast(
        "error",
        getApiMessage(error, "이메일 인증번호를 확인해주세요."),
      );
    } finally {
      setIsWithdrawEmailVerifying(false);
    }
  };

  const requestWithdraw = (event) => {
    event.preventDefault();

    if (!withdrawEmailVerified) {
      showToast("error", "이메일 인증을 먼저 완료해주세요.");
      return;
    }

    if (withdrawForm.confirmText.trim() !== "탈퇴합니다") {
      showToast(
        "error",
        "탈퇴 확인 문구는 '탈퇴합니다'로 정확히 입력해주세요.",
      );
      return;
    }

    setWithdrawConfirmModalOpen(true);
  };

  const confirmWithdraw = async () => {
    try {
      setIsWithdrawLoading(true);
      setWithdrawConfirmModalOpen(false);

      await axios.post(
        `${BACKSERVER}/auth/withdraw`,
        {
          confirmText: withdrawForm.confirmText.trim(),
        },
        {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
          withCredentials: true,
        },
      );

      clearAuthData();
      setWithdrawForm(initialWithdrawForm);
      setWithdrawPanelOpen(false);
      setWithdrawEmailCodeSent(false);
      setWithdrawEmailCooldown(0);
      setWithdrawEmailExpireTime(0);
      setWithdrawEmailVerified(false);
      setWithdrawSuccessModalOpen(true);
    } catch (error) {
      showToast("error", getApiMessage(error, "회원 탈퇴에 실패했습니다."));
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const confirmWithdrawSuccess = () => {
    setWithdrawSuccessModalOpen(false);
    navigate("/auth/login", { replace: true });
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    loadSocialStatuses();
  }, [BACKSERVER, accessToken]);

  const linkedProviderCount = [kakaoLinked, googleLinked, naverLinked].filter(
    Boolean,
  ).length;
  const loginMethodCount = linkedProviderCount + (passwordLoginEnabled ? 1 : 0);
  const socialOnlyLastMethod =
    !passwordLoginEnabled && linkedProviderCount <= 1;

  const content = (
    <section className={styles.wrap}>
      <AuthToast toast={toast} />
      <AuthConfirmModal
        open={kakaoLinkModalOpen}
        title="카카오 계정을 연결할까요?"
        description="현재 MoodCast 계정에 카카오 로그인을 추가합니다. 연결 후에는 같은 이메일의 카카오 계정으로도 로그인할 수 있습니다."
        cancelText="취소"
        confirmText="연결하기"
        onCancel={() => setKakaoLinkModalOpen(false)}
        onConfirm={confirmKakaoLink}
      />
      <AuthConfirmModal
        open={googleLinkModalOpen}
        title="Google 계정을 연결할까요?"
        description="현재 MoodCast 계정에 Google 로그인을 추가합니다. 연결 후에는 같은 이메일의 Google 계정으로도 로그인할 수 있습니다."
        cancelText="취소"
        confirmText="연결하기"
        onCancel={() => setGoogleLinkModalOpen(false)}
        onConfirm={confirmGoogleLink}
      />
      <AuthConfirmModal
        open={naverLinkModalOpen}
        title="네이버 계정을 연결할까요?"
        description="현재 MoodCast 계정에 네이버 로그인을 추가합니다. 연결 후에는 같은 이메일의 네이버 계정으로도 로그인할 수 있습니다."
        cancelText="취소"
        confirmText="연결하기"
        onCancel={() => setNaverLinkModalOpen(false)}
        onConfirm={confirmNaverLink}
      />
      <AuthConfirmModal
        open={Boolean(unlinkModal)}
        title={`${unlinkModal?.label || "소셜"} 계정 연결을 해제할까요?`}
        description={`해제하면 ${unlinkModal?.label || "소셜"} 로그인은 사용할 수 없습니다. MoodCast 계정과 기존 게시글은 그대로 유지됩니다.`}
        cancelText="취소"
        confirmText={isSocialUnlinkLoading ? "해제 중" : "해제하기"}
        cancelDisabled={isSocialUnlinkLoading}
        confirmDisabled={isSocialUnlinkLoading}
        onCancel={() => setUnlinkModal(null)}
        onConfirm={confirmSocialUnlink}
      />
      <AuthConfirmModal
        open={passwordSuccessModalOpen}
        title={passwordSuccessModal.title}
        description={passwordSuccessModal.description}
        confirmOnly
        confirmText="로그인하기"
        onConfirm={confirmPasswordSuccess}
      />
      <AuthConfirmModal
        open={logoutAllConfirmOpen}
        title="모든 기기에서 로그아웃할까요?"
        description="현재 기기를 포함한 모든 로그인 세션이 종료됩니다. 다시 사용하려면 로그인해야 합니다."
        cancelText="취소"
        confirmText={isLogoutAllLoading ? "처리 중" : "로그아웃"}
        cancelDisabled={isLogoutAllLoading}
        confirmDisabled={isLogoutAllLoading}
        onCancel={() => setLogoutAllConfirmOpen(false)}
        onConfirm={confirmLogoutAll}
      />
      <AuthConfirmModal
        open={logoutAllSuccessOpen}
        title="모든 기기에서 로그아웃되었습니다."
        description="보안을 위해 다시 로그인해주세요."
        confirmOnly
        confirmText="로그인하기"
        onConfirm={confirmLogoutAllSuccess}
      />
      <AuthConfirmModal
        open={withdrawConfirmModalOpen}
        title="정말 탈퇴할까요?"
        description="탈퇴하면 현재 로그인 세션이 모두 종료되고, 같은 계정으로 다시 로그인할 수 없습니다."
        cancelText="취소"
        confirmText={isWithdrawLoading ? "처리 중" : "탈퇴하기"}
        cancelDisabled={isWithdrawLoading}
        confirmDisabled={isWithdrawLoading}
        onCancel={() => setWithdrawConfirmModalOpen(false)}
        onConfirm={confirmWithdraw}
      />
      <AuthConfirmModal
        open={withdrawSuccessModalOpen}
        title="회원 탈퇴가 완료되었습니다."
        description="그동안 MoodCast를 이용해주셔서 감사합니다."
        confirmOnly
        confirmText="로그인 화면으로"
        onConfirm={confirmWithdrawSuccess}
      />
      <div className={styles.hero}>
        <strong>설정</strong>
        <p>소셜 로그인, 비밀번호, 계정 탈퇴를 관리합니다.</p>
      </div>
      <div className={styles.grid}>
        {sections.map((title) => (
          <article key={title} className={styles.card}>
            <h2>{title}</h2>
            {title === "계정" ? (
              <>
                <p className={styles.cardText}>
                  일반 계정에 소셜 로그인을 연결합니다. 현재 로그인한 이메일과
                  같은 소셜 계정만 연결할 수 있습니다.
                </p>
                <div className={styles.accountStatusPanel}>
                  <div className={styles.statusBadges}>
                    <span>로그인 수단 {loginMethodCount}개</span>
                    <span>
                      {passwordLoginEnabled
                        ? "비밀번호 로그인 가능"
                        : "소셜 전용 계정"}
                    </span>
                  </div>
                  <p>
                    {socialOnlyLastMethod
                      ? "마지막 소셜 계정은 바로 해제할 수 없습니다. 보안에서 비밀번호를 먼저 설정해주세요."
                      : "최소 하나 이상의 로그인 수단이 남아야 소셜 연결을 해제할 수 있습니다."}
                  </p>
                </div>
                <div className={styles.providerList}>
                  <div className={styles.providerRow}>
                    <div className={styles.providerMeta}>
                      <strong>카카오</strong>
                      <span>
                        {kakaoLinked
                          ? kakaoCanUnlink
                            ? "연결됨"
                            : "연결됨 · 마지막 로그인 수단"
                          : "미연결"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={
                        kakaoLinked && kakaoCanUnlink
                          ? styles.unlinkButton
                          : undefined
                      }
                      onClick={handleKakaoLink}
                    >
                      {kakaoLinked
                        ? kakaoCanUnlink
                          ? "해제"
                          : "해제불가"
                        : "연결"}
                    </button>
                  </div>
                  <div className={styles.providerRow}>
                    <div className={styles.providerMeta}>
                      <strong>Google</strong>
                      <span>
                        {googleLinked
                          ? googleCanUnlink
                            ? "연결됨"
                            : "연결됨 · 마지막 로그인 수단"
                          : "미연결"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={
                        googleLinked && googleCanUnlink
                          ? styles.unlinkButton
                          : undefined
                      }
                      onClick={handleGoogleLink}
                    >
                      {googleLinked
                        ? googleCanUnlink
                          ? "해제"
                          : "해제불가"
                        : "연결"}
                    </button>
                  </div>
                  <div className={styles.providerRow}>
                    <div className={styles.providerMeta}>
                      <strong>네이버</strong>
                      <span>
                        {naverLinked
                          ? naverCanUnlink
                            ? "연결됨"
                            : "연결됨 · 마지막 로그인 수단"
                          : "미연결"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={
                        naverLinked && naverCanUnlink
                          ? styles.unlinkButton
                          : undefined
                      }
                      onClick={handleNaverLink}
                    >
                      {naverLinked
                        ? naverCanUnlink
                          ? "해제"
                          : "해제불가"
                        : "연결"}
                    </button>
                  </div>
                </div>
                <div className={styles.dangerZone}>
                  <button
                    type="button"
                    className={styles.textDangerButton}
                    onClick={toggleWithdrawPanel}
                    aria-expanded={withdrawPanelOpen}
                    aria-controls="withdrawPanel"
                  >
                    {withdrawPanelOpen ? "계정 관리 접기" : "계정 관리 더보기"}
                  </button>
                  {withdrawPanelOpen ? (
                    <form
                      id="withdrawPanel"
                      className={styles.withdrawForm}
                      onSubmit={requestWithdraw}
                    >
                      <div className={styles.dangerHeader}>
                        <strong>회원 탈퇴</strong>
                        <p>계정 이메일 인증 후 탈퇴할 수 있습니다.</p>
                      </div>
                      <div className={styles.emailVerifyBox}>
                        <p>
                          {member?.email || "현재 로그인한 이메일"}로 인증번호를
                          보냅니다.
                        </p>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={sendWithdrawEmailCode}
                          disabled={
                            isWithdrawEmailSending ||
                            withdrawEmailCooldown > 0 ||
                            withdrawEmailVerified
                          }
                        >
                          {isWithdrawEmailSending
                            ? "발송 중"
                            : withdrawEmailVerified
                              ? "인증완료"
                              : withdrawEmailCooldown > 0
                                ? `${withdrawEmailCooldown}초`
                                : withdrawEmailCodeSent
                                  ? "인증번호 재발송"
                                  : "인증번호 발송"}
                        </button>
                      </div>
                      <label>
                        <span>이메일 인증번호</span>
                        <div className={styles.inlineAction}>
                          <input
                            type="text"
                            name="authCode"
                            value={withdrawForm.authCode}
                            onChange={handleWithdrawInputChange}
                            placeholder="6자리 숫자"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete="one-time-code"
                            readOnly={withdrawEmailVerified}
                          />
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={verifyWithdrawEmailCode}
                            disabled={
                              !withdrawEmailCodeSent ||
                              withdrawEmailExpireTime <= 0 ||
                              withdrawForm.authCode.length !== 6 ||
                              isWithdrawEmailVerifying ||
                              withdrawEmailVerified
                            }
                          >
                            {withdrawEmailVerified
                              ? "확인완료"
                              : isWithdrawEmailVerifying
                                ? "확인 중"
                                : "인증 확인"}
                          </button>
                        </div>
                        {withdrawEmailCodeSent && !withdrawEmailVerified ? (
                          <p
                            className={
                              withdrawEmailExpireTime > 0
                                ? styles.timerText
                                : styles.dangerText
                            }
                          >
                            {withdrawEmailExpireTime > 0
                              ? `남은 시간 ${formatAuthTime(withdrawEmailExpireTime)}`
                              : "인증번호가 만료되었습니다. 다시 요청해주세요."}
                          </p>
                        ) : null}
                      </label>
                      <label>
                        <span>확인 문구</span>
                        <input
                          type="text"
                          name="confirmText"
                          value={withdrawForm.confirmText}
                          onChange={handleWithdrawInputChange}
                          placeholder="탈퇴합니다"
                        />
                      </label>
                      <button
                        type="submit"
                        className={styles.dangerButton}
                        disabled={isWithdrawLoading}
                      >
                        {isWithdrawLoading ? "처리 중" : "회원 탈퇴"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </>
            ) : title === "보안" && passwordLoginEnabled ? (
              <form
                className={styles.passwordForm}
                onSubmit={handlePasswordChange}
              >
                <p className={styles.cardText}>
                  비밀번호 변경 후 모든 기기에서 다시 로그인해야 합니다.
                </p>
                <label>
                  <span>현재 비밀번호</span>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    autoComplete="current-password"
                  />
                </label>
                <label>
                  <span>새 비밀번호</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  <span>새 비밀번호 확인</span>
                  <input
                    type="password"
                    name="newPasswordConfirm"
                    value={passwordForm.newPasswordConfirm}
                    onChange={handlePasswordInputChange}
                    autoComplete="new-password"
                  />
                </label>
                <p className={styles.helperText}>{passwordPolicyMessage}</p>
                <button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? "변경 중" : "비밀번호 변경"}
                </button>
                {renderLogoutAllPanel()}
              </form>
            ) : title === "보안" ? (
              <form
                className={styles.passwordForm}
                onSubmit={handlePasswordSetup}
              >
                <div className={styles.passwordNotice}>
                  <strong>소셜 로그인 계정입니다.</strong>
                  <p>
                    비밀번호를 설정하면 이메일/비밀번호 로그인도 사용할 수 있고,
                    마지막 소셜 계정도 해제할 수 있습니다.
                  </p>
                </div>
                <label>
                  <span>새 비밀번호</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  <span>새 비밀번호 확인</span>
                  <input
                    type="password"
                    name="newPasswordConfirm"
                    value={passwordForm.newPasswordConfirm}
                    onChange={handlePasswordInputChange}
                    autoComplete="new-password"
                  />
                </label>
                <p className={styles.helperText}>{passwordPolicyMessage}</p>
                <button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? "설정 중" : "비밀번호 설정"}
                </button>
                {renderLogoutAllPanel()}
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );

  if (!desktop)
    return (
      <MobileShell title="설정" hideSearch>
        {content}
      </MobileShell>
    );
  return <DesktopShell>{content}</DesktopShell>;
}
