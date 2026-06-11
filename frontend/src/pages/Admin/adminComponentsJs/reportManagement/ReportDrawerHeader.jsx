import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import styles from "../../adminComponentsCss/reportManagement/ReportDrawerHeader.module.css";

export function DrawerHeader({ title, onBack, onClose }) {
  return (
    <header className={styles.drawerHeader}>
      {onBack ? (
        <button
          className={styles.iconButton}
          type="button"
          aria-label="\uC774\uC804 \uB2E8\uACC4"
          onClick={onBack}
        >
          <ArrowBackOutlinedIcon />
        </button>
      ) : (
        <span className={styles.headerSpacer} />
      )}
      <h2>{title}</h2>
      <button
        className={styles.iconButton}
        type="button"
        aria-label="\uD328\uB110 \uB2EB\uAE30"
        onClick={onClose}
      >
        <CloseOutlinedIcon />
      </button>
    </header>
  );
}
