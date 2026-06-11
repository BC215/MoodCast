package com.moodcast.member.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PasswordHistoryDao {
    List<String> findRecentPasswordHashes(@Param("memberId") Long memberId, @Param("limit") int limit);

    int insertPasswordHistory(@Param("memberId") Long memberId, @Param("passwordHash") String passwordHash);
}
