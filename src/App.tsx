import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { Navigation } from './components/Navigation';
import { HomeOverview } from './components/HomeOverview';
import { SingleOrderForm } from './components/SingleOrderForm';
import { AllInOneOrderForm } from './components/AllInOneOrderForm';
import { OrderHistoryView } from './components/OrderHistoryView';
import { CustomerProviderManager } from './components/CustomerProviderManager';
import { MoreMenu } from './components/MoreMenu';

import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AdminProviders } from './components/AdminPanel/AdminProviders';
import { AdminServices } from './components/AdminPanel/AdminServices';
import { AdminOrders } from './components/AdminPanel/AdminOrders';
import { AdminSchedules } from './components/AdminPanel/AdminSchedules';
import { AdminLogs } from './components/AdminPanel/AdminLogs';
import { AdminSettings } from './components/AdminPanel/AdminSettings';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('all-in-one');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const { user, isAuthenticated, setAuthMode, setShowAuthModal } = useAuth();

  // Auto set admin state if logged in as admin
  useEffect(() => {
    if (user?.role === 'admin' && currentTab.startsWith('admin-')) {
      setIsAdmin(true);
    }
  }, [user, currentTab]);

  // Sync dark class on root document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleNavigate = (tab: string) => {
    if (tab.startsWith('admin-')) {
      setIsAdmin(true);
    }
    setCurrentTab(tab);
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  // IF NOT AUTHENTICATED -> SHOW PUBLIC LANDING PAGE
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <LandingPage onOpenAuth={handleOpenAuth} />
        <AuthModal />
      </div>
    );
  }

  // IF AUTHENTICATED -> SHOW MAIN APPLICATION
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Navigation Header */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={handleNavigate}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Auth Modal for Switch / Settings */}
      <AuthModal />

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Admin Mode Top Exit Banner */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 border border-pink-900/50 text-white px-4 py-2.5 rounded-2xl shadow-lg mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wide text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Admin Panel Mode Active</span>
            </div>

            <button
              onClick={() => {
                setIsAdmin(false);
                setCurrentTab('all-in-one');
              }}
              className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition-all shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Exit Admin Panel &rarr; Customer View</span>
            </button>
          </div>
        )}

        {currentTab === 'all-in-one' && <AllInOneOrderForm />}
        {currentTab === 'new-order' && <SingleOrderForm />}
        {currentTab === 'history' && <OrderHistoryView />}
        {currentTab === 'customer-providers' && <CustomerProviderManager />}
        {currentTab === 'home' && <HomeOverview onNavigate={handleNavigate} />}
        {currentTab === 'more' && <MoreMenu />}

        {/* Admin Views */}
        {currentTab === 'admin-dash' && <AdminDashboard />}
        {currentTab === 'admin-providers' && <AdminProviders />}
        {currentTab === 'admin-services' && <AdminServices />}
        {currentTab === 'admin-orders' && <AdminOrders />}
        {currentTab === 'admin-schedules' && <AdminSchedules />}
        {currentTab === 'admin-logs' && <AdminLogs />}
        {currentTab === 'admin-settings' && <AdminSettings />}
      </main>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
