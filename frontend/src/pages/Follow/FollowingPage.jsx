import { DesktopShell } from '../../components/layout/DesktopShell';
import { MobileShell } from '../../components/layout/MobileShell';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useIsDesktop } from '../../hooks/useViewportWidth';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/useAuthStore';
import styles from './FollowPage.module.css';

export function FollowingPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const params = useParams();
  const { member: currentMember, accessToken: token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';
  
  // 프로필 주인의 ID 가져오기
  const targetId = params.memberId || currentMember?.memberId;

  const fetchData = useCallback(() => {
    if (!targetId) return;
    setLoading(true);
    
    // useAuthStore에서 가져온 token이 있으면 사용, 없으면 세션 스토리지 직접 조회
    const effectiveToken = token || window.sessionStorage.getItem('moodcast-access-token');

    const config = effectiveToken ? { headers: { Authorization: `Bearer ${effectiveToken}` } } : {};
    
    axios.get(`${BACKSERVER}/auth/follow/following/${targetId}`, config)
      .then(res => {
        setItems(res.data);
      })
      .catch(err => console.error('팔로잉 목록 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [targetId, BACKSERVER, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = items.filter((user) => 
      `${user.name} ${user.nickname}`.toLowerCase().includes(normalized)
    );

    if (sort === 'name') {
      return [...result].sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name));
    }
    return [...result];
  }, [items, query, sort]);

  const toggleFollow = (id) => {
    const effectiveToken = token || window.sessionStorage.getItem('moodcast-access-token');
    if (!effectiveToken) {
      alert('로그인이 필요합니다.');
      return;
    }

    axios.post(`${BACKSERVER}/auth/follow/${id}`, {}, {
      headers: { Authorization: `Bearer ${effectiveToken}` }
    })
    .then((res) => {
      const newStatus = res.data.following;
      setItems(prev => prev.map(item => 
        item.memberId === id ? { ...item, isFollowing: newStatus, following: newStatus } : item
      ));
    })
    .catch(err => console.error('팔로우 토글 실패:', err));
  };

  const content = (
    <section className={styles.wrap}>
      <div className={styles.hero}>
        <strong>팔로잉</strong>
        <p>내가 팔로우하고 있는 사람들의 목록입니다.</p>
        <div className={styles.tabs}>
          <button type="button" className={styles.tab} onClick={() => navigate(`/app/followers/${targetId}`)}>
            팔로워
          </button>
          <button type="button" className={styles.activeTab} onClick={() => navigate(`/app/following/${targetId}`)}>
            팔로잉
          </button>
        </div>
      </div>
      <div className={styles.controls}>
        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름 또는 아이디 검색"
          aria-label="팔로잉 검색"
        />
        <div className={styles.sortGroup}>
          <button type="button" className={sort === 'name' ? styles.activeSort : ''} onClick={() => setSort('name')}>
            이름순
          </button>
          <button type="button" className={sort === 'recent' ? styles.activeSort : ''} onClick={() => setSort('recent')}>
            최근순
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>불러오는 중...</div>
        ) : filtered.length > 0 ? (
          filtered.map((user) => (
            <article key={user.memberId} className={styles.item} onClick={() => navigate(`/app/user/${user.memberId}`)}>
              <div className={styles.avatar}>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.nickname || user.name} style={{width:'100%', height:'100%', borderRadius:'50%'}} />
                ) : (
                  (user.nickname || user.name).charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.userInfo}>
                <strong>{user.nickname || user.name}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>@{user.email ? user.email.split('@')[0] : user.memberId}</span>
                  {user.followsMe && (
                    <em style={{ 
                      fontSize: '11px', 
                      background: '#eee', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontStyle: 'normal',
                      color: '#666'
                    }}>나를 팔로우함</em>
                  )}
                </div>
              </div>
              
              {/* 본인이 아닐 때만 팔로우 버튼 표시 */}
              {currentMember?.memberId !== user.memberId && (
                <button
                  type="button"
                  className={user.isFollowing || user.following ? styles.unfollowButton : styles.followButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFollow(user.memberId);
                  }}
                >
                  {user.isFollowing || user.following ? '언팔로우' : '팔로우'}
                </button>
              )}
            </article>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>목록이 비어 있습니다.</div>
        )}
      </div>
    </section>
  );

  if (!desktop) return <MobileShell title="팔로잉" hideSearch>{content}</MobileShell>;
  return <DesktopShell>{content}</DesktopShell>;
}
