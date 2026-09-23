import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShoppingBag, 
  Activity, 
  DollarSign, 
  Server, 
  Layers, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface AdminStats {
  usersCount: number;
  ordersCount: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  revenue: number;
  deliveredUnits: number;
  providersCount: number;
  activeProvidersCount: number;
  servicesCount: number;
  schedulesPending: number;
  schedulesSubmitted: number;
  schedulerLastRun: string | null;
  schedulerActive: boolean;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingBalances, setRefreshingBalances] = useState<boolean>(false);
  const [balanceMsg, setBalanceMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshBalances = async () => {
    setRefreshingBalances(true);
    setBalanceMsg(null);
    try {
      const res = await fetch('/api/providers/refresh-balance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBalanceMsg('Provider balances updated successfully!');
        fetchStats();
      } else {
        setBalanceMsg(data.error || 'Failed to refresh provider balances');
      }
    } catch (err: any) {
      setBalanceMsg('Error refreshing balances');
    } finally {
      setRefreshingBalances(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-500" />
        <span>Loading Admin System Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
            <Zap className="w-4 h-4" />
            <span>Platform Overview</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Admin Control Hub</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real database metrics, active background schedules & provider node status.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefreshBalances}
            disabled={refreshingBalances}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingBalances ? 'animate-spin' : ''}`} />
            <span>Refresh Balances</span>
          </button>

          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-2 border border-slate-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Stats</span>
          </button>
        </div>
      </div>

      {balanceMsg && (
        <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{balanceMsg}</span>
          </div>
          <button onClick={() => setBalanceMsg(null)} className="text-slate-400 hover:text-slate-200">&times;</button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Users</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-3 text-slate-900 dark:text-white">{stats?.usersCount || 0}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-1">
            <TrendingUp className="w-3 h-3 mr-1" /> Active Platform Accounts
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Orders</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-3 text-slate-900 dark:text-white">{stats?.ordersCount || 0}</p>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{stats?.activeOrdersCount || 0} Active</span>
            <span>&bull;</span>
            <span className="text-emerald-600 dark:text-emerald-400">{stats?.completedOrdersCount || 0} Completed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Revenue</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-3 text-slate-900 dark:text-white">₹{stats?.revenue.toFixed(2) || '0.00'}</p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            From {stats?.ordersCount || 0} customer submissions
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Units Delivered</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-3 text-slate-900 dark:text-white">{stats?.deliveredUnits?.toLocaleString() || 0}</p>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1 block">
            Views, Likes, Comments & Shares
          </span>
        </div>

      </div>

      {/* Secondary Details & Background Worker Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Server-Side Background Scheduler Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Server Background Scheduler</h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center space-x-1 ${
              stats?.schedulerActive
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
              <span>{stats?.schedulerActive ? 'ACTIVE (10s Cron)' : 'Paused'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Pending Queue Runs</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats?.schedulesPending || 0}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Completed Runs</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.schedulesSubmitted || 0}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span>Last Background Pass:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
              {stats?.schedulerLastRun ? new Date(stats?.schedulerLastRun).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>

        {/* Connected SMM Provider Nodes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Connected Provider Nodes</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {stats?.activeProvidersCount || 0} / {stats?.providersCount || 0} Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Synced Services</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">{stats?.servicesCount || 0}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Active Providers</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.activeProvidersCount || 0} Nodes</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span>Server Security:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> API Keys Isolated Server-Side
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
