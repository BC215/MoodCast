import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import { REPORT_LABELS } from "./reportConstants";

export function getTypeIcon(type) {
  if (type === REPORT_LABELS.comment) return ChatBubbleOutlineOutlinedIcon;
  return ArticleOutlinedIcon;
}

export function getReleaseDate(days) {
  if (days === "custom") {
    return "\uC9C1\uC811 \uC785\uB825\uD55C \uAE30\uAC04 \uAE30\uC900\uC73C\uB85C \uACC4\uC0B0\uD569\uB2C8\uB2E4.";
  }

  if (!days) return "-";

  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + Number(days));

  return releaseDate.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countReportsByStatus(reports, statusTabs) {
  return statusTabs.reduce((counts, tabLabel) => {
    counts[tabLabel] =
      tabLabel === REPORT_LABELS.all
        ? reports.length
        : reports.filter((report) => report.status === tabLabel).length;
    return counts;
  }, {});
}

export function countReportsByType(reports, typeTabs) {
  return typeTabs.reduce((counts, tabLabel) => {
    counts[tabLabel] =
      tabLabel === REPORT_LABELS.all
        ? reports.length
        : reports.filter((report) => report.type === tabLabel).length;
    return counts;
  }, {});
}
