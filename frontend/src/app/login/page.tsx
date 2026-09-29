'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Scale, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  ArrowRight,
  Shield
} from 'lucide-react';
import { useAuth, UserRole } from '@/lib/authContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user, role } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('TECHNICIAN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error, session } = await signUp(email, password, selectedRole, fullName);
        if (error) throw error;

        setMessage({
          type: 'success',
          text: session 
            ? 'Account created and authenticated successfully! Redirecting...'
            : 'Registration complete! You can now sign in with your credentials.',
        });

        if (session) {
          setTimeout(() => {
            if (selectedRole === 'APPROVER') router.push('/verification');
            else router.push('/evaluations');
          }, 600);
        } else {
          setMode('signin');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Signed in successfully! Redirecting to workspace...',
        });

        setTimeout(() => {
          router.push('/');
        }, 500);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Authentication failed. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill test credentials
  const fillCredentials = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('Password123!');
    setMode('signin');
    setMessage(null);
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-900 text-white rounded-2xl shadow-lg mb-3">
          <Scale className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Legal Metrology Portal
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          OIML R 76 Type Approval & LIMS Platform
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setMessage(null);
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mode === 'signin'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setMessage(null);
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mode === 'signup'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register / Sign Up</span>
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-5 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Auth Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@metrology.gov.in"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Designated Metrology Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TECHNICIAN">Testing Metrologist (TECHNICIAN - Data Entry & Tests)</option>
                <option value="APPROVER">Legal Metrology Officer (APPROVER - Review & PIN Sign-off)</option>
                <option value="ADMIN">Laboratory Director (ADMIN - Superuser)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Processing...' : mode === 'signin' ? 'Sign In to Workspace' : 'Create Metrology Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick fill buttons for pre-registered test accounts */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Fill Registered Accounts:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('technician@metrology.gov.in')}
              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50 text-[10px] font-semibold text-slate-700 text-center transition-colors cursor-pointer"
            >
              👷 Tester
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('approver@metrology.gov.in')}
              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-purple-50 text-[10px] font-semibold text-slate-700 text-center transition-colors cursor-pointer"
            >
              ⚖️ Approver
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@metrology.gov.in')}
              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 text-[10px] font-semibold text-slate-700 text-center transition-colors cursor-pointer"
            >
              👑 Director
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          ISO/IEC 17025 Compliant
        </span>
        <span>•</span>
        <span>Statutory Metrology Portal</span>
      </div>
    </div>
  );
}
