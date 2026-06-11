package com.moodcast.member.controller;

import com.moodcast.common.ClientIpResolver;
import com.moodcast.common.exception.AuthException;
import com.moodcast.member.dto.login.LoginRequest;
import com.moodcast.member.dto.login.LoginResponse;
import com.moodcast.member.dto.login.LoginResult;
import com.moodcast.member.dto.login.LoginMemberResponse;
import com.moodcast.member.dto.login.RefreshTokenInfo;
import com.moodcast.member.dto.login.UpdateProfileRequest;
import com.moodcast.member.dto.password.PasswordChangeRequest;
import com.moodcast.member.dto.recovery.FindEmailCodeRequest;
import com.moodcast.member.dto.recovery.FindEmailResult;
import com.moodcast.member.dto.recovery.FindEmailVerifyRequest;
import com.moodcast.member.dto.recovery.PasswordResetCodeRequest;
import com.moodcast.member.dto.recovery.PasswordResetRequest;
import com.moodcast.member.dto.recovery.PasswordResetVerifyRequest;
import com.moodcast.member.dto.signup.EmailAuthSendResult;
import com.moodcast.member.dto.withdraw.WithdrawRequest;
import com.moodcast.member.dto.follow.FollowResponse;
import com.moodcast.member.dto.follow.FollowCheckResponse;
import com.moodcast.member.dto.follow.FollowItemResponse;
import com.moodcast.member.service.AccountRecoveryService;
import com.moodcast.member.service.LoginAuditService;
import com.moodcast.member.service.LoginService;
import com.moodcast.member.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("auth")
public class LoginController {
    @Autowired
    private LoginService loginService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private LoginAuditService loginAuditService;

    @Autowired
    private AccountRecoveryService accountRecoveryService;

    @Autowired
    private ClientIpResolver clientIpResolver;

    @Value("${app.dev-return-auth-code:false}")
    private boolean devReturnAuthCode;

    private String getClientIp(HttpServletRequest request) {
        return clientIpResolver.resolve(request);
    }

    private String getUserAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }

    private String getAuditEmail(LoginRequest request) {
        if (request == null || request.getEmail() == null) {
            return null;
        }

        return request.getEmail().trim().toLowerCase();
    }

    private String getLoginFailReason(Exception e) {
        String message = e.getMessage();

        if (message == null) {
            return "UNKNOWN";
        }

        if (message.contains("\uC2E4\uD328 \uD69F\uC218")) {
            return "ACCOUNT_LOCKED";
        }

        if (message.contains("\uC81C\uC7AC\uB41C \uACC4\uC815") || message.contains("\uB85C\uADF8\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4")) {
            return "SUSPENDED";
        }

        if (message.contains("\uD0C8\uD1F4 \uCC98\uB9AC")) {
            return "WITHDRAW";
        }

        if (message.contains("\uC774\uBA54\uC77C \uC778\uC99D")) {
            return "EMAIL_NOT_VERIFIED";
        }

        if (message.contains("\uBE44\uBC00\uBC88\uD638")) {
            return "PASSWORD_MISMATCH";
        }

        return "UNKNOWN";
    }

    private LoginMemberResponse getAuditMemberFromRefreshToken(String refreshToken) {
        try {
            RefreshTokenInfo refreshTokenInfo = jwtService.getRefreshTokenInfo(refreshToken);
            return loginService.getMemberById(refreshTokenInfo.getMemberId());
        } catch (Exception e) {
            return null;
        }
    }

    private Long getAuditMemberId(LoginMemberResponse member) {
        return member == null ? null : member.getMemberId();
    }

    private String getAuditMemberEmail(LoginMemberResponse member) {
        return member == null ? null : member.getEmail();
    }

    private String getRefreshFailReason(Exception e, LoginMemberResponse auditMember) {
        String message = e.getMessage();

        if (message == null) {
            return "UNKNOWN";
        }

        if (message.contains("\uC81C\uC7AC\uB41C \uACC4\uC815") || message.contains("\uB85C\uADF8\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4")) {
            return "SUSPENDED";
        }

        if (message.contains("\uD0C8\uD1F4 \uCC98\uB9AC")) {
            return "WITHDRAW";
        }

        if (message.contains("\uC774\uBA54\uC77C \uC778\uC99D")) {
            return "EMAIL_NOT_VERIFIED";
        }

        if (auditMember != null && message.contains("\uB85C\uADF8\uC778")) {
            return "REFRESH_MISMATCH";
        }

        return "REFRESH_EXPIRED";
    }

    @PostMapping("login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            LoginResult result = loginService.login(request);

            loginAuditService.record(
                    result.getMember().getMemberId(),
                    result.getMember().getEmail(),
                    null,
                    "PASSWORD_LOGIN_SUCCESS",
                    true,
                    null,
                    getClientIp(httpRequest),
                    getUserAgent(httpRequest)
            );

            ResponseCookie refreshCookie = jwtService.createRefreshCookie(result.getRefreshToken(), result.isRemember());

            LoginResponse response = new LoginResponse(
                    true,
                    "\uB85C\uADF8\uC778 \uC131\uACF5",
                    result.getAccessToken(),
                    result.getMember()
            );

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                    .body(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            String failReason = getLoginFailReason(e);

            loginAuditService.record(
                    null,
                    getAuditEmail(request),
                    null,
                    "ACCOUNT_LOCKED".equals(failReason) ? "ACCOUNT_LOCKED" : "PASSWORD_LOGIN_FAIL",
                    false,
                    failReason,
                    getClientIp(httpRequest),
                    getUserAgent(httpRequest)
            );

            throw e;
        }
    }

    @GetMapping("me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        String accessToken = authorization.substring(7);

        LoginMemberResponse loginMemberResponse = loginService.getLoginMember(accessToken);

        return ResponseEntity.ok(loginMemberResponse);
    }

    @PutMapping("profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "\uD504\uB85C\uD544\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
                        "member", loginService.updateProfile(authorizationHeader, request)
                )
        );
    }

    @PostMapping("password/change")
    public ResponseEntity<?> changePassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody PasswordChangeRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        loginService.changePassword(authorizationHeader, request);

        loginAuditService.record(
                loginMember.getMemberId(),
                loginMember.getEmail(),
                null,
                "PASSWORD_CHANGE",
                true,
                null,
                getClientIp(httpRequest),
                getUserAgent(httpRequest)
        );

        ResponseCookie deleteCookie = jwtService.createDeleteRefreshCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(
                        Map.of(
                                "success", true,
                                "message", "\uBE44\uBC00\uBC88\uD638\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694."
                        )
                );
    }

    @PostMapping("password/setup")
    public ResponseEntity<?> setupPassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody PasswordChangeRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        loginService.setupPassword(authorizationHeader, request);

        loginAuditService.record(
                loginMember.getMemberId(),
                loginMember.getEmail(),
                null,
                "PASSWORD_SETUP",
                true,
                null,
                getClientIp(httpRequest),
                getUserAgent(httpRequest)
        );

        ResponseCookie deleteCookie = jwtService.createDeleteRefreshCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(
                        Map.of(
                                "success", true,
                                "message", "\uBE44\uBC00\uBC88\uD638\uAC00 \uC124\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694."
                        )
                );
    }

    @PostMapping("recovery/email/send-code")
    public ResponseEntity<?> sendFindEmailCode(
            @RequestBody FindEmailCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        EmailAuthSendResult result = accountRecoveryService.sendFindEmailCode(request, getClientIp(httpRequest));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "\uAC00\uC785 \uC774\uBA54\uC77C\uB85C \uC778\uC99D\uBC88\uD638\uB97C \uBC1C\uC1A1\uD588\uC2B5\uB2C8\uB2E4. 3\uBD84 \uC548\uC5D0 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        response.put("email", result.getEmail());
        if (devReturnAuthCode) {
            response.put("authCode", result.getAuthCode());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("recovery/email/verify")
    public ResponseEntity<?> verifyFindEmailCode(@RequestBody FindEmailVerifyRequest request) {
        FindEmailResult result = accountRecoveryService.verifyFindEmailCode(request);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "\uAC00\uC785 \uACC4\uC815\uC744 \uCC3E\uC558\uC2B5\uB2C8\uB2E4.",
                        "email", result.getEmail(),
                        "kakaoLinked", result.isKakaoLinked(),
                        "googleLinked", result.isGoogleLinked(),
                        "naverLinked", result.isNaverLinked()
                )
        );
    }

    @PostMapping("recovery/password/send-code")
    public ResponseEntity<?> sendPasswordResetCode(
            @RequestBody PasswordResetCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        EmailAuthSendResult result = accountRecoveryService.sendPasswordResetCode(request, getClientIp(httpRequest));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uC774\uBA54\uC77C \uC778\uC99D\uBC88\uD638\uB97C \uBC1C\uC1A1\uD588\uC2B5\uB2C8\uB2E4. 3\uBD84 \uC548\uC5D0 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        response.put("email", result.getEmail());
        if (devReturnAuthCode) {
            response.put("authCode", result.getAuthCode());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("recovery/password/verify")
    public ResponseEntity<?> verifyPasswordResetCode(@RequestBody PasswordResetVerifyRequest request) {
        accountRecoveryService.verifyPasswordResetCode(request);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "\uC774\uBA54\uC77C \uC778\uC99D\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC0C8 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694."
                )
        );
    }

    @PostMapping("recovery/password/reset")
    public ResponseEntity<?> resetPassword(
            @RequestBody PasswordResetRequest request,
            HttpServletRequest httpRequest
    ) {
        accountRecoveryService.resetPassword(request);

        loginAuditService.record(
                null,
                request == null || request.getEmail() == null ? null : request.getEmail().trim().toLowerCase(),
                null,
                "PASSWORD_RESET",
                true,
                null,
                getClientIp(httpRequest),
                getUserAgent(httpRequest)
        );

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "\uBE44\uBC00\uBC88\uD638\uAC00 \uC7AC\uC124\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694."
                )
        );
    }

    @PostMapping("withdraw/email/send")
    public ResponseEntity<?> sendWithdrawEmailCode(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            HttpServletRequest httpRequest
    ) {
        EmailAuthSendResult result = loginService.sendWithdrawEmailAuthCode(authorizationHeader, getClientIp(httpRequest));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "\uD0C8\uD1F4 \uD655\uC778 \uC774\uBA54\uC77C \uC778\uC99D\uBC88\uD638\uB97C \uBC1C\uC1A1\uD588\uC2B5\uB2C8\uB2E4. 3\uBD84 \uC548\uC5D0 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        response.put("email", result.getEmail());
        if (devReturnAuthCode) {
            response.put("authCode", result.getAuthCode());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("withdraw/email/verify")
    public ResponseEntity<?> verifyWithdrawEmailCode(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody WithdrawRequest request
    ) {
        loginService.verifyWithdrawEmailAuthCode(authorizationHeader, request.getAuthCode());

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "\uD0C8\uD1F4 \uC774\uBA54\uC77C \uC778\uC99D\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
                )
        );
    }

    @PostMapping("withdraw")
    public ResponseEntity<?> withdraw(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody WithdrawRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginMemberResponse loginMember = loginService.getLoginMemberByHeader(authorizationHeader);
        loginService.withdraw(authorizationHeader, request);

        loginAuditService.record(
                loginMember.getMemberId(),
                loginMember.getEmail(),
                null,
                "WITHDRAW",
                true,
                null,
                getClientIp(httpRequest),
                getUserAgent(httpRequest)
        );

        ResponseCookie deleteCookie = jwtService.createDeleteRefreshCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(
                        Map.of(
                                "success", true,
                                "message", "\uD68C\uC6D0 \uD0C8\uD1F4\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
                        )
                );
    }

    @GetMapping("member/{memberId}")
    public ResponseEntity<?> getMemberProfile(@PathVariable("memberId") Long memberId) {
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "member", loginService.getMemberById(memberId)
                )
        );
    }
    @PostMapping("follow/{memberId}")
    public ResponseEntity<FollowResponse> toggleFollow(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("memberId") Long memberId
    ) {
        return ResponseEntity.ok(loginService.toggleFollow(authHeader, memberId));
    }
    @GetMapping("follow/status/{memberId}")
    public ResponseEntity<FollowCheckResponse> getFollowStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("memberId") Long memberId
    ) {
        return ResponseEntity.ok(loginService.getFollowStatus(authHeader, memberId));
    }

    @GetMapping("follow/followers/{memberId}")
    public ResponseEntity<List<FollowItemResponse>> getFollowers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("memberId") Long memberId
    ) {
        return ResponseEntity.ok(loginService.getFollowerList(authHeader, memberId));
    }

    @GetMapping("follow/following/{memberId}")
    public ResponseEntity<List<FollowItemResponse>> getFollowing(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("memberId") Long memberId
    ) {
        return ResponseEntity.ok(loginService.getFollowingList(authHeader, memberId));
    }
    @PostMapping("logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (jwtService.getRefreshCookieName().equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            LoginMemberResponse auditMember = getAuditMemberFromRefreshToken(refreshToken);

            try {
                loginService.logout(refreshToken);
                loginAuditService.record(
                        getAuditMemberId(auditMember),
                        getAuditMemberEmail(auditMember),
                        null,
                        "LOGOUT",
                        true,
                        null,
                        getClientIp(request),
                        getUserAgent(request)
                );
            } catch (AuthException | IllegalArgumentException e) {
                loginAuditService.record(
                        getAuditMemberId(auditMember),
                        getAuditMemberEmail(auditMember),
                        null,
                        "LOGOUT",
                        false,
                        getRefreshFailReason(e, auditMember),
                        getClientIp(request),
                        getUserAgent(request)
                );
            }
        }

        ResponseCookie deleteCookie = jwtService.createDeleteRefreshCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(
                        Map.of(
                                "success", true,
                                "message", "\uB85C\uADF8\uC544\uC6C3\uD558\uC600\uC2B5\uB2C8\uB2E4."
                        )
                );
    }

    @PostMapping("logout/all")
    public ResponseEntity<?> logoutAllDevices(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            HttpServletRequest request
    ) {
        LoginMemberResponse loginMember = loginService.logoutAllDevices(authorizationHeader);

        loginAuditService.record(
                loginMember.getMemberId(),
                loginMember.getEmail(),
                null,
                "LOGOUT_ALL",
                true,
                null,
                getClientIp(request),
                getUserAgent(request)
        );

        ResponseCookie deleteCookie = jwtService.createDeleteRefreshCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(
                        Map.of(
                                "success", true,
                                "message", "\uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uB85C\uADF8\uC544\uC6C3\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
                        )
                );
    }

    @PostMapping("refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (jwtService.getRefreshCookieName().equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        LoginResult result;
        LoginMemberResponse auditMember = getAuditMemberFromRefreshToken(refreshToken);

        try {
            result = loginService.refreshAccessToken(refreshToken);
            loginAuditService.recordRefreshSuccess(
                    result.getMember().getMemberId(),
                    result.getMember().getEmail(),
                    getClientIp(request),
                    getUserAgent(request)
            );
        } catch (AuthException | IllegalArgumentException | IllegalStateException e) {
            loginAuditService.record(
                    getAuditMemberId(auditMember),
                    getAuditMemberEmail(auditMember),
                    null,
                    "REFRESH_FAIL",
                    false,
                    getRefreshFailReason(e, auditMember),
                    getClientIp(request),
                    getUserAgent(request)
            );

            throw e;
        }
        LoginResponse response = new LoginResponse(
                true,
                "\uD1A0\uD070 \uC7AC\uBC1C\uAE09 \uC131\uACF5",
                result.getAccessToken(),
                result.getMember()
        );
        ResponseCookie refreshCookie = jwtService.createRefreshCookie(result.getRefreshToken(), result.isRemember());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(response);
    }
}
