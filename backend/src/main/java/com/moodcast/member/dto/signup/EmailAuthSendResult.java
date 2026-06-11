package com.moodcast.member.dto.signup;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EmailAuthSendResult {
    private String email;
    private String authCode;
}
