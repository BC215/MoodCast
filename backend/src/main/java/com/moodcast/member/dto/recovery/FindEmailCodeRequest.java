package com.moodcast.member.dto.recovery;

import lombok.Data;

@Data
public class FindEmailCodeRequest {
    private String name;
    private String email;
}
