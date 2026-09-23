import React, { useState, useEffect } from 'react';
import { 
  ListFilter, 
  Search, 
  Edit3, 
  Check, 
  X, 
  Percent, 
  DollarSign,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SmmService } from '../../types';

export const AdminServices: React.FC = () => {
  const [services, setServices] = useState<SmmService[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState<number>(0);

  const fetchServices = () => {
    setLoading(true);
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSyncAllServices = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/services/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage({ type: 'success', text: data.message });
        fetchServices();
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Failed to sync services' });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveRate = async (serviceId: number) => {
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: editRate })
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchServices();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (service: SmmService) => {
    const nextStatus = service.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchServices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = 
      s.id.toString().includes(searchQuery) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlatform = platformFilter === 'all' || s.platform.toLowerCase() === platformFilter.toLowerCase();

    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <ListFilter className="w-4 h-4" />
            <span>1:1 Live Service Catalog</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Service Catalog & Exact Provider Rates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Services synced 1:1 directly from your connected SMM Provider node with exact Service IDs and prices in INR (₹).
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncAllServices}
          disabled={syncing}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center space-x-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing Catalog...' : 'Sync Live Provider Services'}</span>
        </button>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
          syncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800'
        }`}>
          {syncMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span className="font-bold">{syncMessage.text}</span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Service ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-slate-400">Platform:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Platforms</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="YouTube">YouTube</option>
            <option value="Telegram">Telegram</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading service catalog...</div>
        ) : filteredServices.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No services found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Platform</th>
                  <th className="py-3.5 px-4">Service Name</th>
                  <th className="py-3.5 px-4">Provider Cost / 1k</th>
                  <th className="py-3.5 px-4">Selling Rate / 1k</th>
                  <th className="py-3.5 px-4">Min / Max</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredServices.map(service => (
                  <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-slate-500 font-bold">#{service.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{service.platform}</td>
                    <td className="py-3 px-4 max-w-xs truncate" title={service.name}>{service.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">₹{service.providerRate.toFixed(2)}</td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {editingId === service.id ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editRate}
                            onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                          />
                          <button onClick={() => handleSaveRate(service.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span>₹{service.rate.toFixed(2)}</span>
                          <button 
                            onClick={() => { setEditingId(service.id); setEditRate(service.rate); }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500">{service.min.toLocaleString()} / {service.max.toLocaleString()}</td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        service.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {service.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(service)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          service.status === 'active' 
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        {service.status === 'active' ? 'Disable' : 'Enable'}
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
