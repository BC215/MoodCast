package com.moodcast.post.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostMentionRequest {
    private Long userId;
    private String nickname;
    private String mentionText;
    private Integer startIndex;
    private Integer endIndex;
}
