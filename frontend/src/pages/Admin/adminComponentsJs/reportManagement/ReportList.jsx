import { ReportListItem } from "./ReportListItem";
import styles from "../../adminComponentsCss/reportManagement/ReportList.module.css";

export function ReportList({ reports, onOpenReport }) {
  if (reports.length === 0) {
    return (
      <div className={styles.emptyReportList}>
        <strong>{"\uC2E0\uACE0 \uB370\uC774\uD130 \uC5C6\uC74C"}</strong>
        <span>
          {
            "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC2E0\uACE0 \uBAA9\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
          }
        </span>
      </div>
    );
  }

  return (
    <div className={styles.reportList}>
      {reports.map((report) => (
        <ReportListItem key={report.id} report={report} onOpen={onOpenReport} />
      ))}
    </div>
  );
}
