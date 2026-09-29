'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  Download,
  KeyRound,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Layers,
  Thermometer,
  Droplets,
  Gauge,
  Eye,
  QrCode
} from 'lucide-react';
import { getReportDetail, submitVerificationAction, getReportPdfUrl, getReportDocxUrl } from '@/lib/api';
import ToleranceCorridor from '@/components/worksheets/ToleranceCorridor';
import { formatDate } from '@/lib/utils';

export default function ApproverReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;
  const router = useRouter();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [officerPin, setOfficerPin] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Post Approval State
  const [sealData, setSealData] = useState<any>(null);

  useEffect(() => {
    if (reportId) {
      getReportDetail(reportId)
        .then(setReport)
        .catch((err) => setError(err.message || 'Failed to load report for review'))
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerPin || officerPin.length < 4) {
      setActionError('Please enter a valid 4+ digit Approving Officer PIN.');
      return;
    }
    setSubmittingAction(true);
    setActionError(null);
    try {
      const res = await submitVerificationAction(reportId, 'APPROVE', officerPin);
      setSealData(res);
      setReport((prev: any) => ({
        ...prev,
        status: 'APPROVED',
        sha256_hash: res.sha256_hash,
        approved_at: res.approved_at,
      }));
      setShowApproveModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to authorize and approve report.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRemarks.trim()) {
      setActionError('Mandatory technical remarks are required for rejection.');
      return;
    }
    setSubmittingAction(true);
    setActionError(null);
    try {
      await submitVerificationAction(reportId, 'REJECT', undefined, rejectRemarks);
      setReport((prev: any) => ({
        ...prev,
        status: 'REJECTED',
        rejection_reason: rejectRemarks,
      }));
      setShowRejectModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject report.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-xs text-slate-500">
        Loading test evaluation record and cryptographic dataset...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center text-xs">
          <h3 className="font-bold text-sm mb-1">Evaluation Record Not Found</h3>
          <p>{error || 'The requested evaluation report could not be retrieved.'}</p>
        </div>
      </div>
    );
  }

  const inst = report.instrument;
  const std = report.reference_standard;
  const env = report.environment;
  const isApproved = report.status === 'APPROVED';
  const isRejected = report.status === 'REJECTED';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/verification')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Two-Man Verification & Review Console
              </h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-black uppercase rounded-full border ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isRejected
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {report.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Report ID: {report.report_number} • Serial: {inst.serial_number} • Standard:{' '}
              {report.standard_version}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isApproved && !isRejected && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowRejectModal(true);
                }}
                className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Reject & Return
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowApproveModal(true);
                }}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                Sign & Authorize (PIN)
              </button>
            </>
          )}

          {isApproved && (
            <div className="flex items-center gap-2">
              <a
                href={getReportPdfUrl(report.id)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-800 transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download PDF
              </a>
              <a
                href={getReportDocxUrl(report.id)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-700 transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                Download DOCX
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Post-Approval Tamper-Evident SHA-256 Banner */}
      {isApproved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Cryptographically Sealed & Approved
              </h3>
              <p className="text-[11px] font-mono text-emerald-800">
                SHA-256 Digest: {report.sha256_hash || sealData?.sha256_hash || 'Computed & Locked'}
              </p>
            </div>
          </div>
          <a
            href={`/verify/${report.id}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-white text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-50 flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            Public Verification Portal
          </a>
        </div>
      )}

      {/* Rejection Notice Banner */}
      {isRejected && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <span className="font-bold uppercase tracking-wide">
              Evaluation Returned for Re-testing
            </span>
            <p className="text-[11px] text-rose-800">
              Remarks: {report.rejection_reason || 'Technical non-compliance noted during review.'}
            </p>
          </div>
        </div>
      )}

      {/* Metadata Grids: Instrument + Standard + Ambient */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Instrument Passport Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <span>Instrument Passport</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Model</span>
              <span className="font-bold text-slate-800">{inst.model_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Class</span>
              <span className="font-bold text-blue-900">{inst.accuracy_class}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Capacity (Max)</span>
              <span className="font-bold text-slate-800 font-mono">
                {inst.max_capacity} {inst.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Interval (e)</span>
              <span className="font-bold text-slate-800 font-mono">
                {inst.verification_interval_e} {inst.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Reference Standard Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Standard Weight Set</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Set ID</span>
              <span className="font-bold text-slate-800">{std.set_identifier}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Weight Class</span>
              <span className="font-bold text-emerald-800">{std.accuracy_class}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Certificate</span>
              <span className="font-mono text-slate-800 text-[11px]">{std.certificate_number}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">ISO 17025 Expiry</span>
              <span className="font-bold text-slate-800">{formatDate(std.expiry_date)}</span>
            </div>
          </div>
        </div>

        {/* Ambient Conditions Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
            <Thermometer className="w-4 h-4 text-amber-700" />
            <span>Ambient Environment</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Temp</span>
              <span className="font-bold text-slate-800 font-mono">
                {env.ambient_temperature_celsius}°C
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Humidity</span>
              <span className="font-bold text-slate-800 font-mono">{env.relative_humidity_pct}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Pressure</span>
              <span className="font-bold text-slate-800 font-mono">
                {env.atmospheric_pressure_hpa || 1013.25} hPa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Recharts Tolerance Corridor Envelope */}
      <ToleranceCorridor
        instrument={inst}
        results={report.weighing_observations || []}
      />

      {/* Weighing Performance Observation Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Weighing Test Observations & Error Vector Data (Clause A.4.4)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                <th className="p-2.5">Direction</th>
                <th className="p-2.5">Load Applied (L)</th>
                <th className="p-2.5">Indication (I)</th>
                <th className="p-2.5">Delta Load (ΔL)</th>
                <th className="p-2.5">Turning Point (P)</th>
                <th className="p-2.5">Corrected Error (Ec)</th>
                <th className="p-2.5">Allowable (±mpe)</th>
                <th className="p-2.5">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(report.weighing_observations || []).map((obs: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2.5 font-bold text-slate-600">
                    {obs.direction === 'INCREASING' ? '▲ Increasing' : '▼ Decreasing'}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-900">
                    {obs.load_applied} {inst.unit}
                  </td>
                  <td className="p-2.5 font-mono text-slate-700">
                    {obs.indication_observed} {inst.unit}
                  </td>
                  <td className="p-2.5 font-mono text-slate-700">
                    {obs.delta_load} {inst.unit}
                  </td>
                  <td className="p-2.5 font-mono text-slate-700">
                    {obs.calculated_p?.toFixed(4)} {inst.unit}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-blue-900">
                    {obs.corrected_error_ec > 0 ? '+' : ''}
                    {obs.corrected_error_ec?.toFixed(4)} {inst.unit}
                  </td>
                  <td className="p-2.5 font-mono text-rose-700">
                    ±{obs.mpe_allowed?.toFixed(4)} {inst.unit}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        obs.is_compliant
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {obs.is_compliant ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal (PIN Input) */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-blue-900 text-white rounded-xl">
                <KeyRound className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Dual-Custody Approving Officer Sign-Off
                </h3>
                <p className="text-xs text-slate-500">
                  Requires authorized PIN to generate SHA-256 seal & issue certificate.
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Approving Officer PIN / Passkey
                </label>
                <input
                  type="password"
                  value={officerPin}
                  onChange={(e) => setOfficerPin(e.target.value)}
                  placeholder="Enter 4-digit PIN (e.g. 1234)"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                By approving, you certify that all tests comply with OIML R 76-1:2006 and the Legal
                Metrology Act, 2009.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-800 transition-all flex items-center gap-1.5"
                >
                  {submittingAction ? 'Sealing Report...' : 'Confirm & Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal (Mandatory Remarks) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                <MessageSquare className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Return Evaluation for Re-Testing
                </h3>
                <p className="text-xs text-slate-500">
                  Provide mandatory technical remarks explaining why approval was withheld.
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Mandatory Technical Remarks
                </label>
                <textarea
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="e.g. Weighing points at 10kg breached statutory ±1.0e mpe limit..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-rose-700 transition-all"
                >
                  {submittingAction ? 'Returning...' : 'Reject & Return to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
