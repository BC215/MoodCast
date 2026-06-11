package com.moodcast.member.dto.oauth;

import com.moodcast.member.dto.login.LoginResult;
import lombok.Data;

@Data
public class OAuthLoginResult {
    private String status;
    private LoginResult loginResult;
    private String pendingToken;
    private String providerEmail;
    private String providerNickname;

    public static OAuthLoginResult loginSuccess(LoginResult loginResult) {
        OAuthLoginResult result = new OAuthLoginResult();
        result.setStatus("LOGIN_SUCCESS");
        result.setLoginResult(loginResult);
        return result;
    }

    public static OAuthLoginResult needExtraSignup(String pendingToken, String providerEmail, String providerNickname) {
        OAuthLoginResult result = new OAuthLoginResult();
        result.setStatus("NEED_EXTRA_SIGNUP");
        result.setPendingToken(pendingToken);
        result.setProviderEmail(providerEmail);
        result.setProviderNickname(providerNickname);
        return result;
    }

    public static OAuthLoginResult emailConflict(String providerEmail) {
        OAuthLoginResult result = new OAuthLoginResult();
        result.setStatus("EMAIL_CONFLICT");
        result.setProviderEmail(providerEmail);
        return result;
    }
}
