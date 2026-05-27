from __future__ import annotations

import argparse

import torch


def export(model: torch.nn.Module, output: str, input_size: tuple[int, int, int, int]) -> None:
    model.eval()
    dummy = torch.randn(*input_size)
    torch.onnx.export(
        model,
        dummy,
        output,
        input_names=["input"],
        output_names=["embedding"],
        dynamic_axes={"input": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=13,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--arch", choices=["mobilefacenet", "minifasnet"], default="mobilefacenet")
    args = parser.parse_args()
    raise SystemExit("Load your trained architecture here, then call export(model, args.output, (1, 3, 112, 112)).")


if __name__ == "__main__":
    main()
