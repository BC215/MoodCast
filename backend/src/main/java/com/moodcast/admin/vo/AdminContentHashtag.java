package com.moodcast.admin.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/* ==========================================================================
 * 관리자 콘텐츠 관리 해시태그 VO
 * --------------------------------------------------------------------------
 * 콘텐츠 관리 페이지의 "해시태그" 탭에서 해시태그 목록을 보여주기 위한 응답 객체입니다.
 *
 * 초보자 설명:
 * - hashtag 테이블의 태그 이름과 post_hashtag 연결 수를 함께 내려줍니다.
 * - postCount는 실제 게시글과 연결된 횟수입니다.
 * - useCount는 hashtag 테이블에 저장된 누적 사용 횟수입니다.
 * ========================================================================== */
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AdminContentHashtag {

    private Long hashtagId; // hashtag.hashtag_id: 해시태그를 구분하는 고유 번호입니다.

    private String hashtag; // hashtag.hashtag: 화면에 #태그 형태로 보여줄 이름입니다.

    private Long useCount; // hashtag.use_count: 해시태그 테이블에 저장된 누적 사용 횟수입니다.

    private Long postCount; // post_hashtag 기준 실제 연결된 게시글 수입니다.

    private String latestPostCreatedAt; // 해당 해시태그가 연결된 게시글 중 가장 최근 작성일입니다.

    private String moderationStatus; // 관리자 화면에서 표시할 상태입니다. PUBLIC, HIDDEN, DELETED 중 하나입니다.
}
