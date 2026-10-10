export type Language = 'en' | 'hi' | 'ta';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type PatientStatus = 'waiting' | 'in_consultation' | 'seen' | 'referred';

export type TriageLevel = 'routine' | 'urgent' | 'emergency';

export interface PatientDemographics {
  id: string;
  name: string;
  age: number | string;
  gender: Gender;
  phoneNumber: string;
  abhaId?: string; // 14-digit ABHA or health ID e.g. 91-8765-4321-0987
  preferredLanguage: Language;
  consentGiven: boolean;
  registeredAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'patient';
  text: string;
  translatedText?: string;
  timestamp: string;
  quickReplies?: string[];
  isRedFlag?: boolean;
  category?: 'chief_complaint' | 'hpi' | 'past_history' | 'medications' | 'family_history' | 'ros' | 'general';
}

export interface UploadedDocument {
  id: string;
  patientId: string;
  type: 'prescription' | 'lab_report' | 'discharge_summary' | 'imaging' | 'other';
  title: string;
  imageUrl: string;
  extractedText?: string;
  aiInsights?: {
    dateOfDocument?: string;
    doctorOrFacility?: string;
    diagnosesMentioned?: string[];
    medicationsIdentified?: string[];
    criticalValuesOrNotes?: string;
  };
  uploadedAt: string;
}

export type BodyRegion =
  | 'head_neck'
  | 'chest_heart'
  | 'abdomen_stomach'
  | 'spine_back'
  | 'limbs_joints'
  | 'skin_rash'
  | 'general_fever';

export interface VitalSigns {
  systolicBp?: number; // mmHg
  diastolicBp?: number; // mmHg
  pulseRate?: number; // bpm
  spO2?: number; // %
  temperature?: number; // °F
  respiratoryRate?: number; // breaths/min
  bloodGlucose?: number; // mg/dL
  triageRiskScore?: number; // 0-10 NEWS2 score
  riskLevel?: 'normal' | 'mild' | 'moderate' | 'critical';
}

export interface DifferentialDiagnosis {
  condition: string;
  probability: 'high' | 'moderate' | 'low';
  rationale: string;
  icd10Code?: string;
}

export interface StructuredClinicalSummary {
  chiefComplaint: string;
  primaryBodyRegion?: BodyRegion;
  vitals?: VitalSigns;
  historyOfPresentingIllness: {
    symptomOnset: string;
    duration: string;
    severityScore: number; // 1-10
    character: string;
    radiation: string;
    associatedSymptoms: string[];
    aggravatingRelievingFactors: string;
    narrative: string;
  };
  pastMedicalSurgicalHistory: {
    chronicConditions: string[];
    pastSurgeries: string[];
    hospitalizations: string[];
  };
  drugAndAllergyHistory: {
    currentMedications: string[];
    knownAllergies: string[];
  };
  familyHistory: string[];
  personalSocialHistory: {
    diet?: string;
    smokingOrTobacco?: string;
    alcohol?: string;
    occupation?: string;
  };
  reviewOfSystems: {
    positiveFindings: string[];
    negativeFindings: string[];
  };
  triageAssessment: {
    level: TriageLevel;
    isRedFlag: boolean;
    redFlagReasons: string[];
    recommendedDepartment: string;
    clinicalImpression: string;
    differentialDiagnoses?: DifferentialDiagnosis[];
    recommendedWorkup?: string[];
  };
  patientPlainLanguageReadback: string;
  patientPlainLanguageReadbackHindi?: string;
  patientPlainLanguageReadbackTamil?: string;
}

export interface PatientRecord {
  id: string;
  tokenNumber: string; // e.g. "OPD-A08"
  demographics: PatientDemographics;
  conversationTranscript: ChatMessage[];
  documents: UploadedDocument[];
  structuredSummary?: StructuredClinicalSummary;
  vitals?: VitalSigns;
  primaryBodyRegion?: BodyRegion;
  status: PatientStatus;
  priority: TriageLevel;
  isRedFlag: boolean;
  redFlagReason?: string;
  roomNumber: string;
  doctorNotes?: string;
  doctorPrescription?: string;
  consultationStartedAt?: string;
  consultationCompletedAt?: string;
  createdAt: string;
}

export interface DoctorUser {
  id: string;
  name: string;
  title: string;
  department: string;
  roomNumber: string;
  registrationNumber: string;
  pin?: string;
  avatarUrl?: string;
}
