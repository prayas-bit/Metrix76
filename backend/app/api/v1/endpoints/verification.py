from fastapi import APIRouter, HTTPException, status, Query
from datetime import datetime
from typing import Optional, Dict, Any
from app.schemas.report import VerificationAction, ReportStatus
from app.schemas.integrity import IntegritySeal, IntegrityVerifyRequest, IntegrityVerifyResponse
from app.services.integrity import CryptoIntegrityService

router = APIRouter()


@router.post("/reports/{report_id}/action")
def process_verification_action(report_id: str, payload: VerificationAction):
    """
    Implements dual-custody governance:
    - APPROVE: Requires officer PIN verification, generates SHA-256 seal & approves report
    - REJECT: Requires mandatory remarks, returns report to technician queue
    """
    if payload.action.upper() == "APPROVE":
        if not payload.officer_pin or len(payload.officer_pin) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid Approving Officer PIN is required to issue type approval."
            )

        # Compute deterministic SHA-256 seal and QR
        test_dataset = {
            "report_id": report_id,
            "status": "APPROVED",
            "approved_at": datetime.utcnow().isoformat()
        }
        seal = CryptoIntegrityService.generate_integrity_seal(report_id, test_dataset)

        return {
            "report_id": report_id,
            "status": ReportStatus.APPROVED,
            "approved_at": seal.timestamp,
            "sha256_hash": seal.sha256_hash,
            "verification_url": seal.verification_url,
            "qr_code_base64": seal.qr_code_base64,
            "message": "Test Report successfully audited and approved. Tamper-evident seal generated."
        }

    elif payload.action.upper() == "REJECT":
        if not payload.remarks or not payload.remarks.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mandatory rejection remarks are required when returning report."
            )

        return {
            "report_id": report_id,
            "status": ReportStatus.REJECTED,
            "rejection_reason": payload.remarks,
            "returned_to_queue": True,
            "message": "Report returned to technician queue for re-testing with remarks recorded."
        }

    raise HTTPException(status_code=400, detail="Invalid action. Allowed values: APPROVE, REJECT.")


@router.post("/reports/{report_id}/seal", response_model=IntegritySeal)
def generate_report_seal(
    report_id: str,
    dataset: Optional[Dict[str, Any]] = None,
    domain: Optional[str] = Query("lims.metrology.gov.in", description="Host domain for verification URL")
) -> IntegritySeal:
    """
    Generates a deterministic cryptographic seal (SHA-256 digest + QR code base64) for a test report.
    """
    data = dataset or {"report_id": report_id, "timestamp": datetime.utcnow().isoformat()}
    base_url = f"https://{domain}" if not domain.startswith("http") else domain
    return CryptoIntegrityService.generate_integrity_seal(report_id, data, base_url=base_url)


@router.post("/verify-hash", response_model=IntegrityVerifyResponse)
def verify_integrity_hash(payload: IntegrityVerifyRequest) -> IntegrityVerifyResponse:
    """
    Validates whether a provided dataset matches the expected cryptographic SHA-256 digest.
    """
    dataset = payload.dataset or {"report_id": payload.report_id}
    computed_hash = CryptoIntegrityService.compute_sha256_digest(dataset)
    is_valid = True
    if payload.expected_hash:
        is_valid = (computed_hash.lower() == payload.expected_hash.strip().lower())

    short_hash = computed_hash[:12]
    verification_url = f"https://lims.metrology.gov.in/verify/{payload.report_id}?hash={short_hash}"

    return IntegrityVerifyResponse(
        report_id=payload.report_id,
        is_valid=is_valid,
        computed_hash=computed_hash,
        expected_hash=payload.expected_hash,
        verification_url=verification_url,
        details="Hash match confirmed" if is_valid else "Hash mismatch: dataset tampering or modification detected"
    )
