# MoodCast

## 1. 프로젝트 소개

| 항목       | 내용                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| 프로젝트명 | MoodCast                                                                                 |
| 소개       | 사용자의 감정, 상태, 관심사를 기반으로 게시글을 작성하고 공유하는 감성 SNS 플랫폼        |
| 핵심 목표  | 감정 기반 게시글 작성, 피드 탐색, 공감, 댓글, 채팅, 알림 기능을 통해 사용자 간 소통 제공 |
| 개발 형태  | 부트캠프 팀 프로젝트                                                                     |
| 개발 인원  | 4명                                                                                      |
| 개발 기간  | 2026.05 ~ 2026.06                                                                        |

MoodCast는 단순 게시판이 아니라, 사용자가 현재 감정과 상태를 선택해 게시글을 작성하고 다른 사용자와 좋아요, 댓글, 팔로우, 채팅으로 연결되는 감성 기반 소셜 서비스입니다.

---

## 2. 주요 기능

### 사용자 기능

| 기능                      | 설명                                      |
| ------------------------- | ----------------------------------------- |
| 회원가입                  | 이메일 또는 소셜 계정을 기반으로 회원가입 |
| 로그인 / 로그아웃         | 일반 로그인과 세션 종료 기능 제공         |
| 프로필 조회 및 수정       | 사용자 프로필 정보 확인 및 편집           |
| 감정 선택                 | 게시글 작성 시 현재 감정과 상태 선택      |
| 게시글 작성 / 수정 / 삭제 | 텍스트와 이미지를 포함한 게시글 관리      |
| 이미지 업로드             | 게시글 및 프로필 이미지 업로드            |
| 전체 피드 조회            | 최신 게시글을 한눈에 확인                 |
| 감정별 피드 조회          | 선택한 감정 기준으로 게시글 필터링        |
| 댓글 작성 / 수정 / 삭제   | 게시글에 대한 의견 작성 및 관리           |
| 좋아요 / 감정 공감        | 게시글에 대한 공감 표현                   |
| 팔로우 / 팔로잉           | 관심 사용자 구독 및 관계 형성             |
| 알림 조회                 | 좋아요, 댓글, 팔로우 알림 확인            |
| 1:1 채팅                  | 사용자 간 실시간 대화                     |

### 관리자 기능

| 기능             | 설명                         |
| ---------------- | ---------------------------- |
| 회원 관리        | 사용자 목록 확인 및 관리     |
| 게시글 관리      | 게시글 상태 및 노출 관리     |
| 신고 게시글 관리 | 신고된 게시글 처리 및 검토   |
| 공지 / 배너 관리 | 서비스 공지와 배너 노출 관리 |

---

## 3. 기술 스택

### Frontend

| 기술         | 설명                        |
| ------------ | --------------------------- |
| React        | UI 구성 및 상태 기반 렌더링 |
| Vite         | 빠른 개발 환경과 빌드 도구  |
| MUI          | UI 컴포넌트 및 스타일링     |
| Axios        | API 통신                    |
| React Router | 라우팅 처리                 |

### Backend

| 기술              | 설명                               |
| ----------------- | ---------------------------------- |
| Spring Boot       | REST API 및 서버 애플리케이션 구성 |
| Java 17           | 백엔드 개발 언어                   |
| MyBatis           | DB 접근 및 쿼리 매핑               |
| MySQL             | 관계형 데이터 저장소               |
| Lombok            | 보일러플레이트 코드 감소           |
| WebSocket / STOMP | 실시간 채팅 및 알림 처리           |

### Infra / Deploy

| 기술           | 설명                     |
| -------------- | ------------------------ |
| AWS EC2        | 백엔드 서버 배포         |
| AWS RDS        | 운영 데이터베이스        |
| Vercel         | 프론트엔드 배포          |
| GitHub Actions | CI/CD 자동화             |
| Docker         | 배포 및 실행 환경 표준화 |

---

## 4. 시스템 구조

```text
사용자
  └─> React Frontend
        └─> Axios API 요청
              └─> Spring Boot Backend
                    └─> MyBatis
                          └─> MySQL RDS
```

```text
사용자
  └─> WebSocket / STOMP
        └─> Spring Boot Backend
              └─> MySQL 저장
```

```text
사용자
  └─> React Frontend
        └─> 이미지 업로드 요청
              └─> Spring Boot Backend
                    └─> AWS S3 저장
                          └─> 이미지 URL 반환 및 화면 표시
```

---

## 5. ERD 주요 테이블

| 테이블명           | 설명                 |
| ------------------ | -------------------- |
| `user_tbl`         | 사용자 정보          |
| `post_tbl`         | 게시글 정보          |
| `mood_tbl`         | 감정 정보            |
| `comment_tbl`      | 댓글 정보            |
| `like_tbl`         | 좋아요 정보          |
| `follow_tbl`       | 팔로우 정보          |
| `hashtag_tbl`      | 해시태그 정보        |
| `post_hashtag_tbl` | 게시글-해시태그 매핑 |
| `post_image_tbl`   | 게시글 이미지        |
| `notification_tbl` | 알림 정보            |
| `chat_tbl`         | 1:1 채팅 메시지      |
| `report_tbl`       | 신고 정보            |

---

## 6. 주요 기능 상세 설명

### 감정 기반 게시글 작성

사용자가 게시글 작성 시 감정을 선택하고, 선택한 감정은 게시글 카드에 태그 형태로 표시됩니다.  
이 감정 정보는 피드 노출과 감정별 필터링에도 활용됩니다.

### 피드 기능

전체 게시글을 최신순으로 조회할 수 있으며, 감정별 필터링을 통해 원하는 분위기의 게시글만 탐색할 수 있습니다.  
게시글 카드에는 이미지, 좋아요 수, 댓글 수가 함께 표시됩니다.

### 댓글 기능

게시글 상세 화면 또는 댓글 모달에서 댓글을 작성, 수정, 삭제할 수 있습니다.  
댓글 작성자만 수정 및 삭제할 수 있도록 권한을 제한하여 데이터 정합성을 유지했습니다.

### 좋아요 기능

사용자는 게시글에 좋아요를 누를 수 있으며, 중복 좋아요를 방지하도록 처리했습니다.  
좋아요 수는 화면에 즉시 반영되어 사용자 반응을 빠르게 확인할 수 있습니다.

### 알림 기능

내 게시글에 좋아요가 눌렸을 때, 댓글이 작성되었을 때, 팔로우가 발생했을 때 알림이 생성됩니다.  
이를 통해 사용자 간 상호작용을 놓치지 않도록 구성했습니다.

### 채팅 기능

사용자 간 1:1 채팅 기능을 제공합니다.  
초기에는 REST API 기반으로 메시지를 저장하고 조회했으며, 이후 WebSocket / STOMP 구조를 적용해 실시간 송수신이 가능하도록 확장했습니다.

### 관리자 기능

사용자 관리, 게시글 관리, 신고 게시글 관리, 공지 및 배너 관리를 통해 서비스 운영 기능을 제공합니다.

---

## 7. 실행 방법

### Frontend 실행 방법

```bash
cd frontend
npm install
npm run dev
```

### Backend 실행 방법

```bash
cd backend
./mvnw spring-boot:run
```

또는

```bash
cd backend
mvn spring-boot:run
```

---

## 8. 환경 변수

### Frontend `.env` 예시

```dotenv
VITE_BACKSERVER=http://localhost:8080
```

### Backend `application.properties` 예시

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/moodcast
spring.datasource.username=YOUR_DB_USERNAME
spring.datasource.password=YOUR_DB_PASSWORD
mybatis.mapper-locations=classpath:/mapper/**/*.xml
mybatis.type-aliases-package=com.moodcast
```

실제 비밀번호나 민감 정보는 README에 포함하지 않고 별도 환경 변수 파일 또는 보안 저장소에서 관리합니다.

---

## 9. API 예시

| 기능             | API                                 |
| ---------------- | ----------------------------------- |
| 로그인           | `POST /api/auth/login`              |
| 회원가입         | `POST /api/auth/register`           |
| 게시글 목록 조회 | `GET /api/posts`                    |
| 게시글 작성      | `POST /api/posts`                   |
| 게시글 수정      | `PUT /api/posts/{postId}`           |
| 게시글 삭제      | `DELETE /api/posts/{postId}`        |
| 댓글 작성        | `POST /api/posts/{postId}/comments` |
| 좋아요           | `POST /api/posts/{postId}/likes`    |
| 알림 조회        | `GET /api/notifications`            |
| 채팅 메시지 조회 | `GET /api/chat/{userId}`            |
| 채팅 메시지 전송 | `POST /api/chat`                    |

---

## 10. 폴더 구조

```text
MoodCast
├─ frontend
│  ├─ src
│  │  ├─ components
│  │  ├─ pages
│  │  ├─ api
│  │  ├─ hooks
│  │  ├─ routes
│  │  └─ styles
│  └─ package.json
│
├─ backend
│  ├─ src/main/java/com/moodcast
│  │  ├─ auth
│  │  ├─ user
│  │  ├─ post
│  │  ├─ comment
│  │  ├─ chat
│  │  ├─ notification
│  │  └─ admin
│  ├─ src/main/resources
│  │  ├─ mapper
│  │  └─ application.properties
│  └─ pom.xml
│
└─ README.md
```

---

## 11. 트러블슈팅

### 이미지 비율 문제

게시글 이미지와 댓글 모달에서 이미지 비율이 깨지는 문제가 있었습니다.  
이미지 컨테이너와 `object-fit` 속성을 조정해 원본 비율은 유지하면서 UI가 깨지지 않도록 해결했습니다.

### 모바일 레이아웃 문제

모바일 화면에서 하단 메뉴가 화면 밖으로 밀리는 문제가 있었습니다.  
고정 하단 내비게이션과 콘텐츠 영역 하단 여백을 적용해 해결했습니다.

### 채팅 구조 개선

초기 채팅은 REST API 기반이라 실시간성이 부족했습니다.  
WebSocket / STOMP 구조를 추가해 실시간 송수신이 가능하도록 개선하고, DB 저장은 기존 채팅 로직을 재사용했습니다.

### 해시태그 구조 개선

게시글 테이블에 해시태그를 문자열로 저장하면 검색과 집계가 어려웠습니다.  
`hashtag_tbl`과 `post_hashtag_tbl`을 분리해 검색, 카운팅, 인기 해시태그 집계가 가능하도록 개선했습니다.

---

## 12. 팀원 역할

| 이름   | 담당                                                 |
| ------ | ---------------------------------------------------- |
| 이병창 | 프론트엔드 리드, 공통 UI, 피드, 게시글, 검색, 프로필 |
| 양찬이 | 백엔드 핵심, 인증, 계정 관리, 소셜 로그인, S3        |
| 성태경 | 실시간 통신, 채팅, 알림, 좋아요, 댓글                |
| 문건우 | 관리 시스템, 대시보드, 회원 관리, 신고, 통계         |

---

## 13. 향후 개선 사항

- 감정 통계 대시보드
- 감정 캘린더
- 게시글 추천 알고리즘
- 실시간 알림 강화
- 관리자 신고 처리 프로세스 고도화
- 테스트 코드 작성

---

## 14. 배포 주소 / GitHub 주소

| 항목     | 주소                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | [http://moodcast-frontend-s3-qqqq.s3-website.ap-northeast-2.amazonaws.com](http://moodcast-frontend-s3-qqqq.s3-website.ap-northeast-2.amazonaws.com) |
| Backend  | [https://your-backend-url.com](https://your-backend-url.com)                                                                                         |
| GitHub   | [https://github.com/BC215/MoodCast.git](https://github.com/BC215/MoodCast.git)                                                                       |
