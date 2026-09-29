'use client';

import React from 'react';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  ShieldCheck,
  TrendingUp,
  User,
  Calendar
} from 'lucide-react';
import { TestReportSummary } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

interface LifecycleAttempt {
  attemptNumber: number;
  reportNumber: string;
  reportId: string;
  date: string;
  technician: string;
  approver?: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL' | 'DRAFT';
  verdict: boolean;
  maxErrorObserved: number;
  criticalMarginRatio: number;
  rejectionReason?: string;
}

interface LifecycleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serialNumber: string | null;
  modelName: string;
  manufacturerName: string;
  accuracyClass: string;
}

export default function LifecycleDrawer({
  isOpen,
  onClose,
  serialNumber,
  modelName,
  manufacturerName,
  accuracyClass,
}: LifecycleDrawerProps) {
  if (!isOpen || !serialNumber) return null;

  // Mock multi-attempt history progression for the selected serial number
  const attempts: LifecycleAttempt[] = [
    {
      attemptNumber: 1,
      reportNumber: 'OIML-2026-TR-0038',
      reportId: 'rep-098',
      date: '2026-09-20T10:30:00Z',
      technician: 'A. Verma (Testing Metrologist)',
      status: 'REJECTED',
      verdict: false,
      maxErrorObserved: 0.0038,
      criticalMarginRatio: 126.7,
      rejectionReason: 'Exceeded statutory ±1.0e mpe limit at 10.0kg step (+0.0038 kg vs ±0.0030 kg allowed).',
    },
    {
      attemptNumber: 2,
      reportNumber: 'OIML-2026-TR-0041',
      reportId: 'rep-100',
      date: '2026-09-28T14:15:00Z',
      technician: 'A. Verma (Testing Metrologist)',
      approver: 'Dr. R. K. Mukherjee (Director of Metrology)',
      status: 'APPROVED',
      verdict: true,
      maxErrorObserved: 0.0018,
      criticalMarginRatio: 60.0,
    },
  ];

  // Calculate comparative error delta between Attempt #1 and Attempt #2
  const initialError = attempts[0].maxErrorObserved;
  const finalError = attempts[1].maxErrorObserved;
  const deltaReductionPct = (((initialError - finalError) / initialError) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-900 text-white rounded-xl shadow-xs">
                <History className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Instrument Lifecycle & Audit History
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Serial Number: <span className="font-bold text-blue-900">{serialNumber}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instrument Specs Tag Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Model</span>
              <span className="font-bold text-slate-800 truncate block">{modelName}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Manufacturer</span>
              <span className="font-bold text-slate-800 truncate block">{manufacturerName}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Class</span>
              <span className="font-bold text-blue-900 font-mono">{accuracyClass}</span>
            </div>
          </div>
        </div>

        {/* Content Body: Progression Timeline */}
        <div className="p-6 space-y-6 flex-1">
          {/* Progression Delta Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-950 uppercase tracking-wide block">
                  Calibration Improvement Delta
                </span>
                <p className="text-[11px] text-emerald-800">
                  Maximum metrological error reduced by{' '}
                  <span className="font-bold font-mono">{deltaReductionPct}%</span> after mechanical
                  adjustment.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-200/80 text-emerald-900 font-black text-xs rounded-full">
              Attempt #1 ➔ #2
            </span>
          </div>

          {/* Timeline Sequence */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Audit Progression ({attempts.length} Evaluations Recorded)
            </h3>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6">
              {attempts.map((att) => {
                const isPass = att.status === 'APPROVED';
                return (
                  <div key={att.attemptNumber} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${isPass ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-rose-500 ring-4 ring-rose-100'
                        }`}
                    />

                    {/* Attempt Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            Attempt #{att.attemptNumber}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            ({att.reportNumber})
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${isPass
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                        >
                          {att.status}
                        </span>
                      </div>

                      {/* Metrological Performance Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            Peak Error Observed
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {att.maxErrorObserved} kg
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            Critical Margin Ratio
                          </span>
                          <span
                            className={`font-mono font-bold ${att.criticalMarginRatio > 100 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                          >
                            {att.criticalMarginRatio}%
                          </span>
                        </div>
                      </div>

                      {/* Rejection Reason if Failed */}
                      {att.rejectionReason && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                          <span className="font-bold block uppercase tracking-wide">
                            Rejection Remarks:
                          </span>
                          <p>{att.rejectionReason}</p>
                        </div>
                      )}

                      {/* Footer Details: Technician & Approver */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          <span>{att.technician}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(att.date)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {isPass && (
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`/api/v1/documents/reports/${att.reportId}/generate-pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-blue-900 text-white rounded-lg text-[11px] font-bold shadow-xs hover:bg-blue-800 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3 text-emerald-400" />
                            PDF Certificate
                          </a>
                          <a
                            href={`/verify/${att.reportId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-white text-slate-800 border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-100 flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3 h-3 text-blue-700" />
                            Verify Seal
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-all"
          >
            Close Lifecycle Panel
          </button>
        </div>
      </div>
    </div>
  );
}
