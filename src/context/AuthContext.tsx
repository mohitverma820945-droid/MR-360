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
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
      // Permanent Owner Auto-Session: Default to owner so session never drops
      const defaultOwner: UserProfile = {
        id: 'usr_mohit_owner',
        username: 'MohitVerma',
        name: 'Mohit Verma',
        email: 'mohitverma912022@gmail.com',
        role: 'admin',
        balance: 100000.00,
        apiKey: 'smm_ak_mohit_owner_882199',
        createdAt: '2026-01-01T00:00:00.000Z'
      };
      localStorage.setItem('zynyx_current_user', JSON.stringify(defaultOwner));
      return defaultOwner;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const refreshUser = async () => {
    try {
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
          try {
            setUser(JSON.parse(e.newValue));
          } catch {}
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

      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('zynyx_current_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, error: data?.error || 'Invalid email or password' };
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

      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('zynyx_current_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, error: data?.error || 'Registration failed' };
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
