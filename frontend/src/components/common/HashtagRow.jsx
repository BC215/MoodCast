import { useNavigate } from 'react-router-dom';
import styles from './HashtagRow.module.css';

/**
 * SNS 스타일 해시태그 뱃지 목록
 * @param {string} tags - "#태그1 #태그2 ..." 형태의 문자열
 * @param {'feed'|'modal'|'detail'} variant - 크기/색상 변형
 */
export function HashtagRow({ tags, variant = 'feed' }) {
  const navigate = useNavigate();

  if (!tags || !tags.trim()) return null;

  const tagList = tags
    .trim()
    .split(/\s+/)
    .filter((t) => t.startsWith('#') && t.length > 1);

  if (tagList.length === 0) return null;

  const handleClick = (e, tag) => {
    e.stopPropagation();
    // #제거하여 검색
    const keyword = tag.replace(/^#/, '');
    navigate(`/app/search?q=${encodeURIComponent(keyword)}&tab=hashtags`);
  };

  return (
    <div className={`${styles.row} ${styles[variant] ?? ''}`}>
      {tagList.map((tag, i) => (
        <button
          key={i}
          type="button"
          className={styles.tag}
          onClick={(e) => handleClick(e, tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
