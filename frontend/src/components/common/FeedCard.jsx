import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShareIcon from "@mui/icons-material/Share";
import FlagIcon from "@mui/icons-material/Flag";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SpaIcon from "@mui/icons-material/Spa";
import MoodBadIcon from "@mui/icons-material/MoodBad";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../stores/useAuthStore";
import { defaultAvatarSrc } from "../../shared/lib/defaultAvatar";
import { normalizeBackendUrl } from "../../shared/lib/postHelpers";
import { CommentModal } from "./CommentModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { ReportModal } from "./ReportModal"; // 신고 모달 import
import { HashtagRow } from "./HashtagRow";
import { RichTextContent } from "../../shared/ui/rich-text/RichTextContent";
import styles from "./FeedCard.module.css";

const EMOTIONS = {
  1: {
    name: "행복",
    icon: EmojiEmotionsIcon,
    color: "#FFD700",
    quote: "오늘의 이 행복한 순간을 박제해 볼까요?",
  },
  2: {
    name: "슬픔",
    icon: SentimentDissatisfiedIcon,
    color: "#4A90E2",
    quote: "무슨 일이 있었나요? 마음속 이야기를 털어놓아도 좋아요.",
  },
  3: {
    name: "차분함",
    icon: SpaIcon,
    color: "#F4A460",
    quote: "잔잔하고 평온한 지금 이 느낌을 그대로 적어보세요.",
  },
  4: {
    name: "화남",
    icon: MoodBadIcon,
    color: "#E74C3C",
    quote: "답답하고 화나는 마음, 여기에 다 쏟아내고 털어버려요!",
  },
  5: {
    name: "신남",
    icon: CelebrationIcon,
    color: "#FF69B4",
    quote: "텐션 업! 얼마나 짜릿하고 신나는 일인가요?",
  },
  6: {
    name: "무감정",
    icon: SentimentNeutralIcon,
    color: "#95A5A6",
    quote: "아무 생각 없는 날도 있죠. 멍하니 흘러간 하루를 기록해요.",
  },
};
function MoodVisual({ emotionId }) {
  const emotion = EMOTIONS[emotionId] || EMOTIONS[3]; // 기본값: Calm
  const IconComponent = emotion.icon;
  return (
    <div
      className={styles.moodCard}
      style={{
        borderColor: emotion.color,
        backgroundColor: emotion.color + "18",
      }}
    >
      <IconComponent sx={{ fontSize: "1rem", color: emotion.color }} />
      <span
        style={{ fontSize: "0.78rem", fontWeight: 600, color: emotion.color }}
      >
        {emotion.name}
      </span>
    </div>
  );
}

function SparkleIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3.5L13.8 9.4L19.5 11.2L13.8 13L12 18.9L10.2 13L4.5 11.2L10.2 9.4L12 3.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M18 4.8L18.7 7.1L21 7.8L18.7 8.5L18 10.8L17.3 8.5L15 7.8L17.3 7.1L18 4.8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M6 13.2L6.7 15.5L9 16.2L6.7 16.9L6 19.2L5.3 16.9L3 16.2L5.3 15.5L6 13.2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function extractImageUrl(html) {
  if (!html) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const img = doc.querySelector("img");
    return img?.src ?? null;
  } catch (error) {
    const match = html.match(/<img[^>]+src=["']?([^"' >]+)["']?/i);
    return match ? match[1] : null;
  }
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

function stripHtml(html) {
  if (!html) return "";
  const text = html
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .trim();
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export function FeedCard({
  post,
  compact = false,
  initialCommentOpen = false,
  onCommentClick,
}) {
  const navigate = useNavigate();
  const { member, accessToken: storeToken } = useAuthStore();
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "http://localhost:8080";
  // Zustand store가 초기화 전일 경우 sessionStorage에서 직접 읽음
  const accessToken =
    storeToken || window.sessionStorage.getItem("moodcast-access-token");

  // member.nickname으로 비교 (post.author는 nickname 값)
  const currentUser = member?.nickname || "";
  const isOwner = post.author === currentUser;

  const [selectedPost, setSelectedPost] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState(post.commentsList ?? []);
  const [commentCount, setCommentCount] = useState(
    post.comments ?? post.commentsCount ?? post.commentsList?.length ?? 0,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false); // 신고 모달 상태
  const [likesCount, setLikesCount] = useState(post.likes ?? 0);
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [saved, setSaved] = useState(post.savedByMe ?? false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);
  const moreButtonRef = useRef(null);
  const menuRef = useRef(null);
  const hasAutoOpenedCommentsRef = useRef(false);
  const postId = post.id ?? post.postId;
  const FEED_SCROLL_KEY = "moodcast-feed-scroll-y";

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      const clickedMoreButton =
        moreButtonRef.current && moreButtonRef.current.contains(e.target);
      const clickedMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!clickedMoreButton && !clickedMenu) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    setComments(post.commentsList ?? []);
    setCommentCount(
      post.comments ?? post.commentsCount ?? post.commentsList?.length ?? 0,
    );
    setLikesCount(post.likes ?? 0);
    setLiked(Boolean(post.likedByMe));
    setSaved(Boolean(post.savedByMe));
  }, [post]);

  const rawContent = post.content ?? post.body ?? post.text ?? "";
  const explicitImageSrcs = Array.isArray(post.imageSrcs)
    ? post.imageSrcs
    : post.imageSrcs
      ? [post.imageSrcs]
      : [];
  const imageCandidates = [
    ...explicitImageSrcs,
    post.imageSrc,
    post.image,
    post.cover,
    post.thumbnail,
    ...extractImageUrls(rawContent),
  ]
    .filter(Boolean)
    .map((src) => normalizeBackendUrl(src, BACKSERVER, "post-images"));
  const imageSrcs = Array.from(new Set(imageCandidates));
  const imageSrc = imageSrcs[0] ?? null;
  const timeLabel = post.time ?? post.createdAt ?? post.created_at ?? "";
  const postMemberId =
    post.memberId ??
    post.member_id ??
    post.authorId ??
    post.author_id ??
    post.userId ??
    post.user_id;
  const profileLink =
    post.profileLink ?? (postMemberId ? `/app/user/${postMemberId}` : null);
  const profileImageUrl = normalizeBackendUrl(
    post.profileImageUrl ??
      post.profile_image_url ??
      post.avatarUrl ??
      post.avatar_url ??
      post.profileImage ??
      post.imageUrl ??
      post.image ??
      post.photoUrl ??
      post.photo ??
      post.pictureUrl ??
      post.picture ??
      post.image_url ??
      post.photo_url ??
      null,
    BACKSERVER,
    "user-images",
  );
  const profileInitial = post.author
    ? post.author.charAt(0).toUpperCase()
    : "?";
  const handleMentionClick = (mention) => {
    const userId = mention?.userId ?? mention?.mentionedUserId;
    if (!userId) {
      return;
    }

    navigate(`/app/user/${userId}`);
  };

  useEffect(() => {
    if (imageSrcs.length === 0) return;
    if (!carouselRef.current) return;

    // 썸네일이 보이도록 스크롤 조정
    const thumbWidth = 80; // 썸네일 크기 + gap
    const containerWidth = carouselRef.current.clientWidth;
    const scrollLeft = Math.max(
      0,
      carouselIndex * thumbWidth - containerWidth / 2 + thumbWidth / 2,
    );

    carouselRef.current.scrollLeft = scrollLeft;
  }, [carouselIndex, imageSrcs.length]);

  useEffect(() => {
    if (imageSrcs.length > 0) {
      setCarouselIndex(0);
    }
  }, [imageSrcs.length]);

  const handleCarouselScroll = (event) => {
    const el = event.currentTarget;
    if (!el) return;
    const itemWidth = el.clientWidth;
    if (!itemWidth) return;
    const nextIndex = Math.round(el.scrollLeft / itemWidth);
    if (nextIndex !== carouselIndex && nextIndex < imageSrcs.length) {
      setCarouselIndex(nextIndex);
    }
  };

  const fetchComments = async (postId) => {
    try {
      const response = await axios.get(
        `${BACKSERVER}/posts/${postId}/comments`,
      );
      const items = response.data?.results || [];

      const normalizeComment = (comment) => ({
        ...comment,
        memberId: comment.memberId,
        profileLink: comment.memberId ? `/app/user/${comment.memberId}` : null,
        profileImageUrl:
          comment.profileImageUrl ?? comment.profile_image_url ?? null,
        author: comment.author || comment.nickname || "익명",
        replies: (comment.replies ?? []).map((reply) =>
          normalizeComment(reply),
        ),
      });

      setComments(items.map((item) => normalizeComment(item)));
    } catch (error) {
      console.error("댓글을 불러오는 중 오류가 발생했습니다.", error);
    }
  };

  const handleCommentClick = async (event) => {
    event?.stopPropagation();
    if (onCommentClick) {
      onCommentClick();
      return;
    }

    window.sessionStorage.setItem(
      FEED_SCROLL_KEY,
      String(window.scrollY || window.pageYOffset || 0),
    );

    navigate(`/app/post/${postId}?comments=1`, {
      state: {
        openComments: true,
      },
    });
  };

  useEffect(() => {
    if (!initialCommentOpen || hasAutoOpenedCommentsRef.current || !postId) {
      return;
    }

    hasAutoOpenedCommentsRef.current = true;
    const timerId = window.setTimeout(() => {
      handleCommentClick();
    }, 120);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [initialCommentOpen, postId]);

  const closeCommentModal = () => {
    setSelectedPost(null);
    setIsCommentModalOpen(false);
  };

  const toggleMenu = (event) => {
    event?.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleCardClick = () => {
    const postId = post.id ?? post.postId;
    window.sessionStorage.setItem(
      FEED_SCROLL_KEY,
      String(window.scrollY || window.pageYOffset || 0),
    );
    navigate(`/app/post/${postId}`);
  };

  const handleAuthorClick = (event) => {
    event.stopPropagation();
    if (profileLink) {
      navigate(profileLink);
    }
  };

  const handleEdit = (event) => {
    event?.stopPropagation();
    setMenuOpen(false);
    navigate(`/app/post/edit/${postId}`);
  };

  const handleDelete = (event) => {
    event?.stopPropagation();
    setMenuOpen(false);
    setDeleteModalOpen(true);
  };

  const handleShare = async (event) => {
    event?.stopPropagation();
    setMenuOpen(false);
    const shareUrl = `${window.location.origin}/app/post/${postId}`;

    if (!navigator.share) {
      return;
    }

    try {
      await navigator.share({
        title: post.title || "MoodCast 게시물",
        text: post.text || "MoodCast에서 공유된 게시물입니다.",
        url: shareUrl,
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("공유 실패:", error);
      }
    }
  };

  const handleSave = async (event) => {
    event?.stopPropagation();
    setMenuOpen(false);
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await axios.post(
        `${BACKSERVER}/posts/${postId}/saves`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setSaved(response.data.saved);
    } catch (err) {
      console.error("❌ 게시물 저장 실패:", err);
      alert("게시물 저장에 실패했습니다.");
    }
  };

  const handleReport = (event) => {
    event?.stopPropagation();
    setMenuOpen(false);

    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return;
    }
    setReportModalOpen(true); // 신고 모달 열기
  };

  const handleReportSubmit = async ({ reason }) => {
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      await axios.post(
        `${BACKSERVER}/reports`, // 신고 API 엔드포인트
        {
          postId: postId,
          reason: reason,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      setReportModalOpen(false);
      alert("게시물 신고가 정상적으로 접수되었습니다.");
    } catch (error) {
      setReportModalOpen(false);
      const errorMessage = error.response?.data?.message || "";
      // 409 상태 코드 또는 응답 메시지에 '이미 신고'가 포함된 경우를 중복으로 처리
      if (
        error.response?.status === 409 ||
        errorMessage.includes("이미 신고")
      ) {
        alert(errorMessage || "이미 신고된 내용입니다.");
      } else {
        console.error("신고 제출 실패:", error);
        alert("신고 접수에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    try {
      setDeleteModalOpen(false);

      await axios.delete(`${BACKSERVER}/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      window.location.reload();
    } catch (err) {
      console.error("❌ 게시물 삭제 실패:", err);
      alert("게시물 삭제에 실패했습니다.");
    }
  };

  const handleLike = async (event) => {
    event.stopPropagation();
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await axios.post(
        `${BACKSERVER}/posts/${postId}/likes`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      setLiked(response.data.liked);
      if (typeof response.data.likes === "number") {
        setLikesCount(response.data.likes);
      }
      return { liked: response.data.liked, likes: response.data.likes };
    } catch (err) {
      console.error("좋아요 요청 실패:", err);
      alert("좋아요 처리에 실패했습니다.");
    }
  };

  const handleCommentSubmit = async (content) => {
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return null;
    }

    try {
      const response = await axios.post(
        `${BACKSERVER}/posts/${postId}/comments`,
        { content },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const nextComment = response.data.comment;
      const mappedComment = {
        ...nextComment,
        memberId: nextComment?.memberId,
        profileLink: nextComment?.memberId
          ? `/app/user/${nextComment.memberId}`
          : null,
        profileImageUrl:
          nextComment?.profileImageUrl ??
          nextComment?.profile_image_url ??
          null,
        author: nextComment?.author || nextComment?.nickname || "익명",
      };
      setComments((prev) => [...prev, mappedComment]);
      setCommentCount((prev) => prev + 1);
      return mappedComment;
    } catch (err) {
      console.error("댓글 등록 실패:", err);
      alert("댓글 등록에 실패했습니다.");
      return null;
    }
  };

  const handleCommentSubmitWithMentions = async (payload) => {
    const content =
      typeof payload === "string" ? payload : (payload?.content ?? "");
    const mentions = Array.isArray(payload?.mentions) ? payload.mentions : [];

    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return null;
    }

    try {
      const response = await axios.post(
        `${BACKSERVER}/posts/${postId}/comments`,
        { content, mentions },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const nextComment = response.data.comment;
      const mappedComment = {
        ...nextComment,
        memberId: nextComment?.memberId,
        profileLink: nextComment?.memberId
          ? `/app/user/${nextComment.memberId}`
          : null,
        profileImageUrl:
          nextComment?.profileImageUrl ??
          nextComment?.profile_image_url ??
          null,
        author: nextComment?.author || nextComment?.nickname || "익명",
        mentions: nextComment?.mentions ?? mentions,
      };
      setComments((prev) => [...prev, mappedComment]);
      setCommentCount((prev) => prev + 1);
      return mappedComment;
    } catch (err) {
      console.error("댓글 등록 실패:", err);
      alert("댓글 등록에 실패했습니다.");
      return null;
    }
  };

  return (
    <>
      <article
        className={`${styles.card} ${compact ? styles.compact : ""}`}
        onClick={handleCardClick}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.head} onClick={(e) => e.stopPropagation()}>
          <div
            className={styles.avatar}
            onClick={handleAuthorClick}
            style={profileLink ? { cursor: "pointer" } : {}}
          >
            <img
              src={profileImageUrl || defaultAvatarSrc}
              alt={post.author || "프로필"}
              onError={(event) => {
                console.error("[FeedCard] profile image load failed", {
                  author: post.author,
                  attemptedSrc:
                    event.currentTarget.currentSrc || event.currentTarget.src,
                  rawProfileImageUrl: profileImageUrl,
                });
                event.currentTarget.onerror = null;
                event.currentTarget.src = defaultAvatarSrc;
              }}
            />
          </div>
          <div className={styles.meta}>
            <strong
              onClick={handleAuthorClick}
              style={profileLink ? { cursor: "pointer" } : {}}
            >
              {post.author}
            </strong>
            <div className={styles.metaRow}>
              <span>{timeLabel}</span>
              {post.emotionId && <MoodVisual emotionId={post.emotionId} />}
            </div>
          </div>
          {/* 메뉴 버튼 - 모든 사용자 표시 */}
          <div className={styles.moreWrapper}>
            <button
              ref={moreButtonRef}
              type="button"
              className={styles.more}
              onClick={toggleMenu}
              aria-label="더보기"
              onMouseDown={(e) => e.preventDefault()}
            >
              <MoreHorizIcon />
            </button>
            {/* SNS처럼 자연스럽게 떠오르는 메뉴 */}
            {menuOpen && (
              <div ref={menuRef} className={styles.moreMenu}>
                {/* 작성자만 수정/삭제 가능 */}
                {isOwner && (
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={(e) => handleEdit(e)}
                  >
                    <EditIcon className={styles.menuIcon} />
                    수정
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.menuItem} ${saved ? styles.menuItemSaved : ""}`}
                  onClick={(e) => handleSave(e)}
                >
                  {saved ? (
                    <BookmarkIcon className={styles.menuIcon} />
                  ) : (
                    <BookmarkBorderIcon className={styles.menuIcon} />
                  )}
                  {saved ? "저장됨" : "저장"}
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={(e) => handleShare(e)}
                >
                  <ShareIcon className={styles.menuIcon} />
                  공유
                </button>
                {!isOwner && (
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={(e) => handleReport(e)}
                  >
                    <FlagIcon className={styles.menuIcon} />
                    신고
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={(e) => handleDelete(e)}
                  >
                    <DeleteOutlineIcon className={styles.menuIcon} />
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {post.title && <p className={styles.title}>{post.title}</p>}
        <p className={styles.text}>
          <RichTextContent
            content={rawContent}
            mentions={post.mentions ?? []}
            onMentionClick={handleMentionClick}
            className={styles.textContent}
            mentionClassName={styles.mentionText}
          />
        </p>
        {imageSrcs.length > 0 && (
          <div className={styles.postImageCarousel}>
            {/* 메인 이미지 */}
            <div className={styles.mainImageContainer}>
              <div className={styles.mainImageWrapper}>
                {imageSrcs.length > 1 && (
                  <button
                    className={styles.carouselArrowLeft}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIdx = Math.max(0, carouselIndex - 1);
                      setCarouselIndex(newIdx);
                    }}
                    aria-label="이전 이미지"
                  >
                    ‹
                  </button>
                )}

                <img
                  className={styles.mainImage}
                  src={imageSrcs[carouselIndex]}
                  alt={`이미지 ${carouselIndex + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(carouselIndex);
                  }}
                />

                {imageSrcs.length > 1 && (
                  <button
                    className={styles.carouselArrowRight}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIdx = Math.min(
                        imageSrcs.length - 1,
                        carouselIndex + 1,
                      );
                      setCarouselIndex(newIdx);
                    }}
                    aria-label="다음 이미지"
                  >
                    ›
                  </button>
                )}
              </div>
            </div>

            {/* 썸네일 스트립 */}
            {imageSrcs.length > 1 && (
              <div className={styles.thumbnailContainer}>
                <div className={styles.thumbnailTrack} ref={carouselRef}>
                  {imageSrcs.map((src, index) => (
                    <button
                      key={src + index}
                      className={`${styles.thumbnail} ${carouselIndex === index ? styles.activeThumbnail : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(index);
                      }}
                      aria-label={`이미지 ${index + 1}`}
                    >
                      <img src={src} alt={`썸네일 ${index + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <HashtagRow tags={post.tags} variant="feed" />

        {lightboxIndex !== null && (
          <div
            className={styles.imageViewerOverlay}
            onClick={() => setLightboxIndex(null)}
          >
            <div
              className={styles.imageViewerContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.imageViewerClose}
                onClick={() => setLightboxIndex(null)}
                aria-label="닫기"
              >
                ✕
              </button>

              {/* 메인 이미지 */}
              <div className={styles.lightboxMainContainer}>
                {imageSrcs.length > 1 && (
                  <button
                    type="button"
                    className={styles.lightboxArrowLeft}
                    disabled={lightboxIndex <= 0}
                    onClick={() =>
                      setLightboxIndex((prev) => Math.max(0, prev - 1))
                    }
                    aria-label="이전 이미지"
                  >
                    ‹
                  </button>
                )}

                <div className={styles.lightboxMainImage}>
                  <img
                    src={imageSrcs[lightboxIndex]}
                    alt={`${post.imageAlt ?? post.author} ${lightboxIndex + 1}`}
                  />
                </div>

                {imageSrcs.length > 1 && (
                  <button
                    type="button"
                    className={styles.lightboxArrowRight}
                    disabled={lightboxIndex >= imageSrcs.length - 1}
                    onClick={() =>
                      setLightboxIndex((prev) =>
                        Math.min(imageSrcs.length - 1, prev + 1),
                      )
                    }
                    aria-label="다음 이미지"
                  >
                    ›
                  </button>
                )}
              </div>

              {/* 이미지 카운터 */}
              {imageSrcs.length > 1 && (
                <div className={styles.lightboxCounter}>
                  {lightboxIndex + 1} / {imageSrcs.length}
                </div>
              )}

              {/* 썸네일 스트립 */}
              {imageSrcs.length > 1 && (
                <div className={styles.lightboxThumbnailContainer}>
                  <div className={styles.lightboxThumbnailTrack}>
                    {imageSrcs.map((src, index) => (
                      <button
                        key={src + index}
                        className={`${styles.lightboxThumbnail} ${lightboxIndex === index ? styles.lightboxActiveThumbnail : ""}`}
                        onClick={() => setLightboxIndex(index)}
                        aria-label={`이미지 ${index + 1}`}
                      >
                        <img src={src} alt={`썸네일 ${index + 1}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {post.attachments?.length ? (
          <div className={styles.attachmentArea}>
            <strong>첨부파일</strong>
            <ul className={styles.fileList}>
              {post.attachments.map((file) => (
                <li key={file.id} className={styles.attachmentItem}>
                  <span>{file.name}</span>
                  <span>{file.type}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <button
              type="button"
              className={`${styles.reaction} ${liked ? styles.activeReaction : ""}`}
              onClick={handleLike}
              aria-pressed={liked}
              aria-label={liked ? "좋아요 취소" : "좋아요"}
            >
              {liked ? (
                <FavoriteIcon className={styles.actionIcon} />
              ) : (
                <FavoriteBorderIcon className={styles.actionIcon} />
              )}
              {likesCount}
            </button>
            <button
              type="button"
              className={styles.reactionButton}
              onClick={handleCommentClick}
            >
              <ChatBubbleOutlineIcon className={styles.actionIcon} />
              {commentCount}
            </button>
            <button
              type="button"
              className={styles.reactionButton}
              onClick={handleShare}
              aria-label="공유"
            >
              <ShareIcon className={styles.actionIcon} />
            </button>
            <button
              type="button"
              className={`${styles.bookmark} ${saved ? styles.activeBookmark : ""}`}
              aria-pressed={saved}
              aria-label={saved ? "저장 취소" : "저장"}
              onClick={handleSave}
            >
              {saved ? (
                <BookmarkIcon className={styles.actionIcon} />
              ) : (
                <BookmarkBorderIcon className={styles.actionIcon} />
              )}
            </button>
          </div>
        </div>

        {post.previewComment ? (
          <div className={styles.preview}>
            <strong>{post.previewComment.author}</strong>
            <span>{post.previewComment.time}</span>
            <p>
              <RichTextContent
                content={post.previewComment.text}
                className={styles.previewText}
              />
            </p>
          </div>
        ) : null}
      </article>

      <CommentModal
        open={isCommentModalOpen}
        post={selectedPost}
        comments={comments}
        onClose={closeCommentModal}
        onSubmit={handleCommentSubmitWithMentions}
        onLike={handleLike}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        title="게시물을 삭제하시겠습니까?"
        description="삭제한 게시물은 복구할 수 없습니다. 계속 진행하시겠습니까?"
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        targetId={postId}
        targetType="post"
      />
    </>
  );
}
