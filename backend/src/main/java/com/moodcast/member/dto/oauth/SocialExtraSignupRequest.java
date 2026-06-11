package com.moodcast.member.dto.oauth;

import com.moodcast.member.dto.signup.SignupTermsAgreementRequest;
import lombok.Data;

import java.util.List;

@Data
public class SocialExtraSignupRequest {
    private String pendingToken;
    private String name;
    private String nickname;
    private List<SignupTermsAgreementRequest> agreements;
    private Boolean remember;
}
