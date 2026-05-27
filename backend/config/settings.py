from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    db_path: Path = BASE_DIR / "database" / "offline_faces.db"
    faiss_index_path: Path = BASE_DIR / "database" / "face_embeddings.index"
    model_dir: Path = BASE_DIR / "ai_models" / "weights"
    detector_model: Path = model_dir / "blazeface.onnx"
    recognition_model: Path = model_dir / "mobilefacenet.onnx"
    liveness_model: Path = model_dir / "minifasnet.onnx"
    embedding_dim: int = 128
    detection_confidence: float = 0.65
    verification_threshold: float = 0.42
    liveness_threshold: float = 0.72
    min_face_size: int = 80
    consensus_frames: int = 7
    consensus_pass_ratio: float = 0.65
    camera_index: int = 0


settings = Settings()
