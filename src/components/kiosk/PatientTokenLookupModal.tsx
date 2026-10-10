import React, { useState } from 'react';
import { Search, Ticket, X, Clock, DoorOpen, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { PatientRecord, Language } from '../../types';

interface PatientTokenLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectPatient?: (record: PatientRecord) => void;
}

export const PatientTokenLookupModal: React.FC<PatientTokenLookupModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectPatient,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatientRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const list: PatientRecord[] = await res.json();
        const cleanQ = query.trim().toLowerCase();
        const found = list.find((p) => {
          const matchToken = p.tokenNumber?.toLowerCase() === cleanQ || p.tokenNumber?.toLowerCase().includes(cleanQ);
          const matchPhone = p.demographics?.phoneNumber?.includes(cleanQ);
          const matchName = p.demographics?.name?.toLowerCase().includes(cleanQ);
          const matchAbha = p.demographics?.abhaId?.toLowerCase().includes(cleanQ);
          return matchToken || matchPhone || matchName || matchAbha;
        });

        if (found) {
          setResult(found);
        } else {
          setErrorMsg('No active OPD token found for this query. Please check the token number or register at Step 1.');
        }
      } else {
        setErrorMsg('Unable to retrieve queue status from hospital server.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setErrorMsg('Network error connecting to hospital queue system.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Patient OPD Status & Token Lookup
              </h2>
              <p className="text-xs text-slate-500">
                Check live queue position & consultation room
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mt-5">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Enter OPD Token Number or 10-Digit Mobile Number:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="patient-lookup-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. OPD-A08 or 9876543210"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                autoFocus
              />
            </div>
            <button
              id="patient-lookup-search-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </div>
        </form>

        {/* Result Area */}
        <div className="mt-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {result && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg border border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    Live Token Status
                  </span>
                  <h3 className="text-2xl font-black tracking-tight">{result.tokenNumber}</h3>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      result.status === 'in_consultation'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse'
                        : result.status === 'seen'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-400/40'
                    }`}
                  >
                    {result.status === 'in_consultation'
                      ? 'Doctor Calling In'
                      : result.status === 'seen'
                      ? 'Consultation Done'
                      : 'Waiting in Queue'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient Name</span>
                  <span className="font-semibold text-sm">{result.demographics?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Room</span>
                  <span className="font-semibold text-sm text-teal-300">{result.roomNumber || 'Room 104'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Chief Complaint</span>
                  <span className="font-medium truncate block">{result.structuredSummary?.chiefComplaint || 'Consultation Intake'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Intake Time</span>
                  <span className="font-mono text-slate-300">
                    {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {result.doctorNotes && (
                <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
                  <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">Doctor Remarks</span>
                  <p className="text-slate-300 leading-relaxed text-xs">{result.doctorNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
