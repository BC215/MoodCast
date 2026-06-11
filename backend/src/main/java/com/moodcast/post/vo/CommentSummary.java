package com.moodcast.post.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CommentSummary {
    private Long commentId;
    private Long postId;
    private Long memberId;
    private String author;
    private String profileImageUrl;
    private String content;
    private String createdAt;
    private Long parentCommentId;
    private List<PostMention> mentions = new ArrayList<>();
    private List<CommentSummary> replies = new ArrayList<>();
}
