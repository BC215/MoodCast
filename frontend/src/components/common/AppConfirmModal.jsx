import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./AppConfirmModal.module.css";

const AppConfirmModal = ({
  open,
  title,
  description,
  cancelText = "취소",
  confirmText = "확인",
  confirmOnly = false,
  confirmDisabled = false,
  cancelDisabled = false,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !confirmOnly) {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmOnly, onCancel, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={confirmOnly ? undefined : onCancel}
      role="presentation"
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appConfirmTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.icon}>!</div>
        <strong id="appConfirmTitle">{title}</strong>
        <p>{description}</p>

        <div className={confirmOnly ? styles.singleAction : styles.actions}>
          {!confirmOnly ? (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={cancelDisabled}
            >
              {cancelText}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default AppConfirmModal;
