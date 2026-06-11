import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import styles from "./ReportModal.module.css";

const REPORT_REASONS = [
  "스팸 또는 광고",
  "욕설 또는 비방",
  "음란물 또는 성적인 콘텐츠",
  "사기 또는 거짓 정보",
  "자해 또는 자살 관련 콘텐츠",
  "지적 재산권 침해",
  "기타",
];

export function ReportModal({ open, onClose, onSubmit, targetType }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setSelectedReason("");
      setCustomReason("");
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const reason =
      selectedReason === "기타" ? customReason.trim() : selectedReason;
    if (!reason) {
      alert("신고 사유를 선택하거나 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ reason });
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetLabel = targetType === "post" ? "게시물" : "댓글";

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <strong>{targetLabel} 신고하기</strong>
            <p>신고 사유를 선택해주세요. 신고 내용은 관리자에게 전달됩니다.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.reasonList}>
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason}
                className={`${styles.reasonItem} ${selectedReason === reason ? styles.selected : ""}`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
                {reason}
              </label>
            ))}
          </div>

          {selectedReason === "기타" && (
            <div className={styles.customReasonSection}>
              <label htmlFor="custom-reason">상세 사유를 입력해주세요.</label>
              <textarea
                id="custom-reason"
                className={styles.customReasonTextarea}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="신고 사유를 구체적으로 작성해주시면 처리에 도움이 됩니다. (최대 200자)"
                maxLength={200}
                rows={4}
                required
              />
              <small className={styles.charCounter}>
                {customReason.length} / 200
              </small>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={
              isSubmitting ||
              !selectedReason ||
              (selectedReason === "기타" && !customReason.trim())
            }
          >
            {isSubmitting ? "신고 중..." : "신고하기"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
