import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Wrench, Scale, Leaf, AlertTriangle, ShieldCheck, MapPin, Star,
  TrendingDown, Check, Calendar, MessageSquare, ListFilter, RefreshCw, Clock
} from 'lucide-react';
import L from 'leaflet';

export const CaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [repairCase, setRepairCase] = useState<any>(null);
  const [repairers, setRepairers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Map settings
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapActive, setMapActive] = useState(false);

  // Filters for Discovery
  const [radius, setRadius] = useState(10);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Comparison selection
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'queue' | 'price' | 'rating'>('queue');

  // Request Booking Modal States
  const [bookingRepairer, setBookingRepairer] = useState<any | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [customerDescription, setCustomerDescription] = useState('');
  const [bookingSubmit, setBookingSubmit] = useState(false);

  const fetchCase = async () => {
    try {
      const res = await api.get(`/repair-cases/${id}`);
      if (res.data?.success) {
        setRepairCase(res.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Could not load repair case details.', 'error');
    }
  };

  const fetchRepairers = async () => {
    if (!repairCase) return;
    try {
      // Use user coordinates or fall back to default
      const coords = user?.location?.coordinates || [77.5946, 12.9716];
      const res = await api.get('/repairers', {
        params: {
          lat: coords[1],
          lng: coords[0],
          radius,
          category: repairCase.category,
          limit: 100,
        },
      });
      if (res.data?.success) {
        let docs = res.data.data.docs;
        if (verifiedOnly) {
          docs = docs.filter((d: any) => d.verificationStatus === 'VERIFIED');
        }
        setRepairers(docs);
      }
    } catch (err) {
      console.error('Failed to load repairers directory:', err);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await fetchCase();
      setLoading(false);
    };
    bootstrap();
  }, [id]);

  useEffect(() => {
    if (repairCase) {
      fetchRepairers();
    }
  }, [repairCase, radius, verifiedOnly]);

  // Leaflet map setup on tab/section launch
  useEffect(() => {
    if (!mapActive || !repairCase || repairCase.status !== 'DIAGNOSED' || mapRef.current || !mapContainerRef.current) return;

    // Load coordinates
    const userLng = user?.location?.coordinates[0] || 77.5946;
    const userLat = user?.location?.coordinates[1] || 12.9716;

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: [userLat, userLng],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Draw user coordinate pin
    L.marker([userLat, userLng], {
      icon: L.divIcon({
        className: 'user-pin-icon',
        html: `<div class="bg-blue-600 ring-4 ring-blue-200 h-4.5 w-4.5 rounded-full border border-white"></div>`,
        iconSize: [18, 18],
      }),
    })
      .addTo(map)
      .bindPopup('Your Current Search Location')
      .openPopup();

    const markerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerGroupRef.current = markerGroup;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapActive, repairCase]);

  // Draw repairer pins
  useEffect(() => {
    if (!mapRef.current || !markerGroupRef.current || repairers.length === 0) return;

    // Clear old layers
    markerGroupRef.current.clearLayers();

    repairers.forEach((r) => {
      const [lng, lat] = r.location.coordinates;
      
      const pin = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'repairer-pin-icon',
          html: `<div class="bg-primary-600 hover:scale-115 transform transition text-white px-2.5 py-1 rounded-lg border border-white shadow-md font-bold text-[10px] flex items-center gap-0.5">
            🛠️ <span>${r.businessName.substring(0, 10)}...</span>
          </div>`,
          iconSize: [80, 24],
          iconAnchor: [40, 12],
        }),
      });

      pin.addTo(markerGroupRef.current!)
        .bindPopup(`
          <div class="p-2 flex flex-col gap-1 min-w-[150px]">
            <p class="font-bold text-xs text-gray-900">${r.businessName}</p>
            <p class="text-[10px] text-gray-500">${r.availability}</p>
            <div class="flex items-center gap-0.5 mt-1">
              ⭐ <span class="text-[10px] font-bold text-gray-700">${r.rating} (${r.reviewCount})</span>
            </div>
          </div>
        `);
    });
  }, [repairers]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingRepairer || !scheduledDate) return;

    setBookingSubmit(true);
    try {
      const res = await api.post('/repair-requests', {
        repairCaseId: repairCase._id,
        repairerId: bookingRepairer._id,
        customerDescription,
        scheduledDate,
      });

      if (res.data?.success) {
        showToast('Repair request submitted successfully!', 'success');
        setBookingRepairer(null);
        fetchCase();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to submit request.';
      showToast(errMsg, 'error');
    } finally {
      setBookingSubmit(false);
    }
  };

  const getWorthinessBadge = (rec?: string) => {
    switch (rec) {
      case 'repair_recommended':
        return {
          bg: 'bg-green-50 border-green-200 text-green-800',
          title: 'Repair Recommended',
        };
      case 'worthwhile':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          title: 'Worth Evaluative Repair',
        };
      case 'replace_recommended':
        return {
          bg: 'bg-orange-50 border-orange-200 text-orange-800',
          title: 'Replacement Practicable',
        };
      default:
        return {
          bg: 'bg-red-50 border-red-200 text-red-800',
          title: 'Professional Action Advised',
        };
    }
  };

  const toggleCompare = (repId: string) => {
    setCompareIds(prev => 
      prev.includes(repId) ? prev.filter(id => id !== repId) : [...prev, repId].slice(0, 3)
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (!repairCase) return null;

  const { diagnosisId: diag, estimateId: est } = repairCase;
  const badgeInfo = getWorthinessBadge(est?.recommendation);

  // Compare listings helper
  const compareListings = repairers.filter((r) => compareIds.includes(r._id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* Upper Grid: Diagnostics & Worthiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Cols: AI Diagnosis & Troubleshooting */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* V2 Intelligence Enhancements Card */}
          {user?.role === 'CUSTOMER' && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <span className="text-yellow-300">⚡</span> Unlock Deep AI Diagnostics & Vision
                </h3>
                <p className="text-blue-100 text-xs mt-1">
                  Run multi-angle visual defect recognition, or take the interactive symptom diagnostic tree with emergency safety checks.
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link
                  to={`/vision/${id}`}
                  className="flex-1 text-center bg-white hover:bg-blue-50 text-blue-600 font-bold px-3 py-2 rounded-xl text-xs transition"
                >
                  Visual Analysis
                </Link>
                <Link
                  to={`/diagnostic/${id}`}
                  className="flex-1 text-center bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-2 rounded-xl text-xs transition border border-blue-500"
                >
                  Diagnostics
                </Link>
              </div>
            </div>
          )}
          
          {/* Header Card */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)] animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-primary-800 bg-primary-100/50 border border-primary-200/50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Diagnosis Profile
                </span>
                <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mt-3">{repairCase.itemName}</h1>
                <p className="text-xs text-zinc-400 mt-1">Category: {repairCase.category} &bull; Brand: {repairCase.brand} &bull; Model: {repairCase.model || 'Unknown'}</p>
              </div>

              {repairCase.media && repairCase.media.length > 0 && (
                <img
                  src={`http://localhost:5005${repairCase.media[0]}`}
                  alt="Damaged Item"
                  className="h-20 w-20 rounded-xl object-cover shadow border border-zinc-200"
                />
              )}
            </div>
            
            <div className="border-t border-zinc-100 mt-5 pt-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Symptom Description</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed bg-zinc-50 border border-zinc-100 p-3 rounded-lg mt-2 italic">
                "{repairCase.problemDescription}"
              </p>
            </div>
          </div>

          {/* AI diagnosis detailed card */}
          {diag && (
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)] flex flex-col gap-6">
              
              {/* Identified sub-category */}
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Identified Hardware</p>
                <p className="text-sm font-bold text-zinc-800 mt-0.5">{diag.identifiedItem}</p>
              </div>

              {/* Causes */}
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950 mb-3 uppercase tracking-wider text-[10px]">Probable Failure Causes</h3>
                <div className="flex flex-col gap-4">
                  {diag.possibleCauses.map((pc: any) => (
                    <div key={pc.cause} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-850">{pc.cause}</span>
                        <span className="font-bold text-primary-600">{(pc.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pc.confidence * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safe Troubleshooting steps */}
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950 mb-3 uppercase tracking-wider text-[10px]">Safe Troubleshooting Procedures</h3>
                <ul className="flex flex-col gap-3 text-xs text-zinc-500 pl-4 list-disc font-medium">
                  {diag.troubleshootingSteps.map((step: string) => (
                    <li key={step} className="leading-relaxed">{step}</li>
                  ))}
                </ul>
              </div>

              {/* Safety Warning */}
              {diag.safetyWarnings && diag.safetyWarnings.length > 0 && (
                <div className="bg-red-50/50 border border-red-200/50 p-4 rounded-xl flex gap-3 text-xs">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-900">Safety Hazard Advisory</p>
                    <ul className="mt-1 list-disc pl-4 flex flex-col gap-1 text-red-800">
                      {diag.safetyWarnings.map((w: string) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-zinc-400 italic">
                {diag.limitations[0] || 'AI-assisted assessment. This is not a certified professional diagnosis.'}
              </p>
            </div>
          )}

        </div>

        {/* Right 1 Col: Worthiness Engine & Carbon Index */}
        <div className="flex flex-col gap-6">
          
          {/* worthiness index card */}
          {est && (
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)] flex flex-col gap-6">
              
              {/* Recommendation Banner */}
              <div className={`border p-4 rounded-xl text-center shadow-sm ${badgeInfo.bg}`}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Worthiness Decision</p>
                <p className="text-lg font-extrabold mt-1.5 leading-none">{badgeInfo.title}</p>
              </div>

              {/* Price bracket grid */}
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-5">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Est. Repair Range</p>
                  <p className="text-lg font-black text-zinc-900 mt-1">₹{est.estimatedMin} - ₹{est.estimatedMax}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Est. Replace Cost</p>
                  <p className="text-lg font-black text-zinc-900 mt-1">₹{est.replacementMin} - ₹{est.replacementMax}</p>
                </div>
              </div>

              {/* Repairability score bar */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Repairability Score</span>
                  <span className="text-primary-650 text-sm font-extrabold">{est.repairabilityScore}/100</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      est.repairabilityScore >= 70
                        ? 'bg-green-500'
                        : est.repairabilityScore >= 50
                        ? 'bg-blue-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${est.repairabilityScore}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Worthiness Justification</p>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{est.reasoning}</p>
              </div>

            </div>
          )}

          {/* Sustainability statistics cards */}
          {repairCase.status !== 'COMPLETED' && (
            <div className="bg-zinc-950 text-white p-6 rounded-2xl border border-zinc-900 shadow-xl relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
              <span className="p-2.5 bg-white/5 border border-white/10 rounded-xl w-fit text-emerald-400">
                <Leaf className="h-5 w-5" />
              </span>
              <div className="relative z-10">
                <h3 className="text-base font-bold">Avoid Waste Accumulation</h3>
                <p className="text-xs text-zinc-450 mt-1 leading-relaxed">Completing this repair instead of discarding prevents landfills.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2 relative z-10">
                <div>
                  <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">Weight Avoided</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">~2.1 kg</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">CO₂ Saved</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">~220 kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Active status tracker / Find Repairer link */}
          {repairCase.status === 'DIAGNOSED' ? (
            <button
              onClick={() => setMapActive(true)}
              className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] border border-zinc-950"
            >
              <MapPin className="h-4 w-4" /> Find Nearby Repair Shops
            </button>
          ) : (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-center">
              <p className="text-xs font-semibold text-zinc-500">This case has an active repair ticket.</p>
              <Link to="/dashboard" className="text-xs font-bold text-primary-600 hover:underline mt-1 block">
                Go to Dashboard Tracking &rarr;
              </Link>
            </div>
          )}

        </div>

      </div>

      {/* ==================================================
         LOWER CONTAINER: INTERACTIVE DISCOVERY MAP & COMPARISON
         ================================================== */}
      {mapActive && repairCase.status === 'DIAGNOSED' && (
        <div className="border-t border-gray-200 pt-10 flex flex-col gap-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary-600" /> Discover Nearby Technicians
              </h2>
              <p className="text-xs text-gray-500 mt-1">Double click map to zoom. Select shops to compare rates.</p>
            </div>

            {/* Radius and verification filter box */}
            <div className="flex flex-wrap items-center gap-4 bg-white border border-gray-200 p-2.5 rounded-xl text-xs font-semibold">
              <div className="flex items-center gap-1">
                <span>Radius:</span>
                <select
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="bg-gray-50 border border-gray-200 p-1 rounded"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                </select>
              </div>
              
              <div className="border-l border-gray-200 h-5" />

              <div className="flex items-center gap-1">
                <span>Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 p-1 rounded text-primary-700 font-bold"
                >
                  <option value="queue">🚀 Fastest Turnaround (Lowest Queue)</option>
                  <option value="price">💸 Lowest Base Price</option>
                  <option value="rating">⭐ Highest Quality Rating</option>
                </select>
              </div>

              <div className="border-l border-gray-200 h-5" />

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="accent-primary-500"
                />
                <span>Verified Only</span>
              </label>
            </div>
          </div>

          {/* Leaflet map display element */}
          <div ref={mapContainerRef} style={{ height: '350px' }} className="w-full shadow-inner relative" />

          {/* Comparison and discovery list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Repairer List Cards */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Available Professionals</h3>
              
              {repairers.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 p-8 rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-semibold">No repairers found within this area.</p>
                  <button onClick={() => setRadius(r => r + 10)} className="text-xs font-bold text-primary-600 hover:underline mt-2">
                    Expand Search Radius &rarr;
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[...repairers]
                    .sort((a, b) => {
                      if (sortBy === 'queue') {
                        return (a.activeRequestsCount || 0) - (b.activeRequestsCount || 0);
                      }
                      if (sortBy === 'price') {
                        return (a.estimatedPriceRange.min || 0) - (b.estimatedPriceRange.min || 0);
                      }
                      if (sortBy === 'rating') {
                        return (b.rating || 0) - (a.rating || 0);
                      }
                      return 0;
                    })
                    .map((r) => {
                      const isSelected = compareIds.includes(r._id);
                      const queueCount = r.activeRequestsCount || 0;
                      const getQueueBadge = (count: number) => {
                        if (count <= 2) {
                          return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Fast turn-around' };
                        } else if (count <= 5) {
                          return { bg: 'bg-blue-50 text-blue-800 border-blue-200', text: 'Moderate queue' };
                        } else {
                          return { bg: 'bg-orange-50 text-orange-850 border-orange-200', text: 'Longer wait' };
                        }
                      };
                      const qBadge = getQueueBadge(queueCount);

                      return (
                        <div key={r._id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 shadow-sm hover:shadow transition">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">{r.businessName}</span>
                              {r.verificationStatus === 'VERIFIED' && (
                                <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <ShieldCheck className="h-3 w-3" /> Verified
                                </span>
                              )}
                              <span className={`border text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${qBadge.bg}`}>
                                <Clock className="h-3 w-3" /> {queueCount} active ({qBadge.text})
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{r.description}</p>
                            <div className="flex items-center gap-4 mt-3.5 text-xs text-gray-600 font-medium">
                              <span className="flex items-center gap-0.5 text-yellow-500 font-bold">
                                ⭐ {r.rating} <span className="text-gray-400 font-normal">({r.reviewCount})</span>
                              </span>
                              <span>&bull;</span>
                              <span>Radius: {r.serviceRadius}km</span>
                              <span>&bull;</span>
                              <span>Price: ₹{r.estimatedPriceRange.min}-₹{r.estimatedPriceRange.max}</span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col justify-end gap-2 items-end mt-4 sm:mt-0 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleCompare(r._id)}
                              className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                                isSelected
                                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Compare'}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setBookingRepairer(r)}
                              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition"
                            >
                              Book Repair
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Right 1 Col: Comparison Side by Side */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-3">Side-by-Side Comparison</h3>

              {compareListings.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Select up to 3 repairers above to compare estimated details.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {compareListings.map((c, idx) => (
                    <div key={c._id} className="border border-gray-100 rounded-xl p-3 flex flex-col gap-2 relative bg-gray-50/50">
                      {idx === 0 && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold bg-green-100 text-green-800 border border-green-200 px-1.5 py-0.5 rounded">
                          Best Value
                        </span>
                      )}
                      <p className="font-bold text-xs text-gray-900">{c.businessName}</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600 font-semibold border-t border-gray-100 pt-2">
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Est. Range</p>
                          <p className="text-gray-900 mt-0.5">₹{c.estimatedPriceRange.min}-₹{c.estimatedPriceRange.max}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Rating</p>
                          <p className="text-gray-900 mt-0.5">⭐ {c.rating} ({c.reviewCount})</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==================================================
         POPUP MODAL: SERVICE REQUEST BOOKING
         ================================================== */}
      {bookingRepairer && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl border border-gray-200 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Request Repair Handover</h3>
              <p className="text-xs text-gray-500 mt-1">Submit request ticket to {bookingRepairer.businessName}.</p>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Preferred Appointment Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Additional Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Describe timing preferences, or parts available..."
                  value={customerDescription}
                  onChange={(e) => setCustomerDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-primary-500"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-100 pt-4 mt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBookingRepairer(null)}
                  className="px-4 py-2 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmit}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-5 rounded-lg disabled:opacity-50"
                >
                  {bookingSubmit ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
