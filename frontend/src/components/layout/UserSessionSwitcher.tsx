'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, UserRole } from '@/lib/authContext';
import { 
  User, 
  ChevronDown, 
  Shield, 
  LogIn, 
  LogOut, 
  Wrench, 
  Award,
  Sparkles
} from 'lucide-react';

const ROLE_BADGES: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  TECHNICIAN: {
    label: 'Testing Metrologist',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Wrench,
  },
  APPROVER: {
    label: 'Approving Officer',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Award,
  },
  ADMIN: {
    label: 'Lab Director',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Shield,
  },
};

export default function UserSessionSwitcher() {
  const { user, role, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="text-[11px] text-slate-400">Loading session...</div>;
  }

  // If user is not authenticated, show direct Sign In button
  if (!user) {
    return (
      <Link
        href="/login"
        className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </Link>
    );
  }

  const roleMeta = role ? ROLE_BADGES[role] : ROLE_BADGES.TECHNICIAN;
  const RoleIcon = roleMeta.icon;
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Officer';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 py-1.5 px-3 rounded-full text-xs transition-all shadow-xs cursor-pointer group"
      >
        <div className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center font-black text-[10px] shadow-xs uppercase">
          {displayName.slice(0, 2)}
        </div>
        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[130px]">
              {displayName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block leading-tight">
            {role || 'TECHNICIAN'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200/80 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-3">
            <p className="text-xs font-bold text-slate-900 truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {user.email}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleMeta.color}`}>
                <RoleIcon className="w-3 h-3" />
                {roleMeta.label}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 p-1"
            >
              <User className="w-3 h-3" />
              <span>Switch Account</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                setIsOpen(false);
              }}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 p-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
