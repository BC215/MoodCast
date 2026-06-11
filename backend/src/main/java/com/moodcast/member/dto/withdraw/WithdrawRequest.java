package com.moodcast.member.dto.withdraw;

import lombok.Data;

@Data
public class WithdrawRequest {
    private String password;
    private String confirmText;
    private String authCode;
}
