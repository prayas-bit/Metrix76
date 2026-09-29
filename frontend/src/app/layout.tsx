import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { AuthProvider } from '@/lib/authContext';

export const metadata: Metadata = {
  title: 'NAWI OIML R 76 Type Approval Suite',
  description: 'Legal Metrology LIMS and Test Report Automation conforming to OIML R 76-1 / R 76-2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
            Statutory Legal Metrology LIMS • ISO/IEC 17025 Compliant • OIML R 76-1:2006
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
