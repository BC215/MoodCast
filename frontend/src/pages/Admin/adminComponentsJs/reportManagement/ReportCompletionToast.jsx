import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DoneOutlinedIcon from "@mui/icons-material/DoneOutlined";
import styles from "../../adminComponentsCss/reportManagement/ReportCompletionToast.module.css";

export function ReportCompletionToast({ message, onClose }) {
  return (
    <section
      className={styles.completionToast}
      role="status"
      aria-live="polite"
    >
      <DoneOutlinedIcon />
      <p>{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="\uCC98\uB9AC \uC644\uB8CC \uC548\uB0B4 \uB2EB\uAE30"
      >
        <CloseOutlinedIcon />
      </button>
    </section>
  );
}
