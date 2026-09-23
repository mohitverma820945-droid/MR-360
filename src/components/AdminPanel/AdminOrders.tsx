import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { Order } from '../../types';

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRetryOrder = async (orderId: number) => {
    setRetryingId(orderId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: data.message });
        fetchOrders();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Retry failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setRetryingId(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toString().includes(searchQuery) ||
    (o.providerOrderId && o.providerOrderId.includes(searchQuery)) ||
    o.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.link.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4" />
            <span>Admin Platform Audit</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            All Platform Orders & Provider Sync
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View every order record across all users, inspect provider order IDs, and trigger manual order retries.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-2 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh All Orders</span>
        </button>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order ID, Provider ID, Link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading platform orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Local ID</th>
                  <th className="py-3.5 px-4">Provider Order ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Retry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">#{order.id}</td>
                    
                    <td className="py-3 px-4 font-mono font-semibold">
                      {order.providerOrderId ? `#${order.providerOrderId}` : <span className="text-slate-400 text-[11px] italic">None</span>}
                    </td>

                    <td className="py-3 px-4 capitalize font-semibold text-slate-600 dark:text-slate-300">
                      {order.orderType.replace(/_/g, ' ')}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate" title={order.serviceName}>{order.serviceName}</td>
                    
                    <td className="py-3 px-4 font-bold">{order.quantity.toLocaleString()}</td>
                    
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">₹{order.price.toFixed(2)}</td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {order.status === 'Failed' && (
                        <button
                          onClick={() => handleRetryOrder(order.id)}
                          disabled={retryingId === order.id}
                          className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 text-[11px] font-bold flex items-center space-x-1 ml-auto"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === order.id ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </button>
                      )}
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
