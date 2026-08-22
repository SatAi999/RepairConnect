import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Clock, CheckCircle2, User, Phone, MapPin, ShieldCheck, Star,
  Calendar, CreditCard, ChevronRight, MessageSquare, AlertTriangle, RefreshCw
} from 'lucide-react';

export const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [request, setRequest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<any>(null);

  // Review states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchRequestDetails = async () => {
    try {
      const res = await api.get(`/repair-requests/${id}`);
      if (res.data?.success) {
        const reqData = res.data.data.request;
        setRequest(reqData);
        setHistory(res.data.data.history);
        
        // Fetch inspection if case is recovery eligible or has an inspection linked
        if (reqData.repairCaseId?._id) {
          try {
            const inspRes = await api.get(`/inspection/${reqData.repairCaseId._id}`);
            if (inspRes.data?.success) {
              setInspection(inspRes.data.data);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load service request details.', 'error');
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await fetchRequestDetails();
      setLoading(false);
    };
    bootstrap();
  }, [id]);

  const handleStatusChange = async (newStatus: string, note: string) => {
    try {
      const res = await api.patch(`/repair-requests/${id}/status`, {
        status: newStatus,
        note,
      });
      if (res.data?.success) {
        showToast(`Request ${newStatus.toLowerCase()} successfully.`, 'success');
        fetchRequestDetails();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Status transition failed.';
      showToast(errMsg, 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    setSubmittingReview(true);
    try {
      const repairerProfileId = request.repairerId._id;
      const res = await api.post(`/repairers/${repairerProfileId}/reviews`, {
        repairRequestId: request._id,
        rating,
        comment,
      });

      if (res.data?.success) {
        showToast('Review submitted. Thank you for your feedback!', 'success');
        setReviewSubmitted(true);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to submit review.';
      showToast(errMsg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading tracking logs...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 font-semibold">Service request not found.</p>
      </div>
    );
  }

  const isCustomer = user?.role === 'CUSTOMER';
  const isRepairer = user?.role === 'REPAIRER';

  // Check state milestones
  const steps = [
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'DIAGNOSIS', label: 'Diagnosis In Progress' },
    { key: 'ESTIMATE_PROVIDED', label: 'Quote Submitted' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REPAIR_IN_PROGRESS', label: 'Repairing' },
    { key: 'READY_FOR_PICKUP', label: 'Ready' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === request.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold bg-primary-100 text-primary-800 border border-primary-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Ticket ID: #{request._id.substring(18)}
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-3">
            Track Progress: {request.repairCaseId?.itemName}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Status: <span className="font-bold text-primary-600">{request.status}</span> &bull; Shop: {request.repairerId?.businessName}
          </p>
        </div>
        
        {request.quotedAmount && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Approved Quote</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">₹{request.quotedAmount}</p>
          </div>
        )}
      </div>

      {/* Visual Progress Steps Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="flex items-center min-w-[700px] justify-between pb-2">
          {steps.map((step, idx) => {
            const isPassed = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1.5 flex-1 relative">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center border font-bold text-xs shadow-sm transition ${
                      isPassed
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[9px] font-bold text-center w-20 truncate ${isPassed ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition ${idx < currentStepIdx ? 'bg-primary-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Timeline logs */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" /> Tracking Milestones
          </h2>

          <div className="relative border-l border-gray-200 pl-6 ml-3 flex flex-col gap-6">
            {history.map((log) => (
              <div key={log._id} className="relative">
                <span className="absolute -left-[30px] top-1.5 h-4 w-4 rounded-full bg-primary-600 border border-white" />
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{log.status} Milestone Reached</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{log.note}</p>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-2">By: {log.changedBy?.name} ({log.changedBy?.role.toLowerCase()})</span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-semibold">
                    {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Customer approval for Estimate Quote stage */}
          {request.status === 'ESTIMATE_PROVIDED' && isCustomer && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mt-4 flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-xs text-orange-900">Approve Service Quote</h3>
                <p className="text-xs text-orange-800 mt-0.5">
                  The workshop estimated the repair at <span className="font-bold">₹{request.quotedAmount}</span>. Approve to authorize technician start, or cancel request.
                </p>
              </div>
              <div className="flex gap-2 justify-end text-xs font-semibold">
                <button
                  onClick={() => handleStatusChange('CANCELLED', 'Pricing rejected by customer.')}
                  className="px-4 py-2 hover:bg-orange-100 border border-orange-200 text-orange-800 rounded-lg"
                >
                  Cancel Request
                </button>
                <button
                  onClick={() => handleStatusChange('APPROVED', 'Quote approved. Ready for repair.')}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
                >
                  Approve & Authorize Repair
                </button>
              </div>
            </div>
          )}

          {/* Review input box for Customer upon completed status */}
          {request.status === 'COMPLETED' && isCustomer && !reviewSubmitted && (
            <div className="border-t border-gray-100 pt-6 mt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1">
                ⭐ Review & Rate Experience
              </h3>
              
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Rating Stars</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(parseInt(e.target.value))}
                    className="w-28 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg"
                  >
                    <option value={5}>5 Stars (Excellent)</option>
                    <option value={4}>4 Stars (Good)</option>
                    <option value={3}>3 Stars (Average)</option>
                    <option value={2}>2 Stars (Fair)</option>
                    <option value={1}>1 Star (Poor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Feedback Comment</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Rate the speed, cost, and service quality..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-primary-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-5 text-xs rounded-lg disabled:opacity-50 self-end"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Right Column: Profile details info */}
        <div className="flex flex-col gap-6 text-xs">
          
          {/* Technician Physical Inspection Details Card */}
          {inspection && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1">
                🔧 Physical Inspection Report
              </h3>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Decision</p>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${
                  inspection.repairDecision === 'REPAIRABLE' ? 'bg-green-150 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {inspection.repairDecision.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Diagnosis Notes</p>
                <p className="text-gray-700 mt-1 italic leading-relaxed">"{inspection.inspectionNotes}"</p>
              </div>
              {inspection.affectedComponents?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Affected Components</p>
                  <div className="flex flex-wrap gap-1">
                    {inspection.affectedComponents.map((c: string, idx: number) => (
                      <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {['BEYOND_REPAIR', 'ECONOMICALLY_IMPRACTICAL', 'CUSTOMER_DECLINED'].includes(inspection.repairDecision) && (
                <Link
                  to={`/recovery/${request.repairCaseId._id}`}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-center transition block text-xs mt-2"
                >
                  Go to Recovery Center &rarr;
                </Link>
              )}
            </div>
          )}

          {/* Workshop Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Workshop Partner</h3>
            <div>
              <p className="font-bold text-sm text-gray-900">{request.repairerId?.businessName}</p>
              <p className="text-gray-500 mt-1 leading-relaxed">{request.repairerId?.description}</p>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Appointment: {new Date(request.scheduledDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Customer Details Card (Only shown to Repairer/Admin) */}
          {!isCustomer && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Customer Profile</h3>
              <div>
                <p className="font-bold text-sm text-gray-900">{request.userId?.name}</p>
                <p className="text-gray-500 mt-1">Email: {request.userId?.email}</p>
                <p className="text-gray-500 mt-0.5">Phone: {request.userId?.phone || 'No phone number provided'}</p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
