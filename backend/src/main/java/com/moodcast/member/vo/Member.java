package com.moodcast.member.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class Member {
    private Long memberId; // pk 숫자 id

    private String email;   // 로그인용 아이디
    private String passwordHash; // 비밀번호

    private String name;    // 실명
    private String nickname;    // 닉네임
    private String phone;       // 전화번호

    private String profileImageUrl;     // 프로필사진 이미지
    private String bio;                 // 상태메세지

    private Integer emailVerified;      // 이메일 인증여부
    private Integer phoneVerified;      // 휴대폰 인증여부

    private String role;                // 회원 등급
    private String status;              // 정상, 정지, 탈퇴
    private LocalDateTime suspendedUntil; // 관리자 기능 담당 작업(문건우): 정지 로그인 안내용 해제 예정일입니다. null이면 영구 정지입니다.

    private LocalDateTime lastLoginAt;     // 마지막 로그인
    private LocalDateTime createdAt;        // 가입일
    private LocalDateTime updatedAt;        // 수정일
    private LocalDateTime deletedAt;        // 탈퇴일
}
