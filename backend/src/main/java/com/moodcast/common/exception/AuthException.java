package com.moodcast.common.exception;

// access/refresh token 인증 실패를 400이 아니라 401로 내려주기 위한 예외
public class AuthException extends RuntimeException {
    public AuthException(String message) {
        super(message);
    }
}
