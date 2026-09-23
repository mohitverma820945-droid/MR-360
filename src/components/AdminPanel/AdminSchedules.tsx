import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScheduleItem } from '../../types';

export const AdminSchedules: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = () => {
    setLoading(true);
    fetch('/api/admin/schedules')
      .then(res => res.json())
      .then(data => {
        setSchedules(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Server Scheduler Queue</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Scheduled Execution Timeline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Background schedule items queued for atomic server-side provider execution.
          </p>
        </div>

        <button
          onClick={fetchSchedules}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-2 border border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading schedule queue...</div>
        ) : schedules.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No scheduled background executions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-4">Parent Order ID</th>
                  <th className="py-3 px-4">Metric / Run #</th>
                  <th className="py-3 px-4">Scheduled Date & Time</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provider Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                {schedules.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-bold text-indigo-600">#{item.parentOrderId}</td>
                    <td className="py-3 px-4 font-sans font-semibold">
                      {item.metric} (Run #{item.runNumber}/{item.totalRuns})
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.scheduledAt).toLocaleDateString()} {new Date(item.scheduledAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold">{item.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.providerOrderId ? `#${item.providerOrderId}` : <span className="text-slate-400 font-sans italic text-[11px]">Pending</span>}
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
