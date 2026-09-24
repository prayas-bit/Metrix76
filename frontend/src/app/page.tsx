'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  Scale,
  Award
} from 'lucide-react';
import { getDashboardData } from '@/lib/api';
import { DashboardData } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Executive Operations Hub
          </h1>
          <p className="text-sm text-slate-500">
            Real-time legal metrology type evaluations, work queues, and compliance tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/evaluations"
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Launch Evaluation Wizard</span>
          </Link>
        </div>
      </div>

      {/* Traceability Expiry Alert Ribbon */}
      {data?.expiring_standards && data.expiring_standards.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Traceability Calibration Alert
              </h4>
              <p className="text-xs text-amber-700">
                {data.expiring_standards.length} standard weight set(s) will expire within 30 days (e.g. Set #{data.expiring_standards[0].set_identifier}).
              </p>
            </div>
          </div>
          <Link
            href="/standards"
            className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
          >
            <span>Review Standards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Active Evaluations
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {data?.metrics.active_evaluations_count ?? 4}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">In laboratory pipeline</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Pending Verification
            </span>
            <span className="text-2xl font-black text-amber-600 block mt-1">
              {data?.metrics.pending_approval_count ?? 2}
            </span>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting Director Sign-off</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Approved This Month
            </span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">
              {data?.metrics.completed_approvals_month ?? 18}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Certificates Issued</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Compliance Rate
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {data?.metrics.overall_compliance_rate_pct ?? 94.2}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Statutory Pass Index</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Work Queues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Work Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Testing Metrologist Queue (Draft Tests)
              </h3>
              <p className="text-xs text-slate-500">Live evaluations currently under observation.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              {data?.technician_work_queue.length ?? 0} Tasks
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.technician_work_queue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-900">{item.report_number}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {item.accuracy_class}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 block">
                    {item.manufacturer_name} • {item.instrument_model} ({item.instrument_serial})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Updated: {formatDate(item.updated_at)}
                  </span>
                </div>
                <Link
                  href="/evaluations"
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded font-medium"
                >
                  Resume
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Approving Officer Work Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Director & Approver Queue (Audit Required)
              </h3>
              <p className="text-xs text-slate-500">Dual-custody verification and certificate sign-off.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
              {data?.approver_work_queue.length ?? 0} Pending
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.approver_work_queue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{item.report_number}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                      PENDING AUDIT
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 block">
                    {item.manufacturer_name} • {item.instrument_model}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    By: {item.conducted_by_name}
                  </span>
                </div>
                <Link
                  href="/verification"
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-medium"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
