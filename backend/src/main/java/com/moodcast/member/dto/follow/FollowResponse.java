package com.moodcast.member.dto.follow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowResponse {
    private boolean success;
    private String message;
    private boolean following; // 처리 후 팔로잉 상태
}
