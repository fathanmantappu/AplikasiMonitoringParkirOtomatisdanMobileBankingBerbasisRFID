# [MILIK BACKEND B] Logika transaksi gerbang: masuk dan keluar.
#
# Prinsip keamanan dan konsistensi:
#   1. Semua perubahan data dalam SATU database transaction (atomik).
#      Gagal di tengah  -> ROLLBACK -> saldo dan riwayat tetap seperti semula.
#   2. Baris kartu dikunci (SELECT ... FOR UPDATE) -> dua request bersamaan
#      untuk kartu yang sama diproses bergantian, bukan berbarengan.
#   3. ref_id "EXIT-<id sesi>" bersifat UNIQUE + sesi yang sudah 'closed'
#      tidak bisa ditutup lagi -> tidak mungkin potong saldo dua kali.
#   4. Penulisan security_logs memakai koneksi terpisah dan dilakukan SETELAH
#      transaksi selesai, jadi log tetap ada walau transaksi di-rollback.
import pymysql

from ..config import Config
from ..db import transaction
from ..timeutil import now_wib
from .card_service import cek_kartu, simpan_last_scan
from .log_service import catat
from .tarif import hitung_tarif


# ---------- bentuk balasan (sesuai Protokol API) ----------
def _hasil(status, reason, balance=None, fee=0):
    return {"status": status, "reason": reason, "balance": balance, "fee": fee}


def _allow(balance, fee=0):
    return _hasil("allow", "OK", balance, fee)


def _deny(reason, balance=None, fee=0):
    return _hasil("deny", reason, balance, fee)


# ---------- pemeriksaan awal kartu (di luar transaksi) ----------
def _validasi_kartu(uid, ip):
    """Kembalikan (card, penolakan). penolakan = None jika kartu sah dan aktif."""
    card = cek_kartu(uid)                      # fungsi milik Backend A
    if card is None:
        simpan_last_scan(uid)                  # supaya admin bisa mendaftarkannya
        catat("UNKNOWN_CARD", f"UID {uid}", ip)
        return None, _deny("KARTU_TIDAK_DIKENAL")
    if card["status"] != "active":
        catat("BLOCKED_CARD", f"UID {uid}", ip)
        return None, _deny("KARTU_DIBLOKIR", card["balance"])
    return card, None


# =====================================================================
#  MASUK
# =====================================================================
def proses_masuk(uid, ip=None):
    card, tolak = _validasi_kartu(uid, ip)
    if tolak:
        return tolak

    with transaction() as cur:
        hasil, log = _masuk_tx(cur, card)
    if log:
        catat(log[0], log[1], ip)
    return hasil


def _masuk_tx(cur, card):
    # Kunci baris kartu, ambil data terbaru
    cur.execute("SELECT balance, status FROM cards WHERE id = %s FOR UPDATE", (card["id"],))
    fresh = cur.fetchone()
    if fresh["status"] != "active":
        return _deny("KARTU_DIBLOKIR", fresh["balance"]), ("BLOCKED_CARD", f"UID {card['uid']}")

    # Masuk dua kali tanpa keluar -> tolak
    cur.execute(
        "SELECT id FROM parking_sessions WHERE card_id = %s AND status = 'open' FOR UPDATE",
        (card["id"],),
    )
    if cur.fetchone():
        return _deny("SUDAH_MASUK", fresh["balance"]), None

    # (Opsional) saldo minimal untuk boleh masuk
    if Config.ENTRY_MIN_BALANCE > 0 and fresh["balance"] < Config.ENTRY_MIN_BALANCE:
        return _deny("SALDO_KURANG", fresh["balance"], Config.ENTRY_MIN_BALANCE), None

    cur.execute(
        "INSERT INTO parking_sessions (card_id, entry_time, status) VALUES (%s, %s, 'open')",
        (card["id"], now_wib()),
    )
    return _allow(fresh["balance"], 0), None


# =====================================================================
#  KELUAR
# =====================================================================
def proses_keluar(uid, ip=None):
    card, tolak = _validasi_kartu(uid, ip)
    if tolak:
        return tolak

    try:
        with transaction() as cur:
            hasil, log = _keluar_tx(cur, card)
    except pymysql.err.IntegrityError:
        # Sabuk pengaman: ref_id UNIQUE menolak potongan kedua
        hasil = _deny("DUPLIKAT")
        log = ("DUPLICATE_EXIT", f"UID {uid}: ref_id bentrok")

    if log:
        catat(log[0], log[1], ip)
    return hasil


def _keluar_tx(cur, card):
    # 1. Kunci baris kartu
    cur.execute("SELECT balance, status FROM cards WHERE id = %s FOR UPDATE", (card["id"],))
    fresh = cur.fetchone()
    if fresh["status"] != "active":
        return _deny("KARTU_DIBLOKIR", fresh["balance"]), ("BLOCKED_CARD", f"UID {card['uid']}")

    sekarang = now_wib()

    # 2. Cari sesi yang masih terbuka
    cur.execute(
        "SELECT id, entry_time FROM parking_sessions "
        "WHERE card_id = %s AND status = 'open' "
        "ORDER BY entry_time DESC LIMIT 1 FOR UPDATE",
        (card["id"],),
    )
    sesi = cur.fetchone()

    if sesi is None:
        # Apakah ini request ulang sesaat setelah keluar sukses?
        cur.execute(
            "SELECT exit_time FROM parking_sessions "
            "WHERE card_id = %s AND status = 'closed' "
            "ORDER BY exit_time DESC LIMIT 1",
            (card["id"],),
        )
        terakhir = cur.fetchone()
        if terakhir and terakhir["exit_time"] and \
                (sekarang - terakhir["exit_time"]).total_seconds() <= Config.DUPLICATE_WINDOW_SEC:
            return _deny("DUPLIKAT", fresh["balance"]), \
                ("DUPLICATE_EXIT", f"UID {card['uid']}: keluar diulang")
        return _deny("TIDAK_ADA_SESI", fresh["balance"]), \
            ("EXIT_WITHOUT_ENTRY", f"UID {card['uid']}: keluar tanpa catatan masuk")

    # 3. Hitung tarif dan cek saldo
    tarif = hitung_tarif(sesi["entry_time"], sekarang)
    saldo_lama = fresh["balance"]
    if saldo_lama < tarif:
        # Tidak ada yang diubah: saldo tetap, sesi tetap open
        return _deny("SALDO_KURANG", saldo_lama, tarif), None

    saldo_baru = saldo_lama - tarif

    # 4. Potong saldo
    cur.execute("UPDATE cards SET balance = %s WHERE id = %s", (saldo_baru, card["id"]))

    # Titik uji T10: gagal SENGAJA setelah saldo diubah, sebelum ledger ditulis.
    # Hasil yang benar: ROLLBACK, saldo kembali ke saldo_lama.
    if Config.SIMULATE_FAIL:
        raise RuntimeError("SIMULATE_FAIL aktif: gagal sengaja di tengah transaksi")

    # 5. Tulis ledger (ref_id UNIQUE = anti potong ganda)
    cur.execute(
        "INSERT INTO transactions "
        "(card_id, type, amount, balance_before, balance_after, ref_id, performed_by, status, created_at) "
        "VALUES (%s, 'parking_fee', %s, %s, %s, %s, NULL, 'success', %s)",
        (card["id"], tarif, saldo_lama, saldo_baru, f"EXIT-{sesi['id']}", sekarang),
    )

    # 6. Tutup sesi (hanya jika masih open)
    cur.execute(
        "UPDATE parking_sessions SET exit_time = %s, fee = %s, status = 'closed' "
        "WHERE id = %s AND status = 'open'",
        (sekarang, tarif, sesi["id"]),
    )
    if cur.rowcount != 1:
        raise RuntimeError("Sesi sudah tidak berstatus open")  # -> ROLLBACK

    return _allow(saldo_baru, tarif), None
