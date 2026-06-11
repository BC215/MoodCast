package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/* ==========================================================================
 * 관리자용 회원 상세 정보 VO
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지에서 "회원 정보 전체 보기"를 눌렀을 때 사용하는 객체입니다.
 *
 * 중요한 보안 기준:
 * - members 테이블에는 password_hash 컬럼이 있지만, 이 VO에는 만들지 않습니다.
 * - mapper SQL에서도 password_hash를 select 하지 않습니다.
 * - 즉, 백엔드 응답에 비밀번호 관련 값이 포함되지 않도록 구조적으로 막습니다.
 *
 * 포함하는 정보:
 * - 회원 식별값, 이메일, 실명, 닉네임, 전화번호
 * - 이메일/전화번호 인증 여부
 * - 권한, 상태
 * - 최근 로그인, 가입일, 수정일, 삭제일
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminMemberDetail {
    private Long memberId;

    private String email;
    private String name;
    private String nickname;
    private String phone;

    private Integer emailVerified;
    private Integer phoneVerified;

    private String role;
    private String status;

    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime suspendedUntil;
    private Long suspensionCount;
    private Long warningCount;
}
