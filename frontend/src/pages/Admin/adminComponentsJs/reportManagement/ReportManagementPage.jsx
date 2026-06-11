import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../common/AdminLayout";
import { SearchBar } from "../common/SearchBar";
import {
  processResultTabs,
  REPORT_LABELS,
  reasonOptions,
  reportStatusTabs,
  reportTypeTabs,
  sanctionOptions,
} from "./reportConstants";
import {
  countReportsByStatus,
  countReportsByType,
  getReleaseDate,
} from "./reportUtils";
import { ReportCompletionToast } from "./ReportCompletionToast";
import { ReportDrawer } from "./ReportDrawer";
import { ReportList } from "./ReportList";
import { ReportResultModal } from "./ReportResultModal";
import { ReportStatusTabs } from "./ReportStatusTabs";
import { ReportTypeTabs } from "./ReportTypeTabs";
import styles from "../../adminComponentsCss/reportManagement/ReportManagementPage.module.css";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER || import.meta.env.VITE_API_BASE_URL;

const STATUS_TO_API = {
  [REPORT_LABELS.all]: "ALL",
  [REPORT_LABELS.pending]: "PENDING",
  [REPORT_LABELS.reviewing]: "REVIEWING",
  [REPORT_LABELS.done]: "DONE",
};

const TYPE_TO_API = {
  [REPORT_LABELS.all]: "ALL",
  [REPORT_LABELS.post]: "POST",
  [REPORT_LABELS.comment]: "COMMENT",
};

const RESULT_TO_API = {
  [REPORT_LABELS.all]: "ALL",
  [REPORT_LABELS.warning]: "WARNING",
  [REPORT_LABELS.temporary]: "TEMPORARY_SUSPEND",
  [REPORT_LABELS.permanent]: "PERMANENT_SUSPEND",
  [REPORT_LABELS.reject]: "REJECT",
};

const reportReasonTabs = [REPORT_LABELS.all, ...reasonOptions];

const ACTION_TO_RESULT = {
  warning: "WARNING",
  temporary: "TEMPORARY_SUSPEND",
  permanent: "PERMANENT_SUSPEND",
  reject: "REJECT",
};

const RESULT_TO_ACTION_LABEL = {
  WARNING: REPORT_LABELS.warning,
  TEMPORARY_SUSPEND: REPORT_LABELS.temporary,
  PERMANENT_SUSPEND: REPORT_LABELS.permanent,
  REJECT: REPORT_LABELS.reject,
};

const STATUS_TO_LABEL = {
  PENDING: REPORT_LABELS.pending,
  REVIEWING: REPORT_LABELS.reviewing,
  DONE: REPORT_LABELS.done,
};

const TYPE_TO_LABEL = {
  POST: REPORT_LABELS.post,
  COMMENT: REPORT_LABELS.comment,
};

const SORT_LABELS = {
  latest: "\uCD5C\uC2E0\uC21C",
  count: "\uC2E0\uACE0 \uC218 \uB9CE\uC740 \uC21C",
  old: "\uC624\uB798\uB41C \uC21C",
};

const HISTORY_SORT_LABELS = {
  latest: "최신순",
  old: "오래된 순",
};

const TOP_TAB_LABELS = {
  list: "\uC2E0\uACE0 \uBAA9\uB85D",
  insight: "\uD1B5\uACC4 \uBC0F \uC81C\uC7AC \uC774\uB825",
};

const PERIOD_LABELS = {
  day: "\uC77C",
  week: "\uC8FC",
  month: "\uC6D4",
};

const SERVICE_START_YEAR = 2026;

const LINE_CHART_TEXT = {
  day: {
    title: "\uC77C\uBCC4 \uC2E0\uACE0 \uC720\uC785 \uCD94\uC774",
    description: "\uC120\uD0DD\uD55C \uB0A0\uC9DC\uC5D0 \uC811\uC218\uB41C \uC2E0\uACE0 \uAC74\uC218",
  },
  week: {
    title: "\uC8FC\uBCC4 \uC2E0\uACE0 \uC720\uC785 \uCD94\uC774",
    description: "\uC120\uD0DD\uD55C \uC8FC\uC5D0 \uC811\uC218\uB41C \uC2E0\uACE0 \uAC74\uC218",
  },
  month: {
    title: "\uC6D4\uBCC4 \uC2E0\uACE0 \uC720\uC785 \uCD94\uC774",
    description: "\uC120\uD0DD\uD55C \uC5F0\uB3C4\uC5D0 \uC811\uC218\uB41C \uC2E0\uACE0 \uAC74\uC218",
  },
};

export function ReportManagementPage() {
  const accessToken = localStorage.getItem("accessToken");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  );

  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [selectedTopTab, setSelectedTopTab] = useState(TOP_TAB_LABELS.list);
  const [selectedInsightPeriod, setSelectedInsightPeriod] = useState("day");
  const [insightPeriodFilter, setInsightPeriodFilter] = useState(() =>
    getInitialInsightPeriodFilter(),
  );
  const [selectedStatusTab, setSelectedStatusTab] = useState(REPORT_LABELS.all);
  const [selectedTypeTab, setSelectedTypeTab] = useState(REPORT_LABELS.all);
  const [selectedProcessResultTab, setSelectedProcessResultTab] = useState(
    REPORT_LABELS.all,
  );
  const [selectedReasonFilter, setSelectedReasonFilter] = useState(REPORT_LABELS.all);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortType, setSortType] = useState(SORT_LABELS.latest);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedResultReport, setSelectedResultReport] = useState(null);
  const [panelStep, setPanelStep] = useState("detail");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedReason, setSelectedReason] = useState(REPORT_LABELS.insult);
  const [reasonDetail, setReasonDetail] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [customPeriod, setCustomPeriod] = useState("");
  const [hideTargetContent, setHideTargetContent] = useState(true);
  const [completionMessage, setCompletionMessage] = useState("");
  const [processRateStat, setProcessRateStat] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [selectedStatusTab, selectedTypeTab, selectedProcessResultTab]);

  useEffect(() => {
    fetchAllReports();
  }, []);

  useEffect(() => {
    if (
      selectedStatusTab !== REPORT_LABELS.done &&
      selectedProcessResultTab !== REPORT_LABELS.all
    ) {
      setSelectedProcessResultTab(REPORT_LABELS.all);
    }
  }, [selectedStatusTab, selectedProcessResultTab]);

  const filteredReports = useMemo(() => {
    const reasonFilteredReports =
      selectedReasonFilter === REPORT_LABELS.all
        ? reports
        : reports.filter(
            (report) => normalizeReportReason(report.reason) === selectedReasonFilter,
          );
    const keyword = searchKeyword.trim().toLowerCase();
    const searchedReports = keyword
      ? reasonFilteredReports.filter((report) =>
          [
            report.title,
            report.targetName,
            report.targetHandle,
            report.reason,
            report.detail,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword)),
        )
      : reasonFilteredReports;

    return [...searchedReports].sort((a, b) => {
      if (sortType === SORT_LABELS.count) {
        return Number(b.reportCount || 0) - Number(a.reportCount || 0);
      }

      if (sortType === SORT_LABELS.old) {
        return getReportSortTime(a) - getReportSortTime(b);
      }

      return getReportSortTime(b) - getReportSortTime(a);
    });
  }, [reports, selectedReasonFilter, searchKeyword, sortType]);

  const selectedActionMeta = sanctionOptions.find(
    (option) => option.id === selectedAction,
  );
  const releaseDate = getReleaseDate(
    selectedPeriod === "custom"
      ? Number(customPeriod) || "custom"
      : selectedPeriod,
  );
  const statusCounts = useMemo(
    () =>
      countReportsByStatus(
        filterReportsByType(allReports, selectedTypeTab),
        reportStatusTabs,
      ),
    [allReports, selectedTypeTab],
  );
  const typeCounts = useMemo(
    () =>
      countReportsByType(
        filterReportsByStatus(allReports, selectedStatusTab),
        reportTypeTabs,
      ),
    [allReports, selectedStatusTab],
  );
  const processResultCounts = useMemo(
    () =>
      countReportsByProcessResult(
        filterReportsByType(
          filterReportsByStatus(allReports, REPORT_LABELS.done),
          selectedTypeTab,
        ),
        processResultTabs,
      ),
    [allReports, selectedTypeTab],
  );
  const reasonCounts = useMemo(
    () => countReportsByReason(reports, reportReasonTabs),
    [reports],
  );
  const insightPeriodRange = useMemo(
    () => buildInsightPeriodRange(selectedInsightPeriod, insightPeriodFilter),
    [selectedInsightPeriod, insightPeriodFilter],
  );
  const insightReports = useMemo(
    () => filterReportsByRange(allReports, insightPeriodRange),
    [allReports, insightPeriodRange],
  );
  const reportInsights = useMemo(
    () =>
      buildReportInsights(
        insightReports,
        selectedInsightPeriod,
        insightPeriodRange,
        allReports,
      ),
    [insightReports, selectedInsightPeriod, insightPeriodRange, allReports],
  );
  const processRateCounts = processRateStat || {
    doneCount: reportInsights.doneCount,
    openCount: reportInsights.openCount,
  };
  const sanctionHistories = useMemo(
    () =>
      allReports
        .filter((report) => report.status === REPORT_LABELS.done)
        .sort(
          (a, b) =>
            parseAdminLocalDateTime(b.handledAtValue || b.createdAt).getTime() -
            parseAdminLocalDateTime(a.handledAtValue || a.createdAt).getTime(),
        ),
    [allReports],
  );

  useEffect(() => {
    fetchReportProcessRate();
  }, [insightPeriodRange]);

  async function fetchReports() {
    try {
      const response = await axios.get(`${BACKSERVER}/admin/api/reports`, {
        headers: authHeaders,
        params: {
          status: STATUS_TO_API[selectedStatusTab] || "ALL",
          targetType: TYPE_TO_API[selectedTypeTab] || "ALL",
          processResult:
            selectedStatusTab === REPORT_LABELS.done
              ? RESULT_TO_API[selectedProcessResultTab] || "ALL"
              : "ALL",
        },
      });

      setReports((response.data?.reports || []).map(mapAdminReport));
    } catch {
      setReports([]);
    }
  }

  async function fetchAllReports() {
    try {
      const response = await axios.get(`${BACKSERVER}/admin/api/reports`, {
        headers: authHeaders,
        params: {
          status: "ALL",
          targetType: "ALL",
          processResult: "ALL",
        },
      });

      setAllReports((response.data?.reports || []).map(mapAdminReport));
    } catch {
      setAllReports([]);
    }
  }

  // 관리자 기능 담당 작업(문건우): 신고 처리율은 전체 목록 집계보다 전용 통계 API 값을 우선 사용합니다.
  async function fetchReportProcessRate() {
    try {
      const response = await axios.get(
        `${BACKSERVER}/admin/api/reports/process-rate`,
        {
          headers: authHeaders,
          params: {
            startDate: formatDateInputValue(insightPeriodRange.start),
            endDate: formatDateInputValue(insightPeriodRange.end),
          },
        },
      );

      setProcessRateStat({
        doneCount: Number(response.data?.doneCount || 0),
        openCount: Number(response.data?.openCount || 0),
      });
    } catch {
      setProcessRateStat(null);
    }
  }

  async function openDetailPanel(report) {
    if (report.status === REPORT_LABELS.done) {
      setSelectedResultReport(report);
      return;
    }

    try {
      const response = await axios.get(
        `${BACKSERVER}/admin/api/reports/${report.id}`,
        { headers: authHeaders },
      );
      const nextReport = mapAdminReport(response.data?.report);

      setReports((prevReports) =>
        prevReports.map((item) =>
          item.id === nextReport.id ? nextReport : item,
        ),
      );
      setAllReports((prevReports) =>
        prevReports.map((item) =>
          item.id === nextReport.id ? nextReport : item,
        ),
      );
      setSelectedReport(nextReport);
    } catch {
      setSelectedReport(report);
    }

    setPanelStep("detail");
    setSelectedAction("");
    setSelectedReason(report.reason || REPORT_LABELS.insult);
    setReasonDetail("");
    setSelectedPeriod(7);
    setCustomPeriod("");
    setHideTargetContent(true);
  }

  function closePanel() {
    setSelectedReport(null);
  }

  function moveNextFromOption() {
    if (!selectedAction) return;
    if (selectedAction === "temporary") setPanelStep("temporary");
    else if (selectedAction === "reject") setPanelStep("confirm");
    else setPanelStep("reason");
  }

  async function confirmSanction() {
    const processResult = ACTION_TO_RESULT[selectedAction];

    if (!processResult || !selectedReport) return;

    try {
      const response = await axios.put(
        `${BACKSERVER}/admin/api/reports/${selectedReport.id}/process`,
        {
          processResult,
          processReason:
            selectedAction === "reject" ? REPORT_LABELS.reject : selectedReason,
          suspendDays:
            selectedAction === "temporary"
              ? Number(
                  selectedPeriod === "custom" ? customPeriod : selectedPeriod,
                )
              : null,
          hideTargetContent: selectedAction !== "reject" && hideTargetContent,
        },
        { headers: authHeaders },
      );
      const updatedReport = mapAdminReport(response.data?.report);

      setReports((prevReports) => {
        const nextReports = prevReports.map((report) =>
          report.id === updatedReport.id ? updatedReport : report,
        );

        if (selectedStatusTab === REPORT_LABELS.all) {
          return nextReports;
        }

        return nextReports.filter(
          (report) => report.status === selectedStatusTab,
        );
      });
      setAllReports((prevReports) =>
        prevReports.map((report) =>
          report.id === updatedReport.id ? updatedReport : report,
        ),
      );
      setCompletionMessage(
        response.data?.message ||
          "\uC2E0\uACE0 \uCC98\uB9AC\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      );
      closePanel();
    } catch (error) {
      setCompletionMessage(
        error.response?.data?.message ||
          "\uC2E0\uACE0 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      );
    }
  }

  return (
    <AdminLayout
      title="신고 및 제재 관리"
      description="신고된 콘텐츠를 검토하고 적절한 제재를 관리합니다."
    >
      {completionMessage && (
        <ReportCompletionToast
          message={completionMessage}
          onClose={() => setCompletionMessage("")}
        />
      )}

      <section
        className={styles.topTabs}
        aria-label="\uC2E0\uACE0 \uAD00\uB9AC \uC0C1\uC704 \uD0ED"
      >
        {[
          TOP_TAB_LABELS.list,
          TOP_TAB_LABELS.insight,
        ].map((label) => (
          <button
            key={label}
            className={label === selectedTopTab ? styles.activeTopTab : ""}
            onClick={() => setSelectedTopTab(label)}
            type="button"
          >
            {label}
          </button>
        ))}
      </section>

      {selectedTopTab === TOP_TAB_LABELS.list ? (
        <>
          <section className={styles.filterHeader}>
            <ReportStatusTabs
              tabs={reportStatusTabs}
              selectedTab={selectedStatusTab}
              counts={statusCounts}
              onSelect={setSelectedStatusTab}
            />
            <SearchBar
              placeholder="신고 대상 또는 신고 사유 검색"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </section>

          <section className={styles.reportPanel}>
            <div className={styles.panelTitleRow}>
              <div>
                <h2>
                  {"\uC804\uCCB4 \uC2E0\uACE0 \uBAA9\uB85D"} (
                  {filteredReports.length})
                </h2>
                <p>
                  {
                    "\uAC8C\uC2DC\uAE00, \uB313\uAE00 \uC2E0\uACE0\uB97C \uD55C \uD654\uBA74\uC5D0\uC11C \uD655\uC778\uD569\uB2C8\uB2E4."
                  }
                </p>
              </div>
            </div>

            <div className={styles.reportListControls}>
              <ReportTypeTabs
                tabs={reportTypeTabs}
                selectedTab={selectedTypeTab}
                counts={typeCounts}
                onSelect={setSelectedTypeTab}
              />

              <div className={styles.reportSelectGroup}>
                <select
                  aria-label="신고 사유 필터"
                  value={selectedReasonFilter}
                  onChange={(event) => setSelectedReasonFilter(event.target.value)}
                >
                  {reportReasonTabs.map((label) => (
                    <option key={label} value={label}>
                      {label} {reasonCounts[label] ?? 0}
                    </option>
                  ))}
                </select>
                {selectedStatusTab === REPORT_LABELS.done && (
                  <select
                    aria-label="처리 결과 필터"
                    value={selectedProcessResultTab}
                    onChange={(event) => setSelectedProcessResultTab(event.target.value)}
                  >
                    {processResultTabs.map((label) => (
                      <option key={label} value={label}>
                        {label} {processResultCounts[label] ?? 0}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  aria-label="\uC2E0\uACE0 \uBAA9\uB85D \uC815\uB82C"
                  value={sortType}
                  onChange={(event) => setSortType(event.target.value)}
                >
                  <option>{SORT_LABELS.latest}</option>
                  <option>{SORT_LABELS.count}</option>
                  <option>{SORT_LABELS.old}</option>
                </select>
              </div>
            </div>

            <ReportList reports={filteredReports} onOpenReport={openDetailPanel} />
          </section>
        </>
      ) : (
        <ReportInsightSection
          insights={reportInsights}
          processRateCounts={processRateCounts}
          histories={sanctionHistories}
          selectedPeriod={selectedInsightPeriod}
          onSelectPeriod={setSelectedInsightPeriod}
          periodFilter={insightPeriodFilter}
          onChangePeriodFilter={(patch) =>
            setInsightPeriodFilter((prevFilter) => ({
              ...prevFilter,
              ...patch,
            }))
          }
          onResetPeriodFilter={() =>
            setInsightPeriodFilter(getInitialInsightPeriodFilter())
          }
        />
      )}

      {selectedReport && (
        <ReportDrawer
          report={selectedReport}
          panelStep={panelStep}
          selectedAction={selectedAction}
          selectedActionMeta={selectedActionMeta}
          selectedReason={selectedReason}
          reasonDetail={reasonDetail}
          selectedPeriod={selectedPeriod}
          customPeriod={customPeriod}
          releaseDate={releaseDate}
          hideTargetContent={hideTargetContent}
          onClose={closePanel}
          onProcess={() => setPanelStep("option")}
          onBackToDetail={() => setPanelStep("detail")}
          onBackToOption={() => setPanelStep("option")}
          onSelectAction={setSelectedAction}
          onNextFromOption={moveNextFromOption}
          onChangeReason={setSelectedReason}
          onChangeDetail={setReasonDetail}
          onChangePeriod={setSelectedPeriod}
          onChangeCustomPeriod={setCustomPeriod}
          onChangeHideTargetContent={setHideTargetContent}
          onGoConfirm={() => setPanelStep("confirm")}
          onBackFromConfirm={() =>
            selectedAction === "temporary"
              ? setPanelStep("temporary")
              : setPanelStep(selectedAction === "reject" ? "option" : "reason")
          }
          onConfirm={confirmSanction}
        />
      )}

      {selectedResultReport && (
        <ReportResultModal
          report={selectedResultReport}
          onClose={() => setSelectedResultReport(null)}
        />
      )}
    </AdminLayout>
  );
}

function mapAdminReport(report) {
  if (!report) return {};

  const processResult = report.processResult;
  const status = STATUS_TO_LABEL[report.reportStatus] || REPORT_LABELS.pending;
  const type = TYPE_TO_LABEL[report.targetType] || REPORT_LABELS.post;
  const title =
    report.postTitle ||
    (type === REPORT_LABELS.comment
      ? `${REPORT_LABELS.comment} \uC2E0\uACE0 #${report.commentId}`
      : `${REPORT_LABELS.post} \uC2E0\uACE0 #${report.postId}`);
  const targetName =
    report.targetMemberName ||
    report.targetMemberNickname ||
    "\uC54C \uC218 \uC5C6\uC74C";
  const targetHandle = report.targetMemberEmail
    ? `@${report.targetMemberEmail}`
    : "-";

  return {
    id: report.reportId,
    type,
    title,
    status,
    targetName,
    targetNickname: report.targetMemberNickname || "",
    targetHandle,
    reporter:
      report.reporterName || report.reporterNickname || report.reporterEmail || "-",
    reason: report.reason || REPORT_LABELS.etc,
    detail: report.handledMemo || report.targetContent || "-",
    reportCount: report.sameTargetReportCount || 1,
    reporterCount:
      report.sameTargetReporterCount ||
      (Array.isArray(report.reporters) ? report.reporters.length : 1),
    firstReportedAt: formatDateTime(report.createdAt),
    latestReportedAt: formatDateTime(report.createdAt),
    reportedAgo: formatDateTime(report.createdAt),
    joinedAt: formatDate(report.targetMemberCreatedAt),
    postCount: formatCount(report.targetPostCount),
    commentCount: formatCount(report.targetCommentCount),
    likeCount: formatCount(report.targetLikeCount),
    targetReportCount: formatCount(report.targetReportCount),
    targetWarningCount: formatCount(report.targetWarningCount),
    targetSuspendCount: formatCount(report.targetSuspendCount),
    createdAt: report.createdAt,
    reviewedAtValue: report.reviewedAt,
    handledAtValue: report.handledAt,
    processResult,
    targetContent: report.targetContent || "-",
    commentContent: report.commentContent || "",
    postTags: report.postTags || "",
    handledByMemberName: report.handledByMemberName || "",
    reporters: mapReporters(report),
    activities: Array.isArray(report.activities)
      ? report.activities.map((activity, index) => ({
          id: `${activity.type || "activity"}-${activity.time || index}-${index}`,
          type: activity.type || "\uD65C\uB3D9",
          text: activity.text || "-",
          time: activity.time || "-",
        }))
      : [],
    sanctionResult: processResult
      ? {
          actionLabel: RESULT_TO_ACTION_LABEL[processResult] || status,
          reason: report.reason || REPORT_LABELS.etc,
          detail: report.handledMemo || "-",
          handledAt: formatDateTime(report.handledAt),
          adminName:
            report.handledByMemberName || "\uAD00\uB9AC\uC790",
        }
      : null,
  };
}

function formatCount(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("ko-KR") : "-";
}

// 관리자 기능 담당 작업(문건우): DB DATETIME 문자열을 브라우저 시간대 변환 없이 화면/그래프용 로컬 시각으로 해석합니다.
function parseAdminLocalDateTime(value) {
  if (!value) return new Date(Number.NaN);

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, Number(month) - 1, day, hour, minute, second);
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  const text = String(value).trim();
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?/,
  );

  if (match) {
    const [
      ,
      year,
      month,
      day,
      hour = "0",
      minute = "0",
      second = "0",
      millisecond = "0",
    ] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, "0")),
    );
  }

  return new Date(text);
}

function mapReporters(report) {
  if (Array.isArray(report.reporters) && report.reporters.length > 0) {
    return report.reporters.map((reporter, index) => ({
      id: reporter.memberId || `${reporter.email || "reporter"}-${index}`,
      name: reporter.name || reporter.nickname || reporter.email || "-",
      handle: reporter.email ? `@${reporter.email}` : reporter.nickname || "",
      reportCount: Number(reporter.reportCount || 0),
      reportedAt: reporter.latestReportedAt || reporter.firstReportedAt || "-",
      firstReportedAt: reporter.firstReportedAt || "-",
      latestReportedAt: reporter.latestReportedAt || "-",
    }));
  }

  return [
    {
      id: report.reporterMemberId || "reporter-0",
      name: report.reporterName || report.reporterNickname || report.reporterEmail || "-",
      handle: report.reporterEmail ? `@${report.reporterEmail}` : "",
      reportCount: 1,
      reportedAt: formatDateTime(report.createdAt),
      firstReportedAt: formatDateTime(report.createdAt),
      latestReportedAt: formatDateTime(report.createdAt),
    },
  ];
}

function formatDate(value) {
  if (!value) return "-";

  const date = parseAdminLocalDateTime(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ");

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getReportSortTime(report) {
  const getTime = (value) => {
    const time = parseAdminLocalDateTime(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  if (report.status === REPORT_LABELS.done) {
    return getTime(report.handledAtValue || report.createdAt);
  }

  if (report.status === REPORT_LABELS.reviewing) {
    return getTime(report.reviewedAtValue || report.createdAt);
  }

  return getTime(report.createdAt);
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = parseAdminLocalDateTime(value);

  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ");

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ReportInsightSection({
  insights,
  processRateCounts,
  histories,
  selectedPeriod,
  onSelectPeriod,
  periodFilter,
  onChangePeriodFilter,
  onResetPeriodFilter,
}) {
  const [historyPage, setHistoryPage] = useState(1);
  const [historySortType, setHistorySortType] = useState(HISTORY_SORT_LABELS.latest);
  const [historyTypeFilter, setHistoryTypeFilter] = useState(REPORT_LABELS.all);
  const [historySearchKeyword, setHistorySearchKeyword] = useState("");
  const historiesPerPage = 10;
  const filteredHistories = useMemo(
    () =>
      filterAndSortSanctionHistories(
        histories,
        historyTypeFilter,
        historySearchKeyword,
        historySortType,
      ),
    [histories, historyTypeFilter, historySearchKeyword, historySortType],
  );
  const totalHistoryPages = Math.max(
    Math.ceil(filteredHistories.length / historiesPerPage),
    1,
  );
  const normalizedHistoryPage = Math.min(historyPage, totalHistoryPages);
  const visibleHistories = filteredHistories.slice(
    (normalizedHistoryPage - 1) * historiesPerPage,
    normalizedHistoryPage * historiesPerPage,
  );
  const historyPageGroupStart =
    Math.floor((normalizedHistoryPage - 1) / 10) * 10 + 1;
  const historyPageNumbers = Array.from(
    {
      length: Math.min(10, totalHistoryPages - historyPageGroupStart + 1),
    },
    (_, index) => historyPageGroupStart + index,
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [filteredHistories]);

  return (
    <section className={styles.insightGrid}>
      <article className={styles.historyPanel}>
        <div className={styles.panelTitleRow}>
          <div>
            <h2>제재 이력</h2>
            <p>처리 완료된 신고의 제재 기록입니다.</p>
          </div>
        </div>
        <div className={styles.historyControls}>
          <div className={styles.historyFilterGroup} aria-label="제재 이력 유형 필터">
            {[REPORT_LABELS.all, REPORT_LABELS.post, REPORT_LABELS.comment].map(
              (label) => (
                <button
                  key={label}
                  className={label === historyTypeFilter ? styles.activeHistoryFilter : ""}
                  type="button"
                  onClick={() => setHistoryTypeFilter(label)}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <select
            aria-label="제재 이력 정렬"
            value={historySortType}
            onChange={(event) => setHistorySortType(event.target.value)}
          >
            <option>{HISTORY_SORT_LABELS.latest}</option>
            <option>{HISTORY_SORT_LABELS.old}</option>
          </select>
        </div>
        <SearchBar
          placeholder="이름, 닉네임, 제목 또는 내용 검색"
          value={historySearchKeyword}
          onChange={(event) => setHistorySearchKeyword(event.target.value)}
        />
        <div className={styles.historyList}>
          {filteredHistories.length === 0 ? (
            <p className={styles.emptyText}>제재 이력이 없습니다.</p>
          ) : (
            visibleHistories.map((report) => (
              <div className={styles.historyItem} key={report.id}>
                <div>
                  <strong>{report.targetName}</strong>
                  <span>{report.targetHandle}</span>
                </div>
                <p>{report.title}</p>
                <dl>
                  <div>
                    <dt>처리</dt>
                    <dd>{report.sanctionResult?.actionLabel || "-"}</dd>
                  </div>
                  <div>
                    <dt>사유</dt>
                    <dd>{report.sanctionResult?.detail || report.reason}</dd>
                  </div>
                  <div>
                    <dt>관리자</dt>
                    <dd>{report.sanctionResult?.adminName || "-"}</dd>
                  </div>
                  <div>
                    <dt>처리일</dt>
                    <dd>{report.sanctionResult?.handledAt || "-"}</dd>
                  </div>
                </dl>
              </div>
            ))
          )}
        </div>
        {filteredHistories.length > historiesPerPage && (
          <nav
            className={styles.historyPagination}
            aria-label="\uC81C\uC7AC \uC774\uB825 \uD398\uC774\uC9C0 \uC774\uB3D9"
          >
            <button
              type="button"
              disabled={normalizedHistoryPage === 1}
              onClick={() =>
                setHistoryPage((prevPage) => Math.max(prevPage - 1, 1))
              }
            >
              {"\uC774\uC804"}
            </button>
            {historyPageNumbers.map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                className={
                  pageNumber === normalizedHistoryPage ? styles.activeHistoryPage : ""
                }
                onClick={() => setHistoryPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={normalizedHistoryPage === totalHistoryPages}
              onClick={() =>
                setHistoryPage((prevPage) =>
                  Math.min(prevPage + 1, totalHistoryPages),
                )
              }
            >
              {"\uB2E4\uC74C"}
            </button>
          </nav>
        )}
      </article>

      <article className={styles.statsPanel}>
        <div className={styles.statsHeader}>
          <div>
            <h2>{"\uC2E0\uACE0 \uD1B5\uACC4"}</h2>
            <p>{"\uC2E0\uACE0 \uC720\uD615, \uCC98\uB9AC\uC728, \uCC98\uB9AC \uACB0\uACFC\uB97C \uD655\uC778\uD569\uB2C8\uB2E4."}</p>
          </div>
          <div className={styles.statsControlBar}>
            <div className={styles.periodTabs}>
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <button
                  className={value === selectedPeriod ? styles.activePeriod : ""}
                  key={value}
                  onClick={() => onSelectPeriod(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <ReportInsightPeriodControl
              period={selectedPeriod}
              periodFilter={periodFilter}
              onChangePeriodFilter={onChangePeriodFilter}
              onResetPeriodFilter={onResetPeriodFilter}
            />
          </div>
        </div>

        <MetricTimeBarChart
          items={insights.timeline}
          period={selectedPeriod}
        />
        <MetricBarChart
          title={"\uC2E0\uACE0 \uC720\uD615"}
          items={insights.typeBars}
        />
        <MetricBarChart
          title="신고 사유"
          items={insights.reasonBars}
        />
        <ProcessRateChart done={processRateCounts.doneCount} open={processRateCounts.openCount} />
        <ProcessRateTrendChart items={insights.processRateTrend} period={selectedPeriod} />
        <MetricBarChart
          title={"\uCC98\uB9AC \uACB0\uACFC"}
          items={insights.resultBars}
        />
      </article>
    </section>
  );
}

function ReportInsightPeriodControl({
  period,
  periodFilter,
  onChangePeriodFilter,
  onResetPeriodFilter,
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(currentYear - SERVICE_START_YEAR + 1, 1) },
    (_, index) => SERVICE_START_YEAR + index,
  );

  return (
    <div className={styles.periodFilterControl}>
      {period === "day" ? (
        <label className={styles.periodField}>
          <span>{"\uB0A0\uC9DC"}</span>
          <input
            type="date"
            min={`${SERVICE_START_YEAR}-01-01`}
            max={`${currentYear}-12-31`}
            value={periodFilter.selectedDate}
            onChange={(event) =>
              onChangePeriodFilter({ selectedDate: event.target.value })
            }
          />
        </label>
      ) : null}

      {period === "week" ? (
        <label className={styles.periodField}>
          <span>{"\uAE30\uC900\uC77C"}</span>
          <input
            type="date"
            min={`${SERVICE_START_YEAR}-01-01`}
            max={`${currentYear}-12-31`}
            value={periodFilter.selectedWeekDate}
            onChange={(event) =>
              onChangePeriodFilter({ selectedWeekDate: event.target.value })
            }
          />
        </label>
      ) : null}

      {period === "month" ? (
        <label className={styles.periodField}>
          <span>{"\uC5F0\uB3C4"}</span>
          <select
            value={periodFilter.selectedYear}
            onChange={(event) =>
              onChangePeriodFilter({ selectedYear: Number(event.target.value) })
            }
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}{"\uB144"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        className={styles.periodResetButton}
        type="button"
        onClick={onResetPeriodFilter}
      >
        {"\uCD08\uAE30\uD654"}
      </button>
    </div>
  );
}

function MetricTimeBarChart({
  items,
  period,
  title,
  unit = "건",
  guideText,
  tooltipValueFormatter,
  tooltipSubtextFormatter,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const hasData = maxValue > 0;
  const max = hasData ? Math.max(Math.ceil(maxValue / 5) * 5 + 5, 5) : 5;
  const totalValue = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const ySteps = hasData
    ? [max, max * 0.8, max * 0.6, max * 0.4, max * 0.2, 0]
    : [5, 4, 3, 2, 1, 0];
  const chartText = LINE_CHART_TEXT[period] || LINE_CHART_TEXT.day;
  const chartTitle = title || chartText.title;
  const chartLeft = 72;
  const chartRight = 728;
  const chartTop = 44;
  const chartBottom = 260;
  const chartLabelY = 302;
  const chartWidth = chartRight - chartLeft;
  const slotWidth = items.length ? chartWidth / items.length : chartWidth;
  const barWidth = Math.max(8, Math.min(28, slotWidth * 0.56));
  const chartItems = items.map((item, index) => {
    const x = chartLeft + slotWidth * index + slotWidth / 2;
    const y = hasData
      ? chartBottom - (item.value / max) * (chartBottom - chartTop)
      : chartBottom;
    const height = Math.max(chartBottom - y, item.value ? 3 : 0);

    return {
      ...item,
      x,
      y,
      barX: x - barWidth / 2,
      barWidth,
      height,
      hitX: chartLeft + slotWidth * index,
      hitWidth: slotWidth,
      displayLabel: formatTrendAxisLabel(item.label, period),
      tooltipLabel: formatTrendTooltipLabel(item.label, period),
      percentage: formatTrendPercentage(item.value, totalValue),
      isActual: true,
    };
  });
  const activePoint = hoveredPoint;
  const tooltipWidth = 210;
  const tooltipHeight = 88;
  const tooltipPadding = 16;
  const tooltipX = activePoint
    ? Math.min(Math.max(activePoint.x - tooltipWidth / 2, 8), 780 - tooltipWidth - 8)
    : 0;
  const tooltipY = activePoint
    ? Math.max(activePoint.y - tooltipHeight - 38, 8)
    : 0;

  const formatTooltipValue =
    tooltipValueFormatter || ((point) => `${point.value}${unit}`);
  const formatTooltipSubtext =
    tooltipSubtextFormatter || ((point) => `전체 대비 ${point.percentage}`);

  return (
    <div className={`${styles.chartCard} ${styles.lineChartCard}`}>
      <div className={styles.lineChartHeader}>
        <div>
          <h3>
            {chartTitle}
          </h3>
        </div>
      </div>
      <svg
        className={styles.lineChart}
        viewBox="0 0 780 320"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {ySteps.map((step, index) => {
          const y =
            chartTop +
            (index / (ySteps.length - 1)) * (chartBottom - chartTop);

          return (
            <g key={`${step}-${index}`}>
              <line className={styles.chartGridLine} x1={chartLeft} x2={chartRight} y1={y} y2={y} />
              <text className={styles.chartYAxisLabel} x="22" y={y + 5}>
                {Math.round(step)}
              </text>
            </g>
          );
        })}
        {chartItems.map((item) => (
          <g
            className={styles.chartPointGroup}
            key={item.label}
            onMouseEnter={() => setHoveredPoint(item)}
          >
            <line className={styles.chartHoverLine} x1={item.x} x2={item.x} y1={chartTop} y2={chartBottom} />
            <rect
              className={styles.chartBar}
              x={item.barX}
              y={chartBottom - item.height}
              width={item.barWidth}
              height={item.height}
              rx="6"
              ry="6"
            />
            {Number(item.value || 0) > 0 ? (
              <text className={styles.chartValueLabel} x={item.x} y={Math.max(item.y - 14, 18)}>
                {item.value}
              </text>
            ) : null}
            <rect
              className={styles.chartHitArea}
              x={item.hitX}
              y={chartTop - 12}
              width={item.hitWidth}
              height={chartBottom - chartTop + 24}
            />
          </g>
        ))}
        {activePoint ? (
          <g className={styles.activeChartOverlay}>
            <line
              className={styles.activeChartHoverLine}
              x1={activePoint.x}
              x2={activePoint.x}
              y1={chartTop}
              y2={chartBottom}
            />
            <rect
              className={styles.activeChartBar}
              x={activePoint.barX}
              y={chartBottom - activePoint.height}
              width={activePoint.barWidth}
              height={activePoint.height}
              rx="6"
              ry="6"
            />
            <g
              className={styles.chartTooltip}
              style={{ opacity: 1 }}
              transform={`translate(${tooltipX} ${tooltipY})`}
            >
              <rect width={tooltipWidth} height={tooltipHeight} rx="14" />
              <text x={tooltipPadding} y="26" style={{ textAnchor: "start" }}>{activePoint.tooltipLabel}</text>
              <text className={styles.chartTooltipValue} x={tooltipPadding} y="52" style={{ textAnchor: "start" }}>
                {formatTooltipValue(activePoint)}
              </text>
              <text className={styles.chartTooltipSubtext} x={tooltipPadding} y="72" style={{ textAnchor: "start" }}>
                {formatTooltipSubtext(activePoint)}
              </text>
            </g>
          </g>
        ) : null}
        {chartItems.map((item) => (
          <text className={styles.chartXAxisLabel} key={`label-${item.label}`} x={item.x} y={chartLabelY}>
            {item.displayLabel}
          </text>
        ))}
      </svg>
      {guideText ? (
        <p className={styles.chartGuideText}>
          {guideText}
        </p>
      ) : null}
    </div>
  );
}

function MetricBarChart({ title, items }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className={styles.chartCard}>
      <h3>{title}</h3>
      <div className={styles.barList}>
        {items.map((item) => {
          const percent = total ? ((Number(item.value || 0) / total) * 100).toFixed(1) : "0.0";

          return (
            <div className={styles.barRow} key={item.label}>
              <span>{item.label}</span>
              <div>
                <i style={{ width: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }} />
              </div>
              <strong>
                {item.value} ({percent}%)
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProcessRateChart({ done, open }) {
  const total = done + open;
  const doneRate = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className={styles.chartCard}>
      <h3>{"\uCC98\uB9AC\uC728"}</h3>
      <div className={styles.donutWrap}>
        <div
          className={styles.donut}
          style={{
            background: `conic-gradient(#7c4dff 0 ${doneRate}%, #eef2ff ${doneRate}% 100%)`,
          }}
        >
          <strong>{doneRate}%</strong>
        </div>
        <div className={styles.rateLegend}>
          <span>{"\uCC98\uB9AC \uC644\uB8CC"} {done}</span>
          <span>{"\uBBF8\uCC98\uB9AC"} {open}</span>
        </div>
      </div>
    </div>
  );
}

function ProcessRateTrendChart({ items, period }) {
  const chartItems = items.map((item) => ({
    label: item.label,
    value: item.doneCount,
    rate: item.rate,
    totalCount: item.totalCount,
    doneCount: item.doneCount,
  }));
  const formatProcessRateTooltipValue = (point) =>
    `처리 완료 ${Math.round(Number(point.doneCount || 0))}건`;
  const formatProcessRateTooltipSubtext = (point) => {
    const totalCount = Math.round(Number(point.totalCount || 0));

    return `처리 완료 시간 기준 / 전체 ${totalCount}건`;
  };

  return (
    <MetricTimeBarChart
      items={chartItems}
      period={period}
      title="처리 완료 건수 추이"
      unit="건"
      tooltipValueFormatter={formatProcessRateTooltipValue}
      tooltipSubtextFormatter={formatProcessRateTooltipSubtext}
    />
  );
}

function formatTrendAxisLabel(label, period) {
  if (period === "day") {
    const hour = Number(label);

    return hour % 4 === 0 ? `${String(hour).padStart(2, "0")}시` : "";
  }

  return label;
}

function formatTrendTooltipLabel(label, period) {
  if (period === "day") {
    return `${String(label).padStart(2, "0")}:00`;
  }

  if (period === "week") {
    return `${label}요일`;
  }

  return label;
}

function formatTrendPercentage(value, total) {
  if (!total) {
    return "0.0%";
  }

  return `${((Number(value || 0) / total) * 100).toFixed(1)}%`;
}

function buildReportInsights(reports, period, range, allReports = reports) {
  const doneCount = reports.filter((report) => report.status === REPORT_LABELS.done).length;
  const openCount = reports.length - doneCount;

  return {
    doneCount,
    openCount,
    timeline: buildTimeline(reports, period, range),
    processRateTrend: buildProcessRateTrend(allReports, period, range),
    typeBars: [
      {
        label: REPORT_LABELS.post,
        value: reports.filter((report) => report.type === REPORT_LABELS.post).length,
      },
      {
        label: REPORT_LABELS.comment,
        value: reports.filter((report) => report.type === REPORT_LABELS.comment).length,
      },
    ],
    reasonBars: reasonOptions.map((label) => ({
      label,
      value: reports.filter(
        (report) => normalizeReportReason(report.reason) === label,
      ).length,
    })),
    resultBars: processResultTabs
      .filter((label) => label !== REPORT_LABELS.all)
      .map((label) => ({
        label,
        value: reports.filter((report) => report.sanctionResult?.actionLabel === label).length,
      })),
  };
}

function buildProcessRateTrend(reports, period, range) {
  const buckets = buildTimelineBuckets(period);
  const countMap = new Map(
    [...buckets.keys()].map((label) => [
      label,
      {
        label,
        doneCount: 0,
        totalCount: 0,
      },
    ]),
  );

  reports.forEach((report) => {
    if (report.status !== REPORT_LABELS.done) {
      return;
    }

    const date = parseAdminLocalDateTime(report.handledAtValue);
    if (Number.isNaN(date.getTime())) return;
    if (date < range.start || date > range.end) return;

    const label = getTimelineLabel(date, period, range);
    if (!label || !countMap.has(label)) return;

    const bucket = countMap.get(label);
    bucket.totalCount += 1;
    bucket.doneCount += 1;
  });

  normalizeDayEndProcessRateBuckets(countMap);

  return [...countMap.values()].map((item) => ({
    ...item,
    rate: item.totalCount
      ? Math.round((item.doneCount / item.totalCount) * 100)
      : 0,
  }));
}

// 관리자 기능 담당 작업(문건우): 자유 입력된 신고 사유는 정규화 컬럼이 없어 관리자 통계에서 기타로 묶습니다.
function normalizeReportReason(reason) {
  const normalizedReason = String(reason || "").trim();

  return reasonOptions.includes(normalizedReason)
    ? normalizedReason
    : REPORT_LABELS.etc;
}

function countReportsByReason(reports, tabs) {
  return tabs.reduce((counts, tabLabel) => {
    counts[tabLabel] =
      tabLabel === REPORT_LABELS.all
        ? reports.length
        : reports.filter(
            (report) => normalizeReportReason(report.reason) === tabLabel,
          ).length;

    return counts;
  }, {});
}

function buildTimeline(reports, period, range) {
  const buckets = buildTimelineBuckets(period);

  reports.forEach((report) => {
    const date = parseAdminLocalDateTime(report.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const label = getTimelineLabel(date, period, range);
    if (label) {
      buckets.set(label, (buckets.get(label) || 0) + 1);
    }
  });

  normalizeDayEndTimelineBucket(buckets);

  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

function getTimelineLabel(date, period, range) {
  if (period === "day") {
    return String(getDayTimelineBucketHour(date));
  }

  if (period === "week") {
    const dayIndex = Math.floor(
      (startOfDay(date) - startOfDay(range.start)) / 86400000,
    );

    return ["\uC6D4", "\uD654", "\uC218", "\uBAA9", "\uAE08", "\uD1A0", "\uC77C"][dayIndex] || "";
  }

  return `${date.getMonth() + 1}\uC6D4`;
}

function getDayTimelineBucketHour(date) {
  return date.getHours();
}

function buildTimelineBuckets(period) {
  if (period === "day") {
    return new Map(
      Array.from({ length: 25 }, (_, hour) => hour).map((hour) => [
        String(hour),
        0,
      ]),
    );
  }

  if (period === "week") {
    return new Map(
      ["\uC6D4", "\uD654", "\uC218", "\uBAA9", "\uAE08", "\uD1A0", "\uC77C"].map(
        (label) => [label, 0],
      ),
    );
  }

  return new Map(
    Array.from({ length: 12 }, (_, index) => [`${index + 1}\uC6D4`, 0]),
  );
}

function normalizeDayEndTimelineBucket(buckets) {
  /*
   * 24시는 X축 종료 표시용 슬롯입니다.
   * 실제 23시 데이터와 중복되지 않도록 다른 시간대 값을 복사하지 않습니다.
   */
  return buckets;
}

function normalizeDayEndProcessRateBuckets(countMap) {
  /*
   * 처리율 추이도 24시를 종료 표시용 슬롯으로만 둡니다.
   * 실제 처리 건수와 중복 집계되지 않도록 다른 버킷 값을 복사하지 않습니다.
   */
  return countMap;
}

function filterReportsByType(reports, selectedTypeTab) {
  if (selectedTypeTab === REPORT_LABELS.all) {
    return reports;
  }

  return reports.filter((report) => report.type === selectedTypeTab);
}

function filterReportsByStatus(reports, selectedStatusTab) {
  if (selectedStatusTab === REPORT_LABELS.all) {
    return reports;
  }

  return reports.filter((report) => report.status === selectedStatusTab);
}

function countReportsByProcessResult(reports, resultTabs) {
  return resultTabs.reduce((counts, tabLabel) => {
    counts[tabLabel] =
      tabLabel === REPORT_LABELS.all
        ? reports.length
        : reports.filter((report) => report.sanctionResult?.actionLabel === tabLabel).length;
    return counts;
  }, {});
}

function filterAndSortSanctionHistories(
  histories,
  selectedType,
  searchKeyword,
  sortType,
) {
  const keyword = searchKeyword.trim().toLowerCase();
  const filteredByType =
    selectedType === REPORT_LABELS.all
      ? histories
      : histories.filter((report) => report.type === selectedType);
  const filteredByKeyword = keyword
    ? filteredByType.filter((report) =>
        [
          report.targetName,
          report.targetNickname,
          report.targetHandle,
          report.title,
          report.detail,
          report.targetContent,
          report.commentContent,
          report.reason,
          report.sanctionResult?.detail,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)),
      )
    : filteredByType;

  return [...filteredByKeyword].sort((a, b) => {
    const aTime = getReportSortTime(a);
    const bTime = getReportSortTime(b);

    return sortType === HISTORY_SORT_LABELS.old ? aTime - bTime : bTime - aTime;
  });
}

function filterReportsByRange(reports, range) {
  return reports.filter((report) => {
    const createdAt = parseAdminLocalDateTime(report.createdAt);
    return (
      !Number.isNaN(createdAt.getTime()) &&
      createdAt >= range.start &&
      createdAt <= range.end
    );
  });
}

function getInitialInsightPeriodFilter() {
  const today = new Date();

  return {
    selectedDate: formatDateInputValue(today),
    selectedWeekDate: formatDateInputValue(today),
    selectedYear: Math.max(SERVICE_START_YEAR, today.getFullYear()),
  };
}

function buildInsightPeriodRange(period, filter) {
  if (period === "week") {
    const selectedDate = parseDateInputValue(filter.selectedWeekDate);
    const start = startOfDay(selectedDate);
    const end = new Date(start);
    const mondayOffset = (start.getDay() + 6) % 7;

    start.setDate(start.getDate() - mondayOffset);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (period === "month") {
    const year = Number(filter.selectedYear) || new Date().getFullYear();
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    return { start, end };
  }

  const selectedDate = parseDateInputValue(filter.selectedDate);
  const start = startOfDay(selectedDate);
  const end = new Date(start);

  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function startOfDay(date) {
  const nextDate = new Date(date);

  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}
