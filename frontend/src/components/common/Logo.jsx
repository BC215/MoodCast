import { NavLink } from 'react-router-dom';
import styles from './Logo.module.css';

// MoodCast 로고 컴포넌트입니다.
// 로고를 누르면 항상 피드 홈으로 이동합니다.
export function Logo({ compact = false, to = '/app/feed' }) {
  return (
    <NavLink to={to} className={`${styles.brand} ${compact ? styles.compact : ''}`}>
      <img className={`${styles.image} ${compact ? styles.imageCompact : ''}`} src="/MoodCast-logo.svg" alt="MoodCast" />
      {!compact ? (
        <div className={styles.text}>
          <strong>MoodCast</strong>
          <p>감정을 공유하는 감성 SNS</p>
        </div>
      ) : null}
    </NavLink>
  );
}
