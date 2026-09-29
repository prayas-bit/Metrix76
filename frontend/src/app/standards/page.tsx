'use client';

import React, { useEffect, useState } from 'react';
import { Award, Plus, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { listReferenceStandards } from '@/lib/api';
import { ReferenceStandard } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

export default function ReferenceStandardsPage() {
  const [standards, setStandards] = useState<ReferenceStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReferenceStandards()
      .then(setStandards)
      .catch((err) => {
        console.error(err);
        setError('Unable to load reference standards. Confirm the FastAPI backend is running on http://localhost:8000.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading standards…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-800" />
            <span>Reference Standards & Traceability Registry</span>
          </h1>
          <p className="text-sm text-slate-500">
            ISO/IEC 17025 calibration traceability certificates and automated expiry guardrails.
          </p>
        </div>
        <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors">
          <Plus className="w-4 h-4" />
          <span>Register Weight Set</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Standards registry unavailable:</strong> {error}
        </div>
      )}

      {!error && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3.5">Set Identifier</th>
              <th className="p-3.5">Accuracy Class</th>
              <th className="p-3.5">Certificate No.</th>
              <th className="p-3.5">Calibrated By</th>
              <th className="p-3.5">Calibration Date</th>
              <th className="p-3.5">Expiry Date</th>
              <th className="p-3.5">Guardrail Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standards.map((std) => (
              <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3.5 font-bold font-mono text-blue-900">{std.set_identifier}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800">
                    OIML {std.accuracy_class}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-slate-600">{std.certificate_number}</td>
                <td className="p-3.5 text-slate-700">{std.calibrated_by}</td>
                <td className="p-3.5 text-slate-500">{formatDate(std.calibration_date)}</td>
                <td className="p-3.5 font-mono">
                  <span className={std.is_expired ? 'text-rose-600 font-bold' : std.days_to_expiry <= 30 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                    {formatDate(std.expiry_date)} ({std.days_to_expiry}d left)
                  </span>
                </td>
                <td className="p-3.5">
                  {std.is_expired ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      <XCircle className="w-3 h-3" /> EXPIRED (BLOCKED)
                    </span>
                  ) : std.days_to_expiry <= 30 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <AlertTriangle className="w-3 h-3" /> EXPIRING SOON
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE & VALID
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  <button className="text-xs text-blue-700 hover:underline font-semibold">
                    View Certificate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
