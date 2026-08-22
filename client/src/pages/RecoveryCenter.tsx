import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Recycle, CheckCircle, Circle, AlertTriangle, Package,
  TrendingUp, Zap, Shield, ChevronRight, Loader2,
  ArrowLeft, Star, Clock, Truck
} from 'lucide-react';

const PICKUP_STATUSES = [
  'OFFER_ACCEPTED','PICKUP_SCHEDULED','PICKUP_ASSIGNED',
  'PICKUP_IN_PROGRESS','ITEM_COLLECTED','RECEIVED_BY_PARTNER',
  'PROCESSING','RECOVERY_COMPLETED'
];
const PICKUP_LABELS: Record<string, string> = {
  OFFER_ACCEPTED: 'Offer Accepted', PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKUP_ASSIGNED: 'Pickup Agent Assigned', PICKUP_IN_PROGRESS: 'Pickup In Progress',
  ITEM_COLLECTED: 'Item Collected', RECEIVED_BY_PARTNER: 'Received by Partner',
  PROCESSING: 'Processing', RECOVERY_COMPLETED: 'Recovery Completed',
};

const potentialColors: Record<string, string> = {
  NONE: 'bg-gray-100 text-gray-500', LOW: 'bg-yellow-100 text-yellow-700',
  MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-green-100 text-green-700',
};

export const RecoveryCenter: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [repairCase, setRepairCase] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [pickup, setPickup] = useState<any>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingOffer, setAcceptingOffer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'tracking' | 'components'>('overview');

  const load = async () => {
    try {
      const [caseRes, assessRes, offersRes, pickupRes, inspRes] = await Promise.allSettled([
        api.get(`/repair-cases/${caseId}`),
        api.get(`/recovery/assess/${caseId}`),
        api.get(`/recovery/offers/${caseId}`),
        api.get(`/recovery/pickup/${caseId}`),
        api.get(`/inspection/${caseId}`),
      ]);
      if (caseRes.status === 'fulfilled') setRepairCase(caseRes.value.data.data);
      if (assessRes.status === 'fulfilled') setAssessment(assessRes.value.data.data);
      if (offersRes.status === 'fulfilled') setOffers(offersRes.value.data.data || []);
      if (pickupRes.status === 'fulfilled') setPickup(pickupRes.value.data.data);
      if (inspRes.status === 'fulfilled') setInspection(inspRes.value.data.data);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [caseId]);

  const handleAcceptOffer = async (offerId: string) => {
    setAcceptingOffer(offerId);
    try {
      await api.post(`/recovery/offers/${caseId}/accept`, { offerId });
      showToast('Offer accepted! Pickup will be scheduled.', 'success');
      load();
      setActiveTab('tracking');
    } catch (e: any) {
      showToast(e.response?.data?.error?.message || 'Failed to accept offer.', 'error');
    } finally { setAcceptingOffer(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Recovery Center...</p>
        </div>
      </div>
    );
  }

  const isRecoveryEligible = repairCase && ['RECOVERY_ELIGIBLE','IN_RECOVERY','RECOVERY_COMPLETED'].includes(repairCase.status);

  if (!isRecoveryEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <Recycle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Recovery Not Available</h2>
          <p className="text-gray-500 mb-6">Recovery mode is only available after a technician has confirmed the device cannot be repaired.</p>
          <button onClick={() => navigate(`/cases/${caseId}`)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Back to Case
          </button>
        </div>
      </div>
    );
  }

  const currentPickupIdx = pickup ? PICKUP_STATUSES.indexOf(pickup.status) : -1;
  const hasAcceptedOffer = offers.some(o => o.status === 'ACCEPTED') || pickup;
  const indMin = assessment?.indicativeValueMin;
  const indMax = assessment?.indicativeValueMax;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-green-200 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Recycle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">DON'T SCRAP IT BLIND.</h1>
              <p className="text-green-200 mt-1">Discover the most valuable and responsible next life for your product.</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 inline-flex items-center gap-2">
            <Package className="w-4 h-4 text-green-200" />
            <span className="text-sm font-medium">{repairCase?.itemName} — {repairCase?.category}</span>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
              repairCase?.status === 'RECOVERY_COMPLETED' ? 'bg-green-500' :
              repairCase?.status === 'IN_RECOVERY' ? 'bg-blue-400' : 'bg-yellow-400 text-yellow-900'
            }`}>
              {repairCase?.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {(['overview','offers','tracking','components'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-4 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
              {tab === 'offers' ? `Offers (${offers.filter(o => o.status === 'PENDING').length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Circularity Hierarchy Signature Visual */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Recycle className="w-5 h-5 text-green-600" /> Circularity Hierarchy Status
              </h2>
              <div className="flex flex-col items-center py-4 bg-gray-50 rounded-xl space-y-2">
                {[
                  { label: 'REPAIR', icon: '🔧', status: '❌ Not viable' },
                  { label: 'REUSE', icon: '🔄', status: assessment?.reusePotential === 'HIGH' || assessment?.reusePotential === 'MEDIUM' ? '🟢 Potential' : '❌ Not viable' },
                  { label: 'REFURBISH', icon: '🛠', status: assessment?.refurbishmentPotential === 'HIGH' || assessment?.refurbishmentPotential === 'MEDIUM' ? '🟢 Potential' : '❌ Not viable' },
                  { label: 'COMPONENT RECOVERY', icon: '🧩', status: assessment?.recommendedPathway === 'COMPONENT_RECOVERY' ? '🟢 RECOMMENDED' : '🟡 Evaluated' },
                  { label: 'MATERIAL RECYCLING', icon: '♻️', status: assessment?.recommendedPathway === 'MATERIAL_RECYCLING' ? '🟢 RECOMMENDED' : '🟡 Secondary' },
                  { label: 'DISPOSAL', icon: '⚪', status: '⚪ Zero Waste Pathway' },
                ].map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex items-center justify-between w-full px-8 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-xs font-bold text-gray-700 tracking-wide">{item.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status.startsWith('🟢') ? 'bg-green-100 text-green-800 border border-green-200' :
                        item.status.startsWith('🟡') ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        item.status.startsWith('❌') ? 'bg-red-50 text-red-650 border border-red-100' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {idx < 5 && <div className="text-gray-300 font-bold text-xs select-none">↓</div>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Circularity Pathway */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" /> Recovery Pathway
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Technician Inspection', done: !!inspection },
                  { label: 'Beyond Repair Confirmed', done: !!inspection },
                  { label: 'Recovery Assessment', done: !!assessment },
                  { label: 'Recovery Offers', done: offers.length > 0 },
                  { label: 'Offer Accepted & Pickup', done: !!pickup },
                  { label: 'Recovery Completed', done: pickup?.status === 'RECOVERY_COMPLETED' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.done
                      ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                    <span className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspection */}
            {inspection && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" /> Technician Decision
                </h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${inspection.repairDecision === 'BEYOND_REPAIR' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inspection.repairDecision.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-gray-600 text-sm italic">"{inspection.inspectionNotes}"</p>
                {inspection.affectedComponents?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inspection.affectedComponents.map((c: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assessment */}
            {assessment ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-green-600" /> Recovery Potential Assessment
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Reuse Potential', value: assessment.reusePotential },
                    { label: 'Refurbishment', value: assessment.refurbishmentPotential },
                    { label: 'Component Recovery', value: assessment.componentRecoveryPotential },
                    { label: 'Material Recovery', value: assessment.materialRecoveryPotential },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${potentialColors[item.value] || 'bg-gray-100 text-gray-500'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-green-700 uppercase font-semibold mb-1">Recommended Pathway</p>
                  <p className="text-green-900 font-bold">{assessment.recommendedPathway?.replace(/_/g, ' ')}</p>
                  <p className="text-green-700 text-sm mt-1">{assessment.pathwayReason}</p>
                </div>

                {/* Indicative value */}
                {indMin && indMax && (
                  <div className="border-2 border-amber-200 rounded-xl p-4 bg-amber-50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-amber-700 uppercase font-semibold">Indicative Recovery Value</p>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">DEMO DATA</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">₹{indMin.toLocaleString()} – ₹{indMax.toLocaleString()}</p>
                    <p className="text-xs text-amber-600 mt-1">{assessment.valuationNote}</p>
                    <p className="text-xs text-amber-600 mt-1">Request actual partner offers below for real market prices.</p>
                  </div>
                )}

                {/* Material streams */}
                {assessment.materialStreams?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Potential Material Streams</p>
                    <div className="space-y-2">
                      {assessment.materialStreams.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-700">🔩 {m.material}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${potentialColors[m.confidence] || 'bg-gray-100 text-gray-500'}`}>{m.confidence}</span>
                            {m.verificationStatus === 'UNVERIFIED' && <span className="text-xs text-gray-400 italic">Not verified</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 italic">Material quantities cannot be inferred from photos. Physical verification required.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <Recycle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Recovery assessment not yet available. The technician needs to complete the assessment first.</p>
              </div>
            )}

            {/* CTA */}
            {!hasAcceptedOffer && offers.length > 0 && (
              <button onClick={() => setActiveTab('offers')} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                <Star className="w-5 h-5" /> Compare Recovery Offers <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}

        {/* OFFERS TAB */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            {hasAcceptedOffer && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">You have accepted an offer. See the Tracking tab for pickup status.</p>
              </div>
            )}

            {offers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-900 font-semibold mb-1">No Offers Yet</p>
                <p className="text-gray-500 text-sm">Recovery partners will be notified about your case and will submit offers shortly.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 text-right">Sorted by highest net value</p>
                {[...offers].sort((a, b) => b.netOffer - a.netOffer).map((offer, i) => {
                  const isBelow = indMin && offer.netOffer < indMin;
                  return (
                    <div key={offer._id} className={`bg-white rounded-2xl shadow-sm border p-6 ${offer.status === 'ACCEPTED' ? 'border-green-400' : 'border-gray-100'}`}>
                      {offer.status === 'ACCEPTED' && (
                        <div className="flex items-center gap-2 mb-3 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                          <CheckCircle className="w-4 h-4" /><span className="text-sm font-semibold">Offer Accepted</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-900">{offer.partnerId?.businessName || 'Recovery Partner'}</p>
                          <p className="text-sm text-gray-500">{offer.partnerId?.partnerType?.replace(/_/g, ' ')}</p>
                        </div>
                        {offer.partnerId?.verificationStatus === 'VERIFIED' && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-semibold">
                            <Shield className="w-3 h-3" /> VERIFIED
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Gross Offer</p>
                          <p className="font-bold text-gray-900">₹{offer.grossOffer.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Pickup Fee</p>
                          <p className="font-bold text-gray-900">{offer.pickupFee === 0 ? 'FREE' : `₹${offer.pickupFee}`}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                          <p className="text-xs text-green-600 mb-1">Net You Get</p>
                          <p className="font-bold text-green-900 text-lg">₹{offer.netOffer.toLocaleString()}</p>
                        </div>
                      </div>

                      {isBelow && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-amber-700 text-xs">⚠️ BELOW INDICATIVE RANGE — Consider comparing additional offers.</p>
                        </div>
                      )}

                      <div className="text-sm text-gray-500 space-y-1 mb-4">
                        <div className="flex items-center gap-2"><Truck className="w-4 h-4" /><span>Pathway: {offer.pathway}</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>Pickup within {offer.pickupTimelineDays} days</span></div>
                        {offer.conditions && <p className="text-xs italic">Conditions: {offer.conditions}</p>}
                        {offer.isDemoOffer && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">DEMO OFFER</span>}
                      </div>

                      {offer.status === 'PENDING' && !hasAcceptedOffer && (
                        <button
                          onClick={() => handleAcceptOffer(offer._id)}
                          disabled={!!acceptingOffer}
                          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          {acceptingOffer === offer._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Accept This Offer — ₹{offer.netOffer.toLocaleString()}
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* TRACKING TAB */}
        {activeTab === 'tracking' && (
          <div className="space-y-4">
            {!pickup ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-900 font-semibold mb-1">No Active Pickup</p>
                <p className="text-gray-500 text-sm">Accept a recovery offer to start the pickup process.</p>
                <button onClick={() => setActiveTab('offers')} className="mt-4 text-green-600 font-medium hover:underline">View Offers →</button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-green-600" /> Pickup Timeline
                  </h2>
                  <div className="relative">
                    {PICKUP_STATUSES.map((status, i) => {
                      const done = i <= currentPickupIdx;
                      const active = i === currentPickupIdx;
                      return (
                        <div key={status} className="flex items-start gap-4 pb-6 last:pb-0 relative">
                          {i < PICKUP_STATUSES.length - 1 && (
                            <div className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                          )}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${done ? 'bg-green-500' : 'bg-gray-200'}`}>
                            {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className={`flex-1 ${active ? 'font-semibold' : ''}`}>
                            <p className={`text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>{PICKUP_LABELS[status]}</p>
                            {active && pickup.statusHistory?.filter((h: any) => h.status === status).map((h: any, hi: number) => (
                              <p key={hi} className="text-xs text-gray-500 mt-0.5">{h.note} — {new Date(h.timestamp).toLocaleDateString()}</p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {pickup.verifiedWeightKg && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm font-semibold text-green-800">Verified Weight: {pickup.verifiedWeightKg} kg</p>
                  </div>
                )}

                {pickup.status === 'RECOVERY_COMPLETED' && (
                  <button onClick={() => navigate(`/passport/${caseId}`)} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> View Recovery Certificate & Passport
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* COMPONENTS TAB */}
        {activeTab === 'components' && (
          <div className="space-y-4">
            {!assessment?.components || assessment.components.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Component assessment not yet available.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {assessment.components.map((comp: any, i: number) => {
                  const statusColors: Record<string, string> = {
                    POTENTIALLY_REUSABLE: 'bg-green-50 border-green-200 text-green-700',
                    NEEDS_TESTING: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                    WORKING_VERIFIED: 'bg-blue-50 border-blue-200 text-blue-700',
                    MATERIAL_RECOVERY: 'bg-gray-50 border-gray-200 text-gray-600',
                    SPECIAL_HANDLING: 'bg-red-50 border-red-200 text-red-700',
                    FAILED: 'bg-red-50 border-red-200 text-red-600',
                  };
                  return (
                    <div key={comp._id || i} className={`rounded-xl p-4 border-2 ${statusColors[comp.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      <p className="font-bold text-gray-900 mb-1">{comp.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{comp.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/60">{comp.status?.replace(/_/g,' ')}</span>
                        <span className="text-xs text-gray-500">{comp.confidence} confidence</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 italic">{comp.evidenceSource}</p>
                      <div className="flex gap-2 mt-2">
                        {comp.technicianVerified && <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full">✓ Tech verified</span>}
                        {!comp.technicianVerified && <span className="text-xs text-gray-400 italic">Not physically verified</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
