'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, CheckCircle2, QrCode, Award, Clock } from 'lucide-react';
import { verifyPublicReport } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function PublicVerifyPage() {
  const params = useParams();
  const reportId = params?.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportId) {
      verifyPublicReport(reportId)
        .then(setData)
        .catch((err) => setError(err.message || 'Verification record not found'))
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-blue-900 text-white rounded-2xl shadow-md">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          DIRECTORATE OF LEGAL METROLOGY
        </h1>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          Official OIML R 76 Type Approval Verification Portal
        </p>
      </div>

      {loading && (
        <div className="bg-white p-8 rounded-xl border text-center text-xs text-slate-500">
          Resolving cryptographic certificate seal from National Register...
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-6 rounded-xl text-center text-xs">
          <h3 className="font-bold text-sm mb-1">Invalid or Revoked Certificate</h3>
          <p>{error}</p>
        </div>
      )}

      {data && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden space-y-6 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Certificate Identifier
              </span>
              <span className="text-lg font-black font-mono text-blue-900">
                {data.report_number}
              </span>
            </div>
            <div className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>AUTHENTIC & APPROVED</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Instrument Serial</span>
              <span className="font-bold font-mono text-slate-900">{data.instrument_serial}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Accuracy Class</span>
              <span className="font-bold font-mono text-blue-900">{data.accuracy_class}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Manufacturer</span>
              <span className="font-bold text-slate-800">{data.manufacturer_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Denomination</span>
              <span className="font-bold text-slate-800">{data.model_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Approval Timestamp</span>
              <span className="font-bold text-slate-800">{formatDate(data.approved_at)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Statutory Standard</span>
              <span className="font-bold text-slate-800">OIML R 76-1:2006</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Cryptographic SHA-256 Tamper-Evident Seal
            </span>
            <div className="font-mono text-[11px] text-slate-800 break-all bg-white p-2.5 rounded border border-slate-200">
              {data.sha256_hash}
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400">
            Certified under the Legal Metrology Act, 2009 & Legal Metrology (General) Rules, 2011.
          </div>
        </div>
      )}
    </div>
  );
}
