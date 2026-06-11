package com.moodcast.post.dao;

import com.moodcast.post.vo.CommentSummary;
import com.moodcast.post.vo.EmotionStat;
import com.moodcast.post.vo.Hashtag;
import com.moodcast.post.vo.PostMention;
import com.moodcast.post.vo.PostDetail;
import com.moodcast.post.vo.Post;
import com.moodcast.post.vo.PostSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PostDao {
    int insertPost(Post post);

    Long findHashtagIdByText(@Param("hashtag") String hashtag);

    int insertHashtag(Hashtag hashtag);

    int incrementHashtagUseCount(@Param("hashtagId") Long hashtagId);

    int decrementHashtagUseCount(@Param("hashtagId") Long hashtagId);

    int insertPostHashtag(@Param("postId") Long postId, @Param("hashtagId") Long hashtagId);

    int insertPostMention(PostMention mention);

    int deletePostMentionsByPostId(@Param("postId") Long postId);

    int insertCommentMention(PostMention mention);

    int deleteCommentMentionsByCommentId(@Param("commentId") Long commentId);

    PostDetail selectPostById(@Param("postId") Long postId, @Param("viewerId") Long viewerId);

    int updatePost(Post post);

    int deletePostHashtagsByPostId(@Param("postId") Long postId);

    int softDeletePost(@Param("postId") Long postId);

    List<PostSummary> selectRecentPosts(@Param("viewerId") Long viewerId);

    List<PostSummary> selectPopularPosts(@Param("viewerId") Long viewerId, @Param("limit") Integer limit);

    List<PostSummary> selectPostsByMember(@Param("memberId") Long memberId, @Param("viewerId") Long viewerId);

    List<PostMention> selectMentionsByPostId(@Param("postId") Long postId);

    List<PostMention> selectCommentMentionsByCommentId(@Param("commentId") Long commentId);

    List<CommentSummary> selectCommentsByPostId(@Param("postId") Long postId);

    List<CommentSummary> selectRepliesByPostId(@Param("postId") Long postId);

    List<EmotionStat> selectEmotionStats(@Param("memberId") Long memberId, @Param("period") String period);

    int insertComment(CommentSummary comment);

    int updateComment(@Param("commentId") Long commentId, @Param("content") String content);

    int deleteComment(@Param("commentId") Long commentId);

    List<Long> selectChildCommentIds(@Param("commentId") Long commentId);

    CommentSummary selectCommentById(@Param("commentId") Long commentId);

    int selectPostLikeByPostAndMember(@Param("postId") Long postId, @Param("memberId") Long memberId);

    int insertPostLike(@Param("postId") Long postId, @Param("memberId") Long memberId);

    int deletePostLike(@Param("postId") Long postId, @Param("memberId") Long memberId);

    int selectSavedPostByPostAndMember(@Param("postId") Long postId, @Param("memberId") Long memberId);

    int insertSavedPost(@Param("postId") Long postId, @Param("memberId") Long memberId);

    int deleteSavedPost(@Param("postId") Long postId, @Param("memberId") Long memberId);

    List<PostSummary> selectSavedPostsByMember(@Param("memberId") Long memberId, @Param("viewerId") Long viewerId);
}
