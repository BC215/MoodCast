package com.moodcast.member.dto.login;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class LoginResponse {
    private Boolean success;
    private String message;
    private String accessToken;
    private LoginMemberResponse member;
}
