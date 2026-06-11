import { Navigate, Route, Routes } from "react-router-dom";
import { AdminCreatePage } from "./adminComponentsJs/userManagement/AdminCreatePage";
import { AdminDashboardPage } from "./adminComponentsJs/dashboard/AdminDashboardPage";
import { AdminProfilePage } from "./adminComponentsJs/userManagement/AdminProfilePage";
import { ContentManagementPage } from "./adminComponentsJs/contentManagement/ContentManagementPage";
import { NoticeManagementPage } from "./adminComponentsJs/noticeManagement/NoticeManagementPage";
import { ReportManagementPage } from "./adminComponentsJs/reportManagement/ReportManagementPage";
import { StatisticsDashboardPage } from "./adminComponentsJs/statisticsDashboard/StatisticsDashboardPage";
import { UserManagementPage } from "./adminComponentsJs/userManagement/UserManagementPage";
import { pageTitles } from "./adminComponentsJs/common/adminConfig";
import { useAuthStore } from "../../stores/useAuthStore";

const ADMIN_ROLES = ["SUPER_ADMIN"];
const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

/* ==========================================================================
 * 관리자 페이지 라우팅 파일
 * --------------------------------------------------------------------------
 * 이 파일은 "주소(URL)"와 "보여줄 페이지 컴포넌트"를 연결하는 역할만 합니다.
 *
 * 이전에는 이 파일 안에 모든 관리자 화면 코드가 들어 있었지만,
 * 유지보수를 쉽게 하기 위해 실제 화면 코드는 adminComponentsJs 폴더로 분리했습니다.
 *
 * 예시:
 * - /admin/dashboard 주소로 들어오면 AdminDashboardPage가 렌더링됩니다.
 * - /admin/users 주소로 들어오면 UserManagementPage가 렌더링됩니다.
 *
 * 이렇게 라우팅 파일을 가볍게 유지하면, 나중에 특정 화면을 수정할 때
 * 어느 파일을 열어야 하는지 훨씬 찾기 쉬워집니다.
 * ========================================================================== */
export function AdminRoutes() {
  const { isLoggedIn, accessToken, member } = useAuthStore();
  const memberRole = member?.role;

  if (!isLoggedIn || !accessToken) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!member) {
    return null;
  }

  if (!ADMIN_ROLES.includes(memberRole)) {
    return <Navigate to="/app/feed" replace />;
  }

  /*
   * 슈퍼 관리자 전용 라우트 보호 컴포넌트입니다.
   * --------------------------------------------------------------------------
   * 초보자 설명:
   * - 사용자 관리 화면의 버튼에서 한 번 막더라도, 사용자가 주소창에
   *   /admin/users/new를 직접 입력할 수 있습니다.
   * - 그래서 라우트 단계에서도 member.role을 다시 확인합니다.
   * - SUPER_ADMIN이 아니면 관리자 대시보드로 돌려보내 관리자 권한 관리 페이지가
   *   화면에 렌더링되지 않게 합니다.
   */
  const superAdminOnly = (pageElement) => {
    if (memberRole !== SUPER_ADMIN_ROLE) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    return pageElement;
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/dashboard" element={<AdminDashboardPage />} />
      <Route path="/users" element={<UserManagementPage />} />
      <Route path="/users/new" element={superAdminOnly(<AdminCreatePage />)} />
      <Route path="/content" element={<ContentManagementPage />} />
      <Route path="/notices" element={<NoticeManagementPage />} />
      <Route path="/reports" element={<ReportManagementPage />} />
      <Route path="/statistics" element={<StatisticsDashboardPage />} />
      <Route path="/profile" element={<AdminProfilePage />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export { pageTitles };
