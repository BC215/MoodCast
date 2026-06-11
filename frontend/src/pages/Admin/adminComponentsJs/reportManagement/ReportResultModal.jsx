import { useEffect } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { statusMeta } from "./reportConstants";
import styles from "../../adminComponentsCss/reportManagement/ReportResultModal.module.css";

export function ReportResultModal({ report, onClose }) {
  const result = report.sanctionResult;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div
      className={styles.resultOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="\uC2E0\uACE0 \uCC98\uB9AC \uACB0\uACFC \uC870\uD68C"
    >
      <button
        className={styles.resultDimmedArea}
        type="button"
        aria-label="\uCC98\uB9AC \uACB0\uACFC \uD31D\uC5C5 \uB2EB\uAE30"
        onClick={onClose}
      />

      <section className={styles.resultModal}>
        <header className={styles.resultHeader}>
          <div>
            <span
              className={`${styles.statusBadge} ${styles[statusMeta[report.status]?.className || "resolved"]}`}
            >
              {report.status}
            </span>
            <h2>{"\uC2E0\uACE0 \uCC98\uB9AC \uACB0\uACFC"}</h2>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="\uCC98\uB9AC \uACB0\uACFC \uD31D\uC5C5 \uB2EB\uAE30"
            onClick={onClose}
          >
            <CloseOutlinedIcon />
          </button>
        </header>

        <section className={styles.confirmTarget}>
          <div className={styles.profileThumb}>
            <PersonOutlineOutlinedIcon />
          </div>
          <div>
            <strong>{report.targetName}</strong>
            <span>{report.targetHandle}</span>
          </div>
          <dl>
            <div>
              <dt>{"\uC2E0\uACE0 \uBC88\uD638"}</dt>
              <dd>#{report.id}</dd>
            </div>
            <div>
              <dt>{"\uC2E0\uACE0 \uC218"}</dt>
              <dd>{report.reportCount}{"\uAC74"}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.confirmTable}>
          <h3>{"\uCC98\uB9AC \uB0B4\uC6A9"}</h3>
          <dl>
            <div>
              <dt>{"\uCC98\uB9AC \uC720\uD615"}</dt>
              <dd>{result?.actionLabel || report.status}</dd>
            </div>
            <div>
              <dt>{"\uCC98\uB9AC \uC0AC\uC720"}</dt>
              <dd>{result?.reason || report.reason}</dd>
            </div>
            <div>
              <dt>{"\uC0C1\uC138 \uC124\uBA85"}</dt>
              <dd>{result?.detail || report.detail}</dd>
            </div>
            <div>
              <dt>{"\uCC98\uB9AC \uAD00\uB9AC\uC790"}</dt>
              <dd>{result?.adminName || "\uAD00\uB9AC\uC790"}</dd>
            </div>
            <div>
              <dt>{"\uCC98\uB9AC \uC2DC\uAC04"}</dt>
              <dd>{result?.handledAt || "-"}</dd>
            </div>
          </dl>
        </section>

        <footer className={styles.resultFooter}>
          <button className={styles.primaryButton} type="button" onClick={onClose}>
            {"\uD655\uC778"}
          </button>
        </footer>
      </section>
    </div>
  );
}
