'use client';

import React, { useState } from 'react';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle,
  QrCode,
  FileText
} from 'lucide-react';
import { submitVerificationAction } from '@/lib/api';

export default function VerificationConsolePage() {
  const [pin, setPin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; hash?: string } | null>(null);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await submitVerificationAction('rep-100', action, pin, remarks);
      setStatusMessage({
        type: 'success',
        text: res.message,
        hash: res.sha256_hash
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Verification action failed'
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-blue-800" />
            <span>Two-Man Verification & Sign-off Console</span>
          </h1>
          <p className="text-sm text-slate-500">
            Dual-custody technical audit, cryptographic SHA-256 seal generation, and type approval certificate issue.
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

      {/* Review Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-blue-900">Report # OIML-2026-TR-0041</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                STATUS: PENDING APPROVAL
              </span>
            </div>
            <span className="text-xs text-slate-600 block mt-1">
              Instrument: Mettler Toledo HeavyDuty Bridge 30T (SN: SN-2026-NAWI-8720) • Class III (Medium)
            </span>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Submitted By: <span className="font-bold text-slate-800">A. Verma (Testing Metrologist)</span></div>
            <div>Reference Standard: <span className="font-bold font-mono text-slate-800">NPL-E2-SET-04</span></div>
          </div>
        </div>

        {/* Compliance Scorecard */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause A.4.4: Weighing</span>
            <span className="font-bold text-emerald-900 text-sm mt-1 block">PASS (Ec ≤ ±mpe)</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause A.4.10: Repeatability</span>
            <span className="font-bold text-emerald-900 text-sm mt-1 block">PASS (ΔI ≤ 0.002 kg)</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clause A.4.7: Eccentricity</span>
            <span className="font-bold text-emerald-900 text-sm mt-1 block">PASS (4 Corners)</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clauses A.4.2: Tare/Zero</span>
            <span className="font-bold text-emerald-900 text-sm mt-1 block">PASS (E₀ ≤ 0.25e)</span>
          </div>
        </div>

        {/* Sign-off Actions */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Approving Director Authorization
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-600 block mb-1 font-medium">
                Digital Authorization PIN (Required for Approval)
              </label>
              <input
                type="password"
                placeholder="Enter 4-6 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-full font-mono outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1 font-medium">
                Audit Remarks / Rejection Reason (Mandatory if Rejecting)
              </label>
              <input
                type="text"
                placeholder="Remarks or corrective adjustment notes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-full outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-2">
            <button
              onClick={() => handleAction('REJECT')}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition-colors"
            >
              Reject / Request Re-test
            </button>
            <button
              onClick={() => handleAction('APPROVE')}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve & Issue Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
