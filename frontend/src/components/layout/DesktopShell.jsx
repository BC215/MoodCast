import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./DesktopShell.module.css";
import { Sidebar } from "./Sidebar";
import { TopUtilityIcons } from "./TopUtilityIcons";
import { RightRail } from "./RightRail";
import { SearchModal } from "../common/SearchModal";

function DesktopShell({
  children,
  periodFilter,
  emotionFilter,
  hashtagFilter,
  onPeriodFilterChange,
  onEmotionFilterChange,
  onHashtagFilterChange,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const cachedPostsRef = useRef(null); // Use useRef for mutable cache
  const cachedPostsPromiseRef = useRef(null); // Use useRef for mutable promise
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "/api";
  const navigate = useNavigate();
  const location = useLocation();

  const urlFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const parsedPeriod = params.get("period") || "all";
    const rawEmotion = params.get("emotion");
    const parsedEmotion = rawEmotion == null ? null : Number(rawEmotion);
    const parsedHashtag = params.get("hashtag");

    return {
      period: ["all", "day", "week", "month"].includes(parsedPeriod)
        ? parsedPeriod
        : "all",
      emotion: Number.isFinite(parsedEmotion) ? parsedEmotion : null,
      hashtag: parsedHashtag
        ? parsedHashtag.replace(/^#/, "").toLowerCase()
        : null,
    };
  }, [location.search]);

  const effectivePeriodFilter = periodFilter ?? urlFilters.period;
  const effectiveEmotionFilter = emotionFilter ?? urlFilters.emotion;
  const effectiveHashtagFilter = hashtagFilter ?? urlFilters.hashtag;

  const moveToFeedWithFilters = useCallback(
    (next) => {
      const params = new URLSearchParams();
      if (next.period) {
        params.set("period", next.period);
      }
      if (next.emotion != null) {
        params.set("emotion", String(next.emotion));
      }
      if (next.hashtag) {
        params.set(
          "hashtag",
          String(next.hashtag).replace(/^#/, "").toLowerCase(),
        );
      }
      navigate(`/app/feed${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [navigate],
  );

  const effectivePeriodChange =
    onPeriodFilterChange ??
    ((nextPeriod) => {
      moveToFeedWithFilters({
        period: nextPeriod,
        emotion: null,
        hashtag: null,
      });
    });

  const effectiveEmotionChange =
    onEmotionFilterChange ??
    ((emotionId) => {
      const nextEmotion =
        effectiveEmotionFilter === emotionId ? null : emotionId;
      moveToFeedWithFilters({
        period: effectivePeriodFilter,
        emotion: nextEmotion,
        hashtag: effectiveHashtagFilter,
      });
    });

  const effectiveHashtagChange =
    onHashtagFilterChange ??
    ((hashtag) => {
      const normalized = String(hashtag ?? "")
        .replace(/^#/, "")
        .toLowerCase();
      const nextHashtag =
        effectiveHashtagFilter === normalized ? null : normalized;
      moveToFeedWithFilters({
        period: effectivePeriodFilter,
        emotion: effectiveEmotionFilter,
        hashtag: nextHashtag,
      });
    });

  // 검색 모달을 열기 위한 함수입니다.
  const handleSearchOpen = useCallback(() => {
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      if (cachedPostsRef.current) {
        return cachedPostsRef.current;
      }

      if (!cachedPostsPromiseRef.current) {
        cachedPostsPromiseRef.current = axios
          .get(`${BACKSERVER}/posts`)
          .then((response) => {
            const nextPosts = response.data?.results || [];
            cachedPostsRef.current = nextPosts; // Update ref
            return nextPosts;
          })
          .finally(() => {
            cachedPostsPromiseRef.current = null; // Clear promise ref
          });
      }
      return cachedPostsPromiseRef.current;
    };

    const loadPosts = async () => {
      if (!cachedPostsRef.current) {
        setLoadingPosts(true);
      }

      try {
        const nextPosts = await fetchPosts(BACKSERVER);
        if (!isMounted) return;
        setPosts(nextPosts);
      } catch (error) {
        console.error("게시물 목록을 불러오지 못했습니다.", error);
        if (!isMounted) return;
        setPosts(cachedPostsRef.current || []); // Use ref for fallback
      } finally {
        if (isMounted) {
          setLoadingPosts(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [BACKSERVER]);

  return (
    <main className={styles.layout} data-dashboard-scroll-container="layout">
      <aside className={styles.leftSlot}>
        {/* 왼쪽 사이드바: 로고, 메뉴, 주요 내비게이션 */}
        <Sidebar />
      </aside>
      <section className={styles.center}>
        <div
          className={styles.centerInner}
          data-dashboard-scroll-container="center"
        >
          {children}
        </div>
      </section>
      <aside className={styles.rightSlot}>
        <div className={styles.right}>
          <TopUtilityIcons onSearch={handleSearchOpen} />
          <div
            className={styles.rightScrollArea}
            data-dashboard-scroll-container="right"
          >
            <RightRail
              posts={posts}
              isLoading={loadingPosts && !posts.length}
              periodFilter={effectivePeriodFilter}
              emotionFilter={effectiveEmotionFilter}
              hashtagFilter={effectiveHashtagFilter}
              onPeriodFilterChange={effectivePeriodChange}
              onEmotionFilterChange={effectiveEmotionChange}
              onHashtagFilterChange={effectiveHashtagChange}
            />
          </div>
        </div>
      </aside>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </main>
  );
}

export { DesktopShell };
