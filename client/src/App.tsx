import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layout & Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { RepairAnalysis } from './pages/RepairAnalysis';
import { CaseDetails } from './pages/CaseDetails';
import { RequestDetails } from './pages/RequestDetails';
import { DiagnosticFlow } from './pages/DiagnosticFlow';
import { RecoveryCenter } from './pages/RecoveryCenter';
import { ProductPassport } from './pages/ProductPassport';
import { CircularityDashboard } from './pages/CircularityDashboard';

// Protect routes helper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Protect routes by specific roles helper
const RoleRoute: React.FC<{ children: React.ReactNode; roles: string[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
            
            {/* Nav Header */}
            <Header />

            {/* Core views layout */}
            <main className="flex-grow flex flex-col justify-start">
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Common */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                
                {/* Protected Customer Cases */}
                <Route path="/analyze" element={<ProtectedRoute><RoleRoute roles={['CUSTOMER']}><RepairAnalysis /></RoleRoute></ProtectedRoute>} />
                <Route path="/cases/:id" element={<ProtectedRoute><CaseDetails /></ProtectedRoute>} />

                {/* Protected Requests Timeline */}
                <Route path="/requests/:id" element={<ProtectedRoute><RequestDetails /></ProtectedRoute>} />

                {/* V2 New Routes */}
                <Route path="/diagnostic/:caseId" element={<ProtectedRoute><DiagnosticFlow /></ProtectedRoute>} />
                <Route path="/recovery/:caseId" element={<ProtectedRoute><RecoveryCenter /></ProtectedRoute>} />
                <Route path="/passport/:caseId" element={<ProtectedRoute><ProductPassport /></ProtectedRoute>} />
                <Route path="/circularity" element={<ProtectedRoute><CircularityDashboard /></ProtectedRoute>} />

                {/* Catch All */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <Footer />

          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
