'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Thermometer,
  Grid,
  RotateCcw
} from 'lucide-react';
import { InstrumentMeta, WeighingPointInput, WeighingBatchResponse } from '@/types/metrology';
import { evaluateWeighingPoints } from '@/lib/api';
import ToleranceChart from '@/components/worksheets/ToleranceChart';

export default function EvaluationsPage() {
  const [activeTab, setActiveTab] = useState<'A_WEIGHING' | 'B_REPEATABILITY' | 'C_ECCENTRICITY' | 'D_TARE_ZERO'>('A_WEIGHING');

  const [instrument] = useState<InstrumentMeta>({
    accuracy_class: 'CLASS_III',
    max_capacity: 15.0,
    min_capacity: 0.1,
    scale_interval_d: 0.002,
    verification_interval_e: 0.002,
    unit: 'kg',
  });

  const [points, setPoints] = useState<WeighingPointInput[]>([
    { load_applied: 0.0, indication_observed: 0.0, delta_load: 0.001, direction: 'INCREASING' },
    { load_applied: 1.0, indication_observed: 1.0, delta_load: 0.001, direction: 'INCREASING' },
    { load_applied: 5.0, indication_observed: 5.0, delta_load: 0.001, direction: 'INCREASING' },
    { load_applied: 10.0, indication_observed: 9.998, delta_load: 0.001, direction: 'INCREASING' },
    { load_applied: 15.0, indication_observed: 15.001, delta_load: 0.001, direction: 'INCREASING' },
    { load_applied: 10.0, indication_observed: 10.000, delta_load: 0.001, direction: 'DECREASING' },
    { load_applied: 5.0, indication_observed: 5.000, delta_load: 0.001, direction: 'DECREASING' },
    { load_applied: 0.0, indication_observed: 0.000, delta_load: 0.001, direction: 'DECREASING' },
  ]);

  const [evaluation, setEvaluation] = useState<WeighingBatchResponse | null>(null);

  useEffect(() => {
    let isCurrent = true;
    evaluateWeighingPoints(instrument, points)
      .then((data) => {
        if (isCurrent) setEvaluation(data);
      })
      .catch((err) => console.error('Evaluation API error:', err));

    return () => {
      isCurrent = false;
    };
  }, [points, instrument]);

  const updateCell = (index: number, field: keyof WeighingPointInput, val: any) => {
    setPoints((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipData = e.clipboardData.getData('text');
    const rows = clipData.trim().split('\n').map((row) => {
      const parts = row.split('\t');
      return {
        load_applied: parseFloat(parts[0]) || 0,
        indication_observed: parseFloat(parts[1]) || 0,
        delta_load: parseFloat(parts[2]) || 0,
        direction: (parts[3] as any) || 'INCREASING',
      };
    });
    if (rows.length > 0) setPoints(rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-800" />
            <span>Live Test Evaluation Worksheet & Rule Engine</span>
          </h1>
          <p className="text-sm text-slate-500">
            Real-time turning-point correction (P = I + 0.5e - ΔL, Ec = E - E₀) and statutory mpe verification.
          </p>
        </div>

        {evaluation && (
          <div className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase border flex items-center gap-2 shadow-xs ${
            evaluation.overall_compliant 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}>
            {evaluation.overall_compliant ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>OVERALL VERDICT: COMPLIANT (PASS)</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>OVERALL VERDICT: NON-COMPLIANT (FAIL)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Environmental & Instrument Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-4 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Class</span> <span className="font-bold font-mono">{instrument.accuracy_class}</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Max Capacity</span> <span className="font-bold font-mono">{instrument.max_capacity} kg</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Interval (e)</span> <span className="font-bold font-mono">{instrument.verification_interval_e} kg</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Zero Error (E₀)</span> <span className="font-bold font-mono text-blue-800">{evaluation?.zero_error_e0 ?? '--'} kg</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Ambient Temp</span> <span className="font-bold font-mono">22.4 °C (Valid)</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Relative Humidity</span> <span className="font-bold font-mono">54% RH</span></div>
      </div>

      {/* Module 4 Worksheet Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('A_WEIGHING')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'A_WEIGHING'
              ? 'border-blue-700 text-blue-800 font-bold bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clause A.4.4: Weighing Performance
        </button>
        <button
          onClick={() => setActiveTab('B_REPEATABILITY')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'B_REPEATABILITY'
              ? 'border-blue-700 text-blue-800 font-bold bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clause A.4.10: Repeatability
        </button>
        <button
          onClick={() => setActiveTab('C_ECCENTRICITY')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'C_ECCENTRICITY'
              ? 'border-blue-700 text-blue-800 font-bold bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clause A.4.7: Eccentricity (Corner)
        </button>
        <button
          onClick={() => setActiveTab('D_TARE_ZERO')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'D_TARE_ZERO'
              ? 'border-blue-700 text-blue-800 font-bold bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clauses A.4.2 & A.4.6: Tare & Zero
        </button>
      </div>

      {/* Tab A: Weighing Performance Grid & Interactive Corridor */}
      {activeTab === 'A_WEIGHING' && (
        <div className="space-y-6">
          {/* Real-time Recharts Error Corridor Chart */}
          <ToleranceChart instrument={instrument} results={evaluation?.results || []} />

          {/* Interactive TanStack observation table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table onPaste={handlePaste} className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Applied Load (L) [kg]</th>
                  <th className="p-3">Indication (I) [kg]</th>
                  <th className="p-3">ΔL [kg]</th>
                  <th className="p-3 font-mono">P = I + 0.5e - ΔL</th>
                  <th className="p-3 font-mono">Ec = E - E₀</th>
                  <th className="p-3 font-mono">±mpe [kg]</th>
                  <th className="p-3 text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((pt, idx) => {
                  const res = evaluation?.results[idx];
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors font-mono">
                      <td className="p-3 text-slate-600 font-sans">
                        <select
                          value={pt.direction}
                          onChange={(e) => updateCell(idx, 'direction', e.target.value)}
                          className="border border-slate-300 rounded px-1.5 py-1 text-xs outline-none bg-white font-sans"
                        >
                          <option value="INCREASING">Increasing</option>
                          <option value="DECREASING">Decreasing</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="any"
                          value={pt.load_applied}
                          onChange={(e) => updateCell(idx, 'load_applied', parseFloat(e.target.value) || 0)}
                          className="border border-slate-300 rounded px-2 py-1 w-24 outline-none focus:border-blue-500 font-mono"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="any"
                          value={pt.indication_observed}
                          onChange={(e) => updateCell(idx, 'indication_observed', parseFloat(e.target.value) || 0)}
                          className="border border-slate-300 rounded px-2 py-1 w-24 outline-none focus:border-blue-500 font-mono"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="any"
                          value={pt.delta_load}
                          onChange={(e) => updateCell(idx, 'delta_load', parseFloat(e.target.value) || 0)}
                          className="border border-slate-300 rounded px-2 py-1 w-20 outline-none focus:border-blue-500 font-mono"
                        />
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{res?.calculated_p.toFixed(5) ?? '--'}</td>
                      <td className="p-3 font-bold text-slate-900 font-mono">{res?.corrected_error_ec.toFixed(5) ?? '--'}</td>
                      <td className="p-3 text-slate-500 font-mono">{res ? `±${res.mpe_allowed.toFixed(5)}` : '--'}</td>
                      <td className="p-3 text-center font-sans">
                        {res && (
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase ${
                            res.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' :
                            res.status === 'WARN' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {res.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-xs">
            <button
              onClick={() => setPoints([...points, { load_applied: 0, indication_observed: 0, delta_load: 0, direction: 'INCREASING' }])}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold"
            >
              + Add Observation Step
            </button>
            <span className="text-slate-400 font-mono">Tip: You can copy and paste rows directly from Excel/CSV</span>
          </div>
        </div>
      )}

      {/* Tabs B, C, D placeholders with active readiness */}
      {activeTab !== 'A_WEIGHING' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'B_REPEATABILITY' && 'Clause A.4.10: Repeatability Test Matrix'}
            {activeTab === 'C_ECCENTRICITY' && 'Clause A.4.7: Eccentricity (Corner Load) Matrix'}
            {activeTab === 'D_TARE_ZERO' && 'Clauses A.4.2 & A.4.6: Tare & Zero Matrix'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Module active and connected to FastAPI backend endpoint <code>/api/v1/metrology/evaluate-{activeTab.toLowerCase().split('_')[1]}</code>.
          </p>
        </div>
      )}
    </div>
  );
}
