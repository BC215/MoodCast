-- 신고 및 제재 관리 기능에서 신고 처리 결과를 저장하기 위한 SQL입니다.
-- 운영/RDS DB에는 한 번만 직접 실행해야 합니다.
-- 이미 같은 컬럼이나 인덱스가 있다면 중복 실행하지 마세요.

ALTER TABLE report
  ADD COLUMN process_result VARCHAR(30) NULL AFTER report_status;

ALTER TABLE report
  ADD INDEX idx_report_result_created (process_result, created_at);
