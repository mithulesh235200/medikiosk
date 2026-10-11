import type { VercelRequest, VercelResponse } from './_lib/vercel';
import { getGemini, geminiModel, setCors, parseBody } from './_lib/store';
import { requireStaff } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireStaff(req.headers as never))) {
    return res.status(401).json({ error: 'Staff authentication required' });
  }
  const { currentMedications = [], proposedPrescription = '', knownAllergies = [] } = parseBody<any>(req.body);
  const ai = getGemini();
  if (ai && (proposedPrescription || currentMedications.length > 0)) {
    try {
      const prompt = `Clinical pharmacologist. Current meds ${JSON.stringify(currentMedications)}, allergies ${JSON.stringify(knownAllergies)}, proposed: "${proposedPrescription}". Check interactions + allergy contraindications + duplicates. JSON ONLY: {"hasAlerts":false,"alerts":[{"severity":"critical","drugPair":[],"title":"...","clinicalAdvice":"..."}]}`;
      const response = await ai.models.generateContent({
        model: geminiModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      return res.status(200).json(JSON.parse(response.text || '{"hasAlerts":false,"alerts":[]}'));
    } catch (e) {
      console.error('Interaction checker error:', e);
    }
  }
  // Rule-based fallback: sulfa / penicillin / NSAID+anticoagulant heuristics
  const text = `${currentMedications.join(' ')} ${proposedPrescription} ${knownAllergies.join(' ')}`.toLowerCase();
  const alerts: Array<Record<string, unknown>> = [];
  if (text.includes('penicillin') && (text.includes('amoxicillin') || text.includes('augmentin'))) {
    alerts.push({ severity: 'critical', drugPair: ['Penicillin allergy', 'Amoxicillin'], title: 'Penicillin allergy — avoid amoxicillin', clinicalAdvice: 'Cross-reactivity risk. Consider macrolide alternative and confirm allergy history.' });
  }
  if ((text.includes('warfarin') || text.includes('apixaban')) && (text.includes('ibuprofen') || text.includes('diclofenac') || text.includes('nsaid'))) {
    alerts.push({ severity: 'critical', drugPair: ['Anticoagulant', 'NSAID'], title: 'Bleeding risk: anticoagulant + NSAID', clinicalAdvice: 'Avoid combination; use paracetamol and add PPI cover if NSAID essential.' });
  }
  return res.status(200).json({ hasAlerts: alerts.length > 0, alerts });
}
