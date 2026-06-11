import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./DeleteConfirmModal.module.css";

export function DeleteConfirmModal({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        </header>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            삭제하기
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
