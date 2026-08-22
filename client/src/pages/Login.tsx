import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-16 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Log in to RepairConnect</h2>
        <p className="text-gray-500 mt-2 text-sm">Welcome back! Please enter your details below.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
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
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-sm focus:border-primary-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            'Logging in...'
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Log In
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-xs font-medium text-gray-500 border-t border-gray-100 pt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
          Sign up for free &rarr;
        </Link>
      </div>
    </div>
  );
};
