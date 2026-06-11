package com.moodcast.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomMessageResponseDto {
    private Long messageId;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String profileImageUrl;
    private String content;
    private String createdAt;
    private Integer readCount;
    private Integer unreadCount;
    private String eventType;
}
