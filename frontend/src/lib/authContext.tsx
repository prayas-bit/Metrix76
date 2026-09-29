'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getRolesFromClaims, normalizePrimaryRole } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'TECHNICIAN' | 'APPROVER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, role: UserRole, fullName?: string) => Promise<{ error: Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractRoleFromUser(u: User | null): UserRole | null {
  if (!u) return null;
  const roles = getRolesFromClaims({
    role: u.role,
    app_metadata: u.app_metadata,
    user_metadata: u.user_metadata,
  });
  const normalized = normalizePrimaryRole(roles);
  return (normalized as UserRole) || 'TECHNICIAN';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial active session check
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      const userRole = extractRoleFromUser(currentUser);
      setRole(userRole);
      if (userRole && typeof document !== 'undefined') {
        document.cookie = `oiml_active_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
      }
      setLoading(false);
    });

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      const userRole = extractRoleFromUser(currentUser);
      setRole(userRole);
      if (userRole && typeof document !== 'undefined') {
        document.cookie = `oiml_active_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      const userRole = extractRoleFromUser(data.user);
      setRole(userRole);
      if (userRole && typeof document !== 'undefined') {
        document.cookie = `oiml_active_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
      }
    }
    return { error };
  };

  const signUp = async (email: string, pass: string, assignedRole: UserRole, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          role: assignedRole,
          roles: [assignedRole],
          full_name: fullName || email.split('@')[0],
        },
      },
    });

    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      setRole(assignedRole);
      if (typeof document !== 'undefined') {
        document.cookie = `oiml_active_role=${assignedRole}; path=/; max-age=86400; SameSite=Lax`;
      }
    }

    return { error, session: data?.session ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    if (typeof document !== 'undefined') {
      document.cookie = `oiml_active_role=; path=/; max-age=0; SameSite=Lax`;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
