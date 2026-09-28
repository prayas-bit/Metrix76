'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Shield,
  Eye
} from 'lucide-react';
import { InstrumentAttachment } from '@/types/metrology';

export type AttachmentCategory = 'NAMEPLATE' | 'LEAD_SEAL' | 'LEVEL_BUBBLE' | 'OVERALL_FRONT';

interface PhotoDropzoneProps {
  attachments: InstrumentAttachment[];
  onChange: (attachments: InstrumentAttachment[]) => void;
  disabled?: boolean;
}

const CATEGORY_DEFINITIONS: {
  type: AttachmentCategory;
  label: string;
  badgeColor: string;
  description: string;
  required: boolean;
}[] = [
  {
    type: 'NAMEPLATE',
    label: 'Nameplate & Markings',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Displays Class, Max, Min, e, d, and serial number',
    required: true,
  },
  {
    type: 'LEAD_SEAL',
    label: 'Lead / Wire Tamper Seal',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Physical wire/lead seal protecting calibration pots',
    required: true,
  },
  {
    type: 'LEVEL_BUBBLE',
    label: 'Spirit Level / Bubble',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Confirms platter is centered in reference position',
    required: true,
  },
  {
    type: 'OVERALL_FRONT',
    label: 'Overall Front / Receptor',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Full load receptor and indicator configuration',
    required: false,
  },
];

export default function PhotoDropzone({
  attachments,
  onChange,
  disabled = false,
}: PhotoDropzoneProps) {
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('NAMEPLATE');
  const [dragActive, setDragActive] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const newAttachments: InstrumentAttachment[] = [];
    Array.from(files).forEach((file, index) => {
      // Create local object URL for preview
      const previewUrl = URL.createObjectURL(file);
      newAttachments.push({
        id: `temp-${Date.now()}-${index}`,
        attachment_type: selectedCategory,
        storage_path: previewUrl,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
      });
    });

    onChange([...attachments, ...newAttachments]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = (indexToRemove: number) => {
    if (disabled) return;
    onChange(attachments.filter((_, idx) => idx !== indexToRemove));
  };

  // Check which mandatory categories have been uploaded
  const uploadedCategories = new Set(attachments.map((a) => a.attachment_type));
  const missingRequired = CATEGORY_DEFINITIONS.filter(
    (c) => c.required && !uploadedCategories.has(c.type)
  );

  return (
    <div className="space-y-4">
      {/* Category Selection Bar */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
          1. Select Evidence Tag for Upload
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const isSelected = selectedCategory === cat.type;
            const isUploaded = uploadedCategories.has(cat.type);
            return (
              <button
                key={cat.type}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedCategory(cat.type)}
                className={`p-2.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900 block truncate">
                    {cat.label}
                  </span>
                  {isUploaded ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : cat.required ? (
                    <span className="text-[9px] font-bold text-rose-500 uppercase">Req</span>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{cat.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-blue-600 bg-blue-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-white'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-800">Click to upload</span> or drag and drop
            photographs
          </div>
          <p className="text-[11px] text-slate-500">
            Target Category:{' '}
            <span className="font-bold text-blue-800">
              {CATEGORY_DEFINITIONS.find((c) => c.type === selectedCategory)?.label}
            </span>{' '}
            (JPEG, PNG, WebP up to 15MB)
          </p>
        </div>
      </div>

      {/* Mandatory Category Check Banner */}
      {missingRequired.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">ISO/IEC 17025 Photographic Evidence Requirement:</span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Missing mandatory verification photos:{' '}
              {missingRequired.map((m) => m.label).join(', ')}. Please upload these before final
              sign-off.
            </p>
          </div>
        </div>
      )}

      {/* Gallery / Staged Photos Grid */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span>Uploaded Physical Evidence Vault ({attachments.length})</span>
            <span className="text-[11px] text-slate-400 font-normal lowercase">
              tamper-evident stage
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {attachments.map((att, idx) => {
              const catDef = CATEGORY_DEFINITIONS.find((c) => c.type === att.attachment_type);
              return (
                <div
                  key={att.id || idx}
                  className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  <div className="h-28 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.storage_path}
                      alt={att.file_name || 'Attachment'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalUrl(att.storage_path);
                        }}
                        className="p-1.5 bg-white/90 rounded-lg text-slate-800 hover:bg-white text-xs font-semibold shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(idx);
                          }}
                          className="p-1.5 bg-rose-600 rounded-lg text-white hover:bg-rose-700 text-xs font-semibold shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${
                        catDef?.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {catDef?.label || att.attachment_type}
                    </span>
                    <p className="text-[10px] font-mono text-slate-600 truncate">
                      {att.file_name || 'evidence_capture.jpg'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModalUrl}
              alt="Evidence Full View"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 text-xs font-bold hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
