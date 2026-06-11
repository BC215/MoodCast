import { typeMeta } from "./reportConstants";
import styles from "../../adminComponentsCss/reportManagement/ReportTypeTabs.module.css";

export function ReportTypeTabs({ tabs, selectedTab, counts, onSelect }) {
  return (
    <div
      className={styles.typeTabs}
      aria-label="\uC2E0\uACE0 \uB300\uC0C1 \uC720\uD615 \uD544\uD130"
    >
      {tabs.map((label) => {
        const Icon = typeMeta[label]?.icon;

        return (
          <button
            key={label}
            className={selectedTab === label ? styles.activeTypeTab : ""}
            type="button"
            onClick={() => onSelect(label)}
          >
            {Icon && <Icon />}
            <span>{label}</span>
            <strong>{counts[label] ?? 0}</strong>
          </button>
        );
      })}
    </div>
  );
}
