import { EmptyState } from "./EmptyState";
import styles from "../../adminComponentsCss/common/EmptyChart.module.css";

/* ==========================================================================
 * EmptyChart 컴포넌트
 * --------------------------------------------------------------------------
 * 그래프가 들어갈 공간을 미리 만들어두는 컴포넌트입니다.
 *
 * 현재는 실제 차트 라이브러리나 백엔드 데이터가 없기 때문에
 * 격자 배경과 빈 상태 안내만 표시합니다.
 *
 * 나중에 백엔드가 연결되면 이 컴포넌트 안에 Recharts, Chart.js 같은
 * 차트 컴포넌트를 넣거나, 별도의 Chart 컴포넌트로 교체할 수 있습니다.
 * ========================================================================== */
export function EmptyChart({ title, variant = "line" }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
      </div>
      <div className={`${styles.chartBox} ${styles[variant]}`}>
        <div className={styles.chartGrid} />
        <EmptyState
          title="표시할 데이터가 없습니다"
          description="백엔드 연동 후 이 영역에 시각화가 표시됩니다."
        />
      </div>
    </section>
  );
}
