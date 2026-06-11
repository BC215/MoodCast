CREATE TABLE IF NOT EXISTS report (
  report_id BIGINT NOT NULL AUTO_INCREMENT,
  reporter_member_id BIGINT NOT NULL,
  post_id BIGINT NULL,
  comment_id BIGINT NULL,
  reason VARCHAR(500) NOT NULL,
  report_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  process_result VARCHAR(30) NULL,
  handled_memo VARCHAR(500) NULL,
  reviewed_at DATETIME(6) NULL,
  handled_at DATETIME(6) NULL,
  handled_by_member_id BIGINT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (report_id),
  KEY idx_report_reporter_member_id (reporter_member_id),
  KEY idx_report_post_id (post_id),
  KEY idx_report_comment_id (comment_id),
  KEY idx_report_status_created (report_status, created_at),
  KEY idx_report_status_reviewed (report_status, reviewed_at),
  KEY idx_report_result_created (process_result, created_at),
  KEY idx_report_handled_member (handled_by_member_id),
  CONSTRAINT fk_report_reporter_member
    FOREIGN KEY (reporter_member_id) REFERENCES members(member_id),
  CONSTRAINT fk_report_post
    FOREIGN KEY (post_id) REFERENCES post_tbl(post_id),
  CONSTRAINT fk_report_comment
    FOREIGN KEY (comment_id) REFERENCES comment_tbl(comment_id),
  CONSTRAINT fk_report_handled_member
    FOREIGN KEY (handled_by_member_id) REFERENCES members(member_id)
);
