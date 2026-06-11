import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { useAuthStore } from '../../stores/useAuthStore';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { defaultAvatarSrc } from '../../shared/lib/defaultAvatar';
import { formatChatPreview } from '../../shared/lib/chatContent';
import styles from './TopUtilityIcons.module.css';

function TopUtilityIconsBase({ onSearch }) {
  const navigate = useNavigate();
  const { isLoggedIn, member, clearAuthData } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const profileBtnRef = useRef(null);
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

  const { notifications, unreadCount, removeNotification, clearNotifications } = useRealtimeNotifications(
    isLoggedIn ? member?.memberId : null,
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !profileBtnRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }

      if (
        notificationsOpen &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, notificationsOpen]);

  const logout = () => {
    axios
      .post(`${BACKSERVER}/auth/logout`, {}, { withCredentials: true })
      .catch(() => {})
      .finally(() => {
        clearAuthData();
        setMenuOpen(false);
        setNotificationsOpen(false);
        navigate('/auth/login');
      });
  };

  const goLogin = () => {
    setMenuOpen(false);
    setNotificationsOpen(false);
    navigate('/auth/login');
  };

  const getNotificationTitle = (item) => {
    if (item?.eventType === 'COMMENT_NOTIFICATION') {
      return '댓글 알림';
    }

    if (item?.eventType === 'MENTION') {
      return '멘션 알림';
    }

    if (item?.eventType === 'CHAT_NOTIFICATION') {
      return '채팅 알림';
    }

    return '알림';
  };

  const getNotificationPreview = (item) => {
    if (item?.eventType === 'COMMENT_NOTIFICATION') {
      const authorName = item?.commenterName || '회원';
      const postTitle = item?.postTitle ? `"${item.postTitle}"` : '게시글';
      const preview = item?.preview ? `: ${item.preview}` : '';
      return `${authorName}님이 ${postTitle}에 댓글을 남겼습니다${preview}`;
    }

    if (item?.eventType === 'MENTION') {
      const authorName = item?.senderName || '회원';
      const title = item?.title ? `"${item.title}"` : '게시글';
      const preview = item?.mentionText ? `: ${item.mentionText}` : '';
      return `${authorName}님이 ${title}에서 멘션했습니다${preview}`;
    }

    if (item?.eventType === 'CHAT_NOTIFICATION') {
      const authorName = item?.senderNickname || '회원';
      const messageCount = Number(item?.count || 1);
      const preview = formatChatPreview(item?.content);
      const messageText = `${authorName}님이 보내신 메세지가 ${messageCount}건 있습니다`;

      if (messageCount > 1) {
        return preview ? `${messageText}: ${preview}` : messageText;
      }

      return preview ? `${messageText}: ${preview}` : messageText;
    }

    return item?.content || '';
  };

  const handleNotificationClick = (item) => {
    if (!item) {
      return;
    }

    removeNotification(item.id);
    setNotificationsOpen(false);

    if (item.postId) {
      if (item.eventType === 'COMMENT_NOTIFICATION') {
        const commentQuery = item.commentId ? `&commentId=${item.commentId}` : '';
        navigate(`/app/post/${item.postId}?comments=1${commentQuery}`, {
          state: {
            openComments: true,
            notificationId: item.id,
            notificationCommentId: item.commentId ?? null,
          },
        });
      } else {
        navigate(`/app/post/${item.postId}`);
      }
    } else if (item.eventType === 'CHAT_NOTIFICATION' && item.senderId) {
      const partnerName = item.senderNickname || item.senderName || item.senderNameText || '';
      const searchParams = new URLSearchParams({
        partnerId: String(item.senderId),
      });

      if (partnerName) {
        searchParams.set('partnerName', partnerName);
      }

      navigate(`/app/chat?${searchParams.toString()}`);
    }
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.search} onClick={onSearch} aria-label="검색">
        <SearchOutlinedIcon />
      </button>

      <button
        type="button"
        className={styles.bell}
        aria-label="알림"
        onClick={() => {
          setMenuOpen(false);
          setNotificationsOpen((value) => !value);
        }}
      >
        <NotificationsNoneOutlinedIcon />
        {unreadCount > 0 ? <span aria-hidden="true" /> : null}
      </button>

      {isLoggedIn ? (
        <>
          {notificationsOpen ? (
            <div className={styles.notificationCard} ref={notificationRef}>
              <strong>알림</strong>
              {notifications.length > 0 ? (
                <>
                  <div className={styles.notificationList}>
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.notificationItem}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <span className={styles.notificationTitle}>{getNotificationTitle(item)}</span>
                        <span className={styles.notificationPreview}>{getNotificationPreview(item)}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className={styles.notificationClear} onClick={clearNotifications}>
                    모두 지우기
                  </button>
                </>
              ) : (
                <p>새로운 알림이 없습니다.</p>
              )}
            </div>
          ) : null}

          <button
            type="button"
            ref={profileBtnRef}
            className={styles.profile}
            aria-label="회원 메뉴"
            onClick={() => {
              setNotificationsOpen(false);
              setMenuOpen((value) => !value);
            }}
          >
            <img src={member?.profileImageUrl || defaultAvatarSrc} alt="" />
          </button>

          {menuOpen ? (
            <div className={styles.menu} ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (member?.memberId) {
                    navigate(`/app/user/${member.memberId}`);
                  } else {
                    navigate('/app/profile');
                  }
                }}
              >
                <AccountCircleOutlinedIcon />
                프로필 보기
              </button>
              <button type="button" onClick={logout}>
                <LogoutOutlinedIcon />
                로그아웃
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <button type="button" className={styles.loginButton} onClick={goLogin} aria-label="로그인">
          <LoginOutlinedIcon />
        </button>
      )}
    </div>
  );
}

export const TopUtilityIcons = memo(TopUtilityIconsBase);
