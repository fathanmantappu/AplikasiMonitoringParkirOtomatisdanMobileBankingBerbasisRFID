# [MILIK BACKEND B] Endpoint gerbang untuk ESP32: POST /api/gate/scan
import re

from flask import Blueprint, current_app, jsonify, request

from ..responses import error
from ..security import api_key_required
from ..services.gate_service import _deny, proses_keluar, proses_masuk
from ..services.log_service import catat

bp = Blueprint("gate", __name__, url_prefix="/api/gate")

UID_RE = re.compile(r"^[0-9A-F]{8,20}$")   # sesuai Protokol API


@bp.post("/scan")
@api_key_required
def scan():
    ip = request.remote_addr
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error("VALIDATION_ERROR", "Body harus berupa JSON", 400)

    uid = data.get("uid")
    gate = data.get("gate")

    if not isinstance(uid, str) or not UID_RE.match(uid.strip().upper()):
        catat("INVALID_INPUT", "UID tidak valid pada /api/gate/scan", ip)
        return error("VALIDATION_ERROR", "UID tidak valid", 400)
    if gate not in ("entry", "exit"):
        catat("INVALID_INPUT", "gate tidak valid pada /api/gate/scan", ip)
        return error("VALIDATION_ERROR", 'gate harus "entry" atau "exit"', 400)

    uid = uid.strip().upper()

    try:
        hasil = proses_masuk(uid, ip) if gate == "entry" else proses_keluar(uid, ip)
    except Exception:
        # Detail hanya di log server. Ke perangkat: deny, palang TIDAK dibuka.
        current_app.logger.exception("Gagal memproses gate/scan uid=%s gate=%s", uid, gate)
        hasil = _deny("ERROR_SISTEM")

    return jsonify(hasil), 200
