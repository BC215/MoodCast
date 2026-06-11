package com.moodcast.post.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {
    private String content;
    private Long parentCommentId;
    private List<PostMentionRequest> mentions;
}
