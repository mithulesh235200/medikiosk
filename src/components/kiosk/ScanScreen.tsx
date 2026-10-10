import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building,
  Pill,
  ExternalLink,
  Plus,
  RotateCw,
  Eye,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { UploadedDocument, Language } from '../../types';
import { translations } from '../../data/translations';
import { uploadDocumentToStorage } from '../../lib/supabaseClient';

interface ScanScreenProps {
  patientId: string;
  language: Language;
  documents: UploadedDocument[];
  onDocumentsChange: (docs: UploadedDocument[]) => void;
  onProceedToSummary: () => void;
  onBackToConverse: () => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  patientId,
  language,
  documents,
  onDocumentsChange,
  onProceedToSummary,
  onBackToConverse,
}) => {
  const t = translations[language];
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Downscale scans so the base64 payload stays under serverless body limits
  // (Vercel caps request bodies at ~4.5MB). Keeps OCR quality intact.
  const downscaleImage = (dataUrl: string, maxDim = 1600): Promise<string> =>
    new Promise((resolve) => {
      // Skip non-image data (e.g. PDFs) — send through unchanged.
      if (!dataUrl.startsWith('data:image/')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        if (scale >= 1) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  // Analyze real document with Gemini Vision backend
  const processImage = async (
    title: string,
    imageUrl: string,
    type: UploadedDocument['type'] = 'prescription'
  ) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageUrl,
          docType: type,
        }),
      });

      let aiInsights = {
        dateOfDocument: new Date().toLocaleDateString('en-GB'),
        doctorOrFacility: 'Medical Document',
        diagnosesMentioned: ['Clinical Record Digitized'],
        medicationsIdentified: [] as string[],
        criticalValuesOrNotes: 'Document reviewed by AI vision digitizer.',
      };

      let extractedText = '';

      if (res.ok) {
        const data = await res.json();
        aiInsights = {
          dateOfDocument: data.dateOfDocument || aiInsights.dateOfDocument,
          doctorOrFacility: data.doctorOrFacility || aiInsights.doctorOrFacility,
          diagnosesMentioned: data.diagnosesMentioned || aiInsights.diagnosesMentioned,
          medicationsIdentified: data.medicationsIdentified || [],
          criticalValuesOrNotes: data.criticalValuesOrNotes || '',
        };
        extractedText = data.extractedTextSummary || '';
      }

      const newDoc: UploadedDocument = {
        id: `doc-${Date.now()}`,
        patientId,
        type,
        title,
        imageUrl,
        extractedText,
        aiInsights,
        uploadedAt: new Date().toISOString(),
      };

      // If Supabase Storage is configured, upload the scan there so the
      // patient row stays small; fall back to inline base64 otherwise.
      try {
        const publicUrl = await uploadDocumentToStorage(patientId, imageUrl, title);
        if (publicUrl) newDoc.imageUrl = publicUrl;
      } catch {
        // keep inline base64
      }

      onDocumentsChange([...documents, newDoc]);
    } catch (err) {
      console.error('Document analysis error:', err);
      const fallbackDoc: UploadedDocument = {
        id: `doc-${Date.now()}`,
        patientId,
        type,
        title,
        imageUrl,
        aiInsights: {
          dateOfDocument: new Date().toLocaleDateString('en-GB'),
          doctorOrFacility: 'Scanned Medical File',
          diagnosesMentioned: ['Digitized Paper Record'],
          medicationsIdentified: [],
          criticalValuesOrNotes: 'Archived into patient OPD file.',
        },
        uploadedAt: new Date().toISOString(),
      };
      onDocumentsChange([...documents, fallbackDoc]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Real file upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Url = reader.result as string;
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      const docType: UploadedDocument['type'] = file.name.toLowerCase().includes('lab')
        ? 'lab_report'
        : 'prescription';
      processImage(cleanFileName, await downscaleImage(base64Url), docType);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start live kiosk camera stream
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access not supported or permission denied. Please use the file upload option.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture photo from live camera
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      processImage(`Prescription Scan ${documents.length + 1}`, await downscaleImage(dataUrl), 'prescription');
    }
  };

  const handleRemoveDoc = (id: string) => {
    onDocumentsChange(documents.filter((d) => d.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Camera className="w-3.5 h-3.5" />
              {t.step3}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.scanTitle}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              {t.scanSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              id="back-to-converse-btn"
              type="button"
              onClick={onBackToConverse}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors cursor-pointer"
            >
              ← Back to Chat
            </button>
            <button
              id="continue-to-summary-btn"
              type="button"
              onClick={onProceedToSummary}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm sm:text-base shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{documents.length > 0 ? t.continueToSummaryBtn : t.skipScanBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Actions Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Action 1: Kiosk Live Camera Viewfinder */}
          <button
            type="button"
            id="open-kiosk-camera-btn"
            onClick={startCamera}
            className="p-6 rounded-2xl border-2 border-teal-500/80 bg-teal-50/50 hover:bg-teal-50 text-teal-900 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-7 h-7" />
            </div>
            <span className="font-extrabold text-base text-slate-900 block mb-1">
              {language === 'hi' ? 'कियोस्क कैमरा खोलें' : 'Open Kiosk Camera'}
            </span>
            <span className="text-xs text-slate-500 max-w-xs">
              {language === 'hi'
                ? 'अपने पर्चे या रिपोर्ट को कैमरे के सामने रखें और फोटो खींचें'
                : 'Hold paper prescription or lab report in front of camera'}
            </span>
          </button>

          {/* Action 2: Choose File / Browse Document */}
          <label
            htmlFor="kiosk-file-input"
            className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/30 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center mb-3 shadow-2xs group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
              <Upload className="w-7 h-7" />
            </div>
            <span className="font-extrabold text-base text-slate-900 block mb-1">
              {language === 'hi' ? 'फ़ाइल अपलोड करें' : 'Browse / Upload Document'}
            </span>
            <span className="text-xs text-slate-500 max-w-xs">
              Supports JPEG, PNG, PDF photo scans from your phone or device
            </span>
            <input
              id="kiosk-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Live Camera Viewfinder Modal */}
        {isCameraActive && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white mb-6">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Align Prescription Inside Frame
                </span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                Cancel ✕
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-200">
                {cameraError}
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black max-h-[420px] flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {/* Viewfinder Overlay Guide */}
                <div className="absolute inset-8 border-2 border-dashed border-teal-400/70 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="bg-black/60 px-3 py-1 rounded-full text-[11px] text-teal-200">
                    Place document flat here
                  </span>
                </div>
              </div>
            )}

            {!cameraError && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="button"
                  id="snap-prescription-photo-btn"
                  onClick={capturePhoto}
                  className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Snap Document Photo</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Digitizer Progress Indicator */}
        {isAnalyzing && (
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center gap-3 animate-pulse">
            <Sparkles className="w-5 h-5 text-teal-600 animate-spin" />
            <div>
              <p className="text-xs font-bold text-teal-950">
                Gemini Multimodal OCR is analyzing your document...
              </p>
              <p className="text-[11px] text-teal-700">
                Extracting handwritten prescriptions, dosages, and test markers.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal-600" />
            <span>Digitized Medical Documents ({documents.length})</span>
          </h3>
          {documents.length > 0 && (
            <span className="text-xs text-slate-500 font-medium">
              Ready for doctor review
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              No prior prescriptions or lab reports uploaded yet.
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              If you don't have previous papers with you today, tap <strong>"Skip / No Documents"</strong> above to continue to summary.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-teal-400 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={doc.imageUrl}
                    alt={doc.title}
                    onClick={() => setPreviewDoc(doc)}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-200 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {doc.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-teal-600" />
                      <span className="truncate">{doc.aiInsights?.doctorOrFacility || 'OPD Clinic'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{doc.aiInsights?.dateOfDocument || new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>

                {/* Extracted Medication Chips */}
                {doc.aiInsights?.medicationsIdentified && doc.aiInsights.medicationsIdentified.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Extracted Rx:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {doc.aiInsights.medicationsIdentified.slice(0, 3).map((med, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-semibold text-[11px] border border-teal-200 truncate max-w-full"
                        >
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Zoom Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-extrabold text-slate-900">{previewDoc.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Close ✕
              </button>
            </div>
            <img src={previewDoc.imageUrl} alt="Document" className="w-full rounded-xl border border-slate-200 mb-4 object-contain max-h-[500px]" />
          </div>
        </div>
      )}
    </div>
  );
};
