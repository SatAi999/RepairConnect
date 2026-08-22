import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Recycle, Wrench, Package, TrendingUp, ArrowLeft, Loader2, BarChart2 } from 'lucide-react';

export const CircularityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recovery/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const pathways = [
    { label: 'Repaired', value: data?.repaired || 0, color: 'bg-blue-500', icon: '🔧' },
    { label: 'In Recovery', value: data?.inRecovery || 0, color: 'bg-amber-500', icon: '⏳' },
    { label: 'Recovery Completed', value: data?.recovered || 0, color: 'bg-green-500', icon: '♻️' },
  ];
  const total = pathways.reduce((sum, p) => sum + p.value, 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-green-200 hover:text-white transition-colors mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <BarChart2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Circularity Dashboard</h1>
              <p className="text-green-200 text-sm mt-1">Real platform metrics. No fabricated CO₂ numbers.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Cases', value: data?.totalCases || 0, icon: Package, color: 'text-blue-600 bg-blue-50' },
            { label: 'Products Repaired', value: data?.repaired || 0, icon: Wrench, color: 'text-blue-600 bg-blue-50' },
            { label: 'Recovery Completed', value: data?.recovered || 0, icon: Recycle, color: 'text-green-600 bg-green-50' },
            { label: 'In Recovery', value: data?.inRecovery || 0, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
            { label: 'Completion Rate', value: `${data?.completionRate || 0}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
            { label: 'Verified Weight (kg)', value: `${(data?.verifiedWeightKg || 0).toFixed(1)} kg`, icon: Package, color: 'text-teal-600 bg-teal-50' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${kpi.color.split(' ')[1]}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color.split(' ')[0]}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Pathway Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Case Distribution</h2>
          <div className="space-y-3">
            {pathways.map((p, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{p.icon} {p.label}</span>
                  <span className="text-sm font-bold text-gray-900">{p.value}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${p.color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.round((p.value / total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">DEMO DATA</p>
            <p className="text-amber-700 text-sm mt-1">
              These metrics reflect activity in the RepairConnect demonstration database. 
              This dashboard intentionally shows only platform-verifiable metrics — no CO₂ claims, no fabricated environmental impact numbers.
              "Verified weight" is only counted when a recovery partner manually confirms pickup weight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
