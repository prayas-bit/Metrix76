'use client';

import React from 'react';
import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="p-3 bg-blue-50 text-blue-900 rounded-2xl">
        <Scale className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-slate-900">404 - Page Not Found</h2>
      <p className="text-xs text-slate-500 max-w-sm">
        The requested legal metrology worksheet or resource could not be found.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-950 transition-colors shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Workspace Hub</span>
      </Link>
    </div>
  );
}
