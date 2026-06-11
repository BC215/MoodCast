import styles from "../../adminComponentsCss/common/SegmentedControl.module.css";

/* ==========================================================================
 * SegmentedControl 컴포넌트
 * --------------------------------------------------------------------------
 * 여러 선택지를 탭 버튼처럼 보여주는 컴포넌트입니다.
 *
 * 사용 예시:
 * - 대시보드: 일 / 주 / 월
 * - 사용자 관리: 전체 / 일반 회원 / 정지 회원 / 관리자
 *
 * props 설명:
 * - labels: 화면에 표시할 버튼 이름 배열입니다.
 * - selectedLabel: 현재 선택된 버튼 이름입니다.
 * - onSelect: 버튼을 클릭했을 때 부모 컴포넌트에 선택값을 알려주는 함수입니다.
 *
 * selectedLabel과 onSelect가 없으면 기존처럼 첫 번째 버튼만 선택된 것처럼 보입니다.
 * 이렇게 만든 이유는 대시보드, 사용자 관리, 콘텐츠 관리 등 여러 화면에서
 * 같은 탭 UI를 재사용하기 위해서입니다.
 * ========================================================================== */
export function SegmentedControl({ labels, selectedLabel, onSelect }) {
  return (
    <div className={styles.segmented}>
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          className={
            (selectedLabel ?? labels[0]) === label ||
            (!selectedLabel && index === 0)
              ? styles.selected
              : ""
          }
          onClick={() => onSelect?.(label)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
