import pytest
from app.schemas.metrology import AccuracyClass, InstrumentMeta, WeighingPointInput
from app.services.metrology.engine import OIMLR76Engine

@pytest.fixture
def class_iii_scale():
    return InstrumentMeta(
        accuracy_class=AccuracyClass.CLASS_III,
        max_capacity=15.0,
        min_capacity=0.1,
        scale_interval_d=0.002,
        verification_interval_e=0.002,
        unit="kg"
    )

def test_mpe_thresholds_class_iii(class_iii_scale):
    assert OIMLR76Engine.get_mpe(0.5, class_iii_scale) == 0.001
    assert OIMLR76Engine.get_mpe(1.0, class_iii_scale) == 0.001
    assert OIMLR76Engine.get_mpe(2.0, class_iii_scale) == 0.002
    assert OIMLR76Engine.get_mpe(4.0, class_iii_scale) == 0.002
    assert OIMLR76Engine.get_mpe(10.0, class_iii_scale) == 0.003

def test_discrete_rounding_and_error_correction(class_iii_scale):
    points = [
        WeighingPointInput(load_applied=0.0, indication_observed=0.0, delta_load=0.001),
        WeighingPointInput(load_applied=10.0, indication_observed=9.998, delta_load=0.001)
    ]
    res = OIMLR76Engine.evaluate_weighing_batch(class_iii_scale, points)
    assert res.overall_compliant is True
    assert res.results[1].corrected_error_ec == -0.002
    assert res.results[1].is_compliant is True
