package com.moodcast.member.controller;

import com.moodcast.member.dto.follow.MentionCandidateResponse;
import com.moodcast.member.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin(
        origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://3.39.49.9:5173"},
        allowCredentials = "true"
)
@RequestMapping("/api/follows")
public class FollowController {
    @Autowired
    private LoginService loginService;

    @GetMapping("/mention-candidates")
    public ResponseEntity<List<MentionCandidateResponse>> getMentionCandidates(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("memberId") Long memberId,
            @RequestParam(value = "keyword", required = false) String keyword
    ) {
        Long loggedInMemberId = loginService.getMemberIdFromHeaderOptional(authorizationHeader);
        if (loggedInMemberId != null && !loggedInMemberId.equals(memberId)) {
            throw new IllegalArgumentException("본인 계정의 팔로우 목록만 조회할 수 있습니다.");
        }

        return ResponseEntity.ok(loginService.getMentionCandidates(memberId, keyword));
    }
}
