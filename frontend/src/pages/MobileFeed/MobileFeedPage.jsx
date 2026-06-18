import axios from 'axios';
import { MobileShell } from '../../components/layout/MobileShell';
import { ComposerCard } from '../../components/common/ComposerCard';
import { FeedCard } from '../../components/common/FeedCard';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { normalizePostDataArray } from '../../shared/lib/postHelpers';
import styles from './MobileFeedPage.module.css';

const EMOTION_CONFIG = {
  1: { label: '행복해요', className: 'happy' },
  2: { label: '슬퍼요', className: 'sad' },
  3: { label: '차분해요', className: 'calm' },
  4: { label: '화가 나요', className: 'angry' },
  5: { label: '신나요', className: 'excited' },
  6: { label: '무덤덤해요', className: 'neutral' },
};

export function MobileFeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState(null);
  const { accessToken } = useAuthStore();
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || '/api';
  const FEED_SCROLL_KEY = 'moodcast-feed-scroll-y';

  const normalizeContent = (content) => {
    if (!content) return '';
    // HTML 태그 제거
    let text = content.replace(/<[^>]+>/g, '').trim();
    // HTML 엔티티 디코딩
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const formatTime = (dateString) => {
    // 시간 정보가 없으면 '방금'이라고 표시함
    if (!dateString) return '방금';
    
    // 서버에서 받은 시간 문자열을 JavaScript Date 객체로 변환함
    const date = new Date(dateString);
    // 현재 시간을 Date 객체로 가져옴
    const now = new Date();
    
    // 현재 시간과 게시글 작성 시간의 차이를 계산함
    // getTime()은 1970년 1월 1일 00:00:00부터 지난 밀리초를 반환함
    const diffMs = now.getTime() - date.getTime();
    
    // 밀리초 차이를 분으로 변환함 (1분 = 60000밀리초)
    const diffMins = Math.floor(diffMs / 60000);
    // 밀리초 차이를 시간으로 변환함 (1시간 = 3600000밀리초)
    const diffHours = Math.floor(diffMs / 3600000);
    // 밀리초 차이를 일로 변환함 (1일 = 86400000밀리초)
    const diffDays = Math.floor(diffMs / 86400000);

    // 1분 이내면 '방금'으로 표시함
    if (diffMins < 1) return '방금';
    // 1분 이상 60분 미만이면 '~분 전'으로 표시함
    if (diffMins < 60) return `${diffMins}분 전`;
    // 1시간 이상 24시간 미만이면 '~시간 전'으로 표시함
    if (diffHours < 24) return `${diffHours}시간 전`;
    // 1일 이상 7일 미만이면 '~일 전'으로 표시함
    if (diffDays < 7) return `${diffDays}일 전`;
    
    // 7일 이상 지나면 정확한 날짜와 시간을 표시함
    // Intl.DateTimeFormat은 다양한 언어와 지역에 맞게 날짜를 포맷팅함
    // timeZone: 'Asia/Seoul'로 설정하여 한국 시간대로 표시함
    // (예: 2026.05.26 13:45)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',           // 연도를 숫자로 표시함 (예: 2026)
      month: '2-digit',          // 월을 2자리 숫자로 표시함 (예: 05)
      day: '2-digit',            // 일을 2자리 숫자로 표시함 (예: 26)
      hour: '2-digit',           // 시간을 2자리 숫자로 표시함 (예: 13)
      minute: '2-digit',         // 분을 2자리 숫자로 표시함 (예: 45)
      timeZone: 'Asia/Seoul'     // 한국 시간대(UTC+9)로 설정함
    }).format(date);
  };

  useEffect(() => {
    setLoading(true);
    axios.get(`${BACKSERVER}/posts`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((response) => {
        const items = response.data?.results || [];
        setPosts(normalizePostDataArray(items));
      })
      .catch((err) => {
        console.error('게시물 조회 실패', err);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [BACKSERVER, accessToken]);

  const filteredPosts = useMemo(() => {
    if (!selectedMoodFilter) return posts;
    return posts.filter((post) => String(post.emotionId) === String(selectedMoodFilter));
  }, [posts, selectedMoodFilter]);

  useEffect(() => {
    if (loading) return;

    const savedScrollY = window.sessionStorage.getItem(FEED_SCROLL_KEY);
    if (savedScrollY == null) return;

    const targetScrollY = Number(savedScrollY);
    window.sessionStorage.removeItem(FEED_SCROLL_KEY);

    const timerId = window.setTimeout(() => {
      window.scrollTo({ top: Number.isFinite(targetScrollY) ? targetScrollY : 0, behavior: 'auto' });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loading, posts.length]);

  return (
    <MobileShell title="MoodCast">
      <section className={styles.column}>
        <ComposerCard />

        <div className={styles.moodFilterBar}>
          <button
            type="button"
            className={`${styles.moodFilterChip} ${selectedMoodFilter === null ? styles.activeMoodFilter : ''}`}
            onClick={() => setSelectedMoodFilter(null)}
          >
            전체
          </button>
          {Object.entries(EMOTION_CONFIG).map(([emotionId, emotion]) => (
            <button
              key={emotionId}
              type="button"
              className={`${styles.moodFilterChip} ${styles[emotion.className]} ${String(selectedMoodFilter) === String(emotionId) ? styles.activeMoodFilter : ''}`}
              onClick={() => setSelectedMoodFilter(Number(emotionId))}
            >
              {emotion.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div>게시물을 불러오는 중입니다...</div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => <FeedCard key={post.id} post={post} compact />)
        ) : posts.length > 0 ? (
          <div>선택한 무드의 게시물이 없습니다.</div>
        ) : (
          <div>게시물이 없습니다.</div>
        )}
      </section>
    </MobileShell>
  );
}
