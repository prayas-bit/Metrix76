from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from typing import List
from app.schemas.instrument import InstrumentCreate, InstrumentOut, InstrumentAttachment
from app.schemas.metrology import InstrumentMeta, SanityCheckResult, AccuracyClass
from app.services.metrology.sanity import InstrumentSanityEngine

router = APIRouter()

INSTRUMENTS_DB: List[InstrumentOut] = [
    InstrumentOut(
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
        attachments=[
            InstrumentAttachment(
                id="att-1",
                attachment_type="NAMEPLATE",
                storage_path="instrument-photos/inst-001/nameplate.jpg",
                file_name="nameplate.jpg",
                uploaded_at=datetime.now()
            )
        ],
        created_at=datetime.now()
    ),
    InstrumentOut(
        id="inst-002",
        serial_number="SN-2026-NAWI-9012",
        model_name="MicroBalance Ultra 500",
        manufacturer_name="Sartorius India",
        accuracy_class=AccuracyClass.CLASS_I,
        max_capacity=0.5,
        min_capacity=0.001,
        scale_interval_d=0.00001,
        verification_interval_e=0.00001,
        unit="kg",
        is_multi_interval=False,
        load_receptor_type="Enclosed Pan",
        indicator_make_model="SART-DIGI-10",
        year_of_manufacture=2026,
        calculated_n=50000,
        attachments=[],
        created_at=datetime.now()
    )
]

@router.get("/", response_model=List[InstrumentOut])
def list_instruments():
    return INSTRUMENTS_DB

@router.get("/{instrument_id}", response_model=InstrumentOut)
def get_instrument(instrument_id: str):
    inst = next((i for i in INSTRUMENTS_DB if i.id == instrument_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found")
    return inst

@router.post("/validate-sanity", response_model=SanityCheckResult)
def validate_instrument_sanity(payload: InstrumentMeta):
    """
    Executes structural sanity engine validating e >= d, n limits, and min capacity.
    """
    return InstrumentSanityEngine.validate_spec(payload)

@router.post("/", response_model=InstrumentOut, status_code=status.HTTP_201_CREATED)
def create_instrument(payload: InstrumentCreate):
    meta = InstrumentMeta(
        accuracy_class=payload.accuracy_class,
        max_capacity=payload.max_capacity,
        min_capacity=payload.min_capacity,
        scale_interval_d=payload.scale_interval_d,
        verification_interval_e=payload.verification_interval_e,
        unit=payload.unit,
        is_multi_interval=payload.is_multi_interval,
        multi_interval_ranges=payload.multi_interval_spec
    )
    sanity = InstrumentSanityEngine.validate_spec(meta)
    if not sanity.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Instrument parameters violate OIML R 76 rules", "issues": sanity.issues}
        )

    new_id = f"inst-{len(INSTRUMENTS_DB) + 1:03d}"
    new_inst = InstrumentOut(
        id=new_id,
        serial_number=payload.serial_number,
        model_name=payload.model_name,
        manufacturer_name=payload.manufacturer_name,
        accuracy_class=payload.accuracy_class,
        max_capacity=payload.max_capacity,
        min_capacity=payload.min_capacity,
        scale_interval_d=payload.scale_interval_d,
        verification_interval_e=payload.verification_interval_e,
        unit=payload.unit,
        is_multi_interval=payload.is_multi_interval,
        multi_interval_spec=payload.multi_interval_spec,
        load_receptor_type=payload.load_receptor_type,
        indicator_make_model=payload.indicator_make_model,
        year_of_manufacture=payload.year_of_manufacture,
        calculated_n=sanity.calculated_n,
        attachments=[],
        created_at=datetime.now()
    )
    INSTRUMENTS_DB.append(new_inst)
    return new_inst
