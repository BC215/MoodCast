import styles from "../../adminComponentsCss/contentManagement/ContentCommentGrid.module.css";
import { defaultAvatarSrc } from "../../../../shared/lib/defaultAvatar";

/**
 * 콘텐츠 관리 > 댓글 탭 목록 컴포넌트입니다.
 * 댓글 카드 출력, 상태 뱃지, 관리 버튼(숨김/복구/삭제), 페이지네이션을 담당합니다.
 */
export function ContentCommentGrid({
  commentsLoading,
  commentsError,
  paginatedComments,
  getAuthorProfileImageSrc,
  actionLoadingCommentId,
  onCommentAction,
  filteredCommentCount,
  currentPage,
  totalPageCount,
  pageNumbers,
  onPageChange,
}) {
  const getAuthorName = (comment) =>
    comment.authorNickname || comment.authorName || "작성자 없음";

  return (
    <>
      <section className={styles.simpleList}>
        {commentsLoading ? (
          <div className={styles.emptyFeed}>
            <strong>댓글을 불러오는 중입니다.</strong>
            <span>잠시만 기다려주세요.</span>
          </div>
        ) : commentsError ? (
          <div className={styles.emptyFeed}>
            <strong>댓글 조회 실패</strong>
            <span>댓글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
          </div>
        ) : paginatedComments.length === 0 ? (
          <div className={styles.emptyFeed}>
            <strong>댓글 없음</strong>
            <span>검색어를 바꾸거나 다른 탭을 확인해주세요.</span>
          </div>
        ) : (
          paginatedComments.map((comment) => {
            const isDeleted = comment.deletedYn === "Y";
            const isHidden = comment.moderationStatus === "HIDDEN";
            const isActionLoading = actionLoadingCommentId === comment.commentId;

            return (
              <article className={styles.simpleCard} key={comment.commentId}>
                <div className={styles.simpleCardHeader}>
                  <strong>댓글 #{comment.commentId}</strong>
                  <span
                    className={`${styles.statusBadge} ${
                      isDeleted
                        ? styles.statusDeleted
                        : isHidden
                          ? styles.statusHidden
                          : styles.statusPublic
                    }`}
                  >
                    {isDeleted ? "삭제" : isHidden ? "숨김" : "표시"}
                  </span>
                </div>

                <p className={styles.simpleContent}>
                  {comment.content || "댓글 내용 없음"}
                </p>

                <div className={styles.commentAuthorRow}>
                  <span className={styles.commentAvatar}>
                    <img
                      src={getAuthorProfileImageSrc(comment)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = defaultAvatarSrc;
                      }}
                    />
                  </span>
                  <div>
                    <span>작성자</span>
                    <strong>{getAuthorName(comment)}</strong>
                  </div>
                </div>

                <dl className={styles.simpleMetaList}>
                  <div>
                    <dt>게시글</dt>
                    <dd>{comment.postTitle || "제목 없음"}</dd>
                  </div>
                  <div>
                    <dt>작성일</dt>
                    <dd>{comment.createdAt || "-"}</dd>
                  </div>
                  <div>
                    <dt>댓글 유형</dt>
                    <dd>{comment.parentId ? "답글" : "원댓글"}</dd>
                  </div>
                </dl>

                <div className={styles.cardActions}>
                  {isDeleted || isHidden ? (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => onCommentAction(comment, "restore")}
                    >
                      복구
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => onCommentAction(comment, "hide")}
                    >
                      숨김
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isActionLoading || isDeleted}
                    onClick={() => onCommentAction(comment, "delete")}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {filteredCommentCount > 0 && (
        <nav className={styles.pagination} aria-label="댓글 페이지 이동">
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
              onClick={() => onPageChange(Math.min(totalPageCount, currentPage + 1))}
            >
              다음
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
