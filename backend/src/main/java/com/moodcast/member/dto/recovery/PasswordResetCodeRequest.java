package com.moodcast.member.dto.recovery;

import lombok.Data;

@Data
public class PasswordResetCodeRequest {
    private String email;
}
