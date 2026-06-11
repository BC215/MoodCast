package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/* ==========================================================================
 * 관리자 사용자 목록 VO
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지의 테이블 한 줄에 필요한 회원 정보를 담는 객체입니다.
 *
 * VO란?
 * - DB에서 가져온 값을 Java에서 다루기 쉽게 담아두는 클래스입니다.
 *
 * 현재 테이블에 필요한 값:
 * - memberId: React에서 목록을 반복 출력할 때 각 행을 구분하는 값
 * - name: 사용자 이름
 * - nickname: 사용자 닉네임
 * - email: 사용자 이메일
 * - status: 회원 상태
 * - createdAt: 가입일
 * - role: 권한
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminMember {
    private Long memberId;
    private String name;
    private String nickname;
    private String email;
    private String profileImageUrl;
    private String status;
    private LocalDateTime createdAt;
    private String role;

    private LocalDateTime lastLoginAt;
    private Long reportCount;
    private Long postCount;
    private Long commentCount;
    private LocalDateTime suspendedUntil;
    private Long suspensionCount;
    private Long warningCount;
}
