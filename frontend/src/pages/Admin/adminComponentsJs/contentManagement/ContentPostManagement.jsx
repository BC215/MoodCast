import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SpaIcon from "@mui/icons-material/Spa";
import MoodBadIcon from "@mui/icons-material/MoodBad";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { defaultAvatarSrc } from "../../../../shared/lib/defaultAvatar";
import { extractImageUrls } from "../../../../shared/lib/postHelpers";
import { ContentBulkActions } from "./ContentBulkActions";
import { ContentCommentGrid } from "./ContentCommentGrid";
import { ContentHashtagGrid } from "./ContentHashtagGrid";
import { ContentManagementControls } from "./ContentManagementControls";
import { ContentManagementToolbar } from "./ContentManagementToolbar";
import { ContentPostDetailModal } from "./ContentPostDetailModal";
import { ContentPostGrid } from "./ContentPostGrid";
import { ContentSidePanel } from "./ContentSidePanel";
import styles from "../../adminComponentsCss/contentManagement/ContentPostManagement.module.css";

const POSTS_PER_PAGE = 12;
const PAGE_BUTTON_COUNT = 10;
const statusFilters = ["전체", "공개", "숨김", "삭제"];
const hashtagSortOptions = [
  { value: "latest", label: "최신 사용 순" },
  { value: "oldest", label: "오래된 순" },
  { value: "name", label: "가나다 순" },
];

const emotionFilters = [
  { value: "all", label: "전체 감정", color: "#667085", icon: SentimentNeutralIcon },
  { value: "1", label: "행복", color: "#FFD700", icon: EmojiEmotionsIcon },
  { value: "2", label: "슬픔", color: "#4A90E2", icon: SentimentDissatisfiedIcon },
  { value: "3", label: "차분", color: "#F4A460", icon: SpaIcon },
  { value: "4", label: "화남", color: "#E74C3C", icon: MoodBadIcon },
  { value: "5", label: "신남", color: "#FF69B4", icon: CelebrationIcon },
  { value: "6", label: "무감정", color: "#95A5A6", icon: SentimentNeutralIcon },
];

/**
 * 관리자 콘텐츠 관리 메인 컨테이너입니다.
 * 게시글/댓글/해시태그 조회, 검색/필터, 페이지네이션, 관리 액션을 처리합니다.
 */
export function ContentPostManagement() {
  const [activeTab, setActiveTab] = useState("게시글");
  const [searchField, setSearchField] = useState("title");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeStatus, setActiveStatus] = useState("전체");
  const [activeCommentStatus, setActiveCommentStatus] = useState("전체");
  const [hashtagSort, setHashtagSort] = useState("latest");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(false);

  const [hashtags, setHashtags] = useState([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [hashtagsError, setHashtagsError] = useState(false);

  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [selectedDetailPost, setSelectedDetailPost] = useState(null);
  const [actionLoadingPostId, setActionLoadingPostId] = useState(null);
  const [actionLoadingCommentId, setActionLoadingCommentId] = useState(null);
  const [actionLoadingHashtagId, setActionLoadingHashtagId] = useState(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const { accessToken } = useAuthStore();
  const BACKSERVER = (import.meta.env.VITE_BACKSERVER || "http://localhost:8080").replace(/\/$/, "");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  );

  const noImageSrc = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="420" height="180" viewBox="0 0 420 180">
        <rect width="420" height="180" rx="24" fill="#f3f4f6"/>
        <circle cx="210" cy="70" r="24" fill="#d0d5dd"/>
        <path d="M128 132l52-44 40 34 28-24 44 34H128z" fill="#98a2b3"/>
        <text x="210" y="158" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#667085">이미지 없음</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const fetchPosts = () => {
    if (!accessToken) return;
    setPostsLoading(true);
    setPostsError(false);
    axios
      .get(`${BACKSERVER}/admin/api/content/posts`, { headers: authHeaders })
      .then((res) => setPosts(Array.isArray(res.data?.posts) ? res.data.posts : []))
      .catch(() => {
        setPosts([]);
        setPostsError(true);
      })
      .finally(() => setPostsLoading(false));
  };

  const fetchComments = () => {
    if (!accessToken) return;
    setCommentsLoading(true);
    setCommentsError(false);
    axios
      .get(`${BACKSERVER}/admin/api/content/comments`, { headers: authHeaders })
      .then((res) => setComments(Array.isArray(res.data?.comments) ? res.data.comments : []))
      .catch(() => {
        setComments([]);
        setCommentsError(true);
      })
      .finally(() => setCommentsLoading(false));
  };

  const fetchHashtags = () => {
    if (!accessToken) return;
    setHashtagsLoading(true);
    setHashtagsError(false);
    axios
      .get(`${BACKSERVER}/admin/api/content/hashtags`, { headers: authHeaders })
      .then((res) => setHashtags(Array.isArray(res.data?.hashtags) ? res.data.hashtags : []))
      .catch(() => {
        setHashtags([]);
        setHashtagsError(true);
      })
      .finally(() => setHashtagsLoading(false));
  };

  useEffect(() => {
    fetchPosts();
    fetchComments();
    fetchHashtags();
  }, [accessToken, BACKSERVER]);

  const getPostStatus = (post) => {
    if (post.deletedYn === "Y") return "삭제";
    if (post.visibility === "PRIVATE" || post.visibility === "HIDDEN") return "숨김";
    return "공개";
  };

  const getStatusClassName = (status) => {
    if (status === "삭제") return styles.statusDeleted;
    if (status === "숨김") return styles.statusHidden;
    return styles.statusPublic;
  };

  const getAuthorName = (post) => post.authorNickname || post.authorName || "작성자 없음";
  const stripHtml = (value) => String(value || "").replace(/<[^>]*>/g, "").trim();

  const getEmotionMeta = (emotionId) =>
    emotionFilters.find((item) => item.value === String(emotionId)) || {
      label: "감정 없음",
      color: "#667085",
      icon: SentimentNeutralIcon,
    };

  const getPostImageInfo = (post) => {
    const contentImageUrls = extractImageUrls(post.content);
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
      post.thumbnailUrl,
      post.imageUrl,
      post.imagePath,
      post.firstImageUrl,
      post.fileUrl,
      ...contentImageUrls,
    ].filter(Boolean);

    const rawImageUrl = imageCandidates[0] || "";
    if (!rawImageUrl) return { imageSrc: noImageSrc, hasImage: false };
    if (/^https?:\/\//i.test(rawImageUrl)) return { imageSrc: rawImageUrl, hasImage: true };
    if (rawImageUrl.startsWith("/")) return { imageSrc: `${BACKSERVER}${rawImageUrl}`, hasImage: true };
    return { imageSrc: `${BACKSERVER}/uploads/${rawImageUrl}`, hasImage: true };
  };

  const getAuthorProfileImageSrc = (item) => {
    const rawProfileImageUrl =
      item?.authorProfileImageUrl ||
      item?.profileImageUrl ||
      item?.profile_image_url ||
      "";

    if (!rawProfileImageUrl) return defaultAvatarSrc;
    if (/^(https?:)?\/\//i.test(rawProfileImageUrl)) return rawProfileImageUrl;
    if (rawProfileImageUrl.startsWith("/")) return `${BACKSERVER}${rawProfileImageUrl}`;
    return `${BACKSERVER}/uploads/${rawProfileImageUrl}`;
  };

  const filteredPosts = posts.filter((post) => {
    if (activeTab !== "게시글") return false;
    const postStatus = getPostStatus(post);
    const trimmedKeyword = searchKeyword.trim().toLowerCase();
    const authorName = getAuthorName(post).toLowerCase();
    const title = String(post.title || "").toLowerCase();
    const createdDate = String(post.createdAt || "").slice(0, 10);

    if (activeStatus !== "전체" && postStatus !== activeStatus) return false;
    if (emotionFilter !== "all" && String(post.emotionId || "") !== emotionFilter) return false;
    if (startDate && createdDate && createdDate < startDate) return false;
    if (endDate && createdDate && createdDate > endDate) return false;
    if (!trimmedKeyword) return true;
    if (searchField === "author") return authorName.includes(trimmedKeyword);
    return title.includes(trimmedKeyword);
  });

  const filteredComments = comments.filter((comment) => {
    if (activeTab !== "댓글") return false;
    const trimmedKeyword = searchKeyword.trim().toLowerCase();
    const commentStatus =
      comment.deletedYn === "Y"
        ? "삭제"
        : comment.moderationStatus === "HIDDEN"
          ? "숨김"
          : "공개";
    if (activeCommentStatus !== "전체" && commentStatus !== activeCommentStatus) return false;
    if (!trimmedKeyword) return true;
    if (searchField === "author") {
      return `${comment.authorName || ""} ${comment.authorNickname || ""}`
        .toLowerCase()
        .includes(trimmedKeyword);
    }
    if (searchField === "postTitle") {
      return String(comment.postTitle || "").toLowerCase().includes(trimmedKeyword);
    }
    return String(comment.content || "").toLowerCase().includes(trimmedKeyword);
  });

  const filteredHashtags = hashtags
    .filter((hashtag) => {
      if (activeTab !== "해시태그") return false;
      const trimmedKeyword = searchKeyword.trim().toLowerCase().replace(/^#/, "");
      if (!trimmedKeyword) return true;
      return String(hashtag.hashtag || "").toLowerCase().includes(trimmedKeyword);
    })
    .sort((leftHashtag, rightHashtag) => {
      if (hashtagSort === "name") {
        return String(leftHashtag.hashtag || "").localeCompare(
          String(rightHashtag.hashtag || ""),
          "ko",
        );
      }
      const leftDate = new Date(leftHashtag.latestPostCreatedAt || 0).getTime();
      const rightDate = new Date(rightHashtag.latestPostCreatedAt || 0).getTime();
      return hashtagSort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
    });

  const activeFilteredCount =
    activeTab === "댓글"
      ? filteredComments.length
      : activeTab === "해시태그"
        ? filteredHashtags.length
        : filteredPosts.length;

  const totalPageCount = Math.max(1, Math.ceil(activeFilteredCount / POSTS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(pageStartIndex, pageStartIndex + POSTS_PER_PAGE);
  const paginatedComments = filteredComments.slice(pageStartIndex, pageStartIndex + POSTS_PER_PAGE);
  const paginatedHashtags = filteredHashtags.slice(pageStartIndex, pageStartIndex + POSTS_PER_PAGE);

  const pageGroupStart =
    Math.floor((currentPage - 1) / PAGE_BUTTON_COUNT) * PAGE_BUTTON_COUNT + 1;
  const pageGroupEnd = Math.min(pageGroupStart + PAGE_BUTTON_COUNT - 1, totalPageCount);
  const pageNumbers = Array.from(
    { length: pageGroupEnd - pageGroupStart + 1 },
    (_, index) => pageGroupStart + index,
  );

  const currentPagePostIds = paginatedPosts.map((post) => post.postId);
  const isCurrentPageSelected =
    currentPagePostIds.length > 0 &&
    currentPagePostIds.every((postId) => selectedPostIds.includes(postId));

  useEffect(() => {
    if (activeTab === "댓글") {
      setSearchField("content");
      return;
    }
    if (activeTab === "해시태그") {
      setSearchField("hashtag");
      return;
    }
    setSearchField("title");
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPostIds([]);
  }, [
    activeTab,
    searchField,
    searchKeyword,
    activeStatus,
    activeCommentStatus,
    emotionFilter,
    startDate,
    endDate,
    hashtagSort,
  ]);

  useEffect(() => {
    if (currentPage > totalPageCount) setCurrentPage(totalPageCount);
  }, [currentPage, totalPageCount]);

  const updatePostInList = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.postId === updatedPost.postId ? { ...post, ...updatedPost } : post,
      ),
    );
  };

  const updateCommentInList = (updatedComment) => {
    setComments((prevComments) =>
      prevComments.map((comment) =>
        comment.commentId === updatedComment.commentId
          ? { ...comment, ...updatedComment }
          : comment,
      ),
    );
  };

  const removePostFromList = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.postId !== postId));
    setSelectedPostIds((prevIds) => prevIds.filter((id) => id !== postId));
  };

  const removeHashtagFromList = (hashtagId) => {
    setHashtags((prevHashtags) =>
      prevHashtags.filter((hashtag) => hashtag.hashtagId !== hashtagId),
    );
  };

  const getPostActionEndpoint = (postId, actionType) => {
    const endpointMap = {
      hide: { method: "put", url: `/admin/api/content/posts/${postId}/hide` },
      restoreHidden: { method: "put", url: `/admin/api/content/posts/${postId}/visibility/restore` },
      softDelete: { method: "put", url: `/admin/api/content/posts/${postId}/delete` },
      restoreDeleted: { method: "put", url: `/admin/api/content/posts/${postId}/delete/restore` },
      hardDelete: { method: "delete", url: `/admin/api/content/posts/${postId}/delete/permanent` },
    };
    return endpointMap[actionType];
  };

  const requestPostAction = (postId, actionType) => {
    const actionEndpoint = getPostActionEndpoint(postId, actionType);
    if (!actionEndpoint) {
      return Promise.reject(new Error("지원하지 않는 게시글 처리 요청입니다."));
    }
    return axios({
      method: actionEndpoint.method,
      url: `${BACKSERVER}${actionEndpoint.url}`,
      headers: authHeaders,
    });
  };

  const handlePostAction = (post, actionType) => {
    if (!accessToken) return;
    if (actionType === "hardDelete" && !window.confirm("해당 게시글을 완전히 삭제하시겠습니까?")) {
      return;
    }

    setActionLoadingPostId(post.postId);
    requestPostAction(post.postId, actionType)
      .then((res) => {
        if (actionType === "hardDelete") {
          removePostFromList(post.postId);
          return;
        }
        if (res.data?.post) updatePostInList(res.data.post);
        else fetchPosts();
      })
      .catch(() => window.alert("게시글 처리 중 문제가 발생했습니다."))
      .finally(() => setActionLoadingPostId(null));
  };

  const getCommentActionEndpoint = (commentId, actionType) => {
    const endpointMap = {
      hide: { method: "put", url: `/admin/api/content/comments/${commentId}/hide` },
      restore: { method: "put", url: `/admin/api/content/comments/${commentId}/restore` },
      delete: { method: "put", url: `/admin/api/content/comments/${commentId}/delete` },
    };
    return endpointMap[actionType];
  };

  const handleCommentAction = (comment, actionType) => {
    if (!accessToken) return;

    const confirmMessage = {
      hide: "해당 댓글을 숨김 처리하시겠습니까?",
      restore: "해당 댓글을 복구하시겠습니까?",
      delete: "해당 댓글을 삭제 처리하시겠습니까?",
    }[actionType];
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const actionEndpoint = getCommentActionEndpoint(comment.commentId, actionType);
    if (!actionEndpoint) return;

    setActionLoadingCommentId(comment.commentId);
    axios({
      method: actionEndpoint.method,
      url: `${BACKSERVER}${actionEndpoint.url}`,
      headers: authHeaders,
    })
      .then((res) => {
        if (res.data?.comment) updateCommentInList(res.data.comment);
        else fetchComments();
      })
      .catch(() => window.alert("댓글 처리 중 문제가 발생했습니다."))
      .finally(() => setActionLoadingCommentId(null));
  };

  const handleHashtagDelete = (hashtag) => {
    if (!accessToken) return;
    if (!window.confirm(`해시태그 #${hashtag.hashtag}을(를) 삭제하시겠습니까?`)) return;

    setActionLoadingHashtagId(hashtag.hashtagId);
    axios({
      method: "delete",
      url: `${BACKSERVER}/admin/api/content/hashtags/${hashtag.hashtagId}`,
      headers: authHeaders,
    })
      .then(() => removeHashtagFromList(hashtag.hashtagId))
      .catch(() => window.alert("해시태그 삭제 중 문제가 발생했습니다."))
      .finally(() => setActionLoadingHashtagId(null));
  };

  const togglePostSelection = (postId) => {
    setSelectedPostIds((prevIds) =>
      prevIds.includes(postId)
        ? prevIds.filter((id) => id !== postId)
        : [...prevIds, postId],
    );
  };

  const toggleCurrentPageSelection = () => {
    setSelectedPostIds((prevIds) => {
      if (isCurrentPageSelected) {
        return prevIds.filter((postId) => !currentPagePostIds.includes(postId));
      }
      return Array.from(new Set([...prevIds, ...currentPagePostIds]));
    });
  };

  const handleBulkAction = (bulkActionType) => {
    if (!accessToken || selectedPostIds.length === 0) return;

    const confirmMessage = {
      hide: "선택한 게시글을 숨김 처리하시겠습니까?",
      softDelete: "선택한 게시글을 삭제 상태로 전환하시겠습니까?",
      restore: "선택한 게시글을 복구하시겠습니까?",
    }[bulkActionType];
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setBulkActionLoading(true);
    const actionRequests = selectedPostIds.map((postId) => {
      const targetPost = posts.find((post) => post.postId === postId);
      const targetStatus = targetPost ? getPostStatus(targetPost) : "공개";
      if (bulkActionType === "restore") {
        return requestPostAction(
          postId,
          targetStatus === "삭제" ? "restoreDeleted" : "restoreHidden",
        );
      }
      return requestPostAction(postId, bulkActionType);
    });

    Promise.allSettled(actionRequests)
      .then(() => {
        setSelectedPostIds([]);
        fetchPosts();
      })
      .catch(() => window.alert("게시글 일괄 처리 중 문제가 발생했습니다."))
      .finally(() => setBulkActionLoading(false));
  };

  const resetFilters = () => {
    setSearchField("title");
    setSearchKeyword("");
    setActiveStatus("전체");
    setEmotionFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <>
      <ContentManagementToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchField={searchField}
        onSearchFieldChange={setSearchField}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
      />

      <section className={`${styles.contentShell} ${activeTab === "게시글" ? "" : styles.contentShellFull}`}>
        <div className={styles.contentMain}>
          {activeTab === "게시글" && (
            <>
              <ContentManagementControls
                statusFilters={statusFilters}
                activeStatus={activeStatus}
                onStatusChange={setActiveStatus}
                filteredCount={filteredPosts.length}
              />

              <ContentBulkActions
                currentPagePosts={paginatedPosts}
                selectedPostIds={selectedPostIds}
                isCurrentPageSelected={isCurrentPageSelected}
                bulkActionLoading={bulkActionLoading}
                onToggleCurrentPage={toggleCurrentPageSelection}
                onBulkAction={handleBulkAction}
              />

              <ContentPostGrid
                postsLoading={postsLoading}
                postsError={postsError}
                paginatedPosts={paginatedPosts}
                selectedPostIds={selectedPostIds}
                onTogglePostSelection={togglePostSelection}
                getPostStatus={getPostStatus}
                getStatusClassName={getStatusClassName}
                getAuthorName={getAuthorName}
                getAuthorProfileImageSrc={getAuthorProfileImageSrc}
                getEmotionMeta={getEmotionMeta}
                getPostImageInfo={getPostImageInfo}
                stripHtml={stripHtml}
                actionLoadingPostId={actionLoadingPostId}
                onPostAction={handlePostAction}
                onOpenPostDetail={setSelectedDetailPost}
                filteredPostCount={filteredPosts.length}
                currentPage={currentPage}
                totalPageCount={totalPageCount}
                pageNumbers={pageNumbers}
                onPageChange={setCurrentPage}
              />
            </>
          )}

          {activeTab === "댓글" && (
            <>
              <ContentManagementControls
                statusFilters={statusFilters}
                activeStatus={activeCommentStatus}
                onStatusChange={setActiveCommentStatus}
                filteredCount={filteredComments.length}
              />
              <ContentCommentGrid
                commentsLoading={commentsLoading}
                commentsError={commentsError}
                paginatedComments={paginatedComments}
                getAuthorProfileImageSrc={getAuthorProfileImageSrc}
                actionLoadingCommentId={actionLoadingCommentId}
                onCommentAction={handleCommentAction}
                filteredCommentCount={filteredComments.length}
                currentPage={currentPage}
                totalPageCount={totalPageCount}
                pageNumbers={pageNumbers}
                onPageChange={setCurrentPage}
              />
            </>
          )}

          {activeTab === "해시태그" && (
            <>
              <ContentManagementControls
                statusFilters={[]}
                activeStatus=""
                onStatusChange={() => {}}
                filteredCount={filteredHashtags.length}
                sortOptions={hashtagSortOptions}
                activeSort={hashtagSort}
                onSortChange={setHashtagSort}
              />
              <ContentHashtagGrid
                hashtagsLoading={hashtagsLoading}
                hashtagsError={hashtagsError}
                paginatedHashtags={paginatedHashtags}
                actionLoadingHashtagId={actionLoadingHashtagId}
                onHashtagDelete={handleHashtagDelete}
                filteredHashtagCount={filteredHashtags.length}
                currentPage={currentPage}
                totalPageCount={totalPageCount}
                pageNumbers={pageNumbers}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

        {activeTab === "게시글" && (
          <ContentSidePanel
            emotionFilters={emotionFilters}
            emotionFilter={emotionFilter}
            onEmotionFilterChange={setEmotionFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            onResetFilters={resetFilters}
          />
        )}
      </section>

      {selectedDetailPost && (
        <ContentPostDetailModal
          post={selectedDetailPost}
          onClose={() => setSelectedDetailPost(null)}
          getPostStatus={getPostStatus}
          getStatusClassName={getStatusClassName}
          getAuthorName={getAuthorName}
          getEmotionMeta={getEmotionMeta}
          getPostImageInfo={getPostImageInfo}
          stripHtml={stripHtml}
        />
      )}
    </>
  );
}
