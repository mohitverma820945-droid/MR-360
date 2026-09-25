import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Wallet,
  Power
} from 'lucide-react';
import { SmmProvider } from '../../types';

export const AdminProviders: React.FC = () => {
  const [providers, setProviders] = useState<SmmProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // New Provider Form State
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id?: string; type: 'success' | 'error'; text: string } | null>(null);

  const fetchProviders = () => {
    setLoading(true);
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setProviders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !apiUrl || !apiKey) return;

    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, apiUrl, apiKey })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setApiUrl('');
        setApiKey('');
        fetchProviders();
        setActionMessage({ type: 'success', text: 'Provider added successfully!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to add provider' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ id, type: 'success', text: `Connection successful! Real Balance: $${data.balance.toFixed(2)} ${data.currency}` });
        fetchProviders();
      } else {
        setActionMessage({ id, type: 'error', text: data.error || 'Connection test failed' });
      }
    } catch (err: any) {
      setActionMessage({ id, type: 'error', text: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncServices = async (id: string) => {
    setSyncingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/providers/${id}/sync-services`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ id, type: 'success', text: data.message });
      } else {
        setActionMessage({ id, type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (err: any) {
      setActionMessage({ id, type: 'error', text: err.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to remove this provider node?')) return;
    try {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'Provider node deleted successfully!' });
        fetchProviders();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to delete provider' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleToggleProviderStatus = async (provider: SmmProvider) => {
    const isCurrentlyActive = provider.status !== 'inactive';
    const nextStatus = isCurrentlyActive ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ 
          type: 'success', 
          text: `Provider "${provider.name}" turned ${nextStatus === 'active' ? 'ON (Active & Visible)' : 'OFF (Services Hidden)'}.` 
        });
        fetchProviders();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to toggle provider status' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteAllProviders = async () => {
    if (!confirm('Are you sure you want to delete ALL connected provider nodes? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/providers', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'All connected provider nodes cleared!' });
        fetchProviders();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to clear providers' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4" />
            <span>Real SMM Provider Nodes</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            SMM API Provider Connections
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connect real SMM providers (SMM API v2 format). Secrets remain strictly server-side.
          </p>
        </div>

        {providers.length > 0 && (
          <button
            onClick={handleDeleteAllProviders}
            className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold text-xs flex items-center space-x-2 transition-all shrink-0"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Delete All Test Providers</span>
          </button>
        )}
      </div>

      {/* Add Provider Card */}
      <form onSubmit={handleAddProvider} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Plus className="w-4 h-4 text-indigo-500" />
          <span>Connect New SMM Provider Node</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Provider Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex SMM Master"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">API Endpoint URL</label>
            <input
              type="url"
              required
              placeholder="https://provider.com/api/v2"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Provider API Key</label>
            <input
              type="password"
              required
              placeholder="API Key / Token"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-colors"
        >
          Add Provider Node
        </button>
      </form>

      {/* Action Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Connected Providers List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading connected providers...</div>
        ) : providers.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-slate-900 dark:text-white">{p.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    p.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 block mt-0.5">{p.apiUrl}</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-right">
                  <span className="text-slate-400 block text-[10px]">Real Provider Balance</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm block">
                    {p.balance !== null ? `₹${(p.balanceInr || p.balance).toFixed(2)} INR` : 'Unavailable'}
                  </strong>
                  {p.balanceUsd !== undefined && p.balanceUsd !== null && (
                    <span className="text-[10px] text-slate-400 block font-mono">
                      (${p.balanceUsd.toFixed(2)} USD)
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteProvider(p.id)}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                  title="Remove Provider"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Provider Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* ON/OFF Toggle Switch */}
              <button
                onClick={() => handleToggleProviderStatus(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
                  p.status !== 'inactive'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                title={p.status !== 'inactive' ? 'Click to turn OFF (Hide services)' : 'Click to turn ON (Activate services)'}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{p.status !== 'inactive' ? 'ON (Active)' : 'OFF (Hidden)'}</span>
              </button>

              <button
                onClick={() => handleTestConnection(p.id)}
                disabled={testingId === p.id}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingId === p.id ? 'animate-spin text-indigo-500' : ''}`} />
                <span>Test API Connection</span>
              </button>

              <button
                onClick={() => handleSyncServices(p.id)}
                disabled={syncingId === p.id}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex items-center space-x-1.5"
              >
                <Layers className={`w-3.5 h-3.5 ${syncingId === p.id ? 'animate-spin' : ''}`} />
                <span>Sync Services Catalog</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
