import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { getGemini, geminiModel, setCors, parseBody } from '../_lib/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { conversation = [], demographics = {}, documents = [], bodyRegion, vitals } = parseBody<any>(req.body);
  const ai = getGemini();
  if (ai) {
    try {
      const prompt = `You are Chief Medical Officer at an Indian hospital. Intake: demographics ${JSON.stringify(demographics)}, body region ${bodyRegion}, vitals ${JSON.stringify(vitals)}, transcript ${JSON.stringify(conversation)}, docs ${JSON.stringify(documents)}.
Produce OPD sheet JSON ONLY: {"chiefComplaint":"...","historyOfPresentingIllness":{"symptomOnset":"...","duration":"...","severityScore":5,"character":"...","radiation":"...","associatedSymptoms":[],"aggravatingRelievingFactors":"...","narrative":"..."},"pastMedicalSurgicalHistory":{"chronicConditions":[],"pastSurgeries":[],"hospitalizations":[]},"drugAndAllergyHistory":{"currentMedications":[],"knownAllergies":[]},"familyHistory":[],"personalSocialHistory":{"diet":"...","smokingOrTobacco":"..."},"reviewOfSystems":{"positiveFindings":[],"negativeFindings":[]},"triageAssessment":{"level":"routine","isRedFlag":false,"redFlagReasons":[],"recommendedDepartment":"...","clinicalImpression":"...","differentialDiagnoses":[{"condition":"...","probability":"high","rationale":"...","icd10Code":"..."}],"recommendedWorkup":[]},"patientPlainLanguageReadback":"...","patientPlainLanguageReadbackHindi":"...","patientPlainLanguageReadbackTamil":"..."}`;
      const response = await ai.models.generateContent({
        model: geminiModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      return res.status(200).json(JSON.parse(response.text || '{}'));
    } catch (e) {
      console.error('Gemini summary error:', e);
    }
  }
  const notes = conversation.filter((m: { sender: string }) => m.sender === 'patient').map((m: { text: string }) => m.text);
  const first = notes[0] || 'OPD Clinical Consultation';
  const emergency = conversation.some((m: { isRedFlag: boolean }) => m.isRedFlag);
  return res.status(200).json({
    chiefComplaint: first,
    primaryBodyRegion: bodyRegion,
    vitals,
    historyOfPresentingIllness: { symptomOnset: 'As reported', duration: notes[1] || 'Recent', severityScore: emergency ? 9 : 5, character: 'Reported', radiation: 'None', associatedSymptoms: notes.slice(1, 3), aggravatingRelievingFactors: 'Physician evaluation', narrative: `${demographics?.name || 'Patient'} presents with ${first}.` },
    pastMedicalSurgicalHistory: { chronicConditions: notes.length > 3 ? [notes[3]] : ['None stated'], pastSurgeries: ['None reported'], hospitalizations: ['None recent'] },
    drugAndAllergyHistory: { currentMedications: notes.length > 4 ? [notes[4]] : ['None reported'], knownAllergies: ['NKDA'] },
    familyHistory: ['Non-contributory'],
    personalSocialHistory: { diet: 'Standard Indian Diet', smokingOrTobacco: 'None stated' },
    reviewOfSystems: { positiveFindings: [first], negativeFindings: [] },
    triageAssessment: { level: emergency ? 'emergency' : 'routine', isRedFlag: Boolean(emergency), redFlagReasons: emergency ? ['Acute warning symptom'] : [], recommendedDepartment: emergency ? 'Emergency & Cardiology' : 'Internal Medicine / General OPD', clinicalImpression: `Presenting with ${first}.`, differentialDiagnoses: [{ condition: first, probability: 'high', rationale: 'Primary presenting symptom.', icd10Code: 'R68.89' }], recommendedWorkup: ['CBC', 'Random Blood Sugar', 'Vitals Check'] },
    patientPlainLanguageReadback: `You are here for ${first}. The doctor will review shortly.`,
    patientPlainLanguageReadbackHindi: `आप ${first} के लिए आए हैं। डॉक्टर जल्द जांच करेंगे।`,
    patientPlainLanguageReadbackTamil: `நீங்கள் ${first} காரணமாக வந்துள்ளீர்கள்.`,
  });
}
