'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Archive,
  Search,
  Download,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  History,
  Filter,
  Eye,
  Layers,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { searchArchive } from '@/lib/api';
import { TestReportSummary, AccuracyClass, ReportStatus } from '@/types/metrology';
import { formatDate } from '@/lib/utils';
import LifecycleDrawer from '@/components/archive/LifecycleDrawer';

export default function RepositoryPage() {
  const [reports, setReports] = useState<TestReportSummary[]>([]);
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Lifecycle Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSerial, setActiveSerial] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState('');
  const [activeManufacturer, setActiveManufacturer] = useState('');
  const [activeClass, setActiveClass] = useState('');

  const fetchReports = () => {
    setLoading(true);
    searchArchive(query)
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports();
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Filtered dataset
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedClass !== 'ALL' && r.accuracy_class !== selectedClass) return false;
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      return true;
    });
  }, [reports, selectedClass, selectedStatus]);

  const handleOpenLifecycle = (rep: TestReportSummary) => {
    setActiveSerial(rep.instrument_serial);
    setActiveModel(rep.instrument_model);
    setActiveManufacturer(rep.manufacturer_name);
    setActiveClass(rep.accuracy_class);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-900 text-white rounded-2xl shadow-xs">
              <Archive className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Searchable Instrument Archive & Lifecycle Repository
              </h1>
              <p className="text-xs text-slate-500">
                Statutory audit registry, multi-attempt lifecycle progressions, SHA-256 seals, and direct document downloads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="p-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl shadow-xs text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Archive
          </button>
        </div>
      </div>

      {/* Faceted Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Free Text Search */}
          <div className="md:col-span-2 flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by Serial Number, Model, Manufacturer, or Report ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Accuracy Class Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Layers className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs bg-transparent outline-none text-slate-700 font-medium"
            >
              <option value="ALL">All Accuracy Classes</option>
              <option value="CLASS_I">Class I (Special)</option>
              <option value="CLASS_II">Class II (High)</option>
              <option value="CLASS_III">Class III (Medium)</option>
              <option value="CLASS_IIII">Class IIII (Ordinary)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <FileCheck2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs bg-transparent outline-none text-slate-700 font-medium"
            >
              <option value="ALL">All Report Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Historical Repository Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Report Identifier</th>
                <th className="p-3.5">Instrument Serial</th>
                <th className="p-3.5">Model / Make</th>
                <th className="p-3.5">Manufacturer</th>
                <th className="p-3.5">Accuracy Class</th>
                <th className="p-3.5">Audit Status</th>
                <th className="p-3.5">Date Stamped</th>
                <th className="p-3.5 text-right">Actions & Exports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    {loading ? 'Searching national repository records...' : 'No evaluations match the search filters.'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((rep) => {
                  const isApproved = rep.status === 'APPROVED';
                  const isRejected = rep.status === 'REJECTED';
                  const isPending = rep.status === 'PENDING_APPROVAL';

                  return (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-blue-900">
                        {rep.report_number}
                      </td>
                      <td className="p-3.5 font-mono">
                        <button
                          type="button"
                          onClick={() => handleOpenLifecycle(rep)}
                          className="font-bold text-slate-800 hover:text-blue-700 underline decoration-slate-300 hover:decoration-blue-700 flex items-center gap-1.5 transition-colors"
                        >
                          <History className="w-3.5 h-3.5 text-blue-600" />
                          <span>{rep.instrument_serial}</span>
                        </button>
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">{rep.instrument_model}</td>
                      <td className="p-3.5 text-slate-600">{rep.manufacturer_name}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
                          {rep.accuracy_class}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {rep.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {formatDate(rep.created_at)}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/evaluations/${rep.id}/review`}
                          className="inline-flex items-center gap-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-900 px-2.5 py-1 rounded-lg font-bold transition-colors border border-blue-200"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Review</span>
                        </Link>

                        {isApproved && (
                          <>
                            <a
                              href={`/api/v1/documents/reports/${rep.id}/generate-pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg font-semibold transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-3 h-3 text-emerald-600" />
                              <span>PDF</span>
                            </a>
                            <Link
                              href={`/verify/${rep.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg font-semibold transition-colors"
                              title="Verify Public SHA-256 Seal"
                            >
                              <QrCode className="w-3 h-3 text-blue-700" />
                              <span>Seal</span>
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instrument Lifecycle Drawer Component */}
      <LifecycleDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        serialNumber={activeSerial}
        modelName={activeModel}
        manufacturerName={activeManufacturer}
        accuracyClass={activeClass}
      />
    </div>
  );
}
