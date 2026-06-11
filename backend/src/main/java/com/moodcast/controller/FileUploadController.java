package com.moodcast.controller;

/**
 * ─────────────────────────────────────────────────────────────────
 * FileUploadController — 이미지 관련 HTTP 요청을 받아주는 문지기 역할임
 *
 * Spring MVC에서 Controller는 "어떤 URL로 요청이 오면 어떤 메서드를 실행할지"
 * 를 연결해주는 라우터 역할을 함. 실제 파일 처리 로직은 전부 FileUploadService에
 * 위임하고, Controller는 최대한 얇게(thin) 유지하는 게 좋은 설계임.
 *
 * 📌 주요 엔드포인트 정리
 *   POST   /upload                      — 이미지 파일을 S3에 업로드 (현재 운영 중인 업로드 API)
 *   DELETE /upload/{filename}           — S3에서 이미지 삭제
 *   GET    /upload/view?key=...         — S3 이미지를 읽어서 브라우저에 전달
 *
 *   [legacy/maintenance only]
 *   GET    /upload/uploads/**           — 예전 로컬 경로 호환용 (legacy)
 *   POST   /upload/migrate-local        — 로컬 파일을 S3로 이관하는 운영 도구
 *   POST   /upload/rewrite-s3-links     — DB에 남은 구버전 URL을 S3 URL로 교체하는 운영 도구
 * ─────────────────────────────────────────────────────────────────
 */

import com.moodcast.service.FileUploadService;
import com.moodcast.service.FileUploadResponse;
import com.moodcast.member.service.LoginService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * @RestController = @Controller + @ResponseBody
 *   → 이 클래스의 모든 메서드 반환값이 자동으로 JSON으로 변환되어 응답됨
 *
 * CORS는 WebConfig의 전역 설정을 사용함.
 *
 * @RequestMapping("/upload") = 이 컨트롤러의 모든 엔드포인트는 /upload 로 시작함
 */
@RestController
@RequestMapping("/upload")
public class FileUploadController {

    /**
     * FileUploadService를 주입받아 사용함 (의존성 주입, DI).
     * final로 선언하면 한 번 주입된 뒤 절대 바뀌지 않아서 안전함.
     */
    private final FileUploadService fileUploadService;
    private final LoginService loginService;

    /**
     * 생성자 주입 방식 — Spring이 이 클래스를 만들 때 자동으로 FileUploadService를 넣어줌.
     * @Autowired 없이도 생성자가 하나면 Spring이 알아서 주입해줌.
     */
    public FileUploadController(FileUploadService fileUploadService, LoginService loginService) {
        this.fileUploadService = fileUploadService;
        this.loginService = loginService;
    }

    /**
     * [이미지 업로드 API] POST /upload
     *
     * 프론트에서 FormData로 파일을 보내면 S3에 저장하고 결과 URL을 돌려줌.
     *
     * @param file       프론트에서 보낸 이미지 파일 (multipart/form-data)
     * @param folderType S3 버킷 내 저장할 폴더명 (기본값: "post-images").
     *                   "user-images", "post-images" 등으로 구분해서 관리함
     * @param request    HTTP 요청 객체 — 서버 주소(baseUrl)를 추출하는 데 사용함
     * @return           { url, filename, key } 형태의 JSON
     */
    @PostMapping
    public ResponseEntity<FileUploadResponse> upload(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "post-images") String folderType,
            HttpServletRequest request
    ) {
        requireLogin(authorizationHeader);
        return ResponseEntity.ok(fileUploadService.uploadImage(file, folderType, baseUrl(request)));
    }

    /**
     * [이미지 다중 업로드 API] POST /upload/batch
     *
     * 채팅처럼 여러 이미지를 한 번에 올려야 하는 경우에 사용합니다.
     * 최대 5개까지만 허용합니다.
     */
    @PostMapping("/batch")
    public ResponseEntity<List<FileUploadResponse>> uploadBatch(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(defaultValue = "chat-images") String folderType,
            HttpServletRequest request
    ) {
        requireLogin(authorizationHeader);
        return ResponseEntity.ok(fileUploadService.uploadImages(files, folderType, baseUrl(request)));
    }

    /**
     * [이미지 삭제 API] DELETE /upload/{filename}
     *
     * S3에 저장된 파일을 삭제함. 게시글/프로필 삭제 시 연동해서 호출됨.
     *
     * @param filename   삭제할 파일명 (예: "abc123.jpg")
     * @param folderType 어느 폴더에서 삭제할지 (기본값: "post-images")
     * @return           { deleted: true/false } 형태의 JSON
     */
    @DeleteMapping("/{filename}")
    public ResponseEntity<Map<String, Boolean>> delete(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String filename,
            @RequestParam(defaultValue = "post-images") String folderType
    ) {
        requireLogin(authorizationHeader);
        return ResponseEntity.ok(Map.of("deleted", fileUploadService.deleteImage(filename, folderType)));
    }

    /**
     * [이미지 조회 API] GET /upload/view?key=post-images/abc123.jpg
     *
     * S3에서 이미지 바이트를 직접 읽어 브라우저에 내려줌.
     * S3 버킷이 퍼블릭이 아닐 때 이 엔드포인트를 통해 프록시처럼 사용할 수 있음.
     *
     * @param key  S3 객체 키 (URL 인코딩된 상태로 올 수 있어서 디코딩 처리함)
     * @return     이미지 바이트 배열 (Content-Type: image/jpeg 등)
     */
    @GetMapping("/view")
    public ResponseEntity<byte[]> view(@RequestParam String key) {
        // URL 인코딩된 키를 원래 문자열로 복원함 (예: "%2F" → "/")
        String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8);
        return fileUploadService.loadImage(decodedKey);
    }

    /**
     * [legacy compatibility] GET /upload/uploads/파일명
     *
     * S3 전환 이전에 로컬 서버 uploads/ 폴더에 저장된 이미지 URL을 지원하기 위한 엔드포인트.
     * 현재 운영 중인 업로드 흐름은 /upload 와 /upload/view 기반의 S3 저장 방식임.
     */
    @GetMapping("/uploads/**")
    public ResponseEntity<byte[]> legacyUploads(HttpServletRequest request) {
        // 전체 요청 경로에서 "/upload/" 뒤에 있는 키 부분만 뽑아냄
        // 예: "/upload/uploads/abc.jpg" → "uploads/abc.jpg"
        String requestUri = request.getRequestURI();
        String prefix = request.getContextPath() + "/upload/";
        String key = requestUri.startsWith(prefix) ? requestUri.substring(prefix.length()) : requestUri;
        return fileUploadService.loadImage(key);
    }

    /**
     * [maintenance tool] POST /upload/migrate-local?deleteAfterUpload=true
     *
     * 로컬 서버의 legacy uploads/ 폴더에 남아 있는 파일들을 S3로 이관하는 운영 도구.
     * 일반 사용자 업로드 플로우에서는 호출되지 않으며 이관용으로만 사용됨.
     *
     * @param deleteAfterUpload true면 S3 업로드 성공 후 로컬 파일도 삭제함
     * @return 이관 결과 (성공한 파일 목록, DB 업데이트 건수 등)
     */
    @PostMapping("/migrate-local")
    public ResponseEntity<Map<String, Object>> migrateLocalUploads(
            @RequestParam(defaultValue = "false") boolean deleteAfterUpload,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "success", false,
                        "message", "운영 도구는 API로 실행할 수 없습니다."
                ));
    }

    /**
     * [운영 도구] POST /upload/rewrite-s3-links
     *
     * DB에 저장된 이미지 URL 중 구버전(localhost:8080/... 또는 /uploads/...) 형태를
     * 올바른 S3 퍼블릭 URL로 일괄 교체함.
     * rewrite 후 프론트에서 이미지가 정상적으로 표시되는지 확인하면 됨.
     *
     * @return 업데이트된 레코드 수 (members, posts, comments 각각)
     */
    @PostMapping("/rewrite-s3-links")
    public ResponseEntity<Map<String, Object>> rewriteS3Links(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "success", false,
                        "message", "운영 도구는 API로 실행할 수 없습니다."
                ));
    }

    /**
     * 업로드/삭제 요청은 로그인한 사용자만 통과시킴.
     */
    private void requireLogin(String authorizationHeader) {
        loginService.getLoginMemberByHeader(authorizationHeader);
    }

    /**
     * 현재 HTTP 요청에서 서버의 기본 URL을 조립하는 내부 헬퍼 메서드임.
     * 예: "http://localhost:8080" 또는 "http://3.39.49.9:8080"
     *
     * @RequestMapping에서 반환되는 URL에 이 baseUrl을 붙여
     * DB에 저장할 이미지 접근 주소를 만드는 데 사용함.
     */
    private String baseUrl(HttpServletRequest request) {
        return request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
    }
}
