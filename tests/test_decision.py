from backend.core.decision import DecisionEngine, VerificationFrame


def test_decision_engine_accepts_after_consensus():
    engine = DecisionEngine(0.4, 0.7, window=3, pass_ratio=0.66)
    decision = None
    for _ in range(3):
        decision = engine.update(VerificationFrame("u1", 0.8, 0.9, True, 0.9, ["ok"]))
    assert decision.accepted is True
    assert decision.user_id == "u1"
