package com.moodcast.moodchat.dto;

import lombok.Data;

@Data
public class ChatMessageDto {
    private Integer chatId;
    private Integer senderId;
    private String senderNickname;
    private String senderProfileImageUrl;
    private Integer receiverId;
    private String content;
    private String createdAt;
    private Integer isRead;
    private String eventType;
}
