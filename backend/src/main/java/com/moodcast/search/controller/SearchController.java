package com.moodcast.search.controller;

import com.moodcast.search.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

// 이 컨트롤러는 검색 요청을 처리하는 HTTP 엔드포인트를 제공합니다.
// 클라이언트가 /search/posts, /search/users, /search/hashtags를 호출하면
// 각각 게시물, 사용자, 해시태그 검색 결과를 JSON으로 돌려줍니다.
@RestController
@RequestMapping("/search")
public class SearchController {
    @Autowired
    private SearchService searchService;

    // 게시물 검색 API
    // 요청 예: GET /search/posts?q=감성
    @GetMapping("/posts")
    public ResponseEntity<?> searchPosts(@RequestParam(value = "q", required = false) String query) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", searchService.searchPosts(query)
                )
        );
    }

    @GetMapping("/users")
    public ResponseEntity<?> searchUsers(
            @RequestParam(value = "q", required = false) String query,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", searchService.searchUsers(query, authHeader)
                )
        );
    }

    @GetMapping("/users/trending")
    public ResponseEntity<?> getTrendingUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "limit", required = false, defaultValue = "10") Integer limit
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", searchService.getTrendingUsers(authHeader, limit)
                )
        );
    }

    @GetMapping("/hashtags")
    public ResponseEntity<?> searchHashtags(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "range", required = false, defaultValue = "all") String range,
            @RequestParam(value = "limit", required = false, defaultValue = "5") Integer limit
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", searchService.searchHashtags(query, range, limit)
                )
        );
    }

    @GetMapping("/hashtags/trending")
    public ResponseEntity<?> getTrendingHashtags(
            @RequestParam(value = "range", required = false, defaultValue = "all") String range,
            @RequestParam(value = "limit", required = false, defaultValue = "5") Integer limit
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", searchService.getTrendingHashtags(range, limit)
                )
        );
    }
}
