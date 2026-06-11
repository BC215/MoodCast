package com.moodcast.member.dto.password;

import lombok.Data;

@Data
public class PasswordChangeRequest {
    private String currentPassword;
    private String newPassword;
    private String newPasswordConfirm;
}
