package com.moodcast.member.service;

import com.moodcast.member.dao.SignupDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private MailSender mailSender;

    public void sendSignupAuthCode(String email, String authCode) {
        // 제목, 받는사람, 본문 정도로 간단하게 구성된 메일 객체
        SimpleMailMessage message = new SimpleMailMessage();

        // 이메일 받을 주소
        message.setTo(email);

        // 메일 제목
        message.setSubject("[MoodCast] 회원가입 이메일 인증번호");

        // 메일 본문
        message.setText(
                "MoodCast 회원가입 이메일 인증번호입니다. \n\n" + "인증번호: " + authCode + "\n\n" + "인증번호는 3분간 유효합니다."
        );

        // 메일 보내기
        mailSender.send(message);
    }

    public void sendWithdrawAuthCode(String email, String authCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("[MoodCast] 회원 탈퇴 이메일 인증번호");
        message.setText(
                "MoodCast 회원 탈퇴 이메일 인증번호입니다. \n\n"
                        + "인증번호: " + authCode + "\n\n"
                        + "인증번호는 3분간 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해주세요."
        );

        mailSender.send(message);
    }

    public void sendAccountRecoveryAuthCode(String email, String authCode, String subjectType) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("[MoodCast] " + subjectType + " 이메일 인증번호");
        message.setText(
                "MoodCast " + subjectType + " 이메일 인증번호입니다. \n\n"
                        + "인증번호: " + authCode + "\n\n"
                        + "인증번호는 3분간 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해주세요."
        );

        mailSender.send(message);
    }
}
