-- Data uji untuk pengembangan Backend B.
-- GANTI UID di bawah dengan UID kartu aslimu (lihat di Serial Monitor ESP32).
USE emoney;

INSERT INTO cards (uid, owner_name, balance, status, created_at) VALUES
  ('A1B2C3D4', 'Kartu A (saldo cukup)',   20000, 'active',  NOW()),
  ('B2C3D4E5', 'Kartu B (saldo kosong)',      0, 'active',  NOW()),
  ('C3D4E5F6', 'Kartu C (diblokir)',      10000, 'blocked', NOW());
-- Kartu D = kartu yang SENGAJA tidak didaftarkan (uji KARTU_TIDAK_DIKENAL).
