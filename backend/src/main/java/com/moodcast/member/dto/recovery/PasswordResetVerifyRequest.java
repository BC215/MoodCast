package com.moodcast.member.dto.recovery;

import lombok.Data;

@Data
public class PasswordResetVerifyRequest {
    private String email;
    private String authCode;
}
