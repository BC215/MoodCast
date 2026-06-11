import CloseIcon from '@mui/icons-material/Close';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { FeedCard } from './FeedCard';
import styles from './SearchModal.module.css';

// SearchModal은 화면에 떠서 사용자가 검색어를 입력하면
// 게시글/사용자/해시태그 검색 결과를 보여주는 UI 컴포넌트입니다.
// 검색 요청은 실제로 백엔드 서버의 검색 API를 호출합니다.
export function SearchModal({ open, onClose }) {
  const POPULAR_POST_LIMIT = 5;
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [results, setResults] = useState([]); 
  const [postSortMode, setPostSortMode] = useState('popular');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [trendingUsers, setTrendingUsers] = useState([]);
  const [loadingTrendingData, setLoadingTrendingData] = useState(false);
  const [recentTagQueries, setRecentTagQueries] = useState([]);
  const { member: currentMember, accessToken: token, isLoggedIn } = useAuthStore();
  // 백엔드 서버 주소를 여기에서 설정합니다.
  // 개발 환경에서는 VITE_BACKSERVER 환경 변수를 사용하고,
  // 없으면 로컬 백엔드 주소를 기본값으로 사용합니다.
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

  const saveRecentTagQuery = (tag) => {
    if (!tag) return;
    const normalizedTag = tag.replace(/^#/, '').trim();
    if (!normalizedTag) return;

    const nextTags = [normalizedTag, ...recentTagQueries.filter((item) => item !== normalizedTag)].slice(0, 6);
    setRecentTagQueries(nextTags);
    window.localStorage.setItem('moodcast-recent-tags', JSON.stringify(nextTags));
  };

  const handleSearchFieldChange = (event) => {
    setQuery(event.target.value);
  };

  // 트렌딩 데이터 조회
  useEffect(() => {
    if (!open || query.trim() !== '') return;

    setLoadingTrendingData(true);
    setLoadingTrending(true);
    const effectiveToken = token || window.sessionStorage.getItem('moodcast-access-token');
    const config = effectiveToken
      ? { headers: { Authorization: `Bearer ${effectiveToken}` } }
      : {};

    Promise.allSettled([
      axios.get(`${BACKSERVER}/posts/popular?limit=${POPULAR_POST_LIMIT}`, config),
      axios.get(`${BACKSERVER}/posts`, config),
      axios.get(`${BACKSERVER}/search/users/trending?limit=10`, config),
      axios.get(`${BACKSERVER}/search/hashtags/trending?limit=10`, config),
    ])
      .then(([popularPostsResult, latestPostsResult, usersResult, tagsResult]) => {
        if (popularPostsResult.status === 'fulfilled') {
          setTrendingPosts((popularPostsResult.value.data?.results || []).slice(0, POPULAR_POST_LIMIT));
        } else {
          console.error('게시글 조회 실패:', popularPostsResult.reason);
          setTrendingPosts([]);
        }

        if (latestPostsResult.status === 'fulfilled') {
          setRecentPosts((latestPostsResult.value.data?.results || []).slice(0, POPULAR_POST_LIMIT));
        } else {
          console.error('최신 게시글 조회 실패:', latestPostsResult.reason);
          setRecentPosts([]);
        }

        if (usersResult.status === 'fulfilled') {
          setTrendingUsers(usersResult.value.data?.results || []);
        } else {
          console.error('인기 사용자 조회 실패:', usersResult.reason);
          setTrendingUsers([]);
        }

        if (tagsResult.status === 'fulfilled') {
          setTrendingTags(tagsResult.value.data?.results || []);
        } else {
          console.error('트렌딩 태그 조회 실패:', tagsResult.reason);
          setTrendingTags([]);
        }
      })
      .finally(() => {
        setLoadingTrendingData(false);
        setLoadingTrending(false);
      });
  }, [open, query, BACKSERVER, token]);

  useEffect(() => {
    if (!open) return undefined;
    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveTab('posts');
    setPostSortMode('popular');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const savedRecentTags = window.localStorage.getItem('moodcast-recent-tags');
    if (!savedRecentTags) return;

    try {
      const parsedTags = JSON.parse(savedRecentTags);
      if (Array.isArray(parsedTags)) {
        setRecentTagQueries(parsedTags.filter((tag) => typeof tag === 'string' && tag.trim()));
      }
    } catch {
      setRecentTagQueries([]);
    }
  }, [open]);

  const displayPosts = postSortMode === 'latest' ? recentPosts : trendingPosts;

  const toggleFollow = (memberId) => {
    const effectiveToken = token || window.sessionStorage.getItem('moodcast-access-token');
    if (!effectiveToken) {
      alert('로그인이 필요합니다.');
      return;
    }

    axios.post(`${BACKSERVER}/auth/follow/${memberId}`, {}, {
      headers: { Authorization: `Bearer ${effectiveToken}` }
    })
      .then((res) => {
        const newStatus = res.data.following;
        setResults((prev) => prev.map((item) =>
          item.memberId === memberId ? { ...item, following: newStatus } : item
        ));
      })
      .catch(() => {
        alert('팔로우 변경에 실패했습니다. 다시 시도해주세요.');
      });
  };

  const normalizeContent = (content) => {
    if (!content) return '';
    // HTML 태그 제거
    let text = content.replace(/<[^>]+>/g, '').trim();
    // HTML 엔티티 디코딩
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const resolveUserAvatarUrl = (user) => {
    return user?.profileImageUrl || user?.profile_image_url || user?.avatarUrl || user?.avatar_url ||
      user?.profileImage || user?.avatar || user?.imageUrl || user?.image || user?.photoUrl || user?.photo ||
      user?.pictureUrl || user?.picture || user?.image_url || user?.photo_url || null;
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

  const resolveAvatarUrl = (item) => {
    return item?.profileImageUrl || item?.profile_image_url || item?.avatarUrl || item?.avatar_url ||
      item?.profileImage || item?.imageUrl || item?.image || item?.photoUrl || item?.photo ||
      item?.pictureUrl || item?.picture || item?.image_url || item?.photo_url || null;
  };

  const transformPostData = (item) => {
    const authorName = item.author || item.authorName || item.authorNickname || item.nickname || '익명';
    return {
      id: item.postId,
      title: item.title,
      author: authorName,
      avatar: authorName ? authorName.charAt(0).toUpperCase() : '?',
      profileImageUrl: resolveAvatarUrl(item),
      time: formatTime(item.createdAt),
      text: normalizeContent(item.content),
      emotionId: item.emotionId,
      commentsList: [],
      comments: item.comments ?? item.commentsCount ?? 0,
      likes: item.likes ?? 0,
      likedByMe: item.likedByMe ?? false,
      savedByMe: item.savedByMe ?? false,
      vibes: 0,
      previewComment: null,
      postId: item.postId,
    };
  };

  // 검색어가 변경될 때마다 백엔드 API를 호출하여 검색 결과를 가져옵니다.
  useEffect(() => {
    if (!open) return;

    const normalized = query.trim();
    if (normalized === '') {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveToken = token || window.sessionStorage.getItem('moodcast-access-token');
    const config = effectiveToken ? {
      headers: { Authorization: `Bearer ${effectiveToken}` }
    } : {};

    axios
      .get(`${BACKSERVER}/search/${activeTab}`, {
        params: {
          q: normalized,
        },
        ...config,
      })
      .then((response) => {
        setResults(response.data?.results || []);
      })
      .catch(() => {
        setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTab, query, open, token]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <strong>검색</strong>
            <p>게시글, 사용자, 해시태그를 빠르게 찾아볼 수 있어요.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.searchField}>
          <SearchOutlinedIcon className={styles.searchIcon} />
          <input 
            ref={inputRef}
            value={query} 
            onChange={handleSearchFieldChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && query.trim() !== '') {
                onClose();
                navigate(`/app/search?q=${encodeURIComponent(query)}`);
              }
            }}
            placeholder="검색어를 입력하세요" 
            aria-label="검색어 입력"
          />
          {query.trim() && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setQuery('');
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              aria-label="검색어 지우기"
            >
              <CloseIcon fontSize="small" />
            </button>
          )}
        </div>

        <div className={styles.tabs}>
          <button type="button" className={activeTab === 'posts' ? styles.active : ''} onClick={() => setActiveTab('posts')} aria-pressed={activeTab === 'posts'}>
            게시글
          </button>
          <button type="button" className={activeTab === 'users' ? styles.active : ''} onClick={() => setActiveTab('users')} aria-pressed={activeTab === 'users'}>
            사용자
          </button>
          <button type="button" className={activeTab === 'hashtags' ? styles.active : ''} onClick={() => setActiveTab('hashtags')} aria-pressed={activeTab === 'hashtags'}>
            해시태그
          </button>
        </div>

        <div className={styles.list}>
          {query.trim() === '' ? (
            <>
              {/* 게시글 탭 - 인기 게시글 */}
              {activeTab === 'posts' && (
                <div className={styles.trendingSection}>
                  <div className={styles.sectionHeaderRow}>
                    <h3 className={styles.trendingTitle}>🔥 {postSortMode === 'latest' ? '최신 게시글' : '인기 게시글'}</h3>
                    <div className={styles.sortChips} aria-label="게시글 정렬 옵션">
                      <button
                        type="button"
                        className={`${styles.sortChip} ${postSortMode === 'popular' ? styles.sortChipActive : ''}`}
                        onClick={() => setPostSortMode('popular')}
                        aria-pressed={postSortMode === 'popular'}
                      >
                        인기순
                      </button>
                      <button
                        type="button"
                        className={`${styles.sortChip} ${postSortMode === 'latest' ? styles.sortChipActive : ''}`}
                        onClick={() => setPostSortMode('latest')}
                        aria-pressed={postSortMode === 'latest'}
                      >
                        최신순
                      </button>
                    </div>
                  </div>
                  {loadingTrendingData ? (
                    <div className={styles.trendingLoading}>로드 중...</div>
                  ) : displayPosts.length > 0 ? (
                    displayPosts.map((post) => (
                      <div 
                        key={post.postId}
                        onClick={() => {
                          onClose();
                          navigate(`/app/post/${post.postId}`);
                        }}
                      >
                        <FeedCard post={transformPostData(post)} />
                      </div>
                    ))
                  ) : (
                    <div className={styles.trendingEmpty}>인기 게시글이 없습니다.</div>
                  )}
                </div>
              )}

              {/* 사용자 탭 - 인기 사용자 */}
              {activeTab === 'users' && (
                <div className={styles.trendingSection}>
                  <h3 className={styles.trendingTitle}>👥 인기 사용자</h3>
                  {loadingTrendingData ? (
                    <div className={styles.trendingLoading}>로드 중...</div>
                  ) : trendingUsers.length > 0 ? (
                    trendingUsers.map((user) => (
                      <article
                        key={user.memberId}
                        className={styles.item}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          onClose();
                          navigate(`/app/user/${user.memberId}`);
                        }}
                      >
                        <div className={styles.userRow}>
                          <div className={styles.userAvatar}>
                            {resolveUserAvatarUrl(user) ? (
                              <img src={resolveUserAvatarUrl(user)} alt={user.nickname || user.name} />
                            ) : (
                              (user.nickname || user.name || '?').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className={styles.userMeta}>
                            <strong>{user.nickname || user.name}</strong>
                            <span>
                              @{user.email ? user.email.split('@')[0] : user.memberId} · 팔로워 {user.followerCount ?? 0}명
                            </span>
                          </div>
                          <div className={styles.userAction}>
                            {currentMember?.memberId === user.memberId ? (
                              <span className={styles.selfBadge}>내 계정</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFollow(user.memberId);
                                }}
                                className={user.following ? styles.unfollowButton : styles.followButton}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {user.following ? '언팔로우' : '팔로우'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className={styles.trendingEmpty}>인기 사용자가 없습니다.</div>
                  )}
                </div>
              )}

              {/* 해시태그 탭 - 인기 해시태그 */}
              {activeTab === 'hashtags' && (
                <div className={styles.trendingSection}>
                  <h3 className={styles.trendingTitle}>🔥 인기 해시태그</h3>
                  {loadingTrending ? (
                    <div className={styles.trendingLoading}>로드 중...</div>
                  ) : trendingTags.length > 0 ? (
                    <div className={styles.trendingTags}>
                      {trendingTags.slice(0, 8).map((tag, index) => (
                        <button
                          key={tag.hashtagId}
                          type="button"
                          className={styles.trendingTag}
                          onClick={() => {
                            saveRecentTagQuery(tag.hashtag);
                            onClose();
                            navigate(`/app/search?q=%23${tag.hashtag}`);
                          }}
                        >
                          <span className={styles.tagRank}>{index + 1}</span>
                          <span className={styles.tagLabel}>#{tag.hashtag}</span>
                          <span className={styles.tagMeta}>{(tag.useCount ?? tag.postCount ?? 0).toLocaleString('ko-KR')}개</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.trendingEmpty}>인기 태그가 없습니다.</div>
                  )}
                  <div className={styles.quickTagSection}>
                    <h4 className={styles.quickTagTitle}>{recentTagQueries.length > 0 ? '최근 검색한 태그' : '실시간 트렌드 키워드'}</h4>
                    <div className={styles.quickTagList}>
                      {(recentTagQueries.length > 0 ? recentTagQueries : trendingTags.slice(0, 6).map((tag) => tag.hashtag)).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={styles.quickTag}
                          onClick={() => {
                            saveRecentTagQuery(tag);
                            onClose();
                            navigate(`/app/search?q=%23${tag}`);
                          }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : loading ? (
            <article className={styles.item}>
              <strong>검색 중입니다...</strong>
              <p>잠시만 기다려주세요.</p>
            </article>
          ) : error ? (
            <article className={styles.item}>
              <strong>검색 중 오류가 발생했습니다.</strong>
              <p>{error}</p>
            </article>
          ) : results.length ? (
            results.map((item) => {
              // 사용자 검색 탭일 때의 리스트 아이템 렌더링
              if (activeTab === 'users') {
                return (
                  <article
                    key={item.memberId}
                    className={styles.item}
                    style={{ cursor: 'pointer' }}
                    // 사용자를 클릭하면 해당 사용자의 프로필 페이지로 이동합니다.
                    onClick={() => {
                      onClose(); // 검색창(모달)을 닫습니다.
                      navigate(`/app/user/${item.memberId}`); // 사용자의 고유 ID를 경로로 사용해 이동합니다.
                    }}
                  >
                    <div className={styles.userRow}>
                      <div className={styles.userAvatar}>
                        {resolveUserAvatarUrl(item) ? (
                          <img src={resolveUserAvatarUrl(item)} alt={item.nickname || item.name} />
                        ) : (
                          (item.nickname || item.name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles.userMeta}>
                        <strong>{item.nickname || item.name}</strong>
                        <span>@{item.email ? item.email.split('@')[0] : item.memberId}</span>
                      </div>
                      <div className={styles.userAction}>
                        {currentMember?.memberId === item.memberId ? (
                          <span className={styles.selfBadge}>내 계정</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFollow(item.memberId);
                            }}
                            className={item.following ? styles.unfollowButton : styles.followButton}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {item.following ? '언팔로우' : '팔로우'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
              // 해시태그 검색 탭일 때의 리스트 아이템 렌더링
              if (activeTab === 'hashtags') {
                return (
                  <article
                    key={item.hashtagId}
                    className={styles.item}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      saveRecentTagQuery(item.hashtag);
                      onClose(); // 모달 닫기
                      navigate(`/app/search?q=%23${item.hashtag}`); // 해시태그 검색 페이지로 이동
                    }}
                  >
                    <div className={styles.itemHeader}>
                      <strong>#{item.hashtag}</strong>
                      <span className={styles.itemCount}>{(item.useCount ?? item.postCount ?? 0).toLocaleString('ko-KR')}</span>
                    </div>
                    <p>{(item.useCount ?? item.postCount ?? 0).toLocaleString('ko-KR')}개의 게시물</p>
                  </article>
                );
              }
              // 게시글 검색 결과 (기본값)
              return (
                <div 
                  key={item.postId} 
                  onClick={() => {
                    onClose();
                    navigate(`/app/search?q=${encodeURIComponent(query)}`);
                  }}
                >
                  <FeedCard 
                    post={transformPostData(item)}
                  />
                </div>
              );
            })
          ) : (
            <article className={styles.item}>
              <strong>검색 결과가 없어요</strong>
              <p>다른 검색어로 다시 시도해보세요.</p>
            </article>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
