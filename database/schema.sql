-- DRAF schema agar Backend B bisa dijalankan sekarang.
-- Pemilik resmi: Frontend + Database. Sepakati perubahan dengan tim.
-- Wajib InnoDB (transaksi dan penguncian baris). CHECK butuh MySQL 8.0.16+ / MariaDB 10.2+.

CREATE DATABASE IF NOT EXISTS emoney CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emoney;

CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','operator') NOT NULL DEFAULT 'operator'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cards (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  uid         VARCHAR(20) NOT NULL UNIQUE,
  owner_name  VARCHAR(100) NOT NULL,
  balance     INT NOT NULL DEFAULT 0,
  status      ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at  DATETIME NULL,
  CONSTRAINT chk_balance_nonneg CHECK (balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  card_id         INT NOT NULL,
  type            ENUM('topup','parking_fee') NOT NULL,
  amount          INT NOT NULL,
  balance_before  INT NOT NULL,
  balance_after   INT NOT NULL,
  ref_id          VARCHAR(64) NOT NULL UNIQUE,      -- anti potong/top-up ganda
  performed_by    INT NULL,                          -- admin yang top-up (NULL untuk potongan parkir)
  status          ENUM('success','failed') NOT NULL DEFAULT 'success',
  created_at      DATETIME NOT NULL,
  CONSTRAINT chk_amount_pos CHECK (amount > 0),
  CONSTRAINT fk_tx_card  FOREIGN KEY (card_id) REFERENCES cards(id),
  CONSTRAINT fk_tx_admin FOREIGN KEY (performed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parking_sessions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  card_id     INT NOT NULL,
  entry_time  DATETIME NOT NULL,
  exit_time   DATETIME NULL,
  fee         INT NULL,
  status      ENUM('open','closed') NOT NULL DEFAULT 'open',
  CONSTRAINT fk_sess_card FOREIGN KEY (card_id) REFERENCES cards(id),
  INDEX idx_sess_card_status (card_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  event       VARCHAR(100) NOT NULL,
  detail      TEXT NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL
) ENGINE=InnoDB;
