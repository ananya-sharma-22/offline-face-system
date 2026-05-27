from evaluation.metrics import far_frr


def test_far_frr():
    result = far_frr([0.8, 0.9], [0.1, 0.2], 0.5)
    assert result["FAR"] == 0
    assert result["FRR"] == 0
