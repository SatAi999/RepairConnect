import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Key, User, Phone, Briefcase } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsSubmitting(true);
    const success = await register(name, email, password, role, phone);
    setIsSubmitting(false);

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-12 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
        <p className="text-gray-500 mt-2 text-sm">Join RepairConnect to prolong the lifecycle of your hardware.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Full Name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <User className="h-4 w-4" />
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Mail className="h-4 w-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Phone Number
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Phone className="h-4 w-4" />
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Key className="h-4 w-4" />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Account Role
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Briefcase className="h-4 w-4" />
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-primary-500 appearance-none"
            >
              <option value="CUSTOMER">Customer (Broken Item Owner)</option>
              <option value="REPAIRER">Repair Professional (Technician)</option>
            </select>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 pl-1">
            {role === 'CUSTOMER'
              ? 'Analyze items, find nearby experts, request repair work.'
              : 'Create a workshop profile, offer services, bid on repair jobs.'}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
        >
          {isSubmitting ? (
            'Creating account...'
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Sign Up
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs font-medium text-gray-500 border-t border-gray-100 pt-6">
        Already registered?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
          Log in here &rarr;
        </Link>
      </div>
    </div>
  );
};
