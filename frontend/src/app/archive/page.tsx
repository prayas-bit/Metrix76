'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Archive, 
  Search, 
  Download, 
  QrCode, 
  CheckCircle2, 
  FileText, 
  ExternalLink 
} from 'lucide-react';
import { searchArchive } from '@/lib/api';
import { TestReportSummary } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

export default function ArchivePage() {
  const [reports, setReports] = useState<TestReportSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchArchive(query)
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Archive className="w-6 h-6 text-blue-800" />
            <span>Searchable Archive & Instrument History</span>
          </h1>
          <p className="text-sm text-slate-500">
            Lifecycle tracking, multi-attempt test sessions, certificate downloads, and public verification links.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Faceted search by Serial Number, Model Name, Manufacturer, or Certificate Number..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3.5">Report Number</th>
              <th className="p-3.5">Instrument Serial</th>
              <th className="p-3.5">Model / Make</th>
              <th className="p-3.5">Manufacturer</th>
              <th className="p-3.5">Accuracy Class</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Issue Date</th>
              <th className="p-3.5 text-right">Certificate & Exports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((rep) => (
              <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3.5 font-bold font-mono text-blue-900">{rep.report_number}</td>
                <td className="p-3.5 font-mono text-slate-700">{rep.instrument_serial}</td>
                <td className="p-3.5 font-medium text-slate-900">{rep.instrument_model}</td>
                <td className="p-3.5 text-slate-600">{rep.manufacturer_name}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-800">
                    {rep.accuracy_class}
                  </span>
                </td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                    rep.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    rep.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rep.status}
                  </span>
                </td>
                <td className="p-3.5 text-slate-500">{formatDate(rep.created_at)}</td>
                <td className="p-3.5 text-right space-x-2">
                  <Link
                    href={`/verify/${rep.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded font-semibold transition-colors"
                  >
                    <QrCode className="w-3 h-3 text-blue-700" />
                    <span>Verify Seal</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
