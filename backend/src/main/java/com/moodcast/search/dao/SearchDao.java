package com.moodcast.search.dao;

import com.moodcast.search.vo.SearchHashtagResult;
import com.moodcast.search.vo.SearchPostResult;
import com.moodcast.search.vo.SearchUserResult;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface SearchDao {
    // MyBatis 매퍼(search-mapper.xml)에 의해 구현되는 메서드입니다.
    // 여기에 선언된 메서드 이름과 매퍼의 id가 매칭되어 SQL을 실행합니다.
    List<SearchPostResult> searchPosts(String query);

    List<SearchUserResult> searchUsers(@Param("query") String query, @Param("loginId") Long loginId);

    List<SearchUserResult> selectTrendingUsers(@Param("loginId") Long loginId, @Param("limit") Integer limit);

    List<SearchHashtagResult> searchHashtags(String query);

    List<SearchHashtagResult> selectTrendingHashtags(@Param("from") LocalDateTime from, @Param("limit") Integer limit);
}
