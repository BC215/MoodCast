import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { EmptyState } from "../common/EmptyState";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { formatKoreanDate } from "../../../../shared/lib/dateTime";
import styles from "../../adminComponentsCss/dashboard/DashboardRecentActivities.module.css";

const ACTIVITY_PAGE_SIZE = 10;
const DASHBOARD_POLLING_INTERVAL_MS = 10000;

const activityLabelMap = {
  JOIN: "가입",
  JOINED: "가입",
  DELETE: "탈퇴",
  DELETED: "탈퇴",
  SUSPEND: "정지",
  SUSPENDED: "정지",
  RESTORE: "해제",
  RESTORED: "해제",
  ROLE_CHANGED: "권한",
  NOTICE_CREATED: "공지 작성",
  NOTICE_UPDATED: "공지 수정",
  NOTICE_DELETED: "공지 삭제",
};

/* ==========================================================================
 * 최근 활동 컴포넌트
 * --------------------------------------------------------------------------
 * 최근 가입/탈퇴/정지/정지 해제 활동을 10개까지 보여주고,
 * 전체 보기 모달에서 전체 로그를 페이지네이션으로 확인할 수 있게 합니다.
 *
 * 초보자 설명:
 * - recentActivities는 대시보드 카드에 바로 보여줄 최근 10개 데이터입니다.
 * - allActivities는 "전체 보기" 버튼을 눌렀을 때 모달에 표시할 전체 데이터입니다.
 * - modalPage는 전체 보기 모달의 현재 페이지 번호입니다.
 * ========================================================================== */
export function DashboardRecentActivities() {
  const [recentActivities, setRecentActivities] = useState([]); // 화면 카드에 보여줄 최근 활동입니다.
  const [allActivities, setAllActivities] = useState([]); // 전체 보기 모달에 사용할 활동 목록입니다.
  const [isLoading, setIsLoading] = useState(false); // 최근 활동 API 호출 중인지 표시합니다.
  const [hasError, setHasError] = useState(false); // 최근 활동 API 호출 실패 여부입니다.
  const [isModalOpen, setIsModalOpen] = useState(false); // 전체 보기 모달 열림 여부입니다.
  const [modalLoading, setModalLoading] = useState(false); // 전체 활동 API 호출 중인지 표시합니다.
  const [modalPage, setModalPage] = useState(1); // 전체 보기 모달의 현재 페이지입니다.
  const { accessToken } = useAuthStore(); // 관리자 API 호출에 필요한 로그인 토큰입니다.

  const BACKSERVER = (
    import.meta.env.VITE_BACKSERVER || "http://localhost:8080"
  ).replace(/\/$/, "");

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    /*
     * 관리자 기능 담당 작업(문건우): 최근 활동은 새 가입/정지/권한 변경처럼 자주 바뀔 수 있어 10초마다 재조회합니다.
     * 첫 조회 때만 로딩 화면을 보여주고, 이후 자동 갱신 때는 기존 목록을 유지한 채 조용히 새 데이터로 교체합니다.
     * 컴포넌트가 닫히면 clearInterval로 폴링을 멈춰 불필요한 API 요청을 막습니다.
     */
    const fetchRecentActivities = ({ showLoading = false } = {}) => {
      if (showLoading) {
        setIsLoading(true);
      }
      setHasError(false);

      axios
        .get(`${BACKSERVER}/admin/api/dashboard/recent-activities`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .then((res) => {
          setRecentActivities(
            Array.isArray(res.data?.activities) ? res.data.activities : [],
          );
        })
        .catch(() => {
          if (showLoading) {
            setRecentActivities([]);
            setHasError(true);
          }
        })
        .finally(() => {
          if (showLoading) {
            setIsLoading(false);
          }
        });
    };

    fetchRecentActivities({ showLoading: true });

    const pollingId = window.setInterval(
      fetchRecentActivities,
      DASHBOARD_POLLING_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(pollingId);
    };
  }, [BACKSERVER, accessToken]);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isModalOpen]);

  const totalModalPage = Math.max(
    1,
    Math.ceil(allActivities.length / ACTIVITY_PAGE_SIZE),
  );

  const paginatedModalActivities = useMemo(() => {
    const startIndex = (modalPage - 1) * ACTIVITY_PAGE_SIZE;

    return allActivities.slice(startIndex, startIndex + ACTIVITY_PAGE_SIZE);
  }, [allActivities, modalPage]);

  const getActivityLabel = (activityType) => {
    return activityLabelMap[activityType] || activityType || "활동";
  };

  const getActivityTitle = (activity) => {
    if (String(activity.activityType || "").startsWith("NOTICE_")) {
      const adminName =
        activity.adminName ||
        activity.memberName ||
        activity.adminNickname ||
        "관리자";

      return `${activity.activityDetail || "공지사항 처리"} · 처리 관리자: ${adminName}`;
    }

    const memberName =
      activity.memberName ||
      activity.memberNickname ||
      (activity.memberId ? `회원 #${activity.memberId}` : "회원 정보 없음");
    const adminText = activity.adminName
      ? ` · 처리 관리자: ${activity.adminName}`
      : "";

    const detailText =
      activity.activityType === "ROLE_CHANGED" && activity.activityDetail
        ? ` · ${activity.activityDetail}`
        : "";

    return `${memberName}${adminText}${detailText}`;
  };

  const openAllActivities = () => {
    if (!accessToken) {
      return;
    }

    setIsModalOpen(true);
    setModalLoading(true);
    setModalPage(1);

    axios
      .get(`${BACKSERVER}/admin/api/dashboard/activities`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => {
        setAllActivities(
          Array.isArray(res.data?.activities) ? res.data.activities : [],
        );
      })
      .catch(() => {
        setAllActivities([]);
      })
      .finally(() => {
        setModalLoading(false);
      });
  };

  const renderActivityList = (activities) => {
    if (activities.length === 0) {
      return (
        <EmptyState
          title="활동 없음"
          description="표시할 최근 활동이 없습니다."
        />
      );
    }

    return (
      <ul className={styles.activityList}>
        {activities.map((activity, index) => (
          <li
            className={styles.activityItem}
            key={`${activity.activityType}-${activity.memberId}-${activity.createdAt}-${index}`}
          >
            <span className={styles.activityBadge}>
              {getActivityLabel(activity.activityType)}
            </span>
            <div className={styles.activityBody}>
              <strong>{getActivityTitle(activity)}</strong>
              <small>
                {activity.createdAt
                  ? formatKoreanDate(activity.createdAt)
                  : "날짜 정보 없음"}
              </small>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>최근 활동</h2>
        <button
          className={styles.textButton}
          type="button"
          onClick={openAllActivities}
        >
          전체 보기
        </button>
      </div>

      {isLoading ? (
        <EmptyState title="조회 중" description="최근 활동을 불러오고 있습니다." />
      ) : hasError ? (
        <EmptyState
          title="조회 실패"
          description="최근 활동 데이터를 불러오지 못했습니다."
        />
      ) : (
        renderActivityList(recentActivities)
      )}

      {isModalOpen && (
        <div className={styles.activityModalLayer} role="presentation">
          <button
            className={styles.activityModalDim}
            type="button"
            aria-label="전체 활동 닫기"
            onClick={() => setIsModalOpen(false)}
          />
          <section
            className={styles.activityModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-activity-modal-title"
          >
            <div className={styles.activityModalHead}>
              <h2 id="dashboard-activity-modal-title">전체 활동</h2>
              <button
                className={styles.activityModalClose}
                type="button"
                aria-label="닫기"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            {modalLoading ? (
              <EmptyState
                title="조회 중"
                description="전체 활동을 불러오고 있습니다."
              />
            ) : (
              <>
                <div className={styles.activityModalBody}>
                  {renderActivityList(paginatedModalActivities)}
                </div>

                <div className={styles.modalPagination}>
                  <button
                    type="button"
                    disabled={modalPage === 1}
                    onClick={() =>
                      setModalPage((page) => Math.max(1, page - 1))
                    }
                  >
                    이전
                  </button>
                  <span>
                    {modalPage} / {totalModalPage}
                  </span>
                  <button
                    type="button"
                    disabled={modalPage === totalModalPage}
                    onClick={() =>
                      setModalPage((page) =>
                        Math.min(totalModalPage, page + 1),
                      )
                    }
                  >
                    다음
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
