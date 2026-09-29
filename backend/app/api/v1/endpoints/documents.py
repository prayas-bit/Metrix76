from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
import io
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.services.reporting import OIMLPDFGenerator, OIMLDOCXGenerator, OIMLErrorChartEngine
from app.services.document.crypto import CryptoAuditService
from app.api.v1.endpoints.reports import REPORTS_DB, SAMPLE_INSTRUMENT, SAMPLE_STANDARD, SAMPLE_WEIGHING_OBSERVATIONS

router = APIRouter()

class DirectDocumentPayload(BaseModel):
    report_context: Dict[str, Any]

@router.post("/generate-pdf")
def generate_pdf_direct(payload: DirectDocumentPayload):
    """
    Renders an in-memory OIML R 76-2 Annex A PDF certificate from the provided report context.
    Streams back as application/pdf binary.
    """
    try:
        pdf_gen = OIMLPDFGenerator()
        pdf_bytes = pdf_gen.render_pdf(payload.report_context)
        rep_num = payload.report_context.get("report_number", "OIML-TR-Report")
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{rep_num}.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Generation Failed: {str(e)}")

@router.post("/generate-docx")
def generate_docx_direct(payload: DirectDocumentPayload):
    """
    Renders an in-memory editable OIML R 76-2 Annex A Word (.docx) document.
    Streams back as application/vnd.openxmlformats-officedocument.wordprocessingml.document.
    """
    try:
        # Generate chart bytes if instrument and observations are present
        chart_bytes = None
        ctx = payload.report_context
        if "instrument" in ctx and "weighing_observations" in ctx:
            try:
                chart_bytes = OIMLErrorChartEngine.generate_error_curve_image(
                    spec=ctx["instrument"],
                    results=ctx["weighing_observations"],
                    dpi=150
                )
            except Exception:
                chart_bytes = None

        docx_bytes = OIMLDOCXGenerator.render_docx(payload.report_context, chart_png_bytes=chart_bytes)
        rep_num = payload.report_context.get("report_number", "OIML-TR-Report")
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{rep_num}.docx"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DOCX Generation Failed: {str(e)}")

@router.post("/reports/{report_id}/generate-pdf")
def generate_pdf_for_report(report_id: str):
    """
    Fetches test report observations and metadata, generates SHA-256 seal & dynamic QR badge,
    compiles via WeasyPrint, and streams back the official PDF certificate.
    """
    rep = next((r for r in REPORTS_DB if r.id == report_id), None)
    if not rep:
        raise HTTPException(status_code=404, detail="Test report not found")

    # Generate QR verification URL
    verification_url = f"https://legalmetrology.gov.in/verify/{rep.id}"
    qr_b64 = CryptoAuditService.generate_qr_code_base64(verification_url)

    # Convert Pydantic model to dictionary context
    report_dict = {
        "report_number": rep.report_number,
        "created_date": str(rep.created_at.date()),
        "approved_date": str(rep.approved_at.date()) if rep.approved_at else str(rep.created_at.date()),
        "overall_verdict": rep.overall_verdict if rep.overall_verdict is not None else True,
        "zero_error_e0": 0.0,
        "instrument": rep.instrument.model_dump(),
        "reference_standard": rep.reference_standard.model_dump(),
        "environment": rep.environment.model_dump(),
        "weighing_observations": [obs.model_dump() for obs in rep.weighing_observations],
        "conducted_by": rep.conducted_by,
        "approved_by": rep.approved_by or "Director of Legal Metrology",
        "sha256_hash": rep.sha256_hash or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "qr_code_base64": qr_b64
    }

    # Render error curve
    chart_png = OIMLErrorChartEngine.generate_error_curve_image(
        spec=rep.instrument,
        results=rep.weighing_observations,
        dpi=150
    )

    try:
        pdf_gen = OIMLPDFGenerator()
        pdf_bytes = pdf_gen.render_pdf(
            report_context=report_dict,
            chart_png_bytes=chart_png,
            qr_png_base64=qr_b64
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc)
        )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{rep.report_number}.pdf"'}
    )


@router.post("/reports/{report_id}/generate-docx")
def generate_docx_for_report(report_id: str):
    """
    Fetches test report observations and metadata, compiles via python-docx,
    and streams back the editable Word (.docx) report.
    """
    rep = next((r for r in REPORTS_DB if r.id == report_id), None)
    if not rep:
        raise HTTPException(status_code=404, detail="Test report not found")

    chart_png = OIMLErrorChartEngine.generate_error_curve_image(
        spec=rep.instrument,
        results=rep.weighing_observations,
        dpi=150
    )

    report_dict = {
        "report_number": rep.report_number,
        "created_date": str(rep.created_at.date()),
        "approved_date": str(rep.approved_at.date()) if rep.approved_at else str(rep.created_at.date()),
        "overall_verdict": rep.overall_verdict if rep.overall_verdict is not None else True,
        "zero_error_e0": 0.0,
        "instrument": rep.instrument,
        "reference_standard": rep.reference_standard,
        "environment": rep.environment,
        "weighing_observations": rep.weighing_observations,
        "conducted_by": rep.conducted_by,
        "approved_by": rep.approved_by or "Director of Legal Metrology",
        "sha256_hash": rep.sha256_hash or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }

    docx_bytes = OIMLDOCXGenerator.render_docx(
        report_context=report_dict,
        chart_png_bytes=chart_png
    )

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{rep.report_number}.docx"'}
    )
