package com.moodcast.post.vo;

import lombok.Data;

@Data
public class Post {
    private Long postId;
    private Long memberId;
    private String title;
    private String content;
    private String visibility;
    private Long emotionId;
}
