import React, { useState, useEffect } from 'react';
import { Lock, Building2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { IdentifyScreen } from './components/kiosk/IdentifyScreen';
import { ConverseScreen } from './components/kiosk/ConverseScreen';
import { ScanScreen } from './components/kiosk/ScanScreen';
import { SummaryScreen } from './components/kiosk/SummaryScreen';
import { DoneScreen } from './components/kiosk/DoneScreen';
import { RedFlagModal } from './components/kiosk/RedFlagModal';
import { PatientTokenLookupModal } from './components/kiosk/PatientTokenLookupModal';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { DoctorLogin } from './components/doctor/DoctorLogin';
import {
  PatientDemographics,
  ChatMessage,
  UploadedDocument,
  StructuredClinicalSummary,
  PatientRecord,
  Language,
  BodyRegion,
  VitalSigns,
  DoctorUser,
} from './types';
import { clearStaffToken } from './lib/staffSession';

export default function App() {
  // Hash-based separate page routing: #kiosk vs #doctor
  const [currentView, setCurrentView] = useState<'kiosk' | 'doctor'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('doctor')) {
        return 'doctor';
      }
    }
    return 'kiosk';
  });

  const [kioskStep, setKioskStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [language, setLanguage] = useState<Language>('en');

  // Synchronize URL hash with page state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('doctor')) {
        setCurrentView('doctor');
      } else {
        setCurrentView('kiosk');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToView = (view: 'kiosk' | 'doctor') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      if (view === 'doctor') {
        window.location.hash = '#doctor';
      } else {
        window.location.hash = '#kiosk';
        try {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  };

  // Authenticated doctor state
  const [authenticatedDoctor, setAuthenticatedDoctor] = useState<DoctorUser | null>(() => {
    try {
      const saved = localStorage.getItem('medikiosk_doctor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Patient live token lookup modal state
  const [isTokenLookupOpen, setIsTokenLookupOpen] = useState(false);

  // Kiosk patient intake session state
  const [demographics, setDemographics] = useState<Partial<PatientDemographics>>({
    id: `pt-${Date.now()}`,
    preferredLanguage: 'en',
    gender: 'male',
  });
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | undefined>(undefined);
  const [vitals, setVitals] = useState<VitalSigns>({});
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [summary, setSummary] = useState<StructuredClinicalSummary | null>(null);
  const [completedRecord, setCompletedRecord] = useState<PatientRecord | null>(null);

  // Red-flag emergency modal state
  const [isRedFlagModalOpen, setIsRedFlagModalOpen] = useState(false);
  const [redFlagReason, setRedFlagReason] = useState('');
  const [sessionIsRedFlag, setSessionIsRedFlag] = useState(false);

  // Doctor Auth actions
  const handleDoctorLogin = (doc: DoctorUser) => {
    setAuthenticatedDoctor(doc);
    try {
      localStorage.setItem('medikiosk_doctor', JSON.stringify(doc));
    } catch (err) {
      console.warn('Failed to save doctor session:', err);
    }
  };

  const handleDoctorLogout = () => {
    setAuthenticatedDoctor(null);
    clearStaffToken();
    try {
      localStorage.removeItem('medikiosk_doctor');
      localStorage.removeItem('medikiosk_doctor_user');
    } catch (err) {
      console.warn('Failed to clear doctor session:', err);
    }
  };

  const handleUpdateDoctor = (updated: DoctorUser) => {
    setAuthenticatedDoctor(updated);
    try {
      localStorage.setItem('medikiosk_doctor', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update doctor session:', err);
    }
  };

  // Trigger emergency alert
  const handleTriggerEmergency = (reason?: string) => {
    const defaultReason =
      language === 'hi'
        ? 'मरीज ने इमरजेंसी सहायता बटन दबाया (सीने में दर्द या सांस की समस्या)'
        : 'Emergency SOS staff assistance requested at kiosk';
    setRedFlagReason(reason || defaultReason);
    setSessionIsRedFlag(true);
    setIsRedFlagModalOpen(true);

    if (demographics.id) {
      fetch('/api/emergency-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: demographics.id,
          reason: reason || defaultReason,
        }),
      }).catch((err) => console.warn('Emergency alert sync:', err));
    }
  };

  // Step 1: Complete Identify
  const handleIdentifyComplete = (data: PatientDemographics) => {
    setDemographics(data);
    setLanguage(data.preferredLanguage);

    // If vitals show critical risk, warn immediately
    if (vitals.riskLevel === 'critical') {
      handleTriggerEmergency(`Critical vitals recorded at kiosk (NEWS2 Score: ${vitals.triageRiskScore})`);
    }

    setKioskStep(2);
  };

  // Step 2: Proceed to Scan
  const handleProceedToScan = () => {
    setKioskStep(3);
  };

  // Step 3: Proceed to Summary
  const handleProceedToSummary = () => {
    setKioskStep(4);
  };

  // Step 4: Confirm and Submit Intake to Doctor
  const handleConfirmAndSubmit = async (clinicalSummary: StructuredClinicalSummary) => {
    setSummary(clinicalSummary);

    const fullDemographics: PatientDemographics = {
      id: demographics.id || `pt-${Date.now()}`,
      name: demographics.name || 'Patient',
      age: demographics.age || 40,
      gender: demographics.gender || 'male',
      phoneNumber: demographics.phoneNumber || '9876543210',
      abhaId: demographics.abhaId,
      preferredLanguage: language,
      consentGiven: true,
      registeredAt: demographics.registeredAt || new Date().toISOString(),
    };

    const isRedFlag = sessionIsRedFlag || clinicalSummary.triageAssessment.isRedFlag || vitals.riskLevel === 'critical';

    const newRecord: PatientRecord = {
      id: fullDemographics.id,
      tokenNumber: `OPD-A${Math.floor(Math.random() * 80 + 10)}`,
      demographics: fullDemographics,
      primaryBodyRegion: bodyRegion,
      vitals,
      conversationTranscript: conversation,
      documents,
      structuredSummary: clinicalSummary,
      status: 'waiting',
      priority: isRedFlag ? 'emergency' : clinicalSummary.triageAssessment.level,
      isRedFlag,
      redFlagReason: isRedFlag
        ? redFlagReason || clinicalSummary.triageAssessment.redFlagReasons[0] || 'Urgent Triage Condition'
        : undefined,
      roomNumber: 'Room 104',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });

      if (res.ok) {
        const saved: PatientRecord = await res.json();
        setCompletedRecord(saved);
      } else {
        setCompletedRecord(newRecord);
      }
    } catch (err) {
      console.error('Submit failed, using local:', err);
      setCompletedRecord(newRecord);
    }

    setKioskStep(5);
  };

  // Step 5: Reset for Next Patient
  const handleStartNewPatient = () => {
    setDemographics({
      id: `pt-${Date.now()}`,
      preferredLanguage: language,
      gender: 'male',
    });
    setBodyRegion(undefined);
    setVitals({});
    setConversation([]);
    setDocuments([]);
    setSummary(null);
    setCompletedRecord(null);
    setSessionIsRedFlag(false);
    setRedFlagReason('');
    setKioskStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={navigateToView}
        language={language}
        onSelectLanguage={(lang) => {
          setLanguage(lang);
          setDemographics((prev) => ({ ...prev, preferredLanguage: lang }));
        }}
        onTriggerEmergency={() => handleTriggerEmergency()}
        doctorUser={authenticatedDoctor}
        onOpenTokenLookup={() => setIsTokenLookupOpen(true)}
        onLogoutDoctor={() => {
          handleDoctorLogout();
          navigateToView('kiosk');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'doctor' ? (
          /* Doctor View: Dedicated separate clinical workstation page */
          !authenticatedDoctor ? (
            <DoctorLogin
              onLoginSuccess={handleDoctorLogin}
              onBackToKiosk={() => navigateToView('kiosk')}
            />
          ) : (
            <DoctorDashboard
              doctorUser={authenticatedDoctor}
              onBackToKiosk={() => navigateToView('kiosk')}
              onLogout={() => {
                handleDoctorLogout();
                navigateToView('kiosk');
              }}
              onUpdateDoctor={handleUpdateDoctor}
            />
          )
        ) : (
          /* Patient Kiosk Flow */
          <>
            {/* Step 1: Identify */}
            {kioskStep === 1 && (
              <IdentifyScreen
                initialData={demographics}
                language={language}
                selectedRegion={bodyRegion}
                vitals={vitals}
                onLanguageChange={(lang) => {
                  setLanguage(lang);
                  setDemographics((prev) => ({ ...prev, preferredLanguage: lang }));
                }}
                onSelectRegion={setBodyRegion}
                onVitalsChange={setVitals}
                onComplete={handleIdentifyComplete}
                onOpenTokenLookup={() => setIsTokenLookupOpen(true)}
              />
            )}

            {/* Step 2: Converse */}
            {kioskStep === 2 && demographics.name && (
              <ConverseScreen
                demographics={demographics as PatientDemographics}
                language={language}
                bodyRegion={bodyRegion}
                vitals={vitals}
                initialTranscript={conversation}
                onTranscriptChange={setConversation}
                onRedFlagDetected={(reason) => {
                  handleTriggerEmergency(reason);
                }}
                onProceedToScan={handleProceedToScan}
              />
            )}

            {/* Step 3: Scan */}
            {kioskStep === 3 && (
              <ScanScreen
                patientId={demographics.id || 'pt-1'}
                language={language}
                documents={documents}
                onDocumentsChange={setDocuments}
                onProceedToSummary={handleProceedToSummary}
                onBackToConverse={() => setKioskStep(2)}
              />
            )}

            {/* Step 4: Summary */}
            {kioskStep === 4 && demographics.name && (
              <SummaryScreen
                demographics={demographics as PatientDemographics}
                conversation={conversation}
                documents={documents}
                language={language}
                bodyRegion={bodyRegion}
                vitals={vitals}
                onConfirmAndSubmit={handleConfirmAndSubmit}
                onBackToEdit={() => setKioskStep(2)}
              />
            )}

            {/* Step 5: Done */}
            {kioskStep === 5 && completedRecord && (
              <DoneScreen
                patientRecord={completedRecord}
                language={language}
                onStartNewPatient={handleStartNewPatient}
                onTrackTokenStatus={() => setIsTokenLookupOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Patient Kiosk Discreet Footer for Hospital Staff Access */}
      {currentView === 'kiosk' && (
        <footer className="py-4 px-6 border-t border-slate-200 bg-white/60 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2 text-slate-400">
            <Building2 className="w-3.5 h-3.5" />
            <span>Apollo & AIIMS Network • OPD Self-Service Intake Kiosk</span>
          </div>
          <div>
            <button
              id="discreet-staff-login-btn"
              type="button"
              onClick={() => navigateToView('doctor')}
              className="text-slate-400 hover:text-slate-700 hover:underline flex items-center gap-1.5 transition-colors text-[11px] font-medium"
              title="Hospital clinical personnel access only"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Hospital Staff & Doctor EMR Portal</span>
            </button>
          </div>
        </footer>
      )}

      {/* Patient Token Status Lookup Modal */}
      <PatientTokenLookupModal
        isOpen={isTokenLookupOpen}
        onClose={() => setIsTokenLookupOpen(false)}
        language={language}
      />

      {/* Red-Flag Priority Modal */}
      {isRedFlagModalOpen && (
        <RedFlagModal
          reason={redFlagReason}
          language={language}
          onAcknowledge={() => setIsRedFlagModalOpen(false)}
        />
      )}
    </div>
  );
}
