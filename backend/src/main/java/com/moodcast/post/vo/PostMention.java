package com.moodcast.post.vo;

import lombok.Data;

@Data
public class PostMention {
    private Long postMentionId;
    private Long commentId;
    private Long postId;
    private Long userId;
    private String nickname;
    private String mentionText;
    private Integer startIndex;
    private Integer endIndex;
    private String createdAt;
}
