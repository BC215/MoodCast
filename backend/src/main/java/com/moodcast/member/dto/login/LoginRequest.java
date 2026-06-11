package com.moodcast.member.dto.login;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
    private Boolean remember;
}
