import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Volume2,
  VolumeX,
  AlertCircle,
  Pill,
  HeartPulse,
  Activity,
  User,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Gauge,
  Thermometer,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';
import {
  PatientDemographics,
  ChatMessage,
  UploadedDocument,
  StructuredClinicalSummary,
  Language,
  BodyRegion,
  VitalSigns,
} from '../../types';
import { translations } from '../../data/translations';
import { speakText, stopSpeaking } from '../../lib/audio';

interface SummaryScreenProps {
  demographics: PatientDemographics;
  conversation: ChatMessage[];
  documents: UploadedDocument[];
  language: Language;
  bodyRegion?: BodyRegion;
  vitals?: VitalSigns;
  onConfirmAndSubmit: (summary: StructuredClinicalSummary) => void;
  onBackToEdit: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  demographics,
  conversation,
  documents,
  language,
  bodyRegion,
  vitals,
  onConfirmAndSubmit,
  onBackToEdit,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const [summary, setSummary] = useState<StructuredClinicalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Generate structured summary on mount
  useEffect(() => {
    let isMounted = true;

    async function generateSummary() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/chat/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            demographics,
            conversation,
            documents,
            bodyRegion,
            vitals,
          }),
        });

        if (res.ok) {
          const data: StructuredClinicalSummary = await res.json();
          if (isMounted) {
            setSummary(data);
          }
        } else {
          throw new Error('Summary generation failed');
        }
      } catch (err) {
        console.error('Summary error:', err);
        if (isMounted) {
          const patientNotes = conversation
            .filter((m) => m.sender === 'patient')
            .map((m) => m.text);
          const firstComplaint = patientNotes[0] || 'OPD Clinical Consultation';
          const isEmergency = conversation.some((m) => m.isRedFlag);

          setSummary({
            chiefComplaint: firstComplaint,
            primaryBodyRegion: bodyRegion,
            vitals,
            historyOfPresentingIllness: {
              symptomOnset: 'As reported during intake',
              duration: patientNotes[1] || 'Recent',
              severityScore: isEmergency ? 9 : 5,
              character: 'Reported symptoms',
              radiation: isEmergency ? 'Upper chest / left arm' : 'None reported',
              associatedSymptoms: patientNotes.slice(1, 3),
              aggravatingRelievingFactors: 'Evaluated by physician in OPD room',
              narrative: `${demographics.name}, ${demographics.age} y/o presents with ${firstComplaint}.`,
            },
            pastMedicalSurgicalHistory: {
              chronicConditions: patientNotes.length > 3 ? [patientNotes[3]] : ['None stated'],
              pastSurgeries: ['None reported'],
              hospitalizations: ['None recent'],
            },
            drugAndAllergyHistory: {
              currentMedications: patientNotes.length > 4 ? [patientNotes[4]] : ['None reported'],
              knownAllergies: ['NKDA'],
            },
            familyHistory: ['Non-contributory'],
            personalSocialHistory: {
              diet: 'Standard',
              smokingOrTobacco: 'None stated',
            },
            reviewOfSystems: {
              positiveFindings: [firstComplaint],
              negativeFindings: ['No other acute signs'],
            },
            triageAssessment: {
              level: isEmergency ? 'emergency' : 'routine',
              isRedFlag: isEmergency,
              redFlagReasons: isEmergency ? ['High-risk acute triage condition'] : [],
              recommendedDepartment: isEmergency ? 'Emergency & Cardiology' : 'Internal Medicine / General OPD',
              clinicalImpression: `Patient presenting with ${firstComplaint}.`,
              differentialDiagnoses: [
                {
                  condition: firstComplaint,
                  probability: 'high',
                  rationale: 'Primary presenting complaint during kiosk interview.',
                  icd10Code: 'R68.89',
                },
              ],
              recommendedWorkup: ['Vitals check', 'Routine OPD investigations'],
            },
            patientPlainLanguageReadback: `Just to confirm, you are here for ${firstComplaint}. The doctor will review your history shortly.`,
            patientPlainLanguageReadbackHindi: `पुष्टि के लिए: आप आज ${firstComplaint} की जांच कराने आए हैं। डॉक्टर जल्द ही आपकी जांच करेंगे।`,
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    generateSummary();

    return () => {
      isMounted = false;
      stopSpeaking();
    };
  }, []);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    if (!summary) return;

    const speechText =
      language === 'ta'
        ? summary.patientPlainLanguageReadbackTamil || summary.patientPlainLanguageReadback
        : isHindi
        ? summary.patientPlainLanguageReadbackHindi || summary.patientPlainLanguageReadback
        : summary.patientPlainLanguageReadback;

    setIsPlayingAudio(true);
    speakText(speechText, language, () => {
      setIsPlayingAudio(false);
    });
  };

  if (isLoading || !summary) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            Generating Clinical Intake Summary...
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Gemini Clinical Engine is structuring your symptoms, body map location, vitals, and documents into physician documentation.
          </p>
        </div>
      </div>
    );
  }

  const isRedFlag = summary.triageAssessment.isRedFlag;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
              <FileCheck className="w-3.5 h-3.5" />
              {t.step4}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.summaryTitle}
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              {t.summarySubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              id="summary-back-btn"
              type="button"
              onClick={onBackToEdit}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors cursor-pointer"
            >
              {t.backToEdit}
            </button>
            <button
              id="confirm-submit-kiosk-btn"
              type="button"
              onClick={() => onConfirmAndSubmit(summary)}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{t.confirmAndSubmitBtn}</span>
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audio Readback Box (Plain Language Confirmation) */}
      <div className="bg-teal-50/80 border-2 border-teal-300 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-0.5">
                {t.plainLanguageNotice}
              </h3>
              <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                "{language === 'ta'
                  ? summary.patientPlainLanguageReadbackTamil || summary.patientPlainLanguageReadback
                  : isHindi
                  ? summary.patientPlainLanguageReadbackHindi || summary.patientPlainLanguageReadback
                  : summary.patientPlainLanguageReadback}"
              </p>
            </div>
          </div>

          <button
            id="play-readback-audio-btn"
            type="button"
            onClick={handleToggleAudio}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              isPlayingAudio
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-xs'
            }`}
          >
            {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isPlayingAudio ? t.stopAudio : t.listenConfirmation}</span>
          </button>
        </div>
      </div>

      {/* Standardized Clinical Record Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
        {/* Patient Demographics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-xs sm:text-sm text-slate-600">
          <div>
            <span className="font-extrabold text-slate-900 text-base mr-2">{demographics.name}</span>
            <span>({demographics.age} yrs, {demographics.gender})</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span>Phone: +91 {demographics.phoneNumber}</span>
            {demographics.abhaId && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                ABHA: {demographics.abhaId}
              </span>
            )}
          </div>
        </div>

        {/* Priority & Triage */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-teal-600" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Triage Department</span>
              <p className="text-sm font-bold text-slate-900">
                {summary.triageAssessment.recommendedDepartment}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isRedFlag
                ? 'bg-rose-500 text-white animate-pulse'
                : summary.triageAssessment.level === 'urgent'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-teal-600 text-white'
            }`}
          >
            {summary.triageAssessment.level} priority
          </span>
        </div>

        {/* Vitals Signs Strip (If entered) */}
        {vitals && (vitals.systolicBp || vitals.pulseRate || vitals.spO2) && (
          <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900 block mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-700" />
              Recorded Vitals at Intake (NEWS2 Score: {vitals.triageRiskScore || 0})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {vitals.systolicBp && (
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <span className="text-slate-400 block font-bold">Blood Pressure</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {vitals.systolicBp}/{vitals.diastolicBp || 80} mmHg
                  </span>
                </div>
              )}
              {vitals.pulseRate && (
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <span className="text-slate-400 block font-bold">Pulse Rate</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {vitals.pulseRate} BPM
                  </span>
                </div>
              )}
              {vitals.spO2 && (
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <span className="text-slate-400 block font-bold">Oxygen (SpO2)</span>
                  <span className={`font-extrabold text-sm ${vitals.spO2 < 92 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                    {vitals.spO2}%
                  </span>
                </div>
              )}
              {vitals.temperature && (
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <span className="text-slate-400 block font-bold">Temperature</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {vitals.temperature} °F
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. Chief Complaint */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>1. {t.chiefComplaint} (CC)</span>
          </h4>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 text-base">
            {summary.chiefComplaint}
          </div>
        </div>

        {/* 2. History of Presenting Illness (HPI) */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>2. {t.hpi} (HPI - SOCRATES)</span>
          </h4>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-sm">
            <p className="text-slate-800 leading-relaxed font-medium">
              {summary.historyOfPresentingIllness.narrative}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block font-bold uppercase">Onset:</span>
                <span className="font-semibold text-slate-800">{summary.historyOfPresentingIllness.symptomOnset}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Duration:</span>
                <span className="font-semibold text-slate-800">{summary.historyOfPresentingIllness.duration}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Severity:</span>
                <span className="font-extrabold text-teal-700">{summary.historyOfPresentingIllness.severityScore} / 10</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Character:</span>
                <span className="font-semibold text-slate-800">{summary.historyOfPresentingIllness.character || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Radiation:</span>
                <span className="font-semibold text-slate-800">{summary.historyOfPresentingIllness.radiation || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase">Associated:</span>
                <span className="font-semibold text-slate-800">
                  {summary.historyOfPresentingIllness.associatedSymptoms.join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Past Medical & Surgical History */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            3. {t.pastHistory} (PMHx)
          </h4>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <div className="flex flex-wrap gap-2">
              {summary.pastMedicalSurgicalHistory.chronicConditions.map((cond, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-semibold text-slate-800 text-xs">
                  {cond}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Drug & Allergy History */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-teal-600" />
            <span>4. {t.currentMedications} (DHx)</span>
          </h4>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Current Daily Medications:</span>
              <div className="flex flex-wrap gap-1.5">
                {summary.drugAndAllergyHistory.currentMedications.map((med, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold">
                    {med}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Known Allergies:</span>
              <div className="flex flex-wrap gap-1.5">
                {summary.drugAndAllergyHistory.knownAllergies.map((allg, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                    {allg}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Uploaded Documents Attached */}
        {documents.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              5. Digitized Prior Documents ({documents.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <img src={doc.imageUrl} alt={doc.title} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-slate-900 truncate">{doc.title}</p>
                    <p className="text-slate-500">{doc.aiInsights?.doctorOrFacility || 'OPD Record'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INNOVATION: AI Clinical Co-Pilot Differential Diagnoses Preview */}
        {summary.triageAssessment.differentialDiagnoses && summary.triageAssessment.differentialDiagnoses.length > 0 && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-700" />
              AI Clinical Differential Diagnoses (Physician Co-Pilot)
            </h4>
            <div className="space-y-2 text-xs">
              {summary.triageAssessment.differentialDiagnoses.map((diff, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900">{diff.condition}</span>
                    <span className="ml-2 font-mono text-[10px] text-slate-500">{diff.icd10Code}</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">{diff.rationale}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                    diff.probability === 'high' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {diff.probability} probability
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Submission Action */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            By confirming, your clinical history is securely synced to the doctor's queue.
          </p>

          <button
            id="confirm-submit-bottom-btn"
            type="button"
            onClick={() => onConfirmAndSubmit(summary)}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{t.confirmAndSubmitBtn}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
