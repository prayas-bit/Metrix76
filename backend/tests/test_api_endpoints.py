import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def sample_weighing_payload():
    return {
        "instrument": {
            "accuracy_class": "CLASS_III",
            "max_capacity": 15.0,
            "min_capacity": 0.1,
            "scale_interval_d": 0.002,
            "verification_interval_e": 0.002,
            "unit": "kg"
        },
        "points": [
            {"load_applied": 0.0, "indication_observed": 0.0, "delta_load": 0.001, "direction": "INCREASING"},
            {"load_applied": 5.0, "indication_observed": 5.0, "delta_load": 0.001, "direction": "INCREASING"},
            {"load_applied": 10.0, "indication_observed": 9.998, "delta_load": 0.001, "direction": "INCREASING"},
            {"load_applied": 15.0, "indication_observed": 15.001, "delta_load": 0.001, "direction": "INCREASING"}
        ]
    }

def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_api_evaluate_weighing(sample_weighing_payload):
    res = client.post("/api/v1/metrology/evaluate-weighing", json=sample_weighing_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["overall_compliant"] is True
    assert len(data["results"]) == 4
    assert "zero_error_e0" in data

def test_api_evaluate_repeatability():
    payload = {
        "instrument": {
            "accuracy_class": "CLASS_III",
            "max_capacity": 15.0,
            "min_capacity": 0.1,
            "scale_interval_d": 0.002,
            "verification_interval_e": 0.002,
            "unit": "kg"
        },
        "series": [
            {
                "nominal_load": 7.5,
                "observations": [
                    {"load_applied": 7.5, "indication_observed": 7.500, "delta_load": 0.001}
                    for _ in range(10)
                ]
            }
        ]
    }
    res = client.post("/api/v1/metrology/evaluate-repeatability", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["overall_compliant"] is True
    assert len(data["series_results"]) == 1
    assert data["series_results"][0]["delta_i"] == 0.0

def test_api_evaluate_eccentricity():
    payload = {
        "instrument": {
            "accuracy_class": "CLASS_III",
            "max_capacity": 15.0,
            "min_capacity": 0.1,
            "scale_interval_d": 0.002,
            "verification_interval_e": 0.002,
            "unit": "kg"
        },
        "geometry": "FOUR_CORNERS",
        "points": [
            {"position_tag": "CENTER", "load_applied": 5.0, "indication_observed": 5.000, "delta_load": 0.001},
            {"position_tag": "CORNER_1", "load_applied": 5.0, "indication_observed": 5.000, "delta_load": 0.001},
            {"position_tag": "CORNER_2", "load_applied": 5.0, "indication_observed": 5.002, "delta_load": 0.001},
            {"position_tag": "CORNER_3", "load_applied": 5.0, "indication_observed": 5.000, "delta_load": 0.001},
            {"position_tag": "CORNER_4", "load_applied": 5.0, "indication_observed": 4.998, "delta_load": 0.001}
        ]
    }
    res = client.post("/api/v1/metrology/evaluate-eccentricity", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["overall_compliant"] is True
    assert data["recommended_load"] == 5.0
    assert len(data["results"]) == 5

def test_api_calculate_uncertainty():
    payload = {
        "scale_interval_d": 0.002,
        "repeatability_std_dev": 0.0008,
        "n_repeat_observations": 10,
        "standard_expanded_uncertainty_k2": 0.0002,
        "coverage_factor_k": 2.0
    }
    res = client.post("/api/v1/metrology/calculate-uncertainty", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["u_cal"] == 0.0001
    assert data["expanded_uncertainty_U"] > 0
    assert data["coverage_factor_k"] == 2.0

def test_api_render_chart_png(sample_weighing_payload):
    res = client.post("/api/v1/metrology/render-chart-png", json=sample_weighing_payload)
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")

def test_api_render_chart_svg(sample_weighing_payload):
    res = client.post("/api/v1/metrology/render-chart-svg", json=sample_weighing_payload)
    assert res.status_code == 200
    assert "image/svg+xml" in res.headers["content-type"]
    assert "<svg" in res.text

def test_api_generate_pdf_for_report():
    res = client.post("/api/v1/documents/reports/rep-100/generate-pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF-")

def test_api_generate_docx_for_report():
    res = client.post("/api/v1/documents/reports/rep-100/generate-docx")
    assert res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in res.headers["content-type"]
    assert res.content.startswith(b"PK\x03\x04")
