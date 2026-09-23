import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, AlertTriangle, Info, CheckCircle2, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  timestamp: string;
}

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Audit & System Stream</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Execution Audit Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Real-time tracing for provider API requests, schedule passes, and error events.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stream</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {['all', 'info', 'warn', 'error'].map(lvl => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filterLevel === lvl
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {lvl === 'all' ? 'All Events' : lvl}
          </button>
        ))}
      </div>

      {/* Log List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-500" />
            <span>Loading audit log stream...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-sm">No audit log entries found</p>
            <p className="text-xs text-slate-400 mt-0.5">System execution events will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex items-start space-x-3">
                
                {/* Level Icon */}
                <div className="mt-0.5">
                  {log.level === 'error' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  {log.level === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                  {log.level === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
                </div>

                {/* Log Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                      [{log.category}]
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 text-xs font-sans leading-relaxed">
                    {log.message}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
