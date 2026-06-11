package com.moodcast.member.dto.follow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowCheckResponse {
    private boolean success;
    private boolean following;
    private long followerCount;
    private long followingCount;
    private long postCount;
    private long savedCount;
    private int emotionEmpathyRate;
    private long weeklyReactions;
}
