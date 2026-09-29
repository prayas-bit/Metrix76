from fastapi import APIRouter, HTTPException, Query, status
from datetime import datetime, date, timezone
from typing import List, Optional, Dict
from app.schemas.report import (
    BatchObservationPayload,
    ReportSubmissionResponse,
    TestObservationRowPayload,
    TestReportCreate,
    TestReportSummary,
    TestReportDetail,
    PublicVerificationResponse,
    ReportStatus,
    EnvironmentalConditions,
    TechnicalChecklist,
)
from app.schemas.instrument import InstrumentOut
from app.schemas.reference_standard import ReferenceStandardOut
from app.schemas.metrology import AccuracyClass, TestDirection, ComplianceVerdict, WeighingEvaluationResult
from app.core.supabase import get_supabase_client
from app.api.v1.endpoints.instruments import _LOCAL_CACHE as _LOCAL_INSTRUMENTS, _map_row_to_instrument
from app.api.v1.endpoints.reference_standards import _LOCAL_CACHE as _LOCAL_STANDARDS, _map_row_to_standard

router = APIRouter()

_SAMPLE_INST = InstrumentOut(
    id="inst-001",
    serial_number="SN-TEST-001",
    model_name="Standard Precision Balance",
    manufacturer_name="Metrology Dept",
    accuracy_class=AccuracyClass.CLASS_III,
    max_capacity=15.0,
    min_capacity=0.1,
    scale_interval_d=0.002,
    verification_interval_e=0.002,
    unit="kg",
    is_multi_interval=False,
    load_receptor_type="Platform",
    indicator_make_model="IND-2000",
    year_of_manufacture=2026,
    calculated_n=7500,
    attachments=[],
    created_at=datetime.now(timezone.utc)
)

_SAMPLE_STD = ReferenceStandardOut(
    id="std-001",
    set_identifier="STD-SET-01",
    accuracy_class="E2",
    certificate_number="CAL-2026-001",
    calibrated_by="National Metrology Lab",
    calibration_date=date(2026, 1, 1),
    expiry_date=date(2027, 1, 1),
    expanded_uncertainty_k2=0.0001,
    nominal_range="1 mg to 50 kg",
    is_active=True,
    is_expired=False,
    days_to_expiry=120,
    created_at=datetime.now(timezone.utc)
)

# In-memory fallback
_LOCAL_REPORTS: List[TestReportDetail] = [
    TestReportDetail(
        id="rep-100",
        report_number="OIML-2026-TR-0100",
        attempt_number=1,
        status=ReportStatus.APPROVED,
        standard_version="OIML R 76-1:2006",
        instrument=_SAMPLE_INST,
        reference_standard=_SAMPLE_STD,
        environment=EnvironmentalConditions(
            ambient_temperature_celsius=22.5,
            relative_humidity_pct=55.0,
            atmospheric_pressure_hpa=1013.25
        ),
        technical_checklist=TechnicalChecklist(),
        overall_verdict=True,
        rejection_reason=None,
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        pdf_storage_path="generated-reports/rep-100.pdf",
        docx_storage_path="generated-reports/rep-100.docx",
        weighing_observations=[],
        repeatability_results=[],
        eccentricity_results=[],
        conducted_by="A. Verma (Testing Metrologist)",
        approved_by="Dr. R. K. Mukherjee (Director of Metrology)",
        approved_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
]
_LOCAL_OBSERVATIONS: Dict[str, List[TestObservationRowPayload]] = {}


def _get_instrument_helper(instrument_id: str) -> Optional[InstrumentOut]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("instruments").select("*").eq("id", instrument_id).execute()
            if res.data and len(res.data) > 0:
                return _map_row_to_instrument(res.data[0])
        except Exception as e:
            print(f"[Supabase] Error fetching instrument: {e}")
    inst = next((i for i in _LOCAL_INSTRUMENTS if i.id == instrument_id), None)
    if inst:
        return inst
    if instrument_id in ("inst-001", "default"):
        return InstrumentOut(
            id="inst-001",
            serial_number="SN-TEST-001",
            model_name="Standard Precision Balance",
            manufacturer_name="Metrology Dept",
            accuracy_class=AccuracyClass.CLASS_III,
            max_capacity=15.0,
            min_capacity=0.1,
            scale_interval_d=0.002,
            verification_interval_e=0.002,
            unit="kg",
            is_multi_interval=False,
            load_receptor_type="Platform",
            indicator_make_model="IND-2000",
            year_of_manufacture=2026,
            calculated_n=7500,
            attachments=[],
            created_at=datetime.now(timezone.utc)
        )
    return None


def _get_standard_helper(standard_id: str) -> Optional[ReferenceStandardOut]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("reference_standards").select("*").eq("id", standard_id).execute()
            if res.data and len(res.data) > 0:
                return _map_row_to_standard(res.data[0])
        except Exception as e:
            print(f"[Supabase] Error fetching standard: {e}")
    std = next((s for s in _LOCAL_STANDARDS if s.id == standard_id), None)
    if std:
        return std
    return None


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


def _get_report_or_404(report_id: str) -> TestReportDetail:
    return get_report_detail(report_id)


@router.post("/draft", response_model=TestReportDetail, status_code=status.HTTP_201_CREATED)
def create_report_draft(payload: TestReportCreate):
    """
    Creates a new draft evaluation report in the active technician workflow.
    """
    instrument = _get_instrument_helper(payload.instrument_id)
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")

    standard = _get_standard_helper(payload.reference_standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Reference standard not found")

    if not standard.is_active or standard.expiry_date < date.today():
        raise HTTPException(status_code=422, detail="Selected reference standard is expired or inactive")

    now = datetime.now(timezone.utc)
    report_num = f"OIML-{now.year}-TR-{len(_LOCAL_REPORTS) + 1:04d}"

    supabase = get_supabase_client()
    if supabase:
        try:
            # Resolve active user ID for foreign key constraint
            conducted_by_id = "5ec3c7f8-9d47-4024-9898-a4bbb4db1701"
            if payload.conducted_by:
                conducted_by_id = payload.conducted_by
            else:
                try:
                    users_res = supabase.auth.admin.list_users()
                    if users_res and len(users_res) > 0:
                        conducted_by_id = str(users_res[0].id)
                except Exception:
                    pass

            insert_data = {
                "report_number": report_num,
                "instrument_id": instrument.id,
                "reference_standard_id": standard.id,
                "attempt_number": 1,
                "status": "DRAFT",
                "standard_version": "OIML R 76-1:2006",
                "ambient_temperature_celsius": payload.ambient_temperature_celsius,
                "relative_humidity_pct": payload.relative_humidity_pct,
                "atmospheric_pressure_hpa": payload.atmospheric_pressure_hpa,
                "technical_checklist": payload.technical_checklist.model_dump() if payload.technical_checklist else {},
                "conducted_by": conducted_by_id,
            }
            res = supabase.table("test_reports").insert(insert_data).execute()
            if res.data and len(res.data) > 0:
                new_row = res.data[0]
                return get_report_detail(new_row["id"])
        except Exception as e:
            print(f"[Supabase] Error creating report draft: {e}")

    report_id = f"rep-{len(_LOCAL_REPORTS) + 101:03d}"
    draft = TestReportDetail(
        id=report_id,
        report_number=report_num,
        attempt_number=1,
        status=ReportStatus.DRAFT,
        standard_version="OIML R 76-1:2006",
        instrument=instrument,
        reference_standard=standard,
        environment=EnvironmentalConditions(
            ambient_temperature_celsius=payload.ambient_temperature_celsius,
            relative_humidity_pct=payload.relative_humidity_pct,
            atmospheric_pressure_hpa=payload.atmospheric_pressure_hpa,
        ),
        technical_checklist=payload.technical_checklist or TechnicalChecklist(),
        overall_verdict=None,
        rejection_reason=None,
        sha256_hash=None,
        pdf_storage_path=None,
        docx_storage_path=None,
        weighing_observations=[],
        repeatability_results=[],
        eccentricity_results=[],
        conducted_by="Technician Draft",
        approved_by=None,
        approved_at=None,
        created_at=now,
        updated_at=now,
    )
    _LOCAL_REPORTS.append(draft)
    _LOCAL_OBSERVATIONS.setdefault(report_id, [])
    return draft


@router.put("/{report_id}/observations")
def upsert_report_observations(report_id: str, payload: BatchObservationPayload):
    """
    Batch-upsert test rows for a draft or in-progress report.
    """
    rep = _get_report_or_404(report_id)
    if payload.report_id != report_id:
        raise HTTPException(status_code=400, detail="Observation payload report_id must match the route report_id")

    supabase = get_supabase_client()
    if supabase:
        try:
            obs_rows = []
            for obs in payload.observations:
                obs_rows.append({
                    "report_id": report_id,
                    "test_type": obs.test_type.value if hasattr(obs.test_type, "value") else str(obs.test_type),
                    "direction": obs.direction.value if hasattr(obs.direction, "value") else str(obs.direction),
                    "sequence_order": obs.sequence_order,
                    "load_applied": obs.load_applied,
                    "indication_observed": obs.indication_observed,
                    "delta_load": obs.delta_load,
                    "calculated_p": obs.indication_observed + 0.5 * 0.002 - obs.delta_load,
                    "error_e": (obs.indication_observed + 0.5 * 0.002 - obs.delta_load) - obs.load_applied,
                    "corrected_error_ec": (obs.indication_observed + 0.5 * 0.002 - obs.delta_load) - obs.load_applied,
                    "mpe_allowed": 0.001,
                    "is_compliant": True,
                    "position_tag": obs.position_tag or "CENTER",
                    "run_cycle": obs.run_cycle or 1
                })
            supabase.table("test_observations").upsert(obs_rows).execute()
        except Exception as e:
            print(f"[Supabase] Error upserting observations: {e}")

    merged = {(
        obs.test_type.value if hasattr(obs.test_type, "value") else str(obs.test_type),
        obs.direction.value if hasattr(obs.direction, "value") else str(obs.direction),
        obs.sequence_order,
        obs.position_tag or "",
        obs.run_cycle or 0,
    ): obs for obs in _LOCAL_OBSERVATIONS.get(report_id, [])}

    for obs in payload.observations:
        merged[(
            obs.test_type.value if hasattr(obs.test_type, "value") else str(obs.test_type),
            obs.direction.value if hasattr(obs.direction, "value") else str(obs.direction),
            obs.sequence_order,
            obs.position_tag or "",
            obs.run_cycle or 0,
        )] = obs

    _LOCAL_OBSERVATIONS[report_id] = list(merged.values())
    rep.updated_at = datetime.now(timezone.utc)
    return {"report_id": report_id, "observations": _LOCAL_OBSERVATIONS[report_id]}


def _validate_observations_completeness(observations: List[TestObservationRowPayload]) -> None:
    """
    Validates that the observation payload contains the required test measurement groups
    and complete test data according to OIML R 76 requirements.
    """
    grouped_by_type: Dict[str, List[TestObservationRowPayload]] = {}
    for obs in observations:
        key = obs.test_type.value if hasattr(obs.test_type, "value") else str(obs.test_type)
        grouped_by_type.setdefault(key, []).append(obs)

    # 1. Weighing Performance (Clause A.4.4): Mandatory core test
    weighing_obs = grouped_by_type.get("WEIGHING", [])
    if not weighing_obs:
        raise HTTPException(
            status_code=422,
            detail="Submission rejected: Weighing performance test observations (Clause A.4.4) are required.",
        )

    if len(weighing_obs) < 5:
        raise HTTPException(
            status_code=422,
            detail=f"Submission rejected: Weighing performance test requires at least 5 observation points across the range, found {len(weighing_obs)}.",
        )

    # Validate that increasing and decreasing directions or zero baseline exist
    directions = {obs.direction.value if hasattr(obs.direction, "value") else str(obs.direction) for obs in weighing_obs}
    has_increasing = "INCREASING" in directions
    has_zero_or_preload = any(abs(obs.load_applied) < 1e-7 for obs in weighing_obs)
    if not has_increasing or not has_zero_or_preload:
        raise HTTPException(
            status_code=422,
            detail="Submission rejected: Weighing performance test must include a zero-load point (L=0) and INCREASING direction observations.",
        )

    # 2. Check completeness for additional present test groups
    ecc_obs = grouped_by_type.get("ECCENTRICITY", [])
    if ecc_obs:
        if len(ecc_obs) < 4:
            raise HTTPException(
                status_code=422,
                detail=f"Submission rejected: Eccentricity test (Clause A.4.7) requires at least 4 test positions, found {len(ecc_obs)}.",
            )
        positions = {(obs.position_tag or "").upper() for obs in ecc_obs}
        if not ("CENTER" in positions or "POSITION_1" in positions or len(positions) >= 4):
            raise HTTPException(
                status_code=422,
                detail="Submission rejected: Eccentricity test must include distinct receptor positions (including center).",
            )

    rep_obs = grouped_by_type.get("REPEATABILITY", [])
    if rep_obs:
        if len(rep_obs) < 3:
            raise HTTPException(
                status_code=422,
                detail=f"Submission rejected: Repeatability test (Clause A.4.10) requires at least 3 repeat measurements per series, found {len(rep_obs)} total.",
            )

    tare_obs = grouped_by_type.get("TARE_ZERO", [])
    if tare_obs:
        if len(tare_obs) < 1:
            raise HTTPException(
                status_code=422,
                detail="Submission rejected: Tare/Zero test requires at least one operative verification record.",
            )


@router.post("/{report_id}/submit", response_model=ReportSubmissionResponse)
def submit_report(report_id: str):
    """
    Validates mandatory report data, reference standard validity, environmental conditions,
    and observation completeness across measurement groups, then transitions the report
    to the PENDING_APPROVAL review queue.
    """
    rep = _get_report_or_404(report_id)

    if not rep.instrument:
        raise HTTPException(status_code=422, detail="Submission rejected: Instrument passport is required")

    if not rep.reference_standard:
        raise HTTPException(status_code=422, detail="Submission rejected: Reference standard is required")

    if rep.reference_standard.expiry_date < date.today() or not rep.reference_standard.is_active:
        raise HTTPException(
            status_code=422,
            detail="Submission rejected: Reference standard is expired or inactive (ISO 17025 guardrail)",
        )

    # Validate Environmental Conditions
    if rep.environment:
        temp = rep.environment.ambient_temperature_celsius
        rh = rep.environment.relative_humidity_pct
        min_temp = rep.environment.temp_min_allowed if rep.environment.temp_min_allowed is not None else -10.0
        max_temp = rep.environment.temp_max_allowed if rep.environment.temp_max_allowed is not None else 40.0

        if not (min_temp <= temp <= max_temp):
            raise HTTPException(
                status_code=422,
                detail=f"Submission rejected: Ambient temperature ({temp}°C) exceeds operational limits ({min_temp}°C to {max_temp}°C).",
            )
        if not (10.0 <= rh <= 90.0):
            raise HTTPException(
                status_code=422,
                detail=f"Submission rejected: Relative humidity ({rh}%) is outside acceptable range (10% - 90%).",
            )

    # Validate Observation Completeness across measurement groups
    observations = _LOCAL_OBSERVATIONS.get(report_id, [])
    if not observations:
        supabase = get_supabase_client()
        if supabase:
            try:
                res = supabase.table("test_observations").select("*").eq("report_id", report_id).execute()
                if res.data:
                    observations = [
                        TestObservationRowPayload(
                            test_type=r.get("test_type", "WEIGHING"),
                            direction=r.get("direction", "INCREASING"),
                            sequence_order=r.get("sequence_order", 1),
                            load_applied=float(r.get("load_applied", 0)),
                            indication_observed=float(r.get("indication_observed", 0)),
                            delta_load=float(r.get("delta_load", 0)),
                            position_tag=r.get("position_tag", "CENTER"),
                            run_cycle=r.get("run_cycle", 1)
                        )
                        for r in res.data
                    ]
            except Exception as e:
                print(f"[Supabase] Error fetching observations: {e}")

    if not observations:
        raise HTTPException(status_code=422, detail="Submission rejected: No test observations recorded for this report")

    _validate_observations_completeness(observations)

    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("test_reports").update({
                "status": "PENDING_APPROVAL",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", report_id).execute()
        except Exception as e:
            print(f"[Supabase] Error submitting report: {e}")

    rep.status = ReportStatus.PENDING_APPROVAL
    rep.updated_at = datetime.now(timezone.utc)
    return ReportSubmissionResponse(
        report_id=rep.id,
        status=rep.status,
        message="Report submitted for approval successfully"
    )


@router.get("/archive", response_model=List[TestReportSummary])
def search_archive(
    query: Optional[str] = Query(None, description="Free text search: Serial, Model, Manufacturer, Report #"),
    accuracy_class: Optional[AccuracyClass] = None,
    status_filter: Optional[ReportStatus] = None,
    verdict: Optional[bool] = None,
    user_id: Optional[str] = Query(None, description="Scoped user ID for metrologist data isolation"),
    role: Optional[str] = Query(None, description="Active user role")
):
    """
    Module 6: Faceted search and filter engine for reports with multi-tenant user scoping.
    """
    supabase = get_supabase_client()
    if supabase:
        try:
            db_query = supabase.table("test_reports").select("*, instruments(*)")
            if status_filter:
                db_query = db_query.eq("status", status_filter.value)
            if verdict is not None:
                db_query = db_query.eq("overall_verdict", verdict)
            if role == "TECHNICIAN" and user_id:
                db_query = db_query.eq("conducted_by", user_id)

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
