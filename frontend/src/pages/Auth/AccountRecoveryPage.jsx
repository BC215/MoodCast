import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AuthToast from "./components/AuthToast";
import AuthConfirmModal from "./components/AuthConfirmModal";
import { getApiMessage, getToastDuration } from "./authFeedback";
import styles from "./LoginPage.module.css";

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

export const AccountRecoveryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode =
    searchParams.get("mode") === "password" ? "password" : "email";
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "http://localhost:8080";

  const [mode, setMode] = useState(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [foundAccount, setFoundAccount] = useState(null);
  const [findEmailCodeSent, setFindEmailCodeSent] = useState(false);
  const [findEmailCooldown, setFindEmailCooldown] = useState(0);
  const [findEmailExpireTime, setFindEmailExpireTime] = useState(0);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [passwordExpireTime, setPasswordExpireTime] = useState(0);
  const [passwordCodeVerified, setPasswordCodeVerified] = useState(false);
  const [resetSuccessModalOpen, setResetSuccessModalOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });
  const [findEmailForm, setFindEmailForm] = useState({
    name: "",
    email: "",
    authCode: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    email: "",
    authCode: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  const showToast = (type, message) => {
    const duration = getToastDuration(type);

    setToast({
      show: true,
      type: type,
      message: message,
      duration: duration,
    });

    setTimeout(() => {
      setToast({
        show: false,
        type: "",
        message: "",
      });
    }, duration);
  };

  useEffect(() => {
    if (findEmailCooldown <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setFindEmailCooldown((value) => value - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [findEmailCooldown]);

  useEffect(() => {
    if (findEmailExpireTime <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setFindEmailExpireTime((value) => value - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [findEmailExpireTime]);

  useEffect(() => {
    if (passwordCooldown <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setPasswordCooldown((value) => value - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [passwordCooldown]);

  useEffect(() => {
    if (passwordExpireTime <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setPasswordExpireTime((value) => value - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [passwordExpireTime]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setSearchParams({ mode: nextMode });
    setFoundAccount(null);
    setPasswordCodeVerified(false);
  };

  const inputFindEmail = (e) => {
    const { name } = e.target;
    const value =
      name === "authCode" ? normalizeAuthCode(e.target.value) : e.target.value;
    const identityChanged = ["name", "email"].includes(name);

    setFindEmailForm({
      ...findEmailForm,
      [name]: value,
      ...(identityChanged ? { authCode: "" } : {}),
    });
    setFoundAccount(null);

    if (identityChanged) {
      setFindEmailCodeSent(false);
      setFindEmailCooldown(0);
      setFindEmailExpireTime(0);
    }
  };

  const inputPassword = (e) => {
    const { name } = e.target;
    const shouldResetVerification = ["email", "authCode"].includes(name);
    const nextValue =
      name === "authCode" ? normalizeAuthCode(e.target.value) : e.target.value;
    const emailChanged = name === "email";
    const nextPasswordForm = {
      ...passwordForm,
      [name]: nextValue,
      ...(emailChanged ? { authCode: "" } : {}),
    };

    setPasswordForm(nextPasswordForm);

    if (shouldResetVerification && passwordCodeVerified) {
      setPasswordCodeVerified(false);
    }

    if (emailChanged) {
      setPasswordCodeSent(false);
      setPasswordCooldown(0);
      setPasswordExpireTime(0);
    }
  };

  const sendFindEmailCode = () => {
    if (findEmailCooldown > 0) {
      showToast("error", `${findEmailCooldown}초 후 다시 요청할 수 있습니다.`);
      return;
    }

    if (!findEmailForm.name.trim()) {
      showToast("error", "이름을 입력해주세요.");
      return;
    }

    if (!findEmailForm.email.trim()) {
      showToast("error", "이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    axios
      .post(`${BACKSERVER}/auth/recovery/email/send-code`, {
        name: findEmailForm.name,
        email: findEmailForm.email,
      })
      .then((res) => {
        setFindEmailForm((prev) => ({
          ...prev,
          authCode: "",
        }));
        setFindEmailCodeSent(true);
        setFindEmailCooldown(AUTH_CODE_COOLDOWN);
        setFindEmailExpireTime(AUTH_CODE_TTL);
        showToast(
          "success",
          res.data.message ||
            "가입 이메일로 인증번호를 발송했습니다. 3분 안에 입력해주세요.",
        );
        if (res.data?.authCode) {
          console.log("개발용 아이디 찾기 인증번호:", res.data.authCode);
        }
      })
      .catch((err) => {
        showToast(
          "error",
          getApiMessage(err, "이름과 이메일을 다시 확인해주세요."),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const verifyFindEmail = (e) => {
    e.preventDefault();

    if (!findEmailCodeSent) {
      showToast("error", "먼저 인증번호를 발송해주세요.");
      return;
    }

    if (findEmailExpireTime <= 0) {
      showToast("error", "인증번호가 만료되었습니다. 다시 요청해주세요.");
      return;
    }

    if (normalizeAuthCode(findEmailForm.authCode).length !== 6) {
      showToast("error", "인증번호 6자리를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    axios
      .post(`${BACKSERVER}/auth/recovery/email/verify`, {
        ...findEmailForm,
        authCode: normalizeAuthCode(findEmailForm.authCode),
      })
      .then((res) => {
        setFindEmailExpireTime(0);
        setFindEmailCodeSent(false);
        setFoundAccount({
          email: res.data.email || "",
          kakaoLinked: Boolean(res.data.kakaoLinked),
          googleLinked: Boolean(res.data.googleLinked),
          naverLinked: Boolean(res.data.naverLinked),
        });
        showToast("success", res.data.message || "계정을 찾았습니다.");
      })
      .catch((err) => {
        showToast("error", getApiMessage(err, "인증번호를 확인해주세요."));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const sendPasswordCode = () => {
    if (passwordCooldown > 0) {
      showToast("error", `${passwordCooldown}초 후 다시 요청할 수 있습니다.`);
      return;
    }

    if (!passwordForm.email.trim()) {
      showToast("error", "이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setPasswordCodeVerified(false);

    axios
      .post(`${BACKSERVER}/auth/recovery/password/send-code`, {
        email: passwordForm.email,
      })
      .then((res) => {
        setPasswordForm((prev) => ({
          ...prev,
          authCode: "",
        }));
        setPasswordCodeSent(true);
        setPasswordCooldown(AUTH_CODE_COOLDOWN);
        setPasswordExpireTime(AUTH_CODE_TTL);
        showToast(
          "success",
          res.data.message ||
            "비밀번호 재설정 이메일 인증번호를 발송했습니다. 3분 안에 입력해주세요.",
        );
        if (res.data?.authCode) {
          console.log("개발용 비밀번호 재설정 인증번호:", res.data.authCode);
        }
      })
      .catch((err) => {
        showToast(
          "error",
          getApiMessage(err, "가입 이메일을 다시 확인해주세요."),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const verifyPasswordCode = () => {
    if (!passwordCodeSent) {
      showToast("error", "먼저 인증번호를 발송해주세요.");
      return;
    }

    if (passwordExpireTime <= 0) {
      showToast("error", "인증번호가 만료되었습니다. 다시 요청해주세요.");
      return;
    }

    if (normalizeAuthCode(passwordForm.authCode).length !== 6) {
      showToast("error", "인증번호 6자리를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    axios
      .post(`${BACKSERVER}/auth/recovery/password/verify`, {
        email: passwordForm.email,
        authCode: normalizeAuthCode(passwordForm.authCode),
      })
      .then((res) => {
        setPasswordExpireTime(0);
        setPasswordCodeVerified(true);
        showToast(
          "success",
          res.data.message || "이메일 인증이 완료되었습니다.",
        );
      })
      .catch((err) => {
        setPasswordCodeVerified(false);
        showToast("error", getApiMessage(err, "인증번호를 확인해주세요."));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const resetPassword = (e) => {
    e.preventDefault();

    if (!passwordCodeVerified) {
      showToast("error", "이메일 인증을 먼저 완료해주세요.");
      return;
    }

    const resetPayload = {
      email: passwordForm.email.trim().toLowerCase(),
      authCode: normalizeAuthCode(passwordForm.authCode),
      newPassword: passwordForm.newPassword.trim(),
      newPasswordConfirm: passwordForm.newPasswordConfirm.trim(),
    };

    if (!passwordRegex.test(resetPayload.newPassword)) {
      showToast("error", passwordPolicyMessage);
      return;
    }

    if (resetPayload.newPassword !== resetPayload.newPasswordConfirm) {
      showToast("error", "새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    axios
      .post(`${BACKSERVER}/auth/recovery/password/reset`, resetPayload)
      .then((res) => {
        showToast(
          "success",
          res.data.message || "비밀번호가 재설정되었습니다.",
        );
        setResetSuccessModalOpen(true);
      })
      .catch((err) => {
        showToast(
          "error",
          getApiMessage(err, "새 비밀번호 조건을 확인해주세요."),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <main className={styles.page}>
      <AuthToast toast={toast} />
      <AuthConfirmModal
        open={resetSuccessModalOpen}
        title="비밀번호 재설정 완료"
        description="새 비밀번호로 다시 로그인해주세요. 기존 로그인 세션은 모두 만료됩니다."
        confirmOnly
        confirmText="로그인하러 가기"
        onConfirm={() => navigate("/auth/login", { replace: true })}
      />

      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <img src="/MoodCast-logo.svg" alt="" aria-hidden="true" />
            <strong>MoodCast</strong>
          </div>
          <h1>계정 찾기</h1>
          <p>가입 이메일 인증으로 계정을 확인합니다</p>
        </header>

        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === "email" ? styles.tabActive : ""}
            onClick={() => changeMode("email")}
          >
            아이디 찾기
          </button>
          <button
            type="button"
            className={mode === "password" ? styles.tabActive : ""}
            onClick={() => changeMode("password")}
          >
            비밀번호 재설정
          </button>
        </div>

        {mode === "email" ? (
          <form className={styles.form} onSubmit={verifyFindEmail}>
            <div className={styles.field}>
              <label htmlFor="findEmailName">
                이름 <b>*</b>
              </label>
              <input
                id="findEmailName"
                name="name"
                value={findEmailForm.name}
                onChange={inputFindEmail}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className={styles.codeRow}>
              <div className={styles.field}>
                <label htmlFor="findEmailAddress">
                  이메일 <b>*</b>
                </label>
                <input
                  type="email"
                  id="findEmailAddress"
                  name="email"
                  value={findEmailForm.email}
                  onChange={inputFindEmail}
                  placeholder="가입 이메일 주소"
                />
              </div>
              <button
                type="button"
                className={styles.secondary}
                onClick={sendFindEmailCode}
                disabled={isLoading || findEmailCooldown > 0}
              >
                {isLoading
                  ? "발송 중"
                  : findEmailCooldown > 0
                    ? `${findEmailCooldown}초`
                    : findEmailCodeSent
                      ? "인증번호 재발송"
                      : "인증번호 발송"}
              </button>
            </div>

            <div className={styles.codeRow}>
              <div className={styles.field}>
                <label htmlFor="findEmailAuthCode">
                  인증번호 <b>*</b>
                </label>
                <input
                  id="findEmailAuthCode"
                  name="authCode"
                  value={findEmailForm.authCode}
                  onChange={inputFindEmail}
                  placeholder="6자리"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                {findEmailCodeSent ? (
                  <p
                    className={
                      findEmailExpireTime > 0
                        ? styles.timerText
                        : styles.messageDanger
                    }
                  >
                    {findEmailExpireTime > 0
                      ? `남은 시간 ${formatAuthTime(findEmailExpireTime)}`
                      : "인증번호가 만료되었습니다. 다시 요청해주세요."}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                className={styles.secondary}
                disabled={
                  isLoading ||
                  !findEmailCodeSent ||
                  findEmailExpireTime <= 0 ||
                  findEmailForm.authCode.length !== 6
                }
              >
                인증 확인
              </button>
            </div>

            {foundAccount ? (
              <p className={styles.resultBox}>
                가입 이메일: {foundAccount.email}
                {foundAccount.kakaoLinked ? (
                  <span>카카오 연동 계정입니다.</span>
                ) : null}
                {foundAccount.googleLinked ? (
                  <span>Google 연동 계정입니다.</span>
                ) : null}
                {foundAccount.naverLinked ? (
                  <span>네이버 연동 계정입니다.</span>
                ) : null}
              </p>
            ) : null}
          </form>
        ) : (
          <form className={styles.form} onSubmit={resetPassword}>
            <div className={styles.field}>
              <label htmlFor="resetEmail">
                이메일 <b>*</b>
              </label>
              <input
                type="email"
                id="resetEmail"
                name="email"
                value={passwordForm.email}
                onChange={inputPassword}
                placeholder="이메일 주소를 입력하세요"
                readOnly={passwordCodeVerified}
              />
            </div>

            <button
              type="button"
              className={styles.secondary}
              onClick={sendPasswordCode}
              disabled={
                isLoading || passwordCooldown > 0 || passwordCodeVerified
              }
            >
              {passwordCodeVerified
                ? "이메일 인증완료"
                : isLoading
                  ? "발송 중"
                  : passwordCooldown > 0
                    ? `${passwordCooldown}초`
                    : passwordCodeSent
                      ? "이메일 인증번호 재발송"
                      : "이메일 인증번호 발송"}
            </button>

            <div className={styles.codeRow}>
              <div className={styles.field}>
                <label htmlFor="resetAuthCode">
                  인증번호 <b>*</b>
                </label>
                <input
                  id="resetAuthCode"
                  name="authCode"
                  value={passwordForm.authCode}
                  onChange={inputPassword}
                  placeholder="6자리"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  readOnly={passwordCodeVerified}
                />
                {passwordCodeSent && !passwordCodeVerified ? (
                  <p
                    className={
                      passwordExpireTime > 0
                        ? styles.timerText
                        : styles.messageDanger
                    }
                  >
                    {passwordExpireTime > 0
                      ? `남은 시간 ${formatAuthTime(passwordExpireTime)}`
                      : "인증번호가 만료되었습니다. 다시 요청해주세요."}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className={styles.secondary}
                onClick={verifyPasswordCode}
                disabled={
                  isLoading ||
                  passwordCodeVerified ||
                  !passwordCodeSent ||
                  passwordExpireTime <= 0 ||
                  passwordForm.authCode.length !== 6
                }
              >
                {passwordCodeVerified ? "확인완료" : "인증 확인"}
              </button>
            </div>

            {passwordCodeVerified ? (
              <p className={styles.message}>이메일 인증이 완료되었습니다.</p>
            ) : null}

            <div className={styles.field}>
              <label htmlFor="newPassword">
                새 비밀번호 <b>*</b>
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={inputPassword}
                placeholder="영문, 숫자, 특수문자 포함 8~20자"
                disabled={!passwordCodeVerified}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="newPasswordConfirm">
                새 비밀번호 확인 <b>*</b>
              </label>
              <input
                type="password"
                id="newPasswordConfirm"
                name="newPasswordConfirm"
                value={passwordForm.newPasswordConfirm}
                onChange={inputPassword}
                placeholder="새 비밀번호를 다시 입력하세요"
                disabled={!passwordCodeVerified}
              />
            </div>

            <button
              type="submit"
              className={styles.primary}
              disabled={isLoading || !passwordCodeVerified}
            >
              {isLoading ? "변경 중..." : "비밀번호 재설정"}
            </button>
          </form>
        )}

        <p className={styles.signupText}>
          로그인 화면으로 돌아갈까요?{" "}
          <button type="button" onClick={() => navigate("/auth/login")}>
            로그인
          </button>
        </p>
      </section>
    </main>
  );
};

export default AccountRecoveryPage;
