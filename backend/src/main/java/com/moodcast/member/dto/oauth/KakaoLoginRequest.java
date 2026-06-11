package com.moodcast.member.dto.oauth;

import lombok.Data;

@Data
public class KakaoLoginRequest {
    private String code;
    private String redirectUri;
    private String state;
    private Boolean remember;
}
