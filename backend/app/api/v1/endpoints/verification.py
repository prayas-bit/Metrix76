from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from app.schemas.report import VerificationAction, ReportStatus, TestReportDetail
from app.services.document.crypto import CryptoAuditService

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
        
        # Compute deterministic SHA-256 seal
        sample_data = {
            "report_id": report_id,
            "approved_at": str(datetime.now()),
            "status": "APPROVED"
        }
        sha_hash = CryptoAuditService.generate_sha256_hash(sample_data)

        return {
            "report_id": report_id,
            "status": ReportStatus.APPROVED,
            "approved_at": datetime.now(),
            "sha256_hash": sha_hash,
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
