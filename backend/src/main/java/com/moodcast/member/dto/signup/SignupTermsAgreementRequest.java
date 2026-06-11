package com.moodcast.member.dto.signup;

import lombok.Data;

@Data
public class SignupTermsAgreementRequest {
    private Long termsId;
    private Boolean agreed;
}
