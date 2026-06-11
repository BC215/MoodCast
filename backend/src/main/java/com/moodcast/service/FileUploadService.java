package com.moodcast.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.sql.DataSource;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.stream.Collectors;

@Service
public class FileUploadService {

    // 이 서비스는 두 가지 역할을 가짐.
    // 1) 현재 운영 중인 이미지 업로드/삭제/조회 작업 (S3 기반)
    // 2) 이전 로컬 uploads/ 기반 URL을 정리하기 위한 legacy 호환/이관 작업
    private static final String USER_IMAGE_FOLDER = "user-images";
    private static final String POST_IMAGE_FOLDER = "post-images";
    private static final String CHAT_IMAGE_FOLDER = "chat-images";

    // S3와 통신하는 클라이언트임. 실제로 S3에 올리거나 지울 때 사용함.
    private final S3Client s3Client;

    // DB에 직접 접속해서 기존 로컬 URL 정보를 바꾸는 데 사용함.
    private final DataSource dataSource;

    // AWS 리전 정보임. 예: ap-northeast-2
    @Value("${cloud.aws.region}")
    private String region;

    // DB에 저장할 때 사용할 공개 주소임. 설정이 없으면 요청한 서버 주소를 그대로 사용함
    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    // 이미지를 저장할 S3 버킷 이름임
    @Value("${cloud.aws.s3.upload-bucket}")
    private String uploadBucket;

    // 예전에 로컬에 저장하던 uploads 폴더 위치임
    @Value("${app.upload-dir:uploads}")
    private String localUploadDir;

    public FileUploadService(S3Client s3Client, DataSource dataSource) {
        this.s3Client = s3Client;
        this.dataSource = dataSource;
    }

    // 프론트에서 받은 이미지 파일을 S3에 저장하는 기본 엔드포인트임.
    // 여기서는 게시물 이미지(post-images)를 기본값으로 사용함.
    public FileUploadResponse uploadImage(MultipartFile file) {
        return uploadImage(file, POST_IMAGE_FOLDER, resolveBaseUrl("http://localhost:8080"));
    }

    // 저장할 폴더를 선택할 수 있는 업로드 메서드임.
    // user-images는 프로필, post-images는 게시물 이미지 용도로 나눠서 저장함.
    public FileUploadResponse uploadImage(MultipartFile file, String folderType) {
        return uploadImage(file, folderType, resolveBaseUrl("http://localhost:8080"));
    }

    public FileUploadResponse uploadImage(MultipartFile file, String folderType, String baseUrl) {
        // 업로드 요청에 파일이 없으면 예외 처리함.
        // 부트캠프에서 이 검증 로직은 꼭 이해해야 함.
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다.");
        }

        // 이미지 여부를 확인함. contentType이 image/로 시작하지 않으면 거부함.
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }

        try {
            // 원본 파일명에서 확장자만 꺼내옴. 예: .jpg, .png
            String original = file.getOriginalFilename();
            String ext = "";
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }

            // 같은 이름이 다시 와도 충돌하지 않게 UUID로 새 파일명을 만듦
            String filename = UUID.randomUUID() + ext;
            String folder = normalizeFolderType(folderType);
            // S3 안에서는 prefix를 폴더처럼 붙여서 관리함
            String key = folder + "/" + filename;

            // S3에 올릴 요청 정보를 만듦
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(uploadBucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            // 실제 파일 데이터를 S3로 전송함
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String s3Url = buildPublicS3Url(key);
            String viewUrl = buildViewUrl(baseUrl, key);
            
            return FileUploadResponse.builder()
                    .url(s3Url)
                    .s3Url(s3Url)
                    .viewUrl(viewUrl)
                    .filename(filename)
                    .key(key)
                    .build();
        } catch (IOException e) {
            throw new IllegalStateException("파일 업로드에 실패했습니다.", e);
        }
    }

    public List<FileUploadResponse> uploadImages(List<MultipartFile> files, String folderType, String baseUrl) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다.");
        }

        if (files.size() > 5) {
            throw new IllegalArgumentException("이미지는 최대 5개까지 업로드할 수 있습니다.");
        }

        List<FileUploadResponse> uploadedFiles = new ArrayList<>();
        for (MultipartFile file : files) {
            uploadedFiles.add(uploadImage(file, folderType, baseUrl));
        }

        return uploadedFiles;
    }

    // 파일명을 받아 S3에서 삭제함.
    // 로컬 디스크에서 지우는 것이 아니라 S3 버킷에서 지우는 것임.
    public boolean deleteImage(String filename) {
        return deleteImage(filename, POST_IMAGE_FOLDER);
    }

    // 파일명을 받아 특정 폴더에서 S3 객체를 지움
    public boolean deleteImage(String filename, String folderType) {
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("잘못된 파일명입니다.");
        }
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            throw new IllegalArgumentException("잘못된 파일명입니다.");
        }

        String key = normalizeFolderType(folderType) + "/" + filename;
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(uploadBucket)
                .key(key)
                .build());
        return true;
    }

        // 주어진 S3 key에 해당하는 이미지를 읽어서
        // 브라우저로 그대로 내려주는 역할임.
        // 이 메서드는 /upload/view?key=... 같은 URL 뒤에 실제 이미지 바이트를 전달함.
        public ResponseEntity<byte[]> loadImage(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(uploadBucket)
            .key(key)
            .build();

        ResponseBytes<GetObjectResponse> bytes = s3Client.getObjectAsBytes(getObjectRequest);
        String contentType = bytes.response().contentType();
            if (contentType == null || contentType.isBlank()) {
                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "application/octet-stream")
                    .body(bytes.asByteArray());
            }

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(bytes.asByteArray());
    }

    // legacy uploads/ 폴더에 남아 있는 예전 파일을 S3로 옮기는 메서드임.
    // 일반 웹 업로드 흐름과는 별개로, 한 번만 수행하는 운영 도구 역할임.
    public Map<String, Map<String, String>> migrateLegacyLocalUploads(boolean deleteAfterUpload) {
        Path uploadPath = resolveLocalUploadPath();

        if (!Files.exists(uploadPath)) {
            return Map.of();
        }

        try {
            try (Stream<Path> pathStream = Files.list(uploadPath)) {
                return pathStream
                        .filter(Files::isRegularFile)
                        .filter(path -> !path.getFileName().toString().startsWith("."))
                        .filter(path -> !path.getFileName().toString().equalsIgnoreCase(".DS_Store"))
                        .collect(Collectors.toMap(
                                path -> path.getFileName().toString(),
                                path -> migrateSingleLocalFile(path, deleteAfterUpload),
                                (first, second) -> second,
                                LinkedHashMap::new
                        ));
            }
        } catch (IOException e) {
            throw new IllegalStateException("로컬 파일 이관에 실패했습니다.", e);
        }
    }

    // 이 메서드는 legacy 로컬 파일 이관과 DB URL 업데이트를 한 번에 처리함.
    // 예전 로컬 업로드 URL이 DB에 남아 있으면, 그걸 S3 URL로 바꿔줌.
    public Map<String, Object> migrateLegacyLocalUploadsAndDatabase(boolean deleteAfterUpload) {
        Map<String, Map<String, String>> migratedFiles = migrateLegacyLocalUploads(deleteAfterUpload);
        MigrationCounts migrationCounts = updateDatabaseReferences(migratedFiles);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("files", migratedFiles);
        result.put("updatedMembers", migrationCounts.updatedMembers);
        result.put("updatedPosts", migrationCounts.updatedPosts);
        result.put("updatedComments", migrationCounts.updatedComments);
        result.put("totalUpdated", migrationCounts.updatedMembers + migrationCounts.updatedPosts + migrationCounts.updatedComments);
        return result;
    }

    // DB에 이미 저장된 이미지 주소 중에서 로컬 URL 또는 /upload/view URL을
    // public S3 URL로 바꾸는 메서드임.
    // 이 작업이 있어야 기존 글에 들어간 이미지가 웹에서 깨지지 않음.
    public Map<String, Object> rewriteImageUrlsToPublicS3Urls(String baseUrl) {
        MigrationCounts counts = rewriteDatabaseViewReferencesToPublicUrls();
        MigrationCounts legacyCounts = rewriteDatabaseLegacyLocalReferences();
        counts.updatedMembers += legacyCounts.updatedMembers;
        counts.updatedPosts += legacyCounts.updatedPosts;
        counts.updatedComments += legacyCounts.updatedComments;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updatedMembers", counts.updatedMembers);
        result.put("updatedPosts", counts.updatedPosts);
        result.put("updatedComments", counts.updatedComments);
        result.put("totalUpdated", counts.updatedMembers + counts.updatedPosts + counts.updatedComments);
        return result;
    }

    // 이미지 URL을 만들 때 기준이 되는 base URL을 결정함.
    // app.public-base-url을 설정하면 그걸 우선 사용하고, 없으면 요청한 서버 주소를 그대로 씀.
    public String resolveBaseUrl(String requestBaseUrl) {
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return publicBaseUrl.trim().replaceAll("/+$", "");
        }
        if (requestBaseUrl == null || requestBaseUrl.isBlank()) {
            return "http://localhost:8080";
        }
        return requestBaseUrl.replaceAll("/+$", "");
    }

    // DB에 저장된 로컬 URL은 여러 형태일 수 있음.
    // localhost, 127.0.0.1, /uploads/ 등 다양한 변형을 모두 만들어서
    // 일괄 치환할 수 있도록 함.
    private List<String> buildLocalUrlVariants(String filename) {
        List<String> variants = new ArrayList<>();
        variants.add("http://localhost:8080/uploads/" + filename);
        variants.add("http://127.0.0.1:8080/uploads/" + filename);
        variants.add("https://localhost:8080/uploads/" + filename);
        variants.add("https://127.0.0.1:8080/uploads/" + filename);
        variants.add("/uploads/" + filename);
        variants.add("uploads/" + filename);
        return variants;
    }

    private String buildViewUrl(String baseUrl, String key) {
        String normalizedBase = baseUrl == null ? "http://localhost:8080" : baseUrl.replaceAll("/+$", "");
        return normalizedBase + "/upload/view?key=" + URLEncoder.encode(key, StandardCharsets.UTF_8);
    }

    private String buildPublicS3Url(String key) {
        return "https://" + uploadBucket + ".s3." + region + ".amazonaws.com/" + key;
    }

    // DB에 저장된 예전 로컬 주소를 S3 주소로 치환함
    private MigrationCounts updateDatabaseReferences(Map<String, Map<String, String>> migratedFiles) {
        MigrationCounts counts = new MigrationCounts();
        if (migratedFiles.isEmpty()) {
            return counts;
        }

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                for (Map.Entry<String, Map<String, String>> entry : migratedFiles.entrySet()) {
                    String originalFilename = entry.getKey();
                    Map<String, String> folderUrls = entry.getValue();
                    List<String> localVariants = buildLocalUrlVariants(originalFilename);

                    String userImageUrl = folderUrls.get(USER_IMAGE_FOLDER);
                    if (userImageUrl != null) {
                        counts.updatedMembers += updateExactColumnValues(connection,
                                "members",
                                "profile_image_url",
                                localVariants,
                                userImageUrl);
                    }

                    String postImageUrl = folderUrls.get(POST_IMAGE_FOLDER);
                    if (postImageUrl != null) {
                        counts.updatedPosts += updateTextColumn(connection,
                                "post_tbl",
                                "post_id",
                                "content",
                                localVariants,
                                postImageUrl);

                        counts.updatedComments += updateTextColumn(connection,
                                "comment_tbl",
                                "comment_id",
                                "content",
                                localVariants,
                                postImageUrl);
                    }
                }

                connection.commit();
                return counts;
            } catch (Exception e) {
                connection.rollback();
                throw e;
            }
        } catch (SQLException e) {
            throw new IllegalStateException("DB 이관에 실패했습니다.", e);
        }
    }

    private MigrationCounts rewriteDatabaseViewReferencesToPublicUrls() {
        MigrationCounts counts = new MigrationCounts();

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                counts.updatedMembers += rewriteExactViewColumn(connection, "members", "member_id", "profile_image_url");
                counts.updatedPosts += rewriteTextColumnWithViewUrls(connection, "post_tbl", "post_id", "content");
                counts.updatedComments += rewriteTextColumnWithViewUrls(connection, "comment_tbl", "comment_id", "content");
                connection.commit();
                return counts;
            } catch (Exception e) {
                connection.rollback();
                throw e;
            }
        } catch (SQLException e) {
            throw new IllegalStateException("public S3 URL 재작성에 실패했습니다.", e);
        }
    }

    // 예전 로컬 uploads URL도 public S3 URL로 바꿈. 폴더는 컬럼별로 구분함.
    private MigrationCounts rewriteDatabaseLegacyLocalReferences() {
        MigrationCounts counts = new MigrationCounts();

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                counts.updatedMembers += rewriteLegacyLocalExactColumn(connection, "members", "member_id", "profile_image_url", USER_IMAGE_FOLDER);
                counts.updatedPosts += rewriteLegacyLocalTextColumn(connection, "post_tbl", "post_id", "content", POST_IMAGE_FOLDER);
                counts.updatedComments += rewriteLegacyLocalTextColumn(connection, "comment_tbl", "comment_id", "content", POST_IMAGE_FOLDER);
                connection.commit();
                return counts;
            } catch (Exception e) {
                connection.rollback();
                throw e;
            }
        } catch (SQLException e) {
            throw new IllegalStateException("로컬 URL 재작성에 실패했습니다.", e);
        }
    }

    private int rewriteLegacyLocalExactColumn(Connection connection, String tableName, String idColumn, String columnName, String folderType) throws SQLException {
        int updatedCount = 0;

        try (PreparedStatement statement = connection.prepareStatement("select " + idColumn + ", " + columnName + " from " + tableName + " where " + columnName + " is not null")) {
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    long id = resultSet.getLong(idColumn);
                    String current = resultSet.getString(columnName);
                    if (current == null || !current.contains("/uploads/")) {
                        continue;
                    }

                    String filename = current.substring(current.lastIndexOf('/') + 1);
                    String replaced = buildPublicS3Url(folderType + "/" + filename);
                    if (!current.equals(replaced)) {
                        try (PreparedStatement updateStatement = connection.prepareStatement("update " + tableName + " set " + columnName + " = ? where " + idColumn + " = ?")) {
                            updateStatement.setString(1, replaced);
                            updateStatement.setLong(2, id);
                            updatedCount += updateStatement.executeUpdate();
                        }
                    }
                }
            }
        }

        return updatedCount;
    }

    private int rewriteLegacyLocalTextColumn(Connection connection, String tableName, String idColumn, String textColumn, String folderType) throws SQLException {
        String query = "select " + idColumn + ", " + textColumn + " from " + tableName + " where " + textColumn + " like ?";
        int updatedCount = 0;

        try (PreparedStatement statement = connection.prepareStatement(query)) {
            statement.setString(1, "%/uploads/%");
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    long id = resultSet.getLong(idColumn);
                    String current = resultSet.getString(textColumn);
                    if (current == null) {
                        continue;
                    }

                    String replaced = replaceLegacyLocalUploads(current, folderType);
                    if (!current.equals(replaced)) {
                        try (PreparedStatement updateStatement = connection.prepareStatement("update " + tableName + " set " + textColumn + " = ? where " + idColumn + " = ?")) {
                            updateStatement.setString(1, replaced);
                            updateStatement.setLong(2, id);
                            updatedCount += updateStatement.executeUpdate();
                        }
                    }
                }
            }
        }

        return updatedCount;
    }

    private String replaceLegacyLocalUploads(String source, String folderType) {
        if (source == null || source.isBlank()) {
            return source;
        }

        Pattern pattern = Pattern.compile("https?://(?:localhost|127\\.0\\.0\\.1):8080/uploads/([^\"'\\s>]+)");
        Matcher matcher = pattern.matcher(source);
        StringBuffer buffer = new StringBuffer();

        while (matcher.find()) {
            String filename = matcher.group(1);
            String publicUrl = buildPublicS3Url(folderType + "/" + filename);
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(publicUrl));
        }

        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private int rewriteExactViewColumn(Connection connection, String tableName, String idColumn, String columnName) throws SQLException {
        String query = "select " + idColumn + ", " + columnName + " from " + tableName + " where " + columnName + " like ?";
        int updatedCount = 0;

        try (PreparedStatement statement = connection.prepareStatement(query)) {
            statement.setString(1, "%/upload/view?key=%");
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    long id = resultSet.getLong(idColumn);
                    String current = resultSet.getString(columnName);
                    String replaced = replaceViewUrlsWithPublicUrls(current);
                    if (!current.equals(replaced)) {
                        try (PreparedStatement updateStatement = connection.prepareStatement("update " + tableName + " set " + columnName + " = ? where " + idColumn + " = ?")) {
                            updateStatement.setString(1, replaced);
                            updateStatement.setLong(2, id);
                            updatedCount += updateStatement.executeUpdate();
                        }
                    }
                }
            }
        }

        return updatedCount;
    }

    private int rewriteTextColumnWithViewUrls(Connection connection, String tableName, String idColumn, String textColumn) throws SQLException {
        String query = "select " + idColumn + ", " + textColumn + " from " + tableName + " where " + textColumn + " like ?";
        int updatedCount = 0;

        try (PreparedStatement statement = connection.prepareStatement(query)) {
            statement.setString(1, "%/upload/view?key=%");
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    long id = resultSet.getLong(idColumn);
                    String current = resultSet.getString(textColumn);
                    String replaced = replaceViewUrlsWithPublicUrls(current);
                    if (!current.equals(replaced)) {
                        try (PreparedStatement updateStatement = connection.prepareStatement("update " + tableName + " set " + textColumn + " = ? where " + idColumn + " = ?")) {
                            updateStatement.setString(1, replaced);
                            updateStatement.setLong(2, id);
                            updatedCount += updateStatement.executeUpdate();
                        }
                    }
                }
            }
        }

        return updatedCount;
    }

    private String replaceViewUrlsWithPublicUrls(String source) {
        if (source == null || source.isBlank()) {
            return source;
        }

        Pattern pattern = Pattern.compile("(?:https?://[^\"'\\s>]+)?/upload/view\\?key=([^&\"'\\s>]+)");
        Matcher matcher = pattern.matcher(source);
        StringBuffer buffer = new StringBuffer();

        while (matcher.find()) {
            String key = URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8);
            String publicUrl = buildPublicS3Url(key);
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(publicUrl));
        }

        matcher.appendTail(buffer);
        return buffer.toString();
    }

    // profile_image_url 같이 한 칸짜리 URL 컬럼을 그대로 치환하는 용도임
    private int updateExactColumnValues(Connection connection, String tableName, String columnName, List<String> oldValues, String newValue) throws SQLException {
        if (oldValues.isEmpty()) {
            return 0;
        }

        String placeholders = oldValues.stream().map(value -> "?").collect(Collectors.joining(", "));
        String sql = "update " + tableName + " set " + columnName + " = ? where " + columnName + " in (" + placeholders + ")";

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, newValue);
            for (int index = 0; index < oldValues.size(); index++) {
                statement.setString(index + 2, oldValues.get(index));
            }
            return statement.executeUpdate();
        }
    }

    // 본문처럼 긴 텍스트 안에 URL이 박혀 있는 경우를 찾아서 바꾸는 용도임
    private int updateTextColumn(Connection connection, String tableName, String idColumn, String textColumn, List<String> oldValues, String newValue) throws SQLException {
        if (oldValues.isEmpty()) {
            return 0;
        }

        String query = "select " + idColumn + ", " + textColumn + " from " + tableName + " where " + textColumn + " is not null";
        int updatedCount = 0;

        try (PreparedStatement selectStatement = connection.prepareStatement(query);
             ResultSet resultSet = selectStatement.executeQuery()) {
            while (resultSet.next()) {
                long id = resultSet.getLong(idColumn);
                String originalText = resultSet.getString(textColumn);
                if (originalText == null) {
                    continue;
                }

                String replacedText = replaceAllVariants(originalText, oldValues, newValue);
                if (!originalText.equals(replacedText)) {
                    String updateSql = "update " + tableName + " set " + textColumn + " = ? where " + idColumn + " = ?";
                    try (PreparedStatement updateStatement = connection.prepareStatement(updateSql)) {
                        updateStatement.setString(1, replacedText);
                        updateStatement.setLong(2, id);
                        updatedCount += updateStatement.executeUpdate();
                    }
                }
            }
        }

        return updatedCount;
    }

    // 여러 로컬 URL 형태를 한 번에 새 S3 URL로 바꿈
    private String replaceAllVariants(String source, List<String> oldValues, String newValue) {
        String result = source;
        for (String oldValue : oldValues) {
            result = result.replace(oldValue, newValue);
        }
        return result;
    }

    // 이관 결과를 담는 간단한 카운터임
    private static class MigrationCounts {
        private int updatedMembers;
        private int updatedPosts;
        private int updatedComments;
    }

    private Path resolveLocalUploadPath() {
        Path configuredPath = Paths.get(localUploadDir);
        if (configuredPath.isAbsolute()) {
            return configuredPath;
        }
        return Paths.get(System.getProperty("user.dir"), localUploadDir);
    }

    private Map<String, String> migrateSingleLocalFile(Path filePath, boolean deleteAfterUpload) {
        String filename = filePath.getFileName().toString();
        String contentType;
        try {
            contentType = Files.probeContentType(filePath);
        } catch (IOException e) {
            contentType = null;
        }

        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 이관 가능합니다: " + filename);
        }

        String ext = "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex >= 0) {
            ext = filename.substring(dotIndex);
        }

        List<String> targetFolders = detectTargetFolders(filename);
        Map<String, String> urlsByFolder = new LinkedHashMap<>();

        try {
            for (String folderType : targetFolders) {
                String newFilename = UUID.randomUUID() + ext;
                String folder = normalizeFolderType(folderType);
                String key = folder + "/" + newFilename;

                PutObjectRequest request = PutObjectRequest.builder()
                        .bucket(uploadBucket)
                        .key(key)
                        .contentType(contentType)
                        .build();

                try (InputStream inputStream = Files.newInputStream(filePath)) {
                    s3Client.putObject(request, RequestBody.fromInputStream(inputStream, Files.size(filePath)));
                }

                urlsByFolder.put(folder, buildPublicS3Url(key));
            }

            if (deleteAfterUpload) {
                Files.deleteIfExists(filePath);
            }

            return urlsByFolder;
        } catch (IOException e) {
            throw new IllegalStateException("파일 이관에 실패했습니다: " + filename, e);
        }
    }

    // DB 참조를 보고 어떤 폴더로 옮길지 결정함. 아무 데도 안 쓰인 파일이면 게시물 폴더로 보냄
    private List<String> detectTargetFolders(String filename) {
        List<String> variants = buildLocalUrlVariants(filename);

        try (Connection connection = dataSource.getConnection()) {
            boolean usedInProfile = hasAnyReference(connection, "members", "profile_image_url", variants, false);
            boolean usedInPostContent = hasAnyReference(connection, "post_tbl", "content", variants, true);
            boolean usedInCommentContent = hasAnyReference(connection, "comment_tbl", "content", variants, true);

            List<String> folders = new ArrayList<>();
            if (usedInProfile) {
                folders.add(USER_IMAGE_FOLDER);
            }
            if (usedInPostContent || usedInCommentContent) {
                folders.add(POST_IMAGE_FOLDER);
            }
            if (folders.isEmpty()) {
                folders.add(POST_IMAGE_FOLDER);
            }
            return folders;
        } catch (SQLException e) {
            throw new IllegalStateException("이관 대상을 판별하는 중 DB 조회에 실패했습니다.", e);
        }
    }

    // 특정 컬럼에 로컬 경로가 하나라도 있는지 확인함
    private boolean hasAnyReference(Connection connection, String tableName, String columnName, List<String> variants, boolean useLike) throws SQLException {
        if (variants.isEmpty()) {
            return false;
        }

        String conditions = variants.stream()
                .map(value -> useLike ? columnName + " like ?" : columnName + " = ?")
                .collect(Collectors.joining(" or "));
        String sql = "select 1 from " + tableName + " where " + columnName + " is not null and (" + conditions + ") limit 1";

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < variants.size(); index++) {
                String value = variants.get(index);
                statement.setString(index + 1, useLike ? "%" + value + "%" : value);
            }
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        }
    }

    private String normalizeFolderType(String folderType) {
        if (folderType == null || folderType.isBlank()) {
            return POST_IMAGE_FOLDER;
        }

        String normalized = folderType.trim().toLowerCase();
        return switch (normalized) {
            case "user", "profile", "user-images", "profile-images" -> USER_IMAGE_FOLDER;
            case "post", "feed", "post-images" -> POST_IMAGE_FOLDER;
            case "chat", "chat-images" -> CHAT_IMAGE_FOLDER;
            default -> POST_IMAGE_FOLDER;
        };
    }
}
