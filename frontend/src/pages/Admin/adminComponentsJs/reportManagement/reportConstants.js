import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DoneOutlinedIcon from "@mui/icons-material/DoneOutlined";
import GppBadOutlinedIcon from "@mui/icons-material/GppBadOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

export const REPORT_LABELS = {
  all: "\uC804\uCCB4",
  pending: "\uCC98\uB9AC \uB300\uAE30",
  reviewing: "\uAC80\uD1A0 \uC911",
  done: "\uCC98\uB9AC \uC644\uB8CC",
  post: "\uAC8C\uC2DC\uAE00",
  comment: "\uB313\uAE00",
  warning: "\uACBD\uACE0",
  temporary: "\uC77C\uC2DC\uC815\uC9C0",
  permanent: "\uC601\uAD6C\uC815\uC9C0",
  reject: "\uBC18\uB824",
  spam: "\uC2A4\uD338 \uB610\uB294 \uAD11\uACE0",
  insult: "\uC695\uC124 \uB610\uB294 \uBE44\uBC29",
  sexual: "\uC74C\uB780\uBB3C \uB610\uB294 \uC131\uC801 \uCF58\uD150\uCE20",
  fraud: "\uC0AC\uAE30 \uB610\uB294 \uAC70\uC9D3 \uC815\uBCF4",
  selfHarm: "\uC790\uD574 \uB610\uB294 \uC790\uC0B4 \uAD00\uB828 \uCF58\uD150\uCE20",
  copyright: "\uC9C0\uC801 \uC7AC\uC0B0\uAD8C \uCE68\uD574",
  etc: "\uAE30\uD0C0",
};

export const reportStatusTabs = [
  REPORT_LABELS.all,
  REPORT_LABELS.pending,
  REPORT_LABELS.reviewing,
  REPORT_LABELS.done,
];

export const reportTypeTabs = [
  REPORT_LABELS.all,
  REPORT_LABELS.post,
  REPORT_LABELS.comment,
];

export const processResultTabs = [
  REPORT_LABELS.all,
  REPORT_LABELS.warning,
  REPORT_LABELS.temporary,
  REPORT_LABELS.permanent,
  REPORT_LABELS.reject,
];

export const statusMeta = {
  [REPORT_LABELS.pending]: { className: "pending" },
  [REPORT_LABELS.reviewing]: { className: "reviewing" },
  [REPORT_LABELS.done]: { className: "resolved" },
};

export const typeMeta = {
  [REPORT_LABELS.all]: { icon: ReportGmailerrorredOutlinedIcon, count: 0 },
  [REPORT_LABELS.post]: { icon: ArticleOutlinedIcon, count: 0 },
  [REPORT_LABELS.comment]: { icon: ChatBubbleOutlineOutlinedIcon, count: 0 },
};

export const sanctionOptions = [
  {
    id: "warning",
    label: REPORT_LABELS.warning,
    tone: "warning",
    icon: WarningAmberOutlinedIcon,
    description: "\uACC4\uC815\uC5D0 \uACBD\uACE0\uB97C \uAE30\uB85D\uD569\uB2C8\uB2E4.",
  },
  {
    id: "temporary",
    label: REPORT_LABELS.temporary,
    tone: "temporary",
    icon: ScheduleOutlinedIcon,
    description: "\uACC4\uC815 \uD65C\uB3D9\uC744 \uC77C\uC815 \uAE30\uAC04 \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  },
  {
    id: "permanent",
    label: REPORT_LABELS.permanent,
    tone: "permanent",
    icon: GppBadOutlinedIcon,
    description: "\uACC4\uC815 \uC774\uC6A9\uC744 \uC601\uAD6C\uC801\uC73C\uB85C \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  },
  {
    id: "reject",
    label: REPORT_LABELS.reject,
    tone: "reject",
    icon: DoneOutlinedIcon,
    description: "\uC2E0\uACE0\uAC00 \uBD80\uC801\uC808\uD558\uB2E4\uACE0 \uD310\uB2E8\uD558\uC5EC \uBC18\uB824\uD569\uB2C8\uB2E4.",
  },
];

export const reasonOptions = [
  REPORT_LABELS.spam,
  REPORT_LABELS.insult,
  REPORT_LABELS.sexual,
  REPORT_LABELS.fraud,
  REPORT_LABELS.selfHarm,
  REPORT_LABELS.copyright,
  REPORT_LABELS.etc,
];

export const suspensionPeriods = [
  {
    label: "1\uC77C",
    value: 1,
    description: "24\uC2DC\uAC04 \uB3D9\uC548 \uACC4\uC815 \uC774\uC6A9\uC744 \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  },
  {
    label: "3\uC77C",
    value: 3,
    description: "72\uC2DC\uAC04 \uB3D9\uC548 \uACC4\uC815 \uC774\uC6A9\uC744 \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  },
  {
    label: "7\uC77C",
    value: 7,
    description: "168\uC2DC\uAC04 \uB3D9\uC548 \uACC4\uC815 \uC774\uC6A9\uC744 \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  },
  {
    label: "30\uC77C",
    value: 30,
    description: "720\uC2DC\uAC04 \uB3D9\uC548 \uACC4\uC815 \uC774\uC6A9\uC744 \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  },
  {
    label: "\uC9C1\uC811 \uC785\uB825",
    value: "custom",
    description: "\uC6D0\uD558\uB294 \uAE30\uAC04\uC744 \uC9C1\uC811 \uC785\uB825\uD569\uB2C8\uB2E4.",
  },
];

export const todayText = "2026.05.21 14:30";
