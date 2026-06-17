package com.moodcast.chat.dto;

public class ChatThreadResponse {
    private Long threadId;
    private Long otherMemberId;
    private int unreadCount;

    public ChatThreadResponse(Long threadId, Long otherMemberId, int unreadCount) {
        this.threadId = threadId;
        this.otherMemberId = otherMemberId;
        this.unreadCount = unreadCount;
    }

    // Getters
    public Long getThreadId() {
        return threadId;
    }

    public Long getOtherMemberId() {
        return otherMemberId;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    // Setters (필요하다면 추가)
    public void setThreadId(Long threadId) {
        this.threadId = threadId;
    }
    public void setOtherMemberId(Long otherMemberId) { this.otherMemberId = otherMemberId; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }
}