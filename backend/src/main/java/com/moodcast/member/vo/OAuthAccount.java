package com.moodcast.member.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OAuthAccount {
    private Long oauthAccountId;
    private Long memberId;
    private String provider;
    private String providerUserId;
    private String providerEmail;
    private String providerNickname;
    private LocalDateTime connectedAt;
    private LocalDateTime lastLoginAt;
}
