from fastapi import APIRouter, HTTPException, status
from datetime import date, datetime, timezone
from typing import List
from app.schemas.reference_standard import (
    ReferenceStandardCreate,
    ReferenceStandardOut
)
from app.core.supabase import get_supabase_client

router = APIRouter()

# In-memory local cache when database is unreachable
_LOCAL_CACHE: List[ReferenceStandardOut] = []


def _map_row_to_standard(row: dict) -> ReferenceStandardOut:
    """Helper to convert Supabase row to ReferenceStandardOut model."""
    exp_date = date.fromisoformat(row["expiry_date"])
    today = date.today()
    diff = (exp_date - today).days

    return ReferenceStandardOut(
        id=str(row["id"]),
        set_identifier=row["set_identifier"],
        accuracy_class=row["accuracy_class"],
        certificate_number=row["certificate_number"],
        calibrated_by=row["calibrated_by"],
        calibration_date=date.fromisoformat(row["calibration_date"]),
        expiry_date=exp_date,
        expanded_uncertainty_k2=float(row.get("expanded_uncertainty_k2") or 0.0001),
        nominal_range=row.get("nominal_range") or "1 mg to 50 kg",
        is_active=row.get("is_active", True),
        is_expired=diff < 0,
        days_to_expiry=diff,
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if "created_at" in row else datetime.now(timezone.utc)
    )


@router.get("/", response_model=List[ReferenceStandardOut])
def list_reference_standards():
    """
    Returns all registered reference standards from Supabase with computed expiry metrics.
    """
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("reference_standards").select("*").order("expiry_date", desc=False).execute()
            if res.data:
                return [_map_row_to_standard(r) for r in res.data]
        except Exception as e:
            print(f"[Supabase] Error listing standards: {e}")

    today = date.today()
    for s in _LOCAL_CACHE:
        diff = (s.expiry_date - today).days
        s.days_to_expiry = diff
        s.is_expired = diff < 0
    return _LOCAL_CACHE


@router.post("/", response_model=ReferenceStandardOut, status_code=status.HTTP_201_CREATED)
def create_reference_standard(payload: ReferenceStandardCreate):
    """
    Registers a new standard weight set in Supabase conforming to ISO/IEC 17025 traceability.
    """
    today = date.today()
    diff = (payload.expiry_date - today).days

    supabase = get_supabase_client()
    if supabase:
        try:
            insert_data = {
                "set_identifier": payload.set_identifier,
                "accuracy_class": payload.accuracy_class,
                "certificate_number": payload.certificate_number,
                "calibrated_by": payload.calibrated_by,
                "calibration_date": payload.calibration_date.isoformat(),
                "expiry_date": payload.expiry_date.isoformat(),
                "is_active": payload.is_active
            }
            res = supabase.table("reference_standards").insert(insert_data).execute()
            if res.data and len(res.data) > 0:
                return _map_row_to_standard(res.data[0])
        except Exception as e:
            print(f"[Supabase] Error creating reference standard: {e}")

    new_id = f"std-{len(_LOCAL_CACHE) + 1:03d}"
    new_standard = ReferenceStandardOut(
        id=new_id,
        set_identifier=payload.set_identifier,
        accuracy_class=payload.accuracy_class,
        certificate_number=payload.certificate_number,
        calibrated_by=payload.calibrated_by,
        calibration_date=payload.calibration_date,
        expiry_date=payload.expiry_date,
        expanded_uncertainty_k2=payload.expanded_uncertainty_k2,
        nominal_range=payload.nominal_range,
        is_active=payload.is_active,
        is_expired=diff < 0,
        days_to_expiry=diff,
        created_at=datetime.now(timezone.utc)
    )
    _LOCAL_CACHE.append(new_standard)
    return new_standard


@router.get("/{standard_id}/check-validity")
def check_standard_validity(standard_id: str):
    """
    Enforces automated guardrail: halts test creation if the selected weight set is expired.
    """
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("reference_standards").select("*").eq("id", standard_id).execute()
            if res.data and len(res.data) > 0:
                std = _map_row_to_standard(res.data[0])
                today = date.today()
                is_valid = std.expiry_date >= today and std.is_active
                return {
                    "standard_id": std.id,
                    "set_identifier": std.set_identifier,
                    "is_valid": is_valid,
                    "is_expired": std.expiry_date < today,
                    "expiry_date": std.expiry_date,
                    "guardrail_status": "ALLOWED" if is_valid else "BLOCKED_EXPIRED"
                }
        except Exception as e:
            print(f"[Supabase] Error validating standard: {e}")

    std = next((s for s in _LOCAL_CACHE if s.id == standard_id), None)
    if not std:
        raise HTTPException(status_code=404, detail="Reference standard not found")

    today = date.today()
    is_valid = std.expiry_date >= today and std.is_active
    return {
        "standard_id": std.id,
        "set_identifier": std.set_identifier,
        "is_valid": is_valid,
        "is_expired": std.expiry_date < today,
        "expiry_date": std.expiry_date,
        "guardrail_status": "ALLOWED" if is_valid else "BLOCKED_EXPIRED"
    }
