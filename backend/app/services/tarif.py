# [MILIK BACKEND B] Aturan tarif parkir. Fungsi murni: mudah diuji tanpa database.
#
# Aturan (usulan, sepakati dengan tim):
#   - Durasi dibulatkan KE ATAS per jam, minimal 1 jam
#   - Jam pertama   : TARIF_JAM_PERTAMA     (default Rp2.000)
#   - Jam berikutnya: TARIF_JAM_BERIKUTNYA  (default +Rp1.000 per jam)
#   - Maksimum per blok 24 jam: TARIF_MAKS_HARIAN (default Rp5.000)
from math import ceil

from ..config import Config


def hitung_tarif(
    masuk,
    keluar,
    jam_pertama=Config.TARIF_JAM_PERTAMA,
    jam_berikutnya=Config.TARIF_JAM_BERIKUTNYA,
    maks_harian=Config.TARIF_MAKS_HARIAN,
):
    detik = max(0, (keluar - masuk).total_seconds())
    total_jam = max(1, ceil(detik / 3600))

    hari_penuh, sisa_jam = divmod(total_jam, 24)
    tarif = hari_penuh * maks_harian
    if sisa_jam > 0:
        tarif += min(jam_pertama + (sisa_jam - 1) * jam_berikutnya, maks_harian)
    return tarif
