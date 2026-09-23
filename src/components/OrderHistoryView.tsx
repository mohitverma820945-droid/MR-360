import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Ban,
  Calendar,
  Sparkles,
  Timer,
  Check,
  AlertCircle
} from 'lucide-react';
import { Order, OrderStatus, ScheduleItem } from '../types';
import { getAuthHeaderObj } from '../utils/apiAuth';

export const OrderHistoryView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hideChildOrders, setHideChildOrders] = useState<boolean>(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<{ id: number; action: 'cancel' | 'delete' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Price formatting utility with dynamic precision
  const formatPrice = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    if (val === 0) return '₹0.00';
    if (val >= 100) return `₹${val.toFixed(2)}`;
    if (val >= 1) return `₹${val.toFixed(3)}`;
    if (val >= 0.01) return `₹${val.toFixed(4)}`;
    return `₹${val.toFixed(6)}`;
  };

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/orders', {
      headers: getAuthHeaderObj()
    })
      .then(res => res.json())
      .then((data: Order[]) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 12000); // Poll history every 12s
    return () => clearInterval(interval);
  }, []);

  // Clear notice after 5 seconds
  useEffect(() => {
    if (actionNotice) {
      const t = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [actionNotice]);

  // Handle Cancel Order
  const handleCancelOrder = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId({ id: orderId, action: 'cancel' });
    setActionNotice(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaderObj()
        }
      });

      const res = await response.json();
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message || `Order #${orderId} canceled! All upcoming scheduled runs have been halted.`
        });
        // Optimistically update order status in state
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            const updatedSchedules = (o.schedules || []).map(s => 
              s.status === 'pending' || s.status === 'processing' 
                ? { ...s, status: 'canceled' as const, errorMessage: 'Canceled by user' }
                : s
            );
            return {
              ...o,
              status: 'Canceled' as OrderStatus,
              remainingBundles: 0,
              canceledBundles: (o.canceledBundles || 0) + (o.remainingBundles || 0),
              schedules: updatedSchedules
            };
          }
          return o;
        }));
      } else {
        setActionNotice({
          type: 'error',
          message: res.error || `Failed to cancel Order #${orderId}`
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || `Server error cancelling Order #${orderId}`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Order
  const handleDeleteOrder = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId({ id: orderId, action: 'delete' });
    setActionNotice(null);
    setConfirmDeleteId(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaderObj()
      });

      const res = await response.json();
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message || `Order #${orderId} and all bundle scheduling records deleted.`
        });
        // Remove order and its children from local state
        setOrders(prev => prev.filter(o => o.id !== orderId && o.parentOrderId !== orderId));
        if (expandedOrderId === orderId) {
          setExpandedOrderId(null);
        }
      } else {
        setActionNotice({
          type: 'error',
          message: res.error || `Could not delete Order #${orderId}`
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || `Server error deleting Order #${orderId}`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    // If hiding individual child orders, skip orders that have a parentOrderId
    if (hideChildOrders && o.orderType === 'all_in_one_child') {
      return false;
    }

    const matchesQuery = 
      o.id.toString().includes(searchQuery) ||
      (o.providerOrderId && o.providerOrderId.includes(searchQuery)) ||
      (o.serviceName && o.serviceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.link && o.link.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.category && o.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || o.orderType === typeFilter;
    const matchesStatus = statusFilter === 'all' || o.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Completed</span>
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Pending</span>
          </span>
        );
      case 'Canceled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Ban className="w-3 h-3 text-slate-500" />
            <span>Canceled</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
            <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>Failed</span>
          </span>
        );
      case 'Partial':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Partial</span>
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const target = new Date(isoString).getTime();
      const now = Date.now();
      const diffSecs = Math.round((target - now) / 1000);

      if (diffSecs > 0) {
        if (diffSecs < 60) return `In ${diffSecs}s`;
        const diffMins = Math.round(diffSecs / 60);
        if (diffMins < 60) return `In ${diffMins}m`;
        const diffHours = Math.round(diffMins / 60);
        return `In ${diffHours}h`;
      } else {
        const pastSecs = Math.abs(diffSecs);
        if (pastSecs < 60) return `Just now`;
        const pastMins = Math.round(pastSecs / 60);
        if (pastMins < 60) return `${pastMins}m ago`;
        const pastHours = Math.round(pastMins / 60);
        return `${pastHours}h ago`;
      }
    } catch {
      return '';
    }
  };

  // Compute metrics summary
  const totalOrdersCount = orders.length;
  const activeOrdersCount = orders.filter(o => o.status === 'Processing' || o.status === 'Pending').length;
  const completedOrdersCount = orders.filter(o => o.status === 'Completed').length;
  const canceledOrdersCount = orders.filter(o => o.status === 'Canceled').length;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Orders & Scheduling Center</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Order & Bundle Execution History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor bundle progress, run timings, halt schedules via Cancel, or permanently delete orders.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 shadow-md shadow-amber-500/30 overflow-hidden">
              <img 
                src="/mr360_logo.jpg" 
                alt="MR.360 Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-pink-50 dark:bg-slate-900 hover:bg-pink-100 dark:hover:bg-slate-800 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center space-x-2 border border-pink-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Orders</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalOrdersCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center space-x-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Active / In Progress</span>
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">{activeOrdersCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{completedOrdersCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center space-x-1">
            <Ban className="w-3 h-3" />
            <span>Canceled / Halted</span>
          </div>
          <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{canceledOrdersCount}</div>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
        }`}>
          <div className="flex items-center space-x-2 font-medium">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button 
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order ID, Link, Service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <span className="text-slate-400 mr-1.5 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="all_in_one_parent">All-in-One Campaigns</option>
              <option value="drip_feed">Drip-Feed Orders</option>
              <option value="single">Single Orders</option>
              <option value="all_in_one_child">Individual Child Runs</option>
            </select>
          </div>

          <div>
            <span className="text-slate-400 mr-1.5 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="canceled">Canceled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={hideChildOrders}
              onChange={(e) => setHideChildOrders(e.target.checked)}
              className="rounded text-pink-600 focus:ring-pink-500 border-slate-300 dark:border-slate-700"
            />
            <span>Group child runs into parent</span>
          </label>
        </div>

      </div>

      {/* Orders List / Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading && orders.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500" />
            <p>Loading persistent order history and bundle schedules...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No orders found</p>
            <p>Try clearing your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Service & Campaign</th>
                  <th className="py-3.5 px-4">Bundles Progress</th>
                  <th className="py-3.5 px-4">Timing & Schedule</th>
                  <th className="py-3.5 px-4">Units & Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id;
                  const schedules = order.schedules || [];
                  const total = order.totalBundles || (schedules.length > 0 ? schedules.length : 1);
                  const completed = order.completedBundles !== undefined 
                    ? order.completedBundles 
                    : (order.status === 'Completed' ? total : 0);
                  const remaining = order.remainingBundles !== undefined
                    ? order.remainingBundles
                    : (order.status === 'Canceled' ? 0 : Math.max(0, total - completed));
                  
                  const progressPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                  const canCancel = order.status === 'Processing' || order.status === 'Pending';

                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className={`hover:bg-pink-50/20 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-pink-50/30 dark:bg-slate-800/40' : ''
                        }`}
                      >
                        {/* Expand toggle icon */}
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {schedules.length > 0 || order.orderType === 'all_in_one_parent' || order.orderType === 'drip_feed' ? (
                            <button
                              type="button"
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                              title="Toggle bundle details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          ) : null}
                        </td>

                        {/* Order ID & Provider Node */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-pink-600 dark:text-pink-400 text-sm">
                            #{order.id}
                          </div>
                          {order.providerOrderId ? (
                            <div className="mt-1 flex items-center space-x-1 font-mono text-[10px] text-slate-500">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                Prov #{order.providerOrderId}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              {order.orderType === 'all_in_one_parent' ? 'Managed Schedule' : 'Pending Provider'}
                            </div>
                          )}
                        </td>

                        {/* Service / Campaign */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white truncate" title={order.serviceName}>
                            {order.serviceName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                            <a 
                              href={order.link} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={(e) => e.stopPropagation()} 
                              className="hover:underline hover:text-pink-600 flex items-center space-x-1"
                            >
                              <span className="truncate">{order.link}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-[10px] font-bold uppercase tracking-wider">
                              {order.platform}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {order.orderType.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Bundles Progress: Total, Completed, Remaining */}
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-700 dark:text-slate-200">
                                {completed} / {total} Bundles
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {progressPct}%
                              </span>
                            </div>

                            {/* Mini progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${
                                  order.status === 'Canceled' 
                                    ? 'bg-slate-400' 
                                    : order.status === 'Completed' 
                                      ? 'bg-emerald-500' 
                                      : 'bg-gradient-to-r from-pink-500 to-rose-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>

                            <div className="flex items-center space-x-3 text-[10px]">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ {completed} Done
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                ⏳ {remaining} Remaining
                              </span>
                              {order.canceledBundles && order.canceledBundles > 0 ? (
                                <span className="text-slate-400 font-semibold">
                                  ✕ {order.canceledBundles} Canceled
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Timing & Schedule */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {order.nextRunAt && order.status !== 'Canceled' && order.status !== 'Completed' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Next: {formatRelativeTime(order.nextRunAt)}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(order.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5 text-slate-500">
                              <div className="text-xs font-medium">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )}

                          {order.durationHours ? (
                            <div className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 mt-1">
                              Duration: {order.durationHours}h Campaign
                            </div>
                          ) : null}
                        </td>

                        {/* Quantity & Authoritative Price */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {order.quantity.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">units</span>
                          </div>
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                            {formatPrice(order.price)} INR
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(order.status)}
                        </td>

                        {/* Action Buttons: Cancel and Delete */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-2">
                            
                            {/* Cancel Button */}
                            {canCancel ? (
                              <button
                                type="button"
                                disabled={actionLoadingId?.id === order.id}
                                onClick={(e) => handleCancelOrder(order.id, e)}
                                className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                                title="Cancel order and halt all upcoming scheduled bundle runs immediately"
                              >
                                {actionLoadingId?.id === order.id && actionLoadingId?.action === 'cancel' ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Ban className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                )}
                                <span>Cancel</span>
                              </button>
                            ) : null}

                            {/* Delete Button */}
                            {confirmDeleteId === order.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  disabled={actionLoadingId?.id === order.id}
                                  onClick={(e) => handleDeleteOrder(order.id, e)}
                                  className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold text-[10px] hover:bg-red-700 flex items-center space-x-1 cursor-pointer"
                                  title="Confirm delete permanently"
                                >
                                  {actionLoadingId?.id === order.id && actionLoadingId?.action === 'delete' ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span>Yes</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] hover:bg-slate-300 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }}
                                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                                title="Delete order and cancel/purge all related history"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>

                      {/* Expandable Bundle Timeline Details */}
                      {isExpanded && (
                        <tr className="bg-pink-50/15 dark:bg-slate-900/40">
                          <td colSpan={8} className="p-4 sm:p-6 border-b border-pink-100 dark:border-slate-800">
                            <div className="space-y-4">
                              
                              {/* Header info in expansion */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-pink-100 dark:border-slate-800 gap-2">
                                <div className="flex items-center space-x-2">
                                  <Layers className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    Detailed Bundle Timeline & Execution Log
                                  </h3>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold">
                                    {schedules.length > 0 ? `${schedules.length} Scheduled Bundles` : 'Single Delivery'}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-3 text-xs">
                                  {canCancel && (
                                    <button
                                      type="button"
                                      disabled={actionLoadingId?.id === order.id}
                                      onClick={(e) => handleCancelOrder(order.id, e)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      <span>Cancel Order & Halt Future Bundles</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }}
                                    className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-200 border border-red-200 dark:border-red-900/60 font-bold flex items-center space-x-1.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Order</span>
                                  </button>
                                </div>
                              </div>

                              {/* Bundles Timeline List */}
                              {schedules.length === 0 ? (
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                                  This order was placed as an immediate single delivery with Provider Order ID #{order.providerOrderId || 'N/A'}. No multi-bundle schedule was queued.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                                    {schedules.map((bundle, idx) => {
                                      const isSubmitted = bundle.status === 'submitted';
                                      const isPending = bundle.status === 'pending';
                                      const isFailed = bundle.status === 'failed';
                                      const isCanceled = bundle.status === 'canceled';

                                      return (
                                        <div 
                                          key={bundle.id || idx}
                                          className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                                            isSubmitted 
                                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                              : isCanceled
                                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                                                : isFailed
                                                  ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                                                  : 'bg-white dark:bg-slate-800 border-pink-100 dark:border-slate-700 shadow-sm'
                                          }`}
                                        >
                                          {/* Top line: Run number and status */}
                                          <div className="flex items-center justify-between">
                                            <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                                              <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-slate-700 text-pink-700 dark:text-pink-300 font-mono text-[10px] flex items-center justify-center font-bold">
                                                {bundle.runNumber}
                                              </span>
                                              <span>Run #{bundle.runNumber} of {bundle.totalRuns}</span>
                                            </span>

                                            <div>
                                              {isSubmitted ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                                  Delivered
                                                </span>
                                              ) : isCanceled ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                  Halted
                                                </span>
                                              ) : isFailed ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300">
                                                  Failed
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                                  Scheduled
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Bundle metric & quantity */}
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500 font-medium">
                                              Metric: <strong className="text-slate-800 dark:text-slate-200">{bundle.metric || order.category}</strong>
                                            </span>
                                            <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
                                              +{bundle.quantity.toLocaleString()} units
                                            </span>
                                          </div>

                                          {/* Scheduled Timing */}
                                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                            <div className="flex items-center space-x-1">
                                              <Timer className="w-3 h-3 text-slate-400" />
                                              <span>
                                                {new Date(bundle.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(bundle.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                              </span>
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                              {formatRelativeTime(bundle.scheduledAt)}
                                            </span>
                                          </div>

                                          {/* Provider Order ID or Error message */}
                                          {bundle.providerOrderId && (
                                            <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                              Provider Order: <strong>#{bundle.providerOrderId}</strong>
                                            </div>
                                          )}
                                          {bundle.errorMessage && (
                                            <div className="text-[10px] text-red-600 dark:text-red-400 truncate" title={bundle.errorMessage}>
                                              Error: {bundle.errorMessage}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Error row if order has failed reason */}
                      {order.status === 'Failed' && order.errorMessage && (
                        <tr className="bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-[11px]">
                          <td colSpan={8} className="py-2.5 px-6 border-b border-red-100 dark:border-red-900/30">
                            <strong>Provider Dispatch Error:</strong> {order.errorMessage}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
