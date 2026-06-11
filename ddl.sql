-- MySQL dump 10.13  Distrib 9.6.0, for macos26.2 (arm64)
--
-- Host: moodcast.c14a6qcya97y.ap-northeast-2.rds.amazonaws.com    Database: moodcast
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `admin_action_logs`
--

DROP TABLE IF EXISTS `admin_action_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_action_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `admin_id` bigint NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `action_detail` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_codes`
--

DROP TABLE IF EXISTS `auth_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_codes` (
  `auth_code_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint DEFAULT NULL,
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`auth_code_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_message`
--

DROP TABLE IF EXISTS `chat_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_message` (
  `message_id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `sender_id` bigint NOT NULL,
  `content` text NOT NULL,
  `message_type` varchar(20) NOT NULL DEFAULT 'MESSAGE',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `deleted_yn` char(1) NOT NULL DEFAULT 'N',
  PRIMARY KEY (`message_id`),
  KEY `idx_chat_message_room_id` (`room_id`),
  KEY `idx_chat_message_sender_id` (`sender_id`),
  KEY `idx_chat_message_deleted_yn` (`deleted_yn`),
  CONSTRAINT `fk_chat_message_room` FOREIGN KEY (`room_id`) REFERENCES `chat_room` (`room_id`),
  CONSTRAINT `fk_chat_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `members` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_room`
--

DROP TABLE IF EXISTS `chat_room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_room` (
  `room_id` bigint NOT NULL AUTO_INCREMENT,
  `room_type` varchar(20) NOT NULL DEFAULT 'GROUP',
  `room_name` varchar(100) NOT NULL,
  `room_description` varchar(255) DEFAULT NULL,
  `created_by` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `deleted_yn` char(1) NOT NULL DEFAULT 'N',
  PRIMARY KEY (`room_id`),
  KEY `idx_chat_room_created_by` (`created_by`),
  KEY `idx_chat_room_deleted_yn` (`deleted_yn`),
  CONSTRAINT `fk_chat_room_created_by` FOREIGN KEY (`created_by`) REFERENCES `members` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_room_member`
--

DROP TABLE IF EXISTS `chat_room_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_room_member` (
  `room_member_id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `joined_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `hidden_at` datetime(6) DEFAULT NULL,
  `left_at` datetime(6) DEFAULT NULL,
  `last_read_at` datetime(6) DEFAULT NULL,
  `deleted_yn` char(1) NOT NULL DEFAULT 'N',
  `last_read_message_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`room_member_id`),
  UNIQUE KEY `uk_chat_room_member` (`room_id`,`member_id`),
  KEY `idx_chat_room_member_member_id` (`member_id`),
  KEY `idx_chat_room_member_deleted_yn` (`deleted_yn`),
  CONSTRAINT `fk_chat_room_member_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_chat_room_member_room` FOREIGN KEY (`room_id`) REFERENCES `chat_room` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_tbl`
--

DROP TABLE IF EXISTS `chat_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_tbl` (
  `chat_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_yn` tinyint NOT NULL DEFAULT '0',
  `sender_deleted_yn` tinyint NOT NULL DEFAULT '0',
  `sender_hidden_at` datetime(6) DEFAULT NULL,
  `receiver_hidden_at` datetime(6) DEFAULT NULL,
  `receiver_deleted_yn` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=276 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comment_mention_tbl`
--

DROP TABLE IF EXISTS `comment_mention_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_mention_tbl` (
  `comment_mention_id` bigint NOT NULL AUTO_INCREMENT,
  `comment_id` bigint NOT NULL,
  `mentioned_user_id` bigint NOT NULL,
  `mention_text` varchar(50) NOT NULL,
  `start_index` int NOT NULL,
  `end_index` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_mention_id`),
  KEY `idx_comment_mention_comment_id` (`comment_id`),
  KEY `idx_comment_mention_user_id` (`mentioned_user_id`),
  CONSTRAINT `comment_mention_tbl_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `comment_tbl` (`comment_id`),
  CONSTRAINT `comment_mention_tbl_ibfk_2` FOREIGN KEY (`mentioned_user_id`) REFERENCES `members` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comment_tbl`
--

DROP TABLE IF EXISTS `comment_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_tbl` (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `content` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `parent_comment_id` bigint DEFAULT NULL,
  PRIMARY KEY (`comment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emotion`
--

DROP TABLE IF EXISTS `emotion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emotion` (
  `emotion_id` bigint NOT NULL AUTO_INCREMENT,
  `emotion_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emotion_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emotion_icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emotion_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT NULL,
  `is_active` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Y',
  PRIMARY KEY (`emotion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `follow_tbl`
--

DROP TABLE IF EXISTS `follow_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `follow_tbl` (
  `follow_id` bigint NOT NULL AUTO_INCREMENT,
  `follower_member_id` bigint NOT NULL,
  `following_member_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`follow_id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hashtag`
--

DROP TABLE IF EXISTS `hashtag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hashtag` (
  `hashtag_id` bigint NOT NULL AUTO_INCREMENT,
  `hashtag` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `use_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`hashtag_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interest`
--

DROP TABLE IF EXISTS `interest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interest` (
  `interest_id` bigint NOT NULL AUTO_INCREMENT,
  `interest_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interest_icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Y',
  PRIMARY KEY (`interest_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_audit_logs`
--

DROP TABLE IF EXISTS `login_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_audit_logs` (
  `login_audit_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `provider` varchar(30) DEFAULT NULL,
  `login_type` varchar(30) NOT NULL,
  `success` tinyint(1) NOT NULL,
  `fail_reason` varchar(100) DEFAULT NULL,
  `ip_address` varchar(100) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`login_audit_id`),
  KEY `idx_login_audit_member_created` (`member_id`,`created_at`),
  KEY `idx_login_audit_email_created` (`email`,`created_at`),
  KEY `idx_login_audit_success_created` (`success`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=28704 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;