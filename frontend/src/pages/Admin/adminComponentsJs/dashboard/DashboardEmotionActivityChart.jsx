import { useEffect, useState } from "react";
import axios from "axios";
import { EmptyState } from "../common/EmptyState";
import { AdminPeriodRangeControl } from "../common/AdminPeriodRangeControl";
import { SegmentedControl } from "../common/SegmentedControl";
import { useAuthStore } from "../../../../stores/useAuthStore";
import styles from "../../adminComponentsCss/dashboard/DashboardEmotionActivityChart.module.css";

const periodApiValue = {
  일: "day",
  주: "week",
  월: "month",
};

const DASHBOARD_POLLING_INTERVAL_MS = 10000;

const emotionMeta = {
  1: { label: "행복", color: "#FFD700" },
  2: { label: "슬픔", color: "#4A90E2" },
  3: { label: "차분함", color: "#F4A460" },
  4: { label: "화남", color: "#E74C3C" },
  5: { label: "신남", color: "#FF69B4" },
  6: { label: "무감정", color: "#95A5A6" },
};

/* ==========================================================================
 * 감정별 활동 분포 그래프
 * --------------------------------------------------------------------------
 * 게시글 작성 시 선택된 감정 값을 기준으로 일/주/월 단위 활동량을 막대 그래프로
 * 보여주는 컴포넌트입니다.
 *
 * 초보자 설명:
 * - activePeriod는 현재 선택된 기간 탭입니다.
 * - emotionItems는 백엔드에서 받은 감정별 게시글 수 목록입니다.
 * - 막대 길이는 가장 큰 값(maxActivityCount)을 기준으로 비율을 계산합니다.
 * ========================================================================== */
export function DashboardEmotionActivityChart() {
  const [activePeriod, setActivePeriod] = useState("일"); // 일/주/월 중 선택된 탭입니다.
  const [emotionItems, setEmotionItems] = useState([]); // 백엔드에서 받은 감정별 활동 목록입니다.
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" }); // 기간 지정 조회에 사용할 시작일/종료일입니다.
  const [isLoading, setIsLoading] = useState(false); // API 호출 중인지 표시합니다.
  const [hasError, setHasError] = useState(false); // API 호출 실패 여부입니다.
  const { accessToken } = useAuthStore(); // 관리자 API 호출에 필요한 로그인 토큰입니다.

  const BACKSERVER = (
    import.meta.env.VITE_BACKSERVER || "/api"
  ).replace(/\/$/, "");

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    /*
     * 관리자 기능 담당 작업(문건우): 감정별 활동 분포는 게시글 작성에 따라 값이 바뀌므로 10초마다 API를 다시 조회합니다.
     * 기간 탭이나 날짜 범위가 바뀌면 기존 폴링을 정리하고, 새 조건으로 다시 10초 폴링을 시작합니다.
     */
    const fetchEmotionActivity = ({ showLoading = false } = {}) => {
      if (showLoading) {
        setIsLoading(true);
      }
      setHasError(false);

      axios
        .get(`${BACKSERVER}/admin/api/dashboard/emotion-activity`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            period: periodApiValue[activePeriod],
            ...dateRange,
          },
        })
        .then((res) => {
          setEmotionItems(Array.isArray(res.data?.items) ? res.data.items : []);
        })
        .catch(() => {
          if (showLoading) {
            setEmotionItems([]);
            setHasError(true);
          }
        })
        .finally(() => {
          if (showLoading) {
            setIsLoading(false);
          }
        });
    };

    fetchEmotionActivity({ showLoading: true });

    const pollingId = window.setInterval(
      fetchEmotionActivity,
      DASHBOARD_POLLING_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(pollingId);
    };
  }, [BACKSERVER, accessToken, activePeriod, dateRange]);

  const maxActivityCount = Math.max(
    ...emotionItems.map((item) => Number(item.activityCount ?? 0)),
    1,
  );
  const emotionCountMap = emotionItems.reduce((countMap, item) => {
    countMap[String(item.emotionId)] = Number(item.activityCount ?? 0);
    return countMap;
  }, {});
  const displayEmotionItems = Object.entries(emotionMeta).map(
    ([emotionId, meta]) => ({
      emotionId,
      activityCount: emotionCountMap[emotionId] ?? 0,
      ...meta,
    }),
  );

  return (
    <section className={`${styles.panel} ${styles.widePanel}`}>
      <div className={styles.panelHead}>
        <h2>감정별 활동 분포</h2>
        <div className={styles.panelControls}>
          <SegmentedControl
            labels={["일", "주", "월"]}
            selectedLabel={activePeriod}
            onSelect={setActivePeriod}
          />
          <AdminPeriodRangeControl
            period={periodApiValue[activePeriod]}
            onRangeChange={setDateRange}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.emptyChartState}>
          <EmptyState title="조회 중" description="감정별 활동을 불러오고 있습니다." />
        </div>
      ) : hasError ? (
        <div className={styles.emptyChartState}>
          <EmptyState
            title="조회 실패"
            description="감정별 활동 데이터를 불러오지 못했습니다."
          />
        </div>
      ) : (
        <div className={styles.barChart}>
          {displayEmotionItems.map((item) => {
            const activityCount = Number(item.activityCount ?? 0);
            const widthPercent =
              activityCount === 0
                ? 0
                : Math.max(
                    4,
                    Math.round((activityCount / maxActivityCount) * 100),
                  );

            return (
              <div className={styles.barRow} key={item.emotionId}>
                <span className={styles.barLabel}>{item.label}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </span>
                <strong className={styles.barValue}>
                  {activityCount.toLocaleString()}
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
