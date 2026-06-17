package com.moodcast.common.exception;

/**
 * ─────────────────────────────────────────────────────────────────
 * BusinessException — 비즈니스 로직 처리 중 발생하는 예외를 나타내는 클래스입니다.
 *
 * RuntimeException을 상속받아 Unchecked Exception으로 동작합니다.
 * 이는 컴파일러가 예외 처리를 강제하지 않아 코드의 간결성을 유지하면서도,
 * 비즈니스 규칙 위반과 같은 특정 상황을 명확하게 표현할 수 있도록 합니다.
 * ─────────────────────────────────────────────────────────────────
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}