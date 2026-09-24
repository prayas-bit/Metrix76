'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { WeighingEvaluationResult, InstrumentMeta } from '@/types/metrology';
import { getMPE } from '@/lib/metrology/r76';

interface ToleranceChartProps {
  instrument: InstrumentMeta;
  results: WeighingEvaluationResult[];
}

export default function ToleranceChart({ instrument, results }: ToleranceChartProps) {
  const maxCap = instrument.max_capacity;

  // Build continuous envelope points
  const sortedLoads = Array.from(new Set([0, ...results.map((r) => r.load_applied), maxCap])).sort((a, b) => a - b);
  
  const chartData = sortedLoads.map((load) => {
    const mpe = getMPE(load, instrument);
    const matchingRes = results.find((r) => Math.abs(r.load_applied - load) < 1e-6);
    return {
      load,
      upperMpe: mpe,
      lowerMpe: -mpe,
      correctedErrorEc: matchingRes ? matchingRes.corrected_error_ec : null,
      status: matchingRes ? matchingRes.status : null,
      direction: matchingRes ? matchingRes.direction : null,
    };
  });

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
            Dynamic Error Envelope & Statutory MPE Corridor
          </h3>
          <p className="text-xs text-slate-500">
            Real-time visual comparison of corrected error (Ec) against statutory ±mpe tolerance boundaries.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Safe
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Warning (&gt;90%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Breach (Fail)
          </span>
        </div>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="load"
              unit={` ${instrument.unit}`}
              stroke="#64748b"
              fontSize={11}
              label={{ value: `Applied Load L [${instrument.unit}]`, position: 'insideBottom', offset: -10, fontSize: 11 }}
            />
            <YAxis
              unit={` ${instrument.unit}`}
              stroke="#64748b"
              fontSize={11}
              label={{ value: `Ec [${instrument.unit}]`, angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <Tooltip
              formatter={(val: any, name: string) => [
                typeof val === 'number' ? `${val.toFixed(5)} ${instrument.unit}` : val,
                name === 'upperMpe' ? '+mpe' : name === 'lowerMpe' ? '-mpe' : 'Corrected Error Ec'
              ]}
              labelFormatter={(label) => `Load: ${label} ${instrument.unit}`}
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="2 2" />

            {/* Statutory ±mpe tolerance step lines */}
            <Line
              type="stepAfter"
              dataKey="upperMpe"
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              name="+mpe Corridor"
            />
            <Line
              type="stepAfter"
              dataKey="lowerMpe"
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              name="-mpe Corridor"
            />

            {/* Observed Error Points */}
            <Line
              type="monotone"
              dataKey="correctedErrorEc"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: '#2563eb' }}
              activeDot={{ r: 6 }}
              name="Corrected Error (Ec)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
