import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, ArrowLeft, Recycle, Shield, Wrench, Package, CheckCircle, Download, X } from 'lucide-react';

const EVENT_ICONS: Record<string, string> = {
  REGISTERED: '📋', DIAGNOSED: '🔍', REPAIR_ATTEMPT: '🔧', REPAIRED: '✅',
  BEYOND_REPAIR_CONFIRMED: '⚠️', RECOVERY_STARTED: '♻️', COMPONENT_RECOVERED: '🔩',
  RECYCLING_STARTED: '🌱', RECOVERY_COMPLETED: '🎉', CERTIFICATE_ISSUED: '📜',
};

export const ProductPassport: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [passport, setPassport] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCert, setShowCert] = useState(false);
  const [loadingCert, setLoadingCert] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/recovery/passport/${caseId}`);
        setPassport(res.data.data);
      } catch (e) {}
      finally { setLoading(false); }
    };
    load();
  }, [caseId]);

  const loadCertificate = async () => {
    setLoadingCert(true);
    try {
      const res = await api.get(`/recovery/certificate/${caseId}`);
      setCertificate(res.data.data);
      setShowCert(true);
    } catch (e) {} finally { setLoadingCert(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!passport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Passport Found</h2>
          <p className="text-gray-500 mb-6">A product passport is created when a technician marks a case for recovery.</p>
          <button onClick={() => navigate(`/cases/${caseId}`)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Back to Case</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">RepairConnect Product Passport</h1>
              <p className="text-gray-500 text-sm">Lifecycle record for {passport.productName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Product Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Product</p>
              <p className="font-bold text-gray-900">{passport.productName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Category</p>
              <p className="font-semibold text-gray-800">{passport.category}</p>
            </div>
            {passport.brand && <div><p className="text-xs text-gray-500 mb-1">Brand</p><p className="font-semibold text-gray-800">{passport.brand}</p></div>}
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${passport.recoveryCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {passport.currentStatus}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Passport ID</p>
              <p className="font-mono text-sm text-gray-700">RC-{passport._id?.toString().slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-5">Lifecycle Timeline</h2>
          <div className="relative">
            {passport.events?.map((event: any, i: number) => (
              <div key={i} className="flex gap-4 pb-8 last:pb-0 relative">
                {i < passport.events.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-100" />
                )}
                <div className="w-10 h-10 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center flex-shrink-0 text-lg z-10">
                  {EVENT_ICONS[event.type] || '📌'}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{event.type.replace(/_/g, ' ')}</p>
                    {event.actor && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{event.actor}</span>}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                  <p className="text-gray-400 text-xs mt-1">{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            ))}
            {!passport.events?.length && (
              <p className="text-gray-400 text-sm text-center py-4">No lifecycle events recorded yet.</p>
            )}
          </div>
        </div>

        {/* Certificate button */}
        {passport.recoveryCompleted && (
          <button onClick={loadCertificate} disabled={loadingCert} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            {loadingCert ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            View Recovery Certificate
          </button>
        )}
      </div>

      {/* Certificate Modal */}
      {showCert && certificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Recycle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">RepairConnect Recovery Certificate</h2>
                    <p className="text-xs text-gray-500">Certificate ID: {certificate.certificateId}</p>
                  </div>
                </div>
                <button onClick={() => setShowCert(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700">DEMO CERTIFICATE</span>
                <span className="text-xs text-amber-600">— For demonstration purposes only.</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Product', value: certificate.product?.name },
                  { label: 'Category', value: certificate.product?.category },
                  { label: 'Brand', value: certificate.product?.brand || 'Unknown' },
                  { label: 'Recovery Pathway', value: certificate.pathway?.replace(/_/g, ' ') },
                  { label: 'Recovery Partner', value: certificate.recoveryPartner },
                  { label: 'Verified Weight', value: certificate.verifiedWeightKg ? `${certificate.verifiedWeightKg} kg` : 'Not verified' },
                  { label: 'Issue Date', value: new Date(certificate.issueDate).toLocaleDateString('en-IN') },
                  { label: 'Status', value: certificate.status?.replace(/_/g, ' ') },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{row.value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-900">Recovery Completed</span>
                </div>
                <p className="text-xs text-gray-500">This certificate documents the responsible recovery journey of the above product through RepairConnect's partner network.</p>
              </div>
              <p className="text-xs text-gray-400 mt-3 italic text-center">{certificate.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
