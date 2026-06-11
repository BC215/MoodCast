package com.moodcast.member.dto.follow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowItemResponse {
    private Long memberId;
    private String name;
    private String nickname;
    private String email;
    private String profileImageUrl;
    private boolean isFollowing; // 내가 이 사람을 팔로우 중인지
    private boolean followsMe;   // 이 사람이 나를 팔로우 중인지
}
