package com.moodcast.admin.vo;

import lombok.Data;

/* ==========================================================================
 * 회원 정지 요청 DTO
 * --------------------------------------------------------------------------
 * 사용자 관리 페이지에서 회원을 일시 정지 또는 영구 정지할 때 프론트엔드가
 * 백엔드로 보내는 값을 담는 객체입니다.
 *
 * 필드 설명:
 * - suspendType: "TEMPORARY" 또는 "PERMANENT" 값입니다.
 * - suspendDays: 일시 정지 기간입니다. 예: 7, 30, 90
 * - suspendedUntil: 직접 설정 날짜입니다. 예: 2026-06-08T23:59:59
 *
 * 주의:
 * - 영구 정지는 suspended_until을 null로 저장합니다.
 * - 일시 정지는 suspended_until에 미래 날짜를 저장합니다.
 * ========================================================================== */
@Data
public class AdminMemberSuspendRequest {
    private String suspendType;
    private Integer suspendDays;
    private String suspendedUntil;
}
