from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, date, timezone
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
from app.core.supabase import get_supabase_client

router = APIRouter()

# In-memory fallback
_LOCAL_REPORTS: List[TestReportDetail] = []


def _map_row_to_report_summary(row: dict) -> TestReportSummary:
    inst = row.get("instruments") or {}
    return TestReportSummary(
        id=str(row["id"]),
        report_number=row["report_number"],
        instrument_serial=inst.get("serial_number", "N/A"),
        instrument_model=inst.get("model_name", "N/A"),
        manufacturer_name=inst.get("manufacturer_name", "N/A"),
        accuracy_class=AccuracyClass(inst.get("accuracy_class", "CLASS_III")),
        status=ReportStatus(row.get("status", "DRAFT")),
        overall_verdict=row.get("overall_verdict"),
        conducted_by_name=str(row.get("conducted_by", "Testing Metrologist")),
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if "created_at" in row else datetime.now(timezone.utc),
        updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")) if "updated_at" in row else datetime.now(timezone.utc)
    )


def _map_row_to_report_detail(row: dict) -> TestReportDetail:
    inst_raw = row.get("instruments") or {}
    std_raw = row.get("reference_standards") or {}

    max_cap = float(inst_raw.get("max_capacity", 15.0))
    e_val = float(inst_raw.get("verification_interval_e", 0.002))

    inst_obj = InstrumentOut(
        id=str(inst_raw.get("id", "inst-001")),
        serial_number=inst_raw.get("serial_number", "SN-UNKNOWN"),
        model_name=inst_raw.get("model_name", "Standard Scale"),
        manufacturer_name=inst_raw.get("manufacturer_name", "Metrology Dept"),
        accuracy_class=AccuracyClass(inst_raw.get("accuracy_class", "CLASS_III")),
        max_capacity=max_cap,
        min_capacity=float(inst_raw.get("min_capacity", 0.1)),
        scale_interval_d=float(inst_raw.get("scale_interval_d", 0.002)),
        verification_interval_e=e_val,
        unit=inst_raw.get("unit", "kg"),
        is_multi_interval=inst_raw.get("is_multi_interval", False),
        load_receptor_type=inst_raw.get("load_receptor_type", "Platform"),
        indicator_make_model=inst_raw.get("indicator_make_model", "IND-2000"),
        year_of_manufacture=inst_raw.get("year_of_manufacture", 2026),
        calculated_n=int(round(max_cap / e_val)) if e_val > 0 else 0,
        attachments=[],
        created_at=datetime.now(timezone.utc)
    )

    std_obj = ReferenceStandardOut(
        id=str(std_raw.get("id", "std-001")),
        set_identifier=std_raw.get("set_identifier", "STD-SET-01"),
        accuracy_class=std_raw.get("accuracy_class", "E2"),
        certificate_number=std_raw.get("certificate_number", "CAL-2026-001"),
        calibrated_by=std_raw.get("calibrated_by", "National Metrology Lab"),
        calibration_date=date.fromisoformat(std_raw.get("calibration_date", "2026-01-01")),
        expiry_date=date.fromisoformat(std_raw.get("expiry_date", "2027-01-01")),
        expanded_uncertainty_k2=float(std_raw.get("expanded_uncertainty_k2", 0.0001)),
        nominal_range=std_raw.get("nominal_range", "1 mg to 50 kg"),
        is_active=std_raw.get("is_active", True),
        is_expired=False,
        days_to_expiry=120,
        created_at=datetime.now(timezone.utc)
    )

    # Observations if present
    obs_list = []
    if "test_observations" in row and row["test_observations"]:
        for o in row["test_observations"]:
            obs_list.append(
                WeighingEvaluationResult(
                    load_applied=float(o.get("load_applied", 0)),
                    indication_observed=float(o.get("indication_observed", 0)),
                    delta_load=float(o.get("delta_load", 0)),
                    calculated_p=float(o.get("calculated_p", 0)),
                    true_error_e=float(o.get("error_e", 0)),
                    corrected_error_ec=float(o.get("corrected_error_ec", 0)),
                    mpe_allowed=float(o.get("mpe_allowed", 0.001)),
                    status=ComplianceVerdict.PASS if o.get("is_compliant", True) else ComplianceVerdict.FAIL,
                    is_compliant=bool(o.get("is_compliant", True)),
                    direction=TestDirection(o.get("direction", "INCREASING"))
                )
            )

    return TestReportDetail(
        id=str(row["id"]),
        report_number=row["report_number"],
        attempt_number=row.get("attempt_number", 1),
        status=ReportStatus(row.get("status", "DRAFT")),
        standard_version=row.get("standard_version", "OIML R 76-1:2006"),
        instrument=inst_obj,
        reference_standard=std_obj,
        environment=EnvironmentalConditions(
            ambient_temperature_celsius=float(row.get("ambient_temperature_celsius") or 22.0),
            relative_humidity_pct=float(row.get("relative_humidity_pct") or 50.0),
            atmospheric_pressure_hpa=float(row.get("atmospheric_pressure_hpa") or 1013.25)
        ),
        technical_checklist=TechnicalChecklist(),
        overall_verdict=row.get("overall_verdict"),
        rejection_reason=row.get("rejection_reason"),
        sha256_hash=row.get("sha256_hash"),
        pdf_storage_path=row.get("pdf_storage_path"),
        docx_storage_path=row.get("docx_storage_path"),
        weighing_observations=obs_list,
        repeatability_results=[],
        eccentricity_results=[],
        conducted_by=str(row.get("conducted_by", "Testing Metrologist")),
        approved_by=str(row.get("approved_by")) if row.get("approved_by") else None,
        approved_at=datetime.fromisoformat(row["approved_at"].replace("Z", "+00:00")) if row.get("approved_at") else None,
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if "created_at" in row else datetime.now(timezone.utc),
        updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")) if "updated_at" in row else datetime.now(timezone.utc)
    )


@router.get("/archive", response_model=List[TestReportSummary])
def search_archive(
    query: Optional[str] = Query(None, description="Free text search: Serial, Model, Manufacturer, Report #"),
    accuracy_class: Optional[AccuracyClass] = None,
    status_filter: Optional[ReportStatus] = None,
    verdict: Optional[bool] = None
):
    """
    Module 6: Faceted search and filter engine for reports from Supabase.
    """
    supabase = get_supabase_client()
    if supabase:
        try:
            db_query = supabase.table("test_reports").select("*, instruments(*)")
            if status_filter:
                db_query = db_query.eq("status", status_filter.value)
            if verdict is not None:
                db_query = db_query.eq("overall_verdict", verdict)

            res = db_query.order("created_at", desc=True).execute()
            if res.data:
                filtered = []
                for r in res.data:
                    inst = r.get("instruments") or {}
                    if accuracy_class and inst.get("accuracy_class") != accuracy_class.value:
                        continue
                    if query:
                        q = query.lower()
                        match = (
                            q in r.get("report_number", "").lower() or
                            q in inst.get("serial_number", "").lower() or
                            q in inst.get("model_name", "").lower() or
                            q in inst.get("manufacturer_name", "").lower()
                        )
                        if not match:
                            continue
                    filtered.append(_map_row_to_report_summary(r))
                return filtered
        except Exception as e:
            print(f"[Supabase] Error searching archive: {e}")

    # In-memory fallback
    results = []
    for r in _LOCAL_REPORTS:
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
    """
    Retrieves full test report record from Supabase.
    """
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("test_reports").select("*, instruments(*), reference_standards(*), test_observations(*)").eq("id", report_id).execute()
            if res.data and len(res.data) > 0:
                return _map_row_to_report_detail(res.data[0])
        except Exception as e:
            print(f"[Supabase] Error fetching report: {e}")

    rep = next((r for r in _LOCAL_REPORTS if r.id == report_id), None)
    if not rep:
        raise HTTPException(status_code=404, detail="Test report not found")
    return rep


@router.get("/verify/{report_id}", response_model=PublicVerificationResponse)
def public_verify_report(report_id: str):
    """
    Module 6: Public Verification Portal resolving certificate validity from Supabase.
    """
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("test_reports").select("*, instruments(*)").eq("id", report_id).execute()
            if res.data and len(res.data) > 0:
                row = res.data[0]
                inst = row.get("instruments") or {}
                if row.get("status") != "APPROVED":
                    raise HTTPException(status_code=404, detail="Report is not approved for type verification")

                return PublicVerificationResponse(
                    is_valid=True,
                    report_number=row["report_number"],
                    status=ReportStatus(row["status"]),
                    instrument_serial=inst.get("serial_number", "UNKNOWN"),
                    manufacturer_name=inst.get("manufacturer_name", "UNKNOWN"),
                    model_name=inst.get("model_name", "UNKNOWN"),
                    accuracy_class=inst.get("accuracy_class", "CLASS_III"),
                    overall_verdict=bool(row.get("overall_verdict", True)),
                    approved_at=datetime.fromisoformat(row["approved_at"].replace("Z", "+00:00")) if row.get("approved_at") else None,
                    sha256_hash=row.get("sha256_hash", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
                    verified_at=datetime.now(timezone.utc)
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Supabase] Error in public verify: {e}")

    rep = next((r for r in _LOCAL_REPORTS if r.id == report_id), None)
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
        verified_at=datetime.now(timezone.utc)
    )
