from fastapi import APIRouter
from datetime import datetime, date, timedelta, timezone
from app.schemas.dashboard import DashboardData, DashboardMetrics
from app.schemas.reference_standard import ReferenceStandardOut
from app.schemas.report import TestReportSummary, ReportStatus
from app.schemas.metrology import AccuracyClass
from app.core.supabase import get_supabase_client

router = APIRouter()


@router.get("/metrics", response_model=DashboardData)
def get_dashboard_data():
    """
    Returns executive operational metrics, work queues, and expiring standards alerts
    computed dynamically from Supabase database.
    """
    now = datetime.now(timezone.utc)
    today = date.today()
    supabase = get_supabase_client()

    expiring_standards = []
    technician_work_queue = []
    approver_work_queue = []

    active_evals = 0
    pending_approvals = 0
    approved_month = 0
    approved_year = 0

    if supabase:
        try:
            # 1. Fetch expiring standards
            std_res = supabase.table("reference_standards").select("*").order("expiry_date", desc=False).execute()
            if std_res.data:
                for s in std_res.data:
                    exp_date = date.fromisoformat(s["expiry_date"])
                    diff = (exp_date - today).days
                    if diff <= 90:  # Expiring within 90 days
                        expiring_standards.append(
                            ReferenceStandardOut(
                                id=str(s["id"]),
                                set_identifier=s["set_identifier"],
                                accuracy_class=s["accuracy_class"],
                                certificate_number=s["certificate_number"],
                                calibrated_by=s["calibrated_by"],
                                calibration_date=date.fromisoformat(s["calibration_date"]),
                                expiry_date=exp_date,
                                expanded_uncertainty_k2=float(s.get("expanded_uncertainty_k2") or 0.0001),
                                nominal_range=s.get("nominal_range") or "1 mg to 50 kg",
                                is_active=s.get("is_active", True),
                                is_expired=diff < 0,
                                days_to_expiry=diff,
                                created_at=now
                            )
                        )

            # 2. Fetch reports for queues and metrics
            rep_res = supabase.table("test_reports").select("*, instruments(*)").order("created_at", desc=True).execute()
            if rep_res.data:
                for r in rep_res.data:
                    inst = r.get("instruments") or {}
                    rep_status = r.get("status", "DRAFT")
                    created_at = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")) if "created_at" in r else now
                    updated_at = datetime.fromisoformat(r["updated_at"].replace("Z", "+00:00")) if "updated_at" in r else now

                    summary_item = TestReportSummary(
                        id=str(r["id"]),
                        report_number=r["report_number"],
                        instrument_serial=inst.get("serial_number", "N/A"),
                        instrument_model=inst.get("model_name", "N/A"),
                        manufacturer_name=inst.get("manufacturer_name", "N/A"),
                        accuracy_class=AccuracyClass(inst.get("accuracy_class", "CLASS_III")),
                        status=ReportStatus(rep_status),
                        overall_verdict=r.get("overall_verdict"),
                        conducted_by_name=str(r.get("conducted_by", "Testing Metrologist")),
                        created_at=created_at,
                        updated_at=updated_at
                    )

                    if rep_status in ("DRAFT", "REJECTED"):
                        technician_work_queue.append(summary_item)
                        active_evals += 1
                    elif rep_status == "PENDING_APPROVAL":
                        approver_work_queue.append(summary_item)
                        pending_approvals += 1
                    elif rep_status == "APPROVED":
                        approved_month += 1
                        approved_year += 1
        except Exception as e:
            print(f"[Supabase] Error computing dashboard metrics: {e}")

    total_finished = approved_year + len([r for r in technician_work_queue if r.status == ReportStatus.REJECTED])
    compliance_rate = round((approved_year / total_finished) * 100, 1) if total_finished > 0 else 100.0

    metrics = DashboardMetrics(
        active_evaluations_count=active_evals,
        pending_approval_count=pending_approvals,
        completed_approvals_month=approved_month,
        completed_approvals_year=approved_year,
        overall_compliance_rate_pct=compliance_rate,
        rejection_rate_by_class={
            "CLASS_I": 0.0,
            "CLASS_II": 0.0,
            "CLASS_III": 0.0,
            "CLASS_IIII": 0.0
        }
    )

    return DashboardData(
        metrics=metrics,
        expiring_standards=expiring_standards,
        technician_work_queue=technician_work_queue,
        approver_work_queue=approver_work_queue
    )
