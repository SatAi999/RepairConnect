import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import L from 'leaflet';
import {
  Camera, Wrench, Clock, CheckCircle2, ChevronRight, MapPin, Settings, Star,
  AlertTriangle, Hammer, Users, Database, ShieldCheck, RefreshCw, Landmark, Trash2,
  Plus, Search, Leaf, Check, Eye, Activity, ShieldAlert, Sparkles, UserPlus
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Not authenticated. Please log in.</p>
        </div>
      </div>
    );
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  } else if (user.role === 'REPAIRER') {
    return <RepairerDashboard />;
  } else {
    return <CustomerDashboard />;
  }
};

/* ==========================================
   1. CUSTOMER DASHBOARD SUB-COMPONENT
   ========================================== */
const CustomerDashboard: React.FC = () => {
  const { user, updateProfile } = useAuth();
  if (!user) return null;
  const { showToast } = useToast();
  const [cases, setCases] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Map settings and Nominatim geocoding states
  const [lng, setLng] = useState(user?.location?.coordinates[0] || 77.5946);
  const [lat, setLat] = useState(user?.location?.coordinates[1] || 12.9716);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const fetchData = async () => {
    try {
      const [casesRes, requestsRes] = await Promise.all([
        api.get('/repair-cases'),
        api.get('/repair-requests'),
      ]);
      if (casesRes.data?.success) setCases(casesRes.data.data);
      if (requestsRes.data?.success) setRequests(requestsRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize coordinates map picker
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([lat, lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const marker = L.marker([lat, lng], { draggable: true, icon: customIcon }).addTo(map);
      markerRef.current = marker;

      // Handle marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
      });

      // Handle map click
      map.on('click', (e: any) => {
        const position = e.latlng;
        marker.setLatLng(position);
        setLat(position.lat);
        setLng(position.lng);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Free Map search via OpenStreetMap Nominatim Geocoding API
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        
        setLat(newLat);
        setLng(newLng);
        
        showToast(`Located: ${first.display_name.split(',')[0]}`, 'success');

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 14);
          markerRef.current.setLatLng([newLat, newLng]);
        }
      } else {
        showToast('Address not found. Try a different query.', 'error');
      }
    } catch (err) {
      showToast('Error querying Nominatim Geocoding Map API.', 'error');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSaveLocation = async () => {
    setIsSavingLoc(true);
    const success = await updateProfile(user?.name || '', user?.phone, [lng, lat]);
    setIsSavingLoc(false);
    if (success) {
      showToast('Service search coordinates updated successfully.', 'success');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'IN_REPAIR':
      case 'REPAIR_IN_PROGRESS': return 'bg-orange-50 text-orange-850 border-orange-200';
      case 'REQUESTED': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'APPROVED': return 'bg-green-50 text-green-800 border-green-200';
      default: return 'bg-zinc-50 text-zinc-650 border-zinc-200';
    }
  };

  // Aggregate numbers
  const activeCases = cases.filter(c => ['REQUESTED', 'IN_REPAIR', 'REPAIR_IN_PROGRESS'].includes(c.status)).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'REQUESTED').length;
  const completedRepairs = cases.filter(c => c.status === 'COMPLETED').length;

  // Calculate Cumulative Circular Impact
  let totalCo2 = 0;
  let totalWeight = 0;
  cases.forEach(c => {
    if (c.status === 'COMPLETED') {
      if (c.category === 'Laptop') { totalCo2 += 220; totalWeight += 2.1; }
      else if (c.category === 'Smartphone') { totalCo2 += 50; totalWeight += 0.2; }
      else if (c.category === 'Bicycle') { totalCo2 += 100; totalWeight += 14.0; }
      else if (c.category === 'Refrigerator') { totalCo2 += 450; totalWeight += 45.0; }
      else { totalCo2 += 100; totalWeight += 5.0; }
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Welcome Banner */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 sm:p-8 border border-zinc-900 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome, {user.name}!</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">Diagnose items and connect with local professionals to extend their lifecycle.</p>
        </div>
        <Link
          to="/analyze"
          className="relative z-10 bg-white text-zinc-950 font-semibold py-3 px-6 rounded-xl hover:bg-zinc-50 transition hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-center gap-2 flex-shrink-0 text-sm"
        >
          <Camera className="h-4 w-4" /> Analyze Damaged Item
        </Link>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)] flex items-center gap-4 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300">
          <span className="p-3 bg-orange-50/50 border border-orange-100 text-orange-600 rounded-xl"><Clock className="h-6 w-6" /></span>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Active Repairs</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{activeCases}</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)] flex items-center gap-4 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300">
          <span className="p-3 bg-blue-50/50 border border-blue-100 text-blue-600 rounded-xl"><Wrench className="h-6 w-6" /></span>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Pending Requests</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{pendingRequestsCount}</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)] flex items-center gap-4 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300">
          <span className="p-3 bg-emerald-50/50 border border-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 className="h-6 w-6" /></span>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Completed Repairs</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{completedRepairs}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Cases & Requests Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Recent Cases List */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-zinc-400" /> My Diagnostic Cases
            </h2>
            
            {cases.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500 font-semibold mb-3">No repair cases yet.</p>
                <Link to="/analyze" className="inline-flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition">
                  Analyze your first damaged item &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {cases.map(c => (
                  <div key={c._id} className="border border-zinc-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/50 hover:scale-[1.005] hover:border-zinc-200 transition-all duration-300">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{c.itemName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{c.brand} &bull; {c.category}</p>
                      <p className="text-xs text-zinc-500 mt-2 line-clamp-1">{c.problemDescription}</p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                      {['RECOVERY_ELIGIBLE', 'IN_RECOVERY', 'RECOVERY_COMPLETED'].includes(c.status) ? (
                        <>
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                            <Sparkles className="h-3 w-3" /> Recovery Active
                          </span>
                          <Link
                            to={`/recovery/${c._id}`}
                            className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition"
                          >
                            Recovery Center &rarr;
                          </Link>
                        </>
                      ) : (
                        <Link
                          to={`/cases/${c._id}`}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
                        >
                          View Analysis <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service Requests Tracker */}
          {requests.length > 0 && (
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-zinc-400" /> Active Service Requests
              </h2>
              <div className="flex flex-col gap-4">
                {requests.map(r => (
                  <div key={r._id} className="border border-zinc-100 rounded-xl p-4 flex justify-between items-center gap-4 hover:bg-zinc-50/50 hover:scale-[1.005] hover:border-zinc-200 transition-all duration-300">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Request for {r.repairCaseId?.itemName || 'Item'}</p>
                      <p className="text-xs text-gray-500 mt-1">Shop: {r.repairerId?.businessName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                        {r.quotedAmount && (
                          <span className="text-[10px] text-zinc-950 font-bold bg-zinc-100 px-2 py-0.5 rounded-full">
                            Quote: ₹{r.quotedAmount}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/requests/${r._id}`}
                      className="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-2 rounded-lg transition"
                    >
                      Track Status
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Circularity Platform Analytics Link */}
          <Link
            to="/circularity"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm mb-4"
          >
            <Sparkles className="h-4 w-4" /> View Circularity Impact Dashboard &rarr;
          </Link>

          {/* Eco Circular Tips panel */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6">
            <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 uppercase tracking-wider text-[10px] mb-4">
              <Sparkles className="h-4 w-4 text-emerald-500" /> Eco Maintenance Guides
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-150">
                <h4 className="text-xs font-bold text-zinc-900">Prolong Lithium Batteries</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Keep battery charges bounded between 20% and 80%. Avoid prolonged exposure to direct sunlight or sub-zero conditions.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-150">
                <h4 className="text-xs font-bold text-zinc-900">Prevent Dust Build-ups</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Blast exhaust vents with canned air periodically. Prevents logic board CPU thermal throttling and soldering oxidation.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar: Map Geolocation Setup & Stats */}
        <div className="flex flex-col gap-6">
          
          {/* Cumulative Green Impact statistics */}
          {completedRepairs > 0 && (
            <div className="bg-zinc-950 text-white p-6 rounded-2xl border border-zinc-900 shadow-xl relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
              <span className="p-2.5 bg-white/5 border border-white/10 rounded-xl w-fit text-emerald-400">
                <Leaf className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold tracking-tight uppercase text-zinc-400 text-[10px]">My Eco Contribution</h3>
                <p className="text-lg font-bold mt-1 text-white">Landfill Avoidance Profile</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                <div>
                  <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">E-Waste Prevented</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">~{totalWeight.toFixed(1)} kg</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">CO₂ Offset</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">~{totalCo2} kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Geolocation Picker (No numerical inputs!) */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <h2 className="text-xl font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary-500" /> Search Location Map
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Set your default coordinates by dragging the pin, clicking the map, or using the address search below.
            </p>

            {/* Nominatim Search Form */}
            <form onSubmit={handleAddressSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-400 pointer-events-none">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar, Bangalore"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-zinc-200 bg-zinc-50 rounded-lg focus:border-zinc-400 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingAddress}
                className="bg-zinc-950 hover:bg-zinc-900 text-white font-semibold px-3 rounded-lg text-xs transition disabled:opacity-50 flex items-center justify-center"
              >
                {isSearchingAddress ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Map Picker Container */}
            <div ref={mapContainerRef} className="h-60 w-full rounded-xl border border-zinc-200 z-0" />

            <button
              onClick={handleSaveLocation}
              disabled={isSavingLoc}
              className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-semibold py-2.5 px-4 rounded-lg text-xs mt-4 transition disabled:opacity-50 shadow-sm"
            >
              {isSavingLoc ? 'Saving Location...' : 'Save Pin Location'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

/* ==========================================
   2. REPAIRER DASHBOARD SUB-COMPONENT
   ========================================== */
const RepairerDashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  const { showToast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inspection Panel States
  const [expandedInspection, setExpandedInspection] = useState<Record<string, boolean>>({});
  const [inspectionDecision, setInspectionDecision] = useState<Record<string, string>>({});
  const [inspectionNotes, setInspectionNotes] = useState<Record<string, string>>({});
  const [inspectionComponents, setInspectionComponents] = useState<Record<string, string>>({});
  const [submittingInspection, setSubmittingInspection] = useState<Record<string, boolean>>({});

  const handleRecordInspection = async (reqId: string, caseId: string) => {
    const decision = inspectionDecision[reqId] || 'REPAIRABLE';
    const notes = inspectionNotes[reqId] || '';
    const componentsStr = inspectionComponents[reqId] || '';
    const affectedComponents = componentsStr.split(',').map(s => s.trim()).filter(Boolean);

    if (!notes.trim()) {
      showToast('Please provide inspection notes.', 'error');
      return;
    }

    setSubmittingInspection(prev => ({ ...prev, [reqId]: true }));
    try {
      const res = await api.post(`/inspection/${caseId}`, {
        repairDecision: decision,
        inspectionNotes: notes,
        affectedComponents,
        repairRequestId: reqId,
      });

      if (res.data.success) {
        showToast('Technician inspection recorded successfully.', 'success');
        if (decision !== 'REPAIRABLE') {
          // Trigger recovery assessment auto-generation
          await api.post(`/recovery/assess/${caseId}`);
          showToast('Recovery pathway initiated!', 'info');
        }
        setExpandedInspection(prev => ({ ...prev, [reqId]: false }));
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to record inspection.', 'error');
    } finally {
      setSubmittingInspection(prev => ({ ...prev, [reqId]: false }));
    }
  };
  
  // Profile Form States
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [minPrice, setMinPrice] = useState(500);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [availability, setAvailability] = useState('');
  
  // Action details
  const [editingProfile, setEditingProfile] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Active status action state
  const [quoteInput, setQuoteInput] = useState<{ [key: string]: number }>({});

  const fetchData = async () => {
    try {
      const [profRes, reqRes] = await Promise.all([
        api.get('/repairers/profile'),
        api.get('/repair-requests'),
      ]);
      if (profRes.data?.success) {
        const p = profRes.data.data;
        setProfile(p);
        setBusinessName(p.businessName);
        setDescription(p.description);
        setCategories(p.categories);
        setServiceRadius(p.serviceRadius);
        setMinPrice(p.estimatedPriceRange.min);
        setMaxPrice(p.estimatedPriceRange.max);
        setAvailability(p.availability);
      }
      if (reqRes.data?.success) setRequests(reqRes.data.data);
    } catch (err) {
      console.error('Failed to load repairer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    try {
      const res = await api.patch('/repairers/profile', {
        businessName,
        description,
        categories,
        serviceRadius,
        estimatedPriceRange: { min: minPrice, max: maxPrice },
        availability,
      });
      if (res.data?.success) {
        setProfile(res.data.data);
        showToast('Workshop profile updated successfully.', 'success');
        setEditingProfile(false);
      }
    } catch (err) {
      showToast('Failed to save profile details.', 'error');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleStatusChange = async (reqId: string, newStatus: string, actionNote: string, quote?: number) => {
    try {
      const payload: any = { status: newStatus, note: actionNote };
      if (quote !== undefined) payload.quotedAmount = quote;
      
      const res = await api.patch(`/repair-requests/${reqId}/status`, payload);
      if (res.data?.success) {
        showToast(`Request status updated to ${newStatus}.`, 'success');
        fetchData();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to update request status.';
      showToast(errMsg, 'error');
    }
  };

  const toggleCategory = (cat: string) => {
    setCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'REQUESTED');
  const activeRepairs = requests.filter(r => 
    !['REQUESTED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">{profile?.businessName || 'My Repair Shop'}</h1>
            {profile?.verificationStatus === 'VERIFIED' ? (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="h-3 w-3" /> Verified Shop
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full">
                Pending Verification
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{profile?.availability} &bull; Radius: {profile?.serviceRadius}km</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex-shrink-0">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">{profile?.rating || '0.0'}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{profile?.reviewCount || 0} reviews</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column: Requests */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Pending Requests Queue */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" /> Pending Customer Bids
            </h2>

            {pendingRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Your queue is currently clear.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {pendingRequests.map(r => (
                  <div key={r._id} className="border border-gray-100 rounded-xl p-5 hover:bg-gray-50/50 transition">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Item: {r.repairCaseId?.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Category: {r.repairCaseId?.category} &bull; Brand: {r.repairCaseId?.brand}</p>
                        <p className="text-xs text-gray-600 mt-2 font-medium">Customer: {r.userId?.name} ({r.userId?.phone || 'No Phone'})</p>
                        <p className="text-xs text-gray-600 mt-1 italic">"{r.customerDescription || 'No details provided.'}"</p>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 px-2 py-1 rounded-full uppercase">
                          Requested
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 justify-end">
                      <button
                        onClick={() => handleStatusChange(r._id, 'REJECTED', 'Unavailable for requested schedule.')}
                        className="text-xs font-semibold hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleStatusChange(r._id, 'ACCEPTED', 'Availability confirmed.')}
                        className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        Accept Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active repairs / workflow queue */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-primary-500" /> Active Workshop Repairs
            </h2>

            {activeRepairs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No active repair tickets in the workshop.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {activeRepairs.map(r => (
                  <div key={r._id} className="border border-gray-100 rounded-xl p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.repairCaseId?.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Status: <span className="font-bold text-primary-600">{r.status}</span></p>
                        <p className="text-xs text-gray-600 mt-2">Quote: {r.quotedAmount ? `₹${r.quotedAmount}` : 'Not provided yet'}</p>
                      </div>
                      
                      <Link to={`/requests/${r._id}`} className="text-xs font-bold text-primary-600 hover:underline">
                        View Tracking Timeline
                      </Link>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-xl flex flex-col gap-4">
                      <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Update Progress</p>
                      
                      {r.status === 'ACCEPTED' && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={() => handleStatusChange(r._id, 'DIAGNOSIS', 'Technician started physical inspection.')}
                            className="bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                          >
                            Mark: Diagnosis Started
                          </button>
                        </div>
                      )}

                      {r.status === 'DIAGNOSIS' && (
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-600 mb-1">Final Price Estimate (INR)</label>
                            <input
                              type="number"
                              required
                              placeholder="e.g. 1500"
                              value={quoteInput[r._id] || ''}
                              onChange={(e) => setQuoteInput(prev => ({ ...prev, [r._id]: parseInt(e.target.value) }))}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 bg-white rounded-lg"
                            />
                          </div>
                          <button
                            disabled={!quoteInput[r._id]}
                            onClick={() => handleStatusChange(r._id, 'ESTIMATE_PROVIDED', 'Pricing estimate submitted.', quoteInput[r._id])}
                            className="bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                          >
                            Submit Estimate Quote
                          </button>
                        </div>
                      )}

                      {r.status === 'ESTIMATE_PROVIDED' && (
                        <p className="text-xs text-orange-600 font-medium">Waiting for customer approval of your estimate quote.</p>
                      )}

                      {r.status === 'APPROVED' && (
                        <button
                          onClick={() => handleStatusChange(r._id, 'REPAIR_IN_PROGRESS', 'Parts assembled, hardware repair initiated.')}
                          className="bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-lg w-fit"
                        >
                          Mark: Start Repairing
                        </button>
                      )}

                      {r.status === 'REPAIR_IN_PROGRESS' && (
                        <button
                          onClick={() => handleStatusChange(r._id, 'READY_FOR_PICKUP', 'Tests passed. Hardware ready for handover.')}
                          className="bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-lg w-fit"
                        >
                          Mark: Ready for Pickup
                        </button>
                      )}

                      {r.status === 'READY_FOR_PICKUP' && (
                        <button
                          onClick={() => handleStatusChange(r._id, 'COMPLETED', 'Payment processed. Handover finished.')}
                          className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg w-fit"
                        >
                          Mark: Completed / Dispatched
                        </button>
                      )}

                      {/* Technician Inspection Panel */}
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <button
                          type="button"
                          onClick={() => setExpandedInspection(prev => ({ ...prev, [r._id]: !prev[r._id] }))}
                          className="w-full flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition"
                        >
                          <span>{expandedInspection[r._id] ? '▼ Hide Physical Inspection Form' : '▶ Record Physical Inspection / Recovery'}</span>
                          <Wrench className="h-3.5 w-3.5 text-gray-500" />
                        </button>

                        {expandedInspection[r._id] && (
                          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 mb-1">Repair Decision</label>
                              <select
                                value={inspectionDecision[r._id] || 'REPAIRABLE'}
                                onChange={e => setInspectionDecision(prev => ({ ...prev, [r._id]: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                              >
                                <option value="REPAIRABLE">REPAIRABLE (Standard repair pathway)</option>
                                <option value="ECONOMICALLY_IMPRACTICAL">ECONOMICALLY IMPRACTICAL (Cost exceeds worth)</option>
                                <option value="BEYOND_REPAIR">BEYOND REPAIR (Physical/functional failure)</option>
                                <option value="CUSTOMER_DECLINED">CUSTOMER DECLINED (Customer chose not to repair)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 mb-1">Inspection Notes (Detailed diagnosis / reason)</label>
                              <textarea
                                value={inspectionNotes[r._id] || ''}
                                onChange={e => setInspectionNotes(prev => ({ ...prev, [r._id]: e.target.value }))}
                                placeholder="State condition of parts, diagnostic findings, and why it can/cannot be repaired..."
                                rows={2}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 mb-1">Affected/Faulty Components (comma-separated)</label>
                              <input
                                type="text"
                                value={inspectionComponents[r._id] || ''}
                                onChange={e => setInspectionComponents(prev => ({ ...prev, [r._id]: e.target.value }))}
                                placeholder="e.g. Compressor, Fan motor, Motherboard, Power cord"
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={submittingInspection[r._id]}
                              onClick={() => handleRecordInspection(r._id, r.repairCaseId?._id)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition disabled:opacity-50"
                            >
                              {submittingInspection[r._id] ? 'Recording...' : 'Submit Physical Inspection'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar: Profile Settings */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-400" /> Workshop Settings
              </h2>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                {editingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editingProfile ? (
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Business Name</label>
                  <input
                    id="profile-businessName"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    id="profile-description"
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Categories Served</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['Laptop', 'Smartphone', 'Bicycle', 'Refrigerator'].map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          categories.includes(cat)
                            ? 'bg-primary-100 border-primary-300 text-primary-800'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Service Radius (km)</label>
                  <input
                    id="profile-serviceRadius"
                    type="number"
                    required
                    value={serviceRadius}
                    onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Min Price (₹)</label>
                    <input
                      id="profile-minPrice"
                      type="number"
                      required
                      value={minPrice}
                      onChange={(e) => setMinPrice(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Max Price (₹)</label>
                    <input
                      id="profile-maxPrice"
                      type="number"
                      required
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Availability</label>
                  <input
                    id="profile-availability"
                    type="text"
                    required
                    placeholder="e.g. Mon-Sat 9AM-6PM"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingProfile}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-lg text-xs mt-2 disabled:opacity-50"
                >
                  {submittingProfile ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Business description</p>
                  <p className="text-gray-700 mt-1 leading-relaxed">{profile?.description}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Service categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile?.categories.map((c: string) => (
                      <span key={c} className="bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Base Pricing</p>
                    <p className="text-gray-900 font-bold mt-1">₹{profile?.estimatedPriceRange.min} - ₹{profile?.estimatedPriceRange.max}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Service Radius</p>
                    <p className="text-gray-900 font-bold mt-1">{profile?.serviceRadius} km</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

/* ==========================================
   3. ADMIN DASHBOARD SUB-COMPONENT
   ========================================== */
const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search registries states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [shopSearchTerm, setShopSearchTerm] = useState('');

  // Form states for creating/editing knowledge base parameters
  const [categoryInput, setCategoryInput] = useState('');
  const [replaceMin, setReplaceMin] = useState(10000);
  const [replaceMax, setReplaceMax] = useState(30000);
  const [carbonWeight, setCarbonWeight] = useState(2.0);
  const [carbonCO2, setCarbonCO2] = useState(150);
  const [submittingKb, setSubmittingKb] = useState(false);

  // Verification status update state
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, kbRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/knowledge'),
      ]);
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (usersRes.data?.success) {
        setUsersList(usersRes.data.data.users || []);
        setProfilesList(usersRes.data.data.profiles || []);
      }
      if (kbRes.data?.success) setKnowledge(kbRes.data.data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryInput.trim()) return;

    setSubmittingKb(true);
    try {
      const res = await api.post('/admin/knowledge', {
        category: categoryInput,
        replacementMin: replaceMin,
        replacementMax: replaceMax,
        weight: carbonWeight,
        co2Avoided: carbonCO2,
        services: [
          { name: 'General Diagnostic', estimatedMin: 500, estimatedMax: 1500 },
        ],
      });
      if (res.data?.success) {
        showToast('Knowledge category parameters saved successfully.', 'success');
        setCategoryInput('');
        fetchAdminData();
      }
    } catch (err) {
      showToast('Failed to save knowledge parameters.', 'error');
    } finally {
      setSubmittingKb(false);
    }
  };

  const handleDeleteKnowledge = async (kbId: string) => {
    if (!window.confirm('Delete this knowledge reference parameter?')) return;
    try {
      const res = await api.delete(`/admin/knowledge/${kbId}`);
      if (res.data?.success) {
        showToast('Knowledge reference deleted.', 'info');
        fetchAdminData();
      }
    } catch (err) {
      showToast('Deletion failed.', 'error');
    }
  };

  // Workshop verification triggers
  const handleVerifyShop = async (profileId: string, newStatus: 'VERIFIED' | 'SUSPENDED' | 'PENDING') => {
    setUpdatingProfileId(profileId);
    try {
      const res = await api.patch(`/admin/repairers/${profileId}/verify`, { status: newStatus });
      if (res.data?.success) {
        showToast(`Workshop status updated to ${newStatus} successfully.`, 'success');
        fetchAdminData();
      }
    } catch (err) {
      showToast('Failed to update verification status.', 'error');
    } finally {
      setUpdatingProfileId(null);
    }
  };

  // Filter lists based on search keys
  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredProfiles = profilesList.filter(p =>
    p.businessName?.toLowerCase().includes(shopSearchTerm.toLowerCase()) ||
    p.userId?.name?.toLowerCase().includes(shopSearchTerm.toLowerCase()) ||
    p.userId?.email?.toLowerCase().includes(shopSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading admin console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Admin Title Card */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 sm:p-8 border border-zinc-900 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-3 py-1 rounded-full uppercase tracking-wider">
            Operational Panel
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Admin Control Suite</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">Audit platform accounts, verify local repair shops, and update the AI diagnosis knowledge base.</p>
        </div>
      </div>

      {/* Stats counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total Accounts</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Repair Shops</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{stats?.totalRepairers || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Requests Logged</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{stats?.totalRequests || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Completed Repairs</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.completedRepairs || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Audit Column (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Repairer Verification Control Portal */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-zinc-400" /> Shop Verification center
              </h2>
              {/* Shop search */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search shops..."
                  value={shopSearchTerm}
                  onChange={(e) => setShopSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 bg-zinc-50 rounded-xl text-xs"
                />
              </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">No repairer shops matched search query.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400 uppercase font-bold text-[9px] tracking-widest">
                      <th className="pb-3">Business Name</th>
                      <th className="pb-3">Owner Details</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((p) => (
                      <tr key={p._id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition">
                        <td className="py-4">
                          <p className="font-bold text-zinc-900">{p.businessName}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{p.categories?.join(', ')}</p>
                        </td>
                        <td className="py-4">
                          <p className="font-semibold text-zinc-800">{p.userId?.name}</p>
                          <p className="text-[10px] text-zinc-450 mt-0.5">{p.userId?.email} &bull; {p.userId?.phone}</p>
                        </td>
                        <td className="py-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[9px] ${
                            p.verificationStatus === 'VERIFIED'
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : p.verificationStatus === 'SUSPENDED'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          }`}>
                            {p.verificationStatus}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {p.verificationStatus === 'PENDING' && (
                              <>
                                <button
                                  disabled={updatingProfileId === p._id}
                                  onClick={() => handleVerifyShop(p._id, 'VERIFIED')}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                                >
                                  Verify
                                </button>
                                <button
                                  disabled={updatingProfileId === p._id}
                                  onClick={() => handleVerifyShop(p._id, 'SUSPENDED')}
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              </>
                            )}
                            {p.verificationStatus === 'VERIFIED' && (
                              <button
                                disabled={updatingProfileId === p._id}
                                onClick={() => handleVerifyShop(p._id, 'SUSPENDED')}
                                className="px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            )}
                            {p.verificationStatus === 'SUSPENDED' && (
                              <button
                                disabled={updatingProfileId === p._id}
                                onClick={() => handleVerifyShop(p._id, 'PENDING')}
                                className="px-2.5 py-1.5 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                              >
                                Restore to Pending
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System Users Registry Directory */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-zinc-400" /> Users Registry
              </h2>
              {/* User search */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 bg-zinc-50 rounded-xl text-xs"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">No registered users matched search query.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredUsers.map((u) => (
                  <div key={u._id} className="border border-zinc-100 rounded-xl p-4 flex justify-between items-center gap-3 hover:bg-zinc-50/50 hover:scale-[1.005] hover:border-zinc-200 transition-all duration-300">
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{u.name}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{u.email}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Phone: {u.phone || 'N/A'}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[8.5px] border uppercase ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-50 border-purple-200 text-purple-800'
                        : u.role === 'REPAIRER'
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar: Knowledge Base Directory */}
        <div className="flex flex-col gap-6">
          
          {/* Repair Knowledge Base parameters */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Database className="h-5 w-5 text-zinc-400" /> Repair Knowledge Base
            </h2>

            <div className="flex flex-col gap-4">
              {knowledge.map(kb => (
                <div key={kb._id} className="border border-zinc-100 rounded-xl p-4 flex justify-between items-center gap-4 hover:bg-zinc-50/30 transition-all duration-300">
                  <div>
                    <p className="text-xs font-extrabold text-zinc-900 tracking-wide uppercase">{kb.category}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Replacement: ₹{kb.replacementMin} - ₹{kb.replacementMax}
                    </p>
                    <p className="text-[10px] text-zinc-450 mt-0.5">
                      Weight: {kb.weight} kg &bull; CO₂: {kb.co2Avoided} kg
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteKnowledge(kb._id)}
                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Knowledge Reference Form */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-150 shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Settings className="h-5 w-5 text-zinc-400" /> Add Knowledge Base
            </h2>

            <form onSubmit={handleCreateKnowledge} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laptop"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 bg-zinc-50 rounded-lg focus:border-zinc-350 focus:bg-white transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Repl. Min (₹)</label>
                  <input
                    type="number"
                    required
                    value={replaceMin}
                    onChange={(e) => setReplaceMin(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 bg-zinc-50 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Repl. Max (₹)</label>
                  <input
                    type="number"
                    required
                    value={replaceMax}
                    onChange={(e) => setReplaceMax(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 bg-zinc-50 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={carbonWeight}
                    onChange={(e) => setCarbonWeight(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 bg-zinc-50 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">CO₂ Offset (kg)</label>
                  <input
                    type="number"
                    required
                    value={carbonCO2}
                    onChange={(e) => setCarbonCO2(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 bg-zinc-50 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingKb}
                className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-semibold py-2.5 rounded-lg text-xs mt-2 disabled:opacity-50 transition"
              >
                {submittingKb ? 'Creating...' : 'Register Category'}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
