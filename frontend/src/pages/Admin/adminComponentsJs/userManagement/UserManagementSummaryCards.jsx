import { formatKoreanDate } from "../../../../shared/lib/dateTime";
import styles from "../../adminComponentsCss/userManagement/UserManagementSummaryCards.module.css";

/* ==========================================================================
 * 사용자 관리 하단 요약 카드 컴포넌트
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지 하단의 "전체 회원 비율"과 "회원 관리 정보" 영역입니다.
 *
 * 초보자 설명:
 * - 부모 컴포넌트(UserManagementPage.jsx)가 API로 받은 데이터를 props로 넘겨줍니다.
 * - 이 컴포넌트는 받은 데이터를 원형 그래프와 텍스트 정보로 보여주는 역할만 합니다.
 * - 정지 회원은 role과 별개로 status가 SUSPENDED인 회원이기 때문에,
 *   일반 회원/관리자 수와 겹쳐서 계산될 수 있습니다.
 * - 그래서 그래프는 "전체 회원 수"를 기준으로 각 항목의 비율을 계산합니다.
 * ========================================================================== */
export function UserManagementSummaryCards({
  isLoading,
  hasError,
  totalMemberCount,
  normalMemberCount,
  adminMemberCount,
  suspendedMemberCount,
  latestJoinedMember,
  latestSanctionedMember,
}) {
  const safeTotalMemberCount = Math.max(Number(totalMemberCount || 0), 0);
  const safeNormalMemberCount = Math.max(Number(normalMemberCount || 0), 0);
  const safeAdminMemberCount = Math.max(Number(adminMemberCount || 0), 0);
  const safeSuspendedMemberCount = Math.max(
    Number(suspendedMemberCount || 0),
    0,
  );

  /*
   * 원형 그래프용 회원 수 보정
   * ------------------------------------------------------------------------
   * DB 기준으로는 정지 회원도 role 값을 그대로 가집니다.
   * 그래서 일반 회원 수 + 관리자 수가 이미 전체 회원 수와 같아질 수 있고,
   * 여기에 정지 회원 수를 세 번째 구간으로 추가하면 앞의 두 구간이 100%를 채워
   * 정지 회원 색상이 그래프에 보이지 않는 문제가 생깁니다.
   *
   * 화면의 "전체 회원 비율" 그래프에서는 정지 회원을 별도 구간으로 보여줘야 하므로,
   * 그래프를 그릴 때만 정지 회원 수를 일반/관리자 구간에서 먼저 빼서
   * 일반 + 관리자 + 정지 = 전체 회원 수가 되도록 맞춥니다.
   *
   * 현재 정책상 관리자가 관리자를 정지할 수 없고, 보통 정지는 일반 회원에게
   * 적용되므로 일반 회원 수에서 먼저 차감합니다. 일반 회원 수보다 정지 회원 수가
   * 더 큰 비정상 데이터가 들어와도 남은 수만 관리자 구간에서 한 번 더 차감합니다.
   */
  const chartSuspendedCount = Math.min(
    safeSuspendedMemberCount,
    safeTotalMemberCount,
  );
  const suspendedTakenFromNormal = Math.min(
    safeNormalMemberCount,
    chartSuspendedCount,
  );
  const suspendedRemainingAfterNormal =
    chartSuspendedCount - suspendedTakenFromNormal;
  const chartNormalMemberCount =
    safeNormalMemberCount - suspendedTakenFromNormal;
  const chartAdminMemberCount = Math.max(
    safeAdminMemberCount - suspendedRemainingAfterNormal,
    0,
  );

  const getChartPercent = (count) => {
    if (!safeTotalMemberCount) {
      return 0;
    }

    return Math.round((Number(count || 0) / safeTotalMemberCount) * 100);
  };

  const memberRatioItems = [
    {
      label: "일반 회원",
      count: chartNormalMemberCount,
      color: "#7c4dff",
      percent: getChartPercent(chartNormalMemberCount),
    },
    {
      label: "관리자",
      count: chartAdminMemberCount,
      color: "#12b76a",
      percent: getChartPercent(chartAdminMemberCount),
    },
    {
      label: "정지 회원",
      count: chartSuspendedCount,
      color: "#f04438",
      percent: getChartPercent(chartSuspendedCount),
    },
  ];

  /*
   * conic-gradient 구간 계산
   * ------------------------------------------------------------------------
   * CSS 원형 그래프는 0%부터 100%까지 색을 이어 붙이는 방식입니다.
   * 정지 회원 비율이 그래프에 빠지지 않도록 세 번째 구간까지 누적해서 넣습니다.
   */
  const firstRatioEnd = memberRatioItems[0].percent;
  const secondRatioEnd = firstRatioEnd + memberRatioItems[1].percent;
  const thirdRatioEnd = Math.min(
    100,
    secondRatioEnd + memberRatioItems[2].percent,
  );
  const ratioChartStyle = {
    background:
      safeTotalMemberCount > 0
        ? `conic-gradient(
            ${memberRatioItems[0].color} 0% ${firstRatioEnd}%,
            ${memberRatioItems[1].color} ${firstRatioEnd}% ${secondRatioEnd}%,
            ${memberRatioItems[2].color} ${secondRatioEnd}% ${thirdRatioEnd}%,
            #eef2f6 ${thirdRatioEnd}% 100%
          )`
        : "#eef2f6",
  };

  const getMemberDisplayName = (memberItem, fallbackId) => {
    if (!memberItem) {
      return fallbackId ? `회원 #${fallbackId}` : "회원 정보 없음";
    }

    if (memberItem.name) {
      return memberItem.name;
    }

    if (memberItem.nickname) {
      return `@${memberItem.nickname}`;
    }

    return memberItem.memberId
      ? `회원 #${memberItem.memberId}`
      : "회원 정보 없음";
  };

  return (
    <section className={styles.infoGrid}>
      <article className={styles.infoBox}>
        <strong>전체 회원 비율</strong>

        {isLoading && safeTotalMemberCount === 0 ? (
          <p>회원 비율을 불러오는 중입니다.</p>
        ) : (
          <>
            {hasError && (
              <p className={styles.summaryNotice}>
                요약 API 조회 실패로 현재 회원 목록 기준 비율을 표시합니다.
              </p>
            )}

            <div className={styles.ratioContent}>
              <div className={styles.ratioChart} style={ratioChartStyle}>
                <div className={styles.ratioChartCenter}>
                  <span>전체</span>
                  <strong>{safeTotalMemberCount.toLocaleString()}</strong>
                </div>
              </div>

              <ul className={styles.ratioLegend}>
                {memberRatioItems.map((ratioItem) => (
                  <li key={ratioItem.label}>
                    <span
                      className={styles.ratioDot}
                      style={{ backgroundColor: ratioItem.color }}
                    />
                    <span>{ratioItem.label}</span>
                    <strong>
                      {Number(ratioItem.count || 0).toLocaleString()}명 ·{" "}
                      {ratioItem.percent}%
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </article>

      <article className={styles.infoBox}>
        <strong>회원 관리 정보</strong>

        {isLoading ? (
          <p>회원 관리 정보를 불러오는 중입니다.</p>
        ) : (
          <>
            {hasError && (
              <p className={styles.summaryNotice}>
                요약 API 조회 실패로 일부 정보가 목록 기준으로 표시됩니다.
              </p>
            )}

            <div className={styles.memberInfoList}>
              <div className={styles.memberInfoItem}>
                <span>최근 가입 회원</span>
                <strong>{getMemberDisplayName(latestJoinedMember)}</strong>
                <small>
                  {latestJoinedMember?.createdAt
                    ? formatKoreanDate(latestJoinedMember.createdAt)
                    : "가입 정보 없음"}
                </small>
              </div>

              <div className={styles.memberInfoItem}>
                <span>최근 제재 회원</span>
                <strong>
                  {getMemberDisplayName(
                    latestSanctionedMember,
                    latestSanctionedMember?.memberId,
                  )}
                </strong>
                <small>
                  {latestSanctionedMember?.createdAt
                    ? `${formatKoreanDate(latestSanctionedMember.createdAt)} · ${
                        latestSanctionedMember.actionDetail || "제재 기록"
                      }`
                    : "제재 기록 없음"}
                </small>
              </div>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
