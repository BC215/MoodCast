package com.moodcast.post.dto;

import lombok.Data;

@Data
public class PostMentionNotificationDto {
    private String notificationId;
    private String eventType;
    private Long postId;
    private Long senderId;
    private String senderName;
    private String senderProfileImageUrl;
    private Long mentionedUserId;
    private String mentionText;
    private String targetType;
    private Long targetId;
    private String title;
    private String content;
    private String createdAt;
}
