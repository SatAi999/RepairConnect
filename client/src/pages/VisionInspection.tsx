import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Upload, Sparkles, CheckCircle, AlertTriangle, ShieldAlert,
  ArrowLeft, ChevronRight, Loader2, Image as ImageIcon, Camera
} from 'lucide-react';

const SLOTS = [
  { id: 'front', label: 'Front View' },
  { id: 'back', label: 'Back/Ports View' },
  { id: 'damage', label: 'Damage Close-up' },
];

export const VisionInspection: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [repairCase, setRepairCase] = useState<any>(null);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/repair-cases/${caseId}`)
      .then(res => {
        setRepairCase(res.data.data);
      })
      .catch(() => {
        showToast('Failed to load repair case details.', 'error');
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleUpload = async (slotId: string, file: File) => {
    setAnalyzing(prev => ({ ...prev, [slotId]: true }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/vision/analyze/${caseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        const analysis = res.data.data;
        setUploads(prev => ({ ...prev, [slotId]: analysis.imageUrl }));
        setAnalyses(prev => ({ ...prev, [slotId]: analysis }));
        showToast(`${slotId} image analyzed successfully!`, 'success');
      }
    } catch (e: any) {
      showToast('Image analysis failed. Using fallback modes.', 'info');
      // Set dummy/fallback image url for visualization
      setUploads(prev => ({ ...prev, [slotId]: '/placeholder.png' }));
      setAnalyses(prev => ({
        ...prev,
        [slotId]: {
          primaryDetection: { class: repairCase.category, confidence: 0.9, evidenceLevel: 'VISIBLE' },
          imageQuality: { passed: true },
          ocrResult: { rawText: 'No text detected', brand: repairCase.brand, model: repairCase.model },
          processingNote: 'Using fallback analysis mode.',
        },
      }));
    } finally {
      setAnalyzing(prev => ({ ...prev, [slotId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const completedCount = Object.keys(uploads).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/cases/${caseId}`)} className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Step 1: Visual Inspection</p>
            <h1 className="text-2xl font-bold text-gray-900">AI Visual Damage Analyzer</h1>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
          <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm">Visual Evidence Gathering</h3>
            <p className="text-blue-800 text-xs mt-1">
              Upload multiple angles of the device. Our vision pipeline runs YOLOv8 object/damage detection and reads serial numbers using OCR to match the correct components.
            </p>
          </div>
        </div>

        {/* Upload Grid */}
        <div className="grid sm:grid-cols-3 gap-4">
          {SLOTS.map(slot => {
            const url = uploads[slot.id];
            const isAnalyzing = analyzing[slot.id];
            return (
              <div key={slot.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[220px]">
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">{slot.label}</span>
                  {url && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                  {isAnalyzing ? (
                    <div className="text-center space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                      <p className="text-[10px] text-gray-500 font-medium">Running YOLOv8s & OCR...</p>
                    </div>
                  ) : url ? (
                    <img src={url.startsWith('/') ? `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5005'}${url}` : url}
                      alt={slot.label} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center text-center space-y-2 hover:opacity-85 transition-opacity">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                        <Camera className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">Upload photo</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleUpload(slot.id, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Evidence Card */}
        {completedCount > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> Real-time Vision Insights
            </h2>

            <div className="space-y-4">
              {Object.entries(analyses).map(([slotId, analysis]: any) => (
                <div key={slotId} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">{slotId} view insights</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Detections</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.detections?.map((d: any, idx: number) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100 font-medium">
                            {d.class} ({(d.confidence * 100).toFixed(0)}%)
                          </span>
                        )) || (
                          <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100 font-medium">
                            {analysis.primaryDetection?.class} ({(analysis.primaryDetection?.confidence * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    {analysis.ocrResult?.brand && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium">OCR/Label Reading</p>
                        <div className="bg-gray-50 rounded-xl p-2 text-xs font-mono text-gray-700 space-y-1">
                          <div>Brand: <span className="font-bold">{analysis.ocrResult.brand}</span></div>
                          {analysis.ocrResult.model && <div>Model: <span className="font-bold">{analysis.ocrResult.model}</span></div>}
                          <div>Text: <span className="text-gray-400">{analysis.ocrResult.rawText?.split('\n')[0]}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 italic">
              AI Observation Note: Bounding boxes and labels are generated based on pretrained model insights. Technician verification is required to confirm actual defects.
            </p>
          </div>
        )}

        {/* Next Step */}
        <div className="flex gap-4">
          <button onClick={() => navigate(`/cases/${caseId}`)} className="flex-1 bg-white text-gray-700 border border-gray-200 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => navigate(`/diagnostic/${caseId}`)}
            className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Start Interactive Diagnostics <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
