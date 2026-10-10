import React from 'react';
import { Stethoscope, ShieldAlert, Monitor, UserCheck, Globe, Building2, Ticket, LogOut, ArrowLeft } from 'lucide-react';
import { Language, DoctorUser } from '../types';

interface NavbarProps {
  currentView: 'kiosk' | 'doctor';
  onSelectView: (view: 'kiosk' | 'doctor') => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  onTriggerEmergency?: () => void;
  waitingCount?: number;
  criticalCount?: number;
  doctorUser?: DoctorUser | null;
  onOpenTokenLookup?: () => void;
  onLogoutDoctor?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  language,
  onSelectLanguage,
  onTriggerEmergency,
  waitingCount = 0,
  criticalCount = 0,
  doctorUser,
  onOpenTokenLookup,
  onLogoutDoctor,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Hospital & Brand Header - Clickable to return to Kiosk */}
          <button
            type="button"
            onClick={() => onSelectView('kiosk')}
            className="flex items-center space-x-3 sm:space-x-4 text-left group cursor-pointer focus:outline-hidden"
            title="Return to Patient Kiosk Home"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400 shadow-inner group-hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-teal-300 transition-colors">
                  MediKiosk
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/50">
                  OPD AI
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                Apollo & AIIMS Network • OPD Self-Service
              </p>
            </div>
          </button>

          {/* Center Navigation - Doctor Workstation Badge and Direct Exit Button */}
          {currentView === 'doctor' && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200">Doctor Portal</span>
                {doctorUser && (
                  <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-semibold border border-blue-700/50">
                    {doctorUser.roomNumber}
                  </span>
                )}
              </div>

              {/* Prominent Exit Button directly in Navbar */}
              <button
                id="navbar-exit-to-kiosk-btn"
                type="button"
                onClick={() => onSelectView('kiosk')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                title="Exit Doctor Portal and return to Patient Kiosk"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Exit to Patient Kiosk</span>
              </button>

              {/* Navbar Sign Out Button */}
              {doctorUser && onLogoutDoctor && (
                <button
                  id="navbar-doctor-sign-out-btn"
                  type="button"
                  onClick={onLogoutDoctor}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                  title="Sign out of doctor session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}

          {/* Right Controls: Language, Token Lookup & Emergency Assistance */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Quick Patient Token Lookup Button (Only on kiosk view) */}
            {currentView === 'kiosk' && onOpenTokenLookup && (
              <button
                id="navbar-token-lookup-btn"
                onClick={onOpenTokenLookup}
                title="Lookup active token queue status"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 transition-all"
              >
                <Ticket className="w-3.5 h-3.5 text-teal-400" />
                <span>My Token</span>
              </button>
            )}

            {/* Language Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1 hidden sm:inline" />
              <button
                id="lang-en-btn"
                onClick={() => onSelectLanguage('en')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  language === 'en'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                id="lang-hi-btn"
                onClick={() => onSelectLanguage('hi')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  language === 'hi'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                id="lang-ta-btn"
                onClick={() => onSelectLanguage('ta')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  language === 'ta'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Emergency Staff Call Button */}
            {currentView === 'kiosk' && onTriggerEmergency && (
              <button
                id="emergency-staff-alert-btn"
                onClick={onTriggerEmergency}
                title="Press if experiencing sudden chest pain, breathing difficulty, or extreme dizziness"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white transition-all shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:text-white" />
                <span className="hidden sm:inline">SOS Staff</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
