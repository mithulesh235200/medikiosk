import React, { useEffect } from 'react';
import { ShieldAlert, AlertTriangle, PhoneCall, Volume2, CheckCircle2 } from 'lucide-react';
import { Language } from '../../types';
import { translations } from '../../data/translations';
import { speakText } from '../../lib/audio';

interface RedFlagModalProps {
  reason: string;
  language: Language;
  onAcknowledge: () => void;
}

export const RedFlagModal: React.FC<RedFlagModalProps> = ({
  reason,
  language,
  onAcknowledge,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  useEffect(() => {
    const alertMessage = isHindi
      ? 'सावधान! आपके लक्षण गंभीर हो सकते हैं। कृपया तुरंत ओपीडी नर्स या डॉक्टर से संपर्क करें।'
      : 'Emergency alert! Your symptoms may require immediate medical attention. Please inform the triage staff now.';
    speakText(alertMessage, language);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-rose-500 animate-in fade-in zoom-in-95 duration-200">
        {/* Siren Badge */}
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="text-center mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-rose-600 text-white inline-block mb-2">
            Priority Red-Flag
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t.redFlagTitle}
          </h2>
          <p className="text-rose-700 font-bold text-sm sm:text-base mt-2">
            {t.redFlagSubtitle}
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-slate-800 text-xs sm:text-sm mb-6">
          <strong className="block text-rose-900 font-bold uppercase text-[11px] mb-1">
            Detected Warning Symptom:
          </strong>
          <p className="font-semibold text-rose-950 leading-relaxed">
            {reason || 'Acute cardiovascular or neurological distress'}
          </p>
        </div>

        {/* Clinical Action Notice */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm mb-6 flex items-start gap-3">
          <PhoneCall className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {t.redFlagAction}
          </p>
        </div>

        <button
          id="acknowledge-red-flag-btn"
          type="button"
          onClick={onAcknowledge}
          className="w-full py-4 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{t.redFlagStaffButton}</span>
        </button>
      </div>
    </div>
  );
};
