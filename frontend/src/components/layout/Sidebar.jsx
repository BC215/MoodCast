import { memo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Logo } from "../common/Logo";
import { useAuthStore } from "../../stores/useAuthStore";
import { useUnreadChatCount } from "../../hooks/useUnreadChatCount";
import styles from "./Sidebar.module.css";

function SidebarTop() {
  return (
    <div className={styles.top}>
      <Logo />
    </div>
  );
}

export function SidebarContent() {
  const { isLoggedIn, member } = useAuthStore();
  const unreadChatCount = useUnreadChatCount(isLoggedIn ? member?.memberId : null);
  const location = useLocation();
  const navigate = useNavigate();

  const isMoodChatRoute =
    location.pathname.startsWith("/app/mood-chat") || location.pathname.startsWith("/app/chat");

  const handleMoodChatClick = (event) => {
    event.preventDefault();
    navigate(`/app/mood-chat?view=list&ts=${Date.now()}`);
  };

  const items = [
    { label: "피드", to: "/app/feed", icon: HomeOutlinedIcon },
    { label: "저장한 게시물", to: "/app/saved", icon: BookmarkBorderOutlinedIcon },
    { label: "Mood Chat", to: "/app/mood-chat", icon: ChatBubbleOutlineOutlinedIcon, badgeCount: unreadChatCount },
    isLoggedIn
      ? { label: "프로필", to: `/app/user/${member?.memberId}`, icon: PersonOutlineOutlinedIcon }
      : { label: "로그인", to: "/auth/login", icon: PersonOutlineOutlinedIcon },
    { label: "설정", to: "/app/settings", icon: SettingsOutlinedIcon },
  ];

  return (
    <div className={styles.content}>
      <nav className={styles.nav}>
        {items.map(({ label, to, icon: Icon, badgeCount }) =>
          to === "/app/mood-chat" ? (
            <NavLink
              key={to}
              to={`/app/mood-chat?view=list&ts=${Date.now()}`}
              onClick={handleMoodChatClick}
              className={() => `${styles.item} ${isMoodChatRoute ? styles.active : ""}`}
            >
              <span className={styles.iconWrap}>
                <Icon className={styles.itemIcon} />
                {badgeCount > 0 ? (
                  <b className={styles.badge}>{badgeCount > 99 ? "99+" : badgeCount}</b>
                ) : null}
              </span>
              <span>{label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.iconWrap}>
                <Icon className={styles.itemIcon} />
                {badgeCount > 0 ? (
                  <b className={styles.badge}>{badgeCount > 99 ? "99+" : badgeCount}</b>
                ) : null}
              </span>
              <span>{label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}

function SidebarBase() {
  return (
    <aside className={styles.sidebar}>
      <SidebarTop />
      <SidebarContent />
    </aside>
  );
}

export const Sidebar = memo(SidebarBase);
