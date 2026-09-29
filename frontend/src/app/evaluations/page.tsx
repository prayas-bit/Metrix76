'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Save,
  ArrowRight,
  Gauge
} from 'lucide-react';
import {
  InstrumentMeta,
  WeighingPointInput,
  WeighingBatchResponse,
  EccentricityPointInput,
  EccentricityBatchResponse,
  ReferenceStandard,
  ReportObservationInput,
} from '@/types/metrology';
import {
  evaluateWeighingPoints,
  evaluateEccentricity,
  listReferenceStandards,
  listInstruments,
  createReportDraft,
  upsertReportObservations,
  submitReportForReview,
} from '@/lib/api';
import { getMPE, evaluateWeighingClient } from '@/lib/metrology/r76';
import ToleranceChart from '@/components/worksheets/ToleranceChart';
import { useAuth } from '@/lib/authContext';

const STORAGE_KEY = 'draft_evaluation_default';

const getDraftStorageKey = (reportId?: string | null) => (reportId ? `draft_evaluation_${reportId}` : STORAGE_KEY);

type AmbientSetupState = {
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  reference_standard: string;
};

const defaultAmbientSetup: AmbientSetupState = {
  temperature_c: 22.5,
  humidity_pct: 55,
  pressure_hpa: 1013.25,
  reference_standard: 'NPL-E2-SET-04',
};

type WorksheetTab = 'A_WEIGHING' | 'B_REPEATABILITY' | 'C_ECCENTRICITY' | 'D_TARE_ZERO';
type CellField = 'direction' | 'load_applied' | 'indication_observed' | 'delta_load';

const createEmptyPoint = (): WeighingPointInput => ({
  load_applied: 0,
  indication_observed: 0,
  delta_load: 0,
  direction: 'INCREASING',
});

const defaultPoints: WeighingPointInput[] = [
  { load_applied: 0.0, indication_observed: 0.0, delta_load: 0.001, direction: 'INCREASING' },
  { load_applied: 1.0, indication_observed: 1.0, delta_load: 0.001, direction: 'INCREASING' },
  { load_applied: 5.0, indication_observed: 5.0, delta_load: 0.001, direction: 'INCREASING' },
  { load_applied: 10.0, indication_observed: 9.998, delta_load: 0.001, direction: 'INCREASING' },
  { load_applied: 15.0, indication_observed: 15.001, delta_load: 0.001, direction: 'INCREASING' },
  { load_applied: 10.0, indication_observed: 10.0, delta_load: 0.001, direction: 'DECREASING' },
  { load_applied: 5.0, indication_observed: 5.0, delta_load: 0.001, direction: 'DECREASING' },
  { load_applied: 0.0, indication_observed: 0.0, delta_load: 0.001, direction: 'DECREASING' },
];

const defaultEccentricityPoints: EccentricityPointInput[] = [
  { position_tag: 'CENTER', load_applied: 5.0, indication_observed: 5.000, delta_load: 0.001 },
  { position_tag: 'TOP_LEFT', load_applied: 5.0, indication_observed: 5.002, delta_load: 0.001 },
  { position_tag: 'TOP_RIGHT', load_applied: 5.0, indication_observed: 4.998, delta_load: 0.001 },
  { position_tag: 'BOTTOM_RIGHT', load_applied: 5.0, indication_observed: 5.001, delta_load: 0.001 },
  { position_tag: 'BOTTOM_LEFT', load_applied: 5.0, indication_observed: 4.999, delta_load: 0.001 },
];

const fieldOrder: CellField[] = ['direction', 'load_applied', 'indication_observed', 'delta_load'];

const eccentricityLayout: Record<string, { x: number; y: number }> = {
  CENTER: { x: 110, y: 110 },
  TOP_LEFT: { x: 52, y: 52 },
  TOP_RIGHT: { x: 168, y: 52 },
  BOTTOM_RIGHT: { x: 168, y: 168 },
  BOTTOM_LEFT: { x: 52, y: 168 },
};

type RepeatabilitySeriesState = {
  id: string;
  label: string;
  nominalLoad: number;
  readings: number[];
};

const createRepeatabilitySeries = (maxCapacity: number): RepeatabilitySeriesState[] => [
  {
    id: 'A',
    label: 'Series A',
    nominalLoad: maxCapacity * 0.5,
    readings: [0.011, 0.009, 0.012, 0.010, 0.011, 0.013, 0.009, 0.010, 0.012, 0.010],
  },
  {
    id: 'B',
    label: 'Series B',
    nominalLoad: maxCapacity * 1.0,
    readings: [0.024, 0.022, 0.025, 0.023, 0.024, 0.026, 0.022, 0.023, 0.024, 0.025],
  },
  {
    id: 'C',
    label: 'Series C',
    nominalLoad: maxCapacity * 0.5,
    readings: [0.010, 0.011, 0.009, 0.010, 0.012, 0.011, 0.010, 0.009, 0.011, 0.010],
  },
];

const getSampleStandardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
};

const evaluateRepeatabilitySeries = (series: RepeatabilitySeriesState, instrument: InstrumentMeta) => {
  const pMax = Math.max(...series.readings);
  const pMin = Math.min(...series.readings);
  const deltaI = pMax - pMin;
  const standardDeviation = getSampleStandardDeviation(series.readings);
  const mpeAllowed = Math.abs(getMPE(series.nominalLoad, instrument));
  const isCompliant = deltaI <= mpeAllowed + 1e-9;

  return {
    pMax,
    pMin,
    deltaI,
    standardDeviation,
    mpeAllowed,
    isCompliant,
  };
};

export default function EvaluationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<WorksheetTab>('A_WEIGHING');
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  const [reportId, setReportId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    try {
      const generic = window.localStorage.getItem(STORAGE_KEY);
      if (!generic) return null;
      const parsed = JSON.parse(generic);
      return parsed?.reportId ?? null;
    } catch (error) {
      console.warn('Failed to load saved report ID from draft:', error);
      return null;
    }
  });

  const readSavedDraft = (draftId: string | null = reportId) => {
    if (typeof window === 'undefined') return null;

    try {
      const preferredKey = getDraftStorageKey(draftId);
      const saved = window.localStorage.getItem(preferredKey) ?? window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      console.warn('Failed to load saved draft:', error);
    }

    return null;
  };

  const savedDraft = readSavedDraft();

  const [instrument, setInstrument] = useState<InstrumentMeta>(() => ({
    accuracy_class: 'CLASS_III',
    max_capacity: 15.0,
    min_capacity: 0.1,
    scale_interval_d: 0.002,
    verification_interval_e: 0.002,
    unit: 'kg',
    ...(savedDraft?.instrument ?? {}),
  }));
  const [wizardStep, setWizardStep] = useState<number>(() => savedDraft?.wizardStep ?? 1);
  const [instrumentId, setInstrumentId] = useState<string>(() => savedDraft?.instrumentId ?? 'inst-001');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [ambientSetup, setAmbientSetup] = useState<AmbientSetupState>(() => ({
    ...defaultAmbientSetup,
    ...(savedDraft?.ambientSetup ?? {}),
  }));
  const [referenceStandards, setReferenceStandards] = useState<ReferenceStandard[]>([]);

  const [points, setPoints] = useState<WeighingPointInput[]>(() => {
    if (Array.isArray(savedDraft?.points) && savedDraft.points.length > 0) {
      return savedDraft.points as WeighingPointInput[];
    }

    return defaultPoints;
  });

  const [evaluation, setEvaluation] = useState<WeighingBatchResponse | null>(null);
  const [repeatabilityData, setRepeatabilityData] = useState<RepeatabilitySeriesState[]>(() => {
    if (Array.isArray(savedDraft?.repeatabilityData) && savedDraft.repeatabilityData.length > 0) {
      return savedDraft.repeatabilityData as RepeatabilitySeriesState[];
    }
    return createRepeatabilitySeries(15);
  });
  const [eccentricityPoints, setEccentricityPoints] = useState<EccentricityPointInput[]>(() => {
    if (Array.isArray(savedDraft?.eccentricityPoints) && savedDraft.eccentricityPoints.length > 0) {
      return savedDraft.eccentricityPoints as EccentricityPointInput[];
    }
    return defaultEccentricityPoints;
  });
  const [eccentricityEvaluation, setEccentricityEvaluation] = useState<EccentricityBatchResponse | null>(null);
  const [activeEccentricityPosition, setActiveEccentricityPosition] = useState<string>('CENTER');
  type TareZeroState = {
    zeroSetting: number;
    zeroTracking: number;
    tareBalancing: number;
  };

  const [tareZeroState, setTareZeroState] = useState<TareZeroState>(() => ({
    zeroSetting: 0.000,
    zeroTracking: 0.000,
    tareBalancing: 0.000,
    ...(savedDraft?.tareZeroState ?? {}),
  }));
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitted'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draftPayload = {
        instrument,
        ambientSetup,
        points,
        repeatabilityData,
        eccentricityPoints,
        tareZeroState,
        activeTab,
        wizardStep,
        instrumentId,
        reportId,
        savedAt: new Date().toISOString(),
      };
      const storageKey = getDraftStorageKey(reportId);
      window.localStorage.setItem(storageKey, JSON.stringify(draftPayload));

      if (!reportId) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftPayload));
      }
    }
  }, [
    instrument,
    ambientSetup,
    points,
    repeatabilityData,
    eccentricityPoints,
    tareZeroState,
    activeTab,
    wizardStep,
    instrumentId,
    reportId,
  ]);

  useEffect(() => {
    listInstruments()
      .then((instruments) => {
        if (instruments.length > 0) {
          setInstrumentId(instruments[0].id);
        }
      })
      .catch((error) => console.error('Instrument lookup error:', error));

    listReferenceStandards()
      .then((standards) => {
        setReferenceStandards(standards);
        const activeStandard = standards.find((standard) => standard.is_active && !standard.is_expired);
        if (activeStandard && !standards.some((standard) => standard.set_identifier === ambientSetup.reference_standard)) {
          setAmbientSetup((prev) => ({ ...prev, reference_standard: activeStandard.set_identifier }));
        }
      })
      .catch((error) => console.error('Reference standards error:', error));
  }, []);

  useEffect(() => {
    let isCurrent = true;

    evaluateWeighingPoints(instrument, points)
      .then((data) => {
        if (isCurrent) setEvaluation(data);
      })
      .catch((err) => {
        console.warn('Backend evaluation API unavailable, using client-side engine:', err);
        if (isCurrent) {
          try {
            const clientResult = evaluateWeighingClient(instrument, points);
            setEvaluation(clientResult);
          } catch (evalError) {
            console.error('Client evaluation error:', evalError);
          }
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [points, instrument]);

  useEffect(() => {
    let isCurrent = true;

    evaluateEccentricity(instrument, eccentricityPoints)
      .then((data) => {
        if (isCurrent) setEccentricityEvaluation(data);
      })
      .catch((err) => {
        console.warn('Eccentricity evaluation API unavailable, using fallback calculation:', err);
        if (isCurrent) {
          const e = instrument.verification_interval_e;
          const recommendedLoad = Number((instrument.max_capacity / 3).toFixed(2));
          const centerPt = eccentricityPoints.find((p) => p.position_tag === 'CENTER') || eccentricityPoints[0];
          const e0 = centerPt ? (centerPt.indication_observed + 0.5 * e - centerPt.delta_load) - centerPt.load_applied : 0;
          let overallCompliant = true;
          const results = eccentricityPoints.map((pt) => {
            const p = pt.indication_observed + 0.5 * e - pt.delta_load;
            const ec = (p - pt.load_applied) - e0;
            const mpe = Math.abs(getMPE(pt.load_applied, instrument));
            const isCompliant = Math.abs(ec) <= mpe + 1e-9;
            if (!isCompliant) overallCompliant = false;
            return {
              position_tag: pt.position_tag,
              load_applied: pt.load_applied,
              indication_observed: pt.indication_observed,
              calculated_p: Number(p.toFixed(5)),
              corrected_error_ec: Number(ec.toFixed(5)),
              mpe_allowed: Number(mpe.toFixed(5)),
              is_compliant: isCompliant,
            };
          });
          setEccentricityEvaluation({
            recommended_load: recommendedLoad,
            zero_error_e0: Number(e0.toFixed(5)),
            results,
            overall_compliant: overallCompliant,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [eccentricityPoints, instrument]);

  const focusCell = (rowIndex: number, field: CellField) => {
    const key = `${rowIndex}-${field}`;
    const element = inputRefs.current[key];
    if (!element) return;

    element.focus();
    if ('select' in element && typeof element.select === 'function') {
      element.select();
    }
  };

  const handleCellNavigation = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    field: CellField
  ) => {
    const currentFieldIndex = fieldOrder.indexOf(field);

    if (['Tab', 'Enter', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();

      if (event.key === 'Tab') {
        const nextFieldIndex = event.shiftKey ? currentFieldIndex - 1 : currentFieldIndex + 1;

        if (nextFieldIndex >= 0 && nextFieldIndex < fieldOrder.length) {
          focusCell(rowIndex, fieldOrder[nextFieldIndex]);
          return;
        }

        if (event.shiftKey && rowIndex > 0) {
          focusCell(rowIndex - 1, 'delta_load');
          return;
        }

        if (!event.shiftKey && rowIndex < points.length - 1) {
          focusCell(rowIndex + 1, 'direction');
          return;
        }
      }

      if (event.key === 'Enter' || event.key === 'ArrowDown') {
        const nextRow = Math.min(rowIndex + 1, points.length - 1);
        focusCell(nextRow, field);
        return;
      }

      if (event.key === 'ArrowUp') {
        const nextRow = Math.max(rowIndex - 1, 0);
        focusCell(nextRow, field);
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const nextFieldIndex = Math.min(
          Math.max(currentFieldIndex + direction, 0),
          fieldOrder.length - 1
        );
        focusCell(rowIndex, fieldOrder[nextFieldIndex]);
      }
    }
  };

  const updateCell = (index: number, field: keyof WeighingPointInput, val: string | number | 'INCREASING' | 'DECREASING' | 'STATIC') => {
    setPoints((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTableElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text');
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length === 0) return;

    const parsed: WeighingPointInput[] = rows.flatMap((row) => {
      const cells = row
        .split(/\t|,|;/)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      if (cells.length === 0) return [];

      const normalized = cells.map((cell) => cell.replace(/[^0-9.+\-eE]/g, ''));
      const numericValues = normalized
        .filter((cell) => cell !== '' && !Number.isNaN(Number(cell)))
        .map((cell) => Number(cell));

      const directionText = cells.find((cell) => /increasing|decreasing|static/i.test(cell));
      const direction: WeighingPointInput['direction'] =
        directionText?.toUpperCase().includes('DECREASING')
          ? 'DECREASING'
          : directionText?.toUpperCase().includes('STATIC')
            ? 'STATIC'
            : 'INCREASING';

      const base = createEmptyPoint();
      const loadApplied = numericValues[0] ?? base.load_applied;
      const indicationObserved = numericValues[1] ?? base.indication_observed;
      const deltaLoad = numericValues[2] ?? base.delta_load;

      return [{
        ...base,
        load_applied: Number(loadApplied),
        indication_observed: Number(indicationObserved),
        delta_load: Number(deltaLoad),
        direction,
      }];
    });

    if (parsed.length > 0) {
      setPoints((prev) => {
        const merged = [...prev];
        const replacementCount = Math.min(parsed.length, merged.length);

        for (let index = 0; index < replacementCount; index += 1) {
          merged[index] = parsed[index];
        }

        if (parsed.length > replacementCount) {
          parsed.slice(replacementCount).forEach((point) => merged.push(point));
        }

        return merged;
      });
    }
  };

  const handleAddObservationStep = () => {
    setPoints((prev) => [...prev, createEmptyPoint()]);
  };

  const updateRepeatabilityReading = (seriesIndex: number, readingIndex: number, value: number) => {
    setRepeatabilityData((prev) =>
      prev.map((series, idx) => {
        if (idx !== seriesIndex) return series;

        return {
          ...series,
          readings: series.readings.map((reading, currentIndex) =>
            currentIndex === readingIndex ? value : reading
          ),
        };
      })
    );
  };

  const updateEccentricityPoint = (positionTag: string, field: keyof EccentricityPointInput, value: number) => {
    setEccentricityPoints((prev) =>
      prev.map((point) =>
        point.position_tag === positionTag ? { ...point, [field]: value } : point
      )
    );
  };

  const updateTareZeroField = (field: keyof typeof tareZeroState, value: number) => {
    setTareZeroState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitForReview = async () => {
    const fallbackStandardId = referenceStandards.find((standard) => standard.set_identifier === ambientSetup.reference_standard)?.id ?? referenceStandards[0]?.id ?? 'std-001';

    try {
      const draftReport = reportId
        ? { id: reportId }
        : await createReportDraft({
            instrument_id: instrumentId,
            reference_standard_id: fallbackStandardId,
            ambient_temperature_celsius: ambientSetup.temperature_c,
            relative_humidity_pct: ambientSetup.humidity_pct,
            atmospheric_pressure_hpa: ambientSetup.pressure_hpa,
            technical_checklist: {
              level_indicator_present: true,
              zero_setting_operative: true,
              tare_device_operative: true,
              security_sealing_intact: true,
              audit_counter_value: 'AC-0001',
              notes: 'Created from technician evaluation workflow',
            },
            conducted_by: user?.id,
          });

      const activeReportId = draftReport.id;
      setReportId(activeReportId);

      const weighingObservations: ReportObservationInput[] = points.map((point, index) => ({
        test_type: 'WEIGHING',
        direction: point.direction,
        sequence_order: index + 1,
        load_applied: point.load_applied,
        indication_observed: point.indication_observed,
        delta_load: point.delta_load,
        position_tag: 'CENTER',
      }));

      const repeatabilityObservations: ReportObservationInput[] = repeatabilityData.flatMap((series, sIdx) =>
        series.readings.map((reading, rIdx) => ({
          test_type: 'REPEATABILITY' as const,
          direction: 'STATIC' as const,
          sequence_order: (sIdx + 1) * 100 + (rIdx + 1),
          load_applied: series.nominalLoad,
          indication_observed: reading,
          delta_load: 0,
          position_tag: 'CENTER',
          run_cycle: sIdx + 1,
        }))
      );

      const eccentricityObservations: ReportObservationInput[] = eccentricityPoints.map((point, index) => ({
        test_type: 'ECCENTRICITY' as const,
        direction: 'STATIC' as const,
        sequence_order: 1000 + (index + 1),
        load_applied: point.load_applied,
        indication_observed: point.indication_observed,
        delta_load: point.delta_load,
        position_tag: point.position_tag,
      }));

      const tareZeroObservations: ReportObservationInput[] = [
        {
          test_type: 'TARE_ZERO' as const,
          direction: 'STATIC' as const,
          sequence_order: 2001,
          load_applied: 0,
          indication_observed: tareZeroState.zeroSetting,
          delta_load: 0,
          position_tag: 'ZERO_SETTING',
        },
        {
          test_type: 'TARE_ZERO' as const,
          direction: 'STATIC' as const,
          sequence_order: 2002,
          load_applied: 0,
          indication_observed: tareZeroState.zeroTracking,
          delta_load: 0,
          position_tag: 'ZERO_TRACKING',
        },
        {
          test_type: 'TARE_ZERO' as const,
          direction: 'STATIC' as const,
          sequence_order: 2003,
          load_applied: 0,
          indication_observed: tareZeroState.tareBalancing,
          delta_load: 0,
          position_tag: 'TARE_BALANCING',
        },
      ];

      const observationRows: ReportObservationInput[] = [
        ...weighingObservations,
        ...repeatabilityObservations,
        ...eccentricityObservations,
        ...tareZeroObservations,
      ];

      await upsertReportObservations(activeReportId, {
        report_id: activeReportId,
        observations: observationRows,
      });

      const submitResult = await submitReportForReview(activeReportId);
      setSubmissionState('submitted');
      setSubmissionError(null);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`${STORAGE_KEY}_status`, 'PENDING_APPROVAL');
        window.localStorage.setItem(`${STORAGE_KEY}_report_id`, activeReportId);
      }

      console.info('Report submitted for review:', submitResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit the report for review';
      setSubmissionState('idle');
      setSubmissionError(message);
      console.error('Report submission failure:', error);
    }
  };

  const updateInstrumentField = <K extends keyof InstrumentMeta>(field: K, value: InstrumentMeta[K]) => {
    setInstrument((prev) => ({ ...prev, [field]: value }));
  };

  const zeroThreshold = 0.25 * instrument.verification_interval_e;
  const tareZeroResults = {
    zeroSetting: { value: Math.abs(tareZeroState.zeroSetting), limit: zeroThreshold, compliant: Math.abs(tareZeroState.zeroSetting) <= zeroThreshold },
    zeroTracking: { value: Math.abs(tareZeroState.zeroTracking), limit: zeroThreshold, compliant: Math.abs(tareZeroState.zeroTracking) <= zeroThreshold },
    tareBalancing: { value: Math.abs(tareZeroState.tareBalancing), limit: zeroThreshold, compliant: Math.abs(tareZeroState.tareBalancing) <= zeroThreshold },
  };
  const selectedStandard = referenceStandards.find((standard) => standard.set_identifier === ambientSetup.reference_standard) ?? null;
  const standardIsBlocked = !!selectedStandard && (selectedStandard.is_expired || !selectedStandard.is_active);

  const renderWizardStepContent = () => {
    if (wizardStep === 1) {
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 1 • Instrument Passport</h3>
              <p className="text-xs text-slate-500">Capture the scale configuration for the live test packet.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-xs text-slate-600 font-medium">
              Accuracy Class
              <select
                value={instrument.accuracy_class}
                onChange={(event) => updateInstrumentField('accuracy_class', event.target.value as InstrumentMeta['accuracy_class'])}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              >
                <option value="CLASS_I">CLASS_I</option>
                <option value="CLASS_II">CLASS_II</option>
                <option value="CLASS_III">CLASS_III</option>
                <option value="CLASS_IIII">CLASS_IIII</option>
              </select>
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Unit
              <input
                value={instrument.unit}
                onChange={(event) => updateInstrumentField('unit', event.target.value)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Max Capacity (kg)
              <input
                type="number"
                step="any"
                value={instrument.max_capacity}
                onChange={(event) => updateInstrumentField('max_capacity', Number(event.target.value) || 0)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Min Capacity (kg)
              <input
                type="number"
                step="any"
                value={instrument.min_capacity}
                onChange={(event) => updateInstrumentField('min_capacity', Number(event.target.value) || 0)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Interval d (kg)
              <input
                type="number"
                step="any"
                value={instrument.scale_interval_d}
                onChange={(event) => updateInstrumentField('scale_interval_d', Number(event.target.value) || 0)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Verification Interval e (kg)
              <input
                type="number"
                step="any"
                value={instrument.verification_interval_e}
                onChange={(event) => updateInstrumentField('verification_interval_e', Number(event.target.value) || 0)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>
          </div>
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 2 • Ambient Setup</h3>
              <p className="text-xs text-slate-500">Record the exposure conditions and traceability reference before running the worksheets.</p>
            </div>
          </div>

          {standardIsBlocked && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              <strong>ISO 17025 guardrail:</strong> the selected reference standard is expired or inactive, so progression to the worksheets is blocked until a valid set is chosen.
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-xs text-slate-600 font-medium">
              Temperature (°C)
              <input
                type="number"
                step="any"
                value={ambientSetup.temperature_c}
                onChange={(event) => setAmbientSetup((prev) => ({ ...prev, temperature_c: Number(event.target.value) || 0 }))}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Relative Humidity (%)
              <input
                type="number"
                step="any"
                value={ambientSetup.humidity_pct}
                onChange={(event) => setAmbientSetup((prev) => ({ ...prev, humidity_pct: Number(event.target.value) || 0 }))}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Atmospheric Pressure (hPa)
              <input
                type="number"
                step="any"
                value={ambientSetup.pressure_hpa}
                onChange={(event) => setAmbientSetup((prev) => ({ ...prev, pressure_hpa: Number(event.target.value) || 0 }))}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 font-medium">
              Reference Standard Set
              <select
                value={ambientSetup.reference_standard}
                onChange={(event) => setAmbientSetup((prev) => ({ ...prev, reference_standard: event.target.value }))}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2 bg-white"
              >
                {referenceStandards.length === 0 ? (
                  <option value="">Loading standards…</option>
                ) : (
                  referenceStandards.map((standard) => (
                    <option key={standard.id} value={standard.set_identifier}>
                      {standard.set_identifier} ({standard.is_expired ? 'expired' : standard.days_to_expiry + 'd left'})
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          {selectedStandard && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">Selected standard</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  selectedStandard.is_expired || !selectedStandard.is_active
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedStandard.is_expired || !selectedStandard.is_active ? 'Blocked' : 'Valid'}
                </span>
              </div>
              <div className="mt-2 font-mono text-slate-800">{selectedStandard.set_identifier}</div>
              <div className="mt-1">Expiry: {selectedStandard.expiry_date} • {selectedStandard.days_to_expiry} days remaining</div>
            </div>
          )}
        </div>
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="space-y-6">
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex flex-wrap gap-2">
            {[
              ['A_WEIGHING', 'Clause A.4.4: Weighing'],
              ['B_REPEATABILITY', 'Clause A.4.10: Repeatability'],
              ['C_ECCENTRICITY', 'Clause A.4.7: Eccentricity'],
              ['D_TARE_ZERO', 'Clauses A.4.2 & A.4.6'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as WorksheetTab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
                  activeTab === key ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {renderWorksheetShell()}
        </div>
      );
    }

    if (wizardStep === 4) {
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 4 • Review Summary</h3>
              <p className="text-xs text-slate-500">Final sign-off review before the draft is submitted for approval.</p>
            </div>
            {submissionState === 'submitted' && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-[10px] font-bold uppercase">
                Pending approval
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Instrument</div>
              <div className="mt-2 font-bold text-slate-900">{instrument.accuracy_class}</div>
              <div className="text-xs text-slate-600">{instrument.max_capacity} kg max</div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Ambient</div>
              <div className="mt-2 font-bold text-slate-900">{ambientSetup.temperature_c} °C</div>
              <div className="text-xs text-slate-600">{ambientSetup.humidity_pct}% RH / {ambientSetup.pressure_hpa} hPa</div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Overall Result</div>
              <div className="mt-2 font-bold text-slate-900">
                {evaluation?.overall_compliant ? 'COMPLIANT' : 'CHECK REQUIRED'}
              </div>
              <div className="text-xs text-slate-600">{ambientSetup.reference_standard}</div>
            </div>
          </div>

          {submissionError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {submissionError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={submissionState === 'submitted'}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submissionState === 'submitted' ? 'Submitted for review' : 'Submit for review'}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderWorksheetShell = () => {
    if (activeTab === 'A_WEIGHING') {
      return (
        <div className="space-y-6">
          <ToleranceChart instrument={instrument} results={evaluation?.results || []} />

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <ClipboardList className="w-4 h-4 text-blue-700" />
                <span>Keyboard-first worksheet</span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Save className="w-3.5 h-3.5" />
                Auto-saved to localStorage
              </div>
            </div>

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
                          ref={(element) => {
                            inputRefs.current[`${idx}-direction`] = element;
                          }}
                          value={pt.direction}
                          onKeyDown={(event) => handleCellNavigation(event, idx, 'direction')}
                          onChange={(event) => updateCell(idx, 'direction', event.target.value as WeighingPointInput['direction'])}
                          className="border border-slate-300 rounded px-1.5 py-1 text-xs outline-none bg-white font-sans"
                        >
                          <option value="INCREASING">Increasing</option>
                          <option value="DECREASING">Decreasing</option>
                          <option value="STATIC">Static</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <input
                          ref={(element) => {
                            inputRefs.current[`${idx}-load_applied`] = element;
                          }}
                          type="number"
                          step="any"
                          value={pt.load_applied}
                          onKeyDown={(event) => handleCellNavigation(event, idx, 'load_applied')}
                          onChange={(event) => updateCell(idx, 'load_applied', Number(event.target.value) || 0)}
                          className="border border-slate-300 rounded px-2 py-1 w-24 outline-none focus:border-blue-500 font-mono"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          ref={(element) => {
                            inputRefs.current[`${idx}-indication_observed`] = element;
                          }}
                          type="number"
                          step="any"
                          value={pt.indication_observed}
                          onKeyDown={(event) => handleCellNavigation(event, idx, 'indication_observed')}
                          onChange={(event) => updateCell(idx, 'indication_observed', Number(event.target.value) || 0)}
                          className="border border-slate-300 rounded px-2 py-1 w-24 outline-none focus:border-blue-500 font-mono"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          ref={(element) => {
                            inputRefs.current[`${idx}-delta_load`] = element;
                          }}
                          type="number"
                          step="any"
                          value={pt.delta_load}
                          onKeyDown={(event) => handleCellNavigation(event, idx, 'delta_load')}
                          onChange={(event) => updateCell(idx, 'delta_load', Number(event.target.value) || 0)}
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
              onClick={handleAddObservationStep}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold"
            >
              + Add Observation Step
            </button>
            <div className="flex items-center gap-2 text-slate-500">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Tip: Excel rows paste cleanly into the grid</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'B_REPEATABILITY') {
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Repeatability Matrix</h3>
              <p className="text-xs text-slate-500">Series A/B/C with running spread, sample deviation, and compliance checks.</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">live</span>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {repeatabilityData.map((series, seriesIndex) => {
              const metrics = evaluateRepeatabilitySeries(series, instrument);

              return (
                <div key={series.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-3">
                    <span>{series.label}</span>
                    <span>{series.nominalLoad.toFixed(2)} kg</span>
                  </div>

                  <div className="space-y-2">
                    {series.readings.map((reading, readingIndex) => (
                      <div key={`${series.id}-${readingIndex}`} className="grid grid-cols-[1fr_80px] gap-2 text-[11px]">
                        <span className="text-slate-500">Obs {readingIndex + 1}</span>
                        <input
                          type="number"
                          step="any"
                          value={reading}
                          onChange={(event) =>
                            updateRepeatabilityReading(seriesIndex, readingIndex, Number(event.target.value) || 0)
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-right bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-700">
                    <div className="bg-white rounded border border-slate-200 p-2">
                      <div className="text-slate-500 uppercase">Pmax</div>
                      <div className="font-bold mt-1">{metrics.pMax.toFixed(3)}</div>
                    </div>
                    <div className="bg-white rounded border border-slate-200 p-2">
                      <div className="text-slate-500 uppercase">Pmin</div>
                      <div className="font-bold mt-1">{metrics.pMin.toFixed(3)}</div>
                    </div>
                    <div className="bg-white rounded border border-slate-200 p-2">
                      <div className="text-slate-500 uppercase">ΔI</div>
                      <div className="font-bold mt-1">{metrics.deltaI.toFixed(3)}</div>
                    </div>
                    <div className="bg-white rounded border border-slate-200 p-2">
                      <div className="text-slate-500 uppercase">s</div>
                      <div className="font-bold mt-1">{metrics.standardDeviation.toFixed(3)}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] flex items-center justify-between rounded border px-2 py-1.5 bg-white">
                    <span className="text-slate-500">±mpe</span>
                    <span className="font-bold text-slate-800">{metrics.mpeAllowed.toFixed(3)}</span>
                  </div>

                  <div className={`mt-2 text-center text-[10px] font-bold uppercase rounded-full px-2 py-1 ${
                    metrics.isCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {metrics.isCompliant ? 'Compliant' : 'Non-compliant'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeTab === 'C_ECCENTRICITY') {
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Eccentricity Platter</h3>
              <p className="text-xs text-slate-500">Center and quadrant loading with automatic 1/3Max recommendation and per-position pass/fail.</p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">live</span>
          </div>

          <div className="grid lg:grid-cols-[220px_1fr] gap-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <svg viewBox="0 0 220 220" className="w-full h-auto rounded-lg bg-white border border-slate-200">
                <rect x="20" y="20" width="180" height="180" rx="16" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                <circle cx="110" cy="110" r="78" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="110" y1="20" x2="110" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="20" y1="110" x2="200" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />

                {Object.entries(eccentricityLayout).map(([tag, position]) => {
                  const isActive = tag === activeEccentricityPosition;
                  const result = eccentricityEvaluation?.results.find((item) => item.position_tag === tag);

                  return (
                    <g key={tag} onClick={() => setActiveEccentricityPosition(tag)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={isActive ? 11 : 8}
                        fill={result?.is_compliant ? '#22c55e' : '#f87171'}
                        stroke={isActive ? '#1d4ed8' : '#475569'}
                        strokeWidth={isActive ? 3 : 1.5}
                      />
                      <text x={position.x} y={position.y + 3} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">
                        {tag.slice(0, 1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
                <span>Recommended load</span>
                <span className="font-bold text-slate-900">{eccentricityEvaluation?.recommended_load.toFixed(2) ?? '--'} kg</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {eccentricityPoints.map((point) => {
                const result = eccentricityEvaluation?.results.find((item) => item.position_tag === point.position_tag);

                return (
                  <div
                    key={point.position_tag}
                    onClick={() => setActiveEccentricityPosition(point.position_tag)}
                    className={`border rounded-lg p-3 bg-slate-50 transition-colors ${
                      activeEccentricityPosition === point.position_tag
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-2">
                      <span>{point.position_tag.replace('_', ' ')}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                        result?.is_compliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {result ? (result.is_compliant ? 'PASS' : 'FAIL') : 'LIVE'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] text-slate-500">
                        Applied load
                        <input
                          type="number"
                          step="any"
                          value={point.load_applied}
                          onChange={(event) =>
                            updateEccentricityPoint(point.position_tag, 'load_applied', Number(event.target.value) || 0)
                          }
                          className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-right bg-white"
                        />
                      </label>

                      <label className="block text-[10px] text-slate-500">
                        Indication
                        <input
                          type="number"
                          step="any"
                          value={point.indication_observed}
                          onChange={(event) =>
                            updateEccentricityPoint(point.position_tag, 'indication_observed', Number(event.target.value) || 0)
                          }
                          className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-right bg-white"
                        />
                      </label>

                      <label className="block text-[10px] text-slate-500">
                        ΔL
                        <input
                          type="number"
                          step="any"
                          value={point.delta_load}
                          onChange={(event) =>
                            updateEccentricityPoint(point.position_tag, 'delta_load', Number(event.target.value) || 0)
                          }
                          className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-right bg-white"
                        />
                      </label>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 grid grid-cols-2 gap-2">
                      <div className="bg-white rounded border border-slate-200 p-1.5">
                        <div className="uppercase">P</div>
                        <div className="font-bold text-slate-800">{result ? result.calculated_p.toFixed(3) : '--'}</div>
                      </div>
                      <div className="bg-white rounded border border-slate-200 p-1.5">
                        <div className="uppercase">Ec</div>
                        <div className="font-bold text-slate-800">{result ? result.corrected_error_ec.toFixed(3) : '--'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'D_TARE_ZERO') {
      const overallZeroCompliant = Object.values(tareZeroResults).every((entry) => entry.compliant);

      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Tare & Zero Verification</h3>
              <p className="text-xs text-slate-500">Zero-setting, zero-tracking, and tare residual checks with ±0.25e guardrail.</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
              overallZeroCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {overallZeroCompliant ? 'guarded' : 'review'}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {[
              ['zeroSetting', 'Zero Setting'],
              ['zeroTracking', 'Zero Tracking'],
              ['tareBalancing', 'Tare Balancing'],
            ].map(([key, label]) => {
              const entry = tareZeroResults[key as keyof typeof tareZeroResults];

              return (
                <div key={key} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    <span>{label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                      entry.compliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {entry.compliant ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <input
                    type="number"
                    step="any"
                    value={tareZeroState[key as keyof typeof tareZeroState]}
                    onChange={(event) =>
                      updateTareZeroField(key as keyof typeof tareZeroState, Number(event.target.value) || 0)
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1 text-right bg-white"
                  />

                  <div className="space-y-1 text-[10px] text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Residual</span>
                      <span className="font-bold text-slate-700">{entry.value.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Limit</span>
                      <span className="font-bold text-slate-700">±{entry.limit.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Overall Clause A.4.2 / A.4.6 status</span>
              <span className={`font-bold uppercase ${overallZeroCompliant ? 'text-emerald-700' : 'text-amber-700'}`}>
                {overallZeroCompliant ? 'Compliant' : 'Needs recheck'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-800" />
            <span>Live Test Evaluation Worksheet & Rule Engine</span>
          </h1>
          <p className="text-sm text-slate-500">
            Real-time turning-point correction and statutory MPE verification with draft persistence and keyboard-first data entry.
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
                <span>OVERALL VERDICT: COMPLIANT</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>OVERALL VERDICT: NON-COMPLIANT</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-4 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Class</span><span className="font-bold font-mono">{instrument.accuracy_class}</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Max Capacity</span><span className="font-bold font-mono">{instrument.max_capacity} kg</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Interval (e)</span><span className="font-bold font-mono">{instrument.verification_interval_e} kg</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Zero Error (E₀)</span><span className="font-bold font-mono text-blue-800">{evaluation?.zero_error_e0 ?? '--'} kg</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Draft Saved</span><span className="font-bold font-mono text-emerald-700">localStorage</span></div>
        <div><span className="text-slate-400 block uppercase font-semibold text-[10px]">Status</span><span className="font-bold font-mono">DRAFT</span></div>
      </div>

      <div className="flex border-b border-slate-200 space-x-2 text-xs font-semibold overflow-x-auto">
        {[
          { step: 1, label: 'Passport' },
          { step: 2, label: 'Ambient' },
          { step: 3, label: 'Worksheets' },
          { step: 4, label: 'Summary' },
        ].map(({ step, label }) => (
          <button
            key={step}
            onClick={() => setWizardStep(step)}
            className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              wizardStep === step
                ? 'border-blue-700 text-blue-800 font-bold bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {renderWizardStepContent()}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setWizardStep((prev) => Math.max(prev - 1, 1))}
          disabled={wizardStep === 1}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Gauge className="w-4 h-4 text-blue-700" />
          <span>Draft state persists locally and automatically recalculates zero-offset for each row update.</span>
        </div>

        <button
          type="button"
          onClick={() => setWizardStep((prev) => Math.min(prev + 1, 4))}
          disabled={wizardStep === 4 || standardIsBlocked}
          className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {wizardStep === 4 ? 'Final Review' : 'Next'}
        </button>
      </div>
    </div>
  );
}
