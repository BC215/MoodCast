package com.moodcast.member.dao;

import com.moodcast.member.vo.OAuthAccount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface OAuthDao {
    OAuthAccount findByProviderAndProviderUserId(
            @Param("provider") String provider,
            @Param("providerUserId") String providerUserId
    );

    int countByMemberIdAndProvider(
            @Param("memberId") Long memberId,
            @Param("provider") String provider
    );

    int countByMemberId(@Param("memberId") Long memberId);

    int insertOAuthAccount(OAuthAccount oAuthAccount);

    int deleteByMemberIdAndProvider(
            @Param("memberId") Long memberId,
            @Param("provider") String provider
    );

    int updateLastLoginAt(
            @Param("provider") String provider,
            @Param("providerUserId") String providerUserId
    );
}
