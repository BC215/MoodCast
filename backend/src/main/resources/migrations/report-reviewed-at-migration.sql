-- 신고를 처음 검토한 시간을 저장하기 위한 SQL입니다.
-- 검토 중 목록은 이 값을 기준으로 최신순/오래된순 정렬합니다.
-- 운영/RDS DB에는 한 번만 직접 실행해야 합니다.

ALTER TABLE report
  ADD COLUMN reviewed_at DATETIME(6) NULL AFTER handled_memo;

ALTER TABLE report
  ADD INDEX idx_report_status_reviewed (report_status, reviewed_at);
