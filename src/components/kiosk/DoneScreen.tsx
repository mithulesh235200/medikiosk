import React, { useEffect } from 'react';
import {
  CheckCircle,
  Ticket,
  Clock,
  DoorOpen,
  User,
  ArrowRight,
  RotateCcw,
  Printer,
  Building2,
  Search,
} from 'lucide-react';
import { PatientRecord, Language } from '../../types';
import { translations } from '../../data/translations';
import { speakText } from '../../lib/audio';

interface DoneScreenProps {
  patientRecord: PatientRecord;
  language: Language;
  onStartNewPatient: () => void;
  onTrackTokenStatus?: () => void;
}

export const DoneScreen: React.FC<DoneScreenProps> = ({
  patientRecord,
  language,
  onStartNewPatient,
  onTrackTokenStatus,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  useEffect(() => {
    // Speak token confirmation
    const audioMsg = isHindi
      ? `पंजीकरण पूरा हो गया है। आपका टोकन नंबर है ${patientRecord.tokenNumber}। कृपया कमरा 104 के बाहर प्रतीक्षा करें।`
      : `Intake complete. Your OPD Token number is ${patientRecord.tokenNumber}. Please proceed to Room 104 waiting area.`;
    speakText(audioMsg, language);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Success Card */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200 text-center">
        {/* Animated Checkmark */}
        <div className="w-20 h-20 rounded-3xl bg-teal-50 text-teal-600 border-2 border-teal-200 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle className="w-12 h-12" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
          {t.doneTitle}
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-8">
          {t.doneSubtitle}
        </p>

        {/* Big OPD Token Ticket */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-xl border border-slate-700 relative overflow-hidden mb-8">
          {/* Subtle Decorative Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Apollo-AIIMS OPD Desk
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-500 text-slate-950 uppercase">
              {patientRecord.isRedFlag ? 'EMERGENCY TRIAGE' : 'ROUTINE OPD'}
            </span>
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-teal-400 block mb-1">
            {t.tokenNumberLabel}
          </span>
          <div
            id="confirmed-token-badge"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-6 font-mono"
          >
            {patientRecord.tokenNumber}
          </div>

          <div className="grid grid-cols-2 gap-4 text-left pt-4 border-t border-slate-700/80">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-teal-400" />
                {t.assignedRoomLabel}
              </span>
              <span className="text-sm sm:text-base font-bold text-white">
                {patientRecord.roomNumber || 'Room 104'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                {t.estimatedWaitLabel}
              </span>
              <span className="text-sm sm:text-base font-bold text-teal-300">
                {patientRecord.isRedFlag ? 'Immediate Call-In' : '10 - 15 Mins'}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps Guide */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left max-w-md mx-auto mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            {t.nextStepsHeading}
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>{t.step1Text}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>{t.step2Text}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>{t.step3Text}</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="print-patient-token-btn"
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>
              {language === 'ta' ? 'டோக்கன் அச்சிடுக' : language === 'hi' ? 'टोकन पर्ची प्रिंट करें' : 'Print Token Slip'}
            </span>
          </button>

          {onTrackTokenStatus && (
            <button
              id="track-live-token-btn"
              type="button"
              onClick={onTrackTokenStatus}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-teal-600" />
              <span>
                {language === 'ta' ? 'வரிசை நிலையை சரிபார்க்கவும்' : language === 'hi' ? 'लाइव कतार स्थिति देखें' : 'Track Queue Position'}
              </span>
            </button>
          )}

          <button
            id="start-next-patient-btn"
            type="button"
            onClick={onStartNewPatient}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.startNewPatientBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
