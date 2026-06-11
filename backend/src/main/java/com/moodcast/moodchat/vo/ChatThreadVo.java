package com.moodcast.moodchat.vo;

import lombok.Data;

@Data
public class ChatThreadVo {
    private Long partnerMemberId;
    private String partnerName;
    private String partnerNickname;
    private String partnerProfileImageUrl;
    private String lastMessage;
    private String lastMessageAt;
    private int unreadCount;
}
