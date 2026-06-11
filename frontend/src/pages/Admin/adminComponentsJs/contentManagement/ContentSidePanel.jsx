import styles from "../../adminComponentsCss/contentManagement/ContentSidePanel.module.css";

/* ==========================================================================
 * 콘텐츠 관리 사이드 패널 컴포넌트
 * --------------------------------------------------------------------------
 * 게시글 관리 안내와 감정/기간 필터를 담당합니다.
 *
 * 초보자 설명:
 * - emotionFilter는 선택된 감정 필터입니다.
 * - startDate/endDate는 게시글 작성일 기준 기간 필터입니다.
 * - 복수 관리 버튼은 상단 목록 영역에 있으므로 이 패널에서는 제거했습니다.
 * ========================================================================== */
export function ContentSidePanel({
  emotionFilters,
  emotionFilter,
  onEmotionFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilters,
}) {
  return (
    <aside className={styles.sideRail}>
      <section className={styles.summaryPanel}>
        <h2>게시글 관리 안내</h2>
        <p>
          공개 게시글은 숨김 또는 삭제 상태로 전환할 수 있습니다. 삭제 탭에
          들어간 게시글은 복구하거나 완전 삭제할 수 있습니다.
        </p>
      </section>

      <section className={styles.filterPanel}>
        <div className={styles.panelTitleRow}>
          <h2>필터</h2>
          <span>감정/기간</span>
        </div>

        <label>
          감정
          <select
            value={emotionFilter}
            onChange={(event) => onEmotionFilterChange(event.target.value)}
          >
            {emotionFilters.map((emotionItem) => (
              <option key={emotionItem.value} value={emotionItem.value}>
                {emotionItem.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          시작일
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </label>

        <label>
          종료일
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </label>

        <button type="button" onClick={onResetFilters}>
          필터 초기화
        </button>
      </section>
    </aside>
  );
}
