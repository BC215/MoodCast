package com.moodcast.post.controller;

import com.moodcast.post.dto.CreateCommentRequest;
import com.moodcast.post.dto.CreatePostRequest;
import com.moodcast.post.service.PostService;
import com.moodcast.post.vo.CommentSummary;
import com.moodcast.post.vo.PostDetail;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@CrossOrigin(
        origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://3.39.49.9:5173"},
        allowCredentials = "true"
)
@RequestMapping({"posts", "api/posts"})
public class PostController {

    @Autowired
    private PostService postService;

    @PostMapping
    public ResponseEntity<?> createPost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody CreatePostRequest request
    ) {
        Long postId = postService.createPost(authorizationHeader, request);
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "게시물이 저장되었습니다.",
                        "postId", postId
                )
        );
    }

    @GetMapping
    public ResponseEntity<?> getRecentPosts(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(value = "memberId", required = false) Long memberId
    ) {
        if (memberId != null) {
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "results", postService.getPostsByMember(memberId, authorizationHeader)
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", postService.getRecentPosts(authorizationHeader)
                )
        );
    }

    @GetMapping("/{postId}")
    public ResponseEntity<?> getPostById(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        PostDetail post = postService.getPostById(postId, authorizationHeader);
        return ResponseEntity.ok(post);
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<?> getComments(@PathVariable Long postId) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", postService.getComments(postId)
                )
        );
    }

    @GetMapping("/popular")
    public ResponseEntity<?> getPopularPosts(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(value = "limit", required = false, defaultValue = "5") Integer limit
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", postService.getPopularPosts(authorizationHeader, limit)
                )
        );
    }

    @GetMapping("/emotion-stats/{memberId}")
    public ResponseEntity<?> getEmotionStats(
            @PathVariable Long memberId,
            @RequestParam(value = "period", required = false) String period
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "stats", postService.getEmotionStats(memberId, period)
                )
        );
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> createComment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId,
            @RequestBody CreateCommentRequest request
    ) {
        CommentSummary comment = postService.addComment(authorizationHeader, postId, request);
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "comment", comment
                )
        );
    }

    @PostMapping("/{postId}/likes")
    public ResponseEntity<?> toggleLike(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        return ResponseEntity.ok(postService.toggleLike(authorizationHeader, postId));
    }

    @PostMapping("/{postId}/saves")
    public ResponseEntity<?> toggleSave(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        return ResponseEntity.ok(postService.toggleSave(authorizationHeader, postId));
    }

    @GetMapping("/saved")
    public ResponseEntity<?> getSavedPosts(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "results", postService.getSavedPosts(authorizationHeader)
                )
        );
    }

    @PutMapping("/{postId}")
    public ResponseEntity<?> updatePost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId,
            @RequestBody CreatePostRequest request
    ) {
        PostDetail updatedPost = postService.updatePost(authorizationHeader, postId, request);
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "게시물이 수정되었습니다.",
                        "post", updatedPost
                )
        );
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        postService.deletePost(authorizationHeader, postId);
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "게시물이 삭제되었습니다."
                )
        );
    }

    @PostMapping("/comments/{commentId}/replies")
    public ResponseEntity<?> createReply(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long commentId,
            @RequestBody CreateCommentRequest replyRequest
    ) {
        replyRequest.setParentCommentId(commentId);

        // parentComment에서 postId 조회
        com.moodcast.post.vo.CommentSummary parent = postService.getCommentById(commentId);
        CommentSummary reply = postService.addComment(authorizationHeader, parent.getPostId(), replyRequest);
        return ResponseEntity.ok(Map.of("success", true, "comment", reply));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<?> updateComment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long commentId,
            @RequestBody Map<String, String> body
    ) {
        CommentSummary updated = postService.updateComment(authorizationHeader, commentId, body.get("content"));
        return ResponseEntity.ok(Map.of("success", true, "comment", updated));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long commentId
    ) {
        postService.deleteComment(authorizationHeader, commentId);
        return ResponseEntity.ok(Map.of("success", true, "message", "댓글이 삭제되었습니다."));
    }
}
