from __future__ import annotations

import pickle
import sqlite3
from pathlib import Path

import numpy as np

from utils.crypto import decrypt_blob, encrypt_blob

try:
    import faiss
except Exception:
    faiss = None


class FaceVectorStore:
    def __init__(self, db_path: Path, index_path: Path, dim: int):
        self.db_path = db_path
        self.index_path = index_path
        self.dim = dim
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, user_id TEXT UNIQUE, name TEXT, embedding BLOB NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        )
        self.conn.commit()
        self.index = self._load_index()
        self.ids = self._load_ids()

    def add_user(self, user_id: str, name: str, embedding: np.ndarray) -> None:
        blob = encrypt_blob(pickle.dumps(embedding.astype(np.float32)))
        self.conn.execute("INSERT OR REPLACE INTO users(user_id, name, embedding) VALUES (?, ?, ?)", (user_id, name, blob))
        self.conn.commit()
        self.rebuild()

    def search(self, embedding: np.ndarray, top_k: int = 5) -> list[dict]:
        embedding = embedding.astype(np.float32)[None]
        if self.index is not None and self.index.ntotal:
            scores, indices = self.index.search(embedding, top_k)
            return [self._row(self.ids[i], float(scores[0][rank])) for rank, i in enumerate(indices[0]) if i >= 0]
        rows = self.conn.execute("SELECT user_id, name, embedding FROM users").fetchall()
        results = []
        for user_id, name, blob in rows:
            candidate = pickle.loads(decrypt_blob(blob))
            score = float(np.dot(embedding[0], candidate))
            results.append({"user_id": user_id, "name": name, "score": score})
        return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]

    def rebuild(self) -> None:
        rows = self.conn.execute("SELECT user_id, embedding FROM users ORDER BY id").fetchall()
        self.ids = [r[0] for r in rows]
        vectors = np.array([pickle.loads(decrypt_blob(r[1])) for r in rows], dtype=np.float32) if rows else np.empty((0, self.dim), dtype=np.float32)
        if faiss:
            self.index = faiss.IndexFlatIP(self.dim)
            if len(vectors):
                self.index.add(vectors)
                faiss.write_index(self.index, str(self.index_path))
        else:
            self.index = None

    def _load_index(self):
        if faiss and self.index_path.exists():
            return faiss.read_index(str(self.index_path))
        return faiss.IndexFlatIP(self.dim) if faiss else None

    def _load_ids(self) -> list[str]:
        return [r[0] for r in self.conn.execute("SELECT user_id FROM users ORDER BY id").fetchall()]

    def _row(self, user_id: str, score: float) -> dict:
        row = self.conn.execute("SELECT user_id, name FROM users WHERE user_id=?", (user_id,)).fetchone()
        return {"user_id": row[0], "name": row[1], "score": score}
