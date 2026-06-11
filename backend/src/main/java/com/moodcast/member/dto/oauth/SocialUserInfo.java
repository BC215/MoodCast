package com.moodcast.member.dto.oauth;

import lombok.Data;

@Data
public class SocialUserInfo {
    private String provider;
    private String providerUserId;
    private String email;
    private String nickname;
    private String profileImageUrl;
}
