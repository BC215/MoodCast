import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { SearchModal } from '../common/SearchModal';
import { BottomNav } from './BottomNav';
import styles from './MobileShell.module.css';

export function MobileShell({ title, children, hideSearch = false, fixedContent = false, hideBottomNav = false }) {
  const navigate = useNavigate();
  const { isLoggedIn, member, clearAuthData } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

  const closeTopMenus = () => {
    setNotificationOpen(false);
    setAccountOpen(false);
  };

  const goProfile = () => {
    closeTopMenus();

    if (!isLoggedIn) {
      navigate('/auth/login');
      return;
    }

    if (member?.memberId) {
      navigate(`/app/user/${member.memberId}`);
      return;
    }

    navigate('/app/profile');
  };

  const goSettings = () => {
    closeTopMenus();

    if (!isLoggedIn) {
      navigate('/auth/login');
      return;
    }

    navigate('/app/settings');
  };

  const toggleNotifications = () => {
    setAccountOpen(false);
    setNotificationOpen((value) => !value);
  };

  const toggleAccountMenu = () => {
    setNotificationOpen(false);

    if (!isLoggedIn) {
      navigate('/auth/login');
      return;
    }

    setAccountOpen((value) => !value);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKSERVER}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // 서버 세션 정리에 실패해도 모바일 클라이언트의 로그인 상태는 정리합니다.
    } finally {
      closeTopMenus();
      clearAuthData();
      navigate('/auth/login', { replace: true });
    }
  };

  // 모바일 전용 레이아웃: 상단 바, 콘텐츠, 하단 탭 네비게이션을 구성합니다.
  return (
    <div className={`${styles.page} ${fixedContent ? styles.fixedPage : ''} ${hideBottomNav ? styles.fullPage : ''}`}>
      <main className={`${styles.frame} ${fixedContent ? styles.fixedFrame : ''} ${hideBottomNav ? styles.fullFrame : ''}`}>
        <header className={styles.topBar}>
          <h1>{title}</h1>
          <div className={styles.actions}>
            {!hideSearch ? (
              <button type="button" className={styles.iconButton} onClick={() => setSearchOpen(true)} aria-label="검색">
                <SearchOutlinedIcon />
              </button>
            ) : null}
            {/* 알림 버튼과 프로필 버튼은 모바일 상단에서 자주 쓰는 유틸리티 기능을 제공합니다. */}
            <button
              type="button"
              className={styles.iconButton}
              aria-label="알림"
              aria-expanded={notificationOpen}
              onClick={toggleNotifications}
            >
              <NotificationsNoneOutlinedIcon />
            </button>
            <button
              type="button"
              className={styles.avatarButton}
              aria-label={isLoggedIn ? '계정 메뉴' : '로그인'}
              aria-expanded={accountOpen}
              onClick={toggleAccountMenu}
            >
              <img src={member?.profileImageUrl || '/MoodCast-logo.svg'} alt="" />
            </button>
          </div>
          {notificationOpen ? (
            <div className={styles.notificationCard}>
              <strong>알림</strong>
              <p>새로운 알림이 없습니다.</p>
            </div>
          ) : null}
          {accountOpen ? (
            <div className={styles.accountCard}>
              <div className={styles.accountSummary}>
                <img src={member?.profileImageUrl || '/MoodCast-logo.svg'} alt="" />
                <div className={styles.accountText}>
                  <strong>{member?.nickname || member?.name || 'MoodCast'}</strong>
                  <span>{member?.email || '로그인 계정'}</span>
                </div>
              </div>
              <button type="button" className={styles.accountAction} onClick={goProfile}>
                <PersonOutlineOutlinedIcon />
                <span>프로필</span>
              </button>
              <button type="button" className={styles.accountAction} onClick={goSettings}>
                <SettingsOutlinedIcon />
                <span>설정</span>
              </button>
              <button type="button" className={`${styles.accountAction} ${styles.logoutAction}`} onClick={handleLogout}>
                <LogoutOutlinedIcon />
                <span>로그아웃</span>
              </button>
            </div>
          ) : null}
        </header>
        <div
          className={`${styles.content} ${hideSearch ? styles.compactContent : ''} ${fixedContent ? styles.fixedContent : ''}`}
        >
          {children}
        </div>
        {!hideBottomNav ? <BottomNav /> : null}
      </main>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
