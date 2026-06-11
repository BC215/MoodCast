package com.moodcast.member.dto.signup;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PhoneAuthSendResult {
    private String phone;
    private String authCode;
}
