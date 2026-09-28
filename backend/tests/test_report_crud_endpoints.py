from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_draft_report_and_submit_for_approval():
    standard_response = client.post(
        "/api/v1/standards/",
        json={
            "set_identifier": "NPL-TEST-SET-99",
            "accuracy_class": "E2",
            "certificate_number": "CAL-2026-0999",
            "calibrated_by": "National Physical Laboratory",
            "calibration_date": "2026-09-01",
            "expiry_date": "2027-09-01",
            "expanded_uncertainty_k2": 0.0001,
            "nominal_range": "1 mg to 50 kg",
            "is_active": True,
        }
    )
    assert standard_response.status_code == 201, standard_response.text
    reference_standard_id = standard_response.json()["id"]

    draft_payload = {
        "instrument_id": "inst-001",
        "reference_standard_id": reference_standard_id,
        "ambient_temperature_celsius": 22.4,
        "relative_humidity_pct": 54.0,
        "atmospheric_pressure_hpa": 1013.25,
        "technical_checklist": {
            "level_indicator_present": True,
            "zero_setting_operative": True,
            "tare_device_operative": True,
            "security_sealing_intact": True,
            "audit_counter_value": "AC-0042",
            "notes": "Draft created during metrologist intake"
        }
    }

    create_response = client.post("/api/v1/reports/draft", json=draft_payload)
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["status"] == "DRAFT"
    report_id = created["id"]

    observation_payload = {
        "report_id": report_id,
        "observations": [
            {
                "test_type": "WEIGHING",
                "direction": "INCREASING",
                "sequence_order": 1,
                "load_applied": 0.0,
                "indication_observed": 0.0,
                "delta_load": 0.0,
                "position_tag": "CENTER"
            },
            {
                "test_type": "WEIGHING",
                "direction": "INCREASING",
                "sequence_order": 2,
                "load_applied": 10.0,
                "indication_observed": 9.998,
                "delta_load": 0.001,
                "position_tag": "CENTER"
            }
        ]
    }

    put_response = client.put(f"/api/v1/reports/{report_id}/observations", json=observation_payload)
    assert put_response.status_code == 200, put_response.text
    upserted = put_response.json()
    assert len(upserted["observations"]) == 2

    submit_response = client.post(f"/api/v1/reports/{report_id}/submit")
    assert submit_response.status_code == 200, submit_response.text
    submitted = submit_response.json()
    assert submitted["status"] == "PENDING_APPROVAL"
    assert submitted["report_id"] == report_id


def _jwt_from_payload(payload):
    import base64
    import json

    def enc(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')

    return f"{enc({'alg': 'HS256', 'typ': 'JWT'})}.{enc(payload)}.signature"


def test_get_current_user_supports_array_role_claims():
    from fastapi.security import HTTPAuthorizationCredentials
    from app.core.security import get_current_user

    token = _jwt_from_payload({
        "sub": "user-123",
        "role": "TECHNICIAN",
        "app_metadata": {"roles": ["TECHNICIAN", "ADMIN"]},
        "user_metadata": {"roles": ["TECHNICIAN"]},
    })

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user = get_current_user(credentials)

    assert user["user_id"] == "user-123"
    assert user["role"] == "TECHNICIAN"
