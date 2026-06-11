package com.moodcast.post.dto;

import lombok.Data;

@Data
public class PostCommentNotificationDto {
    private String notificationId;
    private String eventType;
    private Long postId;
    private Long commentId;
    private Long postOwnerId;
    private Long commenterId;
    private String commenterName;
    private String commenterProfileImageUrl;
    private String postTitle;
    private String preview;
    private String createdAt;
}
