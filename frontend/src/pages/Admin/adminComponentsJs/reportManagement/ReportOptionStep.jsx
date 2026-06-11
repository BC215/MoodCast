import { sanctionOptions } from "./reportConstants";
import { DrawerHeader } from "./ReportDrawerHeader";
import styles from "../../adminComponentsCss/reportManagement/ReportOptionStep.module.css";

export function ReportOptionStep({
  selectedAction,
  onBack,
  onClose,
  onSelectAction,
  onNext,
}) {
  return (
    <>
      <DrawerHeader
        title="처리 옵션 선택"
        onBack={onBack}
        onClose={onClose}
      />

      <div className={styles.drawerBody}>
        <p className={styles.guideText}>
          {
            "\uC120\uD0DD\uD55C \uC2E0\uACE0\uB97C \uC5B4\uB5A4 \uBC29\uC2DD\uC73C\uB85C \uCC98\uB9AC\uD560\uC9C0 \uC120\uD0DD\uD574\uC8FC\uC138\uC694."
          }
        </p>

        <section className={styles.optionList}>
          {sanctionOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedAction === option.id;

            return (
              <button
                key={option.id}
                className={`${styles.optionCard} ${styles[option.tone]} ${isSelected ? styles.selectedOption : ""}`}
                type="button"
                onClick={() => onSelectAction(option.id)}
              >
                <Icon />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </section>

        <section className={styles.noticeBox}>
          <strong>{"\uC548\uB0B4"}</strong>
          <p>
            {
              "\uC81C\uC7AC\uB97C \uC801\uC6A9\uD558\uAE30 \uC804\uC5D0 \uC2E0\uACE0 \uB0B4\uC6A9\uACFC \uC99D\uAC70\uB97C \uCDA9\uBD84\uD788 \uAC80\uD1A0\uD574\uC8FC\uC138\uC694."
            }
          </p>
          <p>
            {
              "\uC798\uBABB\uB41C \uC81C\uC7AC\uB294 \uC0AC\uC6A9\uC790 \uACBD\uD5D8\uC5D0 \uBD80\uC815\uC801\uC778 \uC601\uD5A5\uC744 \uC904 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
            }
          </p>
        </section>
      </div>

      <footer className={styles.drawerFooter}>
        <button className={styles.secondaryButton} type="button" onClick={onBack}>
          {"\uCDE8\uC18C"}
        </button>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={!selectedAction}
          onClick={onNext}
        >
          {"\uB2E4\uC74C"}
        </button>
      </footer>
    </>
  );
}
