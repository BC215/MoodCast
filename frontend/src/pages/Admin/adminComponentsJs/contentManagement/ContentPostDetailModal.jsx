import { useEffect } from "react";
import styles from "../../adminComponentsCss/contentManagement/ContentPostDetailModal.module.css";

function extractPostTags(post) {
  if (typeof post?.tags !== "string") return [];

  return post.tags
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith("#") && tag.length > 1);
}

/* ==========================================================================
 * 콘텐츠 관리 게시글 상세보기 모달
 * --------------------------------------------------------------------------
 * 게시글 카드의 "상세보기" 버튼을 눌렀을 때 게시글 정보를 크게 확인하는
 * 모달 컴포넌트입니다.
 *
 * 초보자 설명:
 * - post는 부모 컴포넌트에서 선택한 게시글 객체입니다.
 * - onClose는 모달을 닫을 때 실행할 함수입니다.
 * - getPostStatus, getAuthorName 같은 함수는 부모가 이미 가지고 있는 계산 로직을
 *   그대로 재사용하기 위해 props로 받습니다.
 * - content는 HTML 문자열일 수 있으므로 바로 화면에 HTML로 넣지 않고,
 *   stripHtml 함수로 태그를 제거한 텍스트만 보여줍니다.
 * ========================================================================== */
export function ContentPostDetailModal({
  post,
  onClose,
  getPostStatus,
  getStatusClassName,
  getAuthorName,
  getEmotionMeta,
  getPostImageInfo,
  stripHtml,
}) {
  const status = getPostStatus(post); // 현재 게시글 상태를 공개/숨김/삭제 중 하나로 계산합니다.
  const emotionMeta = getEmotionMeta(post.emotionId); // 감정 id를 화면 표시용 라벨/색상으로 바꿉니다.
  const EmotionIcon = emotionMeta.icon; // 피드와 같은 감정 아이콘을 상세 모달 감정 배지에 표시합니다.
  const { imageSrc, hasImage } = getPostImageInfo(post); // 카드에서 쓰던 이미지 계산 로직을 상세 모달에서도 재사용합니다.
  const postText = stripHtml(post.content) || "본문 없음"; // HTML 태그를 제거한 안전한 본문 텍스트입니다.
  const postTags = extractPostTags(post);

  useEffect(() => {
    // Esc 키를 누르면 모달을 닫을 수 있게 해 관리자 화면 조작을 편하게 만듭니다.
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.modalLayer} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.modalDim}
        aria-label="게시글 상세보기 닫기"
        onClick={onClose}
      />

      <article className={styles.modalPanel}>
        <header className={styles.modalHead}>
          <div>
            <span className={styles.postId}>#{post.postId}</span>
            <h2>{post.title || "제목 없음"}</h2>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="닫기"
            onClick={onClose}
          >
            닫기
          </button>
        </header>

        <div className={styles.badgeRow}>
          <span className={`${styles.statusBadge} ${getStatusClassName(status)}`}>
            {status}
          </span>
          <span
            className={styles.emotionBadge}
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

        <section className={styles.metaGrid}>
          <div>
            <span>작성자</span>
            <strong>{getAuthorName(post)}</strong>
          </div>
          <div>
            <span>작성일</span>
            <strong>{post.createdAt || "-"}</strong>
          </div>
          <div>
            <span>댓글</span>
            <strong>{Number(post.commentCount || 0).toLocaleString()}개</strong>
          </div>
          <div>
            <span>해시태그</span>
            <strong>{Number(post.hashtagCount || 0).toLocaleString()}개</strong>
          </div>
        </section>

        <section
          className={`${styles.imageBox} ${hasImage ? "" : styles.noImageBox}`}
        >
          <img
            src={imageSrc}
            alt={hasImage ? post.title || getAuthorName(post) : "이미지 없음"}
          />
        </section>

        <section className={styles.contentBox}>
          <h3>본문</h3>
          <p>{postText}</p>
        </section>

        {postTags.length > 0 ? (
          <section className={styles.tagBox}>
            <h3>해시태그</h3>
            <div className={styles.hashtagRow}>
              {postTags.map((tag) => (
                <span className={styles.hashtagChip} key={`${post.postId}-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
