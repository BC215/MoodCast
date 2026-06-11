import axios from 'axios';
import { useEffect, useState } from 'react';
import { DesktopShell } from '../../components/layout/DesktopShell';
import { MobileShell } from '../../components/layout/MobileShell';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIsDesktop } from '../../hooks/useViewportWidth';
import { FeedCard } from '../../components/common/FeedCard';
import { normalizePostDataArray } from '../../shared/lib/postHelpers';
import styles from './SavedPage.module.css';

// 저장된 게시물을 리스트로 보여주는 컴포넌트입니다.
function SavedList({ posts }) {
  if (!posts.length) {
    return <div className={styles.empty}>저장된 게시물이 없습니다.</div>;
  }

  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <FeedCard key={post.postId} post={post} compact />
      ))}
    </div>
  );
}

export function SavedPage() {
  const desktop = useIsDesktop();
  const { accessToken, isLoggedIn } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

  // 로그인된 사용자의 저장된 게시물을 백엔드에서 가져옵니다.
  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    axios.get(`${BACKSERVER}/posts/saved`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => {
        const items = response.data?.results || [];
        const normalized = normalizePostDataArray(items).map((post) => {
          const memberId = post.memberId ?? post.member_id ?? post.authorId ?? post.author_id ?? post.userId ?? post.user_id;
          return {
            ...post,
            memberId,
            profileLink: post.profileLink ?? (memberId ? `/app/user/${memberId}` : null),
            profileImageUrl: post.profileImageUrl ?? post.profile_image_url ?? post.avatarUrl ?? post.avatar_url ?? post.profileImage ?? post.imageUrl ?? post.image ?? post.photoUrl ?? post.photo ?? post.pictureUrl ?? post.picture ?? post.image_url ?? post.photo_url ?? null,
          };
        });
        setPosts(normalized);
      })
      .catch((error) => {
        console.error('저장된 게시물 조회 실패', error);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [BACKSERVER, accessToken, isLoggedIn]);

  const innerContent = (
    <section className={styles.desktopWrap}>
      <div className={styles.hero}>
        <strong>저장된 게시물</strong>
        <p>나중에 다시 보고 싶은 글과 이미지를 모아두는 공간입니다.</p>
      </div>
      {loading ? <div>저장된 게시물을 불러오는 중입니다...</div> : <SavedList posts={posts} />}
    </section>
  );

  if (!desktop) {
    return (
      <MobileShell title='저장된 게시물' hideSearch>
        {innerContent}
      </MobileShell>
    );
  }

  return <DesktopShell>{innerContent}</DesktopShell>;
}
