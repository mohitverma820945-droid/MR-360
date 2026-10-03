import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getStoredUserId } from '../utils/apiAuth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('zynyx_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const refreshUser = async () => {
    try {
      const stored = localStorage.getItem('zynyx_current_user');
      let storedUser: UserProfile | null = null;
      if (stored) {
        try {
          storedUser = JSON.parse(stored);
        } catch {
          storedUser = null;
        }
      }

      if (storedUser) {
        setUser(storedUser);
      }

      const currentStoredId = getStoredUserId();
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': currentStoredId }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('zynyx_current_user', JSON.stringify(data.user));
          return;
        }
      }
    } catch (err) {
      console.error('[Auth] Error fetching user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    
    // Cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zynyx_current_user') {
        if (e.newValue) {
          setUser(JSON.parse(e.newValue));
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentGuestId = getStoredUserId();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, guestUserId: currentGuestId })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { success: false, error: 'Authentication service temporarily unavailable. Please try again.' };
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('zynyx_current_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid email or password' };
    } catch (err: any) {
      return { success: false, error: 'Connection failed. Please check network and try again.' };
    }
  };

  const register = async (email: string, password: string, username?: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentGuestId = getStoredUserId();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, username, name, guestUserId: currentGuestId })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { success: false, error: 'Registration service temporarily unavailable. Please try again.' };
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('zynyx_current_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: 'Connection failed. Please check network and try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zynyx_current_user');
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mr360_cached_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        showAuthModal,
        setShowAuthModal,
        authMode,
        setAuthMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
