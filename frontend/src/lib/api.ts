import {
  InstrumentMeta,
  WeighingPointInput,
  WeighingBatchResponse,
  RepeatabilitySeriesResult,
  EccentricityPointInput,
  EccentricityBatchResponse,
  DashboardData,
  ReferenceStandard,
  Instrument,
  TestReportSummary,
  SanityCheckResult
} from '@/types/metrology';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Module 1: Dashboard API
export async function getDashboardData(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/metrics`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Dashboard API error: ${res.statusText}`);
  return res.json();
}

// Module 2: Reference Standards API
export async function listReferenceStandards(): Promise<ReferenceStandard[]> {
  const res = await fetch(`${API_BASE}/api/v1/standards/`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Standards API error: ${res.statusText}`);
  return res.json();
}

export async function checkStandardValidity(id: string): Promise<{ is_valid: boolean; guardrail_status: string }> {
  const res = await fetch(`${API_BASE}/api/v1/standards/${id}/check-validity`);
  if (!res.ok) throw new Error(`Standard validity check error: ${res.statusText}`);
  return res.json();
}

// Module 3: Instruments API
export async function listInstruments(): Promise<Instrument[]> {
  const res = await fetch(`${API_BASE}/api/v1/instruments/`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Instruments API error: ${res.statusText}`);
  return res.json();
}

export async function validateInstrumentSanity(spec: InstrumentMeta): Promise<SanityCheckResult> {
  const res = await fetch(`${API_BASE}/api/v1/instruments/validate-sanity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(`Sanity validation error: ${res.statusText}`);
  return res.json();
}

// Module 4: Live Test Evaluations
export async function evaluateWeighingPoints(
  instrument: InstrumentMeta,
  points: WeighingPointInput[]
): Promise<WeighingBatchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/metrology/evaluate-weighing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instrument, points }),
  });
  if (!res.ok) throw new Error(`Evaluation API error: ${res.statusText}`);
  return res.json();
}

export async function evaluateEccentricity(
  instrument: InstrumentMeta,
  points: EccentricityPointInput[]
): Promise<EccentricityBatchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/metrology/evaluate-eccentricity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instrument, points }),
  });
  if (!res.ok) throw new Error(`Eccentricity evaluation error: ${res.statusText}`);
  return res.json();
}

// Module 5: Verification API
export async function submitVerificationAction(
  reportId: string,
  action: 'APPROVE' | 'REJECT',
  officerPin?: string,
  remarks?: string
) {
  const res = await fetch(`${API_BASE}/api/v1/verification/reports/${reportId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, officer_pin: officerPin, remarks }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Verification action failed');
  }
  return res.json();
}

// Module 6: Searchable Archive API
export async function searchArchive(query?: string): Promise<TestReportSummary[]> {
  const url = query
    ? `${API_BASE}/api/v1/reports/archive?query=${encodeURIComponent(query)}`
    : `${API_BASE}/api/v1/reports/archive`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Archive API error: ${res.statusText}`);
  return res.json();
}

export async function verifyPublicReport(reportId: string) {
  const res = await fetch(`${API_BASE}/api/v1/reports/verify/${reportId}`);
  if (!res.ok) throw new Error(`Verification lookup error: ${res.statusText}`);
  return res.json();
}
