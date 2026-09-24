from typing import List, Dict, Optional
from pydantic import BaseModel
from app.schemas.report import TestReportSummary
from app.schemas.reference_standard import ReferenceStandardOut

class DashboardMetrics(BaseModel):
    active_evaluations_count: int
    pending_approval_count: int
    completed_approvals_month: int
    completed_approvals_year: int
    overall_compliance_rate_pct: float
    rejection_rate_by_class: Dict[str, float]

class DashboardData(BaseModel):
    metrics: DashboardMetrics
    expiring_standards: List[ReferenceStandardOut]
    technician_work_queue: List[TestReportSummary]
    approver_work_queue: List[TestReportSummary]
