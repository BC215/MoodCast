package com.moodcast.post.service;

import com.moodcast.member.dto.login.LoginMemberResponse;
import com.moodcast.member.service.LoginService;
import com.moodcast.notification.dao.NotificationDao;
import com.moodcast.notification.vo.Notification;
import com.moodcast.post.dao.PostDao;
import com.moodcast.post.dto.CreateCommentRequest;
import com.moodcast.post.dto.CreatePostRequest;
import com.moodcast.post.dto.PostMentionNotificationDto;
import com.moodcast.post.dto.PostMentionRequest;
import com.moodcast.post.vo.CommentSummary;
import com.moodcast.post.vo.EmotionStat;
import com.moodcast.post.vo.Hashtag;
import com.moodcast.post.vo.PostDetail;
import com.moodcast.post.vo.Post;
import com.moodcast.post.vo.PostMention;
import com.moodcast.post.vo.PostSummary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PostService {
    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter NOTIFICATION_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private PostDao postDao;

    @Autowired
    private LoginService loginService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationDao notificationDao;

    @Transactional
    public Long createPost(String authorizationHeader, CreatePostRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("게시물 정보를 입력해주세요.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        Long memberId = loginMember.getMemberId();

        String title = request.getTitle() != null ? request.getTitle().trim() : null;
        String content = request.getContent() != null ? request.getContent().trim() : null;

        if ((title == null || title.isEmpty()) && (content == null || content.isEmpty())) {
            throw new IllegalArgumentException("제목 또는 본문을 입력해주세요.");
        }
        if (request.getEmotionId() == null) {
            throw new IllegalArgumentException("오늘의 감정을 선택해주세요.");
        }

        Post post = new Post();
        post.setMemberId(memberId);
        post.setTitle(title);
        post.setContent(content);
        post.setVisibility("PUBLIC");
        post.setEmotionId(request.getEmotionId()); // 감정 설정

        int inserted = postDao.insertPost(post);
        if (inserted != 1 || post.getPostId() == null) {
            throw new IllegalStateException("게시물 저장에 실패했습니다.");
        }

        Long postId = post.getPostId();
        List<String> hashtags = parseHashtags(request.getTags());
        for (String hashtagText : hashtags) {
            Long hashtagId = postDao.findHashtagIdByText(hashtagText);
            if (hashtagId == null) {
                Hashtag hashtag = new Hashtag();
                hashtag.setHashtag(hashtagText);
                int hashtagInserted = postDao.insertHashtag(hashtag);
                if (hashtagInserted != 1 || hashtag.getHashtagId() == null) {
                    throw new IllegalStateException("해시태그 저장에 실패했습니다.");
                }
                hashtagId = hashtag.getHashtagId();
            } else {
                postDao.incrementHashtagUseCount(hashtagId);
            }
            postDao.insertPostHashtag(postId, hashtagId);
        }

        List<PostMention> mentions = normalizeMentions(postId, request.getMentions());
        persistMentions(postId, mentions);
        sendMentionNotifications(postId, post, loginMember, mentions);

        return postId;
    }

    private List<String> parseHashtags(String tags) {
        if (tags == null || tags.trim().isEmpty()) {
            return List.of();
        }

        // #로 시작하는 해시태그를 추출 (예: #hello #world #test)
        return Arrays.stream(tags.split("\\s+"))
                .map(String::trim)
                .filter(tag -> tag.startsWith("#"))  // #로 시작하는 태그만
                .map(tag -> tag.replaceAll("^#+", ""))  // # 기호 제거
                .map(String::toLowerCase)
                .filter(tag -> !tag.isEmpty() && tag.length() <= 50)  // 빈 태그, 50자 초과 태그 제거
                .distinct()
                .collect(Collectors.toList());
    }

    private List<PostMention> normalizeMentions(Long postId, List<PostMentionRequest> requests) {
        if (postId == null || requests == null || requests.isEmpty()) {
            return List.of();
        }

        List<PostMention> mentions = new java.util.ArrayList<>();
        for (PostMentionRequest request : requests) {
            if (request == null) {
                continue;
            }

            if (request.getUserId() == null
                    || request.getMentionText() == null
                    || request.getMentionText().trim().isEmpty()
                    || request.getStartIndex() == null
                    || request.getEndIndex() == null) {
                throw new IllegalArgumentException("멘션 정보가 올바르지 않습니다.");
            }

            PostMention mention = new PostMention();
            mention.setPostId(postId);
            mention.setUserId(request.getUserId());
            mention.setNickname(request.getNickname());
            mention.setMentionText(request.getMentionText().trim());
            mention.setStartIndex(request.getStartIndex());
            mention.setEndIndex(request.getEndIndex());
            mentions.add(mention);
        }

        mentions.sort(java.util.Comparator.comparingInt(mention -> mention.getStartIndex() == null ? 0 : mention.getStartIndex()));
        return mentions;
    }

    private void persistMentions(Long postId, List<PostMention> mentions) {
        if (postId == null) {
            return;
        }

        postDao.deletePostMentionsByPostId(postId);
        if (mentions == null || mentions.isEmpty()) {
            return;
        }

        for (PostMention mention : mentions) {
            postDao.insertPostMention(mention);
        }
    }

    private void persistCommentMentions(Long commentId, List<PostMention> mentions) {
        if (commentId == null) {
            return;
        }

        postDao.deleteCommentMentionsByCommentId(commentId);
        if (mentions == null || mentions.isEmpty()) {
            return;
        }

        for (PostMention mention : mentions) {
            mention.setCommentId(commentId);
            postDao.insertCommentMention(mention);
        }
    }

    private void sendMentionNotifications(Long postId, Post post, LoginMemberResponse author, List<PostMention> mentions) {
        if (postId == null || post == null || author == null || mentions == null || mentions.isEmpty()) {
            return;
        }

        Set<String> sentKeys = new LinkedHashSet<>();
        for (PostMention mention : mentions) {
            if (mention == null || mention.getUserId() == null || mention.getUserId().equals(author.getMemberId())) {
                continue;
            }

            String dedupeKey = mention.getUserId() + ":" + mention.getStartIndex() + ":" + mention.getEndIndex();
            if (!sentKeys.add(dedupeKey)) {
                continue;
            }

            Notification notification = new Notification();
            notification.setRecipientMemberId(mention.getUserId());
            notification.setSenderMemberId(author.getMemberId());
            notification.setNotificationType("MENTION");
            notification.setTargetType("POST");
            notification.setTargetId(postId);
            notification.setTitle(post.getTitle() == null || post.getTitle().trim().isEmpty() ? "새 멘션" : post.getTitle().trim());
            notification.setContent(mention.getMentionText());
            notification.setIsRead("N");
            notificationDao.insertNotification(notification);

            PostMentionNotificationDto payload = new PostMentionNotificationDto();
            payload.setNotificationId("mention-" + postId + "-" + mention.getUserId() + "-" + mention.getStartIndex());
            payload.setEventType("MENTION");
            payload.setPostId(postId);
            payload.setSenderId(author.getMemberId());
            payload.setSenderName(resolveMemberDisplayName(author));
            payload.setSenderProfileImageUrl(author.getProfileImageUrl());
            payload.setMentionedUserId(mention.getUserId());
            payload.setMentionText(mention.getMentionText());
            payload.setTargetType("POST");
            payload.setTargetId(postId);
            payload.setTitle(notification.getTitle());
            payload.setContent(mention.getMentionText());
            payload.setCreatedAt(LocalDateTime.now(KOREA_ZONE).format(NOTIFICATION_TIME_FORMATTER));

            messagingTemplate.convertAndSend("/sub/notifications/" + mention.getUserId(), payload);
        }
    }

    private void sendMentionNotifications(Long postId, String postTitle, LoginMemberResponse author, List<PostMention> mentions) {
        if (postId == null || author == null || mentions == null || mentions.isEmpty()) {
            return;
        }

        Set<String> sentKeys = new LinkedHashSet<>();
        for (PostMention mention : mentions) {
            if (mention == null || mention.getUserId() == null || mention.getUserId().equals(author.getMemberId())) {
                continue;
            }

            String dedupeKey = mention.getUserId() + ":" + mention.getStartIndex() + ":" + mention.getEndIndex();
            if (!sentKeys.add(dedupeKey)) {
                continue;
            }

            Notification notification = new Notification();
            notification.setRecipientMemberId(mention.getUserId());
            notification.setSenderMemberId(author.getMemberId());
            notification.setNotificationType("MENTION");
            notification.setTargetType("POST");
            notification.setTargetId(postId);
            notification.setTitle(postTitle == null || postTitle.trim().isEmpty() ? "새 멘션" : postTitle.trim());
            notification.setContent(mention.getMentionText());
            notification.setIsRead("N");
            notificationDao.insertNotification(notification);

            PostMentionNotificationDto payload = new PostMentionNotificationDto();
            payload.setNotificationId("mention-" + postId + "-" + mention.getUserId() + "-" + mention.getStartIndex());
            payload.setEventType("MENTION");
            payload.setPostId(postId);
            payload.setSenderId(author.getMemberId());
            payload.setSenderName(resolveMemberDisplayName(author));
            payload.setSenderProfileImageUrl(author.getProfileImageUrl());
            payload.setMentionedUserId(mention.getUserId());
            payload.setMentionText(mention.getMentionText());
            payload.setTargetType("POST");
            payload.setTargetId(postId);
            payload.setTitle(notification.getTitle());
            payload.setContent(mention.getMentionText());
            payload.setCreatedAt(LocalDateTime.now(KOREA_ZONE).format(NOTIFICATION_TIME_FORMATTER));

            messagingTemplate.convertAndSend("/sub/notifications/" + mention.getUserId(), payload);
        }
    }

    private String getPostTitle(Long postId) {
        if (postId == null) {
            return null;
        }

        PostDetail post = postDao.selectPostById(postId, null);
        if (post == null) {
            return null;
        }

        return post.getTitle();
    }

    private Long getViewerId(String authorizationHeader) {
        try {
            return loginService.getMemberIdFromHeaderOptional(authorizationHeader);
        } catch (Exception ignored) {
            return null;
        }
    }

    public List<PostSummary> getRecentPosts(String authorizationHeader) {
        Long viewerId = getViewerId(authorizationHeader);
        return postDao.selectRecentPosts(viewerId);
    }

    public List<PostSummary> getPopularPosts(String authorizationHeader, Integer limit) {
        Long viewerId = getViewerId(authorizationHeader);
        int safeLimit = limit == null || limit <= 0 ? 5 : limit;
        return postDao.selectPopularPosts(viewerId, safeLimit);
    }

    public List<PostSummary> getPostsByMember(Long memberId, String authorizationHeader) {
        if (memberId == null) {
            throw new IllegalArgumentException("회원 ID가 필요합니다.");
        }
        Long viewerId = getViewerId(authorizationHeader);
        return postDao.selectPostsByMember(memberId, viewerId);
    }

    public PostDetail getPostById(Long postId, String authorizationHeader) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }

        Long viewerId = getViewerId(authorizationHeader);
        PostDetail post = postDao.selectPostById(postId, viewerId);
        if (post == null) {
            throw new IllegalArgumentException("게시물을 찾을 수 없습니다.");
        }

        return post;
    }

    public CommentSummary getCommentById(Long commentId) {
        CommentSummary c = postDao.selectCommentById(commentId);
        if (c == null) throw new IllegalArgumentException("댓글을 찾을 수 없습니다.");
        return c;
    }

    public List<CommentSummary> getComments(Long postId) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }
        List<CommentSummary> parents = postDao.selectCommentsByPostId(postId);
        List<CommentSummary> replies = postDao.selectRepliesByPostId(postId);

        // 모든 댓글 객체를 맵에 저장하고 replies 리스트를 초기화함
        java.util.Map<Long, CommentSummary> commentMap = new java.util.LinkedHashMap<>();
        for (CommentSummary p : parents) {
            p.setReplies(new java.util.ArrayList<>());
            commentMap.put(p.getCommentId(), p);
        }
        for (CommentSummary r : replies) {
            r.setReplies(new java.util.ArrayList<>());
            commentMap.put(r.getCommentId(), r);
        }

        // 각각의 댓글을 parentCommentId 기준으로 부모에 붙임
        for (CommentSummary r : replies) {
            CommentSummary parent = commentMap.get(r.getParentCommentId());
            if (parent != null) {
                parent.getReplies().add(r);
            }
        }

        return parents;
    }

    public List<EmotionStat> getEmotionStats(Long memberId, String period) {
        if (memberId == null) {
            throw new IllegalArgumentException("회원 ID가 필요합니다.");
        }
        return postDao.selectEmotionStats(memberId, normalizePeriod(period));
    }

    private String normalizePeriod(String period) {
        if (period == null) {
            return "all";
        }
        String normalized = period.toLowerCase();
        if ("week".equals(normalized) || "month".equals(normalized) || "all".equals(normalized)) {
            return normalized;
        }
        return "all";
    }

    @Transactional
    public CommentSummary addComment(String authorizationHeader, Long postId, CreateCommentRequest request) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }
        if (request == null || request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("댓글을 입력해주세요.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        Long memberId = loginMember.getMemberId();

        CommentSummary comment = new CommentSummary();
        comment.setPostId(postId);
        comment.setMemberId(memberId);
        comment.setContent(request.getContent().trim());
        comment.setParentCommentId(request.getParentCommentId());

        int inserted = postDao.insertComment(comment);
        if (inserted != 1 || comment.getCommentId() == null) {
            throw new IllegalStateException("댓글 저장에 실패했습니다.");
        }

        comment.setAuthor(loginMember.getNickname());
        comment.setProfileImageUrl(loginMember.getProfileImageUrl());
        List<PostMention> mentions = normalizeMentions(postId, request.getMentions());
        comment.setMentions(mentions);
        persistCommentMentions(comment.getCommentId(), mentions);
        sendMentionNotifications(postId, getPostTitle(postId), loginMember, mentions);
        sendCommentNotification(postId, comment, loginMember);
        return comment;
    }

    private void sendCommentNotification(Long postId, CommentSummary comment, LoginMemberResponse commenter) {
        if (postId == null || comment == null || commenter == null) {
            return;
        }

        PostDetail post = postDao.selectPostById(postId, null);
        if (post == null || post.getMemberId() == null || post.getMemberId().equals(commenter.getMemberId())) {
            return;
        }

        com.moodcast.post.dto.PostCommentNotificationDto notification =
                new com.moodcast.post.dto.PostCommentNotificationDto();
        notification.setNotificationId("comment-" + comment.getCommentId());
        notification.setEventType("COMMENT_NOTIFICATION");
        notification.setPostId(postId);
        notification.setCommentId(comment.getCommentId());
        notification.setPostOwnerId(post.getMemberId());
        notification.setCommenterId(commenter.getMemberId());
        notification.setCommenterName(resolveMemberDisplayName(commenter));
        notification.setCommenterProfileImageUrl(commenter.getProfileImageUrl());
        notification.setPostTitle(post.getTitle());
        notification.setPreview(buildCommentPreview(comment.getContent()));
        notification.setCreatedAt(LocalDateTime.now(KOREA_ZONE).format(NOTIFICATION_TIME_FORMATTER));

        messagingTemplate.convertAndSend("/sub/notifications/" + post.getMemberId(), notification);
    }

    private String buildCommentPreview(String content) {
        if (content == null) {
            return "";
        }

        String trimmed = content.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        return trimmed.length() > 80 ? trimmed.substring(0, 80) + "..." : trimmed;
    }

    private String resolveMemberDisplayName(LoginMemberResponse member) {
        if (member == null) {
            return "";
        }

        if (member.getNickname() != null && !member.getNickname().trim().isEmpty()) {
            return member.getNickname().trim();
        }

        if (member.getName() != null && !member.getName().trim().isEmpty()) {
            return member.getName().trim();
        }

        return "";
    }

    @Transactional
    public Map<String, Object> toggleLike(String authorizationHeader, Long postId) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        Long memberId = loginMember.getMemberId();

        boolean alreadyLiked = postDao.selectPostLikeByPostAndMember(postId, memberId) > 0;
        if (alreadyLiked) {
            postDao.deletePostLike(postId, memberId);
        } else {
            postDao.insertPostLike(postId, memberId);
        }

        PostDetail post = postDao.selectPostById(postId, memberId);
        return Map.of(
                "liked", !alreadyLiked,
                "likes", post.getLikes(),
                "success", true
        );
    }

    @Transactional
    public Map<String, Object> toggleSave(String authorizationHeader, Long postId) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        Long memberId = loginMember.getMemberId();

        boolean alreadySaved = postDao.selectSavedPostByPostAndMember(postId, memberId) > 0;
        if (alreadySaved) {
            postDao.deleteSavedPost(postId, memberId);
        } else {
            postDao.insertSavedPost(postId, memberId);
        }

        PostDetail post = postDao.selectPostById(postId, memberId);
        return Map.of(
                "saved", !alreadySaved,
                "savedCount", post.getSaves(),
                "success", true
        );
    }

    public List<PostSummary> getSavedPosts(String authorizationHeader) {
        Long memberId = getViewerId(authorizationHeader);
        if (memberId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        return postDao.selectSavedPostsByMember(memberId, memberId);
    }

    @Transactional
    public PostDetail updatePost(String authorizationHeader, Long postId, CreatePostRequest request) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }
        if (request == null) {
            throw new IllegalArgumentException("게시물 정보를 입력해주세요.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        PostDetail currentPost = getPostById(postId, null);
        if (!currentPost.getMemberId().equals(loginMember.getMemberId())) {
            throw new IllegalArgumentException("본인이 작성한 게시물만 수정할 수 있습니다.");
        }

        String title = request.getTitle() != null ? request.getTitle().trim() : null;
        String content = request.getContent() != null ? request.getContent().trim() : null;

        if ((title == null || title.isEmpty()) && (content == null || content.isEmpty())) {
            throw new IllegalArgumentException("제목 또는 본문을 입력해주세요.");
        }
        if (request.getEmotionId() == null) {
            throw new IllegalArgumentException("오늘의 감정을 선택해주세요.");
        }

        Post post = new Post();
        post.setPostId(postId);
        post.setTitle(title);
        post.setContent(content);
        post.setEmotionId(request.getEmotionId());

        int updated = postDao.updatePost(post);
        if (updated != 1) {
            throw new IllegalStateException("게시물 수정에 실패했습니다.");
        }

        // 기존 태그는 포함 여부 비교만 하면 되므로 Set으로 관리함
        Set<String> existingTagSet = new java.util.HashSet<>(parseHashtags(currentPost.getTags()));
        // 새 태그는 "입력 순서"가 중요하므로 List를 유지함
        List<String> newTags = parseHashtags(request.getTags());
        // 포함 여부 계산용으로만 Set을 추가로 만듦
        Set<String> newTagSet = new java.util.HashSet<>(newTags);

        Set<String> tagsToRemove = new java.util.HashSet<>(existingTagSet);
        tagsToRemove.removeAll(newTagSet);

        Set<String> tagsToAdd = new java.util.HashSet<>(newTagSet);
        tagsToAdd.removeAll(existingTagSet);

        for (String tagText : tagsToRemove) {
            Long hashtagId = postDao.findHashtagIdByText(tagText);
            if (hashtagId != null) {
                postDao.decrementHashtagUseCount(hashtagId);
            }
        }

        // 기존 연결을 지우고 새 입력 기준으로 다시 연결함
        postDao.deletePostHashtagsByPostId(postId);
        // newTags(List)를 순회해야 사용자가 입력한 순서가 DB에 그대로 저장됨
        for (String hashtagText : newTags) {
            Long hashtagId = postDao.findHashtagIdByText(hashtagText);
            if (hashtagId == null) {
                Hashtag hashtag = new Hashtag();
                hashtag.setHashtag(hashtagText);
                int hashtagInserted = postDao.insertHashtag(hashtag);
                if (hashtagInserted != 1 || hashtag.getHashtagId() == null) {
                    throw new IllegalStateException("해시태그 저장에 실패했습니다.");
                }
                hashtagId = hashtag.getHashtagId();
            } else if (tagsToAdd.contains(hashtagText)) {
                postDao.incrementHashtagUseCount(hashtagId);
            }
            postDao.insertPostHashtag(postId, hashtagId);
        }

        List<PostMention> mentions = normalizeMentions(postId, request.getMentions());
        persistMentions(postId, mentions);

        return getPostById(postId, authorizationHeader);
    }

    @Transactional
    public void deletePost(String authorizationHeader, Long postId) {
        if (postId == null) {
            throw new IllegalArgumentException("게시물 ID가 필요합니다.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        PostDetail currentPost = getPostById(postId, null);
        if (!currentPost.getMemberId().equals(loginMember.getMemberId())) {
            throw new IllegalArgumentException("본인이 작성한 게시물만 삭제할 수 있습니다.");
        }

        postDao.softDeletePost(postId);
    }

    @Transactional
    public CommentSummary updateComment(String authorizationHeader, Long commentId, String content) {
        if (commentId == null) throw new IllegalArgumentException("댓글 ID가 필요합니다.");
        if (content == null || content.trim().isEmpty()) throw new IllegalArgumentException("댓글 내용을 입력해주세요.");

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        CommentSummary comment = postDao.selectCommentById(commentId);
        if (comment == null) throw new IllegalArgumentException("댓글을 찾을 수 없습니다.");
        if (!comment.getMemberId().equals(loginMember.getMemberId())) {
            throw new IllegalArgumentException("본인이 작성한 댓글만 수정할 수 있습니다.");
        }

        postDao.updateComment(commentId, content.trim());
        comment.setContent(content.trim());
        return comment;
    }

    @Transactional
    public void deleteComment(String authorizationHeader, Long commentId) {
        if (commentId == null) throw new IllegalArgumentException("댓글 ID가 필요합니다.");

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        CommentSummary comment = postDao.selectCommentById(commentId);
        if (comment == null) throw new IllegalArgumentException("댓글을 찾을 수 없습니다.");
        if (!comment.getMemberId().equals(loginMember.getMemberId())) {
            throw new IllegalArgumentException("본인이 작성한 댓글만 삭제할 수 있습니다.");
        }

        cascadeDeleteComment(commentId);
    }

    private void cascadeDeleteComment(Long commentId) {
        List<Long> childIds = postDao.selectChildCommentIds(commentId);
        for (Long childId : childIds) {
            cascadeDeleteComment(childId);
        }
        postDao.deleteCommentMentionsByCommentId(commentId);
        postDao.deleteComment(commentId);
    }
}

