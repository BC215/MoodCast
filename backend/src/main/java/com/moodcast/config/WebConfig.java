package com.moodcast.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload-dir:uploads}")
    private String uploadDirConfig;

    @Value("${app.local-upload-resource-enabled:false}")
    private boolean localUploadResourceEnabled;

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173",
                                "http://127.0.0.1:5173",
                                "http://3.39.49.9:5173",
                        "http://moodcast-frontend-s3-qqqq.s3-website.ap-northeast-2.amazonaws.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        if (!localUploadResourceEnabled) {
            return; // 기본값 false: 로컬 uploads 리소스 핸들러는 legacy 호환용으로만 사용
        }

        // 절대/상대 경로 모두 처리 (Mac/Windows 무관)
        String absolutePath;
        if (Paths.get(uploadDirConfig).isAbsolute()) {
            absolutePath = uploadDirConfig;
        } else {
            absolutePath = Paths.get(System.getProperty("user.dir"), uploadDirConfig).toString();
        }

        // Paths.get().toUri() 가 OS에 맞는 file:// URI 자동 생성
        String resourceLocation = Paths.get(absolutePath).toUri().toString();
        if (!resourceLocation.endsWith("/")) {
            resourceLocation += "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(resourceLocation);
    }
}
