package com.moodcast.member.service;

import com.moodcast.member.dao.LoginDao;
import com.moodcast.member.dao.OAuthDao;
import com.moodcast.member.dao.SignupDao;
import com.moodcast.member.dto.login.LoginResult;
import com.moodcast.member.dto.oauth.KakaoLoginRequest;
import com.moodcast.member.dto.oauth.OAuthLoginResult;
import com.moodcast.member.dto.oauth.PendingSocialSignup;
import com.moodcast.member.dto.oauth.SocialExtraSignupRequest;
import com.moodcast.member.dto.oauth.SocialUserInfo;
import com.moodcast.member.dto.signup.SignupTermsAgreementRequest;
import com.moodcast.member.vo.Member;
import com.moodcast.member.vo.OAuthAccount;
import com.moodcast.member.vo.Terms;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class OAuthService {
    private static final String KAKAO = "KAKAO";
    private static final String GOOGLE = "GOOGLE";
    private static final String NAVER = "NAVER";
    private static final int MAX_PROFILE_IMAGE_URL_LENGTH = 500;
    private static final Pattern NAME_PATTERN = Pattern.compile("^[가-힣]{2,10}$");
    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[가-힣A-Za-z0-9]{2,12}$");

    @Value("${oauth.kakao.client-id:}")
    private String kakaoClientId;

    @Value("${oauth.kakao.client-secret:}")
    private String kakaoClientSecret;

    @Value("${oauth.kakao.allowed-redirect-uris:}")
    private String kakaoAllowedRedirectUris;

    @Value("${oauth.google.client-id:}")
    private String googleClientId;

    @Value("${oauth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${oauth.google.allowed-redirect-uris:}")
    private String googleAllowedRedirectUris;

    @Value("${oauth.naver.client-id:}")
    private String naverClientId;

    @Value("${oauth.naver.client-secret:}")
    private String naverClientSecret;

    @Value("${oauth.naver.allowed-redirect-uris:}")
    private String naverAllowedRedirectUris;

    private final OAuthDao oAuthDao;
    private final LoginDao loginDao;
    private final SignupDao signupDao;
    private final LoginService loginService;
    private final MemberValidationService memberValidationService;
    private final SocialPendingSignupRedisService pendingSignupRedisService;
    private final RestTemplate restTemplate = new RestTemplate();

    public OAuthService(
            OAuthDao oAuthDao,
            LoginDao loginDao,
            SignupDao signupDao,
            LoginService loginService,
            MemberValidationService memberValidationService,
            SocialPendingSignupRedisService pendingSignupRedisService
    ) {
        this.oAuthDao = oAuthDao;
        this.loginDao = loginDao;
        this.signupDao = signupDao;
        this.loginService = loginService;
        this.memberValidationService = memberValidationService;
        this.pendingSignupRedisService = pendingSignupRedisService;
    }

    // 카카오 code로 사용자 정보를 조회하고 기존 연결/신규/이메일 충돌을 분기함
    @Transactional
    public OAuthLoginResult loginWithKakao(KakaoLoginRequest request) {
        return loginWithProvider(KAKAO, requestKakaoUserInfo(request), shouldRemember(request));
    }

    // 구글 code로 사용자 정보를 조회하고 기존 연결/신규/이메일 충돌을 분기함
    @Transactional
    public OAuthLoginResult loginWithGoogle(KakaoLoginRequest request) {
        return loginWithProvider(GOOGLE, requestGoogleUserInfo(request), shouldRemember(request));
    }

    // 네이버 code로 사용자 정보를 조회하고 기존 연결/신규/이메일 충돌을 분기함
    @Transactional
    public OAuthLoginResult loginWithNaver(KakaoLoginRequest request) {
        return loginWithProvider(NAVER, requestNaverUserInfo(request), shouldRemember(request));
    }

    private boolean shouldRemember(KakaoLoginRequest request) {
        return request != null && Boolean.TRUE.equals(request.getRemember());
    }

    private OAuthLoginResult loginWithProvider(String provider, SocialUserInfo socialUserInfo, boolean remember) {
        OAuthAccount connectedAccount = oAuthDao.findByProviderAndProviderUserId(
                provider,
                socialUserInfo.getProviderUserId()
        );

        if (connectedAccount != null) {
            Member member = loginDao.findMemberById(connectedAccount.getMemberId());
            if (member == null) {
                throw new IllegalArgumentException("연결된 회원 정보를 찾을 수 없습니다.");
            }

            loginService.checkLoginAllowed(member);
            oAuthDao.updateLastLoginAt(provider, socialUserInfo.getProviderUserId());
            loginDao.updateLastLoginAt(member.getMemberId());

            return OAuthLoginResult.loginSuccess(loginService.issueLoginTokens(member, remember));
        }

        Member existingMember = loginDao.findMemberByEmail(socialUserInfo.getEmail());
        if (existingMember != null) {
            return OAuthLoginResult.emailConflict(socialUserInfo.getEmail());
        }

        PendingSocialSignup pendingSocialSignup = new PendingSocialSignup();
        pendingSocialSignup.setProvider(provider);
        pendingSocialSignup.setProviderUserId(socialUserInfo.getProviderUserId());
        pendingSocialSignup.setProviderEmail(socialUserInfo.getEmail());
        pendingSocialSignup.setProviderNickname(socialUserInfo.getNickname());
        pendingSocialSignup.setProfileImageUrl(socialUserInfo.getProfileImageUrl());

        String pendingToken = pendingSignupRedisService.save(pendingSocialSignup);

        return OAuthLoginResult.needExtraSignup(
                pendingToken,
                socialUserInfo.getEmail(),
                socialUserInfo.getNickname()
        );
    }

    // 추가 회원가입 단계에서 어떤 소셜 제공자인지 확인함
    public String getPendingProvider(String pendingToken) {
        return pendingSignupRedisService.get(pendingToken).getProvider();
    }

    // pendingToken과 추가정보로 members 생성 후 member_oauth_accounts에 연결함
    @Transactional
    public LoginResult completeSocialSignup(SocialExtraSignupRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("소셜 회원가입 정보가 없습니다.");
        }

        PendingSocialSignup pendingSocialSignup = pendingSignupRedisService.get(request.getPendingToken());
        String email = memberValidationService.normalizeEmail(pendingSocialSignup.getProviderEmail());
        String providerLabel = providerLabel(pendingSocialSignup.getProvider());
        String name = normalizeName(request.getName());
        String nickname = normalizeNickname(request.getNickname());

        if (signupDao.countByEmail(email) > 0) {
            throw new IllegalArgumentException(providerLabel + " 이메일로 이미 가입된 계정이 있습니다. 로그인 화면에서 다시 시도해주세요.");
        }

        if (nickname != null && signupDao.countByNickname(nickname) > 0) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
        }

        checkRequiredTermsAgreed(request.getAgreements());

        Member member = new Member();
        member.setEmail(email);
        member.setPasswordHash(null);
        member.setName(name);
        member.setNickname(nickname);
        member.setPhone(null);
        member.setProfileImageUrl(normalizeProfileImageUrl(pendingSocialSignup.getProfileImageUrl()));
        member.setEmailVerified(1);
        member.setPhoneVerified(0);

        int memberResult = signupDao.insertMember(member);
        if (memberResult != 1) {
            throw new IllegalStateException("소셜 회원가입 처리에 실패했습니다.");
        }

        insertTermsAgreements(member.getMemberId(), request.getAgreements());
        insertOAuthAccount(member.getMemberId(), pendingSocialSignup);

        pendingSignupRedisService.delete(request.getPendingToken());

        Member savedMember = loginDao.findMemberById(member.getMemberId());
        return loginService.issueLoginTokens(savedMember, Boolean.TRUE.equals(request.getRemember()));
    }

    // 현재 로그인 회원이 카카오 계정을 연결했는지 확인함
    public boolean isKakaoLinked(String authorizationHeader) {
        Long memberId = loginService.getLoginMemberByHeader(authorizationHeader).getMemberId();
        return oAuthDao.countByMemberIdAndProvider(memberId, KAKAO) > 0;
    }

    // 현재 회원의 카카오 연결 상태와 해제 가능 여부를 함께 반환함
    public Map<String, Object> getKakaoLinkStatus(String authorizationHeader) {
        return getProviderLinkStatus(authorizationHeader, KAKAO);
    }

    // 현재 로그인 회원이 구글 계정을 연결했는지 확인함
    public boolean isGoogleLinked(String authorizationHeader) {
        Long memberId = loginService.getLoginMemberByHeader(authorizationHeader).getMemberId();
        return oAuthDao.countByMemberIdAndProvider(memberId, GOOGLE) > 0;
    }

    // 현재 회원의 Google 연결 상태와 해제 가능 여부를 함께 반환함
    public Map<String, Object> getGoogleLinkStatus(String authorizationHeader) {
        return getProviderLinkStatus(authorizationHeader, GOOGLE);
    }

    // 현재 회원의 네이버 연결 상태와 해제 가능 여부를 함께 반환함
    public Map<String, Object> getNaverLinkStatus(String authorizationHeader) {
        return getProviderLinkStatus(authorizationHeader, NAVER);
    }

    private Map<String, Object> getProviderLinkStatus(String authorizationHeader, String provider) {
        Long memberId = loginService.getLoginMemberByHeader(authorizationHeader).getMemberId();
        boolean linked = oAuthDao.countByMemberIdAndProvider(memberId, provider) > 0;
        int linkedProviderCount = oAuthDao.countByMemberId(memberId);
        boolean passwordLoginEnabled = hasPasswordLogin(memberId);

        return Map.of(
                "success", true,
                "provider", provider,
                "providerLabel", providerLabel(provider),
                "linked", linked,
                "canUnlink", linked && canUnlinkSocialAccount(passwordLoginEnabled, linkedProviderCount),
                "passwordLoginEnabled", passwordLoginEnabled,
                "linkedProviderCount", linkedProviderCount
        );
    }

    // 로그인된 일반 회원에게 카카오 계정을 연결함
    @Transactional
    public Member linkKakaoAccount(String authorizationHeader, KakaoLoginRequest request) {
        return linkProviderAccount(authorizationHeader, KAKAO, requestKakaoUserInfo(request));
    }

    // 로그인된 일반 회원에게 구글 계정을 연결함
    @Transactional
    public Member linkGoogleAccount(String authorizationHeader, KakaoLoginRequest request) {
        return linkProviderAccount(authorizationHeader, GOOGLE, requestGoogleUserInfo(request));
    }

    // 로그인된 일반 회원에게 네이버 계정을 연결함
    @Transactional
    public Member linkNaverAccount(String authorizationHeader, KakaoLoginRequest request) {
        return linkProviderAccount(authorizationHeader, NAVER, requestNaverUserInfo(request));
    }

    // 로그인 수단이 0개가 되지 않는 경우에만 카카오 연결을 해제함
    @Transactional
    public Member unlinkKakaoAccount(String authorizationHeader) {
        return unlinkProviderAccount(authorizationHeader, KAKAO);
    }

    // 로그인 수단이 0개가 되지 않는 경우에만 Google 연결을 해제함
    @Transactional
    public Member unlinkGoogleAccount(String authorizationHeader) {
        return unlinkProviderAccount(authorizationHeader, GOOGLE);
    }

    // 로그인 수단이 0개가 되지 않는 경우에만 네이버 연결을 해제함
    @Transactional
    public Member unlinkNaverAccount(String authorizationHeader) {
        return unlinkProviderAccount(authorizationHeader, NAVER);
    }

    private Member linkProviderAccount(String authorizationHeader, String provider, SocialUserInfo socialUserInfo) {
        Long memberId = loginService.getLoginMemberByHeader(authorizationHeader).getMemberId();
        Member member = loginDao.findMemberById(memberId);
        if (member == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }

        loginService.checkLoginAllowed(member);

        if (!member.getEmail().equalsIgnoreCase(socialUserInfo.getEmail())) {
            throw new IllegalArgumentException("현재 로그인한 이메일과 " + providerLabel(provider) + " 계정 이메일이 다릅니다. 같은 이메일의 소셜 계정만 연결할 수 있습니다.");
        }

        if (oAuthDao.countByMemberIdAndProvider(memberId, provider) > 0) {
            throw new IllegalArgumentException("이미 " + providerLabel(provider) + " 계정이 연결되어 있습니다.");
        }

        OAuthAccount connectedAccount = oAuthDao.findByProviderAndProviderUserId(
                provider,
                socialUserInfo.getProviderUserId()
        );
        if (connectedAccount != null) {
            throw new IllegalArgumentException("이미 다른 MoodCast 계정에 연결된 " + providerLabel(provider) + " 계정입니다.");
        }

        PendingSocialSignup pendingSocialSignup = new PendingSocialSignup();
        pendingSocialSignup.setProvider(provider);
        pendingSocialSignup.setProviderUserId(socialUserInfo.getProviderUserId());
        pendingSocialSignup.setProviderEmail(socialUserInfo.getEmail());
        pendingSocialSignup.setProviderNickname(socialUserInfo.getNickname());
        pendingSocialSignup.setProfileImageUrl(socialUserInfo.getProfileImageUrl());

        insertOAuthAccount(memberId, pendingSocialSignup);
        return member;
    }

    private Member unlinkProviderAccount(String authorizationHeader, String provider) {
        Long memberId = loginService.getLoginMemberByHeader(authorizationHeader).getMemberId();
        Member member = loginDao.findMemberById(memberId);
        if (member == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }

        loginService.checkLoginAllowed(member);

        if (oAuthDao.countByMemberIdAndProvider(memberId, provider) == 0) {
            throw new IllegalArgumentException("연결된 " + providerLabel(provider) + " 계정이 없습니다.");
        }

        int linkedProviderCount = oAuthDao.countByMemberId(memberId);
        boolean passwordLoginEnabled = hasPasswordLogin(memberId);
        if (!canUnlinkSocialAccount(passwordLoginEnabled, linkedProviderCount)) {
            throw new IllegalArgumentException("비밀번호가 없는 계정은 마지막 소셜 계정을 해제할 수 없습니다. 먼저 비밀번호 설정이 필요합니다.");
        }

        int result = oAuthDao.deleteByMemberIdAndProvider(memberId, provider);
        if (result != 1) {
            throw new IllegalStateException(providerLabel(provider) + " 계정 연결 해제에 실패했습니다.");
        }

        return member;
    }

    private boolean hasPasswordLogin(Long memberId) {
        String passwordHash = loginDao.findPasswordHashByMemberId(memberId);
        return passwordHash != null && !passwordHash.trim().isEmpty();
    }

    private boolean canUnlinkSocialAccount(boolean passwordLoginEnabled, int linkedProviderCount) {
        return passwordLoginEnabled || linkedProviderCount > 1;
    }

    private void insertOAuthAccount(Long memberId, PendingSocialSignup pendingSocialSignup) {
        if (oAuthDao.countByMemberIdAndProvider(memberId, pendingSocialSignup.getProvider()) > 0) {
            throw new IllegalArgumentException("이미 연결된 소셜 계정입니다.");
        }

        OAuthAccount oAuthAccount = new OAuthAccount();
        oAuthAccount.setMemberId(memberId);
        oAuthAccount.setProvider(pendingSocialSignup.getProvider());
        oAuthAccount.setProviderUserId(pendingSocialSignup.getProviderUserId());
        oAuthAccount.setProviderEmail(pendingSocialSignup.getProviderEmail());
        oAuthAccount.setProviderNickname(pendingSocialSignup.getProviderNickname());

        int oauthResult = oAuthDao.insertOAuthAccount(oAuthAccount);
        if (oauthResult != 1) {
            throw new IllegalStateException("소셜 계정 연결에 실패했습니다.");
        }
    }

    private SocialUserInfo requestKakaoUserInfo(KakaoLoginRequest request) {
        if (request == null || request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("카카오 인증 코드가 없습니다.");
        }

        if (request.getRedirectUri() == null || request.getRedirectUri().trim().isEmpty()) {
            throw new IllegalArgumentException("카카오 로그인 요청 정보가 올바르지 않습니다. 다시 시도해주세요.");
        }

        validateKakaoRedirectUri(request.getRedirectUri());

        if (kakaoClientId == null || kakaoClientId.trim().isEmpty()) {
            throw new IllegalStateException("카카오 로그인 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.");
        }

        String kakaoAccessToken = requestKakaoAccessToken(request.getCode(), request.getRedirectUri());
        Map<String, Object> kakaoUser = requestKakaoUser(kakaoAccessToken);

        SocialUserInfo socialUserInfo = parseKakaoUserInfo(kakaoUser);

        if (socialUserInfo.getEmail() == null || socialUserInfo.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("카카오 계정에서 이메일을 제공하지 않아 가입할 수 없습니다.");
        }

        socialUserInfo.setEmail(memberValidationService.normalizeEmail(socialUserInfo.getEmail()));

        return socialUserInfo;
    }

    private void validateKakaoRedirectUri(String redirectUri) {
        validateRedirectUri(redirectUri, kakaoAllowedRedirectUris, "카카오");
    }

    private void validateGoogleRedirectUri(String redirectUri) {
        validateRedirectUri(redirectUri, googleAllowedRedirectUris, "Google");
    }

    private void validateNaverRedirectUri(String redirectUri) {
        validateRedirectUri(redirectUri, naverAllowedRedirectUris, "네이버");
    }

    private void validateRedirectUri(String redirectUri, String allowedRedirectUris, String providerLabel) {
        String normalizedRedirectUri = redirectUri.trim();
        boolean allowed = Arrays.stream(allowedRedirectUris.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .anyMatch(normalizedRedirectUri::equals);

        if (!allowed) {
            throw new IllegalArgumentException("허용되지 않은 " + providerLabel + " Redirect URI입니다. 관리자에게 문의해주세요.");
        }
    }

    private String requestKakaoAccessToken(String code, String redirectUri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", kakaoClientId);
        body.add("redirect_uri", redirectUri);
        body.add("code", code);

        if (kakaoClientSecret != null && !kakaoClientSecret.trim().isEmpty()) {
            body.add("client_secret", kakaoClientSecret);
        }

        ResponseEntity<Map> response;
        try {
            response = restTemplate.postForEntity(
                    "https://kauth.kakao.com/oauth/token",
                    new HttpEntity<>(body, headers),
                    Map.class
            );
        } catch (RestClientResponseException e) {
            throw new IllegalArgumentException("카카오 로그인 인증에 실패했습니다. 카카오 개발자 설정의 Redirect URI를 확인해주세요.");
        }

        Object accessToken = response.getBody() == null ? null : response.getBody().get("access_token");
        if (accessToken == null) {
            throw new IllegalArgumentException("카카오 로그인 인증에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        return accessToken.toString();
    }

    private SocialUserInfo requestGoogleUserInfo(KakaoLoginRequest request) {
        if (request == null || request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Google 인증 코드가 없습니다.");
        }

        if (request.getRedirectUri() == null || request.getRedirectUri().trim().isEmpty()) {
            throw new IllegalArgumentException("Google 로그인 요청 정보가 올바르지 않습니다. 다시 시도해주세요.");
        }

        validateGoogleRedirectUri(request.getRedirectUri());

        if (googleClientId == null || googleClientId.trim().isEmpty()
                || googleClientSecret == null || googleClientSecret.trim().isEmpty()) {
            throw new IllegalStateException("Google 로그인 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.");
        }

        String googleAccessToken = requestGoogleAccessToken(request.getCode(), request.getRedirectUri());
        Map<String, Object> googleUser = requestGoogleUser(googleAccessToken);
        SocialUserInfo socialUserInfo = parseGoogleUserInfo(googleUser);

        if (socialUserInfo.getEmail() == null || socialUserInfo.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Google 계정에서 이메일을 제공하지 않아 가입할 수 없습니다.");
        }

        socialUserInfo.setEmail(memberValidationService.normalizeEmail(socialUserInfo.getEmail()));

        return socialUserInfo;
    }

    private SocialUserInfo requestNaverUserInfo(KakaoLoginRequest request) {
        if (request == null || request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("네이버 인증 코드가 없습니다.");
        }

        if (request.getRedirectUri() == null || request.getRedirectUri().trim().isEmpty()) {
            throw new IllegalArgumentException("네이버 로그인 요청 정보가 올바르지 않습니다. 다시 시도해주세요.");
        }

        if (request.getState() == null || request.getState().trim().isEmpty()) {
            throw new IllegalArgumentException("네이버 로그인 요청 정보가 올바르지 않습니다. 다시 시도해주세요.");
        }

        validateNaverRedirectUri(request.getRedirectUri());

        if (naverClientId == null || naverClientId.trim().isEmpty()
                || naverClientSecret == null || naverClientSecret.trim().isEmpty()) {
            throw new IllegalStateException("네이버 로그인 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.");
        }

        String naverAccessToken = requestNaverAccessToken(
                request.getCode(),
                request.getRedirectUri(),
                request.getState()
        );
        Map<String, Object> naverUser = requestNaverUser(naverAccessToken);
        SocialUserInfo socialUserInfo = parseNaverUserInfo(naverUser);

        if (socialUserInfo.getEmail() == null || socialUserInfo.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("네이버 계정에서 이메일을 제공하지 않아 가입할 수 없습니다.");
        }

        socialUserInfo.setEmail(memberValidationService.normalizeEmail(socialUserInfo.getEmail()));

        return socialUserInfo;
    }

    private String requestGoogleAccessToken(String code, String redirectUri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", googleClientId);
        body.add("client_secret", googleClientSecret);
        body.add("redirect_uri", redirectUri);
        body.add("code", code);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.postForEntity(
                    "https://oauth2.googleapis.com/token",
                    new HttpEntity<>(body, headers),
                    Map.class
            );
        } catch (RestClientResponseException e) {
            throw new IllegalArgumentException("Google 로그인 인증에 실패했습니다. Google Cloud의 Redirect URI와 Client Secret을 확인해주세요.");
        }

        Object accessToken = response.getBody() == null ? null : response.getBody().get("access_token");
        if (accessToken == null) {
            throw new IllegalArgumentException("Google 로그인 인증에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        return accessToken.toString();
    }

    private Map<String, Object> requestGoogleUser(String googleAccessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(googleAccessToken);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );
        } catch (RestClientResponseException e) {
            throw new IllegalArgumentException("Google 사용자 정보를 가져오지 못했습니다. Google 계정 설정을 확인해주세요.");
        }

        if (response.getBody() == null) {
            throw new IllegalArgumentException("Google 사용자 정보를 가져오지 못했습니다.");
        }

        return response.getBody();
    }

    private String requestNaverAccessToken(String code, String redirectUri, String state) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", naverClientId);
        body.add("client_secret", naverClientSecret);
        body.add("redirect_uri", redirectUri);
        body.add("code", code);
        body.add("state", state);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.postForEntity(
                    "https://nid.naver.com/oauth2.0/token",
                    new HttpEntity<>(body, headers),
                    Map.class
            );
        } catch (RestClientResponseException e) {
            throw new IllegalArgumentException("네이버 로그인 인증에 실패했습니다. 네이버 개발자 설정의 Callback URL을 확인해주세요.");
        }

        Object accessToken = response.getBody() == null ? null : response.getBody().get("access_token");
        if (accessToken == null) {
            throw new IllegalArgumentException("네이버 로그인 인증에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        return accessToken.toString();
    }

    private Map<String, Object> requestNaverUser(String naverAccessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(naverAccessToken);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(
                    "https://openapi.naver.com/v1/nid/me",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );
        } catch (RestClientResponseException e) {
            throw new IllegalArgumentException("네이버 사용자 정보를 가져오지 못했습니다. 네이버 계정 설정을 확인해주세요.");
        }

        if (response.getBody() == null) {
            throw new IllegalArgumentException("네이버 사용자 정보를 가져오지 못했습니다.");
        }

        return response.getBody();
    }

    private SocialUserInfo parseGoogleUserInfo(Map<String, Object> googleUser) {
        Object id = googleUser.get("id");
        if (id == null) {
            throw new IllegalArgumentException("Google 사용자 정보가 올바르지 않습니다.");
        }

        if (Boolean.FALSE.equals(googleUser.get("verified_email"))) {
            throw new IllegalArgumentException("Google 계정 이메일 인증이 완료되지 않아 가입할 수 없습니다.");
        }

        SocialUserInfo socialUserInfo = new SocialUserInfo();
        socialUserInfo.setProvider(GOOGLE);
        socialUserInfo.setProviderUserId(id.toString());
        socialUserInfo.setEmail(googleUser.get("email") == null ? null : googleUser.get("email").toString());
        socialUserInfo.setNickname(googleUser.get("name") == null ? null : googleUser.get("name").toString());
        socialUserInfo.setProfileImageUrl(googleUser.get("picture") == null ? null : googleUser.get("picture").toString());

        return socialUserInfo;
    }

    @SuppressWarnings("unchecked")
    private SocialUserInfo parseNaverUserInfo(Map<String, Object> naverUser) {
        Map<String, Object> response = naverUser.get("response") instanceof Map
                ? (Map<String, Object>) naverUser.get("response")
                : new HashMap<>();
        Object id = response.get("id");

        if (id == null) {
            throw new IllegalArgumentException("네이버 사용자 정보가 올바르지 않습니다.");
        }

        SocialUserInfo socialUserInfo = new SocialUserInfo();
        socialUserInfo.setProvider(NAVER);
        socialUserInfo.setProviderUserId(id.toString());
        socialUserInfo.setEmail(response.get("email") == null ? null : response.get("email").toString());
        socialUserInfo.setNickname(response.get("nickname") == null ? null : response.get("nickname").toString());
        socialUserInfo.setProfileImageUrl(response.get("profile_image") == null ? null : response.get("profile_image").toString());

        return socialUserInfo;
    }

    private Map<String, Object> requestKakaoUser(String kakaoAccessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(kakaoAccessToken);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(
                    "https://kapi.kakao.com/v2/user/me",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );
        } catch (RestClientResponseException e) {
            throw new IllegalArgumentException("카카오 사용자 정보를 가져오지 못했습니다. 카카오 계정 설정을 확인해주세요.");
        }

        if (response.getBody() == null) {
            throw new IllegalArgumentException("카카오 사용자 정보를 가져오지 못했습니다.");
        }

        return response.getBody();
    }

    @SuppressWarnings("unchecked")
    private SocialUserInfo parseKakaoUserInfo(Map<String, Object> kakaoUser) {
        Object id = kakaoUser.get("id");
        Map<String, Object> kakaoAccount = (Map<String, Object>) kakaoUser.get("kakao_account");

        if (id == null || kakaoAccount == null) {
            throw new IllegalArgumentException("카카오 사용자 정보가 올바르지 않습니다.");
        }

        if (Boolean.FALSE.equals(kakaoAccount.get("is_email_verified"))) {
            throw new IllegalArgumentException("카카오 계정 이메일 인증이 완료되지 않아 가입할 수 없습니다.");
        }

        Map<String, Object> profile = kakaoAccount.get("profile") instanceof Map
                ? (Map<String, Object>) kakaoAccount.get("profile")
                : new HashMap<>();

        SocialUserInfo socialUserInfo = new SocialUserInfo();
        socialUserInfo.setProvider(KAKAO);
        socialUserInfo.setProviderUserId(id.toString());
        socialUserInfo.setEmail(kakaoAccount.get("email") == null ? null : kakaoAccount.get("email").toString());
        socialUserInfo.setNickname(profile.get("nickname") == null ? null : profile.get("nickname").toString());
        socialUserInfo.setProfileImageUrl(profile.get("profile_image_url") == null ? null : profile.get("profile_image_url").toString());

        return socialUserInfo;
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

    private String normalizeNickname(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            return null;
        }

        nickname = nickname.trim();
        if (!NICKNAME_PATTERN.matcher(nickname).matches()) {
            throw new IllegalArgumentException("닉네임은 한글, 영문, 숫자 2~12자로 입력해주세요.");
        }

        return nickname;
    }

    private String normalizeProfileImageUrl(String profileImageUrl) {
        if (profileImageUrl == null || profileImageUrl.trim().isEmpty()) {
            return null;
        }

        profileImageUrl = profileImageUrl.trim();
        if (profileImageUrl.length() > MAX_PROFILE_IMAGE_URL_LENGTH) {
            return null;
        }

        return profileImageUrl;
    }

    private String providerLabel(String provider) {
        if (GOOGLE.equals(provider)) {
            return "Google";
        }

        if (NAVER.equals(provider)) {
            return "네이버";
        }

        if (KAKAO.equals(provider)) {
            return "카카오";
        }

        return "소셜";
    }

    private void checkRequiredTermsAgreed(List<SignupTermsAgreementRequest> agreements) {
        if (agreements == null || agreements.isEmpty()) {
            throw new IllegalArgumentException("약관 동의 정보가 없습니다.");
        }

        Map<Long, Boolean> agreedMap = new HashMap<>();
        for (SignupTermsAgreementRequest agreement : agreements) {
            if (agreement == null || agreement.getTermsId() == null || agreement.getAgreed() == null) {
                throw new IllegalArgumentException("약관 정보가 올바르지 않습니다.");
            }

            agreedMap.put(agreement.getTermsId(), agreement.getAgreed());
        }

        List<Terms> requiredTerms = signupDao.findRequiredTerms();
        for (Terms requiredTerm : requiredTerms) {
            if (!Boolean.TRUE.equals(agreedMap.get(requiredTerm.getTermsId()))) {
                throw new IllegalArgumentException("필수 약관에 동의해주세요.");
            }
        }
    }

    private void insertTermsAgreements(Long memberId, List<SignupTermsAgreementRequest> agreements) {
        for (SignupTermsAgreementRequest agreement : agreements) {
            signupDao.insertMemberTermsAgreement(
                    memberId,
                    agreement.getTermsId(),
                    Boolean.TRUE.equals(agreement.getAgreed()) ? 1 : 0
            );
        }
    }
}
