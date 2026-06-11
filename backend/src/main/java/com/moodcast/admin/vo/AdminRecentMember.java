package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/* ==========================================================================
 * 사용자 관리 하단 카드용 회원 요약 VO
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지 하단의 "최근 가입 회원", "최근 제재 회원" 영역에 필요한
 * 최소 회원 정보만 담는 객체입니다.
 *
 * 초보자 설명:
 * - VO는 DB에서 조회한 값을 프론트로 보내기 좋게 담아두는 상자라고 보면 됩니다.
 * - members 전체 컬럼을 모두 보내지 않고, 화면에 필요한 값만 담아서 보냅니다.
 * - 비밀번호 같은 민감한 값은 이 VO에 절대 포함하지 않습니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminRecentMember {

    private Long memberId; // members.member_id: 회원을 구분하는 고유 번호입니다.

    private String name; // members.name: 회원 실명입니다.

    private String nickname; // members.nickname: 화면에서 보조로 보여줄 닉네임입니다.

    private String email; // members.email: 관리자가 회원을 식별할 때 사용하는 이메일입니다.

    private String status; // members.status: ACTIVE, SUSPENDED, DELETED 같은 회원 상태입니다.

    private String role; // members.role: USER 또는 SUPER_ADMIN 같은 권한입니다.

    private LocalDateTime createdAt; // members.created_at 또는 로그 발생 시간입니다.

    private String actionType; // 최근 제재 회원일 때 SUSPEND, RESTORE 같은 작업 종류입니다.

    private String actionDetail; // 최근 제재 회원일 때 제재 상세 설명입니다.
}
