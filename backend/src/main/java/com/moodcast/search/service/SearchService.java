package com.moodcast.search.service;

import com.moodcast.member.service.JwtService;
import com.moodcast.search.dao.SearchDao;
import com.moodcast.search.vo.SearchHashtagResult;
import com.moodcast.search.vo.SearchPostResult;
import com.moodcast.search.vo.SearchUserResult;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;

@Service
public class SearchService {
    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    @Autowired
    private SearchDao searchDao;

    @Autowired
    private JwtService jwtService;

    // 검색어가 없으면 빈 리스트를 반환하고, 있으면 DAO를 통해 DB에서 검색합니다.
    public List<SearchPostResult> searchPosts(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return searchDao.searchPosts(query.trim());
    }

    public List<SearchUserResult> searchUsers(String query, String authHeader) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }

        Long loginId = 0L;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7).trim();
                loginId = jwtService.getMemberIdFromAccessToken(token);
            } catch (JwtException | IllegalArgumentException ignored) {
                loginId = 0L;
            }
        }

        return searchDao.searchUsers(query.trim(), loginId);
    }

    public List<SearchUserResult> getTrendingUsers(String authHeader, Integer limit) {
        Long loginId = 0L;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7).trim();
                loginId = jwtService.getMemberIdFromAccessToken(token);
            } catch (JwtException | IllegalArgumentException ignored) {
                loginId = 0L;
            }
        }

        int safeLimit = limit == null || limit <= 0 ? 10 : limit;
        return searchDao.selectTrendingUsers(loginId, safeLimit);
    }

    public List<SearchHashtagResult> searchHashtags(String query, String range, Integer limit) {
        if (query != null && !query.trim().isEmpty()) {
            return searchDao.searchHashtags(query.trim());
        }
        return getTrendingHashtags(range, limit);
    }

    public List<SearchHashtagResult> getTrendingHashtags(String range, Integer limit) {
        LocalDateTime from = resolveRangeFrom(range);
        int safeLimit = limit == null || limit <= 0 ? 5 : limit;
        return searchDao.selectTrendingHashtags(from, safeLimit);
    }

    private LocalDateTime resolveRangeFrom(String range) {
        if (range == null || range.isBlank() || "all".equalsIgnoreCase(range)) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now(KOREA_ZONE);
        return switch (range.toLowerCase()) {
            case "day" -> now.minusDays(1);
            case "week" -> now.minusWeeks(1);
            case "month" -> now.minusMonths(1);
            default -> null;
        };
    }
}
