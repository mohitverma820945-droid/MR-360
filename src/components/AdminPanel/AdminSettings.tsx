import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';
import { SystemSettings } from '../../types';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    markupPercentage: 20,
    providerBalanceAutoRefreshMinutes: 30,
    cronExecutionIntervalSeconds: 10
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
          <Settings className="w-4 h-4" />
          <span>System Configuration</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Platform Rules & Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 text-xs">
        <div>
          <label className="block font-bold text-slate-900 dark:text-white mb-1">
            Global Selling Markup Percentage (%)
          </label>
          <p className="text-slate-500 mb-2">Applied to raw provider cost to generate customer selling rate</p>
          <input
            type="number"
            min={0}
            max={500}
            value={settings.markupPercentage}
            onChange={(e) => setSettings(prev => ({ ...prev, markupPercentage: parseFloat(e.target.value) || 0 }))}
            className="w-full sm:w-64 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-900 dark:text-white mb-1">
            Background Scheduler Execution Interval (Seconds)
          </label>
          <input
            type="number"
            min={5}
            max={300}
            value={settings.cronExecutionIntervalSeconds}
            onChange={(e) => setSettings(prev => ({ ...prev, cronExecutionIntervalSeconds: parseInt(e.target.value, 10) || 10 }))}
            className="w-full sm:w-64 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
          />
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl flex items-center space-x-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>System settings saved successfully!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </form>
    </div>
  );
};
