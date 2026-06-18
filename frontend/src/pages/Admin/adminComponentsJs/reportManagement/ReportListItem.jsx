import { REPORT_LABELS, statusMeta } from "./reportConstants";
import { getTypeIcon } from "./reportUtils";
import {
  extractImageUrls,
  normalizeBackendUrl,
  stripHtml,
} from "../../../../shared/lib/postHelpers";
import styles from "../../adminComponentsCss/reportManagement/ReportListItem.module.css";

export function ReportListItem({ report, onOpen }) {
  const Icon = getTypeIcon(report.type);
  const isResolved = report.status === REPORT_LABELS.done;
  const BACKSERVER = import.meta.env.VITE_BACKSERVER || "/api";
  const summaryText = stripHtml(report.detail || report.targetContent || "");
  const firstImageSrc = getFirstReportImageSrc(report, BACKSERVER);

  return (
    <article className={styles.reportItem}>
      <div className={styles.reportThumb + " " + styles["type" + report.type]}>
        {firstImageSrc ? (
          <img src={firstImageSrc} alt={`${report.title} 썸네일`} loading="lazy" />
        ) : (
          <Icon />
        )}
        <span>{report.type}</span>
      </div>
      <div className={styles.reportSummary}>
        <h3>{report.title}</h3>
        <p>
          {"\uC2E0\uACE0 \uB300\uC0C1"} <strong>{report.targetName}</strong>
          <span>{"\u00B7"}</span>
          {report.reportedAgo}
        </p>
        <p>
          {"\uC2E0\uACE0 \uC0AC\uC720"} <strong>{report.reason}</strong>
        </p>
        <p className={styles.ellipsis}>{summaryText || "-"}</p>
      </div>
      <div className={styles.reportMeta}>
        <span
          className={
            styles.statusBadge +
            " " +
            styles[statusMeta[report.status]?.className || "resolved"]
          }
        >
          {report.status}
        </span>
        <strong>
          {"\uC2E0\uACE0"} <b>{report.reportCount}{"\uAC74"}</b>
        </strong>
      </div>
      <div className={styles.reportAction}>
        <strong>#{report.id}</strong>
        <button type="button" onClick={() => onOpen(report)}>
          {isResolved
            ? "\uCC98\uB9AC \uACB0\uACFC"
            : "\uAC80\uD1A0\uD558\uAE30"}
        </button>
      </div>
    </article>
  );
}

function getFirstReportImageSrc(report, backserver) {
  const imageCandidates = [
    ...extractImageUrls(report?.detail || ""),
    ...extractImageUrls(report?.targetContent || ""),
  ];

  const firstImage = imageCandidates.find(Boolean);
  return firstImage ? normalizeBackendUrl(firstImage, backserver, "post-images") : "";
}
