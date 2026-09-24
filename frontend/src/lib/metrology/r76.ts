import {
  AccuracyClass,
  InstrumentMeta,
  WeighingPointInput,
  WeighingEvaluationResult,
  WeighingBatchResponse,
  ComplianceVerdict
} from '@/types/metrology';

export function getMPE(load: number, spec: InstrumentMeta): number {
  const e = spec.verification_interval_e;
  if (e <= 0) return 0;
  const m = Math.abs(load) / e;

  switch (spec.accuracy_class) {
    case 'CLASS_I':
      if (m <= 50000) return 0.5 * e;
      if (m <= 200000) return 1.0 * e;
      return 1.5 * e;

    case 'CLASS_II':
      if (m <= 5000) return 0.5 * e;
      if (m <= 20000) return 1.0 * e;
      return 1.5 * e;

    case 'CLASS_III':
      if (m <= 500) return 0.5 * e;
      if (m <= 2000) return 1.0 * e;
      return 1.5 * e;

    case 'CLASS_IIII':
      if (m <= 50) return 0.5 * e;
      if (m <= 200) return 1.0 * e;
      return 1.5 * e;

    default:
      return 0.5 * e;
  }
}

export function evaluateWeighingClient(
  spec: InstrumentMeta,
  points: WeighingPointInput[]
): WeighingBatchResponse {
  if (!points || points.length === 0) {
    return { zero_error_e0: 0, results: [], overall_compliant: true };
  }

  const e = spec.verification_interval_e;
  const zeroPoint = points.find((p) => Math.abs(p.load_applied) < 1e-7) || points[0];
  const p0 = zeroPoint.indication_observed + 0.5 * e - zeroPoint.delta_load;
  const e0 = p0 - zeroPoint.load_applied;

  let overall_compliant = true;
  const results: WeighingEvaluationResult[] = [];

  for (const pt of points) {
    const p = pt.indication_observed + 0.5 * e - pt.delta_load;
    const err_e = p - pt.load_applied;
    const err_ec = err_e - e0;
    const mpe = getMPE(pt.load_applied, spec);

    const absEc = Math.abs(err_ec);
    const absMpe = Math.abs(mpe);

    let status: ComplianceVerdict = 'PASS';
    let is_pass = true;

    if (absEc <= absMpe * 0.9 + 1e-9) {
      status = 'PASS';
      is_pass = true;
    } else if (absEc <= absMpe + 1e-9) {
      status = 'WARN';
      is_pass = true;
    } else {
      status = 'FAIL';
      is_pass = false;
      overall_compliant = false;
    }

    results.push({
      load_applied: Number(pt.load_applied.toFixed(5)),
      indication_observed: Number(pt.indication_observed.toFixed(5)),
      delta_load: Number(pt.delta_load.toFixed(5)),
      calculated_p: Number(p.toFixed(5)),
      true_error_e: Number(err_e.toFixed(5)),
      corrected_error_ec: Number(err_ec.toFixed(5)),
      mpe_allowed: Number(mpe.toFixed(5)),
      status,
      is_compliant: is_pass,
      direction: pt.direction,
    });
  }

  return {
    zero_error_e0: Number(e0.toFixed(5)),
    results,
    overall_compliant,
  };
}
