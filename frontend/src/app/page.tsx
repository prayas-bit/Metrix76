'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  Scale,
  Award,
  ShieldCheck,
  Lock,
  FileCheck2,
  QrCode,
  Search,
  Database,
  Layers,
  ChevronRight,
  UserCheck,
  Sparkles,
  FileText,
  Activity,
  Compass
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getDashboardData } from '@/lib/api';
import { DashboardData } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

export default function RootPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  // Public Landing Page Search State
  const [verifySearchId, setVerifySearchId] = useState('');
  
  // Authenticated Dashboard State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setLoadingDashboard(true);
      getDashboardData(user.id, role || undefined)
        .then(setData)
        .catch((err) => {
          console.error('Dashboard load error:', err);
          setError('Unable to load operational dashboard. Please ensure backend is running.');
        })
        .finally(() => setLoadingDashboard(false));
    }
  }, [user, role]);

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifySearchId.trim()) {
      router.push(`/verify/${encodeURIComponent(verifySearchId.trim())}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Scale className="w-8 h-8 text-blue-900 animate-pulse" />
        <span className="text-xs font-semibold text-slate-500">Initializing Metrology Security Engine...</span>
      </div>
    );
  }

  // =========================================================================
  // 1. PUBLIC LANDING PAGE (When signed out)
  // =========================================================================
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto space-y-16 pb-16">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-8 sm:p-12 md:p-16 border border-slate-800 shadow-2xl">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Statutory Legal Metrology LIMS • OIML R 76-1:2006</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
              National NAWI Type Approval & Verification Platform
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Automated compliance testing suite for Non-Automatic Weighing Instruments. Enforces strict mathematical error bounds (Ec ≤ ±mpe), ISO/IEC 17025 standard weight traceability, dual-custody approval, and cryptographic SHA-256 seal verification.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <Lock className="w-4 h-4" />
                <span>Enter Authorized Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#public-verify"
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>Verify Type Certificate</span>
              </a>
            </div>

            {/* Compliance Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>OIML R 76-1:2006</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ISO/IEC 17025 Traceability</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dual-Custody Governance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>SHA-256 Integrity Seals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Public Certificate Verification Quick Lookup */}
        <div id="public-verify" className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Public Type Approval Certificate & QR Verifier
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Scan a QR code on any issued weighing instrument seal or input the certificate identifier below to verify statutory authenticity and cryptographic integrity.
            </p>

            <form onSubmit={handleQuickVerify} className="flex flex-col sm:flex-row gap-2 pt-2 max-w-md mx-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={verifySearchId}
                  onChange={(e) => setVerifySearchId(e.target.value)}
                  placeholder="e.g. rep-001 or Certificate UUID"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Verify</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Core Architecture Pillars */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Statutory Laboratory Automation & Architecture
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Designed from the ground up for National Metrology Institutes, Legal Metrology Officers, and Accredited Calibration Laboratories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl w-fit">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">OIML R 76 Math Engine</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automates continuous turning point calculations ($P = I + 0.5e - \Delta L$), tare zero validation ($E_0 \le 0.25e$), repeatability standard deviation, and eccentricity corner checks.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-xl w-fit">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Two-Man Rule Dual Custody</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enforces ISO/IEC 17025 physical segregation between test technicians and approving officers. Requires mandatory 4-digit PIN authentication for statutory certificate issuance.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl w-fit">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Traceability & Standards Vault</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tracks $E_1, E_2, F_1, F_2, M_1$ reference weight sets with certificate numbers, calibration dates, and expanded uncertainty $k=2$, with automated expiration guardrails.
              </p>
            </div>
          </div>
        </div>

        {/* Access Portal CTA */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold">Ready to access the laboratory workspace?</h3>
          <p className="text-xs text-blue-200 max-w-md mx-auto">
            Authorized metrologists and officers can sign in to conduct evaluations, review queues, or register equipment passports.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <span>Sign In to Metrology Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. AUTHENTICATED WORKSPACE DASHBOARD (When signed in)
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Operations Hub
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              role === 'TECHNICIAN'
                ? 'bg-emerald-100 text-emerald-800'
                : role === 'APPROVER'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {role === 'TECHNICIAN' ? '👷 Testing Metrologist' : role === 'APPROVER' ? '⚖️ Legal Metrology Officer' : '👑 Laboratory Director'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Signed in as <span className="font-semibold text-slate-800">{user.email}</span> • Data scoped to active session
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role !== 'APPROVER' && (
            <Link
              href="/evaluations"
              className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Launch Evaluation Wizard</span>
            </Link>
          )}
          {role !== 'TECHNICIAN' && (
            <Link
              href="/verification"
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Verification Console</span>
            </Link>
          )}
        </div>
      </div>

      {/* Traceability Calibration Alert */}
      {data?.expiring_standards && data.expiring_standards.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Traceability Calibration Alert
              </h4>
              <p className="text-xs text-amber-700">
                {data.expiring_standards.length} standard weight set(s) expiring soon (e.g. Set #{data.expiring_standards[0].set_identifier}).
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {role === 'TECHNICIAN' ? 'My Active Drafts' : 'Active Pipeline'}
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {data?.metrics.active_evaluations_count ?? 0}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">In laboratory tests</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Pending Audit
            </span>
            <span className="text-2xl font-black text-amber-600 block mt-1">
              {data?.metrics.pending_approval_count ?? 0}
            </span>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting Officer Sign-off</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Approved Certificates
            </span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">
              {data?.metrics.completed_approvals_month ?? 0}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Seals Issued</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Compliance Index
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {data?.metrics.overall_compliance_rate_pct ?? 100}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">OIML Tolerance Pass Rate</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* User-Scoped Work Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Testing Metrologist Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {role === 'TECHNICIAN' ? 'My Active Test Evaluations' : 'Technician Testing Queue'}
              </h3>
              <p className="text-xs text-slate-500">
                {role === 'TECHNICIAN' ? 'Draft reports under your custody.' : 'Active draft evaluations under test.'}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              {data?.technician_work_queue.length ?? 0} Tasks
            </span>
          </div>

          {loadingDashboard ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading work queue...</div>
          ) : !data?.technician_work_queue || data.technician_work_queue.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No active test drafts in progress.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.technician_work_queue.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-900">{item.report_number}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {item.accuracy_class}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-700 block mt-0.5">
                      {item.manufacturer_name} • {item.instrument_model} ({item.instrument_serial})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Updated: {formatDate(item.updated_at)}
                    </span>
                  </div>
                  {role !== 'APPROVER' && (
                    <Link
                      href="/evaluations"
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium shadow-xs"
                    >
                      Resume
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approving Officer Work Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Verification & Review Queue
              </h3>
              <p className="text-xs text-slate-500">Packets awaiting dual-custody audit and sign-off.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
              {data?.approver_work_queue.length ?? 0} Pending
            </span>
          </div>

          {loadingDashboard ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading audit queue...</div>
          ) : !data?.approver_work_queue || data.approver_work_queue.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Audit queue is completely clear.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.approver_work_queue.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{item.report_number}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                        PENDING AUDIT
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-700 block mt-0.5">
                      {item.manufacturer_name} • {item.instrument_model}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Conducted by: {item.conducted_by_name}
                    </span>
                  </div>
                  {role !== 'TECHNICIAN' && (
                    <Link
                      href="/verification"
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-xs"
                    >
                      Audit
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
