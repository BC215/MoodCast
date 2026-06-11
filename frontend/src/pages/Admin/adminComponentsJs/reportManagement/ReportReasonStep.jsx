import { reasonOptions } from "./reportConstants";
import { DrawerHeader } from "./ReportDrawerHeader";
import styles from "../../adminComponentsCss/reportManagement/ReportReasonStep.module.css";

export function ReportReasonStep({
  actionMeta,
  selectedReason,
  reasonDetail,
  hideTargetContent,
  onBack,
  onClose,
  onChangeReason,
  onChangeDetail,
  onChangeHideTargetContent,
  onNext,
}) {
  return (
    <>
      <DrawerHeader
        title={`${actionMeta?.label || "제재"} 사유 설정`}
        onBack={onBack}
        onClose={onClose}
      />

      <div className={styles.drawerBody}>
        <p className={styles.guideText}>
          관리자가 어떤 이유로 처리했는지 확인할 수 있도록 사유를 남깁니다.
        </p>

        <section className={styles.formSection}>
          <label htmlFor="reason-select">제재 사유 *</label>
          <select
            id="reason-select"
            value={selectedReason}
            onChange={(event) => onChangeReason(event.target.value)}
          >
            {reasonOptions.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
        </section>

        <section className={styles.formSection}>
          <label htmlFor="reason-detail">상세 설명</label>
          <textarea
            id="reason-detail"
            maxLength={200}
            placeholder="추가 설명을 입력하세요."
            value={reasonDetail}
            onChange={(event) => onChangeDetail(event.target.value)}
          />
          <small>{reasonDetail.length}/200</small>
        </section>

        <label className={styles.hideOption}>
          <input
            type="checkbox"
            checked={hideTargetContent}
            onChange={(event) => onChangeHideTargetContent(event.target.checked)}
          />
          <span>
            <strong>숨김</strong>
            <small>체크하면 신고 대상 게시글 또는 댓글을 숨김 처리합니다.</small>
          </span>
        </label>
      </div>

      <footer className={styles.drawerFooter}>
        <button className={styles.secondaryButton} type="button" onClick={onBack}>
          이전
        </button>
        <button className={styles.primaryButton} type="button" onClick={onNext}>
          다음
        </button>
      </footer>
    </>
  );
}
