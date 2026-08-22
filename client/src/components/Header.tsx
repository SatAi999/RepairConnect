import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Bell, LogOut, Wrench, Menu, X, ShieldAlert } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data?.success) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const markAsRead = async (notifId: string, link?: string) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      setShowNotifications(false);
      if (link) navigate(link);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-primary-500 text-white p-2 rounded-lg flex items-center justify-center">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Repair<span className="text-primary-600">Connect</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-6 items-center">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-gray-700 hover:text-primary-600">
                  Dashboard
                </Link>
                {user.role === 'CUSTOMER' && (
                  <>
                    <Link to="/analyze" className="text-sm font-semibold bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                      Analyze Damaged Item
                    </Link>
                  </>
                )}
                {user.role === 'ADMIN' && (
                  <span className="flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    <ShieldAlert className="h-3 w-3" /> Admin
                  </span>
                )}

                {/* Notifications Panel Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none hover:bg-gray-100 transition relative"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                    )}
                  </button>

                  {/* Dropdown Box */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-semibold text-gray-800">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full font-semibold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-500 text-xs">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map(n => (
                            <button
                              key={n._id}
                              onClick={() => markAsRead(n._id, n.link)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex flex-col gap-1 transition"
                            >
                              <div className="font-medium text-xs text-gray-800 flex justify-between items-center">
                                <span>{n.title}</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                              </div>
                              <p className="text-gray-500 text-xs line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-gray-400">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile indicator & Logout */}
                <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{user.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{user.role.toLowerCase()}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-600">
                  Log in
                </Link>
                <Link to="/register" className="text-sm font-semibold bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Icon */}
          <div className="flex md:hidden items-center gap-4">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 relative"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
                  )}
                </button>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 hover:text-gray-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 py-3 px-4 flex flex-col gap-2">
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded">
                Dashboard
              </Link>
              {user.role === 'CUSTOMER' && (
                <Link to="/analyze" onClick={() => setMobileMenuOpen(false)} className="block text-center bg-primary-600 text-white py-2.5 rounded font-semibold my-2">
                  Analyze Damaged Item
                </Link>
              )}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-center py-2.5 text-base font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50">
                Log in
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block text-center bg-primary-600 text-white py-2.5 rounded font-semibold">
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};
