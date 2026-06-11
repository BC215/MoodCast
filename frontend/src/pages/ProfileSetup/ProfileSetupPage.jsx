import { DesktopShell } from '../../components/layout/DesktopShell';
import { MobileShell } from '../../components/layout/MobileShell';
import { interestTags } from '../../data/moodcastData';
import { useState } from 'react';
import { useIsDesktop } from '../../hooks/useViewportWidth';
import styles from './ProfileSetupPage.module.css';

export function ProfileSetupPage() {
  // 프로필 설정 화면에서는 관심사 태그를 최대 3개까지 선택할 수 있습니다.
  const [selected, setSelected] = useState(['감성']);
  const desktop = useIsDesktop();

  const toggle = (tag) => {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : prev.length >= 3 ? prev : [...prev, tag]));
  };

  const content = (
    <section className={styles.wrap}>
      <div className={styles.hero}>
        <strong>프로필 설정</strong>
        <p>닉네임과 관심사를 설정해서 MoodCast를 시작해보세요.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.avatar} />
        <div className={styles.line}>Lena_Parks <b>수정</b></div>
        <div className={styles.grid}>
          {interestTags.map((tag) => (
            <button key={tag} type="button" className={selected.includes(tag) ? styles.active : ''} onClick={() => toggle(tag)}>
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  if (!desktop) return <MobileShell title="프로필 설정" hideSearch>{content}</MobileShell>;
  return <DesktopShell>{content}</DesktopShell>;
}
