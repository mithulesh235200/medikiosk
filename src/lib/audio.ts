/**
 * Web Speech API utilities for browser-based speech recognition and synthesis.
 * Built for hospital kiosk usage with language switching (English / Hindi / Tamil).
 */

import { Language } from '../types';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean('speechSynthesis' in window);
}

export interface SpeechRecognizerOptions {
  language: Language;
  onTranscriptChange: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export function getLanguageCode(lang: Language): string {
  switch (lang) {
    case 'hi':
      return 'hi-IN';
    case 'ta':
      return 'ta-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

export class KioskSpeechRecognizer {
  private recognition: any = null;
  private isRunning: boolean = false;

  constructor(private options: SpeechRecognizerOptions) {
    if (isSpeechRecognitionSupported()) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = getLanguageCode(options.language);

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          this.options.onTranscriptChange(currentText, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition event warning:', event.error);
        if (this.options.onError) {
          this.options.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isRunning = false;
        if (this.options.onEnd) {
          this.options.onEnd();
        }
      };
    }
  }

  public setLanguage(language: Language) {
    if (this.recognition) {
      this.recognition.lang = getLanguageCode(language);
    }
  }

  public start(): boolean {
    if (!this.recognition || this.isRunning) return false;
    try {
      this.recognition.start();
      this.isRunning = true;
      return true;
    } catch (err) {
      console.warn('Recognition start exception:', err);
      return false;
    }
  }

  public stop() {
    if (!this.recognition || !this.isRunning) return;
    try {
      this.recognition.stop();
      this.isRunning = false;
    } catch (err) {
      console.warn('Recognition stop exception:', err);
    }
  }

  public active(): boolean {
    return this.isRunning;
  }
}

export function speakText(
  text: string,
  language: Language = 'en',
  onEnd?: () => void
): boolean {
  if (!isSpeechSynthesisSupported()) {
    if (onEnd) onEnd();
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageCode(language);
    utterance.rate = 0.95; // Slightly measured pace for clear comprehension
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language === 'hi' ? 'hi' : language === 'ta' ? 'ta' : 'en';
    const matchingVoice =
      voices.find(
        (v) =>
          v.lang.startsWith(langPrefix) &&
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('India'))
      ) || voices.find((v) => v.lang.startsWith(langPrefix));

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    if (onEnd) onEnd();
    return false;
  }
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
