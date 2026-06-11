package com.moodcast.chat.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatMessageVo {
    private Long messageId;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String profileImageUrl;
    private String content;
    private String createdAt;
    private String deletedYn;
    private String messageType;
    private Integer readCount;
    private Integer unreadCount;
    private String eventType;
}
