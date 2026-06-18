import { create } from "zustand";

const ACCESS_TOKEN_KEY = "moodcast-access-token";
const MEMBER_KEY = "moodcast-member";

// 새로고침 후 accessToken 복구 함수
const readAccessToken = () => {
  // 브라우저 sessionStorage에 저장된 토큰을 가져옴
  // 이 토큰이 있으면 로그인 상태로 취급함
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

// 새로고침 후 member 복구 함수
const readMember = () => {
  const memberText = window.sessionStorage.getItem(MEMBER_KEY);

  if (!memberText) {
    return null;
  }

  try {
    return JSON.parse(memberText);
  } catch (e) {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  // 초기 상태 세팅
  accessToken: readAccessToken(),
  member: readMember(),
  isLoggedIn: Boolean(readAccessToken()), // 토큰 존재 여부로 로그인 판단함

  // 로그인 성공 시
  setAuthData: (accessToken, member) => {
    // sessionStorage에 token과 member를 저장함
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.sessionStorage.setItem(MEMBER_KEY, JSON.stringify(member)); // member 객체는 문자열로 저장함

    // 상태 업데이트
    set({
      accessToken: accessToken,
      member: member,
      isLoggedIn: true,
    });
  },

  // 로그인 응답을 받아 헤더 또는 바디에서 토큰을 영리하게 추출하여 저장하는 헬퍼 함수
  loginFromResponse: (response) => {
    let token = response.data?.accessToken || response.data?.token;

    // 헤더에서 추출 (대소문자 구분을 없애기 위해 toLowerCase 사용)
    const authHeader =
      response.headers?.authorization || response.headers?.Authorization;
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7);
    }

    const memberData = response.data?.member || response.data;

    // 🚨 방어 코드: token이 존재하되, 문자열 "undefined"나 "null"이 아닐 때만 저장합니다.
    if (token && token !== "undefined" && token !== "null") {
      useAuthStore.getState().setAuthData(token, memberData);
      return true; // 로그인/토큰 저장 성공
    }
    return false; // 토큰 추출 실패
  },

  // 로그아웃
  clearAuthData: () => {
    // 저장된 토큰과 회원 정보를 모두 삭제함
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(MEMBER_KEY);

    // 로그인 상태를 false로 바꿈
    set({
      accessToken: null,
      member: null,
      isLoggedIn: false,
    });
  },
}));

export const logoutAndRedirect = () => {
  // 인증 실패나 토큰 만료 시 호출됨
  // 회원 정보와 토큰을 모두 삭제하고 로그인 페이지로 이동함
  const store = useAuthStore.getState();
  if (store && typeof store.clearAuthData === "function") {
    store.clearAuthData();
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(MEMBER_KEY);
    useAuthStore.setState({
      accessToken: null,
      member: null,
      isLoggedIn: false,
    });
  }
  if (typeof window !== "undefined") {
    window.location.replace("/auth/login");
  }
};
