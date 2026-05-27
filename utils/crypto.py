from __future__ import annotations

import hashlib
import os
from pathlib import Path


KEY_PATH = Path(__file__).resolve().parents[1] / "database" / ".embedding_key"


def _load_key() -> bytes:
    env_key = os.environ.get("DATALAKE_EMBEDDING_KEY")
    if env_key:
        return hashlib.sha256(env_key.encode("utf-8")).digest()
    KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not KEY_PATH.exists():
        try:
            KEY_PATH.write_bytes(os.urandom(32))
            KEY_PATH.chmod(0o600)
        except PermissionError:
            demo_seed = f"datalake-3-demo-key:{KEY_PATH.parent}".encode("utf-8")
            return hashlib.sha256(demo_seed).digest()
    try:
        return hashlib.sha256(KEY_PATH.read_bytes()).digest()
    except PermissionError:
        demo_seed = f"datalake-3-demo-key:{KEY_PATH.parent}".encode("utf-8")
        return hashlib.sha256(demo_seed).digest()


def _keystream(length: int, nonce: bytes) -> bytes:
    key = _load_key()
    output = bytearray()
    counter = 0
    while len(output) < length:
        output.extend(hashlib.sha256(key + nonce + counter.to_bytes(8, "big")).digest())
        counter += 1
    return bytes(output[:length])


def encrypt_blob(data: bytes) -> bytes:
    nonce = os.urandom(16)
    stream = _keystream(len(data), nonce)
    cipher = bytes(a ^ b for a, b in zip(data, stream))
    tag = hashlib.sha256(_load_key() + nonce + cipher).digest()[:16]
    return b"DL30" + nonce + tag + cipher


def decrypt_blob(blob: bytes) -> bytes:
    if not blob.startswith(b"DL30"):
        return blob
    nonce = blob[4:20]
    tag = blob[20:36]
    cipher = blob[36:]
    expected = hashlib.sha256(_load_key() + nonce + cipher).digest()[:16]
    if expected != tag:
        raise ValueError("embedding_integrity_check_failed")
    stream = _keystream(len(cipher), nonce)
    return bytes(a ^ b for a, b in zip(cipher, stream))
