import styles from "../../adminComponentsCss/contentManagement/ContentPostGrid.module.css";
import { defaultAvatarSrc } from "../../../../shared/lib/defaultAvatar";

function extractPostTags(post) {
  if (typeof post?.tags !== "string") return [];

  return post.tags
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith("#") && tag.length > 1);
}

/* ==========================================================================
 * 콘텐츠 관리 게시글 그리드 컴포넌트
 * --------------------------------------------------------------------------
 * 게시글 카드 목록, 카드 선택 체크박스, 카드별 처리 버튼, 페이지네이션을 담당합니다.
 *
 * 초보자 설명:
 * - paginatedPosts는 현재 페이지에 보여줄 게시글만 담긴 배열입니다.
 * - selectedPostIds에 postId가 들어 있으면 체크된 카드로 표시합니다.
 * - onPostAction은 숨김/삭제/복구 같은 실제 API 처리를 부모 컴포넌트에 요청합니다.
 * ========================================================================== */
export function ContentPostGrid({
  postsLoading,
  postsError,
  paginatedPosts,
  selectedPostIds,
  onTogglePostSelection,
  getPostStatus,
  getStatusClassName,
  getAuthorName,
  getAuthorProfileImageSrc,
  getEmotionMeta,
  getPostImageInfo,
  stripHtml,
  actionLoadingPostId,
  onPostAction,
  onOpenPostDetail,
  filteredPostCount,
  currentPage,
  totalPageCount,
  pageNumbers,
  onPageChange,
}) {
  const renderActionButtons = (post, status) => {
    const isActionLoading = actionLoadingPostId === post.postId;

    if (status === "삭제") {
      return (
        <div className={styles.cardActions}>
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => onPostAction(post, "restoreDeleted")}
          >
            복구
          </button>
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => onPostAction(post, "hardDelete")}
          >
            완전 삭제
          </button>
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => onOpenPostDetail(post)}
          >
            상세보기
          </button>
        </div>
      );
    }

    return (
      <div className={styles.cardActions}>
        {status === "숨김" ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => onPostAction(post, "restoreHidden")}
          >
            복구
          </button>
        ) : (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => onPostAction(post, "hide")}
          >
            숨김
          </button>
        )}
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => onPostAction(post, "softDelete")}
        >
          삭제
        </button>
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => onOpenPostDetail(post)}
        >
          상세보기
        </button>
      </div>
    );
  };

  const renderPostCard = (post) => {
    const status = getPostStatus(post);
    const { imageSrc, hasImage } = getPostImageInfo(post);
    const cardText = stripHtml(post.content) || "본문 없음";
    const emotionMeta = getEmotionMeta(post.emotionId);
    const EmotionIcon = emotionMeta.icon;
    const isSelected = selectedPostIds.includes(post.postId);
    const postTags = extractPostTags(post);

    return (
      <article
        className={`${styles.contentCard} ${isSelected ? styles.selectedCard : ""}`}
        key={post.postId}
      >
        <div className={styles.cardTopRow}>
          <label className={styles.cardSelectLabel}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onTogglePostSelection(post.postId)}
            />
            <span>선택</span>
          </label>
          <span className={styles.postId}>#{post.postId}</span>
          <b className={`${styles.statusBadge} ${getStatusClassName(status)}`}>
            {status}
          </b>
        </div>

        <div
          className={`${styles.adminPostImageWrap} ${
            hasImage ? "" : styles.noImageWrap
          }`}
        >
          <img
            className={styles.adminPostImage}
            src={imageSrc}
            alt={hasImage ? post.title || getAuthorName(post) : "이미지 없음"}
          />
        </div>

        <div className={styles.feedBody}>
          <div className={styles.authorRow}>
            <div className={styles.avatar}>
              <img
                src={getAuthorProfileImageSrc(post)}
                alt=""
                onError={(event) => {
                  event.currentTarget.src = defaultAvatarSrc;
                }}
              />
            </div>
            <div>
              <strong>{getAuthorName(post)}</strong>
              <span>{post.createdAt || "작성일 없음"}</span>
            </div>
          </div>

          <div className={styles.titleWithEmotion}>
            <h3>{post.title || "제목 없음"}</h3>
            <span
              className={styles.emotionTag}
              style={{
                color: emotionMeta.color,
                backgroundColor: `${emotionMeta.color}18`,
                borderColor: emotionMeta.color,
              }}
            >
              <EmotionIcon className={styles.emotionIcon} />
              {emotionMeta.label}
            </span>
          </div>

          <p>{cardText}</p>

          {postTags.length > 0 ? (
            <div className={styles.hashtagRow} aria-label="게시글 해시태그">
              {postTags.map((tag) => (
                <span className={styles.hashtagChip} key={`${post.postId}-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.statRow}>
          <span>댓글 {post.commentCount ?? 0}</span>
          <span>해시태그 {post.hashtagCount ?? 0}</span>
        </div>

        {renderActionButtons(post, status)}
      </article>
    );
  };

  return (
    <>
      <section className={styles.feedList}>
        {postsLoading ? (
          <div className={styles.emptyFeed}>
            <strong>게시글을 불러오는 중입니다.</strong>
            <span>잠시만 기다려주세요.</span>
          </div>
        ) : postsError ? (
          <div className={styles.emptyFeed}>
            <strong>게시글 조회 실패</strong>
            <span>게시글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
          </div>
        ) : paginatedPosts.length === 0 ? (
          <div className={styles.emptyFeed}>
            <strong>게시글 없음</strong>
            <span>검색 조건 또는 필터를 변경해보세요.</span>
          </div>
        ) : (
          paginatedPosts.map(renderPostCard)
        )}
      </section>

      {filteredPostCount > 0 && (
        <nav className={styles.pagination} aria-label="게시글 페이지 이동">
          <div className={styles.paginationButtons}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            >
              이전
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === currentPage ? styles.activePage : ""}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPageCount}
              onClick={() =>
                onPageChange(Math.min(totalPageCount, currentPage + 1))
              }
            >
              다음
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
