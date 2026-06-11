package com.moodcast.chat.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatRoomVo {
    private Long roomId;
    private String roomType;
    private String roomName;
    private String roomDescription;
    private Long createdBy;
    private String createdAt;
    private String deletedYn;
    private Integer memberCount;
    private String lastMessage;
    private String lastMessageAt;
    private Integer unreadCount;
}
