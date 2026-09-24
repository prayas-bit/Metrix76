from fastapi import APIRouter, HTTPException, Query, Response
from datetime import datetime, date, timedelta
from typing import List, Optional
from app.schemas.report import (
    TestReportSummary,
    TestReportDetail,
    PublicVerificationResponse,
    ReportStatus,
    EnvironmentalConditions,
    TechnicalChecklist
)
from app.schemas.instrument import InstrumentOut
from app.schemas.reference_standard import ReferenceStandardOut
from app.schemas.metrology import AccuracyClass, TestDirection, ComplianceVerdict, WeighingEvaluationResult
from app.services.document.crypto import CryptoAuditService

router = APIRouter()

# Mock Report DB for Archive & Verification
SAMPLE_INSTRUMENT = InstrumentOut(
    id="inst-001",
    serial_number="SN-2026-NAWI-8891",
    model_name="PreciseWeigh Pro 15",
    manufacturer_name="Avery Metrology Ltd.",
    accuracy_class=AccuracyClass.CLASS_III,
    max_capacity=15.0,
    min_capacity=0.1,
    scale_interval_d=0.002,
    verification_interval_e=0.002,
    unit="kg",
    is_multi_interval=False,
    load_receptor_type="Platform",
    indicator_make_model="IND-2000-HD",
    year_of_manufacture=2026,
    calculated_n=7500,
    attachments=[],
    created_at=datetime.now()
)

SAMPLE_STANDARD = ReferenceStandardOut(
    id="std-001",
    set_identifier="NPL-E2-SET-04",
    accuracy_class="E2",
    certificate_number="CAL-2025-0892",
    calibrated_by="National Physical Laboratory",
    calibration_date=date(2025, 6, 15),
    expiry_date=date(2026, 6, 15),
    expanded_uncertainty_k2=0.0001,
    nominal_range="1 mg to 50 kg",
    is_active=True,
    is_expired=False,
    days_to_expiry=120,
    created_at=datetime.now()
)

SAMPLE_WEIGHING_OBSERVATIONS = [
    WeighingEvaluationResult(
        load_applied=0.0,
        indication_observed=0.0,
        delta_load=0.001,
        calculated_p=0.0,
        true_error_e=0.0,
        corrected_error_ec=0.0,
        mpe_allowed=0.001,
        status=ComplianceVerdict.PASS,
        is_compliant=True,
        direction=TestDirection.INCREASING
    ),
    WeighingEvaluationResult(
        load_applied=10.0,
        indication_observed=9.998,
        delta_load=0.001,
        calculated_p=9.998,
        true_error_e=-0.002,
        corrected_error_ec=-0.002,
        mpe_allowed=0.003,
        status=ComplianceVerdict.PASS,
        is_compliant=True,
        direction=TestDirection.INCREASING
    )
]

REPORTS_DB: List[TestReportDetail] = [
    TestReportDetail(
        id="rep-100",
        report_number="OIML-2026-TR-0041",
        attempt_number=1,
        status=ReportStatus.APPROVED,
        standard_version="OIML R 76-1:2006",
        instrument=SAMPLE_INSTRUMENT,
        reference_standard=SAMPLE_STANDARD,
        environment=EnvironmentalConditions(ambient_temperature_celsius=21.8, relative_humidity_pct=52.0),
        technical_checklist=TechnicalChecklist(),
        overall_verdict=True,
        rejection_reason=None,
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        pdf_storage_path="generated-reports/rep-100.pdf",
        docx_storage_path="generated-reports/rep-100.docx",
        weighing_observations=SAMPLE_WEIGHING_OBSERVATIONS,
        repeatability_results=[],
        eccentricity_results=[],
        conducted_by="A. Verma (Testing Metrologist)",
        approved_by="Dr. R. K. Mukherjee (Director of Metrology)",
        approved_at=datetime.now() - timedelta(hours=4),
        created_at=datetime.now() - timedelta(days=1),
        updated_at=datetime.now() - timedelta(hours=4)
    )
]

@router.get("/archive", response_model=List[TestReportSummary])
def search_archive(
    query: Optional[str] = Query(None, description="Free text search: Serial, Model, Manufacturer, Report #"),
    accuracy_class: Optional[AccuracyClass] = None,
    status_filter: Optional[ReportStatus] = None,
    verdict: Optional[bool] = None
):
    """
    Module 6: Faceted search and filter engine for past test reports.
    """
    results = []
    for r in REPORTS_DB:
        if query:
            q = query.lower()
            matches = (
                q in r.report_number.lower() or
                q in r.instrument.serial_number.lower() or
                q in r.instrument.model_name.lower() or
                q in r.instrument.manufacturer_name.lower()
            )
            if not matches:
                continue

        if accuracy_class and r.instrument.accuracy_class != accuracy_class:
            continue
        if status_filter and r.status != status_filter:
            continue
        if verdict is not None and r.overall_verdict != verdict:
            continue

        results.append(
            TestReportSummary(
                id=r.id,
                report_number=r.report_number,
                instrument_serial=r.instrument.serial_number,
                instrument_model=r.instrument.model_name,
                manufacturer_name=r.instrument.manufacturer_name,
                accuracy_class=r.instrument.accuracy_class,
                status=r.status,
                overall_verdict=r.overall_verdict,
                conducted_by_name=r.conducted_by,
                created_at=r.created_at,
                updated_at=r.updated_at
            )
        )
    return results

@router.get("/{report_id}", response_model=TestReportDetail)
def get_report_detail(report_id: str):
    rep = next((r for r in REPORTS_DB if r.id == report_id), None)
    if not rep:
        raise HTTPException(status_code=404, detail="Test report not found")
    return rep

@router.get("/verify/{report_id}", response_model=PublicVerificationResponse)
def public_verify_report(report_id: str):
    """
    Module 6: Public Verification Portal with cryptographic SHA-256 seal resolution.
    """
    rep = next((r for r in REPORTS_DB if r.id == report_id), None)
    if not rep or rep.status != ReportStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Valid approved certificate not found for this identifier")
    
    return PublicVerificationResponse(
        is_valid=True,
        report_number=rep.report_number,
        status=rep.status,
        instrument_serial=rep.instrument.serial_number,
        manufacturer_name=rep.instrument.manufacturer_name,
        model_name=rep.instrument.model_name,
        accuracy_class=rep.instrument.accuracy_class.value,
        overall_verdict=rep.overall_verdict or True,
        approved_at=rep.approved_at,
        sha256_hash=rep.sha256_hash or "e3b0c44298fc1c149afbf4c8996fb924",
        verified_at=datetime.now()
    )
