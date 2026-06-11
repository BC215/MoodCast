package com.moodcast.member.service;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class MemberValidationService {
    // 이메일 정규식
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    // 이메일 기본 검증 메서드 (회원가입, 로그인 공통사용)
    public String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("이메일을 입력해주세요.");
        }

        // 공백제거, 소문자로 변경
        email = email.trim().toLowerCase();

        if (email.isEmpty()) {
            throw new IllegalArgumentException("이메일을 입력해주세요.");
        }

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }

        return email;
    }
}
