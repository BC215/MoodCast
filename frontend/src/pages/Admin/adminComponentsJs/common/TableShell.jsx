import { EmptyState } from "./EmptyState";
import styles from "../../adminComponentsCss/common/TableShell.module.css";

/* ==========================================================================
 * TableShell 컴포넌트
 * --------------------------------------------------------------------------
 * 사용자 목록, 콘텐츠 목록, 신고 목록처럼 표 형태가 필요한 화면에서
 * 공통으로 사용하는 테이블 껍데기입니다.
 *
 * props 설명:
 * - title: 표 위에 보이는 제목입니다.
 * - columns: 표의 헤더 이름 배열입니다. 예: ['사용자', '상태', '가입일']
 * - children: tbody 안에 들어갈 실제 행입니다.
 * - className: 특정 페이지에서만 추가 스타일을 적용하고 싶을 때 사용하는 선택 값입니다.
 * - footer: 표 아래쪽에 페이지네이션처럼 함께 붙여 보여줄 영역입니다.
 *
 * children을 받는 이유:
 * - 페이지마다 표의 행 내용이 달라질 수 있기 때문입니다.
 * - 지금은 데이터가 없어서 EmptyTableRow만 넣지만, 나중에는 map으로 실제 행을 만들 수 있습니다.
 * ========================================================================== */
export function TableShell({ title, columns, children, className = "", footer = null }) {
  return (
    <section className={`${styles.panel} ${className}`}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}

/* ==========================================================================
 * EmptyTableRow 컴포넌트
 * --------------------------------------------------------------------------
 * 테이블에 보여줄 데이터가 없을 때 사용하는 빈 행입니다.
 *
 * colSpan 설명:
 * - HTML table에서 "여러 칸을 하나로 합친다"는 의미입니다.
 * - 예를 들어 컬럼이 5개인 테이블에서는 colSpan={5}를 주면
 *   빈 상태 안내가 표 전체 너비를 차지합니다.
 * ========================================================================== */
export function EmptyTableRow({ colSpan, label }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState title={label} />
      </td>
    </tr>
  );
}
