import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  Clock, 
  Link as LinkIcon, 
  ListFilter,
  Check,
  Receipt
} from 'lucide-react';
import { SmmService, PlatformCategory } from '../types';
import { getAuthHeaderObj } from '../utils/apiAuth';

export const SingleOrderForm: React.FC = () => {
  const [services, setServices] = useState<SmmService[]>([]);
  const [platforms, setPlatforms] = useState<PlatformCategory[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformCategory>('Instagram');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceSearch, setServiceSearch] = useState<string>('');

  const [orderMode, setOrderMode] = useState<'single' | 'drip_feed'>('single');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  
  // Drip Feed fields
  const [runs, setRuns] = useState<number>(5);
  const [interval, setIntervalMinutes] = useState<number>(30);
  const [customComments, setCustomComments] = useState('');

  const [providerBalance, setProviderBalance] = useState<number | null>(null);
  const [providerName, setProviderName] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ localOrderId: number; providerOrderId: string; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Price formatting utility with dynamic precision
  const formatPrice = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    if (val === 0) return '₹0.00';
    if (val >= 100) return `₹${val.toFixed(2)}`;
    if (val >= 1) return `₹${val.toFixed(3)}`;
    if (val >= 0.01) return `₹${val.toFixed(4)}`;
    return `₹${val.toFixed(6)}`;
  };

  // 1. Fetch Service Catalog
  useEffect(() => {
    fetch('/api/services', {
      headers: getAuthHeaderObj()
    })
      .then(res => res.json())
      .then((data: SmmService[]) => {
        setServices(data);
        const uniquePlatforms = Array.from(new Set(data.map(s => s.platform)));
        setPlatforms(uniquePlatforms.length > 0 ? uniquePlatforms : ['Instagram', 'TikTok', 'YouTube', 'Telegram']);
        
        if (uniquePlatforms.length > 0) {
          setSelectedPlatform(uniquePlatforms[0]);
        }
      });
  }, []);

  // 2. Filter Categories when Platform Changes
  useEffect(() => {
    const platformServices = services.filter(s => s.platform.toLowerCase() === selectedPlatform.toLowerCase());
    const uniqueCats = Array.from(new Set(platformServices.map(s => s.category)));
    setCategories(uniqueCats);

    if (uniqueCats.length > 0) {
      setSelectedCategory(uniqueCats[0]);
    } else {
      setSelectedCategory('');
      setSelectedServiceId(null);
    }
    setServiceSearch('');
  }, [selectedPlatform, services]);

  // 3. Filter Services when Category Changes
  useEffect(() => {
    const categoryServices = services.filter(s => 
      s.platform.toLowerCase() === selectedPlatform.toLowerCase() &&
      s.category.toLowerCase() === selectedCategory.toLowerCase()
    );

    if (categoryServices.length > 0) {
      setSelectedServiceId(categoryServices[0].id);
      setQuantity(categoryServices[0].min || 1000);
    } else {
      setSelectedServiceId(null);
    }
  }, [selectedCategory, selectedPlatform, services]);

  // Current Selected Service Object
  const currentService = services.find(s => s.id === selectedServiceId);

  // 4. Fetch Real Provider Balance for Selected Service
  useEffect(() => {
    if (!currentService) return;

    fetch(`/api/balance?serviceId=${currentService.id}`, {
      headers: getAuthHeaderObj()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.balance !== undefined) {
          setProviderBalance(data.balance);
          setProviderName(data.providerName);
        } else {
          setProviderBalance(null);
          setProviderName(data.providerName || 'Assigned Provider');
        }
      })
      .catch(() => {
        setProviderBalance(null);
      });
  }, [selectedServiceId, currentService]);

  // Accurate Authoritative Price Calculation (including all drip runs)
  const effectiveRuns = orderMode === 'drip_feed' ? (runs || 1) : 1;
  const calculatedTotalQuantity = (quantity || 0) * effectiveRuns;
  const calculatedPrice = currentService 
    ? ((calculatedTotalQuantity / 1000) * currentService.rate)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessResult(null);
    setErrorMessage(null);

    if (!selectedServiceId || !currentService) {
      setErrorMessage('Please select a valid service');
      return;
    }

    if (!link.trim()) {
      setErrorMessage('Target Link URL is required');
      return;
    }

    if (quantity < currentService.min || quantity > currentService.max) {
      setErrorMessage(`Quantity must be between ${currentService.min.toLocaleString()} and ${currentService.max.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders/single', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaderObj()
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          link: link.trim(),
          quantity,
          runs: orderMode === 'drip_feed' ? runs : undefined,
          interval: orderMode === 'drip_feed' ? interval : undefined,
          comments: currentService.type === 'custom_comments' ? customComments : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessResult({
          localOrderId: data.order.id,
          providerOrderId: data.providerOrderId,
          message: data.message
        });
        setLink('');
      } else {
        setErrorMessage(data.error || 'Provider rejected order request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit order to server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
            <PlusCircle className="w-4 h-4" />
            <span>MR.360 Order Execution</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Place Single Order or Drip-Feed
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Direct real-time dispatch to connected provider API node. Receive authentic provider order IDs.
          </p>
        </div>
        <div className="shrink-0 hidden sm:block">
          <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 shadow-md shadow-amber-500/30 overflow-hidden">
            <img 
              src="/mr360_logo.jpg" 
              alt="MR.360 Logo" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Main Order Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        
        {/* Order Mode Switch */}
        <div className="flex rounded-2xl bg-pink-50/60 dark:bg-slate-900 p-1 border border-pink-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setOrderMode('single')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              orderMode === 'single'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm shadow-pink-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-white'
            }`}
          >
            Single Order
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('drip_feed')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              orderMode === 'drip_feed'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm shadow-pink-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Drip-Feed Order</span>
          </button>
        </div>

        {/* 1. Platform Tabs */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            1. Select Social Platform
          </label>
          <div className="flex flex-wrap gap-2">
            {platforms.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPlatform(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPlatform === p
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20'
                    : 'bg-pink-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-slate-800 border border-pink-100 dark:border-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Category Dropdown */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            2. Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 3. Service Dropdown with Quick Search */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Service
            </label>
            <input
              type="text"
              placeholder="Search in this category..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-pink-50/50 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-500 w-44"
            />
          </div>
          <select
            value={selectedServiceId || ''}
            onChange={(e) => setSelectedServiceId(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer truncate"
          >
            {services
              .filter(s => s.platform.toLowerCase() === selectedPlatform.toLowerCase() && s.category.toLowerCase() === selectedCategory.toLowerCase())
              .filter(s => !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || s.id.toString().includes(serviceSearch) || (s.providerServiceId && s.providerServiceId.toString().includes(serviceSearch)))
              .map(s => (
                <option key={s.id} value={s.id}>
                  #{s.id} - {s.name} ({formatPrice(s.rate)}/1k)
                </option>
              ))}
          </select>

          {/* Current Service Details Box */}
          {currentService && (
            <div className="p-3 bg-pink-50/40 dark:bg-slate-900/60 rounded-xl border border-pink-100 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
                <span>Min: <strong>{currentService.min.toLocaleString()}</strong> | Max: <strong>{currentService.max.toLocaleString()}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{formatPrice(currentService.rate)} per 1,000</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Assigned Provider: {providerName}</span>
                {currentService.refill && <span className="text-pink-600 dark:text-pink-400 font-bold">30-Day Refill Guaranteed</span>}
              </div>
            </div>
          )}
        </div>

        {/* 4. Target Link Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>4. Target Link / URL</span>
            <span className="text-[10px] text-slate-400 font-normal">e.g. https://instagram.com/p/xxx</span>
          </label>
          <div className="relative">
            <LinkIcon className="w-4 h-4 text-pink-500 absolute left-3.5 top-3" />
            <input
              type="url"
              required
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* Custom Comments field if type is custom_comments */}
        {currentService?.type === 'custom_comments' && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Custom Comments (1 per line)
            </label>
            <textarea
              rows={4}
              placeholder="Great post!&#10;Awesome content 🔥&#10;Love this!"
              value={customComments}
              onChange={(e) => setCustomComments(e.target.value)}
              className="w-full p-3 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        )}

        {/* 5. Quantity & Drip Settings */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {orderMode === 'drip_feed' ? 'Quantity per Run' : 'Quantity'}
              </label>
              <input
                type="number"
                min={currentService?.min || 10}
                max={currentService?.max || 1000000}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1000, 2000, 5000, 10000, 15000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuantity(val)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                      quantity === val
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'bg-pink-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-pink-100 border border-pink-100 dark:border-slate-700'
                    }`}
                  >
                    {val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {orderMode === 'drip_feed' ? (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total Runs
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={runs}
                    onChange={(e) => setRuns(parseInt(e.target.value, 10) || 2)}
                    className="w-full px-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Interval (Minutes between runs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={interval}
                    onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 10)}
                    className="w-full px-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </>
            ) : null}
          </div>

          {/* Real-time Pricing Preview Banner right under inputs */}
          {currentService && (
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <span className="text-emerald-900 dark:text-emerald-200 font-semibold flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {orderMode === 'drip_feed' 
                    ? `Live Total: ${runs} runs × ${quantity.toLocaleString()} units = ${calculatedTotalQuantity.toLocaleString()} total units`
                    : `Live Total: ${quantity.toLocaleString()} units`}
                </span>
              </span>
              <div className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                {formatPrice(calculatedPrice)} <span className="text-[10px] font-normal text-slate-500">INR</span>
              </div>
            </div>
          )}
        </div>

        {/* Itemized Order Summary & Provider Balance */}
        {currentService && (
          <div className="p-4 bg-pink-50/70 dark:bg-pink-950/40 rounded-2xl border border-pink-200 dark:border-pink-900/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-pink-200/60 dark:border-pink-900/40">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-pink-500" />
                <span>Itemized Order Cost Summary</span>
              </span>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 text-[11px]">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-500">Provider Balance:</span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  {providerBalance !== null ? `${formatPrice(providerBalance)} INR` : 'Unavailable'}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Service Selected:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">#{currentService.id} - {currentService.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Exact Service Rate:</span>
                <span className="font-mono font-bold text-pink-600 dark:text-pink-400">{formatPrice(currentService.rate)} / 1,000</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Total Units Requested:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {orderMode === 'drip_feed' ? `${calculatedTotalQuantity.toLocaleString()} (${quantity} x ${runs} runs)` : quantity.toLocaleString()}
                </span>
              </div>
              {orderMode === 'drip_feed' && (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Schedule Timeline:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Every {interval} mins (~{Math.round(((runs - 1) * interval) / 60 * 10) / 10}h total)
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-pink-200/60 dark:border-pink-900/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Final Order Cost:</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatPrice(calculatedPrice)} <span className="text-xs font-normal text-slate-500">INR</span>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successResult && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Order Placed Successfully!</span>
            </div>
            <p className="font-mono text-[11px]">
              Local Order ID: <strong>#{successResult.localOrderId}</strong> | Real Provider Order ID: <strong>#{successResult.providerOrderId}</strong>
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">{successResult.message}</p>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs flex items-start space-x-2 text-red-900 dark:text-red-200">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Order Submission Failed:</span>
              <p className="text-[11px] mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !currentService}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-sm shadow-lg shadow-pink-600/25 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all cursor-pointer"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Dispatching to Real Provider Node...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Place Order ({formatPrice(calculatedPrice)} INR)</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
};
