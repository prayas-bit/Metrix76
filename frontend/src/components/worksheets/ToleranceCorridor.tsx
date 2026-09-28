'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { WeighingEvaluationResult, InstrumentMeta, AccuracyClass } from '@/types/metrology';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface ToleranceCorridorProps {
  instrument: InstrumentMeta;
  results: WeighingEvaluationResult[];
}

/**
 * Calculates statutory Maximum Permissible Error (mpe) in scale intervals 'e'
 * per OIML R 76-1:2006 Table 6.
 */
export function calculateStatutoryMpeE(loadInE: number, accuracyClass: AccuracyClass): number {
  const m = Math.abs(loadInE);
  switch (accuracyClass) {
    case 'CLASS_I':
      if (m <= 50000) return 0.5;
      if (m <= 200000) return 1.0;
      return 1.5;
    case 'CLASS_II':
      if (m <= 5000) return 0.5;
      if (m <= 20000) return 1.0;
      return 1.5;
    case 'CLASS_III':
      if (m <= 500) return 0.5;
      if (m <= 2000) return 1.0;
      return 1.5;
    case 'CLASS_IIII':
      if (m <= 50) return 0.5;
      if (m <= 200) return 1.0;
      return 1.5;
    default:
      return 1.0;
  }
}

/**
 * Custom Dot renderer implementing the 3-state ISO/IEC 17025 compliance signaling:
 * - Emerald: Safe operational zone (|Ec| <= 0.9 * |mpe|)
 * - Amber: Tolerance warning (0.9 * |mpe| < |Ec| <= |mpe|)
 * - Rose / Pulse: Tolerance breach (|Ec| > |mpe|)
 */
const CustomToleranceDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || payload?.correctedErrorEc === null || payload?.correctedErrorEc === undefined) {
    return null;
  }

  const ec = Math.abs(payload.correctedErrorEc);
  const mpe = Math.abs(payload.mpeAllowed || payload.upperMpe);
  const ratio = mpe > 0 ? ec / mpe : 0;

  let fill = '#10b981'; // Emerald Safe
  let stroke = '#047857';
  let isBreach = false;
  let isWarning = false;

  if (ratio > 1.0) {
    fill = '#ef4444'; // Rose Breach
    stroke = '#b91c1c';
    isBreach = true;
  } else if (ratio > 0.9) {
    fill = '#f59e0b'; // Amber Warning
    stroke = '#d97706';
    isWarning = true;
  }

  return (
    <g>
      {isBreach && (
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
          opacity={0.7}
          className="animate-ping"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isBreach ? 6 : isWarning ? 5 : 4.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </g>
  );
};

export default function ToleranceCorridor({ instrument, results }: ToleranceCorridorProps) {
  const { e, unit, maxCap, accuracyClass } = useMemo(() => {
    const eVal = instrument.verification_interval_e || 1;
    const maxVal = instrument.max_capacity || 1000;
    const cls = instrument.accuracy_class || 'CLASS_III';
    return {
      e: eVal,
      unit: instrument.unit || 'g',
      maxCap: maxVal,
      accuracyClass: cls
    };
  }, [instrument]);

  // Generate synthetic stepped corridor vertices aligned with OIML Table 6 transition boundaries
  const chartData = useMemo(() => {
    const transitionMultipliers: Record<AccuracyClass, number[]> = {
      CLASS_I: [50000, 200000],
      CLASS_II: [5000, 20000],
      CLASS_III: [500, 2000],
      CLASS_IIII: [50, 200],
    };

    const rawSteps = transitionMultipliers[accuracyClass] || [500, 2000];
    const boundaryLoads = rawSteps
      .map((mult) => mult * e)
      .filter((load) => load < maxCap);

    // Merge observation loads and corridor boundary steps
    const sampleLoads = new Set<number>([0, ...boundaryLoads, maxCap]);
    results.forEach((r) => sampleLoads.add(r.load_applied));

    const sortedLoads = Array.from(sampleLoads).sort((a, b) => a - b);

    return sortedLoads.map((load) => {
      const loadInE = load / e;
      const mpeAllowedE = calculateStatutoryMpeE(loadInE, accuracyClass);
      const mpeAllowedEngineering = mpeAllowedE * e;

      // Find observed results matching this load
      const incRes = results.find((r) => r.direction === 'INCREASING' && Math.abs(r.load_applied - load) < 1e-6);
      const decRes = results.find((r) => r.direction === 'DECREASING' && Math.abs(r.load_applied - load) < 1e-6);
      const staticRes = results.find((r) => r.direction === 'STATIC' && Math.abs(r.load_applied - load) < 1e-6);
      const anyRes = incRes || decRes || staticRes;

      return {
        load,
        loadInE: Number(loadInE.toFixed(2)),
        upperMpe: mpeAllowedEngineering,
        lowerMpe: -mpeAllowedEngineering,
        mpeAllowed: mpeAllowedEngineering,
        increasingEc: incRes ? incRes.corrected_error_ec : null,
        decreasingEc: decRes ? decRes.corrected_error_ec : null,
        correctedErrorEc: anyRes ? anyRes.corrected_error_ec : null,
        observation: anyRes || null,
      };
    });
  }, [accuracyClass, e, maxCap, results]);

  // Metrics summary
  const summary = useMemo(() => {
    let safeCount = 0;
    let warnCount = 0;
    let breachCount = 0;
    let maxRatio = 0;

    results.forEach((r) => {
      const mpeE = calculateStatutoryMpeE(r.load_applied / e, accuracyClass);
      const mpeEng = mpeE * e;
      const ratio = mpeEng > 0 ? Math.abs(r.corrected_error_ec) / mpeEng : 0;
      if (ratio > maxRatio) maxRatio = ratio;

      if (ratio > 1.0) breachCount++;
      else if (ratio > 0.9) warnCount++;
      else safeCount++;
    });

    return {
      safeCount,
      warnCount,
      breachCount,
      maxRatioPct: (maxRatio * 100).toFixed(1),
      isCompliant: breachCount === 0
    };
  }, [results, e, accuracyClass]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Header & Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Metrological Error Corridor & Statutory ±mpe Tolerance Envelopes
            </h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-full">
              OIML R 76-1 ({accuracyClass.replace('_', ' ')})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic step-line envelopes plotting ±0.5e, ±1.0e, and ±1.5e with real-time scatter point compliance signaling.
          </p>
        </div>

        {/* Legend Pills */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
            Safe (≤90%): {summary.safeCount}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs"></span>
            Warning (90-100%): {summary.warnCount}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs animate-pulse"></span>
            Breach (&gt;100%): {summary.breachCount}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="load"
              unit={` ${unit}`}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              label={{
                value: `Applied Test Load L [${unit}] (e = ${e} ${unit})`,
                position: 'insideBottom',
                offset: -15,
                fontSize: 11,
                fill: '#475569',
                fontWeight: 600
              }}
            />
            <YAxis
              unit={` ${unit}`}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              label={{
                value: `Corrected Error Ec [${unit}]`,
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fontSize: 11,
                fill: '#475569',
                fontWeight: 600
              }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const pointData = payload[0]?.payload;
                const obs = pointData?.observation;
                const upperMpe = pointData?.upperMpe;
                const ec = obs ? obs.corrected_error_ec : pointData?.correctedErrorEc;

                return (
                  <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
                      <span>Applied Load (L):</span>
                      <span className="font-mono text-emerald-400">
                        {label} {unit}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-300">
                      {obs && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Observed Indication (I):</span>
                            <span className="font-mono text-white">{obs.indication_observed} {unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Turning Point (P):</span>
                            <span className="font-mono text-white">{obs.calculated_p?.toFixed(4)} {unit}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Corrected Error (Ec):</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {ec !== null && ec !== undefined ? `${ec > 0 ? '+' : ''}${ec.toFixed(4)} ${unit}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Statutory Margin (±mpe):</span>
                        <span className="font-mono text-rose-300">±{upperMpe?.toFixed(4)} {unit}</span>
                      </div>
                    </div>

                    {ec !== null && ec !== undefined && upperMpe && (
                      <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-bold text-[11px]">
                        <span>Tolerance Margin Ratio:</span>
                        <span
                          className={
                            Math.abs(ec) > upperMpe
                              ? 'text-rose-400'
                              : Math.abs(ec) > 0.9 * upperMpe
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {((Math.abs(ec) / upperMpe) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Stepped Upper and Lower MPE Tolerance Lines */}
            <Line
              type="stepAfter"
              dataKey="upperMpe"
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              dot={false}
              name="Upper statutory +mpe"
              isAnimationActive={false}
            />
            <Line
              type="stepAfter"
              dataKey="lowerMpe"
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              dot={false}
              name="Lower statutory -mpe"
              isAnimationActive={false}
            />

            {/* Increasing Vector Curve with Custom Status Dot */}
            <Line
              type="monotone"
              dataKey="increasingEc"
              stroke="#2563eb"
              strokeWidth={2}
              dot={<CustomToleranceDot />}
              activeDot={{ r: 7, stroke: '#1d4ed8', strokeWidth: 2 }}
              name="Increasing Run (▲)"
              connectNulls
            />

            {/* Decreasing Vector Curve with Custom Status Dot */}
            <Line
              type="monotone"
              dataKey="decreasingEc"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={<CustomToleranceDot />}
              activeDot={{ r: 7, stroke: '#6d28d9', strokeWidth: 2 }}
              name="Decreasing Run (▼)"
              connectNulls
            />

            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Compliance Health Banner */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          summary.isCompliant
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/80 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {summary.isCompliant ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          )}
          <span>
            {summary.isCompliant
              ? 'All observed weighing points reside strictly within statutory OIML R 76 error envelopes.'
              : `Tolerance breach detected: ${summary.breachCount} test point(s) exceed maximum statutory permissible error limits.`}
          </span>
        </div>
        <div className="font-mono text-[11px] font-bold">
          Peak Margin: {summary.maxRatioPct}%
        </div>
      </div>
    </div>
  );
}
