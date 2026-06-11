package com.moodcast.member.dto.signup;

import lombok.Data;

@Data
public class EmailAuthVerifyRequest {
    private String email;
    private String authCode;
}
