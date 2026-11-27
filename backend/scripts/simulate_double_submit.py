"""Simulasi T8: request keluar dikirim BERSAMAAN, saldo harus terpotong SEKALI.

Contoh:
  python scripts/simulate_double_submit.py --key KUNCI_API --uid A1B2C3D4
  python scripts/simulate_double_submit.py --key KUNCI_API --uid A1B2C3D4 --n 5

Syarat: kartu terdaftar, aktif, dan saldo cukup untuk satu kali tarif.
"""
import argparse
import threading
import time

import requests


def kirim(url, key, uid, gate):
    r = requests.post(
        url,
        json={"uid": uid, "gate": gate},
        headers={"X-API-Key": key},
        timeout=10,
    )
    return r.status_code, r.json()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="http://127.0.0.1:5000/api/gate/scan")
    p.add_argument("--key", required=True)
    p.add_argument("--uid", required=True)
    p.add_argument("--n", type=int, default=2, help="jumlah request keluar bersamaan")
    p.add_argument("--skip-entry", action="store_true", help="lewati langkah masuk")
    a = p.parse_args()

    if not a.skip_entry:
        code, body = kirim(a.url, a.key, a.uid, "entry")
        print(f"[MASUK ] HTTP {code} -> {body}")
        time.sleep(1.5)   # beri durasi agar tarif terhitung

    barrier = threading.Barrier(a.n)
    hasil = []

    def worker(i):
        barrier.wait()    # semua thread menembak di detik yang sama
        code, body = kirim(a.url, a.key, a.uid, "exit")
        hasil.append((i, code, body))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(a.n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    print()
    for i, code, body in sorted(hasil, key=lambda x: x[0]):
        print(f"[KELUAR #{i}] HTTP {code} -> {body}")

    allow = sum(1 for _, _, b in hasil if b.get("status") == "allow")
    print()
    print(f"Jumlah 'allow': {allow}  (HARUS 1)")
    print("Cek juga di database: tabel transactions hanya boleh bertambah SATU baris parking_fee.")


if __name__ == "__main__":
    main()
