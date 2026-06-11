package com.moodcast.member.dto.oauth;

import lombok.Data;

@Data
public class PendingSocialSignup {
    private String provider;
    private String providerUserId;
    private String providerEmail;
    private String providerNickname;
    private String profileImageUrl;
}
