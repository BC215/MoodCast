import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { EmptyState } from "../common/EmptyState";
import { formatKoreanDate } from "../../../../shared/lib/dateTime";
import styles from "../../adminComponentsCss/userManagement/UserManagementActionLogs.module.css";

const LOGS_PER_PAGE = 10; // 전체 로그 팝업에서 한 페이지에 보여줄 로그 개수입니다.
const PAGE_BUTTON_COUNT = 10; // 페이지 번호는 1~10처럼 최대 10개씩 보여줍니다.

/* ==========================================================================
 * 사용자 관리 권한 변경 로그 컴포넌트
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지 하단의 "권한 변경 로그" 영역을 담당합니다.
 *
 * 담당 기능:
 * - 페이지 하단에는 최근 로그 10개를 보여줍니다.
 * - "전체 로그 보기" 버튼을 누르면 전체 로그를 API로 조회합니다.
 * - 전체 로그 팝업에서는 10개씩 페이지네이션해서 보여줍니다.
 *
 * 초보자 설명:
 * - recentLogs는 부모 페이지가 management-summary API로 받은 최근 10개 로그입니다.
 * - allLogs는 이 컴포넌트가 "전체 로그 보기" 버튼을 눌렀을 때 직접 조회하는 전체 로그입니다.
 * - 최근 로그와 전체 로그를 분리하면, 페이지를 처음 열 때 불필요하게 많은 로그를 가져오지 않아도 됩니다.
 * ========================================================================== */
export function UserManagementActionLogs({
  isLoading,
  hasError,
  actionLogs,
  accessToken,
  backserver,
}) {
  const [isAllLogOpen, setIsAllLogOpen] = useState(false); // 전체 로그 팝업 열림 여부입니다.
  const [allLogs, setAllLogs] = useState([]); // 전체 로그 API에서 받은 로그 배열입니다.
  const [allLogsLoading, setAllLogsLoading] = useState(false); // 전체 로그 조회 중인지 표시합니다.
  const [allLogsError, setAllLogsError] = useState(false); // 전체 로그 조회 실패 여부입니다.
  const [currentLogPage, setCurrentLogPage] = useState(1); // 전체 로그 팝업의 현재 페이지 번호입니다.

  useEffect(() => {
    if (!isAllLogOpen) {
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
  }, [isAllLogOpen]);

  /* ------------------------------------------------------------------------
   * 로그 작업명 변환 함수
   * ------------------------------------------------------------------------
   * DB에는 SUSPEND, RESTORE 같은 영문 코드가 저장됩니다.
   * 화면에서는 "정지", "해제"처럼 관리자가 읽기 쉬운 한글 문구로 바꿔 보여줍니다.
   * ------------------------------------------------------------------------ */
  const getActionLabel = (logItem) => {
    if (logItem?.actionType === "SUSPEND") {
      return "정지";
    }

    if (logItem?.actionType === "RESTORE") {
      return "해제";
    }

    if (logItem?.actionType === "UPDATE_ADMIN_ROLE") {
      return logItem?.actionDetail?.includes("USER") ? "강등" : "승급";
    }

    return logItem?.actionType || "작업";
  };

  /* ------------------------------------------------------------------------
   * 작업 대상 회원 이름 변환 함수
   * ------------------------------------------------------------------------
   * 로그에 대상 회원 이름이 있으면 이름을 보여주고, 없으면 닉네임이나 targetId를 대신 보여줍니다.
   * soft delete 또는 조인 실패가 있어도 화면이 비어 보이지 않도록 하기 위한 방어 로직입니다.
   * ------------------------------------------------------------------------ */
  const getLogTargetName = (logItem) => {
    if (logItem?.targetName) {
      return logItem.targetName;
    }

    if (logItem?.targetNickname) {
      return `@${logItem.targetNickname}`;
    }

    return logItem?.targetId ? `삭제된 회원 #${logItem.targetId}` : "대상 없음";
  };

  /* ------------------------------------------------------------------------
   * 작업 관리자 이름 변환 함수
   * ------------------------------------------------------------------------
   * 어떤 관리자가 승급/강등/정지/해제를 했는지 보여주기 위한 함수입니다.
   * 관리자 이름이 없으면 닉네임, id 순서로 대체 표시합니다.
   * ------------------------------------------------------------------------ */
  const getLogAdminName = (logItem) => {
    if (logItem?.adminName) {
      return logItem.adminName;
    }

    if (logItem?.adminNickname) {
      return `@${logItem.adminNickname}`;
    }

    return logItem?.adminId ? `관리자 #${logItem.adminId}` : "관리자 정보 없음";
  };

  /* ------------------------------------------------------------------------
   * 전체 로그 조회 함수
   * ------------------------------------------------------------------------
   * "전체 로그 보기" 버튼을 누르면 실행됩니다.
   * 이미 불러온 로그가 있으면 다시 요청하지 않고 팝업만 엽니다.
   * ------------------------------------------------------------------------ */
  const fetchAllLogs = () => {
    setIsAllLogOpen(true);

    if (allLogs.length > 0 || allLogsLoading || !accessToken) {
      return;
    }

    setAllLogsLoading(true);
    setAllLogsError(false);

    axios
      .get(`${backserver}/admin/api/members/action-logs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => {
        const nextLogs = Array.isArray(res.data?.actionLogs)
          ? res.data.actionLogs
          : [];

        setAllLogs(nextLogs);
        setCurrentLogPage(1);
      })
      .catch(() => {
        setAllLogs([]);
        setAllLogsError(true);
      })
      .finally(() => {
        setAllLogsLoading(false);
      });
  };

  /* ------------------------------------------------------------------------
   * 전체 로그 팝업 페이지네이션 계산
   * ------------------------------------------------------------------------
   * allLogs 전체 배열 중 현재 페이지에 보여줄 10개만 잘라냅니다.
   * useMemo는 allLogs/currentLogPage가 바뀔 때만 계산하게 해주는 React 도구입니다.
   * ------------------------------------------------------------------------ */
  const paginatedLogInfo = useMemo(() => {
    const totalPageCount = Math.max(1, Math.ceil(allLogs.length / LOGS_PER_PAGE));
    const pageStartIndex = (currentLogPage - 1) * LOGS_PER_PAGE;
    const paginatedLogs = allLogs.slice(
      pageStartIndex,
      pageStartIndex + LOGS_PER_PAGE,
    );
    const pageGroupStart =
      Math.floor((currentLogPage - 1) / PAGE_BUTTON_COUNT) * PAGE_BUTTON_COUNT +
      1;
    const pageGroupEnd = Math.min(
      pageGroupStart + PAGE_BUTTON_COUNT - 1,
      totalPageCount,
    );
    const pageNumbers = Array.from(
      { length: pageGroupEnd - pageGroupStart + 1 },
      (_, index) => pageGroupStart + index,
    );

    return {
      totalPageCount,
      paginatedLogs,
      pageNumbers,
    };
  }, [allLogs, currentLogPage]);

  const renderLogItems = (logs) => (
    <div className={styles.actionLogList}>
      {logs.map((logItem) => (
        <article className={styles.actionLogItem} key={logItem.logId}>
          <span className={styles.actionLogBadge}>{getActionLabel(logItem)}</span>

          <div className={styles.actionLogBody}>
            <strong>{getLogTargetName(logItem)}</strong>
            <p>{logItem.actionDetail || "작업 상세 내용 없음"}</p>
            <small>
              작업 관리자: {getLogAdminName(logItem)} ·{" "}
              {formatKoreanDate(logItem.createdAt)}
            </small>
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>권한 변경 로그</h2>
          <button
            type="button"
            className={styles.secondaryActionButton}
            onClick={fetchAllLogs}
          >
            전체 로그 보기
          </button>
        </div>

        {/* API 요청이 진행 중일 때 보여주는 상태입니다. */}
        {isLoading ? (
          <EmptyState
            title="로그 조회 중"
            description="최근 권한 변경 및 제재 이력을 불러오고 있습니다."
          />
        ) : hasError ? (
          <EmptyState
            title="로그 조회 실패"
            description="권한 변경 및 제재 이력을 불러오지 못했습니다."
          />
        ) : actionLogs.length === 0 ? (
          <EmptyState
            title="변경 내역 없음"
            description="승급, 강등, 정지, 해제 이력이 생기면 최신순으로 표시됩니다."
          />
        ) : (
          renderLogItems(actionLogs)
        )}
      </section>

      {isAllLogOpen && (
        <div className={styles.logModalLayer}>
          <button
            type="button"
            className={styles.logModalDim}
            aria-label="전체 로그 보기 닫기"
            onClick={() => setIsAllLogOpen(false)}
          />

          <section className={styles.logModalPanel}>
            <div className={styles.panelHead}>
              <h2>전체 권한 변경 로그</h2>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => setIsAllLogOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className={styles.logModalBody}>
              {allLogsLoading ? (
                <EmptyState
                  title="전체 로그 조회 중"
                  description="승급, 강등, 정지, 해제 전체 이력을 불러오고 있습니다."
                />
              ) : allLogsError ? (
                <EmptyState
                  title="전체 로그 조회 실패"
                  description="백엔드 응답을 확인해주세요."
                />
              ) : allLogs.length === 0 ? (
                <EmptyState
                  title="전체 로그 없음"
                  description="아직 기록된 권한 변경 또는 제재 이력이 없습니다."
                />
              ) : (
                renderLogItems(paginatedLogInfo.paginatedLogs)
              )}
            </div>

            {!allLogsLoading && !allLogsError && allLogs.length > 0 && (
              <nav
                className={styles.pagination}
                aria-label="전체 권한 변경 로그 페이지 이동"
              >
                <div className={styles.paginationButtons}>
                  <button
                    type="button"
                    disabled={currentLogPage === 1}
                    onClick={() =>
                      setCurrentLogPage((page) => Math.max(1, page - 1))
                    }
                  >
                    이전
                  </button>

                  {paginatedLogInfo.pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={
                        pageNumber === currentLogPage ? styles.activePage : ""
                      }
                      aria-current={
                        pageNumber === currentLogPage ? "page" : undefined
                      }
                      onClick={() => setCurrentLogPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={
                      currentLogPage === paginatedLogInfo.totalPageCount
                    }
                    onClick={() =>
                      setCurrentLogPage((page) =>
                        Math.min(paginatedLogInfo.totalPageCount, page + 1),
                      )
                    }
                  >
                    다음
                  </button>
                </div>
              </nav>
            )}
          </section>
        </div>
      )}
    </>
  );
}
