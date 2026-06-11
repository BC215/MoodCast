package com.moodcast.moodchat.dto;

import lombok.Data;

@Data
public class ChatSendRequestDto {
    private Integer senderId;
    private Integer receiverId;
    private String content;

    // 없어도 되지만, 현재 프론트에서 isRead: 0을 보내고 있어서 받아도 됨
    private Integer isRead;
}