import React from 'react';
import { BodyRegion, Language } from '../../types';
import {
  Heart,
  Brain,
  Bone,
  Flame,
  Activity,
  Sparkles,
} from 'lucide-react';

interface BodyMapSelectorProps {
  selectedRegion?: BodyRegion;
  onSelectRegion: (region: BodyRegion) => void;
  language: Language;
}

interface RegionMeta {
  id: BodyRegion;
  labelEn: string;
  labelHi: string;
  labelTa: string;
  descEn: string;
  descHi: string;
  descTa: string;
  icon: any;
  color: string;
  isHighRisk?: boolean;
}

const REGIONS: RegionMeta[] = [
  {
    id: 'chest_heart',
    labelEn: 'Chest & Heart',
    labelHi: 'सीना और दिल',
    labelTa: 'மார்பு & இதயம்',
    descEn: 'Chest pain, tightness, palpitation, breathlessness',
    descHi: 'सीने में दर्द, भारीपन, घबराहट, सांस फूलना',
    descTa: 'மார்பு வலி, இறுக்கம், படபடப்பு, மூச்சுத்திணறல்',
    icon: Heart,
    color: 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
    isHighRisk: true,
  },
  {
    id: 'abdomen_stomach',
    labelEn: 'Stomach & Abdomen',
    labelHi: 'पेट और पाचन',
    labelTa: 'வயிறு & செரிமானம்',
    descEn: 'Abdominal pain, acidity, gas, nausea, indigestion',
    descHi: 'पेट दर्द, गैस, एसिडिटी, उल्टी, अपच',
    descTa: 'வயிற்று வலி, அசிடிட்டி, வாயு, குமட்டல், அஜீரணம்',
    icon: Flame,
    color: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
  },
  {
    id: 'head_neck',
    labelEn: 'Head & Neck',
    labelHi: 'सिर और गर्दन',
    labelTa: 'தலை & கழுத்து',
    descEn: 'Headache, migraine, dizziness, sore throat, vision',
    descHi: 'सिरदर्द, माइग्रेन, चक्कर, गले में दर्द, आंखों में भारीपन',
    descTa: 'தலைவலி, ஒற்றைத் தலைவலி, மயக்கம், தொண்டை வலி',
    icon: Brain,
    color: 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  },
  {
    id: 'spine_back',
    labelEn: 'Spine & Back',
    labelHi: 'कमर और रीढ़',
    labelTa: 'முதுகு & தண்டுவடம்',
    descEn: 'Lower back pain, sciatica, stiffness, neck spasm',
    descHi: 'कमर दर्द, रीढ़ की हड्डी में जकड़न, सायटिका',
    descTa: 'இடுப்பு வலி, சியாட்டிகா, தசைப்பிடிப்பு, முதுகு வலி',
    icon: Bone,
    color: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  },
  {
    id: 'limbs_joints',
    labelEn: 'Joints & Limbs',
    labelHi: 'जोड़ और घुटने',
    labelTa: 'மூட்டுகள் & கால்கள்',
    descEn: 'Knee pain, arthritis, ankle swelling, shoulder pain',
    descHi: 'घुटनों का दर्द, गठिया, सूजन, जोड़ों में जकड़न',
    descTa: 'மூட்டு வலி, முழங்கால் வீக்கம், தோள்பட்டை வலி',
    icon: Activity,
    color: 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
  },
  {
    id: 'general_fever',
    labelEn: 'Fever & Whole Body',
    labelHi: 'बुखार और पूरा शरीर',
    labelTa: 'காய்ச்சல் & உடல் வலி',
    descEn: 'High fever, chills, fatigue, generalized body ache',
    descHi: 'तेज बुखार, कंपकंपी, कमजोरी, पूरे बदन में दर्द',
    descTa: 'கடுமையான காய்ச்சல், நடுக்கம், உடல் சோர்வு, வலி',
    icon: Sparkles,
    color: 'border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100',
  },
];

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedRegion,
  onSelectRegion,
  language,
}) => {
  const getHeaderCategory = () => {
    if (language === 'hi') return 'दृश्य शरीर मानचित्र';
    if (language === 'ta') return 'உடல் பகுதி வரைபடம்';
    return 'Interactive Body Map';
  };

  const getHeaderPrompt = () => {
    if (language === 'hi') return 'शरीर में सबसे ज्यादा तकलीफ कहाँ महसूस हो रही है?';
    if (language === 'ta') return 'உடலில் எங்கு அதிக அசௌகரியத்தை உணர்கிறீர்கள்?';
    return 'Tap where on your body you are experiencing discomfort:';
  };

  const getRegionLabel = (region: RegionMeta) => {
    if (language === 'hi') return region.labelHi;
    if (language === 'ta') return region.labelTa;
    return region.labelEn;
  };

  const getRegionDesc = (region: RegionMeta) => {
    if (language === 'hi') return region.descHi;
    if (language === 'ta') return region.descTa;
    return region.descEn;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">
            {getHeaderCategory()}
          </span>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            {getHeaderPrompt()}
          </h3>
        </div>
      </div>

      {/* Grid of anatomical touch cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          const Icon = region.icon;

          return (
            <button
              key={region.id}
              type="button"
              id={`body-region-${region.id}`}
              onClick={() => onSelectRegion(region.id)}
              className={`p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between min-h-[95px] cursor-pointer ${
                isSelected
                  ? 'border-teal-600 bg-teal-50/90 shadow-md ring-2 ring-teal-300'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {region.isHighRisk && (
                  <span className="text-[10px] font-extrabold text-rose-600 uppercase px-1.5 py-0.5 rounded bg-rose-100">
                    {language === 'ta' ? 'அவசர எச்சரிக்கை' : language === 'hi' ? 'गंभीर लक्षण' : 'Triage Alert'}
                  </span>
                )}
              </div>

              <div>
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 block leading-tight mt-2">
                  {getRegionLabel(region)}
                </span>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                  {getRegionDesc(region)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
