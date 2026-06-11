import styles from "../../adminComponentsCss/common/MetricCard.module.css";

/* ==========================================================================
 * MetricCard 컴포넌트
 * --------------------------------------------------------------------------
 * 회원수, 신규 가입자, 게시글 수처럼 "핵심 숫자"를 보여주는 카드입니다.
 *
 * props 설명:
 * - label: 카드 제목입니다. 예: "회원수"
 * - value: 카드 가운데 크게 표시할 값입니다. 값을 넘기지 않으면 "-"가 표시됩니다.
 * - helperText: 값 아래에 표시할 보조 설명입니다.
 * - icon: 오른쪽 위에 표시할 아이콘입니다.
 * - accent: 아이콘 배경 색상을 바꾸기 위한 이름입니다. 예: "blue", "pink"
 *
 * 기존 화면 보호:
 * - value와 helperText는 선택 값입니다.
 * - 그래서 기존처럼 <MetricCard label="일반 회원" icon={...} /> 형태로 쓰는 코드는
 *   그대로 "-"만 보여줍니다.
 * ========================================================================== */
export function MetricCard({
  label,
  value = "-",
  helperText = "",
  icon,
  accent = "purple",
}) {
  return (
    <article className={styles.metricCard}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helperText ? <p>{helperText}</p> : null}
      </div>
      <div className={`${styles.metricIcon} ${styles[accent] || ""}`}>
        {icon}
      </div>
    </article>
  );
}
