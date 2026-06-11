package com.moodcast.member.dto.signup;

import lombok.Data;

@Data
public class PhoneAuthVerifyRequest {
    private String phone;
    private String authCode;
}
