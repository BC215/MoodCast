import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { defaultAvatarSrc } from '../../shared/lib/defaultAvatar';
import styles from './ComposerCard.module.css';

const resolveUserAvatarUrl = (user) => {
  return user?.profileImageUrl || user?.profile_image_url || user?.avatarUrl || user?.avatar_url ||
    user?.profileImage || user?.imageUrl || user?.image || user?.photoUrl || user?.photo ||
    user?.pictureUrl || user?.picture || user?.image_url || user?.photo_url || null;
};

export function ComposerCard() {
  const navigate = useNavigate();
  const { isLoggedIn, member } = useAuthStore();

  if (!isLoggedIn) return null;
  const avatarUrl = resolveUserAvatarUrl(member);

  return (
    <button type="button" className={styles.card} onClick={() => navigate('/app/write')}>
      <span className={styles.avatar} aria-hidden="true">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={member?.nickname || member?.name || '프로필'}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = defaultAvatarSrc;
            }}
          />
        ) : (
          <span />
        )}
      </span>
      <span className={styles.input}>
        무슨 생각을 하고 계신가요?
      </span>
    </button>
  );
}
