import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Upload, Camera, FileText, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle
} from 'lucide-react';

export const RepairAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Wizard Step
  const [step, setStep] = useState(1);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Laptop');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  
  // Media states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Analysis Loader states
  const [analyzing, setAnalyzing] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds the 5MB limit.', 'error');
        return;
      }

      setSelectedFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setUploadProgress(0);
    }
  };

  const handleMediaUpload = async () => {
    if (!selectedFile) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/repair-cases/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setUploadProgress(percent);
        },
      });
      if (res.data?.success) {
        setMediaUrl(res.data.data.url);
        showToast('Image uploaded successfully.', 'success');
        setStep(2); // Auto proceed to details
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'File upload failed.';
      showToast(errMsg, 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !brand || !problemDescription) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setAnalyzing(true);
    setLoaderMessage('Registering repair profile...');

    try {
      // 1. Create RepairCase record
      const caseRes = await api.post('/repair-cases', {
        itemName,
        category,
        brand,
        model,
        problemDescription,
        media: mediaUrl ? [mediaUrl] : [],
      });

      if (!caseRes.data?.success) {
        throw new Error('Case registration failed.');
      }

      const caseId = caseRes.data.data._id;

      // 2. Set up loader message transitions representing server execution bounds
      const loaderTimers = [
        setTimeout(() => setLoaderMessage('Identifying visible damage...'), 1200),
        setTimeout(() => setLoaderMessage('Evaluating possible causes...'), 2400),
        setTimeout(() => setLoaderMessage('Preparing safe troubleshooting steps...'), 3600),
        setTimeout(() => setLoaderMessage('Calculating repair worthiness index...'), 4800),
      ];

      // 3. Trigger AI Diagnosis Analysis
      const analyzeRes = await api.post(`/repair-cases/${caseId}/analyze`);

      // Clear timers
      loaderTimers.forEach(clearTimeout);

      if (analyzeRes.data?.success) {
        showToast('Analysis completed successfully!', 'success');
        navigate(`/cases/${caseId}`);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || 'AI analysis could not complete.';
      showToast(errMsg, 'error');
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="max-w-md w-full mx-auto my-24 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="relative flex items-center justify-center">
            <RefreshCw className="h-12 w-12 text-primary-500 animate-spin" />
            <Camera className="h-5 w-5 text-primary-600 absolute" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Analyzing Your Item</h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">Please wait while Gemini processes the symptoms.</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-full text-xs font-semibold text-primary-700 animate-pulse">
            {loaderMessage}
          </div>
        </div>
      </div>
    );
  }

  if (createdCaseId) {
    return (
      <div className="max-w-md w-full mx-auto my-12 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">🎉</span>
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Case Created Successfully</h2>
          <p className="text-xs text-gray-500 mt-2">
            Your repair case has been registered. Now, choose how you want to proceed with our intelligence engines:
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate(`/vision/${createdCaseId}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            🔍 Run AI Visual Inspection
          </button>
          <button
            onClick={() => navigate(`/diagnostic/${createdCaseId}`)}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            📋 Start Interactive Diagnostics
          </button>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => navigate(`/cases/${createdCaseId}`)}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium transition"
          >
            Skip to Case Details &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full mx-auto my-12 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      
      {/* Wizard Progress Steps Indicator */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 text-xs font-bold rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</span>
          <span className={`text-xs font-bold ${step === 1 ? 'text-gray-900' : 'text-gray-400'}`}>Upload Media</span>
        </div>
        <div className="border-t border-gray-200 flex-1 mx-4" />
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 text-xs font-bold rounded-full flex items-center justify-center ${step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</span>
          <span className={`text-xs font-bold ${step === 2 ? 'text-gray-900' : 'text-gray-400'}`}>Describe Issue</span>
        </div>
      </div>

      {/* ==========================================
         STEP 1: MEDIA UPLOAD FORM
         ========================================== */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Upload Damaged Item Media</h2>
            <p className="text-xs text-gray-500 mt-1">Please provide a clear picture of the damage area to help AI verification.</p>
          </div>

          <div className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-2xl p-8 flex flex-col items-center justify-center relative cursor-pointer group bg-gray-50/50">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {mediaPreview ? (
              <img src={mediaPreview} alt="Preview" className="max-h-56 rounded-xl object-contain shadow" />
            ) : (
              <div className="text-center flex flex-col items-center gap-3">
                <span className="p-3 bg-white text-gray-400 rounded-xl group-hover:text-primary-500 shadow-sm transition">
                  <Upload className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-900">Drag photo here, or browse files</p>
                  <p className="text-[10px] text-gray-400 mt-1">Supports PNG, JPEG, or MP4 up to 5MB</p>
                </div>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs font-semibold flex items-center justify-between">
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          {uploadingMedia && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setStep(2)}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
            >
              Skip upload &rarr;
            </button>

            <button
              disabled={!selectedFile || uploadingMedia}
              onClick={handleMediaUpload}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingMedia ? 'Uploading...' : 'Next Step'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
         STEP 2: FORM TEXT DETAILS
         ========================================== */}
      {step === 2 && (
        <form onSubmit={handleAnalyze} className="flex flex-col gap-5">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Provide Item Details</h2>
            <p className="text-xs text-gray-500 mt-1">Describe the specific symptoms to formulate the AI diagnosis.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Item Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-lg"
              >
                <option value="Laptop">Laptop</option>
                <option value="Smartphone">Smartphone</option>
                <option value="Bicycle">Bicycle</option>
                <option value="Refrigerator">Refrigerator</option>
                <option value="Electronics">Electronics</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Item Name</label>
              <input
                type="text"
                required
                placeholder="e.g. MacBook Pro"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Brand</label>
              <input
                type="text"
                required
                placeholder="e.g. Apple"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Model (Optional)</label>
              <input
                type="text"
                placeholder="e.g. A2338 (M1 2020)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Problem Description</label>
            <textarea
              rows={4}
              required
              placeholder="e.g. The laptop turns on and keyboard lights up, but the display remains completely black."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className="w-full px-3 py-2.5 text-xs border border-gray-300 rounded-lg leading-relaxed"
            />
          </div>

          {/* High voltage disclaimer alert warning */}
          {['Laptop', 'Refrigerator'].includes(category) && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex gap-3 text-xs">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Mains Electric Hazard</p>
                <p className="mt-0.5 text-orange-700 font-medium">This category uses high voltage components. Never open the casing without isolation safety checks.</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Media Upload
            </button>

            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg text-xs flex items-center gap-2"
            >
              Start AI Diagnosis <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
