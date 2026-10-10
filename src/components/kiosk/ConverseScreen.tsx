import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Bot,
  User,
  HeartPulse,
} from 'lucide-react';
import { PatientDemographics, ChatMessage, Language, BodyRegion, VitalSigns } from '../../types';
import { translations } from '../../data/translations';
import { KioskSpeechRecognizer, speakText, stopSpeaking, isSpeechRecognitionSupported } from '../../lib/audio';

interface ConverseScreenProps {
  demographics: PatientDemographics;
  language: Language;
  bodyRegion?: BodyRegion;
  vitals?: VitalSigns;
  initialTranscript: ChatMessage[];
  onTranscriptChange: (messages: ChatMessage[]) => void;
  onRedFlagDetected: (reason: string) => void;
  onProceedToScan: () => void;
}

export const ConverseScreen: React.FC<ConverseScreenProps> = ({
  demographics,
  language,
  bodyRegion,
  vitals,
  initialTranscript,
  onTranscriptChange,
  onRedFlagDetected,
  onProceedToScan,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialTranscript.length > 0) return initialTranscript;

    let greetingText =
      language === 'ta'
        ? `வணக்கம் ${demographics.name} அவர்களே. இன்று உங்களுக்கு என்ன முக்கிய உடல்நலப் பிரச்சனை அல்லது அறிகுறிகள் உள்ளன?`
        : isHindi
        ? `नमस्ते ${demographics.name} जी। आज आपको क्या मुख्य परेशानी हो रही है?`
        : `Hello ${demographics.name}. What primary symptoms or health concern brings you in today?`;

    let quickReplies =
      language === 'ta'
        ? ['மார்பு வலி / மூச்சுத்திணறல்', 'காய்ச்சல் & தொடர் இருமல்', 'வயிற்று வலி / செரிமானக் கோளாறு', 'மூட்டு / முழங்கால் வலி', 'வழக்கமான இரத்த அழுத்தப் பரிசோதனை']
        : isHindi
        ? ['सीने में भारीपन / सांस फूलना', 'बुखार और खांसी', 'पेट दर्द या अपच', 'घुटनों / जोड़ों में दर्द', 'रूटीन चेकअप / बीपी']
        : ['Chest pain / Heavy pressure', 'Fever & Persistent cough', 'Stomach pain or Digestion', 'Knee or Joint ache', 'Routine Blood Pressure check'];

    if (bodyRegion === 'chest_heart') {
      greetingText =
        language === 'ta'
          ? `வணக்கம் ${demographics.name} அவர்களே. உடல் பகுதி வரைபடத்தில் 'மார்பு & இதயம்' பகுதியைத் தேர்ந்தெடுத்துள்ளீர்கள். இந்த மார்பு வலி எப்போது தொடங்கியது, வலி பாரமாக உள்ளதா அல்லது குத்துவது போல் உள்ளதா?`
          : isHindi
          ? `नमस्ते ${demographics.name} जी। आपने शरीर के मानचित्र पर 'सीना और दिल' चुना है। आपको सीने में कैसा दर्द या भारीपन महसूस हो रहा है, और यह कब शुरू हुआ?`
          : `Hello ${demographics.name}. I see you selected 'Chest & Heart' on the body map. When did this chest discomfort begin, and does it feel heavy or sharp?`;
      quickReplies =
        language === 'ta'
          ? ['மார்பில் கடுமையான பாரம் (இன்று காலை முதல்)', 'கூர்மையான குத்தும் வலி', 'இடது கைக்கு பரவும் வலி', 'எரிச்சல் உணர்வு / வாயு']
          : isHindi
          ? ['दबाव और भारीपन (आज सुबह से)', 'तेज़ चुभने वाला दर्द', 'बाएं हाथ में खिंचाव', 'हल्की जलन / गैस']
          : ['Heavy pressure (since morning)', 'Sharp stabbing discomfort', 'Radiating down left arm', 'Burning sensation / Acidity'];
    } else if (bodyRegion === 'abdomen_stomach') {
      greetingText =
        language === 'ta'
          ? `வணக்கம் ${demographics.name} அவர்களே. நீங்கள் 'வயிறு & செரிமானம்' பகுதியைத் தேர்ந்தெடுத்துள்ளீர்கள். வலி மேல் வயிற்றிலா அல்லது கீழ் வயிற்றிலா, மேலும் வாந்தி அல்லது எரிச்சல் உள்ளதா?`
          : isHindi
          ? `नमस्ते ${demographics.name} जी। आपने 'पेट और पाचन' चुना है। क्या दर्द ऊपरी या निचले पेट में है, और क्या उल्टी या दस्त की शिकायत है?`
          : `Hello ${demographics.name}. I see you marked 'Stomach & Abdomen'. Where is the pain located, and are you having any vomiting or burning?`;
      quickReplies =
        language === 'ta'
          ? ['மேல் வயிற்றில் எரிச்சல் மற்றும் வாயு', 'கடுமையான வயிற்றுப் பிடிப்பு வலி', 'வாந்தி மற்றும் குமட்டல்', 'உணவு சாப்பிட்ட பிறகு வலி']
          : isHindi
          ? ['ऊपरी पेट में जलन और गैस', 'तेज़ मरोड़ और दर्द', 'उल्टी और जी मिचलाना', 'खाना खाने के बाद दर्द']
          : ['Upper stomach burning / Acidity', 'Sharp cramping pain', 'Nausea and vomiting', 'Discomfort after eating'];
    } else if (bodyRegion === 'head_neck') {
      greetingText =
        language === 'ta'
          ? `வணக்கம் ${demographics.name} அவர்களே. நீங்கள் 'தலை & கழுத்து' பகுதியைத் தேர்ந்தெடுத்துள்ளீர்கள். தலைவலி திடீரெனத் தோன்றியதா, தலைசுற்றல் அல்லது பார்வை மங்கலாக உள்ளதா?`
          : isHindi
          ? `नमस्ते ${demographics.name} जी। आपने 'सिर और गर्दन' चुना है। क्या सिरदर्द अचानक हुआ, और क्या चक्कर या रोशनी से परेशानी है?`
          : `Hello ${demographics.name}. You indicated 'Head & Neck'. Is the headache sudden, and are you experiencing dizziness or light sensitivity?`;
      quickReplies =
        language === 'ta'
          ? ['தொடர் தலைவலி (2 நாட்களாக)', 'ஒற்றைத் தலைவலி (Migraine)', 'மயக்கம் மற்றும் தலைசுற்றல்', 'தொண்டை வலி மற்றும் சளி']
          : isHindi
          ? ['लगातार सिरदर्द (2 दिनों से)', 'माइग्रेन / एक तरफ दर्द', 'चक्कर और कमजोरी', 'गले में खराश और जुकाम']
          : ['Continuous headache (2+ days)', 'One-sided migraine throbbing', 'Dizziness & Lightheadedness', 'Sore throat & Cold'];
    }

    const initialGreeting: ChatMessage = {
      id: 'msg-init-1',
      sender: 'ai',
      text: greetingText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies,
      category: 'chief_complaint',
    };
    return [initialGreeting];
  });

  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [progressPercent, setProgressPercent] = useState(20);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<KioskSpeechRecognizer | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    onTranscriptChange(messages);
  }, [messages]);

  useEffect(() => {
    const latestAi = [...messages].reverse().find((m) => m.sender === 'ai');
    if (latestAi && messages.length === 1) {
      speakMessage(latestAi.id, latestAi.text);
    }
  }, []);

  const speakMessage = (id: string, text: string) => {
    if (speakingMsgId === id) {
      stopSpeaking();
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(id);
    speakText(text, language, () => {
      setSpeakingMsgId(null);
    });
  };

  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      alert(
        language === 'hi'
          ? 'इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है। कृपया नीचे दिए गए विकल्पों में से चुनें।'
          : language === 'ta'
          ? 'இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை. தயவுசெய்து தட்டச்சு செய்யவும் அல்லது விருப்பங்களைத் தேர்வு செய்யவும்.'
          : 'Speech recognition is not supported in this browser. Please use touch buttons or keyboard.'
      );
      return;
    }

    try {
      const recognizer = new KioskSpeechRecognizer({
        language,
        onTranscriptChange: (recognizedText, isFinal) => {
          setInputText(recognizedText);
          if (isFinal) {
            handleSendMessage(recognizedText);
          }
        },
        onEnd: () => setIsListening(false),
      });

      recognizerRef.current = recognizer;
      const started = recognizer.start();
      if (started) {
        setIsListening(true);
      }
    } catch (err) {
      console.error('Speech recognition failed to init:', err);
      setIsListening(false);
    }
  };

  // Client-side instant red-flag detector
  const checkClientRedFlags = (text: string): boolean => {
    const lower = text.toLowerCase();
    const urgentTerms = [
      'chest pain', 'crushing pain', 'radiating to left arm', 'heart attack',
      'breathless', 'shortness of breath', 'can\'t breathe',
      'slurred speech', 'facial droop', 'face drooping', 'paralysis', 'stroke',
      'coughing blood', 'vomiting blood', 'severe allergic',
      'सीने में दर्द', 'सांस फूल', 'बाएं हाथ में दर्द', 'लकवा', 'खून की उल्टी', 'बेहोश',
      'நெஞ்சு வலி', 'மார்பு வலி', 'மூச்சு திணறல்', 'மூச்சுத்திணறல்', 'இடது கை வலி', 'பக்கவாதம்', 'ரத்த வாந்தி', 'மயக்கம்', 'மாரடைப்பு'
    ];
    return urgentTerms.some((term) => lower.includes(term));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAiTyping) return;

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
    }
    stopSpeaking();
    setSpeakingMsgId(null);

    const isUrgent = checkClientRedFlags(text);

    const newPatientMsg: ChatMessage = {
      id: `msg-pt-${Date.now()}`,
      sender: 'patient',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRedFlag: isUrgent,
    };

    const updatedMessages = [...messages, newPatientMsg];
    setMessages(updatedMessages);
    setInputText('');

    if (isUrgent) {
      onRedFlagDetected(
        language === 'ta'
          ? 'கடுமையான மார்பு வலி, மூச்சுத்திணறல் அல்லது நரம்பியல் அறிகுறிகள் கண்டறியப்பட்டன'
          : isHindi
          ? 'सीने में तेज़ दर्द, सांस फूलना या न्यूरोलॉजिकल लक्षण'
          : 'High-risk cardiovascular or neurological acute symptoms reported'
      );
    }

    setIsAiTyping(true);

    try {
      const res = await fetch('/api/chat/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: updatedMessages,
          demographics,
          bodyRegion,
          vitals,
          currentStep: updatedMessages.length,
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch follow-up question');

      const data = await res.json();

      const aiResponseMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: data.nextQuestion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies || [],
        isRedFlag: data.isRedFlag,
        category: data.category || 'hpi',
      };

      if (data.progressPercent) {
        setProgressPercent(data.progressPercent);
      } else {
        setProgressPercent((prev) => Math.min(prev + 18, 95));
      }

      setMessages([...updatedMessages, aiResponseMsg]);

      speakMessage(aiResponseMsg.id, aiResponseMsg.text);

      if (data.isRedFlag) {
        onRedFlagDetected(
          data.redFlagReason ||
            (isHindi ? 'गंभीर मेडिकल इमरजेंसी लक्षण' : 'Acute medical red flag detected')
        );
      }
    } catch (err) {
      console.error('Follow up error:', err);
      const fallbackAiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: isHindi
          ? 'कृपया बताएं कि यह परेशानी कितने दिनों से है, और क्या आप पहले से कोई नियमित दवा ले रहे हैं?'
          : 'How many days have you had this issue, and are you currently taking any regular medications?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: isHindi
          ? ['2-3 दिनों से', 'आज से ही', 'नियमित दवाएं लेता हूँ', 'कोई दवा नहीं']
          : ['Past 2-3 days', 'Since today', 'Taking regular daily meds', 'No medications'],
        category: 'hpi',
      };
      setMessages([...updatedMessages, fallbackAiMsg]);
      setProgressPercent((prev) => Math.min(prev + 20, 90));
    } finally {
      setIsAiTyping(false);
    }
  };

  const latestAiMessage = [...messages].reverse().find((m) => m.sender === 'ai');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header & Intake Progress Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 mb-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {t.converseTitle}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  SOCRATES Clinical Intake
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t.converseSubtitle}
              </p>
            </div>
          </div>

          <button
            id="finish-interview-btn"
            type="button"
            onClick={onProceedToScan}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{t.proceedToScan}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>{t.intakeProgress}</span>
            <span className="text-teal-700">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-200 min-h-[420px] max-h-[560px] flex flex-col justify-between">
        {/* Messages Scroll Area */}
        <div className="overflow-y-auto space-y-4 pr-1 mb-4 flex-1">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            const isRedFlag = msg.isRedFlag;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {isAi && (
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs relative ${
                    isAi
                      ? isRedFlag
                        ? 'bg-rose-50 border-2 border-rose-400 text-slate-900'
                        : 'bg-slate-50 border border-slate-200/90 text-slate-900'
                      : 'bg-teal-600 text-white font-medium ml-auto'
                  }`}
                >
                  {isRedFlag && (
                    <div className="flex items-center gap-1 text-xs font-black text-rose-600 uppercase mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Priority Symptom Detected</span>
                    </div>
                  )}

                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text}
                  </p>

                  <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-black/5 text-[11px] opacity-75">
                    <span>{msg.timestamp}</span>

                    {isAi && (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.text)}
                        className={`p-1 rounded-md transition-colors flex items-center gap-1 ${
                          speakingMsgId === msg.id
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-500 hover:text-teal-700'
                        }`}
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{speakingMsgId === msg.id ? t.stopAudio : t.listenAudio}</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isAi && (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Typing Indicator */}
          {isAiTyping && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-teal-600" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce delay-200" />
                <span>
                  {language === 'ta'
                    ? 'மருத்துவக் கேள்வியை உருவாக்குகிறது...'
                    : isHindi
                    ? 'क्लिनिकल प्रश्न तैयार किया जा रहा है...'
                    : 'MediKiosk AI is formulating clinical question...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Real-Time Voice Waveform Animation when Listening */}
        {isListening && (
          <div className="mb-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-50 border-2 border-teal-300 rounded-2xl animate-pulse text-teal-900 text-xs font-bold">
            <Mic className="w-4 h-4 text-teal-600 animate-bounce" />
            <span>
              {language === 'ta'
                ? 'உங்கள் குரலைக் கேட்கிறது... தமிழில் இயல்பாகப் பேசுங்கள்'
                : isHindi
                ? 'आपकी आवाज़ सुन रहे हैं... हिन्दी या अंग्रेज़ी में बोलें'
                : 'Listening to your voice... Speak naturally in your language'}
            </span>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-1.5 h-3 bg-teal-600 rounded-full animate-pulse" />
              <span className="w-1.5 h-6 bg-teal-600 rounded-full animate-pulse delay-75" />
              <span className="w-1.5 h-4 bg-teal-600 rounded-full animate-pulse delay-150" />
              <span className="w-1.5 h-7 bg-teal-600 rounded-full animate-pulse delay-100" />
              <span className="w-1.5 h-2 bg-teal-600 rounded-full animate-pulse delay-200" />
            </div>
          </div>
        )}

        {/* Touch-Friendly Quick Reply Chips */}
        {latestAiMessage?.quickReplies && latestAiMessage.quickReplies.length > 0 && !isAiTyping && (
          <div className="mb-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              {t.quickRepliesLabel}
            </span>
            <div className="flex flex-wrap gap-2">
              {latestAiMessage.quickReplies.map((replyText, idx) => (
                <button
                  key={idx}
                  id={`quick-reply-btn-${idx}`}
                  type="button"
                  onClick={() => handleSendMessage(replyText)}
                  className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border-2 border-slate-200 hover:border-teal-400 font-bold text-xs sm:text-sm transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  {replyText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Input Controls (Microphone + Input Bar + Send) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-100"
        >
          {/* Big Voice Mic Button */}
          <button
            id="toggle-voice-mic-btn"
            type="button"
            onClick={toggleVoiceRecognition}
            className={`w-12 sm:w-14 h-12 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-200'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
            title="Speak your answer"
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              id="patient-chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? t.listeningPlaceholder : t.typeOrSpeakPlaceholder}
              disabled={isAiTyping}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-hidden font-medium text-slate-900 text-sm sm:text-base placeholder:text-slate-400"
            />
          </div>

          {/* Send Button */}
          <button
            id="send-chat-msg-btn"
            type="submit"
            disabled={!inputText.trim() || isAiTyping}
            className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
