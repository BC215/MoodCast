import styles from "../../adminComponentsCss/contentManagement/ContentBulkActions.module.css";

/* ==========================================================================
 * 게시글 선택/일괄 처리 컴포넌트
 * --------------------------------------------------------------------------
 * 현재 페이지 게시글 전체 선택과 선택된 게시글의 숨김/삭제/복구 처리를 담당합니다.
 *
 * 초보자 설명:
 * - checked는 현재 페이지의 게시글이 모두 선택됐는지 보여줍니다.
 * - disabled는 처리할 게시글이 없거나 API 호출 중일 때 버튼을 막는 값입니다.
 * - 버튼 이름에서 "다중"이라는 단어는 제거하고 실제 동작만 짧게 표시합니다.
 * ========================================================================== */
export function ContentBulkActions({
  currentPagePosts,
  selectedPostIds,
  isCurrentPageSelected,
  bulkActionLoading,
  onToggleCurrentPage,
  onBulkAction,
}) {
  const hasSelectedPost = selectedPostIds.length > 0;
  const hasCurrentPagePost = currentPagePosts.length > 0;

  return (
    <section className={styles.bulkActionBar}>
      <label className={styles.selectAllLabel}>
        <input
          type="checkbox"
          checked={isCurrentPageSelected}
          disabled={!hasCurrentPagePost}
          onChange={onToggleCurrentPage}
        />
        <span>현재 페이지 선택</span>
      </label>

      <div className={styles.bulkActions}>
        <span>선택 {selectedPostIds.length.toLocaleString()}개</span>
        <button
          type="button"
          disabled={!hasSelectedPost || bulkActionLoading}
          onClick={() => onBulkAction("hide")}
        >
          숨김
        </button>
        <button
          type="button"
          disabled={!hasSelectedPost || bulkActionLoading}
          onClick={() => onBulkAction("softDelete")}
        >
          삭제
        </button>
        <button
          type="button"
          disabled={!hasSelectedPost || bulkActionLoading}
          onClick={() => onBulkAction("restore")}
        >
          복구
        </button>
      </div>
    </section>
  );
}
