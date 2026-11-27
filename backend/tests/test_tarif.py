# Unit test hitung_tarif. Jalankan dari folder backend/:  pytest -v
from datetime import datetime, timedelta

import pytest

from app.services.tarif import hitung_tarif

MASUK = datetime(2026, 11, 16, 8, 0, 0)


def tarif_setelah(menit):
    # Parameter dikunci agar tes tidak bergantung pada isi .env
    return hitung_tarif(MASUK, MASUK + timedelta(minutes=menit), 2000, 1000, 5000)


@pytest.mark.parametrize(
    "menit, diharapkan, keterangan",
    [
        (0,        2000, "0 menit tetap kena tarif minimum"),
        (10,       2000, "10 menit = jam pertama"),
        (60,       2000, "tepat 1 jam"),
        (61,       3000, "1 jam 1 menit dibulatkan jadi 2 jam"),
        (120,      3000, "tepat 2 jam"),
        (180,      4000, "3 jam"),
        (300,      5000, "5 jam kena batas maksimum harian"),
        (24 * 60,  5000, "tepat 24 jam = 1 blok harian"),
        (24 * 60 + 1, 7000, "24 jam 1 menit = 1 blok + 1 jam"),
        (-5,       2000, "jam keluar lebih awal dari masuk (jam salah) tidak jadi negatif"),
    ],
)
def test_hitung_tarif(menit, diharapkan, keterangan):
    assert tarif_setelah(menit) == diharapkan, keterangan
