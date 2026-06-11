package com.moodcast.member.dto.recovery;

import lombok.Data;

@Data
public class FindEmailVerifyRequest {
    private String name;
    private String email;
    private String authCode;
}
