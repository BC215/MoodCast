package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/* ==========================================================================
 * 관리자 작업 로그 VO
 * --------------------------------------------------------------------------
 * DB의 admin_action_logs 테이블 한 행을 Java 객체로 표현하는 클래스입니다.
 *
 * admin_action_logs 테이블 목적:
 * - 관리자가 어떤 작업을 했는지 기록합니다.
 * - 예: 회원 정지, 관리자 승급, 공지사항 삭제, 신고 반려 등
 *
 * 중요한 정책:
 * - 이 테이블은 append-only 로그 테이블입니다.
 * - append-only는 "기록을 추가만 하고 수정/삭제하지 않는다"는 뜻입니다.
 * - 나중에 문제가 생겼을 때 누가 언제 어떤 작업을 했는지 추적하기 위해 사용합니다.
 *
 * Java 필드명 규칙:
 * - DB 컬럼은 snake_case입니다. 예: admin_id
 * - Java 필드는 camelCase입니다. 예: adminId
 * - MyBatis mapper에서 두 이름을 연결해서 사용합니다.
 * ========================================================================== */
@NoArgsConstructor // 파라미터 없는 기본 생성자를 Lombok이 자동으로 만들어줍니다.
@AllArgsConstructor // 모든 필드를 받는 생성자를 Lombok이 자동으로 만들어줍니다.
@Data // getter, setter, toString 등을 Lombok이 자동으로 만들어줍니다.
public class AdminActionLog {

    private Long logId; // admin_action_logs.log_id: 관리자 작업 로그의 PK입니다.

    private Long adminId; // admin_action_logs.admin_id: 작업을 수행한 관리자 member_id입니다.

    private String actionType; // admin_action_logs.action_type: CREATE, UPDATE, DELETE, HIDE, RESTORE, SUSPEND 같은 작업 종류입니다.

    private String targetType; // admin_action_logs.target_type: USER, POST, COMMENT, REPORT, NOTICE, ADMIN 같은 작업 대상 종류입니다.

    private Long targetId; // admin_action_logs.target_id: 작업 대상의 실제 PK 값입니다. 예: notice_id, member_id, post_id

    private LocalDateTime createdAt; // admin_action_logs.created_at: 관리자 작업이 기록된 시간입니다.

    private String actionDetail; // admin_action_logs.action_detail: 작업 사유나 상세 내용을 남기는 설명 필드입니다.
}
