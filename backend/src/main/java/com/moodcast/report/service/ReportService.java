package com.moodcast.report.service;

import com.moodcast.member.dto.login.LoginMemberResponse;
import com.moodcast.member.service.LoginService;
import com.moodcast.report.dao.ReportDao;
import com.moodcast.report.domain.Report;
import com.moodcast.report.dto.CreateReportRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

    @Autowired
    private ReportDao reportDao;

    @Autowired
    private LoginService loginService;

    @Transactional
    public void createReport(String authorizationHeader, CreateReportRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("신고 정보를 입력해주세요.");
        }

        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("신고 사유를 입력해주세요.");
        }

        if (request.getPostId() == null && request.getCommentId() == null) {
            throw new IllegalArgumentException("신고 대상을 선택해주세요.");
        }

        if (request.getPostId() != null && request.getCommentId() != null) {
            throw new IllegalArgumentException("게시물 또는 댓글 중 하나만 신고할 수 있습니다.");
        }

        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        Long reporterMemberId = loginMember.getMemberId();

        if (request.getPostId() != null && reportDao.existsPostById(request.getPostId()) == 0) {
            throw new IllegalArgumentException("신고할 게시물을 찾을 수 없습니다.");
        }

        if (request.getCommentId() != null && reportDao.existsCommentById(request.getCommentId()) == 0) {
            throw new IllegalArgumentException("신고할 댓글을 찾을 수 없습니다.");
        }

        if (request.getPostId() != null && reportDao.existsReportByReporterAndPost(reporterMemberId, request.getPostId())) {
            throw new IllegalArgumentException("이미 신고한 게시물입니다.");
        }

        if (request.getCommentId() != null && reportDao.existsReportByReporterAndComment(reporterMemberId, request.getCommentId())) {
            throw new IllegalArgumentException("이미 신고한 댓글입니다.");
        }

        Report report = new Report();
        report.setReporterMemberId(reporterMemberId);
        report.setPostId(request.getPostId());
        report.setCommentId(request.getCommentId());
        report.setReason(reason);

        int inserted = reportDao.insertReport(report);
        if (inserted != 1) {
            throw new IllegalStateException("신고 접수에 실패했습니다.");
        }
    }
}
