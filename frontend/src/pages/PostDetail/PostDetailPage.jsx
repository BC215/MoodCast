import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import { useAuthStore } from "../../stores/useAuthStore";
import { FeedCard } from "../../components/common/FeedCard";
import { PostDetailComments } from "../../components/common/PostDetailComments";
import { normalizeBackendUrl } from "../../shared/lib/postHelpers";
import styles from "./PostDetailPage.module.css";

function normalizeContent(content) {
  if (!content) return "";
  const text = content.replace(/<[^>]+>/g, "").trim();
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function extractImageUrls(html) {
  if (!html) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return Array.from(doc.querySelectorAll("img"))
      .map((img) => img.src)
      .filter(Boolean);
  } catch (error) {
    const matches = html.matchAll(/<img[^>]+src=["']?([^"' >]+)["']?/gi);
    return Array.from(matches, (match) => match[1]).filter(Boolean);
  }
}

function formatTime(dateString) {
  if (!dateString) return "방금";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "방금";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuthStore();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsReady, setCommentsReady] = useState(false);
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "http://localhost:8080";
  const shouldAutoFocusComments = useMemo(
    () =>
      searchParams.get("comments") === "1" ||
      searchParams.get("comments") === "open" ||
      Boolean(location.state?.openComments),
    [location.state?.openComments, searchParams],
  );
  const targetCommentId = useMemo(
    () =>
      location.state?.notificationCommentId ||
      searchParams.get("commentId") ||
      null,
    [location.state?.notificationCommentId, searchParams],
  );

  useEffect(() => {
    if (!postId) return;

    setLoading(true);
    axios
      .get(`${BACKSERVER}/posts/${postId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      .then((res) => {
        const item = res.data;
        if (item.success === false) {
          setPost(null);
          return;
        }

        const data = item;
        const authorName = data.author || data.nickname || "익명";
        const rawContent = data.content ?? data.body ?? "";
        const memberId =
          data.memberId ?? data.member_id ?? data.authorId ?? data.author_id;
        const rawProfileImageUrl =
          data.profileImageUrl ??
          data.profile_image_url ??
          data.avatarUrl ??
          data.avatar_url ??
          data.profileImage ??
          data.imageUrl ??
          data.image ??
          data.photoUrl ??
          data.photo ??
          data.pictureUrl ??
          data.picture ??
          data.image_url ??
          data.photo_url ??
          null;
        const rawImageSrcs = Array.from(
          new Set([
            ...(data.imageSrc ? [data.imageSrc] : []),
            ...(data.image ? [data.image] : []),
            ...(data.cover ? [data.cover] : []),
            ...(data.thumbnail ? [data.thumbnail] : []),
            ...extractImageUrls(rawContent),
          ]),
        ).filter(Boolean);
          const nextPost = {
            id: data.postId,
            postId: data.postId,
            memberId,
            profileLink: memberId ? `/app/user/${memberId}` : null,
          title: data.title,
          author: authorName,
          profileImageUrl: normalizeBackendUrl(rawProfileImageUrl, BACKSERVER, "user-images"),
          avatar: authorName.charAt(0).toUpperCase(),
          time: formatTime(data.createdAt),
          text: normalizeContent(rawContent),
          content: rawContent,
          emotionId: data.emotionId,
          comments: data.comments ?? 0,
          commentsList: [],
            likes: data.likes ?? 0,
            vibes: data.vibes ?? 0,
            likedByMe: data.likedByMe,
            savedByMe: data.savedByMe,
            tags: data.tags ?? "",
            mentions: data.mentions ?? [],
            imageSrc: normalizeBackendUrl(rawImageSrcs[0] ?? null, BACKSERVER, "post-images"),
            imageSrcs: rawImageSrcs.map((src) => normalizeBackendUrl(src, BACKSERVER, "post-images")),
            imageAlt: data.imageAlt || data.author,
          };

        setPost(nextPost);
        setCommentCount(nextPost.comments);
      })
      .catch((err) => {
        console.error("게시물 상세 조회 실패:", err);
        setPost(null);
      })
      .finally(() => setLoading(false));
  }, [BACKSERVER, accessToken, postId]);

  useEffect(() => {
    if (loading || !post) {
      setCommentsReady(false);
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setCommentsReady(true);
      if (shouldAutoFocusComments) {
        const anchor = document.getElementById("post-comments-anchor");
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 150);

    return () => window.clearTimeout(timerId);
  }, [loading, post, shouldAutoFocusComments]);

  useEffect(() => {
    if (!post) return undefined;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [post]);

  const closeDetail = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/app/feed", { replace: true });
  };

  const handleCommentButtonClick = () => {
    const anchor = document.getElementById("post-comments-anchor");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const content = (
    <div className={styles.page}>
      {loading ? (
        <div className={styles.loader}>게시물을 불러오는 중입니다...</div>
      ) : post ? (
        <>
          <div className={styles.detailCard}>
            <FeedCard
              post={{ ...post, comments: commentCount }}
              initialCommentOpen={false}
              onCommentClick={handleCommentButtonClick}
            />
          </div>
          <div id="post-comments-anchor" className={styles.commentPanel}>
            {commentsReady ? (
              <PostDetailComments
                post={post}
                onCommentCountChange={setCommentCount}
                targetCommentId={targetCommentId}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );

  if (!post && !loading) {
    return createPortal(
      <div className={styles.overlay} role="presentation">
        <section className={styles.modal} role="dialog" aria-modal="true">
          <header className={styles.modalHeader}>
            <div>
              <strong>게시물 상세보기</strong>
              <p>찾을 수 없는 게시물입니다.</p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={(event) => {
                event.stopPropagation();
                closeDetail();
              }}
              aria-label="닫기"
            >
              <CloseIcon />
            </button>
          </header>
        </section>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div>
            <strong>{post?.author || "게시물"} 님의 게시물</strong>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={(event) => {
              event.stopPropagation();
              closeDetail();
            }}
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </header>

        <div className={styles.modalBody}>{content}</div>
      </section>
    </div>,
    document.body,
  );
}
