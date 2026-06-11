package com.moodcast.admin.dao;

import com.moodcast.admin.vo.AdminActionLogView;
import com.moodcast.admin.vo.AdminActiveUserStat;
import com.moodcast.admin.vo.AdminContentComment;
import com.moodcast.admin.vo.AdminContentHashtag;
import com.moodcast.admin.vo.AdminContentPost;
import com.moodcast.admin.vo.AdminDashboardSummary;
import com.moodcast.admin.vo.AdminEmotionActivity;
import com.moodcast.admin.vo.AdminMember;
import com.moodcast.admin.vo.AdminMemberDetail;
import com.moodcast.admin.vo.AdminProfile;
import com.moodcast.admin.vo.AdminRecentActivity;
import com.moodcast.admin.vo.AdminRecentMember;
import com.moodcast.admin.vo.AdminReport;
import com.moodcast.admin.vo.AdminReportActivity;
import com.moodcast.admin.vo.AdminReportProcessRateStat;
import com.moodcast.admin.vo.AdminReportReporter;
import com.moodcast.admin.vo.AdminStatisticsSummary;
import com.moodcast.admin.vo.AdminStatisticsTrend;
import com.moodcast.admin.vo.AdminUserManagementSummary;
import com.moodcast.admin.vo.Notice;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

/* ==========================================================================
 * 관리자 페이지 공통 DAO
 * --------------------------------------------------------------------------
 * 관리자 기능에서 사용하는 MyBatis Mapper 인터페이스입니다.
 *
 * 역할:
 * - 서비스에서 필요한 조회, 수정, 삭제 요청을 mapper XML의 SQL과 연결합니다.
 * - 회원, 콘텐츠, 신고, 대시보드, 통계, 공지사항 관리 데이터를 조회합니다.
 *
 * 주의:
 * - 이 파일은 SQL을 직접 작성하지 않고 메서드 선언만 관리합니다.
 * - 실제 쿼리는 admin-mapper.xml과 연결됩니다.
 * ========================================================================== */
@Mapper // MyBatis가 이 인터페이스를 DB Mapper로 인식하도록 합니다.
public interface AdminDao {

    /* 전체 회원 수를 조회합니다. */
    Long selectTotalMemberCount();

    /* 전체 회원 목록을 조회합니다. */
    List<AdminMember> selectMembers();

    /* 콘텐츠 관리 페이지에서 사용할 게시글 목록을 조회합니다. */
    List<AdminContentPost> selectAdminContentPosts();

    /* 콘텐츠 관리 페이지에서 사용할 댓글 목록을 조회합니다. */
    List<AdminContentComment> selectAdminContentComments();

    /* 댓글 상태 변경 후 화면 갱신에 필요한 최신 댓글 정보를 조회합니다. */
    AdminContentComment selectAdminContentCommentById(@Param("commentId") Long commentId);

    /* 콘텐츠 관리 페이지에서 사용할 해시태그 목록을 조회합니다. */
    List<AdminContentHashtag> selectAdminContentHashtags();

    /* 해시태그 상태 변경 후 화면 갱신에 필요한 최신 해시태그 정보를 조회합니다. */
    AdminContentHashtag selectAdminContentHashtagById(@Param("hashtagId") Long hashtagId);

    /*
     * 게시글 작업 후 최신 상태를 다시 조회합니다.
     * 프론트에서는 이 결과로 카드 한 건만 갱신할 수 있습니다.
     */
    AdminContentPost selectAdminContentPostById(@Param("postId") Long postId);

    /*
     * 게시글 숨김 처리입니다.
     * post_tbl.visibility를 PRIVATE로 변경합니다.
     */
    int hideAdminContentPost(@Param("postId") Long postId);

    /*
     * 숨김 처리된 게시글을 복구합니다.
     * post_tbl.visibility를 PUBLIC으로 되돌립니다.
     */
    int restoreHiddenAdminContentPost(@Param("postId") Long postId);

    /*
     * 게시글 삭제 처리입니다.
     * 프로젝트 정책에 맞춰 post_tbl.deleted_yn을 Y로 바꾸는 soft delete입니다.
     */
    int softDeleteAdminContentPost(@Param("postId") Long postId);

    /*
     * 삭제 처리된 게시글을 복구합니다.
     * deleted_yn을 N으로 되돌리고 공개 상태를 PUBLIC으로 맞춥니다.
     */
    int restoreDeletedAdminContentPost(@Param("postId") Long postId);

    /*
     * 완전 삭제 전에 연결 데이터를 정리합니다.
     * FK 제약 때문에 게시글 본문 삭제 전에 댓글, 좋아요, 저장, 해시태그 연결을 먼저 제거합니다.
     */
    int deleteAdminPostComments(@Param("postId") Long postId);

    int deleteAdminPostLikes(@Param("postId") Long postId);

    int deleteAdminPostSaves(@Param("postId") Long postId);

    int deleteAdminPostHashtags(@Param("postId") Long postId);

    /*
     * 게시글을 완전 삭제합니다.
     * 로그 테이블은 append-only 정책이므로 삭제하지 않습니다.
     */
    int hardDeleteAdminContentPost(@Param("postId") Long postId);

    /* 댓글을 삭제 상태로 변경합니다. */
    int softDeleteAdminContentComment(@Param("commentId") Long commentId);

    /* 삭제된 댓글을 다시 표시 상태로 복구합니다. */
    int restoreAdminContentComment(@Param("commentId") Long commentId);

    /* 해시태그 삭제 전에 post_hashtag 연결 레코드를 먼저 제거합니다. */
    int deleteAdminPostHashtagsByHashtagId(@Param("hashtagId") Long hashtagId);

    /* hashtag 테이블에서 해시태그를 완전 삭제합니다. */
    int hardDeleteAdminContentHashtag(@Param("hashtagId") Long hashtagId);

    /* 해시태그가 존재하는지 확인합니다. */
    int countAdminContentHashtagById(@Param("hashtagId") Long hashtagId);

    /* 사용자 관리 상단 요약 수치를 조회합니다. */
    AdminUserManagementSummary selectUserManagementSummaryCounts();

    /* 사용자 관리 카드에 표시할 최근 가입 회원 1명을 조회합니다. */
    AdminRecentMember selectLatestJoinedMember();

    /* 사용자 관리 카드에 표시할 최근 제재 회원 1명을 조회합니다. */
    AdminRecentMember selectLatestSanctionedMember();

    /* 사용자 관리에 표시할 최근 권한 변경/제재 로그를 조회합니다. */
    List<AdminActionLogView> selectRecentAdminActionLogs();

    /* 전체 로그 보기 팝업에서 사용할 관리자 작업 로그 전체 목록을 조회합니다. */
    List<AdminActionLogView> selectAllAdminActionLogs();

    /* 선택 회원의 제재/해제 이력을 조회합니다. */
    List<AdminActionLogView> selectMemberSanctionLogs(@Param("memberId") Long memberId);

    /* 회원 상세 정보를 조회합니다. */
    AdminMemberDetail selectMemberDetail(@Param("memberId") Long memberId);

    /* 관리자 권한 관리에서 이메일 또는 이름으로 회원을 검색합니다. */
    List<AdminMember> searchMembersForAdminPromotion(
            @Param("searchType") String searchType,
            @Param("keyword") String keyword
    );

    /* ACTIVE 상태 회원의 역할을 일반 회원 또는 관리자로 변경합니다. */
    int updateMemberRoleForAdminPromotion(
            @Param("memberId") Long memberId,
            @Param("role") String role
    );

    /* 선택 회원을 정지 상태로 변경합니다. suspendedUntil이 null이면 영구 정지입니다. */
    int suspendMember(
            @Param("memberId") Long memberId,
            @Param("suspendedUntil") LocalDateTime suspendedUntil
    );

    /* 회원에게 경고 횟수를 추가합니다. */
    int addWarningToMember(@Param("memberId") Long memberId);

    int restoreSuspendedMember(@Param("memberId") Long memberId);

    /* 관리자 작업 로그를 추가합니다. */
    int insertAdminActionLog(
            @Param("adminId") Long adminId,
            @Param("actionType") String actionType,
            @Param("targetType") String targetType,
            @Param("targetId") Long targetId,
            @Param("actionDetail") String actionDetail
    );

    /* 신고 및 제재 관리 페이지에서 신고 목록을 조회합니다. */
    List<AdminReport> selectAdminReports(
            @Param("status") String status,
            @Param("targetType") String targetType,
            @Param("processResult") String processResult
    );

    /* 관리자 기능 담당 작업(문건우): 신고 처리율 통계는 목록 전체 로딩 없이 DB에서 집계합니다. */
    AdminReportProcessRateStat selectAdminReportProcessRate(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /* 신고 상세와 처리 후 갱신에 사용하는 신고 단건 조회입니다. */
    AdminReport selectAdminReportById(@Param("reportId") Long reportId);

    /* 신고 상세 패널에 표시할 대상 회원의 최근 활동을 조회합니다. */
    List<AdminReportActivity> selectAdminReportRecentActivities(@Param("memberId") Long memberId);

    List<AdminReportReporter> selectAdminReportReporters(@Param("reportId") Long reportId);

    /* 처리 대기 신고를 검토 중 상태로 전환합니다. */
    int markAdminReportReviewing(@Param("reportId") Long reportId);

    /* 신고 최종 처리 결과를 저장합니다. */
    int processAdminReport(
            @Param("reportId") Long reportId,
            @Param("adminId") Long adminId,
            @Param("processResult") String processResult,
            @Param("handledMemo") String handledMemo
    );

    /* 관리자 대시보드 상단 카드에 표시할 요약 수치를 조회합니다. */
    AdminDashboardSummary selectDashboardSummary();

    /* 관리자 대시보드의 감정별 활동 분포를 조회합니다. */
    List<AdminEmotionActivity> selectDashboardEmotionActivity(
            @Param("period") String period,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /* 관리자 대시보드의 기간별 활성 사용자 통계를 조회합니다. */
    List<AdminActiveUserStat> selectDashboardActiveUsers(
            @Param("period") String period,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /* 관리자 대시보드의 최근 활동 10건을 조회합니다. */
    List<AdminRecentActivity> selectRecentDashboardActivities();

    /* 전체 활동 보기 팝업에서 사용할 모든 활동 로그를 조회합니다. */
    List<AdminRecentActivity> selectAllDashboardActivities();

    /* 통계 대시보드 상단 카드와 요약에 사용할 기간별 수치를 조회합니다. */
    AdminStatisticsSummary selectStatisticsSummary(
            @Param("period") String period,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /* 통계 대시보드 가입자 추이 차트에 사용할 기간별 가입자 흐름을 조회합니다. */
    List<AdminStatisticsTrend> selectStatisticsSubscriberTrend(
            @Param("period") String period,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /* 통계 대시보드 콘텐츠 활동 막대 그래프에 사용할 게시글/댓글/공감 수를 조회합니다. */
    List<AdminStatisticsTrend> selectStatisticsContentActivity(
            @Param("period") String period,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /* 로그인한 관리자 본인의 개인 정보를 조회합니다. */
    AdminProfile selectAdminProfile(@Param("memberId") Long memberId);

    /* 관리자 계정의 프로필 이미지를 기본값으로 되돌립니다. */
    int resetAdminProfileImagesToDefault();

    /* 로그인한 관리자 본인의 이름, 닉네임, 전화번호를 수정합니다. */
    int updateAdminProfile(
            @Param("memberId") Long memberId,
            @Param("name") String name,
            @Param("nickname") String nickname,
            @Param("phone") String phone
    );

    List<Notice> selectAdminNotices(@Param("status") String status);

    Notice selectAdminNoticeById(@Param("noticeId") Long noticeId);

    Notice selectLatestActiveNotice();

    int insertAdminNotice(
            @Param("title") String title,
            @Param("content") String content,
            @Param("noticeType") String noticeType,
            @Param("adminId") Long adminId
    );

    int updateAdminNotice(
            @Param("noticeId") Long noticeId,
            @Param("title") String title,
            @Param("content") String content,
            @Param("noticeType") String noticeType,
            @Param("adminId") Long adminId
    );

    int softDeleteAdminNotice(
            @Param("noticeId") Long noticeId,
            @Param("adminId") Long adminId
    );

}
