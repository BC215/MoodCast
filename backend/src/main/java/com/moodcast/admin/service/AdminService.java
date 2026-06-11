package com.moodcast.admin.service;

import com.moodcast.admin.dao.AdminDao;
import com.moodcast.admin.vo.AdminDashboardSummary;
import com.moodcast.admin.vo.AdminActionLogView;
import com.moodcast.admin.vo.AdminActiveUserStat;
import com.moodcast.admin.vo.AdminContentComment;
import com.moodcast.admin.vo.AdminContentHashtag;
import com.moodcast.admin.vo.AdminContentPost;
import com.moodcast.admin.vo.AdminEmotionActivity;
import com.moodcast.admin.vo.AdminMember;
import com.moodcast.admin.vo.AdminMemberDetail;
import com.moodcast.admin.vo.AdminMemberSuspendRequest;
import com.moodcast.admin.vo.AdminNoticeRequest;
import com.moodcast.admin.vo.AdminProfile;
import com.moodcast.admin.vo.AdminProfileUpdateRequest;
import com.moodcast.admin.vo.AdminRecentActivity;
import com.moodcast.admin.vo.AdminReport;
import com.moodcast.admin.vo.AdminReportActivity;
import com.moodcast.admin.vo.AdminReportProcessRequest;
import com.moodcast.admin.vo.AdminReportProcessRateStat;
import com.moodcast.admin.vo.AdminReportReporter;
import com.moodcast.admin.vo.AdminStatisticsSummary;
import com.moodcast.admin.vo.AdminStatisticsTrend;
import com.moodcast.admin.vo.AdminUserManagementSummary;
import com.moodcast.admin.vo.Notice;
import com.moodcast.member.dto.login.LoginMemberResponse;
import com.moodcast.member.service.LoginService;
import com.moodcast.member.service.RefreshTokenRedisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/* ==========================================================================
 * 관리자 페이지 공통 서비스
 * --------------------------------------------------------------------------
 * 컨트롤러가 받은 요청을 실제로 처리하는 비즈니스 로직 계층입니다.
 *
 * 서비스 역할:
 * - 컨트롤러가 직접 DB 작업을 하지 않도록 중간에서 로직을 담당합니다.
 * - 필요한 경우 DAO를 통해 DB 데이터를 조회하거나 수정합니다.
 * - 관리자 권한 검사, 데이터 가공, 처리 규칙을 이 위치에 작성할 예정입니다.
 *
 * 현재 단계:
 * - 관리자 백엔드 구조를 잡기 위한 기본 서비스만 준비합니다.
 * - 아직 실제 DB 조회 로직은 작성하지 않습니다.
 * ========================================================================== */
@Service // Spring이 이 클래스를 서비스 객체로 등록하게 합니다.
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    @Autowired // 나중에 DB 조회가 필요할 때 사용할 DAO를 연결합니다.
    private AdminDao adminDao;

    @Autowired // 기존 로그인 토큰 검증 로직을 재사용하기 위해 LoginService를 연결합니다.
    private LoginService loginService;

    @Autowired
    private RefreshTokenRedisService refreshTokenRedisService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /* ==========================================================================
     * 관리자 권한 확인
     * --------------------------------------------------------------------------
     * 관리자 API는 반드시 로그인한 관리자만 사용할 수 있어야 합니다.
     *
     * 처리 순서:
     * 1. Authorization 헤더의 accessToken으로 현재 로그인 회원을 조회합니다.
     * 2. 회원 role이 SUPER_ADMIN인지 확인합니다.
     * 3. SUPER_ADMIN이 아니면 403 FORBIDDEN으로 막습니다.
     *
     * 주의:
     * - 현재 정책은 SUPER_ADMIN만 관리자 권한으로 사용합니다.
     * - 그 외 role 값은 관리자 API 접근 권한이 없는 일반 회원 권한으로 봅니다.
     * ========================================================================== */
    private LoginMemberResponse validateAdmin(String authorizationHeader) {
        log.info("[ADMIN_API] validateAdmin start hasAuthorizationHeader={}", authorizationHeader != null && !authorizationHeader.isBlank());

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        String role = loginMember.getRole();

        boolean isAdmin = "SUPER_ADMIN".equals(role);

        if (!isAdmin) {
            log.warn("[ADMIN_API] validateAdmin forbidden memberId={} role={}", loginMember.getMemberId(), role);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }

        log.info("[ADMIN_API] validateAdmin success memberId={} role={}", loginMember.getMemberId(), role);

        return loginMember;
    }

    /*
     * 관리자 권한 확인
     * --------------------------------------------------------------------------
     * 관리자 추가와 관리자 권한 변경처럼 높은 권한이 필요한 작업에서만 사용합니다.
     *
     * 처리 흐름:
     * 1. validateAdmin()으로 로그인 여부와 관리자 권한 여부를 먼저 확인합니다.
     * 2. role이 SUPER_ADMIN인지 한 번 더 확인합니다.
     * 3. 관리자가 아니라면 403 FORBIDDEN으로 요청을 막습니다.
     */
    private LoginMemberResponse validateSuperAdmin(String authorizationHeader) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);

        if (!"SUPER_ADMIN".equals(loginMember.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }

        return loginMember;
    }

    /* ==========================================================================
     * 전체 회원 수 조회
     * --------------------------------------------------------------------------
     * 컨트롤러에서 요청을 받으면 DAO를 통해 members 테이블의 전체 회원 수를 조회합니다.
     *
     * 지금은 단순 조회만 하지만 Service를 거치는 이유:
     * - 나중에 "삭제 회원 제외" 같은 정책이 생기면 이 위치에서 처리 기준을 정리할 수 있습니다.
     * ========================================================================== */
    public Long getTotalMemberCount(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] selectTotalMemberCount start");
        Long totalMemberCount = adminDao.selectTotalMemberCount();
        log.info("[ADMIN_API] selectTotalMemberCount success totalMemberCount={}", totalMemberCount);

        return totalMemberCount;
    }

    /* ==========================================================================
     * 전체 회원 목록 조회
     * --------------------------------------------------------------------------
     * members 테이블의 회원 목록을 조회해서 사용자 관리 테이블에 전달합니다.
     *
     * 지금은 "전체" 탭에만 표시할 데이터이므로 별도 조건을 걸지 않습니다.
     * 나중에 일반 회원, 정지 회원, 관리자 탭 조건을 백엔드로 옮길 때는
     * 이 메서드에 role/status 조건을 추가하거나 별도 메서드로 분리하면 됩니다.
     * ========================================================================== */
    public List<AdminMember> getMembers(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] selectMembers start");
        List<AdminMember> members = adminDao.selectMembers();
        log.info("[ADMIN_API] selectMembers success size={}", members == null ? 0 : members.size());

        return members;
    }

    /* ==========================================================================
     * 콘텐츠 관리 게시글 목록 조회
     * --------------------------------------------------------------------------
     * 관리자 콘텐츠 관리 페이지에서 게시글 카드 목록을 만들기 위한 데이터를 조회합니다.
     *
     * 초보자 설명:
     * - 컨트롤러는 요청을 받고, 서비스는 관리자 권한 확인을 먼저 합니다.
     * - 권한 확인이 끝나면 DAO를 통해 DB에서 게시글 목록을 가져옵니다.
     * - 검색, 감정 필터, 페이지네이션은 화면 반응이 빠르도록 프론트에서 처리합니다.
     * ========================================================================== */
    public List<AdminContentPost> getAdminContentPosts(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] selectAdminContentPosts start");
        List<AdminContentPost> posts = adminDao.selectAdminContentPosts();
        log.info("[ADMIN_API] selectAdminContentPosts success size={}", posts == null ? 0 : posts.size());

        return posts;
    }

    /* ========================================================================
     * 콘텐츠 관리 댓글 목록 조회
     * ------------------------------------------------------------------------
     * 관리자 콘텐츠 관리의 "댓글" 탭에서 사용할 댓글 데이터를 조회합니다.
     *
     * 초보자 설명:
     * - 컨트롤러는 요청만 받고, 이 서비스가 먼저 관리자 권한을 확인합니다.
     * - 권한 확인이 끝나면 DAO를 통해 comment_tbl 기준 댓글 목록을 가져옵니다.
     * ======================================================================== */
    public List<AdminContentComment> getAdminContentComments(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] selectAdminContentComments start");
        List<AdminContentComment> comments = adminDao.selectAdminContentComments();
        log.info("[ADMIN_API] selectAdminContentComments success size={}", comments == null ? 0 : comments.size());

        return comments;
    }

    /* ========================================================================
     * 콘텐츠 관리 해시태그 목록 조회
     * ------------------------------------------------------------------------
     * 관리자 콘텐츠 관리의 "해시태그" 탭에서 사용할 해시태그 데이터를 조회합니다.
     *
     * 초보자 설명:
     * - hashtag 테이블의 태그 이름과 post_hashtag 연결 수를 함께 가져옵니다.
     * - 검색과 페이지네이션은 현재 프론트에서 처리하므로 최근 500개 기준으로 내려줍니다.
     * ======================================================================== */
    public List<AdminContentHashtag> getAdminContentHashtags(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] selectAdminContentHashtags start");
        List<AdminContentHashtag> hashtags = adminDao.selectAdminContentHashtags();
        log.info("[ADMIN_API] selectAdminContentHashtags success size={}", hashtags == null ? 0 : hashtags.size());

        return hashtags;
    }

    /*
     * 관리자 콘텐츠 관리 게시글 숨김 처리
     * --------------------------------------------------------------------------
     * 초보자 설명:
     * - 숨김은 삭제가 아니라 visibility 값을 PRIVATE로 바꾸는 작업입니다.
     * - deleted_yn이 Y인 게시글은 이미 삭제 탭에 들어간 상태이므로 숨김 처리하지 않습니다.
     * - 작업 후에는 selectAdminContentPostById로 최신 게시글 한 건을 다시 조회해 프론트에 돌려줍니다.
     */
    @Transactional
    public AdminContentPost hideAdminContentPost(String authorizationHeader, Long postId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validatePostId(postId);

        int updated = adminDao.hideAdminContentPost(postId);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "숨김 처리할 수 있는 게시글이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "HIDE_POST",
                "POST",
                postId,
                "게시글 숨김 처리"
        );

        return selectRequiredAdminContentPost(postId);
    }

    /*
     * 관리자 콘텐츠 관리 게시글 숨김 복구
     * --------------------------------------------------------------------------
     * visibility를 PUBLIC으로 되돌려 공개 상태로 복구합니다.
     */
    @Transactional
    public AdminContentPost restoreHiddenAdminContentPost(String authorizationHeader, Long postId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validatePostId(postId);

        int updated = adminDao.restoreHiddenAdminContentPost(postId);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "숨김 복구할 수 있는 게시글이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "RESTORE_POST_VISIBILITY",
                "POST",
                postId,
                "게시글 숨김 복구"
        );

        return selectRequiredAdminContentPost(postId);
    }

    /*
     * 관리자 콘텐츠 관리 게시글 삭제
     * --------------------------------------------------------------------------
     * 처음 삭제는 deleted_yn을 Y로 바꾸는 soft delete입니다.
     * 이렇게 해야 삭제 탭에서 복구 또는 완전 삭제를 선택할 수 있습니다.
     */
    @Transactional
    public AdminContentPost softDeleteAdminContentPost(String authorizationHeader, Long postId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validatePostId(postId);

        int updated = adminDao.softDeleteAdminContentPost(postId);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제 처리할 수 있는 게시글이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "DELETE_POST",
                "POST",
                postId,
                "게시글 삭제 상태 전환"
        );

        return selectRequiredAdminContentPost(postId);
    }

    /*
     * 삭제 탭 게시글 복구
     * --------------------------------------------------------------------------
     * deleted_yn을 N으로 되돌리고 visibility를 PUBLIC으로 맞춥니다.
     */
    @Transactional
    public AdminContentPost restoreDeletedAdminContentPost(String authorizationHeader, Long postId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validatePostId(postId);

        int updated = adminDao.restoreDeletedAdminContentPost(postId);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "복구할 수 있는 삭제 게시글이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "RESTORE_DELETED_POST",
                "POST",
                postId,
                "삭제 게시글 복구"
        );

        return selectRequiredAdminContentPost(postId);
    }

    /*
     * 삭제 탭 게시글 완전 삭제
     * --------------------------------------------------------------------------
     * 삭제 상태(deleted_yn = Y)에 있는 게시글만 실제 DB에서 제거합니다.
     * 댓글/좋아요/저장/해시태그 연결은 FK 제약 때문에 먼저 삭제합니다.
     */
    @Transactional
    public void hardDeleteAdminContentPost(String authorizationHeader, Long postId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validatePostId(postId);

        AdminContentPost post = selectRequiredAdminContentPost(postId);

        if (!"Y".equals(post.getDeletedYn())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제 탭에 있는 게시글만 완전 삭제할 수 있습니다.");
        }

        adminDao.deleteAdminPostComments(postId);
        adminDao.deleteAdminPostLikes(postId);
        adminDao.deleteAdminPostSaves(postId);
        adminDao.deleteAdminPostHashtags(postId);

        int deleted = adminDao.hardDeleteAdminContentPost(postId);

        if (deleted != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "게시글 완전 삭제에 실패했습니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "HARD_DELETE_POST",
                "POST",
                postId,
                "게시글 완전 삭제"
        );
    }

    private void validatePostId(Long postId) {
        if (postId == null) {
            throw new IllegalArgumentException("게시글을 선택해주세요.");
        }
    }

    private AdminContentPost selectRequiredAdminContentPost(Long postId) {
        AdminContentPost post = adminDao.selectAdminContentPostById(postId);

        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글 정보를 찾을 수 없습니다.");
        }

        return post;
    }

    @Transactional
    public AdminContentComment hideAdminContentComment(String authorizationHeader, Long commentId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        AdminContentComment comment = selectRequiredAdminContentComment(commentId);

        if ("Y".equals(comment.getDeletedYn())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제된 댓글은 숨김 처리할 수 없습니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "HIDE",
                "COMMENT",
                commentId,
                "댓글 숨김 처리"
        );

        return selectRequiredAdminContentComment(commentId);
    }

    @Transactional
    public AdminContentComment restoreAdminContentComment(String authorizationHeader, Long commentId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        AdminContentComment comment = selectRequiredAdminContentComment(commentId);

        if ("Y".equals(comment.getDeletedYn())) {
            int restored = adminDao.restoreAdminContentComment(commentId);

            if (restored != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "복구 가능한 삭제 댓글이 아닙니다.");
            }
        } else {
            adminDao.insertAdminActionLog(
                    loginMember.getMemberId(),
                    "RESTORE",
                    "COMMENT",
                    commentId,
                    "댓글 숨김 복구"
            );
        }

        return selectRequiredAdminContentComment(commentId);
    }

    @Transactional
    public AdminContentComment softDeleteAdminContentComment(String authorizationHeader, Long commentId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        selectRequiredAdminContentComment(commentId);

        int deleted = adminDao.softDeleteAdminContentComment(commentId);

        if (deleted != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제 가능한 댓글이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "DELETE_COMMENT",
                "COMMENT",
                commentId,
                "댓글 삭제 처리"
        );

        return selectRequiredAdminContentComment(commentId);
    }

    @Transactional
    public void hardDeleteAdminContentHashtag(String authorizationHeader, Long hashtagId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validateHashtagId(hashtagId);

        int exists = adminDao.countAdminContentHashtagById(hashtagId);

        if (exists < 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해시태그를 찾을 수 없습니다.");
        }

        adminDao.deleteAdminPostHashtagsByHashtagId(hashtagId);
        int deleted = adminDao.hardDeleteAdminContentHashtag(hashtagId);

        if (deleted != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "해시태그 삭제에 실패했습니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "HARD_DELETE_HASHTAG",
                "HASHTAG",
                hashtagId,
                "해시태그 완전 삭제"
        );
    }

    private AdminContentComment selectRequiredAdminContentComment(Long commentId) {
        if (commentId == null) {
            throw new IllegalArgumentException("댓글을 선택해주세요.");
        }

        AdminContentComment comment = adminDao.selectAdminContentCommentById(commentId);

        if (comment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글 정보를 찾을 수 없습니다.");
        }

        return comment;
    }

    private void validateHashtagId(Long hashtagId) {
        if (hashtagId == null) {
            throw new IllegalArgumentException("해시태그를 선택해주세요.");
        }
    }

    /* ==========================================================================
     * 사용자 관리 하단 요약 조회
     * --------------------------------------------------------------------------
     * 사용자 관리 페이지 하단의 회원 비율, 최근 가입 회원, 최근 제재 회원,
     * 권한/제재 로그를 한 번에 조회합니다.
     *
     * 초보자 설명:
     * - Controller는 요청만 받고, Service가 어떤 DAO를 조합할지 결정합니다.
     * - count 조회, 최근 회원 조회, 로그 조회는 SQL이 서로 다르기 때문에
     *   DAO 메서드를 나눠 호출한 뒤 하나의 응답 객체에 담습니다.
     * ========================================================================== */
    public AdminUserManagementSummary getUserManagementSummary(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] getUserManagementSummary start");

        AdminUserManagementSummary summary = selectUserManagementSummaryCountsSafely();
        summary.setLatestJoinedMember(selectLatestJoinedMemberSafely());
        summary.setLatestSanctionedMember(selectLatestSanctionedMemberSafely());
        summary.setActionLogs(selectRecentAdminActionLogsSafely());

        log.info(
                "[ADMIN_API] getUserManagementSummary success total={} normal={} admin={} suspended={} logs={}",
                summary.getTotalMemberCount(),
                summary.getNormalMemberCount(),
                summary.getAdminMemberCount(),
                summary.getSuspendedMemberCount(),
                summary.getActionLogs() == null ? 0 : summary.getActionLogs().size()
        );

        return summary;
    }

    /*
     * 사용자 관리 하단 요약 숫자를 안전하게 조회합니다.
     *
     * 초보자 설명:
     * - 이 API는 화면 하단의 보조 정보라서, 특정 조회 하나가 실패해도
     *   사용자 관리 페이지 전체가 500 에러로 멈추면 안 됩니다.
     * - 회원 목록 API는 정상인데 요약 API만 실패하는 상황을 막기 위해
     *   각 조회를 작은 단위로 나누고 실패 시 기본값을 내려줍니다.
     */
    private AdminUserManagementSummary selectUserManagementSummaryCountsSafely() {
        AdminUserManagementSummary summary = null;

        try {
            log.info("[ADMIN_API] selectUserManagementSummaryCounts start");
            summary = adminDao.selectUserManagementSummaryCounts();
        } catch (RuntimeException e) {
            log.error("[ADMIN_API] selectUserManagementSummaryCounts failed. fallback to selectMembers", e);
            summary = buildSummaryCountsFromMemberList();
        }

        if (summary == null) {
            summary = new AdminUserManagementSummary();
        }

        summary.setTotalMemberCount(defaultLong(summary.getTotalMemberCount()));
        summary.setNormalMemberCount(defaultLong(summary.getNormalMemberCount()));
        summary.setAdminMemberCount(defaultLong(summary.getAdminMemberCount()));
        summary.setSuspendedMemberCount(defaultLong(summary.getSuspendedMemberCount()));
        summary.setActionLogs(Collections.emptyList());

        return summary;
    }

    /*
     * 요약 count 전용 SQL이 실패했을 때 사용하는 예비 계산입니다.
     *
     * 초보자 설명:
     * - 현재 회원 목록 API는 정상 동작하고 있으므로 같은 목록 데이터를 다시 가져와서
     *   Java 코드에서 회원 수를 계산합니다.
     * - DB count 쿼리 하나 때문에 화면 하단 전체가 실패하는 것을 막기 위한 안전장치입니다.
     */
    private AdminUserManagementSummary buildSummaryCountsFromMemberList() {
        AdminUserManagementSummary summary = new AdminUserManagementSummary();

        try {
            log.info("[ADMIN_API] buildSummaryCountsFromMemberList start");
            List<AdminMember> members = adminDao.selectMembers();

            long totalMemberCount = members == null ? 0L : members.size();
            long normalMemberCount = 0L;
            long adminMemberCount = 0L;
            long suspendedMemberCount = 0L;

            if (members != null) {
                for (AdminMember member : members) {
                    String role = member.getRole();
                    String status = member.getStatus();

                    if (!"SUPER_ADMIN".equals(role)) {
                        normalMemberCount++;
                    }

                    if ("SUPER_ADMIN".equals(role)) {
                        adminMemberCount++;
                    }

                    if ("SUSPENDED".equals(status)) {
                        suspendedMemberCount++;
                    }
                }
            }

            summary.setTotalMemberCount(totalMemberCount);
            summary.setNormalMemberCount(normalMemberCount);
            summary.setAdminMemberCount(adminMemberCount);
            summary.setSuspendedMemberCount(suspendedMemberCount);
            log.info(
                    "[ADMIN_API] buildSummaryCountsFromMemberList success total={} normal={} admin={} suspended={}",
                    totalMemberCount,
                    normalMemberCount,
                    adminMemberCount,
                    suspendedMemberCount
            );
        } catch (RuntimeException e) {
            log.error("[ADMIN_API] buildSummaryCountsFromMemberList failed", e);
            summary.setTotalMemberCount(0L);
            summary.setNormalMemberCount(0L);
            summary.setAdminMemberCount(0L);
            summary.setSuspendedMemberCount(0L);
        }

        return summary;
    }

    private Long defaultLong(Long value) {
        return value == null ? 0L : value;
    }

    /*
     * 최근 가입 회원 조회가 실패해도 요약 API 전체가 실패하지 않도록 null을 반환합니다.
     * 프론트에서는 null인 경우 "가입 정보 없음"처럼 안전한 문구를 표시합니다.
     */
    private com.moodcast.admin.vo.AdminRecentMember selectLatestJoinedMemberSafely() {
        try {
            log.info("[ADMIN_API] selectLatestJoinedMember start");
            return adminDao.selectLatestJoinedMember();
        } catch (RuntimeException e) {
            log.error("[ADMIN_API] selectLatestJoinedMember failed", e);
            return null;
        }
    }

    /*
     * 최근 제재 회원 조회는 admin_action_logs를 함께 보기 때문에
     * 데이터 형태가 예상과 다르면 실패할 수 있어 별도로 보호합니다.
     */
    private com.moodcast.admin.vo.AdminRecentMember selectLatestSanctionedMemberSafely() {
        try {
            log.info("[ADMIN_API] selectLatestSanctionedMember start");
            return adminDao.selectLatestSanctionedMember();
        } catch (RuntimeException e) {
            log.error("[ADMIN_API] selectLatestSanctionedMember failed", e);
            return null;
        }
    }

    /*
     * 최근 작업 로그 목록 조회 실패 시 빈 목록을 내려줍니다.
     * 이렇게 하면 원형 그래프와 최근 가입 회원 정보는 계속 표시될 수 있습니다.
     */
    private List<AdminActionLogView> selectRecentAdminActionLogsSafely() {
        try {
            log.info("[ADMIN_API] selectRecentAdminActionLogs start");
            List<AdminActionLogView> actionLogs = adminDao.selectRecentAdminActionLogs();
            log.info("[ADMIN_API] selectRecentAdminActionLogs success size={}", actionLogs == null ? 0 : actionLogs.size());

            return actionLogs == null ? Collections.emptyList() : actionLogs;
        } catch (RuntimeException e) {
            log.error("[ADMIN_API] selectRecentAdminActionLogs failed", e);
            return Collections.emptyList();
        }
    }

    /*
     * 전체 권한 변경 로그 조회
     * --------------------------------------------------------------------------
     * 사용자 관리 페이지의 "전체 로그 보기" 팝업에서 사용하는 목록입니다.
     * 하단 요약 영역은 최근 10개만 보여주고, 전체 로그는 버튼을 눌렀을 때만 조회합니다.
     */
    public List<AdminActionLogView> getAllAdminActionLogs(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        log.info("[ADMIN_API] selectAllAdminActionLogs start");

        List<AdminActionLogView> actionLogs = adminDao.selectAllAdminActionLogs();
        log.info("[ADMIN_API] selectAllAdminActionLogs success size={}", actionLogs == null ? 0 : actionLogs.size());

        return actionLogs == null ? Collections.emptyList() : actionLogs;
    }

    public List<AdminActionLogView> getMemberSanctionLogs(String authorizationHeader, Long memberId) {
        validateAdmin(authorizationHeader);

        if (memberId == null) {
            throw new IllegalArgumentException("제재 이력을 조회할 회원을 선택해주세요.");
        }

        log.info("[ADMIN_API] selectMemberSanctionLogs start memberId={}", memberId);
        List<AdminActionLogView> actionLogs = adminDao.selectMemberSanctionLogs(memberId);
        log.info("[ADMIN_API] selectMemberSanctionLogs success memberId={} size={}", memberId, actionLogs == null ? 0 : actionLogs.size());

        return actionLogs == null ? Collections.emptyList() : actionLogs;
    }

    /* ==========================================================================
     * 관리자 신고 목록 조회
     * --------------------------------------------------------------------------
     * 신고 및 제재 관리 페이지의 신고 목록에서 사용하는 API 로직입니다.
     *
     * 필터 기준:
     * - status: ALL, PENDING, REVIEWING, DONE
     * - targetType: ALL, POST, COMMENT
     * - processResult: ALL, WARNING, TEMPORARY_SUSPEND, PERMANENT_SUSPEND, REJECT
     * ========================================================================== */
    public List<AdminReport> getAdminReports(
            String authorizationHeader,
            String status,
            String targetType,
            String processResult
    ) {
        validateAdmin(authorizationHeader);

        String normalizedStatus = normalizeReportStatus(status);
        String normalizedTargetType = normalizeReportTargetType(targetType);
        String normalizedProcessResult = normalizeReportProcessResult(processResult);

        log.info(
                "[ADMIN_API] selectAdminReports start status={} targetType={} processResult={}",
                normalizedStatus,
                normalizedTargetType,
                normalizedProcessResult
        );
        List<AdminReport> reports = adminDao.selectAdminReports(
                normalizedStatus,
                normalizedTargetType,
                normalizedProcessResult
        );
        log.info("[ADMIN_API] selectAdminReports success size={}", reports == null ? 0 : reports.size());

        return reports == null ? Collections.emptyList() : reports;
    }

    /*
     * 관리자 기능 담당 작업(문건우): 신고 처리율은 처리 완료 신고 수 / 전체 신고 수 기준으로 DB에서 집계합니다.
     * 처리 완료 상태는 현재 프로젝트의 실제 저장값인 DONE만 사용합니다.
     */
    public AdminReportProcessRateStat getAdminReportProcessRate(
            String authorizationHeader,
            String startDate,
            String endDate
    ) {
        validateAdmin(authorizationHeader);

        LocalDate start = parseAdminDate(startDate);
        LocalDate end = parseAdminDate(endDate);

        if (start == null || end == null) {
            LocalDate today = LocalDate.now(KOREA_ZONE);
            start = today;
            end = today;
        }

        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 시작일은 종료일보다 늦을 수 없습니다.");
        }

        AdminReportProcessRateStat stat = adminDao.selectAdminReportProcessRate(start, end);
        if (stat == null) {
            stat = new AdminReportProcessRateStat();
        }

        stat.setTotalCount(defaultLong(stat.getTotalCount()));
        stat.setDoneCount(defaultLong(stat.getDoneCount()));
        stat.setOpenCount(defaultLong(stat.getOpenCount()));

        return stat;
    }

    /* ==========================================================================
     * 관리자 신고 상세 조회
     * --------------------------------------------------------------------------
     * 처리 대기 신고를 관리자가 처음 열면 검토 중 상태로 전환합니다.
     * 이미 검토 중이거나 처리 완료된 신고는 상태를 변경하지 않고 그대로 반환합니다.
     * ========================================================================== */
    @Transactional
    public AdminReport getAdminReportDetail(String authorizationHeader, Long reportId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validateReportId(reportId);

        AdminReport report = selectRequiredAdminReport(reportId);

        if ("PENDING".equals(report.getReportStatus()) || "REVIEWING".equals(report.getReportStatus())) {
            adminDao.markAdminReportReviewing(reportId);
            if ("PENDING".equals(report.getReportStatus())) {
                adminDao.insertAdminActionLog(
                        loginMember.getMemberId(),
                        "REVIEW_REPORT",
                        "REPORT",
                        reportId,
                        "신고 검토 시작"
                );
            }
            report = selectRequiredAdminReport(reportId);
        }

        return report;
    }

    /* ==========================================================================
     * 관리자 신고 최종 처리
     * --------------------------------------------------------------------------
     * 신고 상태를 처리 완료로 변경하고 처리 결과를 저장합니다.
     * 반려는 신고만 완료 처리하고, 경고/정지는 신고 대상 회원 정보에도 즉시 반영합니다.
     * ========================================================================== */
    @Transactional
    public AdminReport processAdminReport(
            String authorizationHeader,
            Long reportId,
            AdminReportProcessRequest request
    ) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validateReportId(reportId);

        if (request == null) {
            throw new IllegalArgumentException("\uC2E0\uACE0 \uCC98\uB9AC \uC815\uBCF4\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        AdminReport report = selectRequiredAdminReport(reportId);

        if ("DONE".equals(report.getReportStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\uC774\uBBF8 \uCC98\uB9AC \uC644\uB8CC\uB41C \uC2E0\uACE0\uC785\uB2C8\uB2E4.");
        }

        String processResult = normalizeRequiredReportProcessResult(request.getProcessResult());
        String processReason = normalizeRequiredText(request.getProcessReason(), "\uCC98\uB9AC \uC0AC\uC720\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        LocalDateTime suspendedUntil = calculateReportSuspendedUntil(processResult, request);

        applyReportProcessToTargetMember(loginMember, report, processResult, suspendedUntil);
        applyReportTargetContentVisibility(loginMember, report, request.getHideTargetContent(), processResult);

        int updated = adminDao.processAdminReport(
                reportId,
                loginMember.getMemberId(),
                processResult,
                processReason
        );

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\uCC98\uB9AC \uAC00\uB2A5\uD55C \uC2E0\uACE0\uAC00 \uC544\uB2D9\uB2C8\uB2E4.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "PROCESS_REPORT",
                "REPORT",
                reportId,
                buildReportProcessActionDetail(processResult, processReason, suspendedUntil)
        );

        publishAccountSanctionAfterCommit(
                report.getTargetMemberId(),
                processResult,
                processReason,
                suspendedUntil
        );

        return selectRequiredAdminReport(reportId);
    }

    /*
     * 신고 처리와 함께 대상 게시글/댓글의 노출 상태를 정리합니다.
     * 반려는 제재가 아니므로 콘텐츠 상태를 건드리지 않고, 관리자가 숨김을 해제한 경우에도 공개 상태를 유지합니다.
     */
    private void applyReportTargetContentVisibility(
            LoginMemberResponse loginMember,
            AdminReport report,
            Boolean hideTargetContent,
            String processResult
    ) {
        if (!Boolean.TRUE.equals(hideTargetContent) || "REJECT".equals(processResult)) {
            return;
        }

        if ("POST".equals(report.getTargetType())) {
            Long postId = report.getPostId();

            if (postId == null) {
                log.warn("[ADMIN_REPORT_HIDE_TARGET_SKIP] reportId={} targetType=POST reason=missingPostId", report.getReportId());
                return;
            }

            int updated = adminDao.hideAdminContentPost(postId);

            if (updated > 0) {
                adminDao.insertAdminActionLog(
                        loginMember.getMemberId(),
                        "HIDE_POST",
                        "POST",
                        postId,
                        "\uC2E0\uACE0 \uCC98\uB9AC\uC5D0 \uB530\uB978 \uAC8C\uC2DC\uAE00 \uC228\uAE40"
                );
            }
            return;
        }

        if ("COMMENT".equals(report.getTargetType())) {
            Long commentId = report.getCommentId();

            if (commentId == null) {
                log.warn("[ADMIN_REPORT_HIDE_TARGET_SKIP] reportId={} targetType=COMMENT reason=missingCommentId", report.getReportId());
                return;
            }

            adminDao.insertAdminActionLog(
                    loginMember.getMemberId(),
                    "HIDE",
                    "COMMENT",
                    commentId,
                    "\uC2E0\uACE0 \uCC98\uB9AC\uC5D0 \uB530\uB978 \uB313\uAE00 \uC228\uAE40"
            );
        }
    }

    private void applyReportProcessToTargetMember(
            LoginMemberResponse loginMember,
            AdminReport report,
            String processResult,
            LocalDateTime suspendedUntil
    ) {
        if ("REJECT".equals(processResult)) {
            return;
        }

        Long targetMemberId = report.getTargetMemberId();

        if (targetMemberId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\uC81C\uC7AC \uB300\uC0C1 \uD68C\uC6D0\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }

        if (Objects.equals(loginMember.getMemberId(), targetMemberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "\uBCF8\uC778 \uACC4\uC815\uC740 \uC81C\uC7AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }

        AdminMemberDetail targetMember = adminDao.selectMemberDetail(targetMemberId);

        if (targetMember == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "\uC81C\uC7AC \uB300\uC0C1 \uD68C\uC6D0 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }

        if (isAdminRole(targetMember.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "\uAD00\uB9AC\uC790 \uACC4\uC815\uC740 \uC81C\uC7AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }

        int updated;

        if ("WARNING".equals(processResult)) {
            updated = adminDao.addWarningToMember(targetMemberId);
        } else {
            updated = adminDao.suspendMember(targetMemberId, suspendedUntil);
            refreshTokenRedisService.deleteAllRefreshTokens(targetMemberId);
        }

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\uD68C\uC6D0 \uC81C\uC7AC \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }
    }

    private void validateReportId(Long reportId) {
        if (reportId == null) {
            throw new IllegalArgumentException("\uC2E0\uACE0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
        }
    }

    private AdminReport selectRequiredAdminReport(Long reportId) {
        AdminReport report = adminDao.selectAdminReportById(reportId);

        if (report == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "\uC2E0\uACE0 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }

        attachRecentActivities(report);
        attachReporters(report);

        return report;
    }

    private void attachRecentActivities(AdminReport report) {
        if (report == null || report.getTargetMemberId() == null) {
            if (report != null) {
                report.setActivities(Collections.emptyList());
            }
            return;
        }

        List<AdminReportActivity> activities = adminDao.selectAdminReportRecentActivities(report.getTargetMemberId());
        report.setActivities(activities == null ? Collections.emptyList() : activities);
    }

    private void attachReporters(AdminReport report) {
        if (report == null || report.getReportId() == null) {
            if (report != null) {
                report.setReporters(Collections.emptyList());
            }
            return;
        }

        List<AdminReportReporter> reporters = adminDao.selectAdminReportReporters(report.getReportId());
        report.setReporters(reporters == null ? Collections.emptyList() : reporters);
    }

    private String normalizeReportStatus(String status) {
        String normalized = status == null || status.isBlank() ? "ALL" : status.trim().toUpperCase();

        if ("ALL".equals(normalized)
                || "PENDING".equals(normalized)
                || "REVIEWING".equals(normalized)
                || "DONE".equals(normalized)) {
            return normalized;
        }

        throw new IllegalArgumentException("\uC2E0\uACE0 \uC0C1\uD0DC \uD544\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    }

    private String normalizeReportTargetType(String targetType) {
        String normalized = targetType == null || targetType.isBlank() ? "ALL" : targetType.trim().toUpperCase();

        if ("ALL".equals(normalized) || "POST".equals(normalized) || "COMMENT".equals(normalized)) {
            return normalized;
        }

        throw new IllegalArgumentException("\uC2E0\uACE0 \uC720\uD615 \uD544\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    }

    private String normalizeReportProcessResult(String processResult) {
        String normalized = processResult == null || processResult.isBlank() ? "ALL" : processResult.trim().toUpperCase();

        if ("ALL".equals(normalized)) {
            return normalized;
        }

        return normalizeRequiredReportProcessResult(normalized);
    }

    private String normalizeRequiredReportProcessResult(String processResult) {
        String normalized = processResult == null || processResult.isBlank() ? "" : processResult.trim().toUpperCase();

        if ("WARNING".equals(normalized)
                || "TEMPORARY_SUSPEND".equals(normalized)
                || "PERMANENT_SUSPEND".equals(normalized)
                || "REJECT".equals(normalized)) {
            return normalized;
        }

        throw new IllegalArgumentException("\uCC98\uB9AC \uACB0\uACFC\uB97C \uC62C\uBC14\uB974\uAC8C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
    }

    private LocalDateTime calculateReportSuspendedUntil(
            String processResult,
            AdminReportProcessRequest request
    ) {
        if ("PERMANENT_SUSPEND".equals(processResult) || "WARNING".equals(processResult) || "REJECT".equals(processResult)) {
            return null;
        }

        if (!"TEMPORARY_SUSPEND".equals(processResult)) {
            throw new IllegalArgumentException("\uCC98\uB9AC \uACB0\uACFC\uB97C \uC62C\uBC14\uB974\uAC8C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
        }

        if (request.getSuspendedUntil() != null && !request.getSuspendedUntil().trim().isEmpty()) {
            LocalDateTime customSuspendedUntil = LocalDate.parse(request.getSuspendedUntil().trim()).atTime(23, 59, 59);

            if (!customSuspendedUntil.isAfter(LocalDateTime.now(KOREA_ZONE))) {
                throw new IllegalArgumentException("\uC815\uC9C0 \uD574\uC81C\uC77C\uC740 \uD604\uC7AC\uBCF4\uB2E4 \uC774\uD6C4 \uB0A0\uC9DC\uB85C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
            }

            return customSuspendedUntil;
        }

        Integer suspendDays = request.getSuspendDays();

        if (suspendDays == null || suspendDays <= 0) {
            throw new IllegalArgumentException("\uC77C\uC2DC \uC815\uC9C0 \uAE30\uAC04\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
        }

        return LocalDateTime.now(KOREA_ZONE).plusDays(suspendDays);
    }

    private String buildReportProcessActionDetail(
            String processResult,
            String processReason,
            LocalDateTime suspendedUntil
    ) {
        if ("TEMPORARY_SUSPEND".equals(processResult)) {
            return "\uC2E0\uACE0 \uCC98\uB9AC \uACB0\uACFC: \uC77C\uC2DC \uC815\uC9C0, \uC0AC\uC720: " + processReason + ", \uD574\uC81C \uC608\uC815\uC77C: " + suspendedUntil;
        }

        if ("PERMANENT_SUSPEND".equals(processResult)) {
            return "\uC2E0\uACE0 \uCC98\uB9AC \uACB0\uACFC: \uC601\uAD6C \uC815\uC9C0, \uC0AC\uC720: " + processReason;
        }

        if ("WARNING".equals(processResult)) {
            return "\uC2E0\uACE0 \uCC98\uB9AC \uACB0\uACFC: \uACBD\uACE0, \uC0AC\uC720: " + processReason;
        }

        return "\uC2E0\uACE0 \uCC98\uB9AC \uACB0\uACFC: \uBC18\uB824, \uC0AC\uC720: " + processReason;
    }

    public AdminMemberDetail getMemberDetail(String authorizationHeader, Long memberId) {
        validateAdmin(authorizationHeader);

        if (memberId == null) {
            throw new IllegalArgumentException("조회할 회원을 선택해주세요.");
        }

        AdminMemberDetail memberDetail = adminDao.selectMemberDetail(memberId);

        if (memberDetail == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보를 찾을 수 없습니다.");
        }

        return memberDetail;
    }

    /* ==========================================================================
     * 회원 정지 처리
     * --------------------------------------------------------------------------
     * 사용자 관리 패널에서 "일시 정지" 또는 "영구 정지"를 확정했을 때 실행됩니다.
     *
     * 처리 흐름:
     * 1. 요청자가 관리자 권한인지 확인합니다.
     * 2. 정지 대상 회원이 존재하는지 확인합니다.
     * 3. 정지 유형에 따라 suspended_until 값을 계산합니다.
     *    - TEMPORARY: 미래 날짜 저장
     *    - PERMANENT: null 저장
     * 4. members.status를 SUSPENDED로 변경합니다.
     * 5. admin_action_logs에 관리자 작업 기록을 남깁니다.
     *
     * warning_count 안내 문구는 프론트에서 보여주지만,
     * 실제 정지 처리는 백엔드에서 한 번 더 권한과 대상 존재 여부를 확인합니다.
     * ========================================================================== */
    @Transactional
    public AdminMemberDetail suspendMember(
            String authorizationHeader,
            Long memberId,
            AdminMemberSuspendRequest request
    ) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);

        if (memberId == null) {
            throw new IllegalArgumentException("정지할 회원을 선택해주세요.");
        }

        if (request == null) {
            throw new IllegalArgumentException("정지 정보를 입력해주세요.");
        }

        AdminMemberDetail targetMember = adminDao.selectMemberDetail(memberId);

        if (targetMember == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "정지할 회원 정보를 찾을 수 없습니다.");
        }

        if (Objects.equals(loginMember.getMemberId(), memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 계정은 정지할 수 없습니다.");
        }

        if (isAdminRole(targetMember.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 계정은 정지할 수 없습니다.");
        }

        LocalDateTime suspendedUntil = calculateSuspendedUntil(request);
        int updated = adminDao.suspendMember(memberId, suspendedUntil);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "회원 정지 처리에 실패했습니다.");
        }

        refreshTokenRedisService.deleteAllRefreshTokens(memberId);

        String actionDetail = buildSuspendActionDetail(request.getSuspendType(), suspendedUntil);
        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "SUSPEND",
                "USER",
                memberId,
                actionDetail
        );

        publishAccountSanctionAfterCommit(
                memberId,
                suspendedUntil == null ? "PERMANENT_SUSPEND" : "TEMPORARY_SUSPEND",
                actionDetail,
                suspendedUntil
        );

        return adminDao.selectMemberDetail(memberId);
    }

    private void publishAccountSanctionAfterCommit(
            Long memberId,
            String processResult,
            String reason,
            LocalDateTime suspendedUntil
    ) {
        if (memberId == null || processResult == null) {
            return;
        }

        Runnable publisher = () -> sendAccountSanctionNotification(memberId, processResult, reason, suspendedUntil);

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            publisher.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publisher.run();
            }
        });
    }

    private void sendAccountSanctionNotification(
            Long memberId,
            String processResult,
            String reason,
            LocalDateTime suspendedUntil
    ) {
        boolean isWarning = "WARNING".equals(processResult);
        boolean isSuspended = "TEMPORARY_SUSPEND".equals(processResult) || "PERMANENT_SUSPEND".equals(processResult);

        if (!isWarning && !isSuspended) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", "ACCOUNT_SANCTION");
        payload.put("notificationId", "account-sanction-" + memberId + "-" + System.currentTimeMillis());
        payload.put("memberId", memberId);
        payload.put("sanctionType", isWarning ? "WARNING" : "SUSPENDED");
        payload.put("reason", reason == null || reason.isBlank() ? "관리자 제재 처리" : reason);
        payload.put(
                "message",
                isWarning
                        ? "관리자로부터 경고를 받았습니다. 서비스 이용 규칙을 확인해주세요."
                        : "계정이 정지되어 로그아웃됩니다. 자세한 내용은 관리자에게 문의해주세요."
        );

        if (suspendedUntil != null) {
            payload.put("suspendedUntil", suspendedUntil.toString());
        }

        messagingTemplate.convertAndSend("/sub/notifications/" + memberId, payload);
    }

    private LocalDateTime calculateSuspendedUntil(AdminMemberSuspendRequest request) {
        String suspendType = request.getSuspendType();

        if ("PERMANENT".equals(suspendType)) {
            return null;
        }

        if (!"TEMPORARY".equals(suspendType)) {
            throw new IllegalArgumentException("정지 유형을 올바르게 선택해주세요.");
        }

        if (request.getSuspendedUntil() != null && !request.getSuspendedUntil().trim().isEmpty()) {
            LocalDateTime customSuspendedUntil = LocalDate.parse(request.getSuspendedUntil().trim()).atTime(23, 59, 59);

            /*
             * 시간대 주의:
             * EC2/로컬 실행 환경의 기본 시간대가 UTC로 잡히면 LocalDateTime.now() 기준이 달라질 수 있습니다.
             * 관리자 정지 만료일은 화면과 DB 통계가 모두 서울 시간을 기준으로 동작하므로 명시적으로 Asia/Seoul을 사용합니다.
             */
            if (!customSuspendedUntil.isAfter(LocalDateTime.now(KOREA_ZONE))) {
                throw new IllegalArgumentException("정지 해제일은 현재보다 이후 날짜로 선택해주세요.");
            }

            return customSuspendedUntil;
        }

        Integer suspendDays = request.getSuspendDays();

        if (suspendDays == null || suspendDays <= 0) {
            throw new IllegalArgumentException("정지 기간을 선택해주세요.");
        }

        return LocalDateTime.now(KOREA_ZONE).plusDays(suspendDays);
    }

    private String buildSuspendActionDetail(String suspendType, LocalDateTime suspendedUntil) {
        if ("PERMANENT".equals(suspendType)) {
            return "회원 영구 정지";
        }

        return "회원 일시 정지, 해제 예정일: " + suspendedUntil;
    }

    /* ==========================================================================
     * 회원 정지 해제 처리
     * --------------------------------------------------------------------------
     * 정지 상태인 회원을 다시 ACTIVE 상태로 되돌립니다.
     *
     * 처리 기준:
     * - 정지 이력은 사라지면 안 되므로 suspension_count는 변경하지 않습니다.
     * - suspended_until만 null로 비우고 status를 ACTIVE로 변경합니다.
     * - admin_action_logs에는 RESTORE 작업을 append-only 방식으로 추가합니다.
     * ========================================================================== */
    @Transactional
    public AdminMemberDetail restoreSuspendedMember(String authorizationHeader, Long memberId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);

        if (memberId == null) {
            throw new IllegalArgumentException("정지 해제할 회원을 선택해주세요.");
        }

        AdminMemberDetail targetMember = adminDao.selectMemberDetail(memberId);

        if (targetMember == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "정지 해제할 회원 정보를 찾을 수 없습니다.");
        }

        if (Objects.equals(loginMember.getMemberId(), memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 계정은 정지 해제 대상이 될 수 없습니다.");
        }

        if (isAdminRole(targetMember.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 계정은 정지 해제할 수 없습니다.");
        }

        int updated = adminDao.restoreSuspendedMember(memberId);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "정지 상태인 회원만 정지 해제할 수 있습니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "RESTORE",
                "USER",
                memberId,
                "회원 정지 해제"
        );

        return adminDao.selectMemberDetail(memberId);
    }

    /* ==========================================================================
     * 관리자 권한 관리 대상 회원 검색
     * --------------------------------------------------------------------------
     * 관리자 권한 관리 페이지에서 "이메일" 또는 "실명" 기준으로 기존 회원을 찾습니다.
     *
     * searchType 설명:
     * - "email"이면 members.email 컬럼에서 검색합니다.
     * - "name"이면 members.name 컬럼에서 검색합니다.
     *
     * keyword 설명:
     * - 검색창에 입력한 실제 검색어입니다.
     * - 비어 있는 검색어면 전체 권한 관리 대상 회원을 조회합니다.
     * ========================================================================== */
    public List<AdminMember> searchMembersForAdminPromotion(
            String authorizationHeader,
            String searchType,
            String keyword
    ) {
        validateSuperAdmin(authorizationHeader);

        String normalizedSearchType =
                "name".equals(searchType) || "nickname".equals(searchType)
                        ? searchType
                        : "email";
        String normalizedKeyword = keyword == null ? "" : keyword.trim();

        log.info(
                "[ADMIN_API] searchMembersForAdminPromotion start searchType={} keywordLength={}",
                normalizedSearchType,
                normalizedKeyword.length()
        );
        List<AdminMember> members = adminDao.searchMembersForAdminPromotion(normalizedSearchType, normalizedKeyword);
        log.info("[ADMIN_API] searchMembersForAdminPromotion success size={}", members == null ? 0 : members.size());

        return members;
    }

    /* ==========================================================================
     * 회원 관리자 등급 변경
     * --------------------------------------------------------------------------
     * 관리자 권한 관리 페이지에서 선택한 ACTIVE 회원의 role을 변경합니다.
     *
     * 처리 규칙:
     * - 변경 가능한 role은 USER, SUPER_ADMIN 두 가지입니다.
     * - 기존 관리자 계정에 같은 관리자 권한을 다시 덮어씌우는 관리는 막습니다.
     * - 단, 관리자가 관리자 권한을 일반 회원(USER)으로 내리는 강등은 허용합니다.
     * - SQL에서도 ACTIVE 상태와 변경 가능한 role 조건을 다시 확인합니다.
     * - 조건에 맞지 않으면 400 BAD_REQUEST로 실패 처리합니다.
     * ========================================================================== */
    @Transactional
    public void promoteMemberToAdmin(
            String authorizationHeader,
            Long memberId,
            String role
    ) {
        LoginMemberResponse loginMember = validateSuperAdmin(authorizationHeader);

        if (memberId == null) {
            throw new IllegalArgumentException("관리자 등급을 변경할 회원을 선택해주세요.");
        }

        AdminMemberDetail targetMember = adminDao.selectMemberDetail(memberId);

        if (targetMember == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "관리자 등급을 변경할 회원 정보를 찾을 수 없습니다.");
        }

        String normalizedRole = normalizeAdminRole(role);

        /*
         * 관리자 권한 변경 정책:
         * - USER/MEMBER 같은 일반 회원을 SUPER_ADMIN으로 승급하는 것은 허용합니다.
         * - SUPER_ADMIN 계정을 USER로 강등하는 것은 허용합니다.
         * - SUPER_ADMIN 계정에 다시 SUPER_ADMIN 권한을 덮어씌우는 것은 관리 사고 위험이 있어 막습니다.
         * - SUPER_ADMIN이 아닌 role 값은 관리자 권한으로 인정하지 않습니다.
         */
        if (isAdminRole(targetMember.getRole()) && !"USER".equals(normalizedRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 계정은 일반 회원으로 강등만 할 수 있습니다.");
        }

        int updated = adminDao.updateMemberRoleForAdminPromotion(memberId, normalizedRole);

        if (updated != 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ACTIVE 상태의 회원만 관리자 등급을 변경할 수 있습니다."
            );
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "UPDATE_ADMIN_ROLE",
                "USER",
                memberId,
                "회원 관리자 등급 변경: " + normalizedRole
        );
    }

    private String normalizeAdminRole(String role) {
        if ("SUPER_ADMIN".equals(role)) {
            return "SUPER_ADMIN";
        }

        if ("USER".equals(role)) {
            return "USER";
        }

        throw new IllegalArgumentException("관리자 등급을 올바르게 선택해주세요.");
    }

    private boolean isAdminRole(String role) {
        return "SUPER_ADMIN".equals(role);
    }

    /* ==========================================================================
     * 관리자 대시보드 요약 조회
     * --------------------------------------------------------------------------
     * 대시보드 상단 카드에 필요한 숫자를 한 번에 조회합니다.
     *
     * Polling을 사용할 때 API를 여러 번 호출하지 않기 위해,
     * 회원수/신규 가입자/게시글 수를 하나의 응답으로 묶습니다.
     * ========================================================================== */
    public AdminDashboardSummary getDashboardSummary(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        return adminDao.selectDashboardSummary();
    }

    /*
     * 관리자 대시보드 감정별 활동 분포 조회
     * --------------------------------------------------------------------------
     * 초보자 설명:
     * - 프론트에서 day/week/month 중 하나를 보내면 해당 기간에 작성된 게시글을 감정별로 집계합니다.
     * - 잘못된 period 값이 들어와도 SQL에 그대로 넘기지 않고 day로 바꿔 안전하게 처리합니다.
     */
    public List<AdminEmotionActivity> getDashboardEmotionActivity(
            String authorizationHeader,
            String period,
            String startDate,
            String endDate
    ) {
        validateAdmin(authorizationHeader);

        String normalizedPeriod = normalizeDashboardPeriod(period);
        AdminDateRange dateRange = resolveAdminDateRange(normalizedPeriod, startDate, endDate);
        List<AdminEmotionActivity> activities = adminDao.selectDashboardEmotionActivity(
                normalizedPeriod,
                dateRange.startDate(),
                dateRange.endDate()
        );

        return activities == null ? Collections.emptyList() : activities;
    }

    /*
     * 관리자 대시보드 시간별 활성 사용자 조회
     * --------------------------------------------------------------------------
     * members.last_login_at을 기준으로 일/주/월 단위 활성 사용자 수를 조회합니다.
     */
    public List<AdminActiveUserStat> getDashboardActiveUsers(
            String authorizationHeader,
            String period,
            String startDate,
            String endDate
    ) {
        validateAdmin(authorizationHeader);

        String normalizedPeriod = normalizeDashboardPeriod(period);
        AdminDateRange dateRange = resolveAdminDateRange(normalizedPeriod, startDate, endDate);
        List<AdminActiveUserStat> activeUsers = adminDao.selectDashboardActiveUsers(
                normalizedPeriod,
                dateRange.startDate(),
                dateRange.endDate()
        );

        return activeUsers == null ? Collections.emptyList() : activeUsers;
    }

    /*
     * 관리자 대시보드 최근 활동 10개 조회
     * --------------------------------------------------------------------------
     * 가입, 탈퇴, 정지, 정지 해제처럼 관리자 대시보드에서 바로 확인해야 하는 활동만 최신순으로 가져옵니다.
     */
    public List<AdminRecentActivity> getRecentDashboardActivities(String authorizationHeader) {
        validateAdmin(authorizationHeader);

        List<AdminRecentActivity> activities = adminDao.selectRecentDashboardActivities();

        return activities == null ? Collections.emptyList() : activities;
    }

    /*
     * 관리자 대시보드 전체 활동 조회
     * --------------------------------------------------------------------------
     * 프론트의 "전체 보기" 팝업에서 페이지네이션으로 나누어 보여줄 전체 활동 목록입니다.
     */
    public List<AdminRecentActivity> getAllDashboardActivities(String authorizationHeader) {
        validateAdmin(authorizationHeader);

        List<AdminRecentActivity> activities = adminDao.selectAllDashboardActivities();

        return activities == null ? Collections.emptyList() : activities;
    }

    /*
     * 통계 대시보드 기간별 요약 조회
     * --------------------------------------------------------------------------
     * 프론트에서 선택한 일/주/월 값을 백엔드에서 한 번 더 검증한 뒤 DB에 전달합니다.
     * 이렇게 하면 프론트가 잘못된 period 값을 보내도 SQL 조건이 깨지지 않습니다.
     */
    public AdminStatisticsSummary getStatisticsSummary(
            String authorizationHeader,
            String period,
            String startDate,
            String endDate
    ) {
        validateAdmin(authorizationHeader);

        String normalizedPeriod = normalizeDashboardPeriod(period);
        AdminDateRange dateRange = resolveAdminDateRange(normalizedPeriod, startDate, endDate);
        AdminStatisticsSummary summary = adminDao.selectStatisticsSummary(
                normalizedPeriod,
                dateRange.startDate(),
                dateRange.endDate()
        );

        return summary == null ? new AdminStatisticsSummary(0L, 0L, 0L, 0L, 0L, 0L) : summary;
    }

    /*
     * 통계 대시보드 가입자 추이 조회
     * --------------------------------------------------------------------------
     * day는 00~23시, week는 최근 7일, month는 최근 4주 단위로 가입자 흐름을 가져옵니다.
     */
    public List<AdminStatisticsTrend> getStatisticsSubscriberTrend(
            String authorizationHeader,
            String period,
            String startDate,
            String endDate
    ) {
        validateAdmin(authorizationHeader);

        String normalizedPeriod = normalizeDashboardPeriod(period);
        AdminDateRange dateRange = resolveAdminDateRange(normalizedPeriod, startDate, endDate);
        List<AdminStatisticsTrend> trends = adminDao.selectStatisticsSubscriberTrend(
                normalizedPeriod,
                dateRange.startDate(),
                dateRange.endDate()
        );

        return trends == null ? Collections.emptyList() : trends;
    }

    /*
     * 통계 대시보드 콘텐츠 활동 조회
     * --------------------------------------------------------------------------
     * 게시글, 댓글, 공감 수를 같은 형태(label/value)로 내려주면 프론트 막대 그래프가 단순해집니다.
     */
    public List<AdminStatisticsTrend> getStatisticsContentActivity(
            String authorizationHeader,
            String period,
            String startDate,
            String endDate
    ) {
        validateAdmin(authorizationHeader);

        String normalizedPeriod = normalizeDashboardPeriod(period);
        AdminDateRange dateRange = resolveAdminDateRange(normalizedPeriod, startDate, endDate);
        List<AdminStatisticsTrend> activities = adminDao.selectStatisticsContentActivity(
                normalizedPeriod,
                dateRange.startDate(),
                dateRange.endDate()
        );

        return activities == null ? Collections.emptyList() : activities;
    }

    private String normalizeDashboardPeriod(String period) {
        if ("week".equals(period) || "month".equals(period)) {
            return period;
        }

        return "day";
    }

    /*
     * 관리자 기간 조회 범위 검증
     * --------------------------------------------------------------------------
     * 프론트가 보내는 startDate/endDate는 yyyy-MM-dd 형식만 허용합니다.
     * 값이 없으면 서울 시간 기준 오늘으로 초기화하고, 기간 탭에 맞는 기본 범위를 계산합니다.
     */
    private AdminDateRange resolveAdminDateRange(String period, String startDate, String endDate) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        LocalDate start = parseAdminDate(startDate);
        LocalDate end = parseAdminDate(endDate);

        if (start == null || end == null) {
            if ("week".equals(period)) {
                start = today.minusDays(6);
                end = today;
            } else if ("month".equals(period)) {
                start = LocalDate.of(today.getYear(), 1, 1);
                end = LocalDate.of(today.getYear(), 12, 31);
            } else {
                start = today;
                end = today;
            }
        }

        LocalDate serviceStartDate = LocalDate.of(2026, 1, 1);

        if (start.isBefore(serviceStartDate) || end.isBefore(serviceStartDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2026년 이후 기간만 조회할 수 있습니다.");
        }

        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 시작일은 종료일보다 늦을 수 없습니다.");
        }

        if ("day".equals(period) && !start.equals(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "일 단위 조회는 하루 범위만 선택할 수 있습니다.");
        }

        return new AdminDateRange(start, end);
    }

    private LocalDate parseAdminDate(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 형식은 yyyy-MM-dd로 입력해주세요.");
        }
    }

    private record AdminDateRange(LocalDate startDate, LocalDate endDate) {
    }

    public List<Notice> getAdminNotices(String authorizationHeader, String status) {
        validateAdmin(authorizationHeader);

        String normalizedStatus = normalizeNoticeStatus(status);
        List<Notice> notices = adminDao.selectAdminNotices(normalizedStatus);

        return notices == null ? Collections.emptyList() : notices;
    }

    public Notice getLatestActiveNotice(String authorizationHeader) {
        validateAdmin(authorizationHeader);
        return adminDao.selectLatestActiveNotice();
    }

    @Transactional
    public Notice createAdminNotice(String authorizationHeader, AdminNoticeRequest request) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        NoticeInput noticeInput = normalizeNoticeInput(request);

        int inserted = adminDao.insertAdminNotice(
                noticeInput.title(),
                noticeInput.content(),
                noticeInput.noticeType(),
                loginMember.getMemberId()
        );

        if (inserted != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공지사항 작성에 실패했습니다.");
        }

        Notice createdNotice = adminDao.selectLatestActiveNotice();

        if (createdNotice != null) {
            adminDao.insertAdminActionLog(
                    loginMember.getMemberId(),
                    "CREATE",
                    "NOTICE",
                    createdNotice.getNoticeId(),
                    "공지사항 작성: " + noticeInput.title()
            );
        }

        return createdNotice;
    }

    @Transactional
    public Notice updateAdminNotice(String authorizationHeader, Long noticeId, AdminNoticeRequest request) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validateNoticeId(noticeId);
        NoticeInput noticeInput = normalizeNoticeInput(request);

        int updated = adminDao.updateAdminNotice(
                noticeId,
                noticeInput.title(),
                noticeInput.content(),
                noticeInput.noticeType(),
                loginMember.getMemberId()
        );

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정할 수 있는 정상 공지사항이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "UPDATE",
                "NOTICE",
                noticeId,
                "공지사항 수정: " + noticeInput.title()
        );

        return selectRequiredNotice(noticeId);
    }

    @Transactional
    public Notice softDeleteAdminNotice(String authorizationHeader, Long noticeId) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);
        validateNoticeId(noticeId);

        int updated = adminDao.softDeleteAdminNotice(noticeId, loginMember.getMemberId());

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제할 수 있는 정상 공지사항이 아닙니다.");
        }

        adminDao.insertAdminActionLog(
                loginMember.getMemberId(),
                "DELETE",
                "NOTICE",
                noticeId,
                "공지사항 삭제 상태 전환"
        );

        return selectRequiredNotice(noticeId);
    }

    private Notice selectRequiredNotice(Long noticeId) {
        Notice notice = adminDao.selectAdminNoticeById(noticeId);

        if (notice == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }

        return notice;
    }

    private void validateNoticeId(Long noticeId) {
        if (noticeId == null) {
            throw new IllegalArgumentException("공지사항을 선택해주세요.");
        }
    }

    private String normalizeNoticeStatus(String status) {
        if ("active".equals(status) || "deleted".equals(status)) {
            return status;
        }

        return "all";
    }

    private NoticeInput normalizeNoticeInput(AdminNoticeRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("공지사항 정보를 입력해주세요.");
        }

        String title = normalizeRequiredText(request.getTitle(), "공지사항 제목을 입력해주세요.");
        String content = normalizeNoticeContent(
                normalizeRequiredText(request.getContent(), "공지사항 내용을 입력해주세요.")
        );
        String noticeType = normalizeNoticeType(request.getNoticeType());

        return new NoticeInput(title, content, noticeType);
    }

    private String normalizeNoticeType(String noticeType) {
        if ("UPDATE".equals(noticeType)) {
            return "UPDATE";
        }

        if ("EMERGENCY".equals(noticeType)) {
            return "EMERGENCY";
        }

        return "NORMAL";
    }

    private String normalizeNoticeContent(String content) {
        return content
                .replaceAll("(?is)<\\s*(script|style|iframe|object|embed)[^>]*>.*?<\\s*/\\s*\\1\\s*>", "")
                .replaceAll("(?is)<\\s*(script|style|iframe|object|embed)[^>]*/\\s*>", "")
                .replaceAll("(?i)\\s+on[a-z]+\\s*=\\s*\"[^\"]*\"", "")
                .replaceAll("(?i)\\s+on[a-z]+\\s*=\\s*'[^']*'", "")
                .replaceAll("(?i)\\s+on[a-z]+\\s*=\\s*[^\\s>]+", "")
                .replaceAll("(?i)(href\\s*=\\s*\")\\s*javascript:[^\"]*(\")", "$1#$2")
                .replaceAll("(?i)(href\\s*=\\s*')\\s*javascript:[^']*(')", "$1#$2")
                .trim();
    }

    private record NoticeInput(String title, String content, String noticeType) {
    }

    /* ==========================================================================
     * 관리자 개인 정보 조회
     * --------------------------------------------------------------------------
     * 로그인한 관리자의 memberId를 기준으로 DB에 저장된 실명, 닉네임, 전화번호를 조회합니다.
     * ========================================================================== */
    public AdminProfile getAdminProfile(String authorizationHeader) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);

        adminDao.resetAdminProfileImagesToDefault();

        AdminProfile adminProfile = adminDao.selectAdminProfile(loginMember.getMemberId());

        if (adminProfile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "관리자 정보를 찾을 수 없습니다.");
        }

        return adminProfile;
    }

    /* ==========================================================================
     * 관리자 개인 정보 수정
     * --------------------------------------------------------------------------
     * 로그인한 관리자 본인의 실명, 닉네임, 전화번호를 수정합니다.
     * 관리자 페이지에서는 프로필 이미지 기능을 사용하지 않습니다.
     *
     * 주의:
     * - 다른 사람 정보를 수정하지 않도록 token에서 얻은 memberId만 사용합니다.
     * - 프론트에서 memberId를 보내더라도 신뢰하지 않는 구조입니다.
     * ========================================================================== */
    @Transactional
    public AdminProfile updateAdminProfile(
            String authorizationHeader,
            AdminProfileUpdateRequest request
    ) {
        LoginMemberResponse loginMember = validateAdmin(authorizationHeader);

        if (request == null) {
            throw new IllegalArgumentException("수정할 정보를 입력해주세요.");
        }

        String name = normalizeRequiredText(request.getName(), "이름을 입력해주세요.");
        String nickname = normalizeRequiredText(request.getNickname(), "닉네임을 입력해주세요.");
        String phone = normalizeRequiredText(request.getPhone(), "전화번호를 입력해주세요.");

        int updated = adminDao.updateAdminProfile(loginMember.getMemberId(), name, nickname, phone);

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "관리자 정보 수정에 실패했습니다.");
        }

        return getAdminProfile(authorizationHeader);
    }

    private String normalizeRequiredText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(message);
        }

        return value.trim();
    }
}

