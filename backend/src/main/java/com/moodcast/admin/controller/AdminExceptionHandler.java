package com.moodcast.admin.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/* ==========================================================================
 * 관리자 API 예외 처리
 * --------------------------------------------------------------------------
 * AdminController에서 발생한 예외를 프론트가 이해하기 쉬운 JSON 응답으로 변환합니다.
 *
 * 처리 기준:
 * - 잘못된 요청이나 토큰 문제는 IllegalArgumentException으로 들어오며 401로 응답합니다.
 * - 권한 부족, 조회 실패, 상태 전환 실패처럼 의도적으로 던진 예외는 지정된 상태 코드를 유지합니다.
 * - 예상하지 못한 오류는 500으로 응답하고, 서버 로그에는 전체 stack trace를 남깁니다.
 * ========================================================================== */
@RestControllerAdvice(assignableTypes = AdminController.class)
public class AdminExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(AdminExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("[ADMIN_API] IllegalArgumentException message={}", e.getMessage(), e);

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(
                        Map.of(
                                "success", false,
                                "message", e.getMessage()
                        )
                );
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> handleResponseStatusException(ResponseStatusException e) {
        log.warn(
                "[ADMIN_API] ResponseStatusException status={} reason={}",
                e.getStatusCode(),
                e.getReason(),
                e
        );

        return ResponseEntity.status(e.getStatusCode())
                .body(
                        Map.of(
                                "success", false,
                                "message", e.getReason() == null ? "요청을 처리할 수 없습니다." : e.getReason()
                        )
                );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception e) {
        log.error("[ADMIN_API] Unhandled exception occurred in admin API", e);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        Map.of(
                                "success", false,
                                "message", "관리자 API 처리 중 오류가 발생했습니다."
                        )
                );
    }
}
