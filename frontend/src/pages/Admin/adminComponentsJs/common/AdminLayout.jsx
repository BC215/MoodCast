import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { Logo } from "../../../../components/common/Logo";
import { defaultAvatarSrc } from "../../../../shared/lib/defaultAvatar";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { adminNavItems } from "./adminConfig";
import styles from "../../adminComponentsCss/common/AdminLayout.module.css";

/* ==========================================================================
 * AdminLayout 컴포넌트
 * --------------------------------------------------------------------------
 * 모든 관리자 페이지가 공통으로 사용하는 큰 화면 틀입니다.
 *
 * 담당하는 화면 영역:
 * 1. 왼쪽 사이드바
 *    - MoodCast 로고
 *    - 관리자 메뉴
 *
 * 2. 오른쪽 본문 영역
 *    - 페이지 제목
 *    - 페이지 설명
 *    - 상단 아이콘 버튼
 *    - 각 페이지의 실제 내용
 *
 * children이란?
 * - React에서 <AdminLayout> ... </AdminLayout> 사이에 들어가는 내용을 뜻합니다.
 * - 예를 들어 대시보드 페이지의 카드와 그래프 영역이 children으로 들어옵니다.
 *
 * 이렇게 레이아웃을 분리하면 각 페이지 파일에서는 "본문 내용"에만 집중할 수 있습니다.
 * ========================================================================== */
export function AdminLayout({ children, title, description }) {
  const navigate = useNavigate(); // 로그아웃 후 로그인 페이지로 이동하기 위해 사용하는 함수입니다.
  const { clearAuthData } = useAuthStore(); // 브라우저에 저장된 로그인 정보를 가져옵니다.
  const BACKSERVER = (
    import.meta.env.VITE_BACKSERVER || "http://localhost:8080"
  ).replace(/\/$/, ""); // 프론트 .env의 백엔드 주소를 사용하되, 끝의 /는 제거해서 API 경로가 중복되지 않게 합니다.

  /* ==========================================================================
   * 관리자 로그아웃 처리
   * --------------------------------------------------------------------------
   * 기존 일반 화면의 로그아웃 로직과 같은 방식으로 처리합니다.
   *
   * 처리 순서:
   * 1. 백엔드 /auth/logout API를 호출해서 refresh cookie 삭제를 요청합니다.
   * 2. 요청 성공/실패와 관계없이 프론트 저장소의 로그인 정보를 삭제합니다.
   * 3. 로그인 페이지로 이동합니다.
   *
   * finally를 사용하는 이유:
   * - 서버 요청이 실패해도 현재 브라우저에서는 로그아웃 처리가 되어야 하기 때문입니다.
   * ========================================================================== */
  const logoutAdmin = () => {
    axios
      .post(`${BACKSERVER}/auth/logout`, {}, { withCredentials: true }) // 쿠키를 포함해서 백엔드 로그아웃 API를 호출합니다.
      .catch(() => undefined)
      .finally(() => {
        clearAuthData(); // sessionStorage에 저장된 로그인 토큰과 회원 정보를 삭제합니다.
        navigate("/auth/login"); // 로그아웃 후 로그인 페이지로 이동합니다.
      });
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo compact to="/admin/dashboard" />
          <div>
            <strong>MoodCast</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="관리자 메뉴">
          {adminNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
            >
              <Icon className={styles.navIcon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.headerActions}>
            <NavLink
              className={styles.headerIconLink}
              to="/admin/profile"
              aria-label="관리자 프로필"
            >
              <img
                className={styles.headerProfileImage}
                src={defaultAvatarSrc}
                alt=""
              />
            </NavLink>
            <button type="button" onClick={logoutAdmin} aria-label="로그아웃">
              <LogoutOutlinedIcon />
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
