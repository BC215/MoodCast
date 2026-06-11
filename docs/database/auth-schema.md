# MoodCast Auth Schema Draft

작성일: 2026-05-18  
최종 수정: 2026-05-20

## 테이블 목록

- `members`
- `member_oauth_accounts`
- `terms`
- `member_terms_agreements`
- `auth_codes`

## 설계 메모

- `nickname`은 `NULL` 허용
- `password_hash`도 `NULL` 허용
- `phone`은 현재 UI 기준 `NOT NULL`
- 소셜 로그인은 `email`이 아니라 `provider_user_id` 기준
- 약관은 `terms`와 `member_terms_agreements`로 분리
- 인증코드는 회원가입 전에도 필요하므로 `auth_codes.member_id`는 `NULL` 허용
- 지금은 DB 제약을 과하게 걸지 않고, 서비스 구현을 진행하면서 필요한 제약을 조금씩 추가한다.

## 현재 DB에서 강제로 막지 않는 값

현재 SQL은 단순화를 우선해서 아래 값들을 DB `CHECK`로 강제하지 않는다.
이 값들은 우선 백엔드 서비스 로직에서 다루고, 필요해지면 나중에 DB 제약으로 보강한다.

- `provider`: `KAKAO` / `NAVER` / `GOOGLE`
- `terms_type`: `SERVICE` / `PRIVACY` / `MARKETING`
- `is_required`: `0` / `1`
- `is_active`: `0` / `1`
- `agreed`: `0` / `1`
- `target_type`: `EMAIL` / `PHONE`
- `purpose`: `SIGNUP` / `LOGIN` / `FIND_EMAIL` / `RESET_PASSWORD` / `CHANGE_EMAIL` / `CHANGE_PHONE`
- `attempt_count`: `0` 이상

## 회원가입 처리 흐름

1. 이메일 인증번호 발송
   - `auth_codes` insert
2. 이메일 인증 완료
   - `auth_codes.verified_at` update
3. 휴대폰 인증번호 발송
   - `auth_codes` insert
4. 휴대폰 인증 완료
   - `auth_codes.verified_at` update
5. 약관 동의 후 가입 완료
   - `members` insert
   - `member_terms_agreements` insert
   - `auth_codes.used_at` update

## 1. members

```sql
CREATE TABLE members (
  member_id BIGINT NOT NULL AUTO_INCREMENT,

  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,

  name VARCHAR(50) NOT NULL,
  nickname VARCHAR(50) NULL,
  phone VARCHAR(30) NOT NULL,

  profile_image_url VARCHAR(500) NULL,
  bio VARCHAR(300) NULL,

  email_verified TINYINT NOT NULL DEFAULT 0,
  phone_verified TINYINT NOT NULL DEFAULT 0,

  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

  last_login_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  deleted_at DATETIME(6) NULL,

  PRIMARY KEY (member_id),

  UNIQUE (email),
  UNIQUE (nickname),
  UNIQUE (phone)
);
```

## 2. member_oauth_accounts

소셜 로그인 연결 테이블.

```sql
CREATE TABLE member_oauth_accounts (
  oauth_account_id BIGINT NOT NULL AUTO_INCREMENT,
  member_id BIGINT NOT NULL,

  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,

  provider_email VARCHAR(255) NULL,
  provider_nickname VARCHAR(100) NULL,

  connected_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_login_at DATETIME(6) NULL,

  PRIMARY KEY (oauth_account_id),

  FOREIGN KEY (member_id) REFERENCES members(member_id),

  UNIQUE (provider, provider_user_id),
  UNIQUE (member_id, provider)
);
```

## 3. terms

약관 마스터 테이블.

```sql
CREATE TABLE terms (
  terms_id BIGINT NOT NULL AUTO_INCREMENT,

  terms_type VARCHAR(30) NOT NULL,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content MEDIUMTEXT NULL,

  is_required TINYINT NOT NULL DEFAULT 1,
  is_active TINYINT NOT NULL DEFAULT 1,

  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (terms_id),

  UNIQUE (terms_type, version)
);
```

## 4. member_terms_agreements

회원별 약관 동의 기록.

```sql
CREATE TABLE member_terms_agreements (
  agreement_id BIGINT NOT NULL AUTO_INCREMENT,
  member_id BIGINT NOT NULL,
  terms_id BIGINT NOT NULL,

  agreed TINYINT NOT NULL,
  agreed_at DATETIME(6) NULL,
  withdrawn_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (agreement_id),

  FOREIGN KEY (member_id) REFERENCES members(member_id),
  FOREIGN KEY (terms_id) REFERENCES terms(terms_id),

  UNIQUE (member_id, terms_id)
);
```

## 5. auth_codes

이메일 인증, 휴대폰 인증 공통 테이블.

```sql
CREATE TABLE auth_codes (
  auth_code_id BIGINT NOT NULL AUTO_INCREMENT,

  member_id BIGINT NULL,

  target_type VARCHAR(20) NOT NULL,
  target_value VARCHAR(255) NOT NULL,
  purpose VARCHAR(30) NOT NULL,

  code_hash VARCHAR(255) NOT NULL,

  expires_at DATETIME(6) NOT NULL,
  verified_at DATETIME(6) NULL,
  used_at DATETIME(6) NULL,

  attempt_count INT NOT NULL DEFAULT 0,

  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (auth_code_id),

  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

CREATE INDEX idx_auth_codes_lookup
ON auth_codes (target_type, target_value, purpose, created_at);

CREATE INDEX idx_auth_codes_member
ON auth_codes (member_id);
```
