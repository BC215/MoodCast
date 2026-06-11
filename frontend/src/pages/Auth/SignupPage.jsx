import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { SignupView } from "./components/SignupView";
import { getApiMessage, getToastDuration } from "./authFeedback";
import { startGoogleLogin, startKakaoLogin, startNaverLogin } from "./socialAuth";

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const nameRegex = /^[가-힣]{2,10}$/;
const nicknameRegex = /^[가-힣A-Za-z0-9]{2,12}$/;
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[?!@#$%^&*])[A-Za-z\d?!@#$%^&*]{8,20}$/;
const BACKSERVER = import.meta.env.VITE_BACKSERVER || "http://localhost:8080";
const normalizeAuthCode = (value) => value.replace(/\D/g, "").slice(0, 6);

export const SignupPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [signup, setSignup] = useState({
    name: "",
    nickname: "",
    email: "",
    emailCode: "",
    password: "",
    passwordConfirm: "",
  });

  const [fieldMessage, setFieldMessage] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [fieldStatus, setFieldStatus] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    marketing: false,
  });

  // 약관 목록
  const [termsList, setTermsList] = useState([]);
  // 선택된 약관
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  // 0: 인증 전, 1: 인증번호 발송 완료, 3: 인증 완료
  const [emailAuth, setEmailAuth] = useState(0);

  // 이메일
  const [emailSendLoading, setEmailSendLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailExpireTime, setEmailExpireTime] = useState(0);

  const [message, setMessage] = useState("");
  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });
  const [signupCompleteModalOpen, setSignupCompleteModalOpen] = useState(false);

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

  // 이메일
  useEffect(() => {
    if (emailCooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setEmailCooldown(emailCooldown - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [emailCooldown]);

  useEffect(() => {
    if (emailExpireTime <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setEmailExpireTime(emailExpireTime - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [emailExpireTime]);

  const getTermsList = () => {
    setTermsLoading(true);

    return axios
      .get(`${BACKSERVER}/signup/terms`)
      .then((res) => {
        const nextTermsList = res.data.terms || [];
        setTermsList(nextTermsList);
        return nextTermsList;
      })
      .finally(() => {
        setTermsLoading(false);
      });
  };

  const inputSignup = (e) => {
    const name = e.target.name;
    const value =
      name === "emailCode" ? normalizeAuthCode(e.target.value) : e.target.value;

    setSignup({
      ...signup,
      [name]: value,
      ...(name === "email" ? { emailCode: "" } : {}),
    });

    if (name === "name") {
      const result = checkNameField(value);

      setFieldMessage((prev) => ({
        ...prev,
        name: result.message,
      }));

      setFieldStatus((prev) => ({
        ...prev,
        name: result.status,
      }));
    }

    if (name === "nickname") {
      const result = checkNicknameField(value);

      setFieldMessage((prev) => ({
        ...prev,
        nickname: result.message,
      }));

      setFieldStatus((prev) => ({
        ...prev,
        nickname: result.status,
      }));
    }

    if (name === "password") {
      const passwordResult = checkPasswordField(value);
      const passwordConfirmResult = checkPasswordConfirmField(
        value,
        signup.passwordConfirm,
      );

      setFieldMessage((prev) => ({
        ...prev,
        password: passwordResult.message,
        passwordConfirm: signup.passwordConfirm
          ? passwordConfirmResult.message
          : "",
      }));

      setFieldStatus((prev) => ({
        ...prev,
        password: passwordResult.status,
        passwordConfirm: signup.passwordConfirm
          ? passwordConfirmResult.status
          : "",
      }));
    }

    if (name === "passwordConfirm") {
      const result = checkPasswordConfirmField(signup.password, value);

      setFieldMessage((prev) => ({
        ...prev,
        passwordConfirm: result.message,
      }));

      setFieldStatus((prev) => ({
        ...prev,
        passwordConfirm: result.status,
      }));
    }

    if (name === "email") {
      setEmailAuth(0);
      setEmailCooldown(0);
      setEmailExpireTime(0);
    }

    setMessage("");
  };

  const checkNameField = (value) => {
    const name = value.trim();

    if (!name) {
      return {
        status: "invalid",
        message: "이름을 입력해주세요.",
      };
    }

    if (!nameRegex.test(name)) {
      return {
        status: "invalid",
        message: "한글 2~10자로 입력해주세요.",
      };
    }

    return {
      status: "valid",
      message: "올바른 이름 형식입니다.",
    };
  };

  const checkNicknameField = (value) => {
    const nickname = value.trim();

    if (!nickname) {
      return {
        status: "",
        message: "",
      };
    }

    if (!nicknameRegex.test(nickname)) {
      return {
        status: "invalid",
        message: "닉네임은 한글, 영문, 숫자만 사용해 2~12자로 입력해주세요.",
      };
    }

    return {
      status: "checking",
      message: "닉네임 중복 확인 중입니다.",
    };
  };

  const checkPasswordField = (value) => {
    if (!value) {
      return {
        status: "invalid",
        message: "비밀번호를 입력해주세요.",
      };
    }

    if (!passwordRegex.test(value)) {
      return {
        status: "invalid",
        message: "영문, 숫자, 특수문자를 포함해 8~20자로 입력해주세요.",
      };
    }

    return {
      status: "valid",
      message: "사용 가능한 비밀번호입니다.",
    };
  };

  const checkPasswordConfirmField = (password, passwordConfirm) => {
    if (!passwordConfirm) {
      return {
        status: "invalid",
        message: "비밀번호 확인을 입력해주세요.",
      };
    }

    if (!passwordRegex.test(password)) {
      return {
        status: "invalid",
        message: "비밀번호 조건을 먼저 확인해주세요.",
      };
    }

    if (password !== passwordConfirm) {
      return {
        status: "invalid",
        message: "비밀번호가 일치하지 않습니다.",
      };
    }

    return {
      status: "valid",
      message: "비밀번호가 일치합니다.",
    };
  };

  useEffect(() => {
    const email = signup.email.trim().toLowerCase();

    if (!email) {
      setFieldMessage((prev) => ({
        ...prev,
        email: "",
      }));

      setFieldStatus((prev) => ({
        ...prev,
        email: "",
      }));

      return;
    }

    if (!emailRegex.test(email)) {
      setFieldMessage((prev) => ({
        ...prev,
        email: "이메일 형식이 올바르지 않습니다.",
      }));

      setFieldStatus((prev) => ({
        ...prev,
        email: "invalid",
      }));

      return;
    }

    setFieldMessage((prev) => ({
      ...prev,
      email: "이메일 중복 확인 중입니다.",
    }));

    setFieldStatus((prev) => ({
      ...prev,
      email: "checking",
    }));

    const timer = setTimeout(() => {
      axios
        .get(`${BACKSERVER}/signup/check/email`, {
          params: {
            email: email,
          },
        })
        .then((res) => {
          if (res.data.available) {
            setFieldMessage((prev) => ({
              ...prev,
              email: "사용 가능한 이메일입니다.",
            }));

            setFieldStatus((prev) => ({
              ...prev,
              email: "valid",
            }));
          } else {
            setFieldMessage((prev) => ({
              ...prev,
              email: "이미 사용 중인 이메일입니다.",
            }));

            setFieldStatus((prev) => ({
              ...prev,
              email: "invalid",
            }));
          }
        })
        .catch((err) => {
          setFieldMessage((prev) => ({
            ...prev,
            email:
              err.response?.data?.message ||
              "이메일 확인 중 오류가 발생했습니다.",
          }));

          setFieldStatus((prev) => ({
            ...prev,
            email: "invalid",
          }));
        });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [signup.email]);

  useEffect(() => {
    const nickname = signup.nickname.trim();

    if (!nickname) {
      setFieldMessage((prev) => ({
        ...prev,
        nickname: "",
      }));

      setFieldStatus((prev) => ({
        ...prev,
        nickname: "",
      }));

      return;
    }

    if (!nicknameRegex.test(nickname)) {
      setFieldMessage((prev) => ({
        ...prev,
        nickname: "닉네임은 한글, 영문, 숫자만 사용해 2~12자로 입력해주세요.",
      }));

      setFieldStatus((prev) => ({
        ...prev,
        nickname: "invalid",
      }));

      return;
    }

    setFieldMessage((prev) => ({
      ...prev,
      nickname: "닉네임 중복 확인 중입니다.",
    }));

    setFieldStatus((prev) => ({
      ...prev,
      nickname: "checking",
    }));

    const timer = setTimeout(() => {
      axios
        .get(`${BACKSERVER}/signup/check/nickname`, {
          params: {
            nickname: nickname,
          },
        })
        .then((res) => {
          if (res.data.available) {
            setFieldMessage((prev) => ({
              ...prev,
              nickname: "사용 가능한 닉네임입니다.",
            }));

            setFieldStatus((prev) => ({
              ...prev,
              nickname: "valid",
            }));
          } else {
            setFieldMessage((prev) => ({
              ...prev,
              nickname: "이미 사용 중인 닉네임입니다.",
            }));

            setFieldStatus((prev) => ({
              ...prev,
              nickname: "invalid",
            }));
          }
        })
        .catch((err) => {
          setFieldMessage((prev) => ({
            ...prev,
            nickname:
              err.response?.data?.message ||
              "닉네임 확인 중 오류가 발생했습니다.",
          }));

          setFieldStatus((prev) => ({
            ...prev,
            nickname: "invalid",
          }));
        });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [signup.nickname]);

  const sendEmailAuthCode = () => {
    const email = signup.email.trim().toLowerCase();

    if (emailSendLoading) {
      return;
    }
    if (emailCooldown > 0) {
      showToast("error", `${emailCooldown}초 후 다시 요청할 수 있습니다.`);
      return;
    }

    if (!email) {
      showToast("error", "이메일을 입력해주세요.");
      return;
    }

    if (fieldStatus.email !== "valid") {
      showToast("error", "사용 가능한 이메일을 입력해주세요.");
      return;
    }

    setEmailSendLoading(true);

    axios
      .post(`${BACKSERVER}/signup/auth/email/send`, {
        email: email,
      })
      .then((res) => {
        setSignup((prev) => ({
          ...prev,
          emailCode: "",
        }));
        setEmailAuth(1);
        setEmailCooldown(60);
        setEmailExpireTime(180);
        showToast("success", res.data?.message || "이메일 인증번호를 발송했습니다. 3분 안에 입력해주세요.");
      })
      .catch((err) => {
        setEmailAuth(0);
        showToast(
          "error",
          getApiMessage(err, "이메일 주소와 요청 제한을 확인해주세요."),
        );
      })
      .finally(() => {
        setEmailSendLoading(false);
      });
  };

  const checkEmailAuthCode = () => {
    if (emailAuth !== 1) {
      showToast("error", "먼저 이메일 인증번호를 요청해주세요.");
      return;
    }

    if (emailExpireTime <= 0) {
      showToast("error", "인증번호가 만료되었습니다. 다시 요청해주세요.");
      return;
    }

    if (normalizeAuthCode(signup.emailCode).length !== 6) {
      showToast("error", "이메일 인증번호 6자리를 입력해주세요.");
      return;
    }

    axios
      .post(`${BACKSERVER}/signup/auth/email/verify`, {
        email: signup.email,
        authCode: normalizeAuthCode(signup.emailCode),
      })
      .then((res) => {
        setEmailAuth(3);
        setEmailExpireTime(0);
        showToast("success", res.data?.message || "이메일 인증이 완료되었습니다.");
      })
      .catch((err) => {
        setEmailAuth(1);
        showToast(
          "error",
          getApiMessage(err, "이메일 인증번호를 확인해주세요."),
        );
      });
  };

  const moveTermsStep = () => {
    const hasNickname = signup.nickname.trim().length > 0;

    if (fieldStatus.name !== "valid") {
      showToast("error", fieldMessage.name || "이름을 확인해주세요.");
      return;
    }

    if (hasNickname && fieldStatus.nickname !== "valid") {
      showToast("error", fieldMessage.nickname || "닉네임을 확인해주세요.");
      return;
    }

    if (fieldStatus.email !== "valid") {
      showToast("error", fieldMessage.email || "이메일을 확인해주세요.");
      return;
    }

    if (emailAuth !== 3) {
      showToast("error", "이메일 인증을 완료해주세요.");
      return;
    }

    if (fieldStatus.password !== "valid") {
      showToast("error", fieldMessage.password || "비밀번호를 확인해주세요.");
      return;
    }

    if (fieldStatus.passwordConfirm !== "valid") {
      showToast(
        "error",
        fieldMessage.passwordConfirm || "비밀번호 확인을 입력해주세요.",
      );
      return;
    }
    axios
      .post(`${BACKSERVER}/signup/validate/basic`, {
        name: signup.name,
        nickname: signup.nickname,
        email: signup.email,
        password: signup.password,
        passwordConfirm: signup.passwordConfirm,
      })
      .then(() => {
        return getTermsList();
      })
      .then((nextTermsList) => {
        if (nextTermsList.length === 0) {
          showToast("error", "등록된 약관 정보가 없습니다.");
          return;
        }

        setStep(2);
        setMessage("");
      })
      .catch((err) => {
        showToast(
          "error",
          getApiMessage(err, "입력한 기본 정보를 다시 확인해주세요."),
        );
      });
  };

  const movePrevStep = () => {
    setStep(step - 1);
    setMessage("");
  };

  const toggleTerm = (e) => {
    const name = e.target.name;
    const checked = e.target.checked;

    if (name === "all") {
      setTerms({
        service: checked,
        privacy: checked,
        marketing: checked,
      });
      return;
    }

    setTerms({
      ...terms,
      [name]: checked,
    });
  };

  const openTermContent = (termsType) => {
    const term = termsList.find((item) => item.termsType === termsType);

    if (!term) {
      showToast("error", "약관 내용을 찾을 수 없습니다.");
      return;
    }

    setSelectedTerm(term);
  };

  const closeTermContent = () => {
    setSelectedTerm(null);
  };

  const getAgreementList = () => {
    return termsList.map((term) => {
      let agreed = false;

      if (term.termsType === "SERVICE") {
        agreed = terms.service;
      }

      if (term.termsType === "PRIVACY") {
        agreed = terms.privacy;
      }

      if (term.termsType === "MARKETING") {
        agreed = terms.marketing;
      }

      return {
        termsId: term.termsId,
        agreed: agreed,
      };
    });
  };

  const completeSignup = () => {
    if (signupSubmitting) {
      return;
    }

    if (termsList.length === 0) {
      showToast("error", "약관 정보를 불러온 뒤 다시 시도해주세요.");
      return;
    }

    if (!terms.service || !terms.privacy) {
      showToast("error", "필수 약관에 동의해주세요.");
      return;
    }

    setSignupSubmitting(true);

    axios
      .post(`${BACKSERVER}/signup/complete`, {
        name: signup.name,
        nickname: signup.nickname,
        email: signup.email,
        password: signup.password,
        passwordConfirm: signup.passwordConfirm,
        agreements: getAgreementList(),
      })
      .then((res) => {
        setSignupCompleteModalOpen(true);
      })
      .catch((err) => {
        showToast(
          "error",
          getApiMessage(err, "회원가입 정보를 다시 확인해주세요."),
        );
      })
      .finally(() => {
        setSignupSubmitting(false);
      });
  };

  const showReadyMessage = (label) => {
    showToast("info", `${label}은 아직 준비 중입니다. 현재는 카카오, Google, 네이버 간편가입을 이용해주세요.`);
  };

  const handleKakaoLogin = () => {
    try {
      startKakaoLogin();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const handleGoogleLogin = () => {
    try {
      startGoogleLogin();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const handleNaverLogin = () => {
    try {
      startNaverLogin();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const goLogin = () => {
    navigate("/auth/login");
  };

  return (
    <SignupView
      step={step}
      signup={signup}
      terms={terms}
      emailAuth={emailAuth}
      message={message}
      toast={toast}
      inputSignup={inputSignup}
      sendEmailAuthCode={sendEmailAuthCode}
      checkEmailAuthCode={checkEmailAuthCode}
      moveTermsStep={moveTermsStep}
      movePrevStep={movePrevStep}
      toggleTerm={toggleTerm}
      completeSignup={completeSignup}
      handleKakaoLogin={handleKakaoLogin}
      handleGoogleLogin={handleGoogleLogin}
      handleNaverLogin={handleNaverLogin}
      showReadyMessage={showReadyMessage}
      goLogin={goLogin}
      fieldMessage={fieldMessage}
      fieldStatus={fieldStatus}
      emailSendLoading={emailSendLoading}
      emailCooldown={emailCooldown}
      emailExpireTime={emailExpireTime}
      termsList={termsList}
      selectedTerm={selectedTerm}
      openTermContent={openTermContent}
      closeTermContent={closeTermContent}
      termsLoading={termsLoading}
      signupSubmitting={signupSubmitting}
      signupCompleteModalOpen={signupCompleteModalOpen}
      goSignupCompleteLogin={() => navigate("/auth/login", { replace: true })}
    />
  );
};

export default SignupPage;
