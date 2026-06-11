import styles from "../../adminComponentsCss/contentManagement/ContentManagementControls.module.css";

/* ==========================================================================
 * 콘텐츠 관리 상태 필터 컴포넌트
 * --------------------------------------------------------------------------
 * 공개/숨김/삭제 상태 필터와 현재 필터 결과 수를 보여줍니다.
 * 감정 필터는 오른쪽 사이드 패널에서 관리합니다.
 * ========================================================================== */
export function ContentManagementControls({
  statusFilters,
  activeStatus,
  onStatusChange,
  filteredCount,
  resultLabel = "검색 결과",
  sortOptions = [],
  activeSort = "",
  onSortChange,
}) {
  return (
    <section className={styles.statusToolbar}>
      <div className={styles.statusPills}>
        {statusFilters.map((statusItem) => (
          <button
            key={statusItem}
            type="button"
            className={activeStatus === statusItem ? styles.activeStatus : ""}
            onClick={() => onStatusChange(statusItem)}
          >
            {statusItem}
          </button>
        ))}
      </div>

      <div className={styles.viewTools}>
        {sortOptions.length > 0 && (
          <select
            className={styles.sortSelect}
            value={activeSort}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="정렬 기준"
          >
            {sortOptions.map((sortOption) => (
              <option key={sortOption.value} value={sortOption.value}>
                {sortOption.label}
              </option>
            ))}
          </select>
        )}
        <span>{resultLabel} {Number(filteredCount || 0).toLocaleString()}개</span>
      </div>
    </section>
  );
}
