package com.moodcast.member.dto.post;

import java.time.LocalDateTime;

public class PostResponse {
    private Long postId;
    private Long memberId;
    private String content;
    private String imageUrl;
    private String status; // 예: PUBLIC, PRIVATE, DRAFT
    private String deletedYn; // 예: N (삭제 안됨), Y (삭제됨)
    private LocalDateTime createdAt;

    // Constructors
    public PostResponse() {}

    public PostResponse(Long postId, Long memberId, String content, String imageUrl, String status, String deletedYn, LocalDateTime createdAt) {
        this.postId = postId;
        this.memberId = memberId;
        this.content = content;
        this.imageUrl = imageUrl;
        this.status = status;
        this.deletedYn = deletedYn;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getPostId() { return postId; }
    public void setPostId(Long postId) { this.postId = postId; }
    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDeletedYn() { return deletedYn; }
    public void setDeletedYn(String deletedYn) { this.deletedYn = deletedYn; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}