import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useToast } from './ToastContext';

export interface UserType {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'REPAIRER' | 'ADMIN';
  phone?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (name: string, phone?: string, location?: [number, number]) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        if (response.data?.success) {
          setUser(response.data.data);
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Fetch me error:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success) {
        const { token, user: userData } = response.data.data;
        localStorage.setItem('token', token);
        setUser(userData);
        showToast(`Welcome back, ${userData.name}!`, 'success');
        return true;
      }
      return false;
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || 'Login failed. Please check credentials.';
      showToast(errMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string,
    phone?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', { name, email, password, role, phone });
      if (response.data?.success) {
        const { token, user: userData } = response.data.data;
        localStorage.setItem('token', token);
        setUser(userData);
        showToast('Account registered successfully!', 'success');
        return true;
      }
      return false;
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || 'Registration failed.';
      showToast(errMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    showToast('Logged out successfully.', 'info');
  };

  const updateProfile = async (name: string, phone?: string, location?: [number, number]): Promise<boolean> => {
    try {
      const payload: any = { name, phone };
      if (location) {
        payload.location = {
          type: 'Point',
          coordinates: location, // [lng, lat]
        };
      }
      const response = await api.patch('/auth/me', payload);
      if (response.data?.success) {
        setUser(response.data.data);
        showToast('Profile updated successfully!', 'success');
        return true;
      }
      return false;
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || 'Failed to update profile.';
      showToast(errMsg, 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
