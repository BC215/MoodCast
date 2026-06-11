import { SearchBar } from "../common/SearchBar";
import { SegmentedControl } from "../common/SegmentedControl";
import styles from "../../adminComponentsCss/contentManagement/ContentManagementToolbar.module.css";

/* ==========================================================================
 * 콘텐츠 관리 상단 검색/탭 컴포넌트
 * --------------------------------------------------------------------------
 * 게시글/댓글/해시태그 탭과 제목/작성자 검색 UI를 담당합니다.
 *
 * 초보자 설명:
 * - activeTab은 현재 선택된 콘텐츠 종류입니다.
 * - searchField는 제목(title)과 작성자(author) 중 어떤 기준으로 검색할지 정합니다.
 * - searchKeyword는 실제 검색어입니다.
 * ========================================================================== */
export function ContentManagementToolbar({
  activeTab,
  onTabChange,
  searchField,
  onSearchFieldChange,
  searchKeyword,
  onSearchKeywordChange,
}) {
  const searchOptions = {
    게시글: [
      { value: "title", label: "제목" },
      { value: "author", label: "작성자" },
    ],
    댓글: [
      { value: "content", label: "댓글" },
      { value: "author", label: "작성자" },
      { value: "postTitle", label: "게시글" },
    ],
    해시태그: [{ value: "hashtag", label: "해시태그" }],
  };
  const currentSearchOptions = searchOptions[activeTab] || searchOptions.게시글;
  const selectedSearchOption =
    currentSearchOptions.find((option) => option.value === searchField) ||
    currentSearchOptions[0];
  const searchParticle =
    ["title", "content", "postTitle"].includes(selectedSearchOption.value)
      ? "으로"
      : "로";
  const searchPlaceholder = `${selectedSearchOption.label}${searchParticle} 검색`;

  return (
    <section className={styles.topBar}>
      <SegmentedControl
        labels={["게시글", "댓글", "해시태그"]}
        selectedLabel={activeTab}
        onSelect={onTabChange}
      />

      <div className={styles.searchControls}>
        <select
          value={searchField}
          onChange={(event) => onSearchFieldChange(event.target.value)}
          aria-label={`${activeTab} 검색 기준`}
        >
          {currentSearchOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <SearchBar
          placeholder={searchPlaceholder}
          value={searchKeyword}
          onChange={(event) => onSearchKeywordChange(event.target.value)}
        />
      </div>
    </section>
  );
}
