import React, { useState, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  Layers, 
  History, 
  MoreHorizontal, 
  ShieldAlert, 
  RefreshCw, 
  Sun, 
  Moon, 
  Wallet,
  Zap,
  Server,
  ListFilter,
  Clock,
  Menu,
  X,
  Plus,
  LogOut,
  LogIn,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaderObj } from '../utils/apiAuth';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  isAdmin,
  setIsAdmin,
  darkMode,
  setDarkMode
}) => {
  const { user, isAuthenticated, logout, setShowAuthModal, setAuthMode } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [providerBalance, setProviderBalance] = useState<{
    balance: number | null;
    balanceUsd?: number | null;
    currency: string;
    providerName: string;
  }>({ balance: null, balanceUsd: null, currency: 'INR', providerName: 'Loading...' });

  const [loadingBalance, setLoadingBalance] = useState(false);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const res = await fetch('/api/balance', {
        headers: getAuthHeaderObj()
      });
      const data = await res.json();
      if (data.success && data.balance !== undefined) {
        setProviderBalance({
          balance: data.balance,
          balanceUsd: data.balanceUsd,
          currency: 'INR',
          providerName: data.providerName || 'Primary Provider'
        });
      } else {
        setProviderBalance({
          balance: null,
          balanceUsd: null,
          currency: 'INR',
          providerName: data.providerName || 'Provider'
        });
      }
    } catch {
      setProviderBalance({ balance: null, balanceUsd: null, currency: 'INR', providerName: 'Provider' });
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleTabClick = (tabId: string) => {
    if (tabId.startsWith('admin-') || tabId === 'admin-dash') {
      setIsAdmin(true);
      setCurrentTab(tabId);
    } else {
      if (tabId === 'home' && isAdmin) {
        setIsAdmin(false);
      }
      setCurrentTab(tabId);
    }
    setDrawerOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-pink-100 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Hamburger Menu & Logo Branding */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:text-pink-600 transition-colors cursor-pointer"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div 
                className="flex items-center space-x-2.5 cursor-pointer group" 
                onClick={() => setCurrentTab(isAdmin ? 'admin-dash' : 'all-in-one')}
              >
                <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-md shadow-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                  <img 
                    src="/mr360_logo.jpg" 
                    alt="MR.360 Logo" 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-1">
                    <span>MR.</span>
                    <span className="text-amber-500">360</span>
                    <span className="text-[10px] font-black tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                      SMM
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Pill Bar */}
            <nav className="hidden lg:flex items-center space-x-1.5">
              <button
                onClick={() => handleTabClick('all-in-one')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentTab === 'all-in-one' 
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-900 hover:text-pink-600'
                }`}
              >
                <Layers className="w-4 h-4 text-pink-300" />
                <span>Full Engagement (100+ Patterns)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/20 text-white font-extrabold">HOT</span>
              </button>

              <button
                onClick={() => handleTabClick('new-order')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentTab === 'new-order' 
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-900 hover:text-pink-600'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Single Order</span>
              </button>

              <button
                onClick={() => handleTabClick('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentTab === 'history' 
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-900 hover:text-pink-600'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Orders</span>
              </button>

              <button
                onClick={() => handleTabClick('customer-providers')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentTab === 'customer-providers' 
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-900 hover:text-pink-600'
                }`}
              >
                <Server className="w-4 h-4 text-pink-500" />
                <span>Connect Provider API</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => handleTabClick('admin-dash')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isAdmin 
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md' 
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Admin Panel</span>
                </button>
              )}
            </nav>

            {/* Header Right Wallet, User & Theme */}
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              
              {/* Wallet Balance Badge */}
              <div className="flex items-center space-x-2 bg-pink-50/70 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-pink-200 dark:border-slate-800 text-xs font-medium">
                <Wallet className="w-4 h-4 text-pink-500 shrink-0" />
                <span 
                  className="text-slate-900 dark:text-white font-extrabold cursor-help font-mono"
                  title={providerBalance.balanceUsd ? `USD Balance: $${providerBalance.balanceUsd.toFixed(2)} USD` : 'INR Balance'}
                >
                  {providerBalance.balance !== null ? `₹${providerBalance.balance.toFixed(2)}` : '₹0.00'}
                </span>
                <button 
                  onClick={fetchBalance}
                  disabled={loadingBalance}
                  title="Sync Real Provider Balance"
                  className="p-1 text-slate-400 hover:text-pink-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingBalance ? 'animate-spin text-pink-500' : ''}`} />
                </button>
              </div>

              {/* User Account / Login Button */}
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/60 dark:hover:bg-pink-900/60 border border-pink-200 dark:border-pink-800/60 text-xs font-bold text-pink-700 dark:text-pink-300 transition-all cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                      {(user.name || user.username || user.email)[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:inline max-w-[90px] truncate">{user.name || user.username}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-pink-600 text-white">
                      {user.role}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 space-y-2 animate-fadeIn">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {user.name || user.username}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Account Role</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400">
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleTabClick('customer-providers');
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-xl flex items-center space-x-2 cursor-pointer"
                      >
                        <Server className="w-4 h-4 text-pink-500" />
                        <span>Connect My SMM Provider API</span>
                      </button>

                      {user.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setIsAdmin(true);
                            setCurrentTab('admin-dash');
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center space-x-2 cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          <span>Admin Control Center</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleTabClick('history');
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center space-x-2 cursor-pointer"
                      >
                        <History className="w-4 h-4 text-pink-500" />
                        <span>My Saved Orders</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center space-x-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-extrabold flex items-center space-x-1 shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* Slide-over Drawer Menu Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-950 text-slate-900 dark:text-white h-full shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out border-r border-slate-200 dark:border-slate-800">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-pink-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-pink-50/50 via-rose-50/30 to-pink-50/50 dark:from-slate-950 dark:to-slate-900">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-md shadow-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                  <img 
                    src="/mr360_logo.jpg" 
                    alt="MR.360 Logo" 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">
                  MR.<span className="text-amber-500">360</span> SMM
                </span>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card inside Drawer (Clean, No fake balance) */}
            <div className="p-4 border-b border-pink-100 dark:border-slate-800 bg-pink-50/60 dark:bg-pink-950/20">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-fuchsia-600 text-white font-black flex items-center justify-center text-xs shadow-sm">
                      {(user.name || user.username || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                        {user.name || user.username}
                      </div>
                      <div className="text-[10px] text-pink-600/80 dark:text-pink-300/80 leading-tight truncate max-w-[150px]">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-pink-600 text-white shadow-sm">
                    {user.role}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Not Logged In</span>
                    <span className="text-[10px] text-slate-400">Sign in to save orders & provider keys</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-extrabold text-xs cursor-pointer shadow-md shadow-pink-600/20"
                  >
                    Login / Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Live SMM Provider API Balance Box */}
            <div className="p-5 border-b border-pink-100 dark:border-slate-800 bg-gradient-to-b from-pink-50/30 to-white dark:from-slate-900/50 dark:to-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Provider SMM Balance
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 font-extrabold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live API</span>
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono flex items-baseline space-x-1">
                <span className="text-pink-600 dark:text-pink-400 font-bold">₹</span>
                <span>{providerBalance.balance !== null ? providerBalance.balance.toFixed(2) : '0.00'}</span>
                {providerBalance.balanceUsd != null && (
                  <span className="text-xs font-normal text-slate-400 pl-1">
                    (${providerBalance.balanceUsd.toFixed(2)})
                  </span>
                )}
              </div>
              <button 
                onClick={() => handleTabClick('customer-providers')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs shadow-md shadow-pink-600/25 flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Connect SMM Provider API</span>
              </button>
            </div>

            {/* Menu Links */}
            <div className="p-4 space-y-1 flex-1 overflow-y-auto text-xs font-bold">
              <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 py-1">Main Application</div>
              
              <button
                onClick={() => handleTabClick('all-in-one')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                  currentTab === 'all-in-one' ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Layers className="w-4 h-4 text-pink-500" />
                  <span>Full Engagement (100+ Patterns)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500 text-white font-extrabold uppercase">
                  HOT
                </span>
              </button>

              <button
                onClick={() => handleTabClick('new-order')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                  currentTab === 'new-order' ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-pink-500" />
                <span>Single Order</span>
              </button>

              <button
                onClick={() => handleTabClick('history')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                  currentTab === 'history' ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4 text-pink-500" />
                <span>My Saved Orders</span>
              </button>

              <button
                onClick={() => handleTabClick('customer-providers')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                  currentTab === 'customer-providers' ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Server className="w-4 h-4 text-pink-500" />
                <span>Connect Provider API Keys</span>
              </button>

              {user?.role === 'admin' && (
                <>
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 py-1 pt-4">Admin Controls</div>

                  <button
                    onClick={() => handleTabClick('admin-dash')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      currentTab === 'admin-dash' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Admin Control Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('admin-providers')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      currentTab === 'admin-providers' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Server className="w-4 h-4 text-amber-500" />
                    <span>Manage Global Providers</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('admin-schedules')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      currentTab === 'admin-schedules' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Server Scheduler Queue</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('admin-services')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                      currentTab === 'admin-services' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <ListFilter className="w-4 h-4 text-amber-500" />
                    <span>Wholesale Services Catalog</span>
                  </button>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Currency</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-extrabold">
                  INR (₹)
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
