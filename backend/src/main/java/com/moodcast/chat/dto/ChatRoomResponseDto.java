package com.moodcast.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomResponseDto {
    private Long roomId;
    private String roomType;
    private String roomName;
    private String roomDescription;
    private Long createdBy;
    private String createdAt;
    private Integer memberCount;
    private String lastMessage;
    private String lastMessageAt;
    private Integer unreadCount;
}
