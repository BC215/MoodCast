package com.moodcast.member.dto.recovery;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class FindEmailResult {
    private String email;
    private boolean kakaoLinked;
    private boolean googleLinked;
    private boolean naverLinked;
}
