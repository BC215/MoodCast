import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import GppMaybeOutlinedIcon from "@mui/icons-material/GppMaybeOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";

/* ==========================================================================
 * 관리자 공통 설정 파일
 * --------------------------------------------------------------------------
 * 이 파일은 여러 컴포넌트에서 함께 사용하는 "변하지 않는 설정값"을 모아둔 곳입니다.
 *
 * 현재 담당하는 설정:
 * 1. adminNavItems: 왼쪽 사이드바 메뉴 목록
 * 2. pageTitles: 관리자 주소별 페이지 제목
 *
 * 메뉴 이름이나 주소를 바꾸고 싶을 때 JSX 화면 파일을 전부 열 필요 없이
 * 이 파일부터 확인하면 됩니다.
 * ========================================================================== */

// 사이드바 메뉴를 만들 때 사용하는 배열입니다.
// icon에는 MUI 아이콘 컴포넌트를 넣고, 실제 렌더링은 AdminLayout에서 처리합니다.
export const adminNavItems = [
  { to: "/admin/dashboard", label: "대시보드", icon: DashboardOutlinedIcon },
  { to: "/admin/users", label: "사용자 관리", icon: GroupOutlinedIcon },
  { to: "/admin/content", label: "콘텐츠 관리", icon: Inventory2OutlinedIcon },
  { to: "/admin/notices", label: "공지사항 관리", icon: CampaignOutlinedIcon },
  {
    to: "/admin/reports",
    label: "신고 및 제재 관리",
    icon: GppMaybeOutlinedIcon,
  },
  {
    to: "/admin/statistics",
    label: "통계 대시보드",
    icon: BarChartOutlinedIcon,
  },
];

// 주소별 페이지 제목을 모아둔 객체입니다.
// 지금은 다른 파일에서 제목 확인이 필요할 때 사용할 수 있도록 export만 해둡니다.
export const pageTitles = {
  "/admin/dashboard": "관리자 대시보드",
  "/admin/users": "사용자 관리",
  "/admin/content": "콘텐츠 관리",
  "/admin/notices": "공지사항 관리",
  "/admin/reports": "신고 및 제재 관리",
  "/admin/statistics": "통계 대시보드",
  "/admin/users/new": "관리자 권한 관리",
  "/admin/profile": "관리자 개인 정보 수정",
};
