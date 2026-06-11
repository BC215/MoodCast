package com.moodcast.member.dto.login;

import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Data
public class LoginResult {
    private String accessToken;
    private String refreshToken;
    private LoginMemberResponse member;
    private boolean remember = true;

    public LoginResult(String accessToken, String refreshToken, LoginMemberResponse member) {
        this(accessToken, refreshToken, member, true);
    }

    public LoginResult(String accessToken, String refreshToken, LoginMemberResponse member, boolean remember) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.member = member;
        this.remember = remember;
    }
}
