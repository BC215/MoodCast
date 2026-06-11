import styles from "../../adminComponentsCss/contentManagement/ContentHashtagGrid.module.css";

/**
 * 콘텐츠 관리 > 해시태그 탭 목록 컴포넌트입니다.
 * 해시태그 카드 출력과 단순 삭제 버튼(하드 삭제), 페이지네이션을 담당합니다.
 */
export function ContentHashtagGrid({
  hashtagsLoading,
  hashtagsError,
  paginatedHashtags,
  actionLoadingHashtagId,
  onHashtagDelete,
  filteredHashtagCount,
  currentPage,
  totalPageCount,
  pageNumbers,
  onPageChange,
}) {
  return (
    <>
      <section className={styles.simpleList}>
        {hashtagsLoading ? (
          <div className={styles.emptyFeed}>
            <strong>해시태그를 불러오는 중입니다.</strong>
            <span>잠시만 기다려주세요.</span>
          </div>
        ) : hashtagsError ? (
          <div className={styles.emptyFeed}>
            <strong>해시태그 조회 실패</strong>
            <span>해시태그 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
          </div>
        ) : paginatedHashtags.length === 0 ? (
          <div className={styles.emptyFeed}>
            <strong>해시태그 없음</strong>
            <span>검색어를 바꾸거나 다른 탭을 확인해주세요.</span>
          </div>
        ) : (
          paginatedHashtags.map((hashtag) => {
            const isDeleting = actionLoadingHashtagId === hashtag.hashtagId;

            return (
              <article className={styles.simpleCard} key={hashtag.hashtagId}>
                <div className={styles.simpleCardHeader}>
                  <strong>#{hashtag.hashtag}</strong>
                  <span className={`${styles.statusBadge} ${styles.statusPublic}`}>
                    사용 중
                  </span>
                </div>

                <dl className={styles.simpleMetaList}>
                  <div>
                    <dt>연결 게시글</dt>
                    <dd>{Number(hashtag.postCount || 0).toLocaleString()}개</dd>
                  </div>
                  <div>
                    <dt>누적 사용</dt>
                    <dd>{Number(hashtag.useCount || 0).toLocaleString()}회</dd>
                  </div>
                  <div>
                    <dt>최근 사용일</dt>
                    <dd>{hashtag.latestPostCreatedAt || "-"}</dd>
                  </div>
                </dl>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => onHashtagDelete(hashtag)}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {filteredHashtagCount > 0 && (
        <nav className={styles.pagination} aria-label="해시태그 페이지 이동">
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
