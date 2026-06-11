import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { todayText } from "./reportConstants";
import { DrawerHeader } from "./ReportDrawerHeader";
import styles from "../../adminComponentsCss/reportManagement/ReportConfirmStep.module.css";

export function ReportConfirmStep({
  report,
  actionMeta,
  selectedReason,
  reasonDetail,
  selectedPeriod,
  customPeriod,
  releaseDate,
  hideTargetContent,
  onBack,
  onClose,
  onConfirm,
}) {
  const periodLabel =
    selectedPeriod === "custom"
      ? `${customPeriod || 0}일`
      : `${selectedPeriod}일`;
  const isTemporary = actionMeta?.id === "temporary";
  const isReject = actionMeta?.id === "reject";

  return (
    <>
      <DrawerHeader
        title="처리 내용 확인"
        onBack={onBack}
        onClose={onClose}
      />

      <div className={styles.drawerBody}>
        <p className={styles.guideText}>
          아래 내용을 확인하고 신고 처리를 최종 확정해주세요.
        </p>

        <section className={styles.confirmTarget}>
          <div className={styles.profileThumb}>
            <PersonOutlineOutlinedIcon />
          </div>
          <div>
            <strong>{report.targetName}</strong>
            <span>{report.targetHandle}</span>
          </div>
          <dl>
            <div>
              <dt>신고 수</dt>
              <dd>{report.reportCount}건</dd>
            </div>
            <div>
              <dt>가입일</dt>
              <dd>{report.joinedAt}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.confirmTable}>
          <h3>처리 사유</h3>
          <dl>
            <div>
              <dt>{isReject ? "처리 유형" : "제재 사유"}</dt>
              <dd>{isReject ? "반려" : selectedReason}</dd>
            </div>
            <div>
              <dt>상세 설명</dt>
              <dd>
                {isReject
                  ? "신고가 부적절하다고 판단되어 반려합니다."
                  : reasonDetail || report.detail}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.confirmTable}>
          <h3>처리 내용</h3>
          <dl>
            <div>
              <dt>{isReject ? "처리 유형" : "제재 유형"}</dt>
              <dd>{actionMeta?.label}</dd>
            </div>
            {isTemporary && (
              <>
                <div>
                  <dt>정지 기간</dt>
                  <dd>{periodLabel}</dd>
                </div>
                <div>
                  <dt>시작 시간</dt>
                  <dd>{todayText}</dd>
                </div>
                <div>
                  <dt>예상 해제 시간</dt>
                  <dd>{releaseDate}</dd>
                </div>
                <div>
                  <dt>적용 범위</dt>
                  <dd>로그인 및 서비스 이용 제한</dd>
                </div>
                <div>
                  <dt>콘텐츠 상태</dt>
                  <dd>{hideTargetContent ? "신고 대상 숨김" : "신고 대상 공개 유지"}</dd>
                </div>
              </>
            )}
            {!isTemporary && (
              <div>
                <dt>처리 내용</dt>
                <dd>
                  {actionMeta?.id === "warning" &&
                    "사용자 경고 횟수를 증가시킵니다."}
                  {actionMeta?.id === "permanent" &&
                    "해당 사용자의 계정을 영구 정지합니다."}
                  {actionMeta?.id === "reject" &&
                    "신고가 부적절하다고 판단하여 반려합니다."}
                </dd>
              </div>
            )}
            {!isReject && !isTemporary && (
              <div>
                <dt>콘텐츠 상태</dt>
                <dd>{hideTargetContent ? "신고 대상 숨김" : "신고 대상 공개 유지"}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={styles.warningBox}>
          <ErrorOutlineOutlinedIcon />
          <div>
            <strong>{actionMeta?.label} 처리를 적용합니다.</strong>
            <p>
              처리 확정 후에는 이력이 남으므로 신중하게 결정해주세요.
            </p>
          </div>
        </section>
      </div>

      <footer className={styles.drawerFooter}>
        <button className={styles.secondaryButton} type="button" onClick={onBack}>
          취소
        </button>
        <button className={styles.primaryButton} type="button" onClick={onConfirm}>
          처리 확정
        </button>
      </footer>
    </>
  );
}
