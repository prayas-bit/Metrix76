'use client';

import React, { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  Scale
} from 'lucide-react';
import { verifyPublicReport } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function PublicVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;
  const searchParams = useSearchParams();
  const hashParam = searchParams.get('hash');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportId) {
      verifyPublicReport(reportId)
        .then(setData)
        .catch((err) => setError(err.message || 'Verification record not found in National Metrology Register'))
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  // Check if URL hash matches dataset SHA-256 hash prefix
  const isHashMatched =
    data && (!hashParam || (data.sha256_hash && data.sha256_hash.toLowerCase().startsWith(hashParam.toLowerCase())));

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6 px-4">
      {/* Directorate Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-blue-900 text-white rounded-2xl shadow-md ring-4 ring-blue-100">
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
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 shadow-xs space-y-2">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Resolving cryptographic certificate seal from National Metrology Register...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 p-6 rounded-2xl text-center text-xs shadow-xs space-y-1">
          <h3 className="font-bold text-sm">Invalid or Unverified Certificate</h3>
          <p className="text-rose-800">{error}</p>
        </div>
      )}

      {data && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden space-y-6 p-6">
          {/* Certificate Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Certificate Identifier
              </span>
              <span className="text-lg font-black font-mono text-blue-900">
                {data.report_number}
              </span>
            </div>
            <div
              className={`px-3 py-1.5 font-black text-xs rounded-full flex items-center gap-1.5 border ${
                isHashMatched
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isHashMatched ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>AUTHENTIC & VERIFIED</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  <span>HASH MISMATCH DETECTED</span>
                </>
              )}
            </div>
          </div>

          {/* Instrument Specifications Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Instrument Serial</span>
              <span className="font-bold font-mono text-slate-900">{data.instrument_serial}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Accuracy Class</span>
              <span className="font-bold font-mono text-blue-900">{data.accuracy_class}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Manufacturer</span>
              <span className="font-bold text-slate-800">{data.manufacturer_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Model Denomination</span>
              <span className="font-bold text-slate-800">{data.model_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Approval Timestamp</span>
              <span className="font-bold text-slate-800">{formatDate(data.approved_at)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Statutory Standard</span>
              <span className="font-bold text-slate-800">OIML R 76-1:2006</span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Digest Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Cryptographic SHA-256 Tamper-Evident Seal
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Deterministic Audit Match
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-800 break-all bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              {data.sha256_hash}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <a
              href={`/api/v1/documents/reports/${reportId}/generate-pdf`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-800 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download Official OIML R 76-2 Certificate (PDF)
            </a>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Certified under the Legal Metrology Act, 2009 & Legal Metrology (General) Rules, 2011.
          </div>
        </div>
      )}
    </div>
  );
}
