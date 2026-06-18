package com.moodcast.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsUtils;

import java.util.List;

@Configuration // Spring 설정파일
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://3.39.49.9:5173",
                "http://moodcast-frontend-s3-qqqq.s3-website.ap-northeast-2.amazonaws.com",
                "https://mood-cast-sooty.vercel.app"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Cookie", "Set-Cookie"));
        config.setExposedHeaders(List.of("Authorization", "Set-Cookie", "Location"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. Vercel/localhost 환경에서 오는 요청을 허용하는 CORS 설정 적용
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

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
                // 로그인, 토큰 재발급, 이미지 뷰, 웹소켓 등 인증 없이 접근 가능하도록 설정
                .requestMatchers("/auth/**", "/api/auth/**", "/upload/view/**", "/ws-chat/**", "/ws-stomp/**").permitAll()
                // 나머지 모든 API는 인증이 필요함
                .anyRequest().authenticated()
            );
        return http.build();
    }

}