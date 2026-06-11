package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/* ==========================================================================
 * 관리자 콘텐츠 관리 댓글 VO
 * --------------------------------------------------------------------------
 * 콘텐츠 관리 페이지의 "댓글" 탭에서 댓글 목록을 보여주기 위한 응답 객체입니다.
 *
 * 초보자 설명:
 * - VO는 DB에서 조회한 결과를 프론트엔드로 보내기 좋게 담아두는 상자입니다.
 * - 댓글 자체의 내용뿐 아니라 어떤 게시글에 달렸는지, 누가 작성했는지도 함께 내려줍니다.
 * - 비밀번호, 토큰 같은 민감정보는 절대로 포함하지 않습니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminContentComment {

    private Long commentId; // comment_tbl.comment_id: 댓글을 구분하는 고유 번호입니다.

    private Long postId; // comment_tbl.post_id: 댓글이 달린 게시글 번호입니다.

    private String postTitle; // post_tbl.title: 댓글이 달린 게시글 제목입니다.

    private String content; // comment_tbl.content: 댓글 본문입니다.

    private String deletedYn; // comment_tbl.deleted_yn: 댓글 삭제 여부입니다. Y면 삭제된 댓글입니다.

    private String moderationStatus; // 관리자 화면에서 표시할 상태입니다. PUBLIC, HIDDEN, DELETED 중 하나입니다.

    private String createdAt; // comment_tbl.created_at: 화면 표시용 작성일입니다.

    private Long memberId; // members.member_id: 댓글 작성자 회원 번호입니다.

    private String authorName; // members.name: 댓글 작성자 실명입니다.

    private String authorNickname; // members.nickname: 댓글 작성자 닉네임입니다.

    private String authorProfileImageUrl; // members.profile_image_url: 댓글 작성자 프로필 이미지 URL입니다.

    private Long parentId; // comment_tbl.parent_id: 답글이면 부모 댓글 번호가 들어갑니다.
}
