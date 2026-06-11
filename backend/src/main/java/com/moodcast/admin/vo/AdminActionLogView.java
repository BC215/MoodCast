package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/* ==========================================================================
 * 사용자 관리 하단 권한/제재 로그 표시용 VO
 * --------------------------------------------------------------------------
 * admin_action_logs 테이블의 append-only 로그를 화면에 보여주기 위해
 * 관리자 이름과 대상 회원 이름을 함께 담는 객체입니다.
 *
 * 초보자 설명:
 * - admin_action_logs에는 admin_id, target_id처럼 숫자 id만 저장됩니다.
 * - 화면에는 "누가", "누구에게", "무엇을" 했는지 보여줘야 하므로
 *   members 테이블을 조인해서 관리자/대상 회원 이름을 같이 조회합니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminActionLogView {

    private Long logId; // admin_action_logs.log_id: 로그 한 줄의 고유 번호입니다.

    private Long adminId; // 작업을 수행한 관리자 member_id입니다.

    private String adminName; // 작업을 수행한 관리자 이름입니다.

    private String adminNickname; // 작업을 수행한 관리자 닉네임입니다.

    private String actionType; // SUSPEND, RESTORE, UPDATE_ADMIN_ROLE 같은 작업 종류입니다.

    private String targetType; // USER, NOTICE 같은 작업 대상 종류입니다.

    private Long targetId; // 작업 대상의 id입니다. 회원이면 member_id입니다.

    private String targetName; // 작업 대상 회원 이름입니다.

    private String targetNickname; // 작업 대상 회원 닉네임입니다.

    private String targetEmail; // 작업 대상 회원 이메일입니다.

    private LocalDateTime createdAt; // 로그가 기록된 시간입니다.

    private String actionDetail; // 작업 상세 설명입니다.
}
