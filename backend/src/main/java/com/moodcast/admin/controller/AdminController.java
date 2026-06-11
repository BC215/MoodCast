package com.moodcast.admin.controller;

import com.moodcast.admin.service.AdminService;
import com.moodcast.admin.vo.AdminActionLogView;
import com.moodcast.admin.vo.AdminActiveUserStat;
import com.moodcast.admin.vo.AdminContentComment;
import com.moodcast.admin.vo.AdminContentHashtag;
import com.moodcast.admin.vo.AdminContentPost;
import com.moodcast.admin.vo.AdminDashboardSummary;
import com.moodcast.admin.vo.AdminEmotionActivity;
import com.moodcast.admin.vo.AdminMember;
import com.moodcast.admin.vo.AdminMemberDetail;
import com.moodcast.admin.vo.AdminMemberSuspendRequest;
import com.moodcast.admin.vo.AdminNoticeRequest;
import com.moodcast.admin.vo.AdminProfile;
import com.moodcast.admin.vo.AdminProfileUpdateRequest;
import com.moodcast.admin.vo.AdminRecentActivity;
import com.moodcast.admin.vo.AdminReport;
import com.moodcast.admin.vo.AdminReportProcessRequest;
import com.moodcast.admin.vo.AdminReportProcessRateStat;
import com.moodcast.admin.vo.AdminRoleUpdateRequest;
import com.moodcast.admin.vo.AdminStatisticsSummary;
import com.moodcast.admin.vo.AdminStatisticsTrend;
import com.moodcast.admin.vo.AdminUserManagementSummary;
import com.moodcast.admin.vo.Notice;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

/* ==========================================================================
 * 관리자 페이지 공통 컨트롤러
 * --------------------------------------------------------------------------
 * 관리자 페이지에서 사용할 API 요청을 가장 먼저 받는 클래스입니다.
 *
 * 컨트롤러 역할:
 * - 프론트엔드에서 들어온 HTTP 요청을 받습니다.
 * - 실제 비즈니스 처리는 service 계층에 맡깁니다.
 * - service에서 받은 결과를 프론트엔드가 사용할 수 있는 JSON 형태로 응답합니다.
 *
 * 현재 단계:
 * - 관리자 기능 개발을 시작하기 위한 기본 구조만 준비합니다.
 * - 실제 사용자 관리, 공지사항, 신고 처리 API는 이후 이 컨트롤러에 메서드를
 *   추가하거나 기능별 컨트롤러로 분리해서 확장할 수 있습니다.
 *
 * 주의:
 * - 지금은 admin 패키지 내부 파일만 만들기 위해 다른 패키지 파일은 수정하지 않습니다.
 * ========================================================================== */
@RestController // 이 클래스가 JSON 응답을 반환하는 REST API 컨트롤러라는 뜻입니다.
@RequestMapping("/admin/api") // 관리자 API 주소의 공통 시작 경로입니다.
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Autowired // Spring이 AdminService 객체를 자동으로 연결해줍니다.
    private AdminService adminService;

    /* ==========================================================================
     * 전체 회원 수 조회 API
     * --------------------------------------------------------------------------
     * 사용자 관리 페이지의 "전체 회원" 카드에 표시할 숫자를 조회합니다.
     *
     * 요청 주소:
     * - GET /admin/api/members/count
     *
     * 응답 예시:
     * - { "totalMemberCount": 5 }
     * ========================================================================== */
    @GetMapping("/members/count") // 브라우저에서 이 주소로 GET 요청이 오면 아래 메서드가 실행됩니다.
    public Map<String, Long> getTotalMemberCount(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return Map.of("totalMemberCount", adminService.getTotalMemberCount(authorizationHeader));
    }

    /* ==========================================================================
     * 전체 회원 목록 조회 API
     * --------------------------------------------------------------------------
     * 사용자 관리 페이지의 "전체 목록" 테이블에 표시할 회원 목록을 조회합니다.
     *
     * 요청 주소:
     * - GET /admin/api/members
     *
     * 현재 조회 정보:
     * - 사용자: name
     * - 상태: status
     * - 가입일: created_at
     * - 권한: role
     * ========================================================================== */
    @GetMapping("/members") // 브라우저에서 이 주소로 GET 요청이 오면 전체 회원 목록을 반환합니다.
    public Map<String, List<AdminMember>> getMembers(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("[ADMIN_API] GET /admin/api/members requested");
        return Map.of("members", adminService.getMembers(authorizationHeader));
    }

    /* ==========================================================================
     * 콘텐츠 관리 게시글 목록 조회 API
     * --------------------------------------------------------------------------
     * 콘텐츠 관리 페이지에서 게시글 카드를 출력하기 위한 게시글 목록을 조회합니다.
     *
     * 요청 주소:
     * - GET /admin/api/content/posts
     *
     * 응답:
     * - { "posts": [...] }
     * ========================================================================== */
    @GetMapping("/content/posts")
    public Map<String, List<AdminContentPost>> getAdminContentPosts(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("[ADMIN_API] GET /admin/api/content/posts requested");
        return Map.of("posts", adminService.getAdminContentPosts(authorizationHeader));
    }

    /* ========================================================================
     * 콘텐츠 관리 댓글 목록 조회 API
     * ------------------------------------------------------------------------
     * 콘텐츠 관리 페이지의 "댓글" 탭에서 댓글을 조회할 때 사용합니다.
     *
     * 요청 주소:
     * - GET /admin/api/content/comments
     *
     * 응답:
     * - { "comments": [...] }
     * ======================================================================== */
    @GetMapping("/content/comments")
    public Map<String, List<AdminContentComment>> getAdminContentComments(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("[ADMIN_API] GET /admin/api/content/comments requested");
        return Map.of("comments", adminService.getAdminContentComments(authorizationHeader));
    }

    /* ========================================================================
     * 콘텐츠 관리 해시태그 목록 조회 API
     * ------------------------------------------------------------------------
     * 콘텐츠 관리 페이지의 "해시태그" 탭에서 해시태그를 조회할 때 사용합니다.
     *
     * 요청 주소:
     * - GET /admin/api/content/hashtags
     *
     * 응답:
     * - { "hashtags": [...] }
     * ======================================================================== */
    @GetMapping("/content/hashtags")
    public Map<String, List<AdminContentHashtag>> getAdminContentHashtags(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("[ADMIN_API] GET /admin/api/content/hashtags requested");
        return Map.of("hashtags", adminService.getAdminContentHashtags(authorizationHeader));
    }

    @PutMapping("/content/comments/{commentId}/hide")
    public Map<String, Object> hideAdminContentComment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long commentId
    ) {
        return Map.of(
                "success", true,
                "comment", adminService.hideAdminContentComment(authorizationHeader, commentId)
        );
    }

    @PutMapping("/content/comments/{commentId}/restore")
    public Map<String, Object> restoreAdminContentComment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long commentId
    ) {
        return Map.of(
                "success", true,
                "comment", adminService.restoreAdminContentComment(authorizationHeader, commentId)
        );
    }

    @PutMapping("/content/comments/{commentId}/delete")
    public Map<String, Object> softDeleteAdminContentComment(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long commentId
    ) {
        return Map.of(
                "success", true,
                "comment", adminService.softDeleteAdminContentComment(authorizationHeader, commentId)
        );
    }

    @DeleteMapping("/content/hashtags/{hashtagId}")
    public Map<String, Object> hardDeleteAdminContentHashtag(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long hashtagId
    ) {
        adminService.hardDeleteAdminContentHashtag(authorizationHeader, hashtagId);
        return Map.of("success", true);
    }

    /*
     * 게시글 숨김 처리 API
     * --------------------------------------------------------------------------
     * 관리자 콘텐츠 관리 카드의 "숨김" 버튼에서 호출합니다.
     * 삭제가 아니라 visibility만 PRIVATE로 바꾸고, 변경된 게시글 한 건을 돌려줍니다.
     */
    @PutMapping("/content/posts/{postId}/hide")
    public Map<String, Object> hideAdminContentPost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        return Map.of(
                "success", true,
                "post", adminService.hideAdminContentPost(authorizationHeader, postId)
        );
    }

    /*
     * 게시글 숨김 복구 API
     * --------------------------------------------------------------------------
     * 숨김 상태 게시글의 "복구" 버튼에서 호출합니다.
     */
    @PutMapping("/content/posts/{postId}/visibility/restore")
    public Map<String, Object> restoreHiddenAdminContentPost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        return Map.of(
                "success", true,
                "post", adminService.restoreHiddenAdminContentPost(authorizationHeader, postId)
        );
    }

    /*
     * 게시글 삭제 상태 전환 API
     * --------------------------------------------------------------------------
     * 처음 삭제는 post_tbl.deleted_yn을 Y로 바꿔 삭제 탭으로 보내는 soft delete입니다.
     */
    @PutMapping("/content/posts/{postId}/delete")
    public Map<String, Object> softDeleteAdminContentPost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        return Map.of(
                "success", true,
                "post", adminService.softDeleteAdminContentPost(authorizationHeader, postId)
        );
    }

    /*
     * 삭제 게시글 복구 API
     * --------------------------------------------------------------------------
     * 삭제 탭의 "복구" 버튼에서 호출합니다.
     */
    @PutMapping("/content/posts/{postId}/delete/restore")
    public Map<String, Object> restoreDeletedAdminContentPost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        return Map.of(
                "success", true,
                "post", adminService.restoreDeletedAdminContentPost(authorizationHeader, postId)
        );
    }

    /*
     * 게시글 완전 삭제 API
     * --------------------------------------------------------------------------
     * 삭제 탭의 "완전 삭제" 버튼에서만 호출합니다.
     */
    @DeleteMapping("/content/posts/{postId}/delete/permanent")
    public Map<String, Object> hardDeleteAdminContentPost(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long postId
    ) {
        adminService.hardDeleteAdminContentPost(authorizationHeader, postId);

        return Map.of("success", true);
    }

    /* ==========================================================================
     * 사용자 관리 하단 요약 조회 API
     * --------------------------------------------------------------------------
     * 사용자 관리 페이지 하단 영역에 필요한 정보를 한 번에 조회합니다.
     *
     * 응답에 포함되는 값:
     * - 전체/일반/관리자/정지 회원 수
     * - 가장 최근 가입 회원 1명
     * - 가장 최근 제재 회원 1명
     * - 최근 권한 변경/정지/해제 로그
     * ========================================================================== */
    @GetMapping("/members/management-summary")
    public AdminUserManagementSummary getUserManagementSummary(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("[ADMIN_API] GET /admin/api/members/management-summary requested");
        return adminService.getUserManagementSummary(authorizationHeader);
    }

    @GetMapping("/members/action-logs")
    public Map<String, List<AdminActionLogView>> getAllAdminActionLogs(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("[ADMIN_API] GET /admin/api/members/action-logs requested");
        return Map.of("actionLogs", adminService.getAllAdminActionLogs(authorizationHeader));
    }

    /* ==========================================================================
     * 회원 상세 정보 조회 API
     * --------------------------------------------------------------------------
     * 사용자 관리 페이지에서 "회원 정보 전체 보기" 버튼을 눌렀을 때 사용하는 API입니다.
     *
     * 요청 주소:
     * - GET /admin/api/members/{memberId}
     *
     * 응답 기준:
     * - members 테이블에 저장된 개인정보 관련 값을 반환합니다.
     * - password_hash는 절대 반환하지 않습니다.
     * ========================================================================== */
    @GetMapping("/members/{memberId}")
    public AdminMemberDetail getMemberDetail(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long memberId
    ) {
        return adminService.getMemberDetail(authorizationHeader, memberId);
    }

    @GetMapping("/members/{memberId}/sanction-logs")
    public Map<String, List<AdminActionLogView>> getMemberSanctionLogs(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long memberId
    ) {
        return Map.of(
                "actionLogs",
                adminService.getMemberSanctionLogs(authorizationHeader, memberId)
        );
    }

    /* ==========================================================================
     * 회원 정지 처리 API
     * --------------------------------------------------------------------------
     * 사용자 관리 패널에서 일시 정지 또는 영구 정지를 확정했을 때 호출됩니다.
     *
     * 요청 주소:
     * - PUT /admin/api/members/{memberId}/suspend
     *
     * 요청 body 예시:
     * - { "suspendType": "TEMPORARY", "suspendDays": 7 }
     * - { "suspendType": "TEMPORARY", "suspendedUntil": "2026-06-08" }
     * - { "suspendType": "PERMANENT" }
     * ========================================================================== */
    @PutMapping("/members/{memberId}/suspend")
    public Map<String, Object> suspendMember(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long memberId,
            @RequestBody AdminMemberSuspendRequest request
    ) {
        return Map.of(
                "success", true,
                "message", "회원 정지 처리가 완료되었습니다.",
                "member", adminService.suspendMember(authorizationHeader, memberId, request)
        );
    }

    /* ==========================================================================
     * 회원 정지 해제 API
     * --------------------------------------------------------------------------
     * 사용자 관리 패널에서 정지된 회원의 "정지 해제" 버튼을 눌렀을 때 호출합니다.
     *
     * 요청 주소:
     * - PUT /admin/api/members/{memberId}/restore
     * ========================================================================== */
    @PutMapping("/members/{memberId}/restore")
    public Map<String, Object> restoreSuspendedMember(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long memberId
    ) {
        return Map.of(
                "success", true,
                "message", "회원 정지 해제가 완료되었습니다.",
                "member", adminService.restoreSuspendedMember(authorizationHeader, memberId)
        );
    }

    /* ==========================================================================
     * 관리자 권한 관리 대상 회원 검색 API
     * --------------------------------------------------------------------------
     * 관리자 권한 관리 페이지에서 기존 회원을 이메일 또는 실명으로 검색할 때 사용합니다.
     *
     * 요청 주소:
     * - GET /admin/api/members/admin-promotion/search?searchType=email&keyword=test@example.com
     * - GET /admin/api/members/admin-promotion/search?searchType=name&keyword=문건우
     *
     * searchType 값:
     * - email: members.email 기준 검색
     * - name: members.name 기준 검색
     * ========================================================================== */
    @GetMapping("/members/admin-promotion/search")
    public Map<String, List<AdminMember>> searchMembersForAdminPromotion(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "email") String searchType,
            @RequestParam(defaultValue = "") String keyword
    ) {
        log.info(
                "[ADMIN_API] GET /admin/api/members/admin-promotion/search requested searchType={} keywordLength={}",
                searchType,
                keyword == null ? 0 : keyword.length()
        );
        return Map.of(
                "members",
                adminService.searchMembersForAdminPromotion(authorizationHeader, searchType, keyword)
        );
    }

    /* ==========================================================================
     * 회원 관리자 등급 변경 API
     * --------------------------------------------------------------------------
     * 관리자 권한 관리 페이지에서 선택한 ACTIVE 회원을 일반 회원 또는 관리자로 변경합니다.
     *
     * 요청 주소:
     * - PUT /admin/api/members/{memberId}/role
     *
     * 요청 body:
     * - { "role": "USER" }
     * - { "role": "SUPER_ADMIN" }
     * ========================================================================== */
    @PutMapping("/members/{memberId}/role")
    public Map<String, Object> promoteMemberToAdmin(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long memberId,
            @RequestBody AdminRoleUpdateRequest request
    ) {
        adminService.promoteMemberToAdmin(authorizationHeader, memberId, request.getRole());

        return Map.of(
                "success", true,
                "message", "관리자 등급이 변경되었습니다."
        );
    }

    /* ==========================================================================
     * 신고 목록 조회 API
     * --------------------------------------------------------------------------
     * 신고 및 제재 관리 페이지에서 게시글/댓글 신고 목록을 조회합니다.
     *
     * 요청 예시:
     * - GET /admin/api/reports
     * - GET /admin/api/reports?status=PENDING&targetType=POST
     * - GET /admin/api/reports?status=DONE&processResult=WARNING
     * ========================================================================== */
    @GetMapping("/reports")
    public Map<String, List<AdminReport>> getAdminReports(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "ALL") String targetType,
            @RequestParam(defaultValue = "ALL") String processResult
    ) {
        log.info(
                "[ADMIN_API] GET /admin/api/reports requested status={} targetType={} processResult={}",
                status,
                targetType,
                processResult
        );
        return Map.of(
                "reports",
                adminService.getAdminReports(authorizationHeader, status, targetType, processResult)
        );
    }

    /* 관리자 기능 담당 작업(문건우): 신고 처리율을 전체 목록 조회 없이 기간 기준으로 집계합니다. */
    @GetMapping("/reports/process-rate")
    public AdminReportProcessRateStat getAdminReportProcessRate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return adminService.getAdminReportProcessRate(authorizationHeader, startDate, endDate);
    }

    /* ==========================================================================
     * 신고 상세 조회 API
     * --------------------------------------------------------------------------
     * 처리 대기 신고를 처음 열면 검토 중으로 전환합니다.
     * ========================================================================== */
    @GetMapping("/reports/{reportId}")
    public Map<String, AdminReport> getAdminReportDetail(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long reportId
    ) {
        return Map.of(
                "report",
                adminService.getAdminReportDetail(authorizationHeader, reportId)
        );
    }

    /* ==========================================================================
     * 신고 최종 처리 API
     * --------------------------------------------------------------------------
     * 신고 처리 결과를 저장하고 신고 상태를 처리 완료로 변경합니다.
     * ========================================================================== */
    @PutMapping("/reports/{reportId}/process")
    public Map<String, Object> processAdminReport(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long reportId,
            @RequestBody AdminReportProcessRequest request
    ) {
        return Map.of(
                "success", true,
                "message", "신고 처리가 완료되었습니다.",
                "report", adminService.processAdminReport(authorizationHeader, reportId, request)
        );
    }

    /* ==========================================================================
     * 관리자 대시보드 요약 조회 API
     * --------------------------------------------------------------------------
     * 대시보드 상단 카드에 필요한 숫자를 한 번에 조회합니다.
     *
     * 요청 주소:
     * - GET /admin/api/dashboard/summary
     *
     * 현재 응답 값:
     * - totalMemberCount: 전체 회원 수
     * - todayNewMemberCount: 오늘 가입한 신규 가입자 수
     * - postCount: 삭제되지 않은 게시글 수
     * ========================================================================== */
    @GetMapping("/dashboard/summary")
    public AdminDashboardSummary getDashboardSummary(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return adminService.getDashboardSummary(authorizationHeader);
    }

    /*
     * 관리자 대시보드 감정별 활동 분포 API
     * --------------------------------------------------------------------------
     * period 값은 day, week, month 중 하나이며 서비스에서 한 번 더 검증합니다.
     */
    @GetMapping("/dashboard/emotion-activity")
    public Map<String, List<AdminEmotionActivity>> getDashboardEmotionActivity(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return Map.of(
                "items",
                adminService.getDashboardEmotionActivity(authorizationHeader, period, startDate, endDate)
        );
    }

    /*
     * 관리자 대시보드 최근 활동 10개 API
     * --------------------------------------------------------------------------
     * 가입, 탈퇴, 정지, 정지 해제 기록을 최신순으로 10개만 내려줍니다.
     */
    /*
     * 관리자 대시보드 시간별 활성 사용자 API
     * --------------------------------------------------------------------------
     * period 값은 day, week, month 중 하나이며 서비스에서 한 번 더 검증합니다.
     */
    @GetMapping("/dashboard/active-users")
    public Map<String, List<AdminActiveUserStat>> getDashboardActiveUsers(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return Map.of(
                "items",
                adminService.getDashboardActiveUsers(authorizationHeader, period, startDate, endDate)
        );
    }

    @GetMapping("/dashboard/recent-activities")
    public Map<String, List<AdminRecentActivity>> getRecentDashboardActivities(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return Map.of(
                "activities",
                adminService.getRecentDashboardActivities(authorizationHeader)
        );
    }

    /*
     * 관리자 대시보드 전체 활동 API
     * --------------------------------------------------------------------------
     * 프론트에서 전체 보기 팝업을 열 때 페이지네이션용 원본 목록으로 사용합니다.
     */
    @GetMapping("/dashboard/activities")
    public Map<String, List<AdminRecentActivity>> getAllDashboardActivities(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return Map.of(
                "activities",
                adminService.getAllDashboardActivities(authorizationHeader)
        );
    }

    /*
     * 통계 대시보드 요약 API
     * --------------------------------------------------------------------------
     * 통계 대시보드의 상단 숫자 카드와 하단 요약 숫자에 사용할 데이터를 조회합니다.
     */
    @GetMapping("/statistics/summary")
    public AdminStatisticsSummary getStatisticsSummary(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return adminService.getStatisticsSummary(authorizationHeader, period, startDate, endDate);
    }

    /*
     * 통계 대시보드 가입자 추이 API
     * --------------------------------------------------------------------------
     * 선택한 기간에 맞춰 일/주/월 단위 가입자 흐름을 차트용 배열로 반환합니다.
     */
    @GetMapping("/statistics/subscribers")
    public Map<String, List<AdminStatisticsTrend>> getStatisticsSubscriberTrend(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return Map.of(
                "items",
                adminService.getStatisticsSubscriberTrend(authorizationHeader, period, startDate, endDate)
        );
    }

    /*
     * 통계 대시보드 콘텐츠 활동 API
     * --------------------------------------------------------------------------
     * 게시글, 댓글, 공감 수를 막대 그래프에서 바로 사용할 수 있는 형태로 반환합니다.
     */
    @GetMapping("/statistics/content-activity")
    public Map<String, List<AdminStatisticsTrend>> getStatisticsContentActivity(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return Map.of(
                "items",
                adminService.getStatisticsContentActivity(authorizationHeader, period, startDate, endDate)
        );
    }

    @GetMapping("/notices")
    public Map<String, List<Notice>> getAdminNotices(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "all") String status
    ) {
        return Map.of("notices", adminService.getAdminNotices(authorizationHeader, status));
    }

    @GetMapping("/notices/latest")
    public Map<String, Notice> getLatestActiveNotice(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        Notice notice = adminService.getLatestActiveNotice(authorizationHeader);
        Map<String, Notice> response = new HashMap<>();
        response.put("notice", notice);
        return response;
    }

    @PostMapping("/notices")
    public Map<String, Object> createAdminNotice(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody AdminNoticeRequest request
    ) {
        return Map.of(
                "success", true,
                "notice", adminService.createAdminNotice(authorizationHeader, request)
        );
    }

    @PutMapping("/notices/{noticeId}")
    public Map<String, Object> updateAdminNotice(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long noticeId,
            @RequestBody AdminNoticeRequest request
    ) {
        return Map.of(
                "success", true,
                "notice", adminService.updateAdminNotice(authorizationHeader, noticeId, request)
        );
    }

    @PutMapping("/notices/{noticeId}/delete")
    public Map<String, Object> softDeleteAdminNotice(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long noticeId
    ) {
        return Map.of(
                "success", true,
                "notice", adminService.softDeleteAdminNotice(authorizationHeader, noticeId)
        );
    }

    /* ==========================================================================
     * 관리자 개인 정보 조회 API
     * --------------------------------------------------------------------------
     * 로그인한 관리자 본인의 실명, 닉네임, 전화번호를 조회합니다.
     *
     * 요청 주소:
     * - GET /admin/api/profile
     * ========================================================================== */
    @GetMapping("/profile")
    public AdminProfile getAdminProfile(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return adminService.getAdminProfile(authorizationHeader);
    }

    /* ==========================================================================
     * 관리자 개인 정보 수정 API
     * --------------------------------------------------------------------------
     * 로그인한 관리자 본인의 실명, 닉네임, 전화번호를 수정합니다.
     *
     * 요청 주소:
     * - PUT /admin/api/profile
     * ========================================================================== */
    @PutMapping("/profile")
    public Map<String, Object> updateAdminProfile(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody AdminProfileUpdateRequest request
    ) {
        return Map.of(
                "success", true,
                "message", "관리자 정보가 수정되었습니다.",
                "profile", adminService.updateAdminProfile(authorizationHeader, request)
        );
    }
}
