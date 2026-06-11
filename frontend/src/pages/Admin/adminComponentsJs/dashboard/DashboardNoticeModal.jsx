import { useEffect, useState } from "react";
import { useAuthStore } from "../../../../stores/useAuthStore";
import {
  fetchLatestNotice,
  formatCategoryTag,
  NOTICE_CATEGORY,
} from "../noticeManagement/noticeStorage";
import styles from "../../adminComponentsCss/dashboard/DashboardNoticeModal.module.css";

const getDismissKey = (notice) =>
  `moodcast_notice_dismiss_${notice.id}_${notice.version ?? 1}`;

export function DashboardNoticeModal() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [latestNotice, setLatestNotice] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [skipNotice, setSkipNotice] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setLatestNotice(null);
      setIsOpen(false);
      return;
    }

    fetchLatestNotice(accessToken)
      .then((notice) => {
        setLatestNotice(notice);

        if (!notice) {
          setIsOpen(false);
          return;
        }

        const dismissed = window.localStorage.getItem(getDismissKey(notice));
        setIsOpen(!dismissed);
        setSkipNotice(false);
      })
      .catch(() => {
        setLatestNotice(null);
        setIsOpen(false);
      });
  }, [accessToken]);

  useEffect(() => {
    if (!latestNotice || !isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [latestNotice, isOpen]);

  if (!latestNotice || !isOpen) {
    return null;
  }

  const handleClose = () => {
    if (skipNotice) {
      window.localStorage.setItem(getDismissKey(latestNotice), "true");
    }
    setIsOpen(false);
  };

  const categoryClassMap = {
    [NOTICE_CATEGORY.GENERAL]: styles.categoryGeneral,
    [NOTICE_CATEGORY.UPDATE]: styles.categoryUpdate,
    [NOTICE_CATEGORY.URGENT]: styles.categoryUrgent,
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={handleClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2>공지사항</h2>
            <p>서비스 이용에 필요한 안내사항입니다.</p>
          </div>
          <button type="button" onClick={handleClose} aria-label="공지 닫기">
            ×
          </button>
        </header>

        <div className={styles.contentWrap}>
          <span
            className={`${styles.categoryBadge} ${categoryClassMap[latestNotice.category] || ""}`}
          >
            {formatCategoryTag(latestNotice.category)}
          </span>
          <h3 id="dashboard-notice-title">{latestNotice.title}</h3>
          <div
            className={`${styles.contentText} ${
              latestNotice.alignCenter ? styles.contentTextCenter : ""
            }`}
            dangerouslySetInnerHTML={{ __html: latestNotice.content }}
          />
        </div>

        <footer className={styles.footer}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={skipNotice}
              onChange={(event) => setSkipNotice(event.target.checked)}
            />
            이 창을 보지 않기
          </label>
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
          >
            닫기
          </button>
        </footer>
      </section>
    </div>
  );
}
