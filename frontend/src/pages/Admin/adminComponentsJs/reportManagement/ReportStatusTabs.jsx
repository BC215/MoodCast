import { REPORT_LABELS, statusMeta } from "./reportConstants";
import styles from "../../adminComponentsCss/reportManagement/ReportStatusTabs.module.css";

export function ReportStatusTabs({ tabs, selectedTab, counts, onSelect }) {
  return (
    <div
      className={styles.statusTabs}
      aria-label="\uC2E0\uACE0 \uCC98\uB9AC \uC0C1\uD0DC \uD544\uD130"
    >
      {tabs.map((label) => (
        <button
          key={label}
          className={selectedTab === label ? styles.activeStatusTab : ""}
          type="button"
          onClick={() => onSelect(label)}
        >
          <span>{label}</span>
          <strong
            className={
              label === REPORT_LABELS.all
                ? styles.totalCount
                : styles[statusMeta[label]?.className || "resolved"]
            }
          >
            {counts[label] ?? 0}
          </strong>
        </button>
      ))}
    </div>
  );
}
