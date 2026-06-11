package com.moodcast.report.controller;

import com.moodcast.report.dto.CreateReportRequest;
import com.moodcast.report.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@CrossOrigin(
        origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://3.39.49.9:5173"},
        allowCredentials = "true"
)
@RequestMapping("reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @PostMapping
    public ResponseEntity<?> createReport(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody CreateReportRequest request
    ) {
        reportService.createReport(authorizationHeader, request);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "신고가 접수되었습니다."
                )
        );
    }
}
