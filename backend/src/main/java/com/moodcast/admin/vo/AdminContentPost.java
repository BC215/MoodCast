package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/* ==========================================================================
 * 관리자 콘텐츠 관리 게시글 VO
 * --------------------------------------------------------------------------
 * 콘텐츠 관리 페이지에서 게시글 카드 하나를 그릴 때 필요한 값만 담는 객체입니다.
 *
 * 초보자 설명:
 * - VO는 DB 조회 결과를 프론트엔드로 보내기 좋게 담아두는 상자입니다.
 * - post_tbl에는 게시글 정보가 있고, members에는 작성자 정보가 있으므로
 *   mapper에서 두 테이블을 join한 뒤 이 VO에 담습니다.
 * - 비밀번호 같은 민감정보는 절대 포함하지 않습니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminContentPost {

    private Long postId; // post_tbl.post_id: 게시글을 구분하는 고유 번호입니다.

    private String title; // post_tbl.title: 게시글 제목입니다.

    private String content; // post_tbl.content: 게시글 본문입니다.

    private String visibility; // post_tbl.visibility: 공개 범위 값입니다.

    private String deletedYn; // post_tbl.deleted_yn: 삭제 여부입니다. Y이면 삭제된 게시글입니다.

    private Long emotionId; // post_tbl.emotion_id: 감정 필터에 사용하는 감정 번호입니다.

    private String createdAt; // post_tbl.created_at: 화면 표시용으로 포맷된 작성일입니다.

    private Long memberId; // members.member_id: 작성자 회원 번호입니다.

    private String authorName; // members.name: 작성자 실명입니다.

    private String authorNickname; // members.nickname: 작성자 닉네임입니다.

    private String authorProfileImageUrl; // members.profile_image_url: 작성자 프로필 이미지 URL입니다.

    private Long commentCount; // comment_tbl 기준 삭제되지 않은 댓글 수입니다.

    private Long hashtagCount; // post_hashtag 기준 연결된 해시태그 수입니다.

    private String tags; // post_hashtag와 hashtag를 조합한 "#태그" 문자열입니다.
}
