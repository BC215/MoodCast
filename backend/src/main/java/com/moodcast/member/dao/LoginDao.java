package com.moodcast.member.dao;

import com.moodcast.member.vo.Member;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LoginDao {
    Member findMemberByEmail(@Param("email") String email);

    String findPasswordHashByEmail(@Param("email") String email);

    String findPasswordHashByMemberId(@Param("memberId") Long memberId);

    Member findMemberById(@Param("memberId") Long memberId);

    int updateLastLoginAt(@Param("memberId") Long memberId);

    int updatePasswordHash(@Param("memberId") Long memberId, @Param("passwordHash") String passwordHash);

    int withdrawMember(@Param("memberId") Long memberId);

    int updateMemberProfile(@Param("memberId") Long memberId,
                             @Param("nickname") String nickname,
                             @Param("bio") String bio,
                             @Param("profileImageUrl") String profileImageUrl);

    // 팔로우 관련
    int isFollowing(@Param("followerId") Long followerId, @Param("followingId") Long followingId);
    int follow(@Param("followerId") Long followerId, @Param("followingId") Long followingId);
    int unfollow(@Param("followerId") Long followerId, @Param("followingId") Long followingId);
    long countFollowers(@Param("memberId") Long memberId);
    long countFollowing(@Param("memberId") Long memberId);
    long countPosts(@Param("memberId") Long memberId);
    long countSavedPosts(@Param("memberId") Long memberId);
    long countPostLikes(@Param("memberId") Long memberId);
    long countPostComments(@Param("memberId") Long memberId);
    long countPostSaves(@Param("memberId") Long memberId);
    long countWeeklyPostReactions(@Param("memberId") Long memberId);

    // 상세 리스트 조회
    java.util.List<com.moodcast.member.dto.follow.FollowItemResponse> getFollowerList(@Param("targetId") Long targetId, @Param("loginId") Long loginId);
    java.util.List<com.moodcast.member.dto.follow.FollowItemResponse> getFollowingList(@Param("targetId") Long targetId, @Param("loginId") Long loginId);
    java.util.List<com.moodcast.member.dto.follow.MentionCandidateResponse> getMentionCandidates(@Param("memberId") Long memberId, @Param("keyword") String keyword);
}
