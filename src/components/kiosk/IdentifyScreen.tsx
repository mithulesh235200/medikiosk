import React, { useState } from 'react';
import {
  User,
  Phone,
  ShieldCheck,
  HeartPulse,
  Volume2,
  Check,
  ArrowRight,
  Activity,
  CreditCard,
  Ticket,
} from 'lucide-react';
import { PatientDemographics, Language, Gender, BodyRegion, VitalSigns } from '../../types';
import { translations } from '../../data/translations';
import { speakText, stopSpeaking } from '../../lib/audio';
import { BodyMapSelector } from './BodyMapSelector';
import { VitalsStation } from './VitalsStation';

interface IdentifyScreenProps {
  initialData: Partial<PatientDemographics>;
  language: Language;
  selectedRegion?: BodyRegion;
  vitals?: VitalSigns;
  onLanguageChange: (lang: Language) => void;
  onSelectRegion: (region: BodyRegion) => void;
  onVitalsChange: (vitals: VitalSigns) => void;
  onComplete: (data: PatientDemographics) => void;
  onOpenTokenLookup?: () => void;
}

export const IdentifyScreen: React.FC<IdentifyScreenProps> = ({
  initialData,
  language,
  selectedRegion,
  vitals,
  onLanguageChange,
  onSelectRegion,
  onVitalsChange,
  onComplete,
  onOpenTokenLookup,
}) => {
  const t = translations[language];

  const [name, setName] = useState(initialData.name || '');
  const [age, setAge] = useState<string>(initialData.age ? String(initialData.age) : '');
  const [gender, setGender] = useState<Gender>(initialData.gender || 'male');
  const [phone, setPhone] = useState(initialData.phoneNumber || '');
  const [abhaId, setAbhaId] = useState(initialData.abhaId || '');
  const [consentGiven, setConsentGiven] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [formError, setFormError] = useState('');
  const [showVitals, setShowVitals] = useState(false);

  const handleSpeakInstructions = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    const speechText =
      language === 'hi'
        ? 'नमस्ते। कृपया अपना नाम, उम्र, लिंग और मोबाइल नंबर दर्ज करें। नीचे दिए गए शरीर के मानचित्र पर अपनी परेशानी का स्थान चुनें और सहमति देकर आगे बढ़ें।'
        : language === 'ta'
        ? 'வணக்கம். தயவுசெய்து உங்கள் பெயர், வயது, பாலினம் மற்றும் கைப்பேசி எண்ணை உள்ளிடவும். உங்கள் உடல் உபாதையின் பகுதியைத் தேர்வுசெய்து தொடரவும்.'
        : 'Welcome to MediKiosk. Please enter your name, age, gender, and mobile number. Select where you feel discomfort on the body map and tap Continue to start your guided clinical intake.';

    setIsSpeaking(true);
    speakText(speechText, language, () => setIsSpeaking(false));
  };

  // Format ABHA ID with dashes (XX-XXXX-XXXX-XXXX)
  const handleAbhaChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 6 || i === 10) formatted += '-';
      formatted += raw[i];
    }
    setAbhaId(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(
        language === 'hi'
          ? 'कृपया अपना नाम दर्ज करें।'
          : language === 'ta'
          ? 'தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்.'
          : 'Please enter your full name.'
      );
      return;
    }
    if (!age || Number(age) <= 0 || Number(age) > 120) {
      setFormError(
        language === 'hi'
          ? 'कृपया वैध उम्र दर्ज करें।'
          : language === 'ta'
          ? 'தயவுசெய்து சரியான வயதை உள்ளிடவும் (1-120).'
          : 'Please enter a valid age (1-120).'
      );
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setFormError(
        language === 'hi'
          ? 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : language === 'ta'
          ? 'தயவுசெய்து 10 இலக்க கைப்பேசி எண்ணை உள்ளிடவும்.'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }
    if (!consentGiven) {
      setFormError(
        language === 'hi'
          ? 'कृपया आगे बढ़ने के लिए सहमति दें।'
          : language === 'ta'
          ? 'தொடர தயவுசெய்து ஒப்புதல் தேர்வுப்பெட்டியைத் தேர்ந்தெடுக்கவும்.'
          : 'Please check the consent box to proceed.'
      );
      return;
    }

    setFormError('');
    onComplete({
      id: initialData.id || `pt-${Date.now()}`,
      name: name.trim(),
      age: Number(age),
      gender,
      phoneNumber: phone.trim(),
      abhaId: abhaId.trim() || undefined,
      preferredLanguage: language,
      consentGiven: true,
      registeredAt: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        {/* Step Badge & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
              <HeartPulse className="w-3.5 h-3.5" />
              {t.step1}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.identifyTitle}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t.identifySubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTokenLookup && (
              <button
                id="kiosk-check-token-status-btn"
                type="button"
                onClick={onOpenTokenLookup}
                className="p-3 rounded-2xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100/80 text-teal-800 transition-all flex items-center gap-1.5 text-xs font-bold"
                title="Lookup existing token status"
              >
                <Ticket className="w-4 h-4 text-teal-600" />
                <span className="hidden sm:inline">
                  {language === 'ta' ? 'டோக்கன் நிலை' : language === 'hi' ? 'टोकन स्थिति' : 'Token Status'}
                </span>
              </button>
            )}

            <button
              id="listen-instructions-btn"
              type="button"
              onClick={handleSpeakInstructions}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
                isSpeaking
                  ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Listen to instructions"
            >
              <Volume2 className="w-4 h-4 text-teal-600" />
              <span>{isSpeaking ? t.stopAudio : t.listenAudio}</span>
            </button>
          </div>
        </div>

        {/* Language Selection Bar */}
        <div className="mt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            {t.languageLabel}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              id="select-lang-english"
              onClick={() => onLanguageChange('en')}
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all font-bold text-sm sm:text-base cursor-pointer ${
                language === 'en'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇬🇧</span>
                <span>English</span>
              </div>
              {language === 'en' && <Check className="w-5 h-5" />}
            </button>

            <button
              type="button"
              id="select-lang-hindi"
              onClick={() => onLanguageChange('hi')}
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all font-bold text-sm sm:text-base cursor-pointer ${
                language === 'hi'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇮🇳</span>
                <span>हिन्दी (Hindi)</span>
              </div>
              {language === 'hi' && <Check className="w-5 h-5" />}
            </button>

            <button
              type="button"
              id="select-lang-tamil"
              onClick={() => onLanguageChange('ta')}
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all font-bold text-sm sm:text-base cursor-pointer ${
                language === 'ta'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇮🇳</span>
                <span>தமிழ் (Tamil)</span>
              </div>
              {language === 'ta' && <Check className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Identification Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {formError}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              {t.fullNameLabel} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="patient-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-hidden font-medium text-slate-900 text-base"
                required
              />
            </div>
          </div>

          {/* Age & Gender Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                {t.ageLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                id="patient-age-input"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t.agePlaceholder}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-hidden font-medium text-slate-900 text-base"
                required
              />
              {/* Quick Age Chips */}
              <div className="flex gap-1.5 mt-2">
                {['25', '42', '58', '70'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAge(chip)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {chip}y
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                {t.genderLabel} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'other'] as Gender[]).map((g) => {
                  const isSelected = gender === g;
                  const label =
                    g === 'male' ? t.genderMale : g === 'female' ? t.genderFemale : t.genderOther;

                  return (
                    <button
                      key={g}
                      type="button"
                      id={`gender-select-${g}`}
                      onClick={() => setGender(g)}
                      className={`py-3.5 px-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Phone & ABHA Health ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                {t.phoneLabel} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                  +91
                </span>
                <input
                  id="patient-phone-input"
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.phonePlaceholder}
                  className="w-full pl-14 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-hidden font-medium text-slate-900 text-base"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                <span>{t.abhaLabel}</span>
                <span className="text-xs text-slate-400 font-normal">Optional</span>
              </label>
              <div className="relative">
                <CreditCard className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="patient-abha-input"
                  type="text"
                  maxLength={17}
                  value={abhaId}
                  onChange={(e) => handleAbhaChange(e.target.value)}
                  placeholder="91-XXXX-XXXX-XXXX"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-hidden font-mono font-medium text-slate-900 text-base"
                />
              </div>
            </div>
          </div>

          {/* INNOVATION 1: Interactive Visual Body Map */}
          <div className="pt-2">
            <BodyMapSelector
              selectedRegion={selectedRegion}
              onSelectRegion={onSelectRegion}
              language={language}
            />
          </div>

          {/* INNOVATION 2: Optional Vitals Check Station Toggle */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {language === 'hi' ? 'वाइटल्स और बीपी दर्ज करें (NEWS2 स्कोर)' : 'Record Vitals & BP (NEWS2 Risk Score)'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {language === 'hi' ? 'रक्तचाप, पल्स या ऑक्सीजन स्तर जोड़ें' : 'Add blood pressure, pulse, or SpO2'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="toggle-vitals-station-btn"
                onClick={() => setShowVitals(!showVitals)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-white text-xs font-bold text-slate-700 transition-colors"
              >
                {showVitals ? 'Hide ▲' : 'Open Vitals ▼'}
              </button>
            </div>

            {showVitals && (
              <div className="mt-3">
                <VitalsStation
                  vitals={vitals}
                  onChange={onVitalsChange}
                  language={language}
                />
              </div>
            )}
          </div>

          {/* Consent Agreement Box */}
          <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{t.consentTitle}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{t.consentBody}</p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                  />
                  <label
                    htmlFor="consent-checkbox"
                    className="text-xs font-bold text-teal-950 cursor-pointer select-none"
                  >
                    {t.consentAgreeCheckbox}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Action Button */}
          <div className="pt-2">
            <button
              id="continue-to-converse-btn"
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t.continueButton}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
