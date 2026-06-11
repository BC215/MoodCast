package com.moodcast.member.dto.signup;

import lombok.Data;

@Data
public class ValidateBasicRequest {
    private String name;
    private String nickname;
    private String email;
    private String password;
    private String passwordConfirm;
}
