package com.moodcast.notification.vo;

import lombok.Data;

@Data
public class Notification {
    private Long notificationId;
    private Long recipientMemberId;
    private Long senderMemberId;
    private String notificationType;
    private String targetType;
    private Long targetId;
    private String title;
    private String content;
    private String isRead;
    private String createdAt;
}
