from fastapi import APIRouter, HTTPException, status
from datetime import date, datetime, timedelta
from typing import List
from app.schemas.reference_standard import (
    ReferenceStandardCreate,
    ReferenceStandardUpdate,
    ReferenceStandardOut
)

router = APIRouter()

# In-memory storage for seeded standards (synced with Supabase schema)
STANDARDS_DB: List[ReferenceStandardOut] = [
    ReferenceStandardOut(
        id="std-001",
        set_identifier="NPL-E2-SET-04",
        accuracy_class="E2",
        certificate_number="CAL-2025-0892",
        calibrated_by="National Physical Laboratory (NPL)",
        calibration_date=date(2025, 6, 15),
        expiry_date=date(2026, 6, 15),
        expanded_uncertainty_k2=0.0001,
        nominal_range="1 mg to 50 kg",
        is_active=True,
        is_expired=False,
        days_to_expiry=120,
        created_at=datetime.now()
    ),
    ReferenceStandardOut(
        id="std-002",
        set_identifier="NPL-F1-SET-08",
        accuracy_class="F1",
        certificate_number="CAL-2025-1102",
        calibrated_by="National Physical Laboratory (NPL)",
        calibration_date=date(2025, 9, 1),
        expiry_date=date(2026, 9, 1),
        expanded_uncertainty_k2=0.0005,
        nominal_range="1 g to 20 kg",
        is_active=True,
        is_expired=False,
        days_to_expiry=25,
        created_at=datetime.now()
    ),
    ReferenceStandardOut(
        id="std-003",
        set_identifier="RRSL-M1-SET-12",
        accuracy_class="M1",
        certificate_number="CAL-2024-0419",
        calibrated_by="Regional Reference Standard Laboratory",
        calibration_date=date(2024, 4, 10),
        expiry_date=date(2025, 4, 10),
        expanded_uncertainty_k2=0.002,
        nominal_range="100 g to 500 kg",
        is_active=False,
        is_expired=True,
        days_to_expiry=-160,
        created_at=datetime.now()
    )
]

@router.get("/", response_model=List[ReferenceStandardOut])
def list_reference_standards():
    """
    Returns all registered reference standards with traceability metrics and expiry status.
    """
    today = date.today()
    for s in STANDARDS_DB:
        diff = (s.expiry_date - today).days
        s.days_to_expiry = diff
        s.is_expired = diff < 0
    return STANDARDS_DB

@router.post("/", response_model=ReferenceStandardOut, status_code=status.HTTP_201_CREATED)
def create_reference_standard(payload: ReferenceStandardCreate):
    """
    Registers a new standard weight set conforming to ISO/IEC 17025 traceability.
    """
    today = date.today()
    diff = (payload.expiry_date - today).days
    new_id = f"std-{len(STANDARDS_DB) + 1:03d}"
    
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
        created_at=datetime.now()
    )
    STANDARDS_DB.append(new_standard)
    return new_standard

@router.get("/{standard_id}/check-validity")
def check_standard_validity(standard_id: str):
    """
    Enforces automated guardrail: halts test creation if the selected weight set is expired.
    """
    std = next((s for s in STANDARDS_DB if s.id == standard_id), None)
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
