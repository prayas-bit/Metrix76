'use client';

import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  X, 
  Save, 
  Calendar, 
  Hash, 
  Building,
  Scale
} from 'lucide-react';
import { listReferenceStandards, createReferenceStandard } from '@/lib/api';
import { ReferenceStandard } from '@/types/metrology';
import { formatDate } from '@/lib/utils';

export default function ReferenceStandardsPage() {
  const [standards, setStandards] = useState<ReferenceStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for new standard weight set
  const todayStr = new Date().toISOString().split('T')[0];
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const nextYearStr = nextYear.toISOString().split('T')[0];

  const [formState, setFormState] = useState({
    set_identifier: '',
    accuracy_class: 'E2',
    certificate_number: '',
    calibrated_by: 'National Physical Laboratory (NPL India)',
    calibration_date: todayStr,
    expiry_date: nextYearStr,
    expanded_uncertainty_k2: 0.00005,
    nominal_range: '1 mg to 20 kg',
    is_active: true,
  });

  const fetchStandards = () => {
    setLoading(true);
    listReferenceStandards()
      .then((data) => {
        setStandards(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load reference standards. Confirm the FastAPI backend is running.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStandards();
  }, []);

  const handleCreateStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.set_identifier || !formState.certificate_number || !formState.calibrated_by) {
      alert('Please fill in Set Identifier, Certificate Number, and Calibrated By.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createReferenceStandard(formState);
      setStandards([created, ...standards]);
      setShowModal(false);
      setToastMessage(`Standard Weight Set "${created.set_identifier}" registered with ISO 17025 traceability!`);
      setTimeout(() => setToastMessage(null), 5000);

      // Reset form
      setFormState({
        set_identifier: '',
        accuracy_class: 'E2',
        certificate_number: '',
        calibrated_by: 'National Physical Laboratory (NPL India)',
        calibration_date: todayStr,
        expiry_date: nextYearStr,
        expanded_uncertainty_k2: 0.00005,
        nominal_range: '1 mg to 20 kg',
        is_active: true,
      });
    } catch (err: any) {
      console.error(err);
      alert(`Registration failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-800" />
            <span>Reference Standards & Traceability Registry</span>
          </h1>
          <p className="text-sm text-slate-500">
            ISO/IEC 17025 calibration traceability certificates and automated expiry guardrails.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Weight Set</span>
        </button>
      </div>

      {toastMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Standards registry unavailable:</strong> {error}
        </div>
      )}

      {/* Standards Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Traceable Reference Weight Sets ({standards.length})
          </span>
          {loading && <span className="text-xs text-slate-400">Refreshing...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Set Identifier</th>
                <th className="p-3.5">Accuracy Class</th>
                <th className="p-3.5">Certificate No.</th>
                <th className="p-3.5">Calibrated By</th>
                <th className="p-3.5">Calibration Date</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5">Guardrail Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {standards.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No reference standard weight sets found. Click &quot;Register Weight Set&quot; to add one.
                  </td>
                </tr>
              ) : (
                standards.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-blue-900">{std.set_identifier}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800">
                        OIML {std.accuracy_class}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{std.certificate_number}</td>
                    <td className="p-3.5 text-slate-700">{std.calibrated_by}</td>
                    <td className="p-3.5 text-slate-500">{formatDate(std.calibration_date)}</td>
                    <td className="p-3.5 font-mono">
                      <span className={std.is_expired ? 'text-rose-600 font-bold' : std.days_to_expiry <= 30 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                        {formatDate(std.expiry_date)} ({std.days_to_expiry}d left)
                      </span>
                    </td>
                    <td className="p-3.5">
                      {std.is_expired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> EXPIRED (BLOCKED)
                        </span>
                      ) : std.days_to_expiry <= 30 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" /> EXPIRING SOON
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE & VALID
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Register Reference Standard Weight Set */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-800 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Register Reference Standard Weight Set
                  </h2>
                  <p className="text-xs text-slate-500">
                    ISO/IEC 17025 Traceable Calibration Certificate Metadata
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStandard} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Set Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.set_identifier}
                    onChange={(e) => setFormState({ ...formState, set_identifier: e.target.value })}
                    placeholder="e.g. NPL-E2-SET-05"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Accuracy Class *
                  </label>
                  <select
                    value={formState.accuracy_class}
                    onChange={(e) => setFormState({ ...formState, accuracy_class: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="E1">Class E1 (Primary National Standard)</option>
                    <option value="E2">Class E2 (High Precision Metrology)</option>
                    <option value="F1">Class F1 (Laboratory Working Standards)</option>
                    <option value="F2">Class F2 (Industrial Calibration Standards)</option>
                    <option value="M1">Class M1 (Commercial & Field Weights)</option>
                    <option value="M2">Class M2 (Heavy Capacity Weights)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Certificate Number *
                </label>
                <input
                  type="text"
                  required
                  value={formState.certificate_number}
                  onChange={(e) => setFormState({ ...formState, certificate_number: e.target.value })}
                  placeholder="e.g. NPL/MASS/2026/C-4890"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Calibrated By (Accredited Body) *
                </label>
                <input
                  type="text"
                  required
                  value={formState.calibrated_by}
                  onChange={(e) => setFormState({ ...formState, calibrated_by: e.target.value })}
                  placeholder="e.g. National Physical Laboratory (NPL India)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Calibration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.calibration_date}
                    onChange={(e) => setFormState({ ...formState, calibration_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.expiry_date}
                    onChange={(e) => setFormState({ ...formState, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nominal Range
                  </label>
                  <input
                    type="text"
                    value={formState.nominal_range}
                    onChange={(e) => setFormState({ ...formState, nominal_range: e.target.value })}
                    placeholder="e.g. 1 mg to 20 kg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Uncertainty (k=2) [g]
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formState.expanded_uncertainty_k2}
                    onChange={(e) => setFormState({ ...formState, expanded_uncertainty_k2: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00005"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Registering...' : 'Register Standard Set'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
