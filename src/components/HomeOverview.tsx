import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Layers, 
  PlusCircle, 
  CheckCircle, 
  Server, 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { SmmService } from '../types';

interface HomeOverviewProps {
  onNavigate: (tab: string) => void;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ onNavigate }) => {
  const [services, setServices] = useState<SmmService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-black text-white p-6 sm:p-10 border border-amber-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>MR.360 Organic SMM Platform</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Real SMM Provider Execution & Dynamic Engagement Scheduling
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Direct integration with primary SMM provider nodes. Support for Single Orders, Drip-Feed, and All-in-One Campaigns with natural non-equal bundle variance and server-side background scheduling.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('new-order')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Place Single / Drip Order</span>
            </button>

            <button
              onClick={() => onNavigate('all-in-one')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm flex items-center space-x-2 border border-slate-700 transition-all"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>All-in-One Campaign</span>
            </button>

            <button
              onClick={() => onNavigate('admin-providers')}
              className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-sm flex items-center space-x-2 border border-amber-500/40 transition-all"
            >
              <Server className="w-4 h-4 text-amber-400" />
              <span>Add / Manage Providers</span>
            </button>
          </div>
        </div>

        {/* Brand Logo Emblem */}
        <div className="shrink-0 hidden md:flex items-center justify-center">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition duration-700 animate-pulse" />
            <div className="relative w-28 h-28 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 shadow-2xl shadow-amber-500/40 overflow-hidden flex items-center justify-center">
              <img 
                src="/mr360_logo.jpg" 
                alt="MR.360 SMM Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Real Provider Orders</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every order is dispatched to assigned provider nodes returning authentic provider order IDs. No mock data or fake balances.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Dynamic Bundle Variance</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All-in-One campaigns generate natural non-equal bundle partitioning normalized to exact totals (Views &ge; 100, Engagement &ge; 10).
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Server Scheduler</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Background worker processes due scheduled orders even when browser is closed, with atomic job locks & idempotency protection.
          </p>
        </div>

      </div>

      {/* Live Service Catalog Search & Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Server className="w-5 h-5 text-indigo-500" />
              <span>Live Synced Service Catalog</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active services imported directly from connected provider nodes
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search services or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading synced service catalog...</div>
        ) : filteredServices.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No matching services found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Service Name</th>
                  <th className="py-3 px-3">Rate / 1k</th>
                  <th className="py-3 px-3">Min / Max</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredServices.slice(0, 10).map(service => (
                  <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">#{service.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{service.platform}</td>
                    <td className="py-3 px-3 text-slate-500">{service.category}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{service.name}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">₹{service.rate.toFixed(2)}</td>
                    <td className="py-3 px-3 text-slate-500">{service.min.toLocaleString()} / {service.max.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('new-order')}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-400 font-semibold rounded text-[11px] transition-colors"
                      >
                        Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
