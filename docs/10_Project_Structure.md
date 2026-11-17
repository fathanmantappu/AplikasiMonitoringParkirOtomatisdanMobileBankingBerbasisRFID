# Struktur Project

> Proyek: e-Money RFID/NFC gerbang parkir kampus
> Satu repositori Git (monorepo) berisi semua bagian, supaya semua peran bekerja di tempat yang sama.

## 1. Pohon folder

```
emoney-gate/
|-- README.md                      # cara menjalankan seluruh sistem
|-- .gitignore                     # .env, secrets.h, venv/, __pycache__/
|
|-- docs/                          # dokumen perencanaan (file .md)
|   |-- 05_Arsitektur_Frontend.md
|   |-- 06_Arsitektur_Backend.md
|   |-- 07_Protokol_API.md
|   |-- 08_User_Flow.md
|   |-- 09_Pembagian_Tugas.md
|   |-- 10_Project_Structure.md
|   `-- 11_SRS.md
|
|-- database/                      # milik Frontend + DB
|   |-- schema.sql                 # CREATE TABLE (InnoDB, CHECK, UNIQUE, FK)
|   |-- seed.sql                   # admin, operator, 3 kartu uji
|   |-- db_user.sql                # user app_user + GRANT terbatas
|   |-- check_balance.sql          # query pemeriksa konsistensi saldo
|   `-- erd.png
|
|-- backend/                       # milik Backend A dan B
|   |-- run.py                     # titik masuk Flask
|   |-- requirements.txt
|   |-- .env.example               # contoh konfigurasi (tanpa nilai rahasia)
|   |-- app/
|   |   |-- __init__.py            # create_app(), daftar blueprint, error handler
|   |   |-- config.py              # baca .env
|   |   |-- db.py                  # koneksi + helper transaksi            [bersama]
|   |   |-- responses.py           # format respons + kode error           [bersama]
|   |   |-- security.py            # api_key_required, jwt_required, role  [A]
|   |   |-- validators.py          # validasi UID, nominal, string         [A]
|   |   |-- routes/
|   |   |   |-- auth_routes.py     # /api/admin/login                      [A]
|   |   |   |-- card_routes.py     # /api/cards, /api/last-scan            [A]
|   |   |   |-- topup_routes.py    # /api/topup                            [A]
|   |   |   |-- gate_routes.py     # /api/gate/scan                        [B]
|   |   |   `-- report_routes.py   # transactions, sessions, security-logs [B/FE]
|   |   `-- services/
|   |       |-- auth_service.py    #                                       [A]
|   |       |-- card_service.py    # cek_kartu(), registrasi, blokir       [A]
|   |       |-- topup_service.py   #                                       [A]
|   |       |-- log_service.py     # tulis security_logs                   [A]
|   |       |-- gate_service.py    # proses_masuk, proses_keluar           [B]
|   |       `-- tarif.py           # hitung_tarif()                        [B]
|   |-- scripts/
|   |   |-- seed_admin.py          # buat akun admin awal (hash bcrypt)    [A]
|   |   |-- simulate_double_submit.py                                     [B]
|   |   `-- simulate_failure.md    # cara memakai SIMULATE_FAIL=1          [B]
|   `-- tests/
|       |-- test_tarif.py          # unit test hitung_tarif                [B]
|       |-- test_validators.py                                            [A]
|       `-- test_api_security.py   # 401, 403, nominal salah              [A]
|
|-- frontend/                      # milik Frontend + DB
|   |-- index.html                 # login
|   |-- dashboard.html
|   |-- cards.html                 # registrasi dan daftar kartu
|   |-- topup.html
|   |-- transactions.html
|   |-- sessions.html
|   |-- security-logs.html
|   `-- assets/
|       |-- css/style.css
|       `-- js/
|           |-- config.js          # API_BASE_URL
|           |-- api.js             # pembungkus fetch + token
|           |-- auth.js            # guard halaman, logout
|           |-- ui.js              # toast, tabel, format Rupiah/tanggal
|           |-- validators.js
|           `-- pages/             # satu JS per halaman
|               |-- login.js
|               |-- dashboard.js
|               |-- cards.js
|               |-- topup.js
|               |-- transactions.js
|               |-- sessions.js
|               `-- security-logs.js
|
|-- firmware/                      # milik Hardware
|   |-- gate_firmware/
|   |   |-- gate_firmware.ino      # program utama ESP32
|   |   `-- secrets.example.h      # contoh (SSID, password, API key, IP server)
|   |-- wiring.png                 # diagram rangkaian
|   `-- README.md                  # pin, library, cara upload
|
|-- postman/
|   `-- emoney-gate.postman_collection.json   # koleksi uji T1-T11
|
`-- evidence/                      # milik QA
    |-- test-results.md            # tabel hasil T1-T11
    |-- screenshots/               # 01_wiring.png, 02_baca_uid.png, ...
    |-- video/                     # rekaman demo
    `-- presentasi.pptx
```

Tanda `[A]`, `[B]`, `[bersama]` menunjukkan pemilik file. Berkas yang tidak diberi tanda mengikuti pemilik foldernya.

## 2. File yang tidak boleh masuk Git

| File | Alasan | Gantinya |
|------|--------|----------|
| `backend/.env` | Berisi password DB, JWT secret, API key | `.env.example` |
| `firmware/gate_firmware/secrets.h` | Berisi password WiFi dan API key | `secrets.example.h` |
| `venv/`, `__pycache__/` | File buatan lokal | - |
| Dump database berisi data asli | Tidak perlu dibagikan | `seed.sql` |

Isi `.gitignore` minimal:

```
.env
secrets.h
venv/
__pycache__/
*.pyc
.vscode/
```

## 3. Contoh `.env.example`

```
DB_HOST=localhost
DB_USER=app_user
DB_PASS=ganti_ini
DB_NAME=emoney
JWT_SECRET=ganti_dengan_string_acak_panjang
JWT_EXPIRE_MINUTES=60
DEVICE_API_KEY=ganti_dengan_kunci_perangkat
MAX_TOPUP=500000
TARIF_JAM_PERTAMA=2000
TARIF_JAM_BERIKUTNYA=1000
TARIF_MAKS_HARIAN=5000
TZ=Asia/Jakarta
SIMULATE_FAIL=0
```

## 4. Contoh `secrets.example.h`

```cpp
#pragma once
#define WIFI_SSID     "nama_wifi_2_4ghz"
#define WIFI_PASS     "password_wifi"
#define SERVER_URL    "http://192.168.1.10:5000/api/gate/scan"
#define DEVICE_API_KEY "samakan_dengan_env_backend"
#define GATE_MODE     "entry"   // atau "exit"
```

## 5. Alur data antar folder

```
firmware/ ---HTTP /api/gate/scan---> backend/ ---SQL---> database/
frontend/ ---HTTP /api/* + JWT-----> backend/ ---SQL---> database/
postman/  ---HTTP (pengujian)-----> backend/
evidence/ <---- screenshot, log, video dari semua bagian
```

## 6. Konvensi penamaan

| Hal | Aturan | Contoh |
|-----|--------|--------|
| File Python | `snake_case` | `gate_service.py` |
| Fungsi Python | `snake_case` | `hitung_tarif()` |
| File dan fungsi JavaScript | `kebab-case` untuk file, `camelCase` untuk fungsi | `security-logs.js`, `formatRupiah()` |
| Tabel dan kolom SQL | `snake_case`, tabel jamak | `parking_sessions`, `balance_after` |
| Endpoint | huruf kecil, `kebab-case` | `/api/security-logs` |
| Branch Git | `<peran>/<ringkasan>` | `be-b/proses-keluar-atomik` |
| Screenshot | `NN_deskripsi.png` | `04_topup_ditolak_401.png` |

## 7. Urutan membangun (agar tidak saling menunggu)

1. `database/schema.sql` dan `docs/07_Protokol_API.md` disetujui (hari 1)
2. `backend/app/__init__.py`, `config.py`, `db.py`, `responses.py` (kerangka bersama)
3. Backend A: `security.py`, `auth`, `card`, `topup`
4. Backend B: `tarif.py` (+ test), `gate_service.py`
5. Frontend: login, lalu halaman satu per satu
6. Firmware: baca UID dulu, lalu kirim ke endpoint
7. QA: jalankan `postman/` dan isi `evidence/`

## 8. Cara menjalankan seluruh sistem (untuk README)

```
1. Jalankan MySQL/XAMPP
2. mysql -u root -p < database/schema.sql
   mysql -u root -p < database/db_user.sql
   mysql -u root -p emoney < database/seed.sql
3. cd backend
   python -m venv venv  &&  aktifkan venv
   pip install -r requirements.txt
   salin .env.example menjadi .env, isi nilainya
   python scripts/seed_admin.py
   flask --app run run --host 0.0.0.0 --port 5000
4. Buka frontend/index.html (atau disajikan oleh Flask)
5. Upload firmware ke ESP32 setelah mengisi secrets.h
```
