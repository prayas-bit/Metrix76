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
  Layers,
  Search,
  ShieldCheck
} from 'lucide-react';
import UserSessionSwitcher from './UserSessionSwitcher';
import { useAuth, UserRole } from '@/lib/authContext';

interface NavItem {
  name: string;
  href: string;
  tag: string;
  allowedRoles: (UserRole | null)[];
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/', tag: 'M0', allowedRoles: ['TECHNICIAN', 'APPROVER', 'ADMIN', null] },
  { name: 'Standards & Vault', href: '/standards', tag: 'M1', allowedRoles: ['TECHNICIAN', 'APPROVER', 'ADMIN', null] },
  { name: 'Instruments', href: '/instruments', tag: 'M2', allowedRoles: ['TECHNICIAN', 'ADMIN', 'APPROVER', null] },
  { name: 'Evaluations', href: '/evaluations', tag: 'M3', allowedRoles: ['TECHNICIAN', 'ADMIN', 'APPROVER', null] },
  { name: 'Verification', href: '/verification', tag: 'M4', allowedRoles: ['APPROVER', 'ADMIN', 'TECHNICIAN', null] },
  { name: 'Audit & Seals', href: '/archive', tag: 'M5', allowedRoles: ['TECHNICIAN', 'APPROVER', 'ADMIN', null] },
];

export default function Navbar() {
  const pathname = usePathname();
  const { role, user } = useAuth();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!user) {
      return item.allowedRoles.includes(null);
    }
    const currentRole = role || 'TECHNICIAN';
    return item.allowedRoles.includes(currentRole);
  });

  return (
    <header className="border-b border-editorial-border bg-alabaster-50/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Brand Identity (Editorial Wordmark Inspired by Reference Image) */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-3">
              <div className="w-10 h-10 bg-ink-950 text-white flex items-center justify-center font-display font-black text-sm tracking-wider transition-transform group-hover:scale-95 shadow-editorial">
                M76
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tighter text-ink-950 uppercase leading-none group-hover:text-neutral-700 transition-colors">
                  METRIX 76
                </span>
                <span className="text-[9px] text-ink-500 font-mono tracking-[0.2em] uppercase mt-1">
                  OIML R 76 TYPE APPROVAL
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Editorial Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {visibleNavItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-xs uppercase tracking-[0.14em] font-semibold py-2 transition-all relative ${
                    isActive
                      ? 'text-ink-950 font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-ink-950'
                      : 'text-ink-500 hover:text-ink-950'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right: Quick Action & Session Switcher */}
          <div className="flex items-center gap-4">
            <Link
              href="/#public-verify"
              className="hidden sm:flex items-center gap-1.5 text-ink-500 hover:text-ink-950 text-xs uppercase tracking-wider font-semibold py-1.5 px-2 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify</span>
            </Link>

            <div className="h-5 w-[1px] bg-editorial-border hidden sm:block" />

            <UserSessionSwitcher />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="lg:hidden border-t border-editorial-border bg-alabaster-100 overflow-x-auto px-4 py-2 flex items-center space-x-4">
        {visibleNavItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap px-2 py-1 rounded transition-colors ${
                isActive ? 'bg-ink-950 text-white font-bold' : 'text-ink-600 hover:text-ink-950'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
