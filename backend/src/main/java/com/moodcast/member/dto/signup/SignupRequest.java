package com.moodcast.member.dto.signup;

import lombok.Data;

import java.util.List;

@Data
public class SignupRequest {
    private String name;
    private String nickname;
    private String email;
    private String password;
    private String passwordConfirm;
    private List<SignupTermsAgreementRequest> agreements;
}
