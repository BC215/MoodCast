package com.moodcast.member.service;

import com.moodcast.common.exception.AuthException;
import com.moodcast.common.exception.AccountSuspendedException;
import com.moodcast.member.dao.LoginDao;
import com.moodcast.member.dao.PasswordHistoryDao;
import com.moodcast.member.dto.follow.FollowCheckResponse;
import com.moodcast.member.dto.follow.FollowItemResponse;
import com.moodcast.member.dto.follow.FollowResponse;
import com.moodcast.member.dto.follow.MentionCandidateResponse;
import com.moodcast.member.dto.login.LoginMemberResponse;
import com.moodcast.member.dto.login.LoginRequest;
import com.moodcast.member.dto.login.LoginResult;
import com.moodcast.member.dto.login.RefreshTokenInfo;
import com.moodcast.member.dto.login.UpdateProfileRequest;
import com.moodcast.member.dto.password.PasswordChangeRequest;
import com.moodcast.member.dto.signup.EmailAuthSendResult;
import com.moodcast.member.dto.withdraw.WithdrawRequest;
import com.moodcast.member.vo.Member;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class LoginService {
    private static final String WITHDRAW_PURPOSE = "WITHDRAW";
    private static final String EMAIL_TARGET_TYPE = "EMAIL";
    // 관리자 기능 담당 작업(문건우): 정지 해제 예정일 안내 계산은 서비스 기준 시간인 Asia/Seoul로 맞춥니다.
    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[?!@#$%^&*])[A-Za-z\\d?!@#$%^&*]{8,20}$");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Autowired
    private LoginDao loginDao;

    @Autowired
    private PasswordHistoryDao passwordHistoryDao;

    @Autowired
    private MemberValidationService memberValidationService;

    @Autowired
    private RefreshTokenRedisService refreshTokenRedisService;

    @Autowired
    private LoginAttemptRedisService loginAttemptRedisService;

    @Autowired
    private AuthCodeRedisService authCodeRedisService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Value("${app.dev-return-auth-code:false}")
    private boolean devReturnAuthCode;

    private String createAuthCode() {
        int number = SECURE_RANDOM.nextInt(900000) + 100000;
        return String.valueOf(number);
    }
    private String checkPasswordInput(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        return password;
    }
    private void checkNewPassword(String newPassword, String newPasswordConfirm) {
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("\uC0C8 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        if (!PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new IllegalArgumentException("\uBE44\uBC00\uBC88\uD638\uB294 \uC601\uBB38, \uC22B\uC790, \uD2B9\uC218\uBB38\uC790\uB97C \uD3EC\uD568\uD55C 8~20\uC790\uC785\uB2C8\uB2E4.");
        }

        if (newPasswordConfirm == null || newPasswordConfirm.trim().isEmpty()) {
            throw new IllegalArgumentException("\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        if (!newPassword.equals(newPasswordConfirm)) {
            throw new IllegalArgumentException("\uC0C8 \uBE44\uBC00\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
        }
    }
    public void checkLoginAllowed(Member member) {
        if ("SUSPENDED".equals(member.getStatus())) {
            throw buildAccountSuspendedException(member);
        }

        if ("WITHDRAW".equals(member.getStatus()) || member.getDeletedAt() != null) {
            throw new IllegalArgumentException("\uD0C8\uD1F4 \uCC98\uB9AC\uB41C \uACC4\uC815\uC785\uB2C8\uB2E4. \uB2E4\uB978 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694.");
        }

        if (!Integer.valueOf(1).equals(member.getEmailVerified())) {
            throw new IllegalArgumentException("\uC774\uBA54\uC77C \uC778\uC99D\uC774 \uC644\uB8CC\uB418\uC9C0 \uC54A\uC740 \uACC4\uC815\uC785\uB2C8\uB2E4.");
        }

    }

    /*
     * 관리자 기능 담당 작업(문건우): 관리자 제재 상태인 회원의 로그인 차단 사유를
     * 문자열 하나가 아니라 일시/영구 정지 정보로 내려주기 위한 최소 보완입니다.
     */
    private AccountSuspendedException buildAccountSuspendedException(Member member) {
        LocalDateTime suspendedUntil = member.getSuspendedUntil();

        if (suspendedUntil == null) {
            return new AccountSuspendedException(
                    "영구 정지된 계정입니다.",
                    "PERMANENT",
                    null,
                    null
            );
        }

        LocalDate today = LocalDate.now(KOREA_ZONE);
        LocalDate releaseDate = suspendedUntil.toLocalDate();
        long suspendDays = Math.max(0L, ChronoUnit.DAYS.between(today, releaseDate));

        return new AccountSuspendedException(
                "계정이 일시 정지되었습니다.",
                "TEMPORARY",
                suspendDays,
                suspendedUntil.toString()
        );
    }
    private String getLoginMemberEmail(String authorizationHeader) {
        Long memberId = getMemberIdFromHeader(authorizationHeader);
        Member member = loginDao.findMemberById(memberId);

        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        checkLoginAllowed(member);

        return memberValidationService.normalizeEmail(member.getEmail());
    }

    private void checkWithdrawAuthCode(String email, String authCode) {
        if (authCode == null || authCode.trim().isEmpty()) {
            throw new IllegalArgumentException("\uC778\uC99D\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        authCode = authCode.trim();
        if (!authCode.matches("^[0-9]{6}$")) {
            throw new IllegalArgumentException("\uC778\uC99D\uBC88\uD638\uB294 6\uC790\uB9AC \uC22B\uC790\uC785\uB2C8\uB2E4.");
        }

        String savedHashCode = authCodeRedisService.getAuthCodeHash(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
        if (savedHashCode == null || savedHashCode.trim().isEmpty()) {
            throw new IllegalArgumentException("\uC778\uC99D\uBC88\uD638 \uC2DC\uAC04\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC694\uCCAD\uD574\uC8FC\uC138\uC694.");
        }

        long currentAttemptCount = authCodeRedisService.getAttemptCount(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
        if (currentAttemptCount >= 5) {
            throw new IllegalArgumentException("\uC778\uC99D\uBC88\uD638 \uC785\uB825 \uD69F\uC218\uB97C \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4. \uC778\uC99D\uBC88\uD638\uB97C \uB2E4\uC2DC \uC694\uCCAD\uD574\uC8FC\uC138\uC694.");
        }

        if (!passwordEncoder.matches(authCode, savedHashCode)) {
            Long attemptCount = authCodeRedisService.increaseAttempt(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
            long remainingCount = Math.max(0, 5 - attemptCount);
            throw new IllegalArgumentException("\uC778\uC99D\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB0A8\uC740 \uC2DC\uB3C4 \uD69F\uC218: " + remainingCount + "\uD68C");
        }

        authCodeRedisService.markVerified(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
    }

    private LoginMemberResponse toLoginMemberResponse(Member member) {
        return new LoginMemberResponse(
                member.getMemberId(),
                member.getEmail(),
                member.getName(),
                member.getNickname(),
                member.getProfileImageUrl(),
                member.getBio(),
                member.getRole(),
                member.getCreatedAt()
        );
    }
    private void failLogin(String email) {
        loginAttemptRedisService.recordFailure(email);

        throw new IllegalArgumentException("\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    }

    @Transactional
    public LoginResult login(LoginRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("\uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        String email = memberValidationService.normalizeEmail(request.getEmail());
        String password = checkPasswordInput(request.getPassword());

        loginAttemptRedisService.checkLocked(email);

        Member member = loginDao.findMemberByEmail(email);
        String passwordHash = loginDao.findPasswordHashByEmail(email);

        if (member == null || passwordHash == null || passwordHash.trim().isEmpty()) {
            failLogin(email);
        }

        boolean matches = passwordEncoder.matches(password, passwordHash);
        if (!matches) {
            failLogin(email);
        }

        loginAttemptRedisService.clear(email);

        checkLoginAllowed(member);

        int result = loginDao.updateLastLoginAt(member.getMemberId());
        if (result <= 0) {
            throw new IllegalStateException("\uB85C\uADF8\uC778 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }

        return issueLoginTokens(member, Boolean.TRUE.equals(request.getRemember()));
    }

    public LoginResult issueLoginTokens(Member member) {
        return issueLoginTokens(member, true);
    }

    public LoginResult issueLoginTokens(Member member, boolean remember) {
        if (member == null || member.getMemberId() == null) {
            throw new IllegalArgumentException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        String accessToken = jwtService.createAccessToken(member);
        String tokenId = UUID.randomUUID().toString();
        String refreshToken = jwtService.createRefreshToken(member, tokenId, remember);

        refreshTokenRedisService.saveRefreshToken(
                member.getMemberId(),
                tokenId,
                refreshToken,
                jwtService.getRefreshTokenMaxAgeSeconds()
        );

        LoginMemberResponse loginMemberResponse = toLoginMemberResponse(member);

        return new LoginResult(
                accessToken,
                refreshToken,
                loginMemberResponse,
                remember
        );
    }


    public LoginMemberResponse getLoginMember(String accessToken) {
        if (accessToken == null || accessToken.trim().isEmpty()) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        Long memberId = jwtService.getMemberIdFromAccessToken(accessToken);
        Member member = loginDao.findMemberById(memberId);

        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        checkLoginAllowed(member);

        LoginMemberResponse loginMemberResponse = toLoginMemberResponse(member);

        return loginMemberResponse;
    }

    public LoginMemberResponse getLoginMemberByHeader(String authorizationHeader) {
        String accessToken = extractAccessToken(authorizationHeader);

        return getLoginMember(accessToken);
    }
    @Transactional
    public void changePassword(String authorizationHeader, PasswordChangeRequest request) {
        Long memberId = getMemberIdFromHeader(authorizationHeader);
        Member member = loginDao.findMemberById(memberId);

        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        checkLoginAllowed(member);

        if (request == null) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        String currentPassword = checkPasswordInput(request.getCurrentPassword());
        checkNewPassword(request.getNewPassword(), request.getNewPasswordConfirm());

        String currentPasswordHash = loginDao.findPasswordHashByMemberId(memberId);

        if (currentPasswordHash == null || currentPasswordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        if (!passwordEncoder.matches(currentPassword, currentPasswordHash)) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), currentPasswordHash)) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        List<String> recentPasswordHashes = passwordHistoryDao.findRecentPasswordHashes(memberId, 3);
        for (String recentPasswordHash : recentPasswordHashes) {
            if (passwordEncoder.matches(request.getNewPassword(), recentPasswordHash)) {
                throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
            }
        }

        String newPasswordHash = passwordEncoder.encode(request.getNewPassword());

        int updateResult = loginDao.updatePasswordHash(memberId, newPasswordHash);
        if (updateResult != 1) {
            throw new IllegalStateException("\uC694\uCCAD \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }

        passwordHistoryDao.insertPasswordHistory(memberId, currentPasswordHash);
        refreshTokenRedisService.deleteAllRefreshTokens(memberId);
    }

    @Transactional
    public void setupPassword(String authorizationHeader, PasswordChangeRequest request) {
        Long memberId = getMemberIdFromHeader(authorizationHeader);
        Member member = loginDao.findMemberById(memberId);

        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        checkLoginAllowed(member);

        if (request == null) {
            throw new IllegalArgumentException("\uBE44\uBC00\uBC88\uD638 \uC124\uC815 \uC815\uBCF4\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        checkNewPassword(request.getNewPassword(), request.getNewPasswordConfirm());

        String currentPasswordHash = loginDao.findPasswordHashByMemberId(memberId);
        if (currentPasswordHash != null && !currentPasswordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("\uC774\uBBF8 \uBE44\uBC00\uBC88\uD638\uAC00 \uC124\uC815\uB41C \uACC4\uC815\uC785\uB2C8\uB2E4. \uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD\uC744 \uC774\uC6A9\uD574\uC8FC\uC138\uC694.");
        }

        String newPasswordHash = passwordEncoder.encode(request.getNewPassword());
        int updateResult = loginDao.updatePasswordHash(memberId, newPasswordHash);
        if (updateResult != 1) {
            throw new IllegalStateException("\uBE44\uBC00\uBC88\uD638 \uC124\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }

        refreshTokenRedisService.deleteAllRefreshTokens(memberId);
    }
    @Transactional
    public EmailAuthSendResult sendWithdrawEmailAuthCode(String authorizationHeader, String clientIp) {
        String email = getLoginMemberEmail(authorizationHeader);

        authCodeRedisService.checkCooldown(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
        authCodeRedisService.checkAndIncreaseIpSendCount(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, clientIp);
        authCodeRedisService.checkAndIncreaseSendCount(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);

        String authCode = createAuthCode();
        authCodeRedisService.saveAuthCode(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email, passwordEncoder.encode(authCode));

        try {
            emailService.sendWithdrawAuthCode(email, authCode);
        } catch (MailException e) {
            authCodeRedisService.clearAuth(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
            throw new IllegalStateException("\uC694\uCCAD \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }

        if (devReturnAuthCode) {
            System.out.println("Withdraw email auth code: " + authCode);
        }

        return new EmailAuthSendResult(email, authCode);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void verifyWithdrawEmailAuthCode(String authorizationHeader, String authCode) {
        String email = getLoginMemberEmail(authorizationHeader);
        checkWithdrawAuthCode(email, authCode);
    }
    @Transactional
    public void withdraw(String authorizationHeader, WithdrawRequest request) {
        Long memberId = getMemberIdFromHeader(authorizationHeader);
        Member member = loginDao.findMemberById(memberId);

        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        checkLoginAllowed(member);

        if (request == null) {
            throw new IllegalArgumentException("\uD68C\uC6D0 \uD0C8\uD1F4 \uC815\uBCF4\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        if (!"\uD0C8\uD1F4\uD569\uB2C8\uB2E4.".equals(request.getConfirmText())) {
            throw new IllegalArgumentException("\uD0C8\uD1F4 \uD655\uC778 \uBB38\uAD6C\uB97C '\uD0C8\uD1F4\uD569\uB2C8\uB2E4.'\uB85C \uC815\uD655\uD788 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
        }

        String email = memberValidationService.normalizeEmail(member.getEmail());
        if (!authCodeRedisService.isVerified(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email)) {
            throw new IllegalArgumentException("\uC774\uBA54\uC77C \uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uC778\uC99D\uBC88\uD638 \uD655\uC778 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
        }

        int result = loginDao.withdrawMember(memberId);
        if (result != 1) {
            throw new IllegalStateException("\uD68C\uC6D0 \uD0C8\uD1F4 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }

        authCodeRedisService.clearAuth(WITHDRAW_PURPOSE, EMAIL_TARGET_TYPE, email);
        refreshTokenRedisService.deleteAllRefreshTokens(memberId);
    }

    public LoginMemberResponse getMemberById(Long memberId) {
        Member member = loginDao.findMemberById(memberId);
        if (member == null) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }
        return toLoginMemberResponse(member);
    }

    public Long getMemberIdFromHeaderOptional(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        String accessToken = authHeader.substring(7).trim();
        if (accessToken.isEmpty()) {
            return null;
        }
        try {
            return jwtService.getMemberIdFromAccessToken(accessToken);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        } catch (AuthException e) {
            return null;
        }
    }

    @Transactional
    public LoginMemberResponse updateProfile(String authorizationHeader, UpdateProfileRequest request) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        String accessToken = authorizationHeader.substring(7).trim();
        if (accessToken.isEmpty()) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        if (request == null || request.getNickname() == null || request.getNickname().trim().isEmpty()) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        Long memberId = jwtService.getMemberIdFromAccessToken(accessToken);
        Member member = loginDao.findMemberById(memberId);

        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        checkLoginAllowed(member);

        loginDao.updateMemberProfile(memberId, request.getNickname().trim(), request.getBio(), request.getProfileImageUrl());

        Member updated = loginDao.findMemberById(memberId);
        if (updated == null) {
            throw new IllegalStateException("\uC694\uCCAD \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }

        return toLoginMemberResponse(updated);
    }

    @Transactional
    public FollowResponse toggleFollow(String authHeader, Long followingId) {
        Long followerId = getMemberIdFromHeader(authHeader);
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        boolean isFollowing = loginDao.isFollowing(followerId, followingId) > 0;
        if (isFollowing) {
            loginDao.unfollow(followerId, followingId);
            return new FollowResponse(true, "\uD314\uB85C\uC6B0\uB97C \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4.", false);
        } else {
            loginDao.follow(followerId, followingId);
            return new FollowResponse(true, "\uD314\uB85C\uC6B0\uD588\uC2B5\uB2C8\uB2E4.", true);
        }
    }

    public FollowCheckResponse getFollowStatus(String authHeader, Long targetMemberId) {
        Long currentMemberId = 0L;
        try {
            currentMemberId = getMemberIdFromHeader(authHeader);
        } catch (Exception ignored) {}

        boolean following = false;
        if (currentMemberId > 0 && !currentMemberId.equals(targetMemberId)) {
            following = loginDao.isFollowing(currentMemberId, targetMemberId) > 0;
        }

        long followerCount = loginDao.countFollowers(targetMemberId);
        long followingCount = loginDao.countFollowing(targetMemberId);
        long postCount = loginDao.countPosts(targetMemberId);
        long savedCount = loginDao.countSavedPosts(targetMemberId);
        long likes = loginDao.countPostLikes(targetMemberId);
        long comments = loginDao.countPostComments(targetMemberId);
        long saves = loginDao.countPostSaves(targetMemberId);
        long totalReactions = likes + comments + saves;
        int emotionEmpathyRate = totalReactions == 0 ? 0 : (int) Math.round((double) likes * 100 / totalReactions);
        long weeklyReactions = loginDao.countWeeklyPostReactions(targetMemberId);

        return new FollowCheckResponse(true, following, followerCount, followingCount, postCount, savedCount, emotionEmpathyRate, weeklyReactions);
    }

    public List<FollowItemResponse> getFollowerList(String authHeader, Long targetId) {
        Long loginId = 0L;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                loginId = getMemberIdFromHeader(authHeader);
            } catch (Exception ignored) {
            }
        }
        return loginDao.getFollowerList(targetId, loginId);
    }

    public List<FollowItemResponse> getFollowingList(String authHeader, Long targetId) {
        Long loginId = 0L;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                loginId = getMemberIdFromHeader(authHeader);
            } catch (Exception ignored) {
            }
        }
        return loginDao.getFollowingList(targetId, loginId);
    }

    public List<MentionCandidateResponse> getMentionCandidates(Long memberId, String keyword) {
        if (memberId == null) {
            throw new IllegalArgumentException("\uC694\uCCAD \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        }

        String normalizedKeyword = keyword == null ? null : keyword.trim();
        if (normalizedKeyword != null && normalizedKeyword.isEmpty()) {
            normalizedKeyword = null;
        }

        return loginDao.getMentionCandidates(memberId, normalizedKeyword);
    }

    private Long getMemberIdFromHeader(String authHeader) {
        String token = extractAccessToken(authHeader);

        return jwtService.getMemberIdFromAccessToken(token);
    }

    private String extractAccessToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }

        String token = authHeader.substring(7).trim();

        if (token.isEmpty()) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }
        return token;
    }
    public LoginResult refreshAccessToken(String refreshToken) {
        RefreshTokenInfo refreshTokenInfo = jwtService.getRefreshTokenInfo(refreshToken);
        Long memberId = refreshTokenInfo.getMemberId();
        String tokenId = refreshTokenInfo.getTokenId();
        boolean remember = refreshTokenInfo.isRemember();
        if (!refreshTokenRedisService.matchesRefreshToken(memberId, tokenId, refreshToken)) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }
        Member member = loginDao.findMemberById(memberId);
        if (member == null) {
            throw new AuthException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }
        checkLoginAllowed(member);

        // 여러 탭이 동시에 refresh해도 한쪽이 바로 튕기지 않도록 기존 토큰은 아주 짧게만 유지함
        refreshTokenRedisService.expireRefreshTokenSoon(memberId, tokenId, Duration.ofSeconds(10));

        // 새 로그인 세션 tokenId 생성
        String newTokenId = UUID.randomUUID().toString();
        String newAccessToken = jwtService.createAccessToken(member);
        String newRefreshToken = jwtService.createRefreshToken(member, newTokenId, remember);
        refreshTokenRedisService.saveRefreshToken(
                member.getMemberId(),
                newTokenId,
                newRefreshToken,
                jwtService.getRefreshTokenMaxAgeSeconds()
        );

        LoginMemberResponse loginMemberResponse = toLoginMemberResponse(member);

        return new LoginResult(
                newAccessToken,
                newRefreshToken,
                loginMemberResponse,
                remember
        );
    }

    public void logout(String refreshToken) {
        RefreshTokenInfo refreshTokenInfo = jwtService.getRefreshTokenInfo(refreshToken);
        refreshTokenRedisService.deleteRefreshToken(refreshTokenInfo.getMemberId(), refreshTokenInfo.getTokenId());
    }

    public LoginMemberResponse logoutAllDevices(String authorizationHeader) {
        LoginMemberResponse loginMember = getLoginMemberByHeader(authorizationHeader);
        refreshTokenRedisService.deleteAllRefreshTokens(loginMember.getMemberId());
        return loginMember;
    }
}
