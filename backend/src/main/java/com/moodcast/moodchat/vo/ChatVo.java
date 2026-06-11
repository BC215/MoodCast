package com.moodcast.moodchat.vo;

import lombok.Data;

@Data
public class ChatVo {
    private int chatId;
    private int senderId;
    private int receiverId;
    private String content;
    private int isRead;
    private String createdAt;
    private int deletedYn;
    private int senderDeletedYn;
    private int receiverDeletedYn;
    private String senderHiddenAt;
    private String receiverHiddenAt;
}
