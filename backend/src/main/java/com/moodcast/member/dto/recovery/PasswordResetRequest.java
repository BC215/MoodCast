package com.moodcast.member.dto.recovery;

import lombok.Data;

@Data
public class PasswordResetRequest {
    private String email;
    private String authCode;
    private String newPassword;
    private String newPasswordConfirm;
}
