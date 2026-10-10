import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  ShieldAlert,
  Clock,
  User,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  Eye,
  Edit3,
  Printer,
  Sparkles,
  AlertTriangle,
  Pill,
  HeartPulse,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Building,
  Check,
  Phone,
  Download,
  Copy,
  Share2,
  LogOut,
  UserCog,
  X,
  ArrowLeft,
  Monitor,
  Trash2,
} from 'lucide-react';
import { PatientRecord, PatientStatus, TriageLevel, DoctorUser } from '../../types';
import { staffHeaders } from '../../lib/staffSession';

interface DoctorDashboardProps {
  doctorUser: DoctorUser;
  onBackToKiosk: () => void;
  onLogout: () => void;
  onUpdateDoctor: (updated: DoctorUser) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctorUser,
  onBackToKiosk,
  onLogout,
  onUpdateDoctor,
}) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'red_flag' | 'waiting' | 'in_consultation' | 'seen'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Doctor note editing state
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorPrescription, setDoctorPrescription] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);
  const [interactionAlerts, setInteractionAlerts] = useState<Array<{ severity: string; drugPair: string[]; title: string; clinicalAdvice: string }>>([]);
  const [hasInteractionAlerts, setHasInteractionAlerts] = useState(false);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [documentZoomUrl, setDocumentZoomUrl] = useState<string | null>(null);
  const [copiedEMR, setCopiedEMR] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Edit doctor profile local form state
  const [editDocName, setEditDocName] = useState(doctorUser.name);
  const [editDocTitle, setEditDocTitle] = useState(doctorUser.title);
  const [editDocDept, setEditDocDept] = useState(doctorUser.department);
  const [editDocRoom, setEditDocRoom] = useState(doctorUser.roomNumber);
  const [editDocReg, setEditDocReg] = useState(doctorUser.registrationNumber);

  useEffect(() => {
    setEditDocName(doctorUser.name);
    setEditDocTitle(doctorUser.title);
    setEditDocDept(doctorUser.department);
    setEditDocRoom(doctorUser.roomNumber);
    setEditDocReg(doctorUser.registrationNumber);
  }, [doctorUser]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DoctorUser = {
      ...doctorUser,
      name: editDocName.trim(),
      title: editDocTitle.trim(),
      department: editDocDept.trim(),
      roomNumber: editDocRoom.trim(),
      registrationNumber: editDocReg.trim(),
    };
    onUpdateDoctor(updated);
    setShowEditProfileModal(false);
  };

  // Fetch live queue from backend
  const fetchPatients = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data: PatientRecord[] = await res.json();
        setPatients(data);
        if (!selectedPatientId && data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patient queue:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(() => fetchPatients(false), 8000); // Polling queue
    return () => clearInterval(interval);
  }, []);

  // Clear the entire OPD queue (staff only, confirmed)
  const handleClearQueue = async () => {
    if (patients.length === 0) return;
    const confirmed = window.confirm(
      `Clear the entire OPD queue (${patients.length} patient${patients.length === 1 ? '' : 's'})? This cannot be undone.`
    );
    if (!confirmed) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'DELETE',
        headers: staffHeaders(),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        setPatients([]);
        setSelectedPatientId(null);
      }
    } catch (err) {
      console.error('Clear queue failed:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Update selected patient's notes in local state when changed
  useEffect(() => {
    const selected = patients.find((p) => p.id === selectedPatientId);
    if (selected) {
      setDoctorNotes(selected.doctorNotes || '');
      setDoctorPrescription(selected.doctorPrescription || '');
      setNotesSaveSuccess(false);
      setInteractionAlerts([]);
      setHasInteractionAlerts(false);
    }
  }, [selectedPatientId, patients]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Update patient status
  const handleUpdateStatus = async (status: PatientStatus) => {
    if (!selectedPatientId) return;
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/status`, {
        method: 'PATCH',
        headers: staffHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        setPatients((prev) =>
          prev.map((p) => (p.id === selectedPatientId ? { ...p, status } : p))
        );
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Save doctor annotations
  const handleSaveNotes = async () => {
    if (!selectedPatientId) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/annotate`, {
        method: 'PATCH',
        headers: staffHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          doctorNotes,
          doctorPrescription,
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        setPatients((prev) =>
          prev.map((p) =>
            p.id === selectedPatientId
              ? { ...p, doctorNotes, doctorPrescription }
              : p
          )
        );
        setNotesSaveSuccess(true);
        setTimeout(() => setNotesSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Save notes failed:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Drug interaction + allergy safety check (uses /api/check-interactions)
  const handleCheckInteractions = async () => {
    if (!selectedPatient) return;
    setIsCheckingInteractions(true);
    try {
      const res = await fetch('/api/check-interactions', {
        method: 'POST',
        headers: staffHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentMedications: selectedPatient.structuredSummary?.drugAndAllergyHistory?.currentMedications || [],
          proposedPrescription: doctorPrescription,
          knownAllergies: selectedPatient.structuredSummary?.drugAndAllergyHistory?.knownAllergies || [],
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setHasInteractionAlerts(Boolean(data.hasAlerts));
        setInteractionAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Interaction check failed:', err);
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  // Generate standard clinical EMR consultation note
  const generateEMRNote = (p: PatientRecord) => {
    const sum = p.structuredSummary;
    const vit = p.vitals;
    return `=====================================================
MEDIKIOSK OPD CLINICAL INTAKE SHEET - APOLLO & AIIMS NETWORK
=====================================================
TOKEN: ${p.tokenNumber} | DATE: ${new Date(p.createdAt).toLocaleDateString()} ${new Date(p.createdAt).toLocaleTimeString()}
PATIENT: ${p.demographics?.name} | AGE: ${p.demographics?.age} | GENDER: ${p.demographics?.gender}
PHONE: +91 ${p.demographics?.phoneNumber}${p.demographics?.abhaId ? ` | ABHA: ${p.demographics?.abhaId}` : ''}
TRIAGE: ${p.isRedFlag ? 'EMERGENCY / RED FLAG' : p.priority.toUpperCase()} | RECOMMENDED DEPT: ${sum?.triageAssessment?.recommendedDepartment || 'General OPD'}
${vit ? `\nVITALS:
  BP: ${vit.systolicBp || '-'}/${vit.diastolicBp || '-'} mmHg | Pulse: ${vit.pulseRate || '-'} bpm | SpO2: ${vit.spO2 || '-'}% | Temp: ${vit.temperature || '-'}°F | NEWS2 Risk Score: ${vit.triageRiskScore || 0} (${vit.riskLevel || 'Normal'})` : ''}

CHIEF COMPLAINT:
  ${sum?.chiefComplaint || 'Consultation Intake'}

HISTORY OF PRESENTING ILLNESS (SOCRATES):
  Onset / Duration: ${sum?.historyOfPresentingIllness?.duration || '-'}
  Severity Score: ${sum?.historyOfPresentingIllness?.severityScore || '-'}/10
  Associated Symptoms: ${sum?.historyOfPresentingIllness?.associatedSymptoms?.join(', ') || 'None'}
  Clinical Narrative: ${sum?.historyOfPresentingIllness?.narrative || '-'}

PAST MEDICAL & SURGICAL HISTORY:
  Chronic Conditions: ${sum?.pastMedicalSurgicalHistory?.chronicConditions?.join(', ') || 'None reported'}
  Past Surgeries: ${sum?.pastMedicalSurgicalHistory?.pastSurgeries?.join(', ') || 'None'}

DRUG & ALLERGY HISTORY:
  Current Medications: ${sum?.drugAndAllergyHistory?.currentMedications?.join(', ') || 'None'}
  Known Drug Allergies: ${sum?.drugAndAllergyHistory?.knownAllergies?.join(', ') || 'NKDA'}

AI CLINICAL CO-PILOT DIFFERENTIAL DIAGNOSES:
${sum?.triageAssessment?.differentialDiagnoses?.map((d, i) => `  ${i + 1}. ${d.condition} [ICD-10: ${d.icd10Code}] (${d.probability.toUpperCase()}) - ${d.rationale}`).join('\n') || '  None listed'}

RECOMMENDED WORKUP:
${sum?.triageAssessment?.recommendedWorkup?.map((w) => `  - ${w}`).join('\n') || '  - Standard Clinical Exam'}

DOCTOR CLINICAL NOTES:
  ${p.doctorNotes || 'No notes added'}

DOCTOR RX PRESCRIPTION:
  ${p.doctorPrescription || 'No prescription issued'}
=====================================================
Attending Physician: ${doctorUser.name} (${doctorUser.title}, Reg: ${doctorUser.registrationNumber})
`;
  };

  // Export as formatted Clinical Text (.txt)
  const handleExportText = () => {
    if (!selectedPatient) return;
    const textContent = generateEMRNote(selectedPatient);
    const textBlob = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', textBlob);
    downloadAnchor.setAttribute('download', `MediKiosk-CaseSheet-${selectedPatient.tokenNumber}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
  };

  // Export as Structured Clinical JSON (.json)
  const handleExportJSON = () => {
    if (!selectedPatient) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(selectedPatient, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `MediKiosk-Record-${selectedPatient.tokenNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
  };

  // Copy EMR Note to Clipboard
  const handleCopyEMR = async () => {
    if (!selectedPatient) return;
    const text = generateEMRNote(selectedPatient);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEMR(true);
      setTimeout(() => setCopiedEMR(false), 2000);
      setShowExportMenu(false);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Print Case Sheet
  const handlePrintCaseSheet = () => {
    window.print();
  };

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    // Tab filter
    if (activeFilter === 'red_flag' && !p.isRedFlag) return false;
    if (activeFilter === 'waiting' && p.status !== 'waiting') return false;
    if (activeFilter === 'in_consultation' && p.status !== 'in_consultation') return false;
    if (activeFilter === 'seen' && p.status !== 'seen') return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = p.demographics?.name.toLowerCase().includes(query);
      const matchToken = p.tokenNumber.toLowerCase().includes(query);
      const matchPhone = p.demographics?.phoneNumber.includes(query);
      const matchComplaint = p.structuredSummary?.chiefComplaint.toLowerCase().includes(query);
      return matchName || matchToken || matchPhone || matchComplaint;
    }
    return true;
  });

  // Stats calculation
  const totalWaiting = patients.filter((p) => p.status === 'waiting').length;
  const criticalCount = patients.filter((p) => p.isRedFlag && p.status !== 'seen').length;
  const inConsultCount = patients.filter((p) => p.status === 'in_consultation').length;
  const seenTodayCount = patients.filter((p) => p.status === 'seen').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Doctor Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-16 sm:top-20 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  {doctorUser.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {doctorUser.roomNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                  title="Edit Doctor Credentials"
                >
                  <UserCog className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {doctorUser.title} • {doctorUser.department} • <span className="font-mono text-[11px]">Lic: {doctorUser.registrationNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <button
                id="edit-doctor-profile-btn"
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Edit doctor profile"
              >
                <UserCog className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Credentials</span>
              </button>

              <button
                id="refresh-queue-btn"
                type="button"
                onClick={() => fetchPatients(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Refresh queue"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden md:inline">Sync</span>
              </button>

              <button
                id="clear-queue-btn"
                type="button"
                onClick={handleClearQueue}
                disabled={isClearing || patients.length === 0}
                className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Clear entire OPD queue"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-pulse' : ''}`} />
                <span className="hidden md:inline">{isClearing ? 'Clearing...' : 'Clear'}</span>
              </button>

              <button
                id="back-to-kiosk-view-btn"
                type="button"
                onClick={onBackToKiosk}
                className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Exit Doctor Portal and return to Patient Kiosk"
              >
                <Monitor className="w-3.5 h-3.5 text-teal-600" />
                <span>Exit to Patient Kiosk</span>
              </button>

              <button
                id="doctor-sign-out-btn"
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Sign out of Doctor Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OPD Metrics Bar */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Waiting in OPD
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalWaiting}</div>
          </div>

          <div className={`p-3 rounded-xl border ${criticalCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200/80'}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-rose-700 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Red-Flag / Triage
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 ${criticalCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {criticalCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              In Consultation
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">{inConsultCount}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Seen / Completed Today
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{seenTodayCount}</div>
          </div>
        </div>
      </div>

      {/* Main Clinical Workspace (Split View) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Patient Queue (Scannable, dense) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col space-y-3">
          {/* Search & Tabs */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="doctor-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token, name, ABHA or symptom..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-hidden font-medium"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'red_flag', label: '🚨 Red Flag' },
                { id: 'waiting', label: 'Waiting' },
                { id: 'in_consultation', label: 'In Room' },
                { id: 'seen', label: 'Seen' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`filter-tab-${tab.id}`}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    activeFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List Cards */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[calc(100vh-280px)] pr-1">
            {filteredPatients.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
                No patients found matching current filter.
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const isSelected = patient.id === selectedPatientId;
                return (
                  <div
                    key={patient.id}
                    id={`queue-card-${patient.id}`}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-100'
                        : patient.isRedFlag
                        ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Red-Flag Banner */}
                    {patient.isRedFlag && (
                      <div className="flex items-center gap-1 text-[11px] font-black text-rose-700 uppercase tracking-wider mb-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                        <span>CRITICAL TRIAGE ALERT</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                          {patient.tokenNumber}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">
                          {patient.demographics?.name}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          patient.status === 'in_consultation'
                            ? 'bg-blue-100 text-blue-800'
                            : patient.status === 'seen'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {patient.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 font-medium mb-2.5">
                      {patient.structuredSummary?.chiefComplaint || 'Consultation Intake'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>
                        {patient.demographics?.age}y • {patient.demographics?.gender}
                      </span>
                      <div className="flex items-center gap-2">
                        {patient.documents && patient.documents.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 font-bold border border-teal-200">
                            📎 {patient.documents.length} doc
                          </span>
                        )}
                        <span>{new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Patient Clinical Detail Sheet */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden">
          {selectedPatient ? (
            <>
              {/* Patient Top Bar & Status Controls */}
              <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-mono text-base font-black px-2.5 py-0.5 rounded bg-slate-900 text-white">
                        {selectedPatient.tokenNumber}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        {selectedPatient.demographics?.name}
                      </h2>
                      {selectedPatient.isRedFlag && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                          Emergency Priority
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>
                        Age: <strong>{selectedPatient.demographics?.age}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Gender: <strong className="capitalize">{selectedPatient.demographics?.gender}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {selectedPatient.demographics?.phoneNumber}
                      </span>
                      {selectedPatient.demographics?.abhaId && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-mono font-bold border border-teal-200">
                            ABHA: {selectedPatient.demographics.abhaId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Doctor Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                    {/* Status Toggles */}
                    {selectedPatient.status === 'waiting' && (
                      <button
                        id="doctor-call-in-btn"
                        type="button"
                        onClick={() => handleUpdateStatus('in_consultation')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
                      >
                        Call Patient In
                      </button>
                    )}

                    {selectedPatient.status === 'in_consultation' && (
                      <button
                        id="doctor-mark-seen-btn"
                        type="button"
                        onClick={() => handleUpdateStatus('seen')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Seen</span>
                      </button>
                    )}

                    {selectedPatient.status === 'seen' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('waiting')}
                        className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                      >
                        Reopen Case
                      </button>
                    )}

                    {/* Export Dropdown & Print Group */}
                    <div className="relative">
                      <button
                        id="export-opd-case-btn"
                        type="button"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                        title="Export Clinical Case Sheet"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>Export</span>
                      </button>

                      {showExportMenu && (
                        <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 text-xs">
                          <button
                            type="button"
                            onClick={handleCopyEMR}
                            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-700 font-semibold flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              Copy EMR Note
                            </span>
                            {copiedEMR && <span className="text-[10px] font-bold text-emerald-600">Copied!</span>}
                          </button>
                          <button
                            type="button"
                            onClick={handleExportText}
                            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-700 font-semibold flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Download Case Sheet (.txt)
                          </button>
                          <button
                            type="button"
                            onClick={handleExportJSON}
                            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-700 font-semibold flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            Download Clinical JSON (.json)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Print Button */}
                    <button
                      id="print-opd-case-btn"
                      type="button"
                      onClick={handlePrintCaseSheet}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Print Clinical Case Sheet"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>
                </div>

                {/* Red Flag Warning Banner */}
                {selectedPatient.isRedFlag && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider text-rose-950 font-black">
                        Automated Triage Warning:
                      </strong>
                      <p>{selectedPatient.redFlagReason || selectedPatient.structuredSummary?.triageAssessment.clinicalImpression}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Clinical Content */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* Vitals Signs Strip with NEWS2 Risk Alert */}
                {selectedPatient.vitals && (selectedPatient.vitals.systolicBp || selectedPatient.vitals.pulseRate || selectedPatient.vitals.spO2) && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                        Patient Vitals at Kiosk Intake
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                          selectedPatient.vitals.riskLevel === 'critical'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : selectedPatient.vitals.riskLevel === 'moderate'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        NEWS2 Score: {selectedPatient.vitals.triageRiskScore || 0} ({selectedPatient.vitals.riskLevel || 'Normal'})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {selectedPatient.vitals.systolicBp && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block font-bold">BP (mmHg)</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {selectedPatient.vitals.systolicBp}/{selectedPatient.vitals.diastolicBp || 80}
                          </span>
                        </div>
                      )}
                      {selectedPatient.vitals.pulseRate && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block font-bold">Pulse (BPM)</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {selectedPatient.vitals.pulseRate}
                          </span>
                        </div>
                      )}
                      {selectedPatient.vitals.spO2 && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block font-bold">SpO2 Oxygen</span>
                          <span
                            className={`font-extrabold text-sm ${
                              selectedPatient.vitals.spO2 < 92 ? 'text-rose-600 font-black' : 'text-slate-900'
                            }`}
                          >
                            {selectedPatient.vitals.spO2}%
                          </span>
                        </div>
                      )}
                      {selectedPatient.vitals.temperature && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block font-bold">Temperature</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {selectedPatient.vitals.temperature} °F
                          </span>
                        </div>
                      )}
                      {selectedPatient.vitals.bloodGlucose && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block font-bold">Blood Glucose</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {selectedPatient.vitals.bloodGlucose} mg/dL
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 1. Chief Complaint & Clinical Impression */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Chief Complaint (CC)
                      </span>
                      {selectedPatient.primaryBodyRegion && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                          📍 {selectedPatient.primaryBodyRegion.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-extrabold text-slate-900">
                      {selectedPatient.structuredSummary?.chiefComplaint || 'General OPD visit'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800 block mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      AI Clinical Impression & Specialty
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      {selectedPatient.structuredSummary?.triageAssessment.clinicalImpression ||
                        'Routine medical assessment advised.'}
                    </p>
                  </div>
                </div>

                {/* AI Differential Diagnoses & Recommended Workup */}
                {selectedPatient.structuredSummary?.triageAssessment.differentialDiagnoses &&
                  selectedPatient.structuredSummary.triageAssessment.differentialDiagnoses.length > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                          AI Clinical Co-Pilot: Differential Diagnoses & ICD-10
                        </span>
                        <span className="text-[11px] text-indigo-700 font-bold">
                          Assists Physician Decision-Making
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                        {selectedPatient.structuredSummary.triageAssessment.differentialDiagnoses.map(
                          (diff, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-extrabold text-xs text-slate-900">
                                    {diff.condition}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                      diff.probability === 'high'
                                        ? 'bg-rose-100 text-rose-800'
                                        : diff.probability === 'medium'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {diff.probability}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600">{diff.rationale}</p>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 mt-2 block">
                                ICD-10: {diff.icd10Code}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Recommended Workup */}
                      {selectedPatient.structuredSummary.triageAssessment.recommendedWorkup &&
                        selectedPatient.structuredSummary.triageAssessment.recommendedWorkup.length > 0 && (
                          <div className="pt-2 border-t border-indigo-200/70">
                            <span className="text-[10px] font-bold uppercase text-indigo-900 block mb-1">
                              Recommended Diagnostic Workup:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedPatient.structuredSummary.triageAssessment.recommendedWorkup.map(
                                (test, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      // Append test to prescription textarea
                                      setDoctorPrescription(
                                        (prev) => (prev ? `${prev}\n• ${test}` : `• ${test}`)
                                      );
                                    }}
                                    className="px-2 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs transition-colors cursor-pointer"
                                    title="Click to add to doctor orders"
                                  >
                                    + {test}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                {/* 2. History of Presenting Illness (HPI) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    History of Presenting Illness (HPI - SOCRATES)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium mb-3">
                    {selectedPatient.structuredSummary?.historyOfPresentingIllness.narrative}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2.5 border-t border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block font-bold">Onset / Duration</span>
                      <span className="font-semibold text-slate-800">
                        {selectedPatient.structuredSummary?.historyOfPresentingIllness.symptomOnset} (
                        {selectedPatient.structuredSummary?.historyOfPresentingIllness.duration})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Severity Score</span>
                      <span className="font-extrabold text-blue-700">
                        {selectedPatient.structuredSummary?.historyOfPresentingIllness.severityScore} / 10
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Character / Radiation</span>
                      <span className="font-semibold text-slate-800">
                        {selectedPatient.structuredSummary?.historyOfPresentingIllness.character || 'Local'}
                        {selectedPatient.structuredSummary?.historyOfPresentingIllness.radiation ? ` → ${selectedPatient.structuredSummary.historyOfPresentingIllness.radiation}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Associated Signs</span>
                      <span className="font-semibold text-slate-800">
                        {selectedPatient.structuredSummary?.historyOfPresentingIllness.associatedSymptoms.join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Past Medical, Medications & Allergies Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chronic & Past History */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Past Medical & Surgical History (PMHx)
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <strong className="text-slate-600 block">Chronic Conditions:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedPatient.structuredSummary?.pastMedicalSurgicalHistory.chronicConditions.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-300 font-medium text-slate-800">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Meds & Allergies */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-blue-600" />
                      Current Medications & Known Allergies
                    </span>
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong className="text-slate-600 block">Current Medications:</strong>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {selectedPatient.structuredSummary?.drugAndAllergyHistory.currentMedications.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong className="text-slate-600 block">Allergies:</strong>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {selectedPatient.structuredSummary?.drugAndAllergyHistory.knownAllergies.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold border border-rose-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Uploaded Prescriptions & Lab Documents */}
                {selectedPatient.documents && selectedPatient.documents.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Uploaded & Digitized Records ({selectedPatient.documents.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedPatient.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-3 hover:border-blue-400 transition-colors"
                        >
                          <img
                            src={doc.imageUrl}
                            alt={doc.title}
                            onClick={() => setDocumentZoomUrl(doc.imageUrl)}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <p className="font-extrabold text-slate-900 truncate">{doc.title}</p>
                            <p className="text-slate-500 text-[11px] mb-1">
                              {doc.aiInsights?.doctorOrFacility || 'OPD Document'}
                            </p>
                            {doc.aiInsights?.medicationsIdentified && doc.aiInsights.medicationsIdentified.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {doc.aiInsights.medicationsIdentified.slice(0, 2).map((m, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Complete Kiosk Chat Transcript Toggle */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    id="toggle-transcript-btn"
                    type="button"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      View Raw Kiosk Conversation Transcript ({selectedPatient.conversationTranscript?.length || 0} messages)
                    </span>
                    <span>{showTranscript ? 'Hide ▲' : 'Expand ▼'}</span>
                  </button>

                  {showTranscript && (
                    <div className="p-4 bg-white border-t border-slate-200 max-h-64 overflow-y-auto space-y-2 text-xs">
                      {selectedPatient.conversationTranscript?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2.5 rounded-lg ${
                            msg.sender === 'ai' ? 'bg-slate-50 border border-slate-200' : 'bg-blue-50 border border-blue-200 text-blue-950 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <strong className="capitalize">{msg.sender === 'ai' ? 'MediKiosk Assistant' : selectedPatient.demographics?.name}</strong>
                            <span>{msg.timestamp}</span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Doctor Clinical Notes & Digital Prescription Area */}
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      Doctor's Examination Notes & Clinical Prescription
                    </span>
                    {notesSaveSuccess && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Physician Diagnosis & Clinical Remarks:
                      </label>
                      <textarea
                        id="doctor-notes-textarea"
                        rows={3}
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        placeholder="Type bedside clinical observations, physical exam findings, or diagnosis..."
                        className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-hidden font-medium text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Prescription (Rx) & Investigation Orders:
                      </label>
                      <textarea
                        id="doctor-prescription-textarea"
                        rows={3}
                        value={doctorPrescription}
                        onChange={(e) => setDoctorPrescription(e.target.value)}
                        placeholder="e.g., 1. Tab Paracetamol 650mg TDS x 3 days&#10;2. Complete Blood Count (CBC)&#10;3. Follow up after 5 days."
                        className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-hidden font-mono text-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-slate-500">
                        Autosaves to hospital OPD records upon save click.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          id="check-interactions-btn"
                          type="button"
                          onClick={handleCheckInteractions}
                          disabled={isCheckingInteractions || !doctorPrescription.trim()}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Check prescription for drug interactions and allergies"
                        >
                          <Pill className="w-4 h-4" />
                          <span>{isCheckingInteractions ? 'Checking...' : 'Check Interactions'}</span>
                        </button>
                        <button
                          id="save-doctor-notes-btn"
                          type="button"
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSavingNotes ? 'Saving...' : 'Save & Record Notes'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Interaction / allergy alerts */}
                    {(hasInteractionAlerts || interactionAlerts.length > 0) && (
                      <div className={`mt-3 p-3 rounded-xl border text-xs ${hasInteractionAlerts ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                        {hasInteractionAlerts ? (
                          <>
                            <strong className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-black mb-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              Prescription safety alerts ({interactionAlerts.length})
                            </strong>
                            <div className="space-y-1.5">
                              {interactionAlerts.map((a, i) => (
                                <div key={i} className="p-2 bg-white rounded-lg border border-rose-200">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mr-1.5 ${a.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-900'}`}>{a.severity}</span>
                                  <strong>{a.title}</strong>
                                  <p className="mt-0.5 text-rose-800">{a.clinicalAdvice}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <span className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            No drug interactions or allergy conflicts detected.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">
              Select a patient from the queue to view clinical summary.
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Formal Clinical Case Sheet for Physical OPD Records / EMR Filing */}
      {selectedPatient && (
        <div id="printable-case-sheet" className="hidden print-only bg-white text-black p-8 font-sans">
          {/* Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                Apollo & AIIMS Network • OPD Clinical Case Sheet
              </h1>
              <p className="text-xs text-slate-600">
                Department of {doctorUser.department || 'Internal Medicine'} • {doctorUser.roomNumber} • Self-Service MediKiosk Intake
              </p>
            </div>
            <div className="text-right">
              <div className="text-base font-black font-mono border-2 border-slate-900 px-3 py-1 rounded">
                TOKEN: {selectedPatient.tokenNumber}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Date: {new Date(selectedPatient.createdAt).toLocaleDateString()} {new Date(selectedPatient.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Patient Demographics */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-300 rounded text-xs mb-4">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Patient Name</span>
              <strong className="text-sm">{selectedPatient.demographics?.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Age / Gender</span>
              <strong>{selectedPatient.demographics?.age} Yrs / {selectedPatient.demographics?.gender}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Phone Number</span>
              <strong className="font-mono">+91 {selectedPatient.demographics?.phoneNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">ABHA Health ID</span>
              <strong className="font-mono">{selectedPatient.demographics?.abhaId || 'None Provided'}</strong>
            </div>
          </div>

          {/* Vitals Summary */}
          {selectedPatient.vitals && (
            <div className="p-3 border border-slate-300 rounded text-xs mb-4">
              <span className="font-bold text-[11px] uppercase tracking-wider block mb-1">
                Recorded Vitals (NEWS2 Score: {selectedPatient.vitals.triageRiskScore || 0} - {selectedPatient.vitals.riskLevel?.toUpperCase() || 'NORMAL'})
              </span>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>BP: <strong>{selectedPatient.vitals.systolicBp || '-'}/{selectedPatient.vitals.diastolicBp || '-'} mmHg</strong></div>
                <div>Pulse: <strong>{selectedPatient.vitals.pulseRate || '-'} bpm</strong></div>
                <div>SpO2: <strong>{selectedPatient.vitals.spO2 || '-'}%</strong></div>
                <div>Temp: <strong>{selectedPatient.vitals.temperature || '-'}°F</strong></div>
                <div>Resp: <strong>{selectedPatient.vitals.respiratoryRate || '-'} /min</strong></div>
              </div>
            </div>
          )}

          {/* Chief Complaint & HPI */}
          <div className="mb-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
              1. Chief Complaint & History of Presenting Illness
            </h2>
            <p className="text-xs leading-relaxed font-semibold mb-1">
              Chief Complaint: {selectedPatient.structuredSummary?.chiefComplaint}
            </p>
            <p className="text-xs text-slate-700 leading-relaxed mb-1">
              {selectedPatient.structuredSummary?.historyOfPresentingIllness?.narrative}
            </p>
            <div className="text-[11px] text-slate-600 grid grid-cols-3 gap-2 mt-1">
              <div>Onset: <strong>{selectedPatient.structuredSummary?.historyOfPresentingIllness?.duration}</strong></div>
              <div>Severity: <strong>{selectedPatient.structuredSummary?.historyOfPresentingIllness?.severityScore}/10</strong></div>
              <div>Radiation: <strong>{selectedPatient.structuredSummary?.historyOfPresentingIllness?.radiation || 'None'}</strong></div>
            </div>
          </div>

          {/* Medical History & Allergies */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div className="p-3 border border-slate-300 rounded">
              <h3 className="font-bold uppercase text-[10px] tracking-wider mb-1">Chronic Conditions & Past Surgeries</h3>
              <p>Conditions: {selectedPatient.structuredSummary?.pastMedicalSurgicalHistory?.chronicConditions?.join(', ') || 'None reported'}</p>
              <p>Surgeries: {selectedPatient.structuredSummary?.pastMedicalSurgicalHistory?.pastSurgeries?.join(', ') || 'None'}</p>
            </div>
            <div className="p-3 border border-slate-300 rounded">
              <h3 className="font-bold uppercase text-[10px] tracking-wider mb-1">Current Medications & Allergies</h3>
              <p>Medications: {selectedPatient.structuredSummary?.drugAndAllergyHistory?.currentMedications?.join(', ') || 'None'}</p>
              <p className="text-rose-700 font-bold">Allergies: {selectedPatient.structuredSummary?.drugAndAllergyHistory?.knownAllergies?.join(', ') || 'NKDA'}</p>
            </div>
          </div>

          {/* Differential Diagnoses & Recommended Workup */}
          {selectedPatient.structuredSummary?.triageAssessment && (
            <div className="mb-4 p-3 border border-slate-300 rounded text-xs">
              <h3 className="font-bold uppercase text-[10px] tracking-wider mb-1">AI Clinical Co-Pilot Differential Diagnoses</h3>
              <div className="space-y-1 mb-2">
                {selectedPatient.structuredSummary.triageAssessment.differentialDiagnoses?.map((diag, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span>
                      {idx + 1}. <strong>{diag.condition}</strong> [ICD-10: {diag.icd10Code}] - {diag.rationale}
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold">({diag.probability})</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-1 text-[11px] text-slate-700">
                <strong>Recommended Workup: </strong>
                {selectedPatient.structuredSummary.triageAssessment.recommendedWorkup?.join(', ') || 'Clinical correlation'}
              </div>
            </div>
          )}

          {/* Physician Notes & Rx */}
          <div className="mb-6 p-3 border-2 border-slate-900 rounded">
            <h3 className="font-black uppercase text-xs tracking-wider mb-1">Physician Diagnosis & Clinical Notes</h3>
            <p className="text-xs min-h-[40px] leading-relaxed mb-3">
              {doctorNotes || '__________________________________________________________________________________'}
            </p>

            <h3 className="font-black uppercase text-xs tracking-wider mb-1">Prescription (Rx) & Orders</h3>
            <pre className="text-xs font-mono whitespace-pre-wrap min-h-[50px] leading-relaxed">
              {doctorPrescription || '1. \n2. \n3. '}
            </pre>
          </div>

          {/* Doctor Signature Block */}
          <div className="border-t-2 border-slate-900 pt-4 flex items-end justify-between text-xs">
            <div>
              <p className="font-bold">{doctorUser.name}</p>
              <p className="text-slate-600">{doctorUser.title}</p>
              <p className="text-slate-500 font-mono text-[10px]">MCI/NMC Reg: {doctorUser.registrationNumber}</p>
            </div>
            <div className="text-right">
              <div className="w-48 border-b border-slate-900 mb-1"></div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Consultant Physician Signature</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Update Doctor Credentials</h3>
                  <p className="text-[11px] text-slate-500">Change your active clinical identity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Council / NMC Reg No.</label>
                <input
                  type="text"
                  value={editDocReg}
                  onChange={(e) => setEditDocReg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">OPD Room No.</label>
                  <input
                    type="text"
                    value={editDocRoom}
                    onChange={(e) => setEditDocRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editDocDept}
                    onChange={(e) => setEditDocDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation & Degree</label>
                <input
                  type="text"
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Document Zoom Modal */}
      {documentZoomUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Document Scan View</h3>
              <button
                type="button"
                onClick={() => setDocumentZoomUrl(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Close ✕
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <img src={documentZoomUrl} alt="Prescription" className="w-full max-h-[600px] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
