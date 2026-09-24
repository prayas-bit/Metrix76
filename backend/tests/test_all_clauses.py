import pytest
from app.schemas.metrology import (
    AccuracyClass,
    InstrumentMeta,
    WeighingPointInput,
    RepeatabilitySeriesInput,
    EccentricityPointInput,
    ComplianceVerdict
)
from app.services.metrology.engine import OIMLR76Engine
from app.services.metrology.sanity import InstrumentSanityEngine

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

def test_sanity_validation_class_iii(class_iii_scale):
    sanity = InstrumentSanityEngine.validate_spec(class_iii_scale)
    assert sanity.is_valid is True
    assert sanity.calculated_n == 7500
    assert sanity.n_min == 500
    assert sanity.n_max == 10000

def test_sanity_validation_illegal_intervals():
    invalid_scale = InstrumentMeta(
        accuracy_class=AccuracyClass.CLASS_III,
        max_capacity=15.0,
        min_capacity=0.1,
        scale_interval_d=0.005,
        verification_interval_e=0.002, # e < d is illegal
        unit="kg"
    )
    sanity = InstrumentSanityEngine.validate_spec(invalid_scale)
    assert sanity.is_valid is False
    assert any("cannot be less than scale interval" in err for err in sanity.issues)

def test_repeatability_evaluation(class_iii_scale):
    # 10 identical measurements at 0.5 Max (7.5 kg)
    observations = [
        WeighingPointInput(load_applied=7.5, indication_observed=7.500, delta_load=0.001)
        for _ in range(10)
    ]
    series = [RepeatabilitySeriesInput(nominal_load=7.5, observations=observations)]
    res = OIMLR76Engine.evaluate_repeatability_batch(class_iii_scale, series)
    assert res.overall_compliant is True
    assert res.series_results[0].delta_i == 0.0

def test_eccentricity_evaluation(class_iii_scale):
    points = [
        EccentricityPointInput(position_tag="CENTER", load_applied=5.0, indication_observed=5.000, delta_load=0.001),
        EccentricityPointInput(position_tag="CORNER_1", load_applied=5.0, indication_observed=5.000, delta_load=0.001),
        EccentricityPointInput(position_tag="CORNER_2", load_applied=5.0, indication_observed=5.002, delta_load=0.001),
        EccentricityPointInput(position_tag="CORNER_3", load_applied=5.0, indication_observed=5.000, delta_load=0.001),
        EccentricityPointInput(position_tag="CORNER_4", load_applied=5.0, indication_observed=4.998, delta_load=0.001),
    ]
    res = OIMLR76Engine.evaluate_eccentricity_batch(class_iii_scale, points)
    assert res.overall_compliant is True
    assert len(res.results) == 5

def test_crypto_audit_service():
    from app.services.document.crypto import CryptoAuditService
    hash_val = CryptoAuditService.generate_sha256_hash({"test": "data"})
    assert len(hash_val) == 64
    qr_b64 = CryptoAuditService.generate_qr_code_base64("https://legalmetrology.gov.in/verify/rep-100")
    assert isinstance(qr_b64, str)
    assert len(qr_b64) > 0

