import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  ExternalLink, 
  ShieldCheck, 
  Zap,
  Lock,
  Layers
} from 'lucide-react';
import { SmmProvider } from '../types';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaderObj } from '../utils/apiAuth';

export const CustomerProviderManager: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<SmmProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Provider Form State
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers', {
        headers: getAuthHeaderObj()
      });
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to load your connected providers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [user]);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !apiUrl || !apiKey) {
      setStatusMessage({ type: 'error', text: 'Please fill in Name, API URL and API Key.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaderObj()
        },
        body: JSON.stringify({ name, apiUrl, apiKey, userId: user?.id })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Provider "${name}" connected successfully! Real services synced.` });
        setName('');
        setApiUrl('');
        setApiKey('');
        setShowAddForm(false);
        fetchProviders();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to add provider.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/providers/${id}/test`, {
        method: 'POST',
        headers: getAuthHeaderObj()
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'Connection test successful!' });
        fetchProviders();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Connection test failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncServices = async (id: string) => {
    setSyncingId(id);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/providers/${id}/sync-services`, {
        method: 'POST',
        headers: getAuthHeaderObj()
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Synced ${data.count} services 1:1 with exact provider IDs & pricing!` });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to sync services.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!window.confirm('Are you sure you want to disconnect this SMM provider node?')) return;
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaderObj()
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Provider removed.' });
        fetchProviders();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-pink-500/15 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider text-pink-100">
            <Key className="w-3.5 h-3.5" />
            <span>BYOP (Bring Your Own Provider API)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Connect Your SMM Provider Panel
          </h2>
          <p className="text-xs sm:text-sm text-pink-100 max-w-2xl leading-relaxed">
            Connect your own external SMM provider API key. Orders will be dispatched directly to your connected provider node at 0% markup wholesale pricing with exact 1:1 Service IDs.
          </p>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-bold ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Your Connected SMM Provider Nodes</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 font-mono font-bold">
              {providers.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Each customer manages their own private API connection. Your credentials are fully encrypted and never shared.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-md shadow-pink-600/20 flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'Connect New Provider'}</span>
        </button>
      </div>

      {/* Add Provider Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleAddProvider} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-pink-200 dark:border-slate-800 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Server className="w-4 h-4 text-pink-500" />
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Connect External SMM API Endpoint
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Provider Name / Label
              </label>
              <input
                type="text"
                required
                placeholder="e.g. My YoyoMedia Panel / Apex SMM Main"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                API URL (Standard v2 API)
              </label>
              <input
                type="url"
                required
                placeholder="https://yoyomedia.in/api/v2"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                API Key
              </label>
              <input
                type="password"
                required
                placeholder="Enter your provider API Key"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-md shadow-pink-600/20 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting & Syncing 1:1 Services...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Save & Sync Real Services</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Provider List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500" />
          <p className="text-xs">Loading your connected SMM providers...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto text-xl">
            ⚡
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              No SMM Provider Connected Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Apna khudka SMM Provider API (URL & Key) connect karein taaki aap exact wholesale rates aur direct provider service IDs par orders dispatch kar sakein!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-md shadow-pink-600/20 inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect My SMM Provider Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {providers.map(p => (
            <div 
              key={p.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">{p.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      p.status === 'active' 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                    <span>{p.apiUrl}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(p.id)}
                    disabled={testingId === p.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingId === p.id ? 'animate-spin text-pink-500' : ''}`} />
                    <span>Test Balance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSyncServices(p.id)}
                    disabled={syncingId === p.id}
                    className="px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950 hover:bg-pink-100 dark:hover:bg-pink-900 text-pink-600 dark:text-pink-400 font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Layers className={`w-3.5 h-3.5 ${syncingId === p.id ? 'animate-spin' : ''}`} />
                    <span>Sync 1:1 Services</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteProvider(p.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Provider"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balance & Info */}
              <div className="p-3 bg-pink-50/40 dark:bg-slate-800/60 rounded-2xl border border-pink-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Live Provider Balance</div>
                  <div className="font-mono font-black text-slate-900 dark:text-white">
                    {p.balance !== null && p.balance !== undefined ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{p.balance.toFixed(2)} INR {p.balanceUsd != null ? `($${p.balanceUsd.toFixed(2)})` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">Click "Test Balance" to sync</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Service ID Mapping</div>
                  <div className="text-[11px] font-bold text-pink-600 dark:text-pink-400">
                    Exact 1:1 Provider IDs (0% Markup)
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Security Banner */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-pink-500 shrink-0" />
        <span>
          <strong>Zero Leakage Security:</strong> Aapki API keys encrypted server environment me store hoti hain aur frontend par expose nahi hoti.
        </span>
      </div>

    </div>
  );
};
