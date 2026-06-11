package com.moodcast.member.dto.login;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class LoginMemberResponse {
    private Long memberId;
    private String email;
    private String name;
    private String nickname;
    private String profileImageUrl;
    private String bio;
    private String role;
    private LocalDateTime createdAt;
}
