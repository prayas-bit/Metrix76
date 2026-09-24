'use client';

import React, { useEffect, useState } from 'react';
import { Scale, Plus, CheckCircle2, AlertOctagon, Info, ShieldCheck } from 'lucide-react';
import { listInstruments, validateInstrumentSanity } from '@/lib/api';
import { Instrument, InstrumentMeta, SanityCheckResult, AccuracyClass } from '@/types/metrology';

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state for new instrument passport
  const [newSpec, setNewSpec] = useState<InstrumentMeta>({
    accuracy_class: 'CLASS_III',
    max_capacity: 15.0,
    min_capacity: 0.1,
    scale_interval_d: 0.002,
    verification_interval_e: 0.002,
    unit: 'kg',
  });

  const [sanityResult, setSanityResult] = useState<SanityCheckResult | null>(null);

  useEffect(() => {
    listInstruments().then(setInstruments).catch(console.error);
  }, []);

  useEffect(() => {
    validateInstrumentSanity(newSpec)
      .then(setSanityResult)
      .catch(console.error);
  }, [newSpec]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-800" />
            <span>Instrument Passports & Metadata Engine</span>
          </h1>
          <p className="text-sm text-slate-500">
            Structural parameter capture with automated OIML scale interval sanity verification.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Instrument Passport</span>
        </button>
      </div>

      {/* Sanity Engine Live Checker Sandbox */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Automated Structural Sanity Verification Engine</span>
            </h3>
            <p className="text-xs text-slate-400">
              Validates interval ratios (e ≥ d), total scale intervals (n = Max/e), and statutory limits.
            </p>
          </div>
          {sanityResult && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
              sanityResult.is_valid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {sanityResult.is_valid ? 'SANITY PASSED' : 'SANITY VIOLATION'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Accuracy Class</label>
            <select
              value={newSpec.accuracy_class}
              onChange={(e) => setNewSpec({ ...newSpec, accuracy_class: e.target.value as AccuracyClass })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono"
            >
              <option value="CLASS_I">Class I (Special)</option>
              <option value="CLASS_II">Class II (High)</option>
              <option value="CLASS_III">Class III (Medium)</option>
              <option value="CLASS_IIII">Class IIII (Ordinary)</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Max Capacity [{newSpec.unit}]</label>
            <input
              type="number"
              value={newSpec.max_capacity}
              onChange={(e) => setNewSpec({ ...newSpec, max_capacity: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Min Capacity [{newSpec.unit}]</label>
            <input
              type="number"
              value={newSpec.min_capacity}
              onChange={(e) => setNewSpec({ ...newSpec, min_capacity: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Interval e [{newSpec.unit}]</label>
            <input
              type="number"
              value={newSpec.verification_interval_e}
              onChange={(e) => setNewSpec({ ...newSpec, verification_interval_e: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Interval d [{newSpec.unit}]</label>
            <input
              type="number"
              value={newSpec.scale_interval_d}
              onChange={(e) => setNewSpec({ ...newSpec, scale_interval_d: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono"
            />
          </div>
        </div>

        {sanityResult && !sanityResult.is_valid && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 rounded-lg p-3 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" /> Statutory Parameter Non-Compliance:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-rose-300">
              {sanityResult.issues.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Registered Instruments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
          Registered Physical Instruments
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3.5">Serial Number</th>
              <th className="p-3.5">Model / Make</th>
              <th className="p-3.5">Manufacturer</th>
              <th className="p-3.5">Accuracy Class</th>
              <th className="p-3.5">Max / Min Capacity</th>
              <th className="p-3.5">Intervals (e / d)</th>
              <th className="p-3.5">Scale Intervals (n)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {instruments.map((inst) => (
              <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3.5 font-bold font-mono text-blue-900">{inst.serial_number}</td>
                <td className="p-3.5 font-medium text-slate-800">{inst.model_name}</td>
                <td className="p-3.5 text-slate-600">{inst.manufacturer_name}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-800">
                    {inst.accuracy_class}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-slate-700">
                  {inst.max_capacity} {inst.unit} / {inst.min_capacity} {inst.unit}
                </td>
                <td className="p-3.5 font-mono text-slate-700">
                  e = {inst.verification_interval_e} / d = {inst.scale_interval_d}
                </td>
                <td className="p-3.5 font-mono font-bold text-slate-900">{inst.calculated_n.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
