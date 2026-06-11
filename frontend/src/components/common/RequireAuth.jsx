import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

const ADMIN_ROLES = ["SUPER_ADMIN"];

export function RequireAuth({ children, authChecked }) {
  const { accessToken, isLoggedIn, member } = useAuthStore();
  const location = useLocation();

  // 새로고침 직후 refresh cookie로 로그인 복구를 먼저 시도하게 기다립니다.
  if (!authChecked) {
    return null;
  }

  // 로그인 정보가 없으면 로그인 페이지로 보냅니다.
  if (!isLoggedIn || !accessToken) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  /*
   * 관리자 계정은 일반 사용자 화면을 사용할 수 없게 막습니다.
   * /admin/* 라우트도 이 컴포넌트를 통과하므로, 관리자 페이지 내부 이동은 허용하고
   * 그 외 보호 라우트에 접근한 경우에만 관리자 대시보드로 돌려보냅니다.
   */
  if (
    ADMIN_ROLES.includes(member?.role) &&
    !location.pathname.startsWith("/admin")
  ) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
