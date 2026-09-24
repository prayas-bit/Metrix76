from fastapi import APIRouter
from datetime import datetime, date, timedelta
from app.schemas.dashboard import DashboardData, DashboardMetrics
from app.schemas.reference_standard import ReferenceStandardOut
from app.schemas.report import TestReportSummary, ReportStatus
from app.schemas.metrology import AccuracyClass

router = APIRouter()

@router.get("/metrics", response_model=DashboardData)
def get_dashboard_data():
    """
    Returns executive operational metrics, work queues, and expiring standards alerts.
    """
    now = datetime.now()
    
    # Mock / Seeded operational metrics
    metrics = DashboardMetrics(
        active_evaluations_count=4,
        pending_approval_count=2,
        completed_approvals_month=18,
        completed_approvals_year=142,
        overall_compliance_rate_pct=94.2,
        rejection_rate_by_class={
            "CLASS_I": 3.1,
            "CLASS_II": 5.4,
            "CLASS_III": 6.8,
            "CLASS_IIII": 12.0
        }
    )

    expiring_standards = [
        ReferenceStandardOut(
            id="std-001",
            set_identifier="NPL-F1-SET-08",
            accuracy_class="F1",
            certificate_number="CAL-2025-1102",
            calibrated_by="National Physical Laboratory",
            calibration_date=date.today() - timedelta(days=340),
            expiry_date=date.today() + timedelta(days=25),
            expanded_uncertainty_k2=0.0005,
            nominal_range="1 mg to 20 kg",
            is_active=True,
            is_expired=False,
            days_to_expiry=25,
            created_at=now
        )
    ]

    technician_work_queue = [
        TestReportSummary(
            id="rep-101",
            report_number="OIML-2026-TR-0042",
            instrument_serial="SN-2026-NAWI-8891",
            instrument_model="PreciseWeigh Pro 15",
            manufacturer_name="Avery Metrology Ltd.",
            accuracy_class=AccuracyClass.CLASS_III,
            status=ReportStatus.DRAFT,
            overall_verdict=None,
            conducted_by_name="T. Sharma (Testing Metrologist)",
            created_at=now - timedelta(hours=3),
            updated_at=now - timedelta(minutes=15)
        ),
        TestReportSummary(
            id="rep-102",
            report_number="OIML-2026-TR-0043",
            instrument_serial="SN-2026-NAWI-9012",
            instrument_model="MicroBalance Ultra 500",
            manufacturer_name="Sartorius India",
            accuracy_class=AccuracyClass.CLASS_I,
            status=ReportStatus.DRAFT,
            overall_verdict=None,
            conducted_by_name="T. Sharma (Testing Metrologist)",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(minutes=30)
        )
    ]

    approver_work_queue = [
        TestReportSummary(
            id="rep-100",
            report_number="OIML-2026-TR-0041",
            instrument_serial="SN-2026-NAWI-8720",
            instrument_model="HeavyDuty Bridge 30T",
            manufacturer_name="Mettler Toledo",
            accuracy_class=AccuracyClass.CLASS_III,
            status=ReportStatus.PENDING_APPROVAL,
            overall_verdict=True,
            conducted_by_name="A. Verma (Testing Metrologist)",
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=2)
        )
    ]

    return DashboardData(
        metrics=metrics,
        expiring_standards=expiring_standards,
        technician_work_queue=technician_work_queue,
        approver_work_queue=approver_work_queue
    )
