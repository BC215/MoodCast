package com.moodcast.member.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias(value="AuthCode")
public class AuthCode {
    private Long authCodeId;          // auth_codes PK
    private Long memberId;            // 회원가입 전에는 null
    private String targetType;        // EMAIL 또는 PHONE
    private String targetValue;       // 인증 대상 값, 예: 이메일 주소
    private String purpose;           // SIGNUP, RESET_PASSWORD 등 인증 목적
    private String codeHash;          // 인증번호 원본이 아니라 해시값
    private LocalDateTime expiresAt;  // 인증번호 만료 시간
    private LocalDateTime verifiedAt; // 인증번호 확인 성공 시간
    private LocalDateTime usedAt;     // 마지막 인증에 사용된 시간
    private Integer attemptCount;     // 인증번호 입력 시도 횟수
    private LocalDateTime createdAt;  // 인증번호 요청/생성 시간
}
