package com.moodcast.member.dto.oauth;

import lombok.Data;

@Data
public class SocialLoginResponse {
    private boolean success;
    private String status;
    private String message;
    private String pendingToken;
    private String provider;
    private String providerEmail;
    private String providerNickname;

    public static SocialLoginResponse needExtraSignup(
            String pendingToken,
            String provider,
            String providerEmail,
            String providerNickname
    ) {
        SocialLoginResponse response = new SocialLoginResponse();
        response.setSuccess(true);
        response.setStatus("NEED_EXTRA_SIGNUP");
        response.setMessage("추가 회원가입 정보가 필요합니다.");
        response.setPendingToken(pendingToken);
        response.setProvider(provider);
        response.setProviderEmail(providerEmail);
        response.setProviderNickname(providerNickname);
        return response;
    }

    public static SocialLoginResponse emailConflict(String providerEmail) {
        return emailConflict("KAKAO", providerEmail);
    }

    public static SocialLoginResponse emailConflict(String provider, String providerEmail) {
        SocialLoginResponse response = new SocialLoginResponse();
        response.setSuccess(false);
        response.setStatus("EMAIL_CONFLICT");
        response.setMessage("이미 MoodCast 계정으로 가입된 이메일입니다. 기존 계정으로 로그인한 뒤 소셜 계정 연동을 진행해주세요.");
        response.setProvider(provider);
        response.setProviderEmail(providerEmail);
        return response;
    }
}
