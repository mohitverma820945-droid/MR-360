import React, { useState } from 'react';
import { 
  Code2, 
  Key, 
  Copy, 
  Check, 
  HelpCircle, 
  RefreshCw, 
  Terminal, 
  ShieldCheck, 
  User 
} from 'lucide-react';

export const MoreMenu: React.FC = () => {
  const [apiKey, setApiKey] = useState('zynyx_ak_client_88127364');
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'account' | 'help'>('api');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    const newKey = 'zynyx_ak_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    setApiKey(newKey);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Developer Resources & Account Hub
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Standard SMM v2 Reseller API, account key management, and support desk.
        </p>

        {/* Sub Tabs */}
        <div className="flex space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'api' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Reseller API v2
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'account' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            API Key & Profile
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'help' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Help & Support
          </button>
        </div>
      </div>

      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* API Key Box */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <Key className="w-4 h-4 text-indigo-500" />
                <span>Your Reseller API Key</span>
              </label>

              <button
                onClick={handleRegenerateKey}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate Key</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white"
              />
              <button
                onClick={() => handleCopy(apiKey)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors flex items-center space-x-1 shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* SMM v2 Endpoint Documentation */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
              <Terminal className="w-4 h-4 text-indigo-500" />
              <span>Standard API v2 Endpoint Specification</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs">
              <span className="text-emerald-600 font-bold">POST</span> https://zynyx.site/api/v2
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">1. Service List (action = services)</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto">
{`curl -X POST https://zynyx.site/api/v2 \\
  -d "key=${apiKey}" \\
  -d "action=services"`}
                </pre>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">2. Place Order (action = add)</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto">
{`curl -X POST https://zynyx.site/api/v2 \\
  -d "key=${apiKey}" \\
  -d "action=add" \\
  -d "service=101" \\
  -d "link=https://instagram.com/p/xxx" \\
  -d "quantity=1000"`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-lg">
              ZR
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Client Reseller Account</h3>
              <p className="text-xs text-slate-500">reseller@zynyx.org</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Role:</span>
              <span className="font-bold text-slate-900 dark:text-white">API Reseller</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Platform FAQ</h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold block text-slate-900 dark:text-white mb-1">How do All-in-One campaigns execute?</span>
              <p className="text-slate-500">
                All-in-One campaigns generate dynamic non-equal bundle quantities (Views &ge; 100, Engagement &ge; 10) distributed across your selected duration window. Initial delivery dispatches immediately, while remaining bundles execute via the server-side scheduler.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold block text-slate-900 dark:text-white mb-1">Are orders real?</span>
              <p className="text-slate-500">
                Yes! Every order is submitted directly to connected provider nodes and returns authentic provider order IDs.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
