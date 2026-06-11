package com.moodcast.member.controller;

import com.moodcast.common.ClientIpResolver;
import com.moodcast.member.dto.signup.*;
import com.moodcast.member.service.SignupService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping(value="signup")
public class SignupController {
    @Autowired
    private SignupService signupService;

    @Autowired
    private ClientIpResolver clientIpResolver;

    @Value("${app.dev-return-auth-code:false}")
    private boolean devReturnAuthCode;

    private String getClientIp(HttpServletRequest request) {
        return clientIpResolver.resolve(request);
    }

    // =======================================================================================
    // SignupController의 예외는 moodcast.common.exception의 MemberExceptionHandler가 잡음
    // 그래서 정상 응답만 직접 처리함, 예외는 작성X
    // 400, 500 예외

    // 회원가입 이메일 인증번호 발송
    @PostMapping(value="auth/email/send")
    public ResponseEntity<?> sendEmailAuthCode(
            @RequestBody EmailAuthSendRequest request,
            HttpServletRequest httpRequest
    ) {

            EmailAuthSendResult result = signupService.sendEmailAuthCode(request.getEmail(), getClientIp(httpRequest));
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "이메일 인증번호를 발송했습니다. 3분 안에 입력해주세요.");
            response.put("email", result.getEmail());
            if (devReturnAuthCode) {
                response.put("authCode", result.getAuthCode());
            }

            return ResponseEntity.ok(response);
    }

    // 회원가입 이메일 인증번호 확인
    @PostMapping(value="auth/email/verify")
    public ResponseEntity<?> verifyEmailAuthCode(@RequestBody EmailAuthVerifyRequest request) {

            signupService.verifyEmailAuthCode(request.getEmail(), request.getAuthCode());
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "이메일 인증이 완료되었습니다."
                    )
            );
    }

    // 이메일 기본검사, 중복체크
    @GetMapping(value="check/email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
            boolean available = signupService.checkEmailAvailable(email);
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "available", available
                    )
            );
    }

    // 닉네임 기본검사, 중복체크
    @GetMapping(value="check/nickname")
    public ResponseEntity<?> checkNickname(@RequestParam String nickname) {
        boolean available = signupService.checkNicknameAvailable(nickname);
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "available", available
                )
        );
    }

    // 이용약관 조회
    @GetMapping("terms")
    public ResponseEntity<?> getTerms() {

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "terms", signupService.getActiveTerms()
                    )
            );
    }

    // 회원가입 step1 검증
    @PostMapping("validate/basic")
    public ResponseEntity<?> validateBasic(@RequestBody ValidateBasicRequest request) {
            signupService.validateBasic(
                    request.getName(), request.getNickname(), request.getEmail(), request.getPassword(), request.getPasswordConfirm());

            return ResponseEntity.ok(
                    Map.of(
                            "success", true
                    )
            );
    }

    @PostMapping("complete")
    public ResponseEntity<?> completeSignup (@RequestBody SignupRequest request) {
        signupService.completeSignup(request);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "회원가입이 완료되었습니다. 로그인 후 MoodCast를 이용해주세요."
                )
        );
    }

}
