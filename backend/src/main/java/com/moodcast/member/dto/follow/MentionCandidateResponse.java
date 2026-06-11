package com.moodcast.member.dto.follow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MentionCandidateResponse {
    private Long userId;
    private String nickname;
    private String profileImage;
}
