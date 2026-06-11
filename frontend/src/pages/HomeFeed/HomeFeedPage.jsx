import axios from "axios";
import { DesktopShell } from "../../components/layout/DesktopShell";
import { ComposerCard } from "../../components/common/ComposerCard";
import { FeedCard } from "../../components/common/FeedCard";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { normalizePostDataArray } from "../../shared/lib/postHelpers";
import { filterPostsByRange } from "../../shared/lib/emotionStats";
import styles from "./HomeFeedPage.module.css";

function normalizeHashtag(value) {
  return String(value ?? "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}

function extractPostHashtags(post) {
  const candidates = [];

  if (typeof post?.tags === "string") {
    candidates.push(...post.tags.split(/\s+/));
  } else if (Array.isArray(post?.tags)) {
    candidates.push(...post.tags);
  }

  if (Array.isArray(post?.hashtags)) {
    candidates.push(...post.hashtags);
  }

  return candidates.map((item) => normalizeHashtag(item)).filter(Boolean);
}

export function HomeFeedPage() {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [emotionFilter, setEmotionFilter] = useState(null);
  const [hashtagFilter, setHashtagFilter] = useState(null);
  const { accessToken } = useAuthStore();
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "http://localhost:8080";
  const FEED_SCROLL_KEY = "moodcast-feed-scroll-y";

  const handlePeriodFilterChange = (nextPeriod) => {
    setPeriodFilter(nextPeriod);
    setEmotionFilter(null);
    setHashtagFilter(null);
  };

  const handleEmotionFilterChange = (emotionId) => {
    setEmotionFilter((prev) => (prev === emotionId ? null : emotionId));
  };

  const handleHashtagFilterChange = (hashtag) => {
    const normalized = normalizeHashtag(hashtag);
    if (!normalized) return;
    setHashtagFilter((prev) => (prev === normalized ? null : normalized));
  };

  useEffect(() => {
    const parsedPeriod = searchParams.get("period") || "all";
    const nextPeriod = ["all", "day", "week", "month"].includes(parsedPeriod)
      ? parsedPeriod
      : "all";

    const rawEmotion = searchParams.get("emotion");
    const parsedEmotion = rawEmotion == null ? null : Number(rawEmotion);
    const nextEmotion = Number.isFinite(parsedEmotion) ? parsedEmotion : null;

    const parsedHashtag = searchParams.get("hashtag");
    const nextHashtag = parsedHashtag ? normalizeHashtag(parsedHashtag) : null;

    setPeriodFilter(nextPeriod);
    setEmotionFilter(nextEmotion);
    setHashtagFilter(nextHashtag);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${BACKSERVER}/posts`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      .then((response) => {
        const items = response.data?.results || [];
        setPosts(normalizePostDataArray(items));
      })
      .catch((err) => {
        console.error("게시물 조회 실패", err);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [BACKSERVER, accessToken]);

  const filteredPosts = useMemo(() => {
    let result = filterPostsByRange(posts, periodFilter);

    if (emotionFilter !== null) {
      result = result.filter(
        (post) => String(post.emotionId) === String(emotionFilter),
      );
    }

    if (hashtagFilter !== null) {
      result = result.filter((post) =>
        extractPostHashtags(post).includes(hashtagFilter),
      );
    }

    return result;
  }, [posts, periodFilter, emotionFilter, hashtagFilter]);

  useEffect(() => {
    if (loading) return;

    const savedScrollY = window.sessionStorage.getItem(FEED_SCROLL_KEY);
    if (savedScrollY == null) return;

    const targetScrollY = Number(savedScrollY);
    window.sessionStorage.removeItem(FEED_SCROLL_KEY);

    const timerId = window.setTimeout(() => {
      window.scrollTo({
        top: Number.isFinite(targetScrollY) ? targetScrollY : 0,
        behavior: "auto",
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loading, posts.length]);

  return (
    <DesktopShell
      periodFilter={periodFilter}
      emotionFilter={emotionFilter}
      hashtagFilter={hashtagFilter}
      onPeriodFilterChange={handlePeriodFilterChange}
      onEmotionFilterChange={handleEmotionFilterChange}
      onHashtagFilterChange={handleHashtagFilterChange}
    >
      <section className={styles.column}>
        <ComposerCard />

        {loading ? (
          <div>게시물을 불러오는 중입니다...</div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => <FeedCard key={post.id} post={post} />)
        ) : posts.length > 0 ? (
          <div>선택한 무드의 게시물이 없습니다.</div>
        ) : (
          <div>게시물이 없습니다.</div>
        )}
      </section>
    </DesktopShell>
  );
}
