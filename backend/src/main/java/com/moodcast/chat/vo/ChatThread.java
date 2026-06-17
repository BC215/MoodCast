package com.moodcast.chat.vo;

import java.time.LocalDateTime;

public class ChatThread {
    private Long threadId;
    private Long memberId; // 현재 로그인한 사용자 ID
    private Long otherMemberId; // 상대방 사용자 ID
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private int unreadCount;

    // Getters and Setters
    public Long getThreadId() {
        return threadId;
    }

    public void setThreadId(Long threadId) {
        this.threadId = threadId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public Long getOtherMemberId() {
        return otherMemberId;
    }

    public void setOtherMemberId(Long otherMemberId) {
        this.otherMemberId = otherMemberId;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }
    // lastMessage, lastMessageAt 등 필요한 필드 추가 및 getter/setter 구현
}