import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { getGemini, geminiModel, setCors } from '../_lib/store';

function fallback(conversation: Array<{ sender: string; text: string }>, demographics: Record<string, string>, bodyRegion?: string, vitals?: Record<string, number>) {
  const lang = demographics?.preferredLanguage;
  const isHindi = lang === 'hi';
  const isTamil = lang === 'ta';
  const patientTurns = (conversation || []).filter((m) => m.sender === 'patient');
  if (patientTurns.length === 0) {
    return {
      nextQuestion: isTamil
        ? `வணக்கம் ${demographics?.name || ''}, இன்று நீங்கள் மருத்துவரிடம் ஆலோசனை பெற விரும்பும் முக்கிய உடல்நலப் பிரச்சனை என்ன?`
        : isHindi
        ? `नमस्ते ${demographics?.name || ''}, आप आज डॉक्टर को क्या परेशानी दिखाना चाहते हैं?`
        : `Hello ${demographics?.name || ''}, what main symptoms or health concern brings you to the hospital today?`,
      quickReplies: isTamil
        ? ['காய்ச்சல் & உடல் வலி', 'மார்பு வலி / மூச்சுத்திணறல்', 'வயிற்று வலி அல்லது வாயு', 'மூட்டு / முழங்கால் வலி']
        : isHindi
        ? ['बुखार और बदन दर्द', 'सीने में भारीपन / सांस फूलना', 'पेट दर्द या गैस', 'जोड़ों / घुटनों में दर्द']
        : ['Fever & Body ache', 'Chest pain / Shortness of breath', 'Abdominal pain / Digestion', 'Joint / Knee pain'],
      isRedFlag: false,
      category: 'chief_complaint',
      progressPercent: 20,
    };
  }
  const latestText = patientTurns[patientTurns.length - 1]?.text?.toLowerCase() || '';
  if (['chest pain', 'heart attack', 'breathless', 'slurred speech', 'paralysis', 'सीने में दर्द', 'மார்பு வலி', 'நெஞ்சு வலி', 'மூச்சுத்திணறல்', 'பக்கவாதம்', 'लकवा'].some((t) => latestText.includes(t))) {
    return {
      nextQuestion: isTamil
        ? 'எச்சரிக்கை! வலி இடது கை அல்லது தாடைக்கு பரவுகிறதா, அல்லது குளிர்ந்த வியர்வை உள்ளதா?'
        : isHindi
        ? 'सावधान! क्या दर्द बाएं हाथ या जबड़े में जा रहा है, या पसीना आ रहा है?'
        : 'Emergency warning! Is this discomfort radiating to your left arm or jaw, or with cold sweating?',
      quickReplies: isTamil ? ['ஆம், அதிக வியர்வை', 'இடது கைக்கு பரவுகிறது', 'மிதமான அழுத்தம்'] : isHindi ? ['हाँ, पसीना है', 'बाएं हाथ में दर्द', 'हल्का दबाव'] : ['Yes, sweating', 'Radiating to left arm', 'Mild pressure only'],
      isRedFlag: true,
      redFlagReason: 'Reported acute cardiovascular or neurological warning symptoms',
      category: 'hpi',
      progressPercent: 50,
    };
  }
  const steps: Record<number, object> = {
    1: {
      nextQuestion: isTamil ? 'இந்த பிரச்சனை எத்தனை நாட்களாக உள்ளது?' : isHindi ? 'यह तकलीफ कितने दिनों से है?' : 'How long have you had this problem?',
      quickReplies: isTamil ? ['இன்று முதல்', '2-3 நாட்கள்', '1 வாரம்+'] : isHindi ? ['आज से', '2-3 दिनों से', '1 हफ्ते से अधिक'] : ['Since today', 'Past 2-3 days', 'More than 1 week'],
      isRedFlag: false, category: 'hpi', progressPercent: 40,
    },
    2: {
      nextQuestion: isTamil ? '1-10 அளவில் வலி எவ்வளவு, காய்ச்சல்/வாந்தி உள்ளதா?' : isHindi ? '1-10 में गंभीरता कितनी, बुखार/उल्टी है?' : 'On a scale of 1-10 how severe, with fever/vomiting?',
      quickReplies: isTamil ? ['லேசானது (1-3)', 'மிதமானது (4-6)', 'கடுமையானது (7-10)'] : isHindi ? ['हल्का (1-3)', 'मध्यम (4-6)', 'तेज़ (7-10)'] : ['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)'],
      isRedFlag: false, category: 'hpi', progressPercent: 60,
    },
    3: {
      nextQuestion: isTamil ? 'சர்க்கரை, இரத்த அழுத்தம் போன்ற நோய்கள் உள்ளதா?' : isHindi ? 'शुगर, बीपी जैसी पुरानी बीमारी है?' : 'Any Diabetes, BP, Thyroid or Asthma?',
      quickReplies: isTamil ? ['சர்க்கரை & பிபி', 'ஏதுமில்லை', 'ஆஸ்துமா'] : isHindi ? ['शुगर/बीपी है', 'कोई नहीं', 'अस्थमा'] : ['Diabetes & BP', 'None', 'Asthma'],
      isRedFlag: false, category: 'past_history', progressPercent: 75,
    },
  };
  if (steps[patientTurns.length]) return steps[patientTurns.length];
  return {
    nextQuestion: isTamil ? 'தினமும் மாத்திரை எடுக்கிறீர்களா, ஒவ்வாமை உள்ளதா?' : isHindi ? 'रोज़ दवा लेते हैं या एलर्जी है?' : 'Taking daily medications or any drug allergies?',
    quickReplies: isTamil ? ['தினசரி மாத்திரை', 'எதுவுமில்லை', 'ஒவ்வாமை உண்டு'] : isHindi ? ['रोज़ दवा', 'कोई नहीं', 'एलर्जी है'] : ['Daily meds', 'None', 'Have allergies'],
    isRedFlag: false, category: 'medications', progressPercent: 90,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { conversation = [], demographics = {}, bodyRegion, vitals } = req.body ?? {};
  const lang = demographics?.preferredLanguage;
  const ai = getGemini();
  if (ai) {
    try {
      const prompt = `You are MediKiosk AI, empathetic clinical OPD triage assistant at an Indian hospital.
Patient: ${demographics?.name || 'Patient'}, Age ${demographics?.age || '?'}, ${demographics?.gender || ''}, Language ${lang === 'ta' ? 'Tamil' : lang === 'hi' ? 'Hindi' : 'English'}, Body region ${bodyRegion || 'general'}, Vitals ${vitals ? JSON.stringify(vitals) : 'none'}.
Conversation: ${JSON.stringify(conversation)}
Ask ONE next SOCRATES-based question in ${lang === 'ta' ? 'Tamil' : lang === 'hi' ? 'Hindi (Devanagari)' : 'English'}, 3-4 quick replies, progress 15-95%, red-flag detection. Respond ONLY JSON: {"nextQuestion":"...","quickReplies":[...],"isRedFlag":false,"redFlagReason":null,"category":"hpi","progressPercent":40}`;
      const response = await ai.models.generateContent({
        model: geminiModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      return res.status(200).json(JSON.parse(response.text || '{}'));
    } catch (e) {
      console.error('Gemini follow-up error:', e);
    }
  }
  return res.status(200).json(fallback(conversation, demographics, bodyRegion, vitals));
}

