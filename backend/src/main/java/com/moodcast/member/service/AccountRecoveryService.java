package com.moodcast.member.service;

import com.moodcast.member.dao.LoginDao;
import com.moodcast.member.dao.OAuthDao;
import com.moodcast.member.dao.PasswordHistoryDao;
import com.moodcast.member.dto.recovery.FindEmailCodeRequest;
import com.moodcast.member.dto.recovery.FindEmailResult;
import com.moodcast.member.dto.recovery.FindEmailVerifyRequest;
import com.moodcast.member.dto.recovery.PasswordResetCodeRequest;
import com.moodcast.member.dto.recovery.PasswordResetRequest;
import com.moodcast.member.dto.recovery.PasswordResetVerifyRequest;
import com.moodcast.member.dto.signup.EmailAuthSendResult;
import com.moodcast.member.vo.Member;
import org.springframework.mail.MailException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class AccountRecoveryService {
    private static final String FIND_EMAIL_PURPOSE = "FIND_EMAIL";
    private static final String RESET_PASSWORD_PURPOSE = "RESET_PASSWORD";
    private static final String EMAIL_TARGET_TYPE = "EMAIL";

    private static final Pattern NAME_PATTERN = Pattern.compile("^[가-힣]{2,10}$");
    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[?!@#$%^&*])[A-Za-z\\d?!@#$%^&*]{8,20}$");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final LoginDao loginDao;
    private final OAuthDao oAuthDao;
    private final PasswordHistoryDao passwordHistoryDao;
    private final MemberValidationService memberValidationService;
    private final AuthCodeRedisService authCodeRedisService;
    private final RefreshTokenRedisService refreshTokenRedisService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.dev-return-auth-code:false}")
    private boolean devReturnAuthCode;

    public AccountRecoveryService(
            LoginDao loginDao,
            OAuthDao oAuthDao,
            PasswordHistoryDao passwordHistoryDao,
            MemberValidationService memberValidationService,
            AuthCodeRedisService authCodeRedisService,
            RefreshTokenRedisService refreshTokenRedisService,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.loginDao = loginDao;
        this.oAuthDao = oAuthDao;
        this.passwordHistoryDao = passwordHistoryDao;
        this.memberValidationService = memberValidationService;
        this.authCodeRedisService = authCodeRedisService;
        this.refreshTokenRedisService = refreshTokenRedisService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    private String normalizeName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("이름을 입력해주세요.");
        }

        name = name.trim();

        if (!NAME_PATTERN.matcher(name).matches()) {
            throw new IllegalArgumentException("이름은 한글 2~10자로 입력해주세요.");
        }

        return name;
    }

    private String createAuthCode() {
        int number = SECURE_RANDOM.nextInt(900000) + 100000;
        return String.valueOf(number);
    }

    private void checkRecoverableMember(Member member, String notFoundMessage) {
        if (member == null) {
            throw new IllegalArgumentException(notFoundMessage);
        }

        if ("SUSPENDED".equals(member.getStatus())) {
            throw new IllegalArgumentException("현재 이용이 제한된 계정입니다. 계정 상태를 확인해주세요.");
        }

        if ("WITHDRAW".equals(member.getStatus()) || member.getDeletedAt() != null) {
            throw new IllegalArgumentException("탈퇴 처리된 계정입니다. 다른 계정으로 로그인해주세요.");
        }

        if (!Integer.valueOf(1).equals(member.getEmailVerified())) {
            throw new IllegalArgumentException("인증이 완료되지 않은 계정입니다. 회원가입 정보를 다시 확인해주세요.");
        }
    }

    private void checkAuthCode(String purpose, String targetType, String targetValue, String authCode) {
        if (authCode == null || authCode.trim().isEmpty()) {
            throw new IllegalArgumentException("인증번호를 입력해주세요.");
        }

        authCode = authCode.trim();

        if (!authCode.matches("^[0-9]{6}$")) {
            throw new IllegalArgumentException("인증번호는 숫자 6자리입니다.");
        }

        String savedHashCode = authCodeRedisService.getAuthCodeHash(purpose, targetType, targetValue);
        if (savedHashCode == null) {
            throw new IllegalArgumentException("인증번호가 만료되었습니다. 인증번호를 다시 요청해주세요.");
        }

        long currentAttemptCount = authCodeRedisService.getAttemptCount(purpose, targetType, targetValue);
        if (currentAttemptCount >= 5) {
            throw new IllegalArgumentException("인증번호 입력 횟수를 초과했습니다. 인증번호를 다시 요청해주세요.");
        }

        if (!passwordEncoder.matches(authCode, savedHashCode)) {
            Long attemptCount = authCodeRedisService.increaseAttempt(purpose, targetType, targetValue);

            if (attemptCount >= 5) {
                throw new IllegalArgumentException("인증번호 입력 횟수를 초과했습니다. 인증번호를 다시 요청해주세요.");
            }

            throw new IllegalArgumentException("인증번호가 올바르지 않습니다.");
        }

        authCodeRedisService.markVerified(purpose, targetType, targetValue);
    }

    private void checkNewPassword(String newPassword, String newPasswordConfirm) {
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("새 비밀번호를 입력해주세요.");
        }

        if (!PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new IllegalArgumentException("비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자입니다.");
        }

        if (newPasswordConfirm == null || newPasswordConfirm.trim().isEmpty()) {
            throw new IllegalArgumentException("새 비밀번호 확인을 입력해주세요.");
        }

        if (!newPassword.equals(newPasswordConfirm)) {
            throw new IllegalArgumentException("새 비밀번호가 일치하지 않습니다.");
        }
    }

    // 이름과 이메일이 일치하는 계정에 아이디 찾기 인증번호를 발급함
    @Transactional
    public EmailAuthSendResult sendFindEmailCode(FindEmailCodeRequest request, String clientIp) {
        if (request == null) {
            throw new IllegalArgumentException("계정 찾기 정보를 입력해주세요.");
        }

        String name = normalizeName(request.getName());
        String email = memberValidationService.normalizeEmail(request.getEmail());

        Member member = loginDao.findMemberByEmail(email);
        checkRecoverableMember(member, "이름과 이메일이 일치하는 계정을 찾을 수 없습니다.");
        if (!name.equals(member.getName())) {
            throw new IllegalArgumentException("이름과 이메일이 일치하는 계정을 찾을 수 없습니다.");
        }

        authCodeRedisService.checkCooldown(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, email);
        authCodeRedisService.checkAndIncreaseIpSendCount(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, clientIp);
        authCodeRedisService.checkAndIncreaseSendCount(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, email);

        String authCode = createAuthCode();
        authCodeRedisService.saveAuthCode(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, email, passwordEncoder.encode(authCode));

        try {
            emailService.sendAccountRecoveryAuthCode(email, authCode, "아이디 찾기");
        } catch (MailException e) {
            authCodeRedisService.clearAuth(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, email);
            throw new IllegalStateException("이메일 인증번호를 발송하지 못했습니다. 이메일 주소를 확인하거나 잠시 후 다시 시도해주세요.");
        }

        if (devReturnAuthCode) {
            System.out.println("아이디 찾기 이메일 인증번호: " + authCode);
        }
        return new EmailAuthSendResult(email, authCode);
    }

    // 아이디 찾기 인증번호가 맞으면 전체 이메일과 소셜 연동 여부를 반환함
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public FindEmailResult verifyFindEmailCode(FindEmailVerifyRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("계정 찾기 정보를 입력해주세요.");
        }

        String name = normalizeName(request.getName());
        String email = memberValidationService.normalizeEmail(request.getEmail());

        Member member = loginDao.findMemberByEmail(email);
        checkRecoverableMember(member, "이름과 이메일이 일치하는 계정을 찾을 수 없습니다.");
        if (!name.equals(member.getName())) {
            throw new IllegalArgumentException("이름과 이메일이 일치하는 계정을 찾을 수 없습니다.");
        }

        checkAuthCode(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, email, request.getAuthCode());

        authCodeRedisService.clearAuth(FIND_EMAIL_PURPOSE, EMAIL_TARGET_TYPE, email);

        boolean kakaoLinked = oAuthDao.countByMemberIdAndProvider(member.getMemberId(), "KAKAO") > 0;
        boolean googleLinked = oAuthDao.countByMemberIdAndProvider(member.getMemberId(), "GOOGLE") > 0;
        boolean naverLinked = oAuthDao.countByMemberIdAndProvider(member.getMemberId(), "NAVER") > 0;

        return new FindEmailResult(member.getEmail(), kakaoLinked, googleLinked, naverLinked);
    }

    // 이메일이 일치하는 일반 계정에 비밀번호 재설정 인증번호를 발급함
    @Transactional
    public EmailAuthSendResult sendPasswordResetCode(PasswordResetCodeRequest request, String clientIp) {
        if (request == null) {
            throw new IllegalArgumentException("비밀번호 재설정 정보를 입력해주세요.");
        }

        String email = memberValidationService.normalizeEmail(request.getEmail());

        Member member = loginDao.findMemberByEmail(email);
        checkRecoverableMember(member, "가입된 이메일을 찾을 수 없습니다.");

        String currentPasswordHash = loginDao.findPasswordHashByMemberId(member.getMemberId());
        if (currentPasswordHash == null || currentPasswordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("소셜 로그인으로 가입한 계정입니다. 로그인 화면에서 연결된 소셜 로그인을 이용해주세요.");
        }

        authCodeRedisService.checkCooldown(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email);
        authCodeRedisService.checkAndIncreaseIpSendCount(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, clientIp);
        authCodeRedisService.checkAndIncreaseSendCount(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email);

        String authCode = createAuthCode();
        authCodeRedisService.saveAuthCode(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email, passwordEncoder.encode(authCode));

        try {
            emailService.sendAccountRecoveryAuthCode(email, authCode, "비밀번호 재설정");
        } catch (MailException e) {
            authCodeRedisService.clearAuth(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email);
            throw new IllegalStateException("이메일 인증번호를 발송하지 못했습니다. 이메일 주소를 확인하거나 잠시 후 다시 시도해주세요.");
        }

        if (devReturnAuthCode) {
            System.out.println("비밀번호 재설정 이메일 인증번호: " + authCode);
        }
        return new EmailAuthSendResult(email, authCode);
    }

    // 비밀번호 재설정 전에 이메일 인증번호를 확인 완료 상태로 바꿈
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void verifyPasswordResetCode(PasswordResetVerifyRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("비밀번호 재설정 정보를 입력해주세요.");
        }

        String email = memberValidationService.normalizeEmail(request.getEmail());

        Member member = loginDao.findMemberByEmail(email);
        checkRecoverableMember(member, "가입된 이메일을 찾을 수 없습니다.");

        String currentPasswordHash = loginDao.findPasswordHashByMemberId(member.getMemberId());
        if (currentPasswordHash == null || currentPasswordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("소셜 로그인으로 가입한 계정입니다. 로그인 화면에서 연결된 소셜 로그인을 이용해주세요.");
        }

        checkAuthCode(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email, request.getAuthCode());
    }

    // 인증 확인이 끝난 계정의 비밀번호를 재설정하고 모든 refresh 세션을 폐기함
    @Transactional
    public void resetPassword(PasswordResetRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("비밀번호 재설정 정보를 입력해주세요.");
        }

        String email = memberValidationService.normalizeEmail(request.getEmail());
        checkNewPassword(request.getNewPassword(), request.getNewPasswordConfirm());

        Member member = loginDao.findMemberByEmail(email);
        checkRecoverableMember(member, "가입된 이메일을 찾을 수 없습니다.");

        String currentPasswordHash = loginDao.findPasswordHashByMemberId(member.getMemberId());
        if (currentPasswordHash == null || currentPasswordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("소셜 로그인으로 가입한 계정입니다. 로그인 화면에서 연결된 소셜 로그인을 이용해주세요.");
        }

        if (!authCodeRedisService.isVerified(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email)) {
            throw new IllegalArgumentException("이메일 인증을 먼저 완료해주세요.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), currentPasswordHash)) {
            throw new IllegalArgumentException("현재 비밀번호와 다른 비밀번호를 사용해주세요.");
        }

        List<String> recentPasswordHashes = passwordHistoryDao.findRecentPasswordHashes(member.getMemberId(), 3);
        for (String recentPasswordHash : recentPasswordHashes) {
            if (passwordEncoder.matches(request.getNewPassword(), recentPasswordHash)) {
                throw new IllegalArgumentException("최근 사용한 비밀번호는 다시 사용할 수 없습니다.");
            }
        }

        int updateResult = loginDao.updatePasswordHash(member.getMemberId(), passwordEncoder.encode(request.getNewPassword()));
        if (updateResult != 1) {
            throw new IllegalStateException("비밀번호 재설정에 실패했습니다.");
        }

        passwordHistoryDao.insertPasswordHistory(member.getMemberId(), currentPasswordHash);
        refreshTokenRedisService.deleteAllRefreshTokens(member.getMemberId());
        authCodeRedisService.clearAuth(RESET_PASSWORD_PURPOSE, EMAIL_TARGET_TYPE, email);
    }
}
