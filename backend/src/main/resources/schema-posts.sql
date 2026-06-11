-- 추가된 게시물 상호작용 테이블

CREATE TABLE IF NOT EXISTS post_like (
  post_like_id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (post_like_id),
  UNIQUE KEY uniq_post_member_like (post_id, member_id),
  FOREIGN KEY (post_id) REFERENCES post_tbl(post_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS comment_tbl (
  comment_id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  content TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
  PRIMARY KEY (comment_id),
  FOREIGN KEY (post_id) REFERENCES post_tbl(post_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS saved_post (
  saved_post_id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (saved_post_id),
  UNIQUE KEY uniq_post_member_saved (post_id, member_id),
  FOREIGN KEY (post_id) REFERENCES post_tbl(post_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS comment_mention_tbl (
  comment_mention_id BIGINT NOT NULL AUTO_INCREMENT,
  comment_id BIGINT NOT NULL,
  mentioned_user_id BIGINT NOT NULL,
  mention_text VARCHAR(50) NOT NULL,
  start_index INT NOT NULL,
  end_index INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_mention_id),
  KEY idx_comment_mention_comment_id (comment_id),
  KEY idx_comment_mention_user_id (mentioned_user_id),
  FOREIGN KEY (comment_id) REFERENCES comment_tbl(comment_id),
  FOREIGN KEY (mentioned_user_id) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS post_mention_tbl (
  post_mention_id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  mentioned_user_id BIGINT NOT NULL,
  mention_text VARCHAR(50) NOT NULL,
  start_index INT NOT NULL,
  end_index INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_mention_id),
  KEY idx_post_mention_post_id (post_id),
  KEY idx_post_mention_user_id (mentioned_user_id),
  FOREIGN KEY (post_id) REFERENCES post_tbl(post_id),
  FOREIGN KEY (mentioned_user_id) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS notification_tbl (
  notification_id BIGINT NOT NULL AUTO_INCREMENT,
  recipient_member_id BIGINT NOT NULL,
  sender_member_id BIGINT NULL,
  notification_type VARCHAR(30) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content VARCHAR(500) NULL,
  is_read CHAR(1) NOT NULL DEFAULT 'N',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (notification_id),
  KEY idx_notification_receiver (recipient_member_id),
  KEY idx_notification_target (target_type, target_id),
  FOREIGN KEY (recipient_member_id) REFERENCES members(member_id),
  FOREIGN KEY (sender_member_id) REFERENCES members(member_id)
);
