'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Scale, 
  FileCheck2, 
  Archive, 
  Award, 
  Layers
} from 'lucide-react';
import UserSessionSwitcher from './UserSessionSwitcher';
import { useAuth, UserRole } from '@/lib/authContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  tag: string;
  allowedRoles: (UserRole | null)[];
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, tag: 'M1', allowedRoles: ['TECHNICIAN', 'APPROVER', 'ADMIN', null] },
  { name: 'Standards & Traceability', href: '/standards', icon: Award, tag: 'M2', allowedRoles: ['TECHNICIAN', 'APPROVER', 'ADMIN', null] },
  { name: 'Instrument Passports', href: '/instruments', icon: Scale, tag: 'M3', allowedRoles: ['TECHNICIAN', 'ADMIN'] },
  { name: 'Live Evaluation', href: '/evaluations', icon: Layers, tag: 'M4', allowedRoles: ['TECHNICIAN', 'ADMIN'] },
  { name: 'Verification Console', href: '/verification', icon: FileCheck2, tag: 'M5', allowedRoles: ['APPROVER', 'ADMIN'] },
  { name: 'Archive & Lifecycle', href: '/archive', icon: Archive, tag: 'M6', allowedRoles: ['TECHNICIAN', 'APPROVER', 'ADMIN', null] },
];

export default function Navbar() {
  const pathname = usePathname();
  const { role, user } = useAuth();

  // Role-based filtering of navigation items
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!user) {
      return item.allowedRoles.includes(null);
    }
    const currentRole = role || 'TECHNICIAN';
    return item.allowedRoles.includes(currentRole);
  });

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-blue-900 text-white p-2 rounded-lg font-bold text-sm tracking-wider">
                OIML
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-none">
                  LEGAL METROLOGY LIMS
                </span>
                <span className="text-[10px] text-blue-700 font-semibold tracking-wide uppercase">
                  OIML R 76-1 / R 76-2 Type Approval
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-1 lg:space-x-2">
            {visibleNavItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <UserSessionSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
