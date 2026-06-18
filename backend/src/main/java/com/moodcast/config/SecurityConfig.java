package com.moodcast.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsUtils;

@Configuration // Spring 설정파일
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. WebConfig에 설정한 CORS 설정을 그대로 가져와 적용
            .cors(cors -> cors.configure(http))
            
            // 2. JWT 기반 REST API 서버이므로 CSRF 비활성화
            .csrf(csrf -> csrf.disable())
            
            // 3. 폼 로그인 및 HTTP Basic 비활성화
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            
            // 4. 세션을 생성하지 않음 (Stateless)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 5. 경로 권한 설정
            .authorizeHttpRequests(auth -> auth
                // Preflight(OPTIONS) 요청 허용
                .requestMatchers(CorsUtils::isPreFlightRequest).permitAll()
                // 로그인, 회원가입, 이미지 뷰, 웹소켓 등 인증 없이 접근 가능하도록 설정
                .requestMatchers("/auth/**", "/upload/view/**", "/ws-chat/**", "/ws-stomp/**").permitAll()
                // 나머지 모든 API는 인증이 필요함
                .anyRequest().authenticated()
            );
        return http.build();
    }

}