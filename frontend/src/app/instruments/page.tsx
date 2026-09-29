'use client';

import React, { useEffect, useState } from 'react';
import { 
  Scale, 
  Plus, 
  CheckCircle2, 
  AlertOctagon, 
  Info, 
  ShieldCheck, 
  X, 
  Save, 
  Layers, 
  Sparkles,
  Building,
  Tag,
  Hash
} from 'lucide-react';
import { listInstruments, validateInstrumentSanity, createInstrument } from '@/lib/api';
import { Instrument, InstrumentMeta, SanityCheckResult, AccuracyClass } from '@/types/metrology';

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form state for creating a new instrument
  const [formState, setFormState] = useState({
    serial_number: '',
    model_name: '',
    manufacturer_name: '',
    accuracy_class: 'CLASS_III' as AccuracyClass,
    max_capacity: 15.0,
    min_capacity: 0.1,
    scale_interval_d: 0.002,
    verification_interval_e: 0.002,
    unit: 'kg',
    load_receptor_type: 'Platform (Single Load Cell)',
    indicator_make_model: '',
    year_of_manufacture: new Date().getFullYear(),
  });

  const [formSanity, setFormSanity] = useState<SanityCheckResult | null>(null);

  // Sandbox state
  const [sandboxSpec, setSandboxSpec] = useState<InstrumentMeta>({
    accuracy_class: 'CLASS_III',
    max_capacity: 15.0,
    min_capacity: 0.1,
    scale_interval_d: 0.002,
    verification_interval_e: 0.002,
    unit: 'kg',
  });
  const [sandboxSanity, setSandboxSanity] = useState<SanityCheckResult | null>(null);

  const fetchInstruments = () => {
    setLoadingList(true);
    listInstruments()
      .then((data) => {
        setInstruments(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load instrument list. Confirm the FastAPI backend is running.');
      })
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  // Sandbox sanity validator
  useEffect(() => {
    validateInstrumentSanity(sandboxSpec)
      .then(setSandboxSanity)
      .catch(() => setSandboxSanity(null));
  }, [sandboxSpec]);

  // Form sanity validator
  useEffect(() => {
    const meta: InstrumentMeta = {
      accuracy_class: formState.accuracy_class,
      max_capacity: formState.max_capacity,
      min_capacity: formState.min_capacity,
      scale_interval_d: formState.scale_interval_d,
      verification_interval_e: formState.verification_interval_e,
      unit: formState.unit,
    };
    validateInstrumentSanity(meta)
      .then(setFormSanity)
      .catch(() => setFormSanity(null));
  }, [formState.accuracy_class, formState.max_capacity, formState.min_capacity, formState.scale_interval_d, formState.verification_interval_e, formState.unit]);

  const handleCreateInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.serial_number || !formState.model_name || !formState.manufacturer_name) {
      alert('Please fill in Serial Number, Model Name, and Manufacturer.');
      return;
    }

    if (formSanity && !formSanity.is_valid) {
      alert('Cannot register instrument: OIML R 76 statutory sanity rules are violated.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createInstrument({
        ...formState,
        is_multi_interval: false,
      });
      setInstruments([created, ...instruments]);
      setShowModal(false);
      setSuccessToast(`Instrument Passport "${created.model_name} (${created.serial_number})" registered successfully!`);
      setTimeout(() => setSuccessToast(null), 5000);
      // Reset form
      setFormState({
        serial_number: '',
        model_name: '',
        manufacturer_name: '',
        accuracy_class: 'CLASS_III',
        max_capacity: 15.0,
        min_capacity: 0.1,
        scale_interval_d: 0.002,
        verification_interval_e: 0.002,
        unit: 'kg',
        load_receptor_type: 'Platform (Single Load Cell)',
        indicator_make_model: '',
        year_of_manufacture: new Date().getFullYear(),
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
            <Scale className="w-6 h-6 text-blue-800" />
            <span>Instrument Passports & Metadata Engine</span>
          </h1>
          <p className="text-sm text-slate-500">
            Structural parameter capture with automated OIML scale interval sanity verification.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Instrument Passport</span>
        </button>
      </div>

      {successToast && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Instrument data unavailable:</strong> {error}
        </div>
      )}

      {/* Sanity Engine Live Checker Sandbox */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Automated Structural Sanity Verification Engine (Sandbox)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Validates interval ratios (e ≥ d), total scale intervals (n = Max/e), and statutory limits.
            </p>
          </div>
          {sandboxSanity && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
              sandboxSanity.is_valid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {sandboxSanity.is_valid ? 'SANITY PASSED' : 'SANITY VIOLATION'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Accuracy Class</label>
            <select
              value={sandboxSpec.accuracy_class}
              onChange={(e) => setSandboxSpec({ ...sandboxSpec, accuracy_class: e.target.value as AccuracyClass })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono outline-none"
            >
              <option value="CLASS_I">Class I (Special)</option>
              <option value="CLASS_II">Class II (High)</option>
              <option value="CLASS_III">Class III (Medium)</option>
              <option value="CLASS_IIII">Class IIII (Ordinary)</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Max Capacity [{sandboxSpec.unit}]</label>
            <input
              type="number"
              step="any"
              value={sandboxSpec.max_capacity}
              onChange={(e) => setSandboxSpec({ ...sandboxSpec, max_capacity: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono outline-none"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Min Capacity [{sandboxSpec.unit}]</label>
            <input
              type="number"
              step="any"
              value={sandboxSpec.min_capacity}
              onChange={(e) => setSandboxSpec({ ...sandboxSpec, min_capacity: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono outline-none"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Interval e [{sandboxSpec.unit}]</label>
            <input
              type="number"
              step="any"
              value={sandboxSpec.verification_interval_e}
              onChange={(e) => setSandboxSpec({ ...sandboxSpec, verification_interval_e: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono outline-none"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Interval d [{sandboxSpec.unit}]</label>
            <input
              type="number"
              step="any"
              value={sandboxSpec.scale_interval_d}
              onChange={(e) => setSandboxSpec({ ...sandboxSpec, scale_interval_d: parseFloat(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 w-full text-white font-mono outline-none"
            />
          </div>
        </div>

        {sandboxSanity && !sandboxSanity.is_valid && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 rounded-lg p-3 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" /> Statutory Parameter Non-Compliance:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-rose-300">
              {sandboxSanity.issues.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Registered Instruments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Registered Physical Instruments ({instruments.length})
          </span>
          {loadingList && <span className="text-xs text-slate-400">Refreshing...</span>}
        </div>
        <div className="overflow-x-auto">
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
              {instruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No instruments registered yet. Click &quot;New Instrument Passport&quot; to create one.
                  </td>
                </tr>
              ) : (
                instruments.map((inst) => (
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
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {inst.calculated_n ? inst.calculated_n.toLocaleString() : (inst.max_capacity / inst.verification_interval_e).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: New Instrument Passport */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-800 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Register New Instrument Passport
                  </h2>
                  <p className="text-xs text-slate-500">
                    Capture structural metadata conforming to OIML R 76-1 Clause 3.1–3.4
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateInstrument} className="p-6 space-y-5">
              {/* Identification Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>1. Identity & Manufacturer Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.serial_number}
                      onChange={(e) => setFormState({ ...formState, serial_number: e.target.value })}
                      placeholder="e.g. SN-PB-2026-0042"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Model / Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.model_name}
                      onChange={(e) => setFormState({ ...formState, model_name: e.target.value })}
                      placeholder="e.g. PrecisionScale Pro-15"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Manufacturer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.manufacturer_name}
                      onChange={(e) => setFormState({ ...formState, manufacturer_name: e.target.value })}
                      placeholder="e.g. Mettler Toledo India"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Metrological Parameters Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>2. Metrological Specification & Scale Intervals</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Accuracy Class
                    </label>
                    <select
                      value={formState.accuracy_class}
                      onChange={(e) => setFormState({ ...formState, accuracy_class: e.target.value as AccuracyClass })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="CLASS_I">Class I (Special)</option>
                      <option value="CLASS_II">Class II (High)</option>
                      <option value="CLASS_III">Class III (Medium)</option>
                      <option value="CLASS_IIII">Class IIII (Ordinary)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Units of Mass
                    </label>
                    <select
                      value={formState.unit}
                      onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="g">Grams (g)</option>
                      <option value="mg">Milligrams (mg)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Capacity (Max)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formState.max_capacity}
                      onChange={(e) => setFormState({ ...formState, max_capacity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Min Capacity (Min)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formState.min_capacity}
                      onChange={(e) => setFormState({ ...formState, min_capacity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Verification Interval (e)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formState.verification_interval_e}
                      onChange={(e) => setFormState({ ...formState, verification_interval_e: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Actual Interval (d)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formState.scale_interval_d}
                      onChange={(e) => setFormState({ ...formState, scale_interval_d: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sanity Engine Status in Modal */}
              {formSanity && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  formSanity.is_valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {formSanity.is_valid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertOctagon className="w-4 h-4 text-rose-600" />}
                      <span>{formSanity.is_valid ? 'OIML R 76 Sanity Check Passed' : 'OIML Sanity Check Failed'}</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      n = {(formState.max_capacity / (formState.verification_interval_e || 1)).toLocaleString()} intervals
                    </span>
                  </div>
                  {!formSanity.is_valid && (
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 mt-1">
                      {formSanity.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (formSanity ? !formSanity.is_valid : false)}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Registering Passport...' : 'Save & Register Passport'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
