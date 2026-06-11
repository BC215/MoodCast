package com.moodcast.common.exception;

import lombok.Getter;

@Getter
public class AccountSuspendedException extends IllegalArgumentException {
    /*
     * 관리자 기능 담당 작업(문건우): 관리자 제재로 정지된 회원의 로그인 제한 안내에
     * 정지 유형, 남은 기간, 해제 예정일을 구조화해서 내려주기 위한 예외입니다.
     */
    private final String suspendType;
    private final Long suspendDays;
    private final String suspendedUntil;

    public AccountSuspendedException(
            String message,
            String suspendType,
            Long suspendDays,
            String suspendedUntil
    ) {
        super(message);
        this.suspendType = suspendType;
        this.suspendDays = suspendDays;
        this.suspendedUntil = suspendedUntil;
    }
}
