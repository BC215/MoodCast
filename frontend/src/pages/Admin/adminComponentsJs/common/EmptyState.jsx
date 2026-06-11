import styles from "../../adminComponentsCss/common/EmptyState.module.css";

/* ==========================================================================
 * EmptyState 컴포넌트
 * --------------------------------------------------------------------------
 * 화면에 보여줄 데이터가 아직 없을 때 사용하는 안내 박스입니다.
 *
 * 지금 관리자 화면은 더미데이터를 넣지 않고 구조만 구현하는 단계이므로,
 * 테이블과 그래프 영역에 EmptyState를 넣어 "여기에 데이터가 들어올 예정"임을
 * 사용자와 개발자가 모두 알 수 있게 했습니다.
 *
 * props 설명:
 * - title: 굵게 보이는 안내 제목
 * - description: 제목 아래에 보이는 보조 설명
 * ========================================================================== */
export function EmptyState({ title, description }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
