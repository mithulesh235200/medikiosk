import React, { useState, useEffect } from 'react';
import { VitalSigns, Language } from '../../types';
import {
  HeartPulse,
  Activity,
  Gauge,
  Thermometer,
  Droplet,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface VitalsStationProps {
  vitals?: VitalSigns;
  onChange: (vitals: VitalSigns) => void;
  language: Language;
}

export const VitalsStation: React.FC<VitalsStationProps> = ({
  vitals,
  onChange,
  language,
}) => {
  const isHindi = language === 'hi';

  const [systolicBp, setSystolicBp] = useState<string>(vitals?.systolicBp ? String(vitals.systolicBp) : '');
  const [diastolicBp, setDiastolicBp] = useState<string>(vitals?.diastolicBp ? String(vitals.diastolicBp) : '');
  const [pulseRate, setPulseRate] = useState<string>(vitals?.pulseRate ? String(vitals.pulseRate) : '');
  const [spO2, setSpO2] = useState<string>(vitals?.spO2 ? String(vitals.spO2) : '');
  const [temperature, setTemperature] = useState<string>(vitals?.temperature ? String(vitals.temperature) : '');
  const [bloodGlucose, setBloodGlucose] = useState<string>(vitals?.bloodGlucose ? String(vitals.bloodGlucose) : '');

  // Calculate real-time NEWS2 / clinical triage risk
  const calculateRisk = (): { score: number; level: 'normal' | 'mild' | 'moderate' | 'critical'; warning?: string } => {
    let score = 0;
    const warnings: string[] = [];

    const sys = Number(systolicBp);
    const spo2Num = Number(spO2);
    const pulse = Number(pulseRate);
    const temp = Number(temperature);

    // SpO2
    if (spo2Num) {
      if (spo2Num <= 91) {
        score += 3;
        warnings.push('Severe Hypoxia (SpO2 ≤ 91%)');
      } else if (spo2Num <= 93) {
        score += 2;
      } else if (spo2Num <= 95) {
        score += 1;
      }
    }

    // Systolic BP
    if (sys) {
      if (sys >= 180 || sys <= 90) {
        score += 3;
        warnings.push(sys >= 180 ? 'Hypertensive Urgency (SBP ≥ 180)' : 'Hypotension (SBP ≤ 90)');
      } else if (sys >= 150 || sys <= 100) {
        score += 1;
      }
    }

    // Pulse
    if (pulse) {
      if (pulse >= 131 || pulse <= 40) {
        score += 3;
        warnings.push('Severe Arrhythmia / Tachycardia');
      } else if (pulse >= 111 || pulse <= 50) {
        score += 2;
      } else if (pulse >= 91) {
        score += 1;
      }
    }

    // Temp
    if (temp) {
      if (temp >= 103.5 || temp <= 95) {
        score += 3;
        warnings.push('Severe Pyrexia / Hypothermia');
      } else if (temp >= 101.5) {
        score += 1;
      }
    }

    let level: 'normal' | 'mild' | 'moderate' | 'critical' = 'normal';
    if (score >= 5 || warnings.length > 0) level = 'critical';
    else if (score >= 3) level = 'moderate';
    else if (score >= 1) level = 'mild';

    return { score, level, warning: warnings[0] };
  };

  const risk = calculateRisk();

  // Sync back to parent
  useEffect(() => {
    onChange({
      systolicBp: systolicBp ? Number(systolicBp) : undefined,
      diastolicBp: diastolicBp ? Number(diastolicBp) : undefined,
      pulseRate: pulseRate ? Number(pulseRate) : undefined,
      spO2: spO2 ? Number(spO2) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      bloodGlucose: bloodGlucose ? Number(bloodGlucose) : undefined,
      triageRiskScore: risk.score,
      riskLevel: risk.level,
    });
  }, [systolicBp, diastolicBp, pulseRate, spO2, temperature, bloodGlucose, risk.score, risk.level]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-teal-600" />
            {language === 'ta'
              ? 'உடல் நிலை அளவீடுகள் (Vitals)'
              : isHindi
              ? 'कियोस्क वाइटल्स स्टेशन'
              : 'Kiosk Vitals Station'}
          </span>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            {language === 'ta'
              ? 'இரத்த அழுத்தம் அல்லது நாடித்துடிப்பு அளவீடு உள்ளதா? (விருப்பத்தேர்வு)'
              : isHindi
              ? 'क्या आपने बीपी या पल्स जांच की है? (वैकल्पिक)'
              : 'Record Patient Vitals (Optional - self or nurse assisted)'}
          </h3>
        </div>

        {/* Real-time Triage Badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
            risk.level === 'critical'
              ? 'bg-rose-600 text-white animate-pulse'
              : risk.level === 'moderate'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {risk.level === 'critical' ? (
            <ShieldAlert className="w-3.5 h-3.5" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-teal-600" />
          )}
          <span>
            NEWS2 Score: {risk.score} ({risk.level.toUpperCase()})
          </span>
        </div>
      </div>

      {risk.warning && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Clinical Warning: {risk.warning}</span>
        </div>
      )}

      {/* Vitals Inputs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Blood Pressure */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-teal-600" />
            <span>BP (mmHg)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="vitals-systolic-input"
              type="number"
              value={systolicBp}
              onChange={(e) => setSystolicBp(e.target.value)}
              placeholder="120"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
            />
            <span className="text-slate-400 font-bold">/</span>
            <input
              id="vitals-diastolic-input"
              type="number"
              value={diastolicBp}
              onChange={(e) => setDiastolicBp(e.target.value)}
              placeholder="80"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
            />
          </div>
        </div>

        {/* Pulse */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
            <span>Pulse (BPM)</span>
          </label>
          <input
            id="vitals-pulse-input"
            type="number"
            value={pulseRate}
            onChange={(e) => setPulseRate(e.target.value)}
            placeholder="72"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
          />
        </div>

        {/* SpO2 */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-cyan-600" />
            <span>Oxygen (SpO2 %)</span>
          </label>
          <input
            id="vitals-spo2-input"
            type="number"
            min="60"
            max="100"
            value={spO2}
            onChange={(e) => setSpO2(e.target.value)}
            placeholder="98"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
          />
        </div>

        {/* Temperature */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            <span>Temp (°F)</span>
          </label>
          <input
            id="vitals-temp-input"
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="98.6"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
          />
        </div>

        {/* Blood Sugar */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Droplet className="w-3.5 h-3.5 text-blue-600" />
            <span>Blood Glucose (mg/dL)</span>
          </label>
          <input
            id="vitals-glucose-input"
            type="number"
            value={bloodGlucose}
            onChange={(e) => setBloodGlucose(e.target.value)}
            placeholder="110"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
          />
        </div>

        {/* Quick Normal Helper */}
        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-col justify-center">
          <span className="text-[11px] font-bold text-teal-900 block mb-1">
            Quick Auto-Fill (Normal):
          </span>
          <button
            type="button"
            id="fill-normal-vitals-btn"
            onClick={() => {
              setSystolicBp('120');
              setDiastolicBp('80');
              setPulseRate('74');
              setSpO2('98');
              setTemperature('98.6');
              setBloodGlucose('108');
            }}
            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Apply Standard Vitals
          </button>
        </div>
      </div>
    </div>
  );
};
