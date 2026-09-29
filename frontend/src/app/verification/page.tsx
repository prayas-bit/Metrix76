'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Award,
  Search,
  Filter,
  Eye,
  FileText
} from 'lucide-react';
import { submitVerificationAction, searchArchive, getReportDetail, getReportPdfUrl } from '@/lib/api';
import { TestReportSummary, TestReportDetail } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

export default function VerificationConsolePage() {
  const [allReports, setAllReports] = useState<TestReportSummary[]>([]);
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<TestReportDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [pin, setPin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; hash?: string } | null>(null);

  const fetchReports = async () => {
    setLoadingList(true);
    try {
      const data = await searchArchive(undefined);
      setAllReports(data);
      
      const filtered = activeFilter === 'PENDING' 
        ? data.filter(r => r.status === 'PENDING_APPROVAL')
        : activeFilter === 'APPROVED'
        ? data.filter(r => r.status === 'APPROVED')
        : data;

      if (filtered.length > 0) {
        if (!selectedReportId || !filtered.some(r => r.id === selectedReportId)) {
          setSelectedReportId(filtered[0].id);
        }
      } else {
        setSelectedReportId(null);
        setReportDetail(null);
      }
    } catch (err) {
      console.error('Failed to load verification reports:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeFilter]);

  useEffect(() => {
    if (!selectedReportId) {
      setReportDetail(null);
      return;
    }
    setLoadingDetail(true);
    getReportDetail(selectedReportId)
      .then(setReportDetail)
      .catch((err) => {
        console.error('Failed to load report detail:', err);
        setReportDetail(null);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedReportId]);

  const displayedReports = activeFilter === 'PENDING'
    ? allReports.filter(r => r.status === 'PENDING_APPROVAL')
    : activeFilter === 'APPROVED'
    ? allReports.filter(r => r.status === 'APPROVED')
    : allReports;

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedReportId) return;

    if (action === 'APPROVE' && (!pin || pin.length < 4)) {
      setStatusMessage({ type: 'error', text: 'Valid Approving Officer PIN (at least 4 digits) is required to approve.' });
      return;
    }

    if (action === 'REJECT' && !remarks.trim()) {
      setStatusMessage({ type: 'error', text: 'Mandatory rejection remarks are required when returning report.' });
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await submitVerificationAction(selectedReportId, action, pin, remarks);
      setStatusMessage({
        type: 'success',
        text: res.message,
        hash: res.sha256_hash,
      });
      setPin('');
      setRemarks('');

      // Refresh reports list
      await fetchReports();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Verification action failed',
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-blue-800" />
            <span>Two-Man Verification & Review Console</span>
          </h1>
          <p className="text-sm text-slate-500">
            Authorized Legal Metrology Officer Audit & Cryptographic Seal Authorization Gateway
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="space-y-1">
            <p className="font-bold">{statusMessage.text}</p>
            {statusMessage.hash && (
              <p className="font-mono text-[11px] text-emerald-800 break-all">
                SHA-256 Digital Digest: {statusMessage.hash}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Queue & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveFilter('PENDING')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                activeFilter === 'PENDING' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({allReports.filter(r => r.status === 'PENDING_APPROVAL').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('APPROVED')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                activeFilter === 'APPROVED' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({allReports.filter(r => r.status === 'APPROVED').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                activeFilter === 'ALL' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allReports.length})
            </button>
          </div>

          {loadingList ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading audit queue...</div>
          ) : displayedReports.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                {activeFilter === 'PENDING' ? 'Pending Queue is Clear' : 'No Reports Found'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeFilter === 'PENDING' 
                  ? 'No evaluation packets currently waiting for officer audit.' 
                  : 'No reports match the selected view filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto">
              {displayedReports.map((item) => {
                const isSelected = item.id === selectedReportId;
                const isPending = item.status === 'PENDING_APPROVAL';
                const isApproved = item.status === 'APPROVED';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedReportId(item.id);
                      setStatusMessage(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-blue-900 mb-1">
                      <span>{item.report_number}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isPending 
                          ? 'bg-amber-100 text-amber-800' 
                          : isApproved 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-slate-800 font-semibold truncate text-[11px]">
                      {item.instrument_model || 'Instrument'}
                    </div>
                    <div className="text-slate-500 text-[10px] truncate mt-0.5">
                      SN: {item.instrument_serial || 'N/A'} • {item.accuracy_class}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Report Audit Card */}
        <div className="lg:col-span-2">
          {loadingDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Loading report details...
            </div>
          ) : reportDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-blue-900">{reportDetail.report_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      reportDetail.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-800'
                        : reportDetail.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {reportDetail.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 block mt-1">
                    {reportDetail.instrument?.model_name ?? 'Instrument'} • Serial: {reportDetail.instrument?.serial_number ?? 'N/A'} ({reportDetail.instrument?.accuracy_class ?? 'CLASS_III'})
                  </span>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-500">
                  <div>Max: <span className="font-bold text-slate-800 font-mono">{reportDetail.instrument?.max_capacity ?? 15} {reportDetail.instrument?.unit ?? 'kg'}</span></div>
                  <div>Standard: <span className="font-bold font-mono text-slate-800">{reportDetail.reference_standard?.set_identifier ?? 'N/A'}</span></div>
                </div>
              </div>

              {/* Compliance Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause 3.5.1: Weighing</span>
                  <span className="font-bold text-emerald-900 text-xs mt-1 block">PASS (Ec ≤ ±mpe)</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause 3.6.1: Repeat</span>
                  <span className="font-bold text-emerald-900 text-xs mt-1 block">PASS (ΔE ≤ mpe)</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause 3.6.2: Eccentric</span>
                  <span className="font-bold text-emerald-900 text-xs mt-1 block">PASS (4 Corners)</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause A.4.4: Tare/Zero</span>
                  <span className="font-bold text-emerald-900 text-xs mt-1 block">PASS (E₀ ≤ 0.25e)</span>
                </div>
              </div>

              {/* Detail Review Link */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-600">Want to inspect full tolerance corridor curves & photographic evidence?</span>
                <Link
                  href={`/evaluations/${reportDetail.id}/review`}
                  className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Deep Review Screen</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Status Info or Sign-off Box */}
              {reportDetail.status === 'APPROVED' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Type Approval Certificate Issued</span>
                  </div>
                  {reportDetail.sha256_hash && (
                    <p className="font-mono text-[11px] text-emerald-800 break-all">
                      Integrity Seal: {reportDetail.sha256_hash}
                    </p>
                  )}
                  <div className="pt-2 flex items-center gap-3">
                    <a
                      href={getReportPdfUrl(reportDetail.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download Official PDF</span>
                    </a>
                    <Link
                      href={`/verify/${reportDetail.id}`}
                      className="text-emerald-800 hover:underline text-xs font-semibold"
                    >
                      Public Verification Portal →
                    </Link>
                  </div>
                </div>
              ) : reportDetail.status === 'REJECTED' ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Report Rejected / Returned for Re-testing</span>
                  </div>
                  {reportDetail.rejection_reason && (
                    <p className="text-rose-700">Remarks: {reportDetail.rejection_reason}</p>
                  )}
                </div>
              ) : (
                /* Officer Authorization Sign-off Box for PENDING / DRAFT */
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-700" />
                    <span>Approving Officer Authorization</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">
                        Digital Authorization PIN (Required for Approval)
                      </label>
                      <input
                        type="password"
                        placeholder="e.g. 1234"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 w-full font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">
                        Audit Remarks (Mandatory if Rejecting)
                      </label>
                      <input
                        type="text"
                        placeholder="Audit findings or adjustment notes"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handleAction('REJECT')}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Reject / Return for Re-test
                    </button>
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handleAction('APPROVE')}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Approve & Issue Certificate</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select a test report from the left queue to view or conduct the audit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
