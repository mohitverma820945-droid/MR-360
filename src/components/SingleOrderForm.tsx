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
  Receipt,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Activity,
  Flame,
  Zap,
  Square,
  BarChart3,
  Layers
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

  const [orderMode, setOrderMode] = useState<'single_instant' | 'single_organic' | 'drip_feed'>('single_organic');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  
  // Drip Feed & Organic Suite fields
  const [runs, setRuns] = useState<number>(5);
  const [interval, setIntervalMinutes] = useState<number>(30);
  const [customComments, setCustomComments] = useState('');
  const [organicRandomize, setOrganicRandomize] = useState<boolean>(true);
  const [randomVariancePercent, setRandomVariancePercent] = useState<number>(30);
  const [organicCurveType, setOrganicCurveType] = useState<'gaussian' | 'jitter' | 'sigmoid' | 'staggered'>('gaussian');
  const [dripPreview, setDripPreview] = useState<{
    bundles: Array<{ runNumber: number; quantity: number; scheduledAt: string; cost: number }>;
    totalQuantity: number;
    totalCost: number;
    intervalMinutes: number;
  } | null>(null);
  const [loadingDripPreview, setLoadingDripPreview] = useState<boolean>(false);

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
    const loadServices = () => {
      fetch('/api/services', {
        headers: getAuthHeaderObj()
      })
        .then(res => res.json())
        .then((data: SmmService[]) => {
          if (!Array.isArray(data)) return;
          setServices(data);
          const uniquePlatforms = Array.from(new Set(data.map(s => s.platform)));
          setPlatforms(uniquePlatforms.length > 0 ? uniquePlatforms : ['Instagram', 'TikTok', 'YouTube', 'Telegram']);
          
          if (uniquePlatforms.length > 0) {
            setSelectedPlatform(prev => uniquePlatforms.includes(prev) ? prev : uniquePlatforms[0]);
          }
        });
    };

    loadServices();
    window.addEventListener('providers-changed', loadServices);
    return () => window.removeEventListener('providers-changed', loadServices);
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

  // Live Drip-Feed & Organic Single Preview Generator
  useEffect(() => {
    const isScheduled = orderMode === 'single_organic' || orderMode === 'drip_feed';
    if (!isScheduled || !selectedServiceId || !currentService || runs < 2 || quantity <= 0) {
      setDripPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingDripPreview(true);
      try {
        const res = await fetch('/api/orders/drip-feed/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaderObj() },
          body: JSON.stringify({
            serviceId: selectedServiceId,
            quantity,
            isTotalQuantity: orderMode === 'single_organic',
            runs,
            intervalMinutes: interval,
            organicRandomize,
            randomVariancePercent
          })
        });
        const data = await res.json();
        if (data.success && data.plan) {
          setDripPreview(data.plan);
        }
      } catch {
        // graceful ignore
      } finally {
        setLoadingDripPreview(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [orderMode, selectedServiceId, currentService, quantity, runs, interval, organicRandomize, randomVariancePercent]);

  // Accurate Authoritative Price Calculation
  const isDripFeed = orderMode === 'drip_feed';
  const calculatedTotalQuantity = isDripFeed
    ? (quantity || 0) * (runs || 1)
    : (quantity || 0);
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

    // Min/Max validation: for drip feed, check quantity per run; for single, check total
    const checkQty = isDripFeed ? quantity : calculatedTotalQuantity;
    if (checkQty < currentService.min || checkQty > currentService.max) {
      setErrorMessage(`Quantity must be between ${currentService.min.toLocaleString()} and ${currentService.max.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    try {
      const isScheduled = orderMode === 'single_organic' || orderMode === 'drip_feed';
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
          runs: isScheduled ? runs : undefined,
          interval: isScheduled ? interval : undefined,
          organicRandomize: isScheduled ? organicRandomize : undefined,
          randomVariancePercent: isScheduled ? randomVariancePercent : undefined,
          isTotalQuantity: orderMode === 'single_organic',
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
        
        {/* Order Mode Switch: Instant vs Organic Delivery vs Custom Drip-Feed */}
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-2xl bg-pink-50/60 dark:bg-slate-900 p-1 border border-pink-100 dark:border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => setOrderMode('single_instant')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              orderMode === 'single_instant'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm shadow-pink-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-white'
            }`}
          >
            <span>⚡ Instant Single</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('single_organic')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              orderMode === 'single_organic'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm shadow-pink-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-white'
            }`}
          >
            <span>🛡️ Organic Single Drip</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('drip_feed')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              orderMode === 'drip_feed'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm shadow-pink-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>⏱️ Custom Drip-Feed</span>
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
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {orderMode === 'drip_feed' 
                  ? 'Quantity per Run (Fixed Base Batch)' 
                  : orderMode === 'single_organic' 
                    ? 'Total Target Quantity (Auto-Distributed Organically)' 
                    : 'Quantity (Instant One-Time Execution)'}
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Min: {currentService?.min || 10} • Max: {currentService?.max?.toLocaleString() || '10M'}
              </span>
            </div>
            <input
              type="number"
              min={currentService?.min || 10}
              max={currentService?.max || 10000000}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-4 py-2.5 rounded-xl bg-pink-50/30 dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1000, 2000, 5000, 10000, 25000, 50000, 100000].map(val => (
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

          {/* Dedicated Quick Drip-feed Toggle Checkbox directly below quantity */}
          <div 
            onClick={() => {
              if (orderMode === 'single_instant') {
                setOrderMode('single_organic');
                setOrganicRandomize(true);
              } else {
                setOrderMode('single_instant');
              }
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
              orderMode !== 'single_instant'
                ? 'bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-purple-500/10 dark:from-pink-950/40 dark:to-purple-950/40 border-pink-300 dark:border-pink-800 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-pink-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                orderMode !== 'single_instant'
                  ? 'bg-pink-600 border-pink-600 text-white shadow-xs'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}>
                {orderMode !== 'single_instant' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <span>🔄 Enable Drip-Feed (Multi-Batch Delivery Over Time)</span>
                  {orderMode !== 'single_instant' && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider animate-pulse">
                      Active
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Paces delivery across multiple time intervals with anti-bot natural algorithmic protection.
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-pink-600 dark:text-pink-400 font-mono shrink-0 pl-2">
              {orderMode !== 'single_instant' ? `${runs} runs × ${interval}m` : 'Disabled (Instant)'}
            </div>
          </div>

          {/* Drip-Feed & Organic Settings Box */}
          {(orderMode === 'drip_feed' || orderMode === 'single_organic') && (
            <div className="p-4 sm:p-5 bg-gradient-to-b from-pink-50/40 via-purple-50/20 to-transparent dark:from-slate-900 dark:via-pink-950/10 dark:to-slate-900/60 rounded-2xl border border-pink-200 dark:border-pink-900/60 space-y-4 animate-fadeIn">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Runs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-pink-500" />
                      <span>Total Runs / Batches</span>
                    </label>
                    <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">
                      {orderMode === 'single_organic' ? 'Spread across runs' : 'Fixed runs'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={runs}
                    onChange={(e) => setRuns(parseInt(e.target.value, 10) || 2)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {/* Runs presets */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[5, 10, 15, 20, 30, 50].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRuns(r)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          runs === r
                            ? 'bg-pink-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-pink-100 dark:border-slate-700 hover:bg-pink-50'
                        }`}
                      >
                        {r} runs
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interval */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-pink-500" />
                      <span>Interval (Minutes between runs)</span>
                    </label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {interval >= 60 ? `${(interval / 60).toFixed(1)} hrs` : `${interval} mins`}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={interval}
                    onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 10)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {/* Interval presets */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[15, 30, 60, 120, 240].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setIntervalMinutes(m)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          interval === m
                            ? 'bg-pink-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-pink-100 dark:border-slate-700 hover:bg-pink-50'
                        }`}
                      >
                        {m}m {m >= 60 ? `(${(m/60).toFixed(1)}h)` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* HIGH-IMPACT PROMINENT ORGANIC MODE SUITE (NICHE JISE ON KRNE PE DRIP FEED ORGANIC HO JAYE) */}
              <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-3.5 ${
                organicRandomize
                  ? 'bg-gradient-to-br from-emerald-500/10 via-pink-500/10 to-purple-500/10 dark:from-emerald-950/40 dark:via-pink-950/30 dark:to-purple-950/40 border-emerald-400 dark:border-emerald-600/80 shadow-md'
                  : 'bg-slate-100/70 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700'
              }`}>
                
                {/* Master Switch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-200/60 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>🌱 Organic Anti-Bot Delivery Mode</span>
                      </span>
                      {organicRandomize ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold uppercase tracking-wide flex items-center space-x-1 shadow-sm">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Algorithm Safe: ON</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-400 text-white font-extrabold uppercase tracking-wide">
                          Robotic Fixed: OFF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {organicRandomize 
                        ? 'Dispatches varied natural human-like batches (e.g. 185, 340, 490, 270 units) with Gaussian micro-timing jitter. Total units delivered remain 100% exact.'
                        : 'Warning: Sends identical robotic constant batches (e.g. 200, 200, 200 units) which can trigger social platform shadowbans.'}
                    </p>
                  </div>

                  {/* Big Glowing Toggle Switch */}
                  <div className="shrink-0 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setOrganicRandomize(!organicRandomize)}
                      className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none shadow-md ${
                        organicRandomize 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30' 
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title="Toggle Organic Delivery Mode"
                    >
                      <span
                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-xl ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                          organicRandomize ? 'translate-x-8' : 'translate-x-0'
                        }`}
                      >
                        {organicRandomize ? (
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Extended Organic Controls (Shown when Organic is ON) */}
                {organicRandomize && (
                  <div className="space-y-3 pt-1 animate-fadeIn">
                    
                    {/* Natural Entropy / Variance Level */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Natural Random Variance Entropy</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: '±15% Subtle', val: 15 },
                          { label: '±30% Standard (Best)', val: 30 },
                          { label: '±45% High Viral', val: 45 },
                          { label: '±60% Stealth', val: 60 }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setRandomVariancePercent(opt.val)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                              randomVariancePercent === opt.val
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 border border-emerald-200/60 dark:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Curve Preset Profile Selector */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { id: 'gaussian', icon: TrendingUp, name: 'Gaussian Bell Curve', desc: 'Starts gentle, viral peak in mid, smooth cooldown' },
                        { id: 'jitter', icon: Activity, name: 'Organic Jitter', desc: 'Random natural variations across all batches' },
                        { id: 'sigmoid', icon: Flame, name: 'Sigmoid S-Curve', desc: 'Exponential adoption curve with plateau' },
                        { id: 'staggered', icon: BarChart3, name: 'Staggered Pacing', desc: 'Evenly paced runs with anti-bot micro jitter' }
                      ].map(item => {
                        const Icon = item.icon;
                        const isSelected = organicCurveType === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setOrganicCurveType(item.id as any)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
                              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`} />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Drip-Feed Schedule Preview & Batch Visualizer */}
              {dripPreview && dripPreview.bundles && dripPreview.bundles.length > 0 && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-pink-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-pink-500" />
                      <span>Live Delivery Schedule & Batch Breakdown</span>
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                      Exact Sum: {dripPreview.totalQuantity.toLocaleString()} units (100% Guaranteed)
                    </span>
                  </div>

                  {/* Batch Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {dripPreview.bundles.map((b) => {
                      const maxBatch = Math.max(...dripPreview.bundles.map(item => item.quantity)) || 1;
                      const barPct = Math.max(15, Math.round((b.quantity / maxBatch) * 100));
                      return (
                        <div
                          key={b.runNumber}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-center space-y-1 hover:border-pink-300 transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <span>Run #{b.runNumber}</span>
                            <span className="text-pink-500 font-mono">
                              {b.runNumber === 1 ? 'Immediate' : `+${(b.runNumber - 1) * interval}m`}
                            </span>
                          </div>
                          <div className="text-sm font-mono font-black text-pink-600 dark:text-pink-400">
                            {b.quantity.toLocaleString()}
                          </div>
                          {/* Mini visual bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                organicRandomize 
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                  : 'bg-pink-500'
                              }`} 
                              style={{ width: `${barPct}%` }} 
                            />
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time Pricing Preview Banner right under inputs */}
          {currentService && (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <span className="text-emerald-900 dark:text-emerald-200 font-semibold flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {orderMode === 'drip_feed' 
                    ? `Live Total: ${runs} runs × ${quantity.toLocaleString()} units = ${calculatedTotalQuantity.toLocaleString()} total units`
                    : orderMode === 'single_organic'
                      ? `Live Total: ${calculatedTotalQuantity.toLocaleString()} units distributed across ${runs} organic runs`
                      : `Live Total: ${quantity.toLocaleString()} units (Instant One-Time Execution)`}
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
                <span>Delivery Mode:</span>
                <span className="font-bold text-pink-600 dark:text-pink-400">
                  {orderMode === 'drip_feed' 
                    ? `Drip-Feed (${runs} runs × ${quantity.toLocaleString()} units)` 
                    : orderMode === 'single_organic' 
                      ? `Organic Anti-Bot Schedule (${runs} natural batches)` 
                      : 'Instant One-Time Execution'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Total Units Requested:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {orderMode === 'drip_feed' 
                    ? `${calculatedTotalQuantity.toLocaleString()} (${quantity.toLocaleString()} x ${runs} runs)` 
                    : calculatedTotalQuantity.toLocaleString()}
                </span>
              </div>
              {(orderMode === 'drip_feed' || orderMode === 'single_organic') && (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Schedule Timeline:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Every {interval} mins (~{Math.round(((runs - 1) * interval) / 60 * 10) / 10}h total delivery window)
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
