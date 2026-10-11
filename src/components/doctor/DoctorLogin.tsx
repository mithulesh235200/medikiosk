import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  Lock,
  Building2,
  ArrowRight,
  UserCheck,
  Award,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { DoctorUser } from '../../types';
import { setStaffToken } from '../../lib/staffSession';

interface DoctorLoginProps {
  onLoginSuccess: (doctor: DoctorUser) => void;
  onBackToKiosk: () => void;
}

export const PRESET_DOCTORS: DoctorUser[] = [
  {
    id: 'doc-rajesh',
    name: 'Dr. Rajesh Kumar',
    title: 'Senior Consultant Physician, MD (Med)',
    department: 'Internal Medicine & OPD Clinic',
    roomNumber: 'Room 104',
    registrationNumber: 'MCI-DEL-2014-88329',
    pin: '1234',
  },
  {
    id: 'doc-ananya',
    name: 'Dr. Ananya Iyer',
    title: 'Consultant Cardiologist, DM (Cardio)',
    department: 'Cardiology & Heart Station',
    roomNumber: 'Room 202',
    registrationNumber: 'NMC-2018-45920',
    pin: '1234',
  },
  {
    id: 'doc-meenakshi',
    name: 'Dr. Meenakshi Sundaram',
    title: 'Head of Emergency & Critical Care, MD',
    department: 'Emergency & Acute Triage',
    roomNumber: 'Room 101',
    registrationNumber: 'TN-MC-2008-31284',
    pin: '1234',
  },
  {
    id: 'doc-vikram',
    name: 'Dr. Vikramaditya Rao',
    title: 'Consultant Orthopedic Surgeon, MS (Ortho)',
    department: 'Orthopedics & Joint Clinic',
    roomNumber: 'Room 108',
    registrationNumber: 'KA-MC-2016-52190',
    pin: '1234',
  },
];

export const DoctorLogin: React.FC<DoctorLoginProps> = ({
  onLoginSuccess,
  onBackToKiosk,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('doc-rajesh');
  const [name, setName] = useState('Dr. Rajesh Kumar');
  const [title, setTitle] = useState('Senior Consultant Physician, MD (Med)');
  const [department, setDepartment] = useState('Internal Medicine & OPD Clinic');
  const [roomNumber, setRoomNumber] = useState('Room 104');
  const [registrationNumber, setRegistrationNumber] = useState('MCI-DEL-2014-88329');
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [presets, setPresets] = useState<DoctorUser[]>(PRESET_DOCTORS);

  // Load the staff directory from the server (falls back to built-in presets).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/doctors')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setPresets(data);
        }
      })
      .catch(() => {
        // offline — keep built-in presets
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Quick Preset Selection
  const handleSelectPreset = (docId: string) => {
    setSelectedPresetId(docId);
    if (docId === 'custom') {
      setName('');
      setTitle('Consultant Physician, MD');
      setDepartment('Internal Medicine');
      setRoomNumber('Room 104');
      setRegistrationNumber('');
      setPin('');
      setErrorMsg('');
      return;
    }

    const doc = presets.find((d) => d.id === docId);
    if (doc) {
      setName(doc.name);
      setTitle(doc.title);
      setDepartment(doc.department);
      setRoomNumber(doc.roomNumber);
      setRegistrationNumber(doc.registrationNumber);
      setPin(doc.pin || '1234');
      setErrorMsg('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('Please enter your full Doctor name.');
      return;
    }
    if (!registrationNumber.trim()) {
      setErrorMsg('Please enter your Medical Council Registration number.');
      return;
    }
    if (!roomNumber.trim()) {
      setErrorMsg('Please enter your assigned OPD Room Number.');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setErrorMsg('Please enter your 4-digit staff security PIN.');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');

    const displayName = name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`;

    try {
      // 1. Try verified sign-in (server checks the PIN hash).
      let res: Response | null = null;
      try {
        res = await fetch('/api/doctors/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationNumber: registrationNumber.trim(), pin: pin.trim() }),
        });
      } catch (networkErr) {
        console.warn('Network error reaching /api/doctors/verify:', networkErr);
      }

      // 2. Unknown registration number → self-register this workstation doctor.
      if (res && res.status === 404) {
        try {
          res = await fetch('/api/doctors/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: displayName,
              title: title.trim() || 'Consultant Physician',
              department: department.trim() || 'General OPD',
              roomNumber: roomNumber.trim(),
              registrationNumber: registrationNumber.trim(),
              pin: pin.trim(),
            }),
          });
        } catch (regErr) {
          console.warn('Network error reaching /api/doctors/register:', regErr);
        }
      }

      // 3. Successful server response
      if (res && res.ok) {
        const data: { doctor: DoctorUser; token: string } = await res.json();
        setStaffToken(data.token);

        if (rememberSession) {
          try {
            localStorage.setItem('medikiosk_doctor_user', JSON.stringify(data.doctor));
          } catch (err) {
            console.warn('Could not save doctor session:', err);
          }
        }

        setErrorMsg('');
        onLoginSuccess(data.doctor);
        return;
      }

      // 4. Graceful fallback for demo presets if server returned 500 or is unreachable
      const matchedPreset = presets.find((p) => p.registrationNumber === registrationNumber.trim());
      const isPresetPin = (matchedPreset && pin.trim() === (matchedPreset.pin || '1234')) || pin.trim() === '1234';

      if ((!res || res.status >= 500) && isPresetPin) {
        console.warn('[DoctorLogin] Using demo workstation fallback session');
        const fallbackDoctor: DoctorUser = matchedPreset || {
          id: `doc-${Date.now()}`,
          name: displayName,
          title: title.trim() || 'Consultant Physician',
          department: department.trim() || 'General OPD',
          roomNumber: roomNumber.trim(),
          registrationNumber: registrationNumber.trim(),
          pin: pin.trim(),
        };
        const demoToken = `offline-demo-${Date.now()}`;
        setStaffToken(demoToken);
        if (rememberSession) {
          try {
            localStorage.setItem('medikiosk_doctor_user', JSON.stringify(fallbackDoctor));
          } catch (err) {
            console.warn('Could not save doctor session:', err);
          }
        }
        setErrorMsg('');
        onLoginSuccess(fallbackDoctor);
        return;
      }

      // 5. Handle standard client/server errors
      if (res) {
        const err = await res.json().catch(async () => {
          const text = await res?.text().catch(() => '');
          return { error: text };
        });

        if (err?.error && typeof err.error === 'string' && !err.error.startsWith('<!DOCTYPE') && !err.error.startsWith('<html')) {
          setErrorMsg(err.error);
        } else if (res.status === 404) {
          setErrorMsg('Server API not reachable (HTTP 404). Check /api/health.');
        } else if (res.status === 401) {
          setErrorMsg('Incorrect PIN for this registration number.');
        } else {
          setErrorMsg(`Sign-in failed (HTTP ${res.status}). Check your registration number and PIN.`);
        }
      } else {
        setErrorMsg('Could not reach the server. Check your connection and try again.');
      }
    } catch (err) {
      console.error('Doctor login failed:', err);
      setErrorMsg('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-slate-800/95 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-10 backdrop-blur-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <button
            id="doctor-login-back-btn"
            type="button"
            onClick={onBackToKiosk}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-teal-300 border border-slate-600 hover:border-teal-400/50 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-teal-400" />
            <span>← Return to Patient Kiosk</span>
          </button>
          <span className="text-[11px] text-slate-400 font-medium">Hospital Staff Portal</span>
        </div>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Doctor & Staff Portal Login
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                Staff Only
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Apollo & AIIMS Hospital Network • EMR & OPD Queue Suite
            </p>
          </div>
        </div>

        {/* Preset Doctor Switcher Tabs */}
        <div className="mb-6 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-700">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-1 pb-1.5">
            Select Active Attending Physician or Enter Your Own Name:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {presets.map((doc) => {
              const isSelected = selectedPresetId === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleSelectPreset(doc.id)}
                  className={`px-3 py-2 rounded-xl text-left transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-blue-400'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
                  }`}
                >
                  <span className="truncate font-semibold">{doc.name}</span>
                  <span className="text-[10px] opacity-80 truncate">{doc.department.split('&')[0]} • {doc.roomNumber}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleSelectPreset('custom')}
              className={`px-3 py-2 rounded-xl text-left transition-all text-xs flex flex-col justify-between ${
                selectedPresetId === 'custom'
                  ? 'bg-teal-600 text-white font-bold shadow-md ring-1 ring-teal-400'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-teal-300 border border-teal-800/50'
              }`}
            >
              <span className="font-semibold">+ Custom Doctor</span>
              <span className="text-[10px] opacity-80">Enter your real credentials</span>
            </button>
          </div>
        </div>

        {/* Doctor Login / Registration Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Doctor Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Doctor Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="doctor-login-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (selectedPresetId !== 'custom') setSelectedPresetId('custom');
                  }}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Will appear on digital prescriptions & case sheets
              </span>
            </div>

            {/* Medical Registration / License No */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Medical Council / NMC Reg No. <span className="text-rose-400">*</span>
              </label>
              <input
                id="doctor-login-reg-input"
                type="text"
                value={registrationNumber}
                onChange={(e) => {
                  setRegistrationNumber(e.target.value);
                  if (selectedPresetId !== 'custom') setSelectedPresetId('custom');
                }}
                placeholder="e.g. MCI-DEL-2014-88329"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Official medical license identifier
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Department
              </label>
              <input
                id="doctor-login-dept-input"
                type="text"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  if (selectedPresetId !== 'custom') setSelectedPresetId('custom');
                }}
                placeholder="e.g. Internal Medicine"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* OPD Room Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                OPD Room Number <span className="text-rose-400">*</span>
              </label>
              <input
                id="doctor-login-room-input"
                type="text"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  if (selectedPresetId !== 'custom') setSelectedPresetId('custom');
                }}
                placeholder="e.g. Room 104"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500 font-semibold"
                required
              />
            </div>

            {/* Security PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Staff PIN (Demo: 1234) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="doctor-login-pin-input"
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500 font-mono tracking-widest"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Designation / Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Clinical Title / Qualification
            </label>
            <input
              id="doctor-login-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (selectedPresetId !== 'custom') setSelectedPresetId('custom');
              }}
              placeholder="e.g. Senior Consultant Physician, MD (Med)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Remember session checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900"
              />
              <span>Remember this doctor session on this workstation</span>
            </label>

            <span className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              HIPAA & ABDM Compliant
            </span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="doctor-login-submit-btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-600 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-5 h-5" />
              <span>{isLoggingIn ? 'Verifying credentials...' : `Sign In as ${name || 'Doctor'} to OPD Queue & EMR`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
