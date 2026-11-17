# Aplikasi Monitoring Parkir Otomatis dan Mobile Banking Berbasis RFID

Proyek e-Money RFID/NFC gerbang parkir kampus (monorepo: database, backend Flask, frontend, firmware ESP32, postman, evidence).

## Cara menjalankan
1. Jalankan MySQL/XAMPP
2. `mysql -u root -p < database/schema.sql`
   `mysql -u root -p < database/db_user.sql`
   `mysql -u root -p emoney < database/seed.sql`
3. `cd backend`
   `python -m venv venv` lalu aktifkan venv
   `pip install -r requirements.txt`
   salin `.env.example` menjadi `.env`, isi nilainya
   `python scripts/seed_admin.py`
   `flask --app run run --host 0.0.0.0 --port 5000`
4. Buka `frontend/index.html` (atau disajikan oleh Flask)
5. Upload firmware ke ESP32 setelah menyalin `secrets.example.h` menjadi `secrets.h` dan mengisinya

Struktur lengkap: lihat `docs/10_Project_Structure.md`.
