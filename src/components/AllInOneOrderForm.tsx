import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Clock, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Sliders,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  TrendingUp,
  Search,
  X,
  Flame,
  ArrowUpRight,
  Activity,
  Check,
  BarChart3
} from 'lucide-react';
import { SmmService, PlatformCategory, BundlePreview, SmmProvider } from '../types';
import { getAuthHeaderObj } from '../utils/apiAuth';
import { 
  GROWTH_PATTERNS_LIST, 
  GROWTH_CATEGORIES, 
  getGrowthPattern, 
  GrowthPattern 
} from '../data/growthPatterns';

// Precision Currency Formatter - prevents 0.00 display on micro/sub-paise SMM rates
export const formatCostPrecision = (val: number): string => {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return '0.00';
  if (val >= 100) return val.toFixed(2);
  if (val >= 1) return val.toFixed(2);
  if (val >= 0.01) return val.toFixed(3);
  if (val >= 0.0001) return val.toFixed(4);
  return val.toFixed(6);
};

export const formatRatePrecision = (val: number): string => {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return '0.00';
  if (val >= 10) return val.toFixed(2);
  if (val >= 1) return val.toFixed(3);
  if (val >= 0.01) return val.toFixed(4);
  return val.toFixed(6);
};

// Specialized helper to find and prioritize genuine SMM services for each metric
export const getServicesForMetric = (metricKey: string, platformServices: SmmService[]): SmmService[] => {
  if (!platformServices || platformServices.length === 0) return [];
  const m = metricKey.toLowerCase();
  const currentPlatformLower = (platformServices[0]?.platform || '').toLowerCase();

  let keywords: string[] = [m];
  if (m === 'views') {
    keywords = ['view', 'views', 'reel view', 'video view', 'impression', 'impressions', 'reach', 'play', 'plays', 'viewer', 'viewers', 'watch time'];
  } else if (m === 'likes') {
    keywords = ['like', 'likes', 'favorite', 'heart', '❤️', 'thumbs up'];
  } else if (m === 'comments') {
    keywords = ['comment', 'comments', 'reply', 'replies', 'custom comment'];
  } else if (m === 'shares') {
    keywords = ['share', 'shares', 'repost', 'reposts', 'reaction', 'retweet', 'retweets', 'broadcast'];
  } else if (m === 'saves') {
    keywords = ['save', 'saves', 'bookmark', 'bookmarks', 'collection'];
  }

  // Priority 1: Service Name directly contains target keyword
  const nameMatched = platformServices.filter(s => {
    const nameLower = (s.name || '').toLowerCase();
    if (m === 'views') {
      const cleanName = nameLower.replace(/review/g, '');
      return keywords.some(k => cleanName.includes(k));
    }
    if (m === 'likes') {
      if (nameLower.includes('comment') && !nameLower.includes('like') && !nameLower.includes('heart')) {
        return false;
      }
    }
    return keywords.some(k => nameLower.includes(k));
  });

  // Priority 2: Service Category contains target keyword
  const catMatched = platformServices.filter(s => {
    const catLower = (s.category || '').toLowerCase();
    if (m === 'views') {
      const cleanCat = catLower.replace(/review/g, '');
      return keywords.some(k => cleanCat.includes(k));
    }
    return keywords.some(k => catLower.includes(k));
  });

  // Merge unique
  const mergedMap = new Map<number, SmmService>();
  nameMatched.forEach(s => mergedMap.set(s.id, s));
  catMatched.forEach(s => {
    if (!mergedMap.has(s.id)) {
      mergedMap.set(s.id, s);
    }
  });

  let matched = Array.from(mergedMap.values());

  // Fallback: If no metric-specific service found, provide platform services
  if (matched.length === 0) {
    matched = platformServices;
  }

  const minThreshold = m === 'views' ? 100 : 10;
  return matched.sort((a, b) => {
    const aText = (a.name + ' ' + a.category).toLowerCase();
    const bText = (b.name + ' ' + b.category).toLowerCase();

    // 1. Prioritize platform name matching (e.g. "Instagram" inside Instagram platform)
    if (currentPlatformLower) {
      const aPlatMatch = aText.includes(currentPlatformLower) ? 0 : 1;
      const bPlatMatch = bText.includes(currentPlatformLower) ? 0 : 1;
      if (aPlatMatch !== bPlatMatch) return aPlatMatch - bPlatMatch;
    }

    // 2. Pure single service preferred over combo / packages
    const aIsPure = !a.name.toLowerCase().includes('+') && !a.name.toLowerCase().includes('combo') && !a.name.toLowerCase().includes('package') ? 0 : 1;
    const bIsPure = !b.name.toLowerCase().includes('+') && !b.name.toLowerCase().includes('combo') && !b.name.toLowerCase().includes('package') ? 0 : 1;
    if (aIsPure !== bIsPure) return aIsPure - bIsPure;

    // 3. Realistic minimum order requirement
    const aValid = (a.min || 0) <= minThreshold ? 0 : 1;
    const bValid = (b.min || 0) <= minThreshold ? 0 : 1;
    if (aValid !== bValid) return aValid - bValid;

    // 4. Lowest minimum
    if ((a.min || 0) !== (b.min || 0)) return (a.min || 0) - (b.min || 0);

    // 5. Lowest rate
    return (a.rate || 0) - (b.rate || 0);
  });
};

export const AllInOneOrderForm: React.FC = () => {
  const [services, setServices] = useState<SmmService[]>([]);
  const [platform, setPlatform] = useState<PlatformCategory>('Instagram');
  const [targetUrl, setTargetUrl] = useState('');
  
  // Growth Pattern Curve ON/OFF Switch
  const [patternEnabled, setPatternEnabled] = useState<boolean>(true);

  // Selected Growth Pattern Curve ID
  const [selectedPatternId, setSelectedPatternId] = useState<string>('viral_gaussian_peak');

  // Modal / Drawer state for 100+ patterns library
  const [showPatternModal, setShowPatternModal] = useState<boolean>(false);
  const [patternCategoryFilter, setPatternCategoryFilter] = useState<string>('All Patterns (100+)');
  const [patternSearchQuery, setPatternSearchQuery] = useState<string>('');

  // Duration Presets: 6h, 12h, 24h, 48h, 62h, custom
  const [durationHours, setDurationHours] = useState<number>(24);
  const [customDurationMode, setCustomDurationMode] = useState<boolean>(false);
  const [customDurationValue, setCustomDurationValue] = useState<number>(3);
  const [customDurationUnit, setCustomDurationUnit] = useState<'hours' | 'days'>('hours');

  // Random variance & Peak hours
  const [randomVariance, setRandomVariance] = useState<number>(15);
  const [peakHoursWeight, setPeakHoursWeight] = useState<boolean>(false);

  // Base Views Quantity
  const [baseViewsQty, setBaseViewsQty] = useState<number>(10000);
  const [customViewsMode, setCustomViewsMode] = useState<boolean>(false);

  // Accordion state for "Tap to customise delivery" per metric
  const [expandedDelivery, setExpandedDelivery] = useState<Record<string, boolean>>({});

  // Enabled metrics toggles
  const [enabledMetrics, setEnabledMetrics] = useState<{
    views: boolean;
    likes: boolean;
    comments: boolean;
    shares: boolean;
    saves: boolean;
  }>({
    views: true,
    likes: true,
    comments: true,
    shares: true,
    saves: true
  });

  // Auto bundles mode toggle per metric (true = system calculates optimal organic bundles)
  const [autoRunsMode, setAutoRunsMode] = useState<{
    views: boolean;
    likes: boolean;
    comments: boolean;
    shares: boolean;
    saves: boolean;
  }>({
    views: true,
    likes: true,
    comments: true,
    shares: true,
    saves: true
  });

  // Multi-Provider state
  const [providers, setProviders] = useState<SmmProvider[]>([]);

  // Metric configurations with providerId
  const [metricConfigs, setMetricConfigs] = useState<{
    views: { serviceId: number | null; totalQuantity: number; runCount: number; providerId?: string };
    likes: { serviceId: number | null; totalQuantity: number; runCount: number; providerId?: string };
    comments: { serviceId: number | null; totalQuantity: number; runCount: number; providerId?: string };
    shares: { serviceId: number | null; totalQuantity: number; runCount: number; providerId?: string };
    saves: { serviceId: number | null; totalQuantity: number; runCount: number; providerId?: string };
  }>({
    views: { serviceId: null, totalQuantity: 10000, runCount: 30, providerId: 'all' },
    likes: { serviceId: null, totalQuantity: 432, runCount: 15, providerId: 'all' },
    comments: { serviceId: null, totalQuantity: 91, runCount: 10, providerId: 'all' },
    shares: { serviceId: null, totalQuantity: 322, runCount: 12, providerId: 'all' },
    saves: { serviceId: null, totalQuantity: 317, runCount: 10, providerId: 'all' }
  });

  // Per-metric Service ID / Keyword search query
  const [serviceSearchQueries, setServiceSearchQueries] = useState<Record<string, string>>({});

  // Schedule Preview State
  const [previewing, setPreviewing] = useState(false);
  const [schedulePreviewData, setSchedulePreviewData] = useState<{
    summary: {
      platform: string;
      targetUrl: string;
      durationHours: number;
      totalBundles: number;
      grandTotalCost: number;
      providerName: string;
      providerBalance: number | null;
      providerBreakdown?: Array<{
        providerId: string;
        providerName: string;
        metrics: string[];
        totalQuantity: number;
        cost: number;
        currentBalance: number | null;
        currency: string;
      }>;
    };
    metricPlans: any[];
    timelinePreview: BundlePreview[];
  } | null>(null);

  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);
  const [placedOrderSummary, setPlacedOrderSummary] = useState<{
    orderId: number;
    totalPrice: number;
    totalBundles: number;
    durationHours: number;
    targetUrl: string;
    message: string;
    createdAt: string;
    providerBreakdown?: Array<{
      providerId: string;
      providerName: string;
      metrics: string[];
      totalQuantity: number;
      cost: number;
      currentBalance: number | null;
      currency: string;
    }>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to calculate maximum possible runs where each bundle satisfies the minimum rule
  const getMaxRunsForQty = (metricKey: string, qty: number): number => {
    const isViews = metricKey.toLowerCase().includes('view');
    const minRule = isViews ? 100 : 10;
    return Math.max(1, Math.floor(qty / minRule));
  };

  // Helper to calculate smart auto run estimate for UI display
  const getSmartAutoRuns = (metricKey: string, qty: number, hours: number = durationHours): number => {
    const isViews = metricKey.toLowerCase().includes('view');
    const minRule = isViews ? 100 : 10;
    const maxPossible = Math.max(1, Math.floor(qty / minRule));
    
    let targetAvg: number;
    if (isViews) {
      if (qty <= 1500) targetAvg = 140; // e.g. 1295 -> 9 runs (102, 167, 146, 196...)
      else if (qty <= 5000) targetAvg = 250;
      else targetAvg = 500;
    } else {
      if (qty <= 100) targetAvg = 15;
      else if (qty <= 500) targetAvg = 25;
      else targetAvg = 35;
    }

    let calculated = Math.round(qty / targetAvg);
    return Math.max(1, Math.min(maxPossible, calculated));
  };

  // Sync Base Views Quantity into metricConfigs
  useEffect(() => {
    setMetricConfigs(prev => ({
      ...prev,
      views: { ...prev.views, totalQuantity: baseViewsQty }
    }));
  }, [baseViewsQty]);

  // Fetch Providers
  useEffect(() => {
    fetch('/api/providers', {
      headers: getAuthHeaderObj()
    })
      .then(res => res.json())
      .then((provs: SmmProvider[]) => {
        if (Array.isArray(provs)) {
          setProviders(provs);
        }
      })
      .catch(() => {});
  }, []);

  const [loadingServices, setLoadingServices] = useState<boolean>(true);

  // Fetch Services & Auto-select matching platform services
  const fetchServicesCatalog = () => {
    setLoadingServices(true);
    fetch('/api/services', {
      headers: getAuthHeaderObj()
    })
      .then(res => res.json())
      .then((data: SmmService[]) => {
        if (!Array.isArray(data)) {
          setLoadingServices(false);
          return;
        }
        setServices(data);
        setLoadingServices(false);

        const platformSvcs = data.filter(s => s.platform.toLowerCase() === platform.toLowerCase());

        const viewsSvcs = getServicesForMetric('views', platformSvcs);
        const likesSvcs = getServicesForMetric('likes', platformSvcs);
        const commentsSvcs = getServicesForMetric('comments', platformSvcs);
        const sharesSvcs = getServicesForMetric('shares', platformSvcs);
        const savesSvcs = getServicesForMetric('saves', platformSvcs);

        setMetricConfigs(prev => ({
          views: { 
            ...prev.views, 
            serviceId: viewsSvcs[0]?.id || platformSvcs[0]?.id || null,
            providerId: prev.views.providerId || 'all'
          },
          likes: { 
            ...prev.likes, 
            serviceId: likesSvcs[0]?.id || platformSvcs[0]?.id || null,
            providerId: prev.likes.providerId || 'all'
          },
          comments: { 
            ...prev.comments, 
            serviceId: commentsSvcs[0]?.id || platformSvcs[0]?.id || null,
            providerId: prev.comments.providerId || 'all'
          },
          shares: { 
            ...prev.shares, 
            serviceId: sharesSvcs[0]?.id || platformSvcs[0]?.id || null,
            providerId: prev.shares.providerId || 'all'
          },
          saves: { 
            ...prev.saves, 
            serviceId: savesSvcs[0]?.id || platformSvcs[0]?.id || null,
            providerId: prev.saves.providerId || 'all'
          }
        }));
      })
      .catch(() => {
        setLoadingServices(false);
      });
  };

  useEffect(() => {
    fetchServicesCatalog();
  }, [platform]);

  // Active pattern details
  const activePattern = getGrowthPattern(selectedPatternId);

  // Filtered patterns for modal
  const filteredPatterns = GROWTH_PATTERNS_LIST.filter(p => {
    const matchesCategory = patternCategoryFilter === 'All Patterns (100+)' || p.category === patternCategoryFilter;
    const matchesSearch = patternSearchQuery === '' || 
      p.name.toLowerCase().includes(patternSearchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(patternSearchQuery.toLowerCase()) ||
      (p.badge && p.badge.toLowerCase().includes(patternSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Safe Effective Rate Resolver (Ensures price NEVER shows 0.00 when quantity is entered)
  const getEffectiveRate = (metricKey: string, serviceId: number | null): number => {
    const platformServices = services.filter(s => s.platform.toLowerCase() === platform.toLowerCase());
    let svc = platformServices.find(s => s.id === serviceId);
    if (!svc && platformServices.length > 0) {
      const metricSvcs = getServicesForMetric(metricKey, platformServices);
      svc = metricSvcs[0] || platformServices[0];
    }
    if (svc && typeof svc.rate === 'number' && svc.rate > 0) {
      return svc.rate;
    }
    // Baseline realistic default SMM rates (₹ / 1,000 units)
    switch (metricKey.toLowerCase()) {
      case 'views': return 1.4;
      case 'likes': return 29.0;
      case 'comments': return 450.0;
      case 'shares': return 5.0;
      case 'saves': return 5.0;
      default: return 10.0;
    }
  };

  // Safe Quantity Change Handler with two-way sync and auto-swap protection
  const handleQuantityChange = (metricKey: string, rawVal: string) => {
    const val = rawVal === '' ? 0 : parseInt(rawVal, 10);
    const sanitized = isNaN(val) ? 0 : Math.max(0, val);

    const platformSvcs = services.filter(s => s.platform.toLowerCase() === platform.toLowerCase());
    const currentConfig = metricConfigs[metricKey as keyof typeof metricConfigs];
    const currentSvc = platformSvcs.find(s => s.id === currentConfig.serviceId);

    let resolvedServiceId = currentConfig.serviceId;
    // Auto-swap to lower min service if user's entered quantity is smaller than current service min
    if (sanitized > 0 && currentSvc && currentSvc.min > sanitized) {
      const metricSvcs = getServicesForMetric(metricKey, platformSvcs);
      const compatibleSvc = metricSvcs.find(s => s.min <= sanitized);
      if (compatibleSvc) {
        resolvedServiceId = compatibleSvc.id;
      }
    }

    setMetricConfigs(prev => ({
      ...prev,
      [metricKey]: { 
        ...prev[metricKey as keyof typeof metricConfigs], 
        totalQuantity: sanitized,
        serviceId: resolvedServiceId
      }
    }));

    if (metricKey === 'views') {
      setBaseViewsQty(sanitized);
    }
  };

  // Calculate live grand total cost with fallback rate protection
  const calculatedGrandTotal = Object.entries(enabledMetrics).reduce((sum, [key, enabled]) => {
    if (!enabled) return sum;
    const config = metricConfigs[key as keyof typeof metricConfigs];
    const rate = getEffectiveRate(key, config.serviceId);
    return sum + ((config.totalQuantity / 1000) * rate);
  }, 0);

  const activeMetricsCount = Object.values(enabledMetrics).filter(Boolean).length;
  const totalEngagementsCount = Object.entries(enabledMetrics).reduce((sum, [key, enabled]) => {
    if (!enabled) return sum;
    return sum + metricConfigs[key as keyof typeof metricConfigs].totalQuantity;
  }, 0);

  // Request Schedule Preview from Backend
  const handleGeneratePreview = async () => {
    setErrorMessage(null);
    setOrderSuccessMessage(null);

    if (!targetUrl.trim()) {
      setErrorMessage('Please enter a valid Post / Reel URL.');
      return;
    }

    const activeConfigs: Record<string, any> = {};
    for (const [key, enabled] of Object.entries(enabledMetrics)) {
      if (enabled) {
        const config = metricConfigs[key as keyof typeof metricConfigs];
        if (!config.serviceId) continue;
        const isAuto = autoRunsMode[key as keyof typeof autoRunsMode];
        const maxRuns = getMaxRunsForQty(key, config.totalQuantity);
        const resolvedRunCount = isAuto ? 0 : Math.min(config.runCount, maxRuns);

        const labelKey = key.charAt(0).toUpperCase() + key.slice(1);
        activeConfigs[labelKey] = {
          ...config,
          runCount: resolvedRunCount
        };
      }
    }

    if (Object.keys(activeConfigs).length === 0) {
      setErrorMessage('Please enable at least one metric (e.g. Views, Likes).');
      return;
    }

    setPreviewing(true);

    try {
      const response = await fetch('/api/orders/all-in-one/preview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaderObj()
        },
        body: JSON.stringify({
          platform,
          targetUrl: targetUrl.trim(),
          durationHours,
          metricsConfig: activeConfigs,
          randomVariancePercent: randomVariance,
          peakHoursWeight,
          patternType: selectedPatternId,
          patternEnabled
        })
      });

      const data = await response.json();

      if (data.success) {
        const previewResult = data.data?.summary ? data.data : (data.summary ? data : null);
        if (previewResult) {
          setSchedulePreviewData(previewResult);
        } else {
          setErrorMessage('Could not load schedule preview data from server.');
        }
      } else {
        setErrorMessage(data.error || 'Failed to generate schedule plan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating schedule preview.');
    } finally {
      setPreviewing(false);
    }
  };

  // Submit Final Confirmed Order
  const handleConfirmAndSchedule = async () => {
    if (!targetUrl.trim()) {
      setErrorMessage('Please paste your Video / Post Link first.');
      return;
    }

    setSubmittingOrder(true);
    setErrorMessage(null);
    setPlacedOrderSummary(null);

    const activeConfigs: Record<string, any> = {};
    for (const [key, enabled] of Object.entries(enabledMetrics)) {
      if (enabled) {
        const config = metricConfigs[key as keyof typeof metricConfigs];
        if (!config.serviceId) continue;
        const isAuto = autoRunsMode[key as keyof typeof autoRunsMode];
        const maxRuns = getMaxRunsForQty(key, config.totalQuantity);
        const resolvedRunCount = isAuto ? 0 : Math.min(config.runCount, maxRuns);

        const labelKey = key.charAt(0).toUpperCase() + key.slice(1);
        activeConfigs[labelKey] = {
          ...config,
          runCount: resolvedRunCount
        };
      }
    }

    try {
      const response = await fetch('/api/orders/all-in-one/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaderObj()
        },
        body: JSON.stringify({
          platform,
          targetUrl: targetUrl.trim(),
          durationHours,
          metricsConfig: activeConfigs,
          randomVariancePercent: randomVariance,
          peakHoursWeight,
          patternType: selectedPatternId,
          patternEnabled
        })
      });

      const data = await response.json();

      if (data.success) {
        setOrderSuccessMessage(data.message);
        setPlacedOrderSummary({
          orderId: data.parentOrder?.id || Date.now(),
          totalPrice: data.grandTotalCost ?? data.parentOrder?.price ?? calculatedGrandTotal,
          totalBundles: data.totalBundles || 10,
          durationHours: data.durationHours || durationHours,
          targetUrl: targetUrl.trim(),
          message: data.message,
          providerBreakdown: data.providerBreakdown,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setSchedulePreviewData(null);
        // Scroll to top to see success receipt card
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(data.error || 'Failed to schedule campaign.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error scheduling campaign.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const metricThemes: Record<string, {
    key: string;
    label: string;
    icon: any;
    baseMin: number;
    max: number;
    colorName: string;
    cardBorder: string;
    cardShadow: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    toggleActiveGradient: string;
    priceChipBg: string;
    priceChipBorder: string;
    priceChipText: string;
    inputBg: string;
    inputBorder: string;
    inputRing: string;
    dropdownBg: string;
    dropdownBorder: string;
    panelBadgeBg: string;
    panelBadgeBorder: string;
    panelBadgeText: string;
    accentText: string;
    accentBg: string;
    drawerBg: string;
    drawerBorder: string;
    buttonActiveGradient: string;
    buttonActiveRing: string;
    sliderAccent: string;
    infoCardBg: string;
    infoCardBorder: string;
    infoCardText: string;
  }> = {
    views: {
      key: 'views',
      label: 'Views',
      icon: Eye,
      baseMin: 100,
      max: 10000000,
      colorName: 'Sky Blue',
      cardBorder: 'border-sky-300 dark:border-sky-800/80',
      cardShadow: 'shadow-md shadow-sky-500/10',
      iconBg: 'bg-sky-100 dark:bg-sky-950/80',
      iconColor: 'text-sky-600 dark:text-sky-300',
      badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
      badgeText: 'text-sky-700 dark:text-sky-300',
      toggleActiveGradient: 'bg-gradient-to-r from-sky-500 to-blue-600',
      priceChipBg: 'bg-sky-50 dark:bg-sky-950/60',
      priceChipBorder: 'border-sky-200 dark:border-sky-900/60',
      priceChipText: 'text-sky-700 dark:text-sky-300',
      inputBg: 'bg-sky-50/40 dark:bg-slate-950',
      inputBorder: 'border-sky-200 dark:border-slate-700',
      inputRing: 'focus:ring-sky-400',
      dropdownBg: 'bg-sky-50/30 dark:bg-slate-950',
      dropdownBorder: 'border-sky-200 dark:border-slate-700',
      panelBadgeBg: 'bg-sky-50 dark:bg-slate-950/60',
      panelBadgeBorder: 'border-sky-100 dark:border-slate-800',
      panelBadgeText: 'text-sky-700 dark:text-sky-300',
      accentText: 'text-sky-600 dark:text-sky-400',
      accentBg: 'bg-sky-100 dark:bg-sky-950',
      drawerBg: 'bg-sky-50/40 dark:bg-slate-950/80',
      drawerBorder: 'border-sky-200 dark:border-slate-700',
      buttonActiveGradient: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-400',
      buttonActiveRing: 'ring-sky-400',
      sliderAccent: 'accent-sky-500',
      infoCardBg: 'bg-sky-100/60 dark:bg-sky-950/60',
      infoCardBorder: 'border-sky-200 dark:border-sky-900/60',
      infoCardText: 'text-sky-700 dark:text-sky-300'
    },
    likes: {
      key: 'likes',
      label: 'Likes',
      icon: Heart,
      baseMin: 10,
      max: 500000,
      colorName: 'Rose Coral',
      cardBorder: 'border-rose-300 dark:border-rose-800/80',
      cardShadow: 'shadow-md shadow-rose-500/10',
      iconBg: 'bg-rose-100 dark:bg-rose-950/80',
      iconColor: 'text-rose-600 dark:text-rose-300',
      badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      badgeText: 'text-rose-700 dark:text-rose-300',
      toggleActiveGradient: 'bg-gradient-to-r from-rose-500 to-pink-600',
      priceChipBg: 'bg-rose-50 dark:bg-rose-950/60',
      priceChipBorder: 'border-rose-200 dark:border-rose-900/60',
      priceChipText: 'text-rose-700 dark:text-rose-300',
      inputBg: 'bg-rose-50/40 dark:bg-slate-950',
      inputBorder: 'border-rose-200 dark:border-slate-700',
      inputRing: 'focus:ring-rose-400',
      dropdownBg: 'bg-rose-50/30 dark:bg-slate-950',
      dropdownBorder: 'border-rose-200 dark:border-slate-700',
      panelBadgeBg: 'bg-rose-50 dark:bg-slate-950/60',
      panelBadgeBorder: 'border-rose-100 dark:border-slate-800',
      panelBadgeText: 'text-rose-700 dark:text-rose-300',
      accentText: 'text-rose-600 dark:text-rose-400',
      accentBg: 'bg-rose-100 dark:bg-rose-950',
      drawerBg: 'bg-rose-50/40 dark:bg-slate-950/80',
      drawerBorder: 'border-rose-200 dark:border-slate-700',
      buttonActiveGradient: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 ring-2 ring-rose-400',
      buttonActiveRing: 'ring-rose-400',
      sliderAccent: 'accent-rose-500',
      infoCardBg: 'bg-rose-100/60 dark:bg-rose-950/60',
      infoCardBorder: 'border-rose-200 dark:border-rose-900/60',
      infoCardText: 'text-rose-700 dark:text-rose-300'
    },
    comments: {
      key: 'comments',
      label: 'Comments',
      icon: MessageSquare,
      baseMin: 10,
      max: 50000,
      colorName: 'Mint Emerald',
      cardBorder: 'border-emerald-300 dark:border-emerald-800/80',
      cardShadow: 'shadow-md shadow-emerald-500/10',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80',
      iconColor: 'text-emerald-600 dark:text-emerald-300',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      toggleActiveGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      priceChipBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      priceChipBorder: 'border-emerald-200 dark:border-emerald-900/60',
      priceChipText: 'text-emerald-700 dark:text-emerald-300',
      inputBg: 'bg-emerald-50/40 dark:bg-slate-950',
      inputBorder: 'border-emerald-200 dark:border-slate-700',
      inputRing: 'focus:ring-emerald-400',
      dropdownBg: 'bg-emerald-50/30 dark:bg-slate-950',
      dropdownBorder: 'border-emerald-200 dark:border-slate-700',
      panelBadgeBg: 'bg-emerald-50 dark:bg-slate-950/60',
      panelBadgeBorder: 'border-emerald-100 dark:border-slate-800',
      panelBadgeText: 'text-emerald-700 dark:text-emerald-300',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      accentBg: 'bg-emerald-100 dark:bg-emerald-950',
      drawerBg: 'bg-emerald-50/40 dark:bg-slate-950/80',
      drawerBorder: 'border-emerald-200 dark:border-slate-700',
      buttonActiveGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400',
      buttonActiveRing: 'ring-emerald-400',
      sliderAccent: 'accent-emerald-500',
      infoCardBg: 'bg-emerald-100/60 dark:bg-emerald-950/60',
      infoCardBorder: 'border-emerald-200 dark:border-emerald-900/60',
      infoCardText: 'text-emerald-700 dark:text-emerald-300'
    },
    shares: {
      key: 'shares',
      label: 'Shares',
      icon: Share2,
      baseMin: 10,
      max: 100000,
      colorName: 'Warm Amber',
      cardBorder: 'border-amber-300 dark:border-amber-800/80',
      cardShadow: 'shadow-md shadow-amber-500/10',
      iconBg: 'bg-amber-100 dark:bg-amber-950/80',
      iconColor: 'text-amber-600 dark:text-amber-300',
      badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      badgeText: 'text-amber-700 dark:text-amber-300',
      toggleActiveGradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
      priceChipBg: 'bg-amber-50 dark:bg-amber-950/60',
      priceChipBorder: 'border-amber-200 dark:border-amber-900/60',
      priceChipText: 'text-amber-700 dark:text-amber-300',
      inputBg: 'bg-amber-50/40 dark:bg-slate-950',
      inputBorder: 'border-amber-200 dark:border-slate-700',
      inputRing: 'focus:ring-amber-400',
      dropdownBg: 'bg-amber-50/30 dark:bg-slate-950',
      dropdownBorder: 'border-amber-200 dark:border-slate-700',
      panelBadgeBg: 'bg-amber-50 dark:bg-slate-950/60',
      panelBadgeBorder: 'border-amber-100 dark:border-slate-800',
      panelBadgeText: 'text-amber-700 dark:text-amber-300',
      accentText: 'text-amber-600 dark:text-amber-400',
      accentBg: 'bg-amber-100 dark:bg-amber-950',
      drawerBg: 'bg-amber-50/40 dark:bg-slate-950/80',
      drawerBorder: 'border-amber-200 dark:border-slate-700',
      buttonActiveGradient: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-400',
      buttonActiveRing: 'ring-amber-400',
      sliderAccent: 'accent-amber-500',
      infoCardBg: 'bg-amber-100/60 dark:bg-amber-950/60',
      infoCardBorder: 'border-amber-200 dark:border-amber-900/60',
      infoCardText: 'text-amber-700 dark:text-amber-300'
    },
    saves: {
      key: 'saves',
      label: 'Saves / Bookmarks',
      icon: Bookmark,
      baseMin: 10,
      max: 50000,
      colorName: 'Lavender Violet',
      cardBorder: 'border-violet-300 dark:border-violet-800/80',
      cardShadow: 'shadow-md shadow-violet-500/10',
      iconBg: 'bg-violet-100 dark:bg-violet-950/80',
      iconColor: 'text-violet-600 dark:text-violet-300',
      badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
      badgeText: 'text-violet-700 dark:text-violet-300',
      toggleActiveGradient: 'bg-gradient-to-r from-violet-500 to-purple-600',
      priceChipBg: 'bg-violet-50 dark:bg-violet-950/60',
      priceChipBorder: 'border-violet-200 dark:border-violet-900/60',
      priceChipText: 'text-violet-700 dark:text-violet-300',
      inputBg: 'bg-violet-50/40 dark:bg-slate-950',
      inputBorder: 'border-violet-200 dark:border-slate-700',
      inputRing: 'focus:ring-violet-400',
      dropdownBg: 'bg-violet-50/30 dark:bg-slate-950',
      dropdownBorder: 'border-violet-200 dark:border-slate-700',
      panelBadgeBg: 'bg-violet-50 dark:bg-slate-950/60',
      panelBadgeBorder: 'border-violet-100 dark:border-slate-800',
      panelBadgeText: 'text-violet-700 dark:text-violet-300',
      accentText: 'text-violet-600 dark:text-violet-400',
      accentBg: 'bg-violet-100 dark:bg-violet-950',
      drawerBg: 'bg-violet-50/40 dark:bg-slate-950/80',
      drawerBorder: 'border-violet-200 dark:border-slate-700',
      buttonActiveGradient: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20 ring-2 ring-violet-400',
      buttonActiveRing: 'ring-violet-400',
      sliderAccent: 'accent-violet-500',
      infoCardBg: 'bg-violet-100/60 dark:bg-violet-950/60',
      infoCardBorder: 'border-violet-200 dark:border-violet-900/60',
      infoCardText: 'text-violet-700 dark:text-violet-300'
    }
  };

  const metricDefinitions = Object.values(metricThemes);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-black rounded-3xl p-6 text-white shadow-xl shadow-amber-500/10 border border-amber-500/20 relative overflow-hidden flex items-center justify-between">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md">
              MR.360 ORGANIC BUILDER
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-[11px] font-extrabold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>100+ Viral Curves</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Instagram All-in-One Organic Growth Package
          </h2>
          <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
            Multi-metric campaign with exact curve pacing. Views, Likes, Comments, Shares, and Saves distributed organically.
          </p>
        </div>
        <div className="shrink-0 hidden sm:block relative ml-4">
          <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 shadow-xl shadow-amber-500/30 overflow-hidden">
            <img 
              src="/mr360_logo.jpg" 
              alt="MR.360 Logo" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* 1.1 ORDER PLACED SUCCESS RECEIPT CARD (PROMINENT TOTAL PRICE) */}
      {placedOrderSummary && (
        <div className="p-6 bg-gradient-to-br from-emerald-50 via-pink-50 to-rose-50 dark:from-emerald-950/60 dark:via-slate-900 dark:to-pink-950/60 rounded-3xl border-2 border-emerald-400 dark:border-emerald-600 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
                  ORDER PLACED & SCHEDULED
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Campaign Order #{placedOrderSummary.orderId}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPlacedOrderSummary(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Big Prominent Total Price Display */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-pink-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-extrabold uppercase text-slate-400 block tracking-wider">
                TOTAL AMOUNT CHARGED
              </span>
              <div className="text-2xl sm:text-3xl font-black text-pink-600 dark:text-pink-400 font-mono flex items-baseline space-x-1 mt-0.5">
                <span>₹{formatCostPrecision(placedOrderSummary.totalPrice)}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">INR</span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-xs inline-block">
                {placedOrderSummary.totalBundles} Runs Scheduled
              </span>
              <div className="text-[11px] text-slate-500 font-medium">
                Delivery Window: {placedOrderSummary.durationHours} Hours
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {placedOrderSummary.message}
          </p>

          {placedOrderSummary.providerBreakdown && placedOrderSummary.providerBreakdown.length > 0 && (
            <div className="p-3.5 bg-white/90 dark:bg-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-100">
                <span className="flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Multi-SMM Panel Deduction Breakdown:</span>
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  ✓ Debited From Respective Panels
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {placedOrderSummary.providerBreakdown.map((pb, idx) => (
                  <div key={idx} className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 dark:text-slate-100 truncate">🏛️ {pb.providerName}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">₹{formatCostPrecision(pb.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{pb.metrics.join(', ')} ({pb.totalQuantity.toLocaleString()} units)</span>
                      {pb.currentBalance !== null && (
                        <span className="font-mono text-slate-600 dark:text-slate-300">Remaining Bal: ₹{pb.currentBalance.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPlacedOrderSummary(null);
                setTargetUrl('');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-extrabold text-xs shadow-md shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Another Campaign</span>
            </button>
          </div>
        </div>
      )}

      {/* SMM Service Status & Refresh Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-slate-700 dark:text-slate-300">
            {loadingServices ? (
              <span className="flex items-center space-x-1.5 text-pink-600 dark:text-pink-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading real SMM Provider services...</span>
              </span>
            ) : (
              <span>
                <strong className="text-pink-600 dark:text-pink-400 font-black">{services.length.toLocaleString()}</strong> Live Services Connected &bull; <strong className="text-emerald-600 dark:text-emerald-400 font-black">{services.filter(s => s.platform.toLowerCase() === platform.toLowerCase()).length}</strong> available for {platform}
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={fetchServicesCatalog}
          disabled={loadingServices}
          className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 hover:bg-pink-100 font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors border border-pink-200/60 dark:border-pink-900/60 disabled:opacity-50"
          title="Reload Live SMM Services"
        >
          <RefreshCw className={`w-3 h-3 ${loadingServices ? 'animate-spin' : ''}`} />
          <span>Reload Services</span>
        </button>
      </div>

      {/* 2. PLATFORM TABS */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl">
        {(['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X', 'Telegram'] as PlatformCategory[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={`flex-1 min-w-[90px] py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              platform.toLowerCase() === p.toLowerCase()
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* STEP 1: POST / VIDEO LINK INPUT */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-sm space-y-3">
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
          <LinkIcon className="w-4 h-4 text-pink-500" />
          <span>Step 1: Video / Post Link</span>
        </label>
        <input
          type="url"
          required
          placeholder="Paste your Instagram Reel / Post link (e.g. https://instagram.com/reel/...)"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          className="w-full px-4 py-3 bg-pink-50/40 dark:bg-slate-950 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* STEP 2: CAMPAIGN TIME DURATION PRESETS (6h, 12h, 24h, 48h, 62h, Custom) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
            <Clock className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Step 2: Campaign Time Duration Window</span>
          </div>
          <span className="text-xs font-mono font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950 px-2.5 py-1 rounded-full border border-pink-200 dark:border-pink-900/60">
            {durationHours} Hours Total
          </span>
        </div>

        {/* Duration Preset Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: '6 Hours', hours: 6 },
            { label: '12 Hours', hours: 12 },
            { label: '24 Hours', hours: 24 },
            { label: '48 Hours', hours: 48 },
            { label: '62 Hours', hours: 62 },
            { label: 'Custom', hours: -1 }
          ].map(opt => {
            const isSelected = opt.hours === -1 ? customDurationMode : (!customDurationMode && durationHours === opt.hours);
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  if (opt.hours === -1) {
                    setCustomDurationMode(true);
                  } else {
                    setCustomDurationMode(false);
                    setDurationHours(opt.hours);
                  }
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400'
                    : 'bg-pink-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-slate-700 border border-pink-100 dark:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Custom Duration Input Box */}
        {customDurationMode && (
          <div className="p-3 bg-pink-50/40 dark:bg-slate-950 rounded-2xl border border-pink-200 dark:border-slate-700 flex items-center space-x-3 text-xs">
            <span className="text-slate-500 font-bold">Custom Duration:</span>
            <input
              type="number"
              min={1}
              value={customDurationValue}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setCustomDurationValue(val);
                setDurationHours(customDurationUnit === 'days' ? val * 24 : val);
              }}
              className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-pink-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
            <select
              value={customDurationUnit}
              onChange={(e) => {
                const unit = e.target.value as 'hours' | 'days';
                setCustomDurationUnit(unit);
                setDurationHours(unit === 'days' ? customDurationValue * 24 : customDurationValue);
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-pink-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        )}
      </div>

      {/* STEP 3: BASE VIEWS QUANTITY PRESETS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
            <Eye className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Step 3: Base Views Quantity</span>
          </div>
          <span className="font-mono text-xs font-black text-pink-600 dark:text-pink-400">
            {baseViewsQty.toLocaleString()} Views Total
          </span>
        </div>

        {/* Preset Pill Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1000, 2000, 5000, 10000, 15000].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setBaseViewsQty(val);
                setCustomViewsMode(false);
                setMetricConfigs(prev => ({
                  ...prev,
                  views: { ...prev.views, totalQuantity: val }
                }));
              }}
              className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                !customViewsMode && baseViewsQty === val
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400'
                  : 'bg-pink-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-slate-700 border border-pink-100 dark:border-slate-700'
              }`}
            >
              {val >= 1000 ? `${val / 1000}k` : val}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomViewsMode(true)}
            className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              customViewsMode
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400'
                : 'bg-pink-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-slate-700 border border-pink-100 dark:border-slate-700'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom Views Option */}
        <div className="pt-1 flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-bold">or custom quantity:</span>
          <input
            type="number"
            value={baseViewsQty}
            onChange={(e) => {
              const raw = e.target.value;
              const val = raw === '' ? 0 : parseInt(raw, 10);
              const sanitized = isNaN(val) ? 0 : Math.max(0, val);
              setBaseViewsQty(sanitized);
              setCustomViewsMode(true);
              setMetricConfigs(prev => ({
                ...prev,
                views: { ...prev.views, totalQuantity: sanitized }
              }));
            }}
            className="w-32 px-3 py-1.5 bg-pink-50/40 dark:bg-slate-950 border border-pink-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <span className="text-slate-400 font-medium">views</span>
        </div>
      </div>

      {/* STEP 4: ENGAGEMENT BREAKDOWN CARDS */}
      <div className="space-y-4">
        
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-pink-600 text-white font-black text-[11px] flex items-center justify-center shadow-sm">
              4
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              STEP 4: ENGAGEMENT BREAKDOWN & SMM SERVICES
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button 
              type="button" 
              onClick={handleGeneratePreview}
              className="px-3 py-1 rounded-xl bg-pink-100/70 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 font-bold flex items-center space-x-1 cursor-pointer hover:bg-pink-200 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-pink-500" />
              <span>Preview Timeline</span>
            </button>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px]">
              {activeMetricsCount} active
            </span>
          </div>
        </div>

        {/* Individual Metric Cards */}
        {metricDefinitions.map((def) => {
          const { key, label, icon: Icon, baseMin, max } = def;
          const theme = metricThemes[key] || metricThemes.views;
          const mKey = key as keyof typeof enabledMetrics;
          const isEnabled = enabledMetrics[mKey];
          const config = metricConfigs[mKey];

          const platformServices = services.filter(s => s.platform.toLowerCase() === platform.toLowerCase());
          const allMetricServices = getServicesForMetric(key, platformServices);

          // Provider filtering for this metric
          const selectedProviderId = config.providerId || 'all';
          const providerFilteredServices = selectedProviderId === 'all'
            ? allMetricServices
            : allMetricServices.filter(s => s.providerId === selectedProviderId);

          // Search query filtering (by Service ID or Name)
          const searchQuery = (serviceSearchQueries[key] || '').toLowerCase().trim();
          const cleanQuery = searchQuery.replace('#', '').trim();

          let availableServices = providerFilteredServices.filter(s => {
            if (!searchQuery) return true;
            if (cleanQuery && (s.id.toString() === cleanQuery || s.providerServiceId?.toString() === cleanQuery)) {
              return true;
            }
            const matchId = s.id.toString().includes(searchQuery) || (s.providerServiceId && s.providerServiceId.toString().includes(searchQuery));
            const matchName = s.name.toLowerCase().includes(searchQuery);
            const matchCat = s.category.toLowerCase().includes(searchQuery);
            return matchId || matchName || matchCat;
          });

          // Safeguards so services NEVER show as empty if there are services in platform
          if (availableServices.length === 0 && selectedProviderId !== 'all' && !searchQuery) {
            availableServices = allMetricServices;
          }
          if (availableServices.length === 0 && !searchQuery) {
            availableServices = platformServices;
          }

          const svc = platformServices.find(s => s.id === config.serviceId);
          const effectiveRate = getEffectiveRate(key, config.serviceId);
          const metricCost = (config.totalQuantity / 1000) * effectiveRate;
          const isDeliveryOpen = expandedDelivery[key];

          // Provider info for currently assigned service
          const assignedProvider = providers.find(p => p.id === svc?.providerId) || 
            (svc?.providerName ? { name: svc.providerName, balance: null } : null);

          // Group available services by provider for organized dropdown
          const groupedServices: { providerId: string; providerName: string; balance: number | null; services: SmmService[] }[] = [];
          const map = new Map<string, SmmService[]>();
          for (const s of availableServices) {
            const pId = s.providerId || 'unknown';
            if (!map.has(pId)) map.set(pId, []);
            map.get(pId)!.push(s);
          }
          for (const [pId, list] of map.entries()) {
            const prov = providers.find(p => p.id === pId);
            const pName = prov?.name || list[0]?.providerName || 'SMM Provider';
            groupedServices.push({
              providerId: pId,
              providerName: pName,
              balance: prov?.balance ?? null,
              services: list
            });
          }

          return (
            <div 
              key={key} 
              className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                isEnabled 
                  ? `bg-white dark:bg-slate-900 ${theme.cardBorder} ${theme.cardShadow}` 
                  : 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              {/* Card Top Row: Icon + Label + Base Badge + Switch Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{label}</span>
                      {key === 'views' && (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${theme.badgeBg}`}>
                          BASE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Theme: {theme.colorName} &bull; Min {baseMin.toLocaleString()} Max {max.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      setEnabledMetrics(prev => ({ ...prev, [mKey]: !prev[mKey] }));
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 cursor-pointer ${
                      isEnabled ? theme.toggleActiveGradient : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Quantity Input + Price Badge */}
              {isEnabled && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={baseMin}
                        max={max}
                        value={config.totalQuantity}
                        onChange={(e) => handleQuantityChange(mKey, e.target.value)}
                        className={`w-full px-4 py-2.5 ${theme.inputBg} border ${theme.inputBorder} rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${theme.inputRing}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        units
                      </span>
                    </div>

                    <div className={`px-3.5 py-2 rounded-xl ${theme.priceChipBg} border ${theme.priceChipBorder} ${theme.priceChipText} font-extrabold text-xs font-mono shrink-0`}>
                      ₹{formatCostPrecision(metricCost)}
                    </div>
                  </div>

                  {/* SMM PANEL / PROVIDER SELECTOR & SERVICE ASSIGNMENT */}
                  <div className="space-y-2 pt-1">
                    
                    {/* 1. SMM Panel Selection Dropdown (Multi-Provider Support) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <span>🏛️ SMM Panel Provider:</span>
                        </span>
                        {providers.length > 1 ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded">
                            {providers.length} Panels Connected
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Direct SMM API
                          </span>
                        )}
                      </div>

                      <select
                        value={config.providerId || 'all'}
                        onChange={(e) => {
                          const pId = e.target.value;
                          const targetServices = pId === 'all'
                            ? allMetricServices
                            : allMetricServices.filter(s => s.providerId === pId);

                          setMetricConfigs(prev => ({
                            ...prev,
                            [mKey]: {
                              ...prev[mKey],
                              providerId: pId,
                              serviceId: targetServices[0]?.id || prev[mKey].serviceId
                            }
                          }));
                        }}
                        className={`w-full px-3 py-2 ${theme.dropdownBg} border ${theme.dropdownBorder} rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${theme.inputRing} cursor-pointer`}
                      >
                        <option value="all">⚡ All SMM Panels (Compare & Auto-Route)</option>
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>
                            🏛️ Panel: {p.name} {p.balance !== null ? `(Balance: ₹${p.balance.toFixed(2)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Assigned Provider Service Dropdown & Search Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <span>Assigned Provider SMM Service:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                          ₹{formatRatePrecision(effectiveRate)} / 1,000
                        </span>
                      </div>

                      {/* Service Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search Service ID (#13264) or Name..."
                          value={serviceSearchQueries[key] || ''}
                          onChange={(e) => {
                            const queryVal = e.target.value;
                            setServiceSearchQueries(prev => ({ ...prev, [key]: queryVal }));

                            // Auto-select if exact numeric service ID matches
                            const cleanId = queryVal.replace('#', '').trim();
                            if (cleanId && !isNaN(Number(cleanId))) {
                              const exactMatch = providerFilteredServices.find(s => 
                                s.id === Number(cleanId) || s.providerServiceId === Number(cleanId)
                              );
                              if (exactMatch) {
                                setMetricConfigs(prev => ({
                                  ...prev,
                                  [mKey]: {
                                    ...prev[mKey],
                                    serviceId: exactMatch.id,
                                    providerId: exactMatch.providerId || prev[mKey].providerId
                                  }
                                }));
                              }
                            }
                          }}
                          className={`w-full pl-8 pr-8 py-2 ${theme.inputBg} border ${theme.inputBorder} rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${theme.inputRing}`}
                        />
                        {serviceSearchQueries[key] && (
                          <button
                            type="button"
                            onClick={() => setServiceSearchQueries(prev => ({ ...prev, [key]: '' }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            title="Clear Search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={config.serviceId || (availableServices[0]?.id ? availableServices[0].id : '')}
                        onChange={(e) => {
                          const sId = parseInt(e.target.value, 10) || null;
                          const selectedSvc = services.find(s => s.id === sId);
                          setMetricConfigs(prev => ({
                            ...prev,
                            [mKey]: {
                              ...prev[mKey],
                              serviceId: sId,
                              providerId: selectedSvc?.providerId || prev[mKey].providerId
                            }
                          }));
                        }}
                        className={`w-full px-3 py-2.5 ${theme.dropdownBg} border ${theme.dropdownBorder} rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${theme.inputRing} truncate cursor-pointer`}
                      >
                        {availableServices.length === 0 ? (
                          <option value="">No services match current provider filter or search query</option>
                        ) : (
                          groupedServices.map(group => (
                            <optgroup 
                              key={group.providerId} 
                              label={`🏛️ Panel: ${group.providerName}${group.balance !== null ? ` (Bal: ₹${group.balance.toFixed(2)})` : ''}`}
                            >
                              {group.services.map(s => (
                                <option key={s.id} value={s.id}>
                                  [ID: #{s.providerServiceId || s.id}] {s.name} (Min: {s.min.toLocaleString()} | ₹{formatRatePrecision(s.rate)}/1k)
                                </option>
                              ))}
                            </optgroup>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Provider & Service Status Card */}
                    {svc && (
                      <div className={`p-2.5 ${theme.panelBadgeBg} rounded-xl border ${theme.panelBadgeBorder} text-[11px] space-y-1 font-medium`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded ${theme.badgeBg} font-mono font-black text-[10px]`}>
                              ID #{svc.providerServiceId || svc.id}
                            </span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                              🏛️ {svc.providerName}
                            </span>
                          </div>

                          {assignedProvider && assignedProvider.balance !== null && (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded">
                              Panel Balance: ₹{assignedProvider.balance.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>
                            Min: {svc.min.toLocaleString()} &bull; Max: {svc.max.toLocaleString()}
                          </span>
                          <span className={`${theme.accentText} font-semibold`}>
                            ✓ Charges will deduct from {svc.providerName}'s balance
                          </span>
                        </div>
                      </div>
                    )}

                    {config.totalQuantity > 0 && svc && config.totalQuantity < svc.min && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center space-x-1.5">
                        <span>⚠️</span>
                        <span>
                          Current quantity ({config.totalQuantity.toLocaleString()}) is below this service minimum of {svc.min.toLocaleString()}. Please pick another service above.
                        </span>
                      </div>
                    )}

                    {config.totalQuantity > 0 && config.totalQuantity < baseMin && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300 font-semibold flex items-center space-x-1.5">
                        <span>⚠️</span>
                        <span>
                          Minimum safe bundle size for {label} is {baseMin} units. Please enter at least {baseMin}.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Tap to Customise Delivery */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedDelivery(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-full flex items-center justify-between text-xs font-bold ${theme.accentText} hover:underline py-1 cursor-pointer`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Tap to customise delivery</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          (Delivery window, run count & variance)
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 font-extrabold text-[10px] uppercase">
                        <span>{isDeliveryOpen ? 'CLOSE' : 'OPEN'}</span>
                        {isDeliveryOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {/* Custom Delivery Options Drawer */}
                    {isDeliveryOpen && (() => {
                      const isAutoMode = autoRunsMode[mKey];
                      const maxPossibleRuns = getMaxRunsForQty(mKey, config.totalQuantity);
                      const estimatedAuto = getSmartAutoRuns(mKey, config.totalQuantity);
                      const minRule = mKey === 'views' ? 100 : 10;

                      return (
                        <div className={`mt-3 p-4 ${theme.drawerBg} rounded-2xl border ${theme.drawerBorder} space-y-4 text-xs`}>
                          
                          {/* Auto vs Manual Mode Selector */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              <span>Bundle Distribution Mode:</span>
                              <span className={`font-mono text-[10px] ${theme.accentText} font-extrabold`}>
                                {isAutoMode ? 'AUTO CALCULATION' : 'CUSTOM RUN COUNT'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setAutoRunsMode(prev => ({ ...prev, [mKey]: true }))}
                                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                  isAutoMode
                                    ? theme.buttonActiveGradient
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Auto Smart Bundles</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setAutoRunsMode(prev => ({ ...prev, [mKey]: false }))}
                                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                  !isAutoMode
                                    ? theme.buttonActiveGradient
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Manual Run Count</span>
                              </button>
                            </div>
                          </div>

                          {/* Auto Mode Info Card */}
                          {isAutoMode ? (
                            <div className={`p-3 ${theme.infoCardBg} rounded-xl border ${theme.infoCardBorder} space-y-1.5`}>
                              <div className={`flex items-center space-x-1.5 ${theme.infoCardText} font-extrabold text-xs`}>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Smart Organic Auto-Pacing (~{estimatedAuto} Bundles)</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                Automatically partitions <strong>{config.totalQuantity.toLocaleString()} {label}</strong> into <strong>~{estimatedAuto} natural runs</strong> (e.g. {mKey === 'views' ? '102, 167, 146, 196...' : '12, 18, 25, 16...'}), ensuring every single bundle satisfies <strong>&gt; {minRule} units</strong> along your active algorithm curve.
                              </p>
                              <div className={`text-[10px] ${theme.accentText} font-mono font-bold`}>
                                &bull; Max mathematically possible runs: {maxPossibleRuns} runs
                              </div>
                            </div>
                          ) : (
                            /* Manual Run Slider & Inputs */
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Scheduled Runs:</span>
                                  <span className="text-[10px] text-slate-400 ml-1.5">
                                    (Max {maxPossibleRuns} runs for {config.totalQuantity.toLocaleString()} {label})
                                  </span>
                                </div>
                                <span className={`font-mono font-extrabold ${theme.accentText}`}>
                                  {Math.min(config.runCount, maxPossibleRuns)} Runs
                                </span>
                              </div>

                              <input
                                type="range"
                                min={1}
                                max={maxPossibleRuns}
                                value={Math.min(config.runCount, maxPossibleRuns)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setMetricConfigs(prev => ({
                                    ...prev,
                                    [mKey]: { ...prev[mKey], runCount: val }
                                  }));
                                }}
                                className={`w-full ${theme.sliderAccent} cursor-pointer`}
                              />

                              {/* Quick Presets */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {[3, 5, 10, 15, 20, maxPossibleRuns]
                                  .filter((v, i, a) => v <= maxPossibleRuns && a.indexOf(v) === i)
                                  .map(rVal => (
                                    <button
                                      key={rVal}
                                      type="button"
                                      onClick={() => {
                                        setMetricConfigs(prev => ({
                                          ...prev,
                                          [mKey]: { ...prev[mKey], runCount: rVal }
                                        }));
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold transition-colors cursor-pointer ${
                                        config.runCount === rVal
                                          ? `${theme.badgeBg} shadow-xs font-black`
                                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      {rVal === maxPossibleRuns ? `Max (${rVal})` : `${rVal} Runs`}
                                    </button>
                                  ))}
                              </div>

                              {config.runCount > maxPossibleRuns && (
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-lg border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-300">
                                  💡 Smart Safety: For {config.totalQuantity.toLocaleString()} {label}, max {maxPossibleRuns} bundles can be created so every bundle remains &gt; {minRule} units. System will auto-clamp to {maxPossibleRuns} runs.
                                </div>
                              )}
                            </div>
                          )}

                          {/* Random Variance Slider */}
                          <div className={`space-y-1 pt-1 border-t ${theme.drawerBorder}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Natural Organic Jitter Variance</span>
                              <span className={`font-mono font-extrabold ${theme.accentText}`}>&plusmn;{randomVariance}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={50}
                              value={randomVariance}
                              onChange={(e) => setRandomVariance(parseInt(e.target.value) || 0)}
                              className={`w-full ${theme.sliderAccent} cursor-pointer`}
                            />
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* STEP 5: LIVE ORGANIC GROWTH PATTERN (WITH 100+ CURVES & ON/OFF SWITCH) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Card Header with ON/OFF Toggle Switch */}
        <div className="flex items-center justify-between pb-2 border-b border-pink-50 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-pink-500" />
              <span>Step 5: Live Organic Growth Pattern</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {patternEnabled 
                ? 'Quantity dynamically distributes along realistic algorithm curve' 
                : 'Growth curve disabled (Uniform instant distribution)'}
            </p>
          </div>

          {/* ON / OFF Switch */}
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-black uppercase tracking-wider ${patternEnabled ? 'text-pink-600 dark:text-pink-400' : 'text-slate-400'}`}>
              {patternEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              onClick={() => setPatternEnabled(!patternEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                patternEnabled ? 'bg-gradient-to-r from-pink-600 to-rose-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  patternEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {patternEnabled ? (
          <>
            {/* Active Pattern Info + 100+ Library Trigger Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-pink-50 via-rose-50/60 to-fuchsia-50/40 dark:from-pink-950/40 dark:to-fuchsia-950/30 rounded-2xl border border-pink-200 dark:border-pink-900/60">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Flame className="w-4 h-4 text-pink-500" />
                    <span>{activePattern.name}</span>
                  </span>
                  {activePattern.badge && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-pink-600 text-white shadow-xs">
                      {activePattern.badge}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium">
                    ({activePattern.category})
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {activePattern.description}
                </p>
              </div>

              {/* 100+ Library Modal Trigger Button with Arrow */}
              <button
                type="button"
                onClick={() => setShowPatternModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-pink-600/20 transition-all cursor-pointer shrink-0"
              >
                <span>Browse 100+ Viral Curves</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick-Pick Popular Curves */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Quick Select Popular Curves:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { id: 'viral_gaussian_peak', label: 'Viral Spike 🚀', desc: 'Early Peak' },
                  { id: 'human_ramp_linear', label: 'Human Ramp 📈', desc: 'Ascending' },
                  { id: 'pulse_wave_ocean', label: 'Pulse Wave 🌊', desc: 'Waves & Dips' },
                  { id: 'front_burst_classic', label: 'Front Burst ⚡', desc: '70% in 6h' },
                  { id: 'reels_30sec_trigger', label: 'Reels Hook 🪝', desc: 'Algorithm Hook' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatternId(p.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPatternId === p.id
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-600 shadow-md shadow-pink-500/20 ring-2 ring-pink-400'
                        : 'bg-pink-50/30 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-pink-100 dark:border-slate-800 hover:bg-pink-100/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{p.label}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedPatternId === p.id ? 'text-pink-100' : 'text-slate-400'}`}>
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Quantity Distribution Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {enabledMetrics.views && (
                <span className="px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold flex items-center space-x-1">
                  <Eye className="w-3.5 h-3.5 text-pink-500" />
                  <span>{metricConfigs.views.totalQuantity.toLocaleString()} Views</span>
                </span>
              )}
              {enabledMetrics.likes && (
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>{metricConfigs.likes.totalQuantity.toLocaleString()} Likes</span>
                </span>
              )}
              {enabledMetrics.comments && (
                <span className="px-3 py-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300 font-bold flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5 text-fuchsia-500" />
                  <span>{metricConfigs.comments.totalQuantity.toLocaleString()} Comments</span>
                </span>
              )}
              {enabledMetrics.shares && (
                <span className="px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold flex items-center space-x-1">
                  <Share2 className="w-3.5 h-3.5 text-pink-500" />
                  <span>{metricConfigs.shares.totalQuantity.toLocaleString()} Shares</span>
                </span>
              )}
              {enabledMetrics.saves && (
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center space-x-1">
                  <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                  <span>{metricConfigs.saves.totalQuantity.toLocaleString()} Saves</span>
                </span>
              )}
            </div>

            {/* Dynamic Organic Growth SVG Curve Chart (Glowing Pink) */}
            <div className="h-44 w-full bg-slate-950 rounded-2xl p-4 border border-pink-900/40 relative overflow-hidden flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-slate-400 z-10">
                <span className="font-mono">Start (0h)</span>
                <span className="font-mono font-bold text-pink-400">{activePattern.name} Simulation Curve</span>
                <span className="font-mono">End ({durationHours}h)</span>
              </div>

              <div className="w-full h-28 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="activePatternGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area */}
                  <path 
                    d={`${activePattern.svgPath} L 100,40 L 0,40 Z`} 
                    fill="url(#activePatternGrad)" 
                  />

                  {/* Main Stroke Curve */}
                  <path 
                    d={activePattern.svgPath} 
                    fill="none" 
                    stroke="#f472b6" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-400 z-10 pt-1 border-t border-slate-800">
                <span>Natural Entropy: &plusmn;{randomVariance}%</span>
                <span className="text-emerald-400 font-bold">Exact Quantity Match: Guaranteed 100%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 bg-pink-50/40 dark:bg-slate-950 rounded-2xl border border-pink-200 dark:border-slate-800 text-center space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ⚡ Flat Instant / Standard Delivery Active
            </span>
            <p className="text-[11px] text-slate-500">
              All quantities will be processed uniformly across the {durationHours}h duration without organic curve pacing.
            </p>
          </div>
        )}

        {/* Generate Timeline Schedule Button */}
        <button
          type="button"
          onClick={handleGeneratePreview}
          disabled={previewing}
          className="w-full py-3 rounded-2xl bg-pink-50 dark:bg-slate-950 hover:bg-pink-100 dark:hover:bg-slate-800 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border border-pink-200 dark:border-slate-700"
        >
          {previewing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-pink-500" />
              <span>Calculating Schedule Run Breakdown...</span>
            </>
          ) : (
            <>
              <Sliders className="w-4 h-4 text-pink-500" />
              <span>
                {schedulePreviewData?.summary?.totalBundles
                  ? `View Schedule Runs (${schedulePreviewData.summary.totalBundles} runs calculated)` 
                  : 'Generate Schedule Run Quantities Preview'}
              </span>
            </>
          )}
        </button>

            {/* Schedule Breakdown Preview Drawer */}
            {schedulePreviewData?.summary && (
              <div className="p-4 bg-pink-50/30 dark:bg-slate-950/90 rounded-2xl border border-pink-200 dark:border-slate-700 space-y-3.5 text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-pink-100 dark:border-slate-800">
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Schedule Run Quantities Breakdown ({patternEnabled ? activePattern?.name || 'Organic Curve' : 'Flat Distribution'})
                  </span>
                  <span className="font-mono text-pink-600 dark:text-pink-400 font-bold">
                    {schedulePreviewData.summary.totalBundles ?? 0} Total Runs
                  </span>
                </div>

                {/* Multi-Panel Routing Breakdown in Preview */}
                {schedulePreviewData.summary.providerBreakdown && schedulePreviewData.summary.providerBreakdown.length > 0 && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-sky-200 dark:border-sky-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-100">
                      <span className="flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-500" />
                        <span>Multi-SMM Panel Routing & Balance Deductions:</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        ⚡ Direct Provider Dispatch
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {schedulePreviewData.summary.providerBreakdown.map((pb: any, idx: number) => (
                        <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>🏛️ {pb?.providerName || 'SMM Provider'}</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{formatCostPrecision(pb?.cost || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>{(pb?.metrics || []).join(', ')} ({(pb?.totalQuantity || 0).toLocaleString()} units)</span>
                            {pb?.currentBalance !== null && pb?.currentBalance !== undefined && (
                              <span className="font-mono text-slate-600 dark:text-slate-400">Bal: ₹{Number(pb.currentBalance).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Bundle Quantity Profile (Graph Pattern Visualizer) */}
                {(() => {
                  const runs = schedulePreviewData.timelinePreview || [];
                  if (runs.length === 0) return null;
                  const quantities = runs.map((r: any) => Number(r?.quantity) || 0);
                  const maxQty = Math.max(...quantities, 1);
                  const minQty = Math.min(...quantities);
                  const firstQty = runs[0]?.quantity || 0;
                  const lastQty = runs[runs.length - 1]?.quantity || 0;
                  const isAscending = runs.length > 1 && lastQty > firstQty * 1.2;
                  const isDescending = runs.length > 1 && firstQty > lastQty * 1.2;
                  const hasPeak = runs.length > 2 && maxQty > firstQty * 1.2 && maxQty > lastQty * 1.2;

                  return (
                    <div className="p-3 bg-slate-900 rounded-xl border border-pink-900/60 space-y-2.5 text-white">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold flex items-center space-x-1.5 text-pink-400">
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Live Bundle Quantities along {patternEnabled ? activePattern?.name || 'Organic Curve' : 'Uniform Curve'}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-800">
                          {isAscending ? '📈 Kam se Zyada (Ascending)' : isDescending ? '📉 Zyada se Kam (Descending)' : hasPeak ? '🚀 Viral Peak Surge' : '📊 Dynamic Pacing'}
                        </span>
                      </div>

                      {/* Spark Bar Chart */}
                      <div className="h-16 flex items-end gap-1 px-1 pt-2 pb-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
                        {runs.map((r: any, i: number) => {
                          const rQty = Number(r?.quantity) || 0;
                          const heightPercent = Math.max(15, Math.round((rQty / maxQty) * 100));
                          const mKey = String(r?.metric || '').toLowerCase();
                          const barColor = mKey.includes('view')
                            ? 'bg-sky-500 hover:bg-sky-400'
                            : mKey.includes('like')
                            ? 'bg-rose-500 hover:bg-rose-400'
                            : mKey.includes('comment')
                            ? 'bg-emerald-500 hover:bg-emerald-400'
                            : mKey.includes('share')
                            ? 'bg-amber-500 hover:bg-amber-400'
                            : 'bg-purple-500 hover:bg-purple-400';

                          return (
                            <div
                              key={i}
                              className="flex-1 min-w-[14px] max-w-[32px] flex flex-col items-center justify-end group relative h-full cursor-pointer"
                              title={`Run #${r?.runNumber || (i + 1)}: ${rQty.toLocaleString()} ${r?.metric || ''}`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute -top-7 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-white whitespace-nowrap shadow-lg z-20 pointer-events-none">
                                #{r?.runNumber || (i + 1)}: {rQty.toLocaleString()}
                              </div>
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className={`w-full rounded-t transition-all duration-300 ${barColor}`}
                              />
                              <span className="text-[8px] font-mono text-slate-500 mt-0.5 group-hover:text-white">
                                {r?.runNumber || (i + 1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 font-mono">
                        <span>Start (Run #1: {firstQty.toLocaleString()} units)</span>
                        <span className="text-pink-300 font-bold">Min: {minQty.toLocaleString()} &bull; Max: {maxQty.toLocaleString()}</span>
                        <span>End (Run #{runs.length}: {lastQty.toLocaleString()} units)</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {(() => {
                    const timeline = schedulePreviewData?.timelinePreview || [];
                    if (timeline.length === 0) return null;
                    const quantities = timeline.map((r: any) => Number(r?.quantity) || 0);
                    const maxQty = Math.max(...quantities, 1);
                    return timeline.map((run: any, idx: number) => {
                      const runQty = Number(run?.quantity) || 0;
                      const pct = Math.max(10, Math.round((runQty / maxQty) * 100));
                      const mKey = String(run?.metric || '').toLowerCase();
                      const barThemeColor = mKey.includes('view')
                        ? 'bg-sky-500'
                        : mKey.includes('like')
                        ? 'bg-rose-500'
                        : mKey.includes('comment')
                        ? 'bg-emerald-500'
                        : mKey.includes('share')
                        ? 'bg-amber-500'
                        : 'bg-purple-500';

                      const dateObj = run?.scheduledAt ? new Date(run.scheduledAt) : new Date();
                      const timeStr = !isNaN(dateObj.getTime()) 
                        ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : 'Scheduled';

                      return (
                        <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-pink-100 dark:border-slate-800 flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 font-black flex items-center justify-center text-[10px]">
                                #{run?.runNumber || (idx + 1)}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{run?.metric || 'Run'}</span>
                              <span className="text-[10px] text-slate-400">({timeStr})</span>
                            </div>

                            <div className="flex items-center space-x-2.5">
                              <span className="font-mono font-extrabold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded">
                                +{runQty.toLocaleString()}
                              </span>
                              <span className="font-mono text-slate-500 text-[10px]">₹{formatCostPrecision(run?.cost || 0)}</span>
                            </div>
                          </div>

                          {/* Miniature bundle relative size bar */}
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full ${barThemeColor} transition-all duration-300`}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

      </div>

      {/* 7. COMPREHENSIVE CAMPAIGN PRICING & CONFIGURATION SUMMARY CARD */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Campaign Order Cost Summary
              </h4>
              <span className="text-[11px] text-slate-400">
                {platform} &bull; {durationHours} Hours Pacing ({patternEnabled ? activePattern.name : 'Flat Delivery'})
              </span>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-900/60 font-mono font-extrabold text-xs">
            {activeMetricsCount} Active Metrics
          </span>
        </div>

        {/* Itemized Table (Rendered with each metric's specific pastel theme) */}
        <div className="space-y-2">
          {metricDefinitions.map((def) => {
            const { key, label, icon: Icon } = def;
            const theme = metricThemes[key] || metricThemes.views;
            const mKey = key as keyof typeof metricConfigs;
            const isEnabled = enabledMetrics[mKey];
            if (!isEnabled) return null;

            const config = metricConfigs[mKey];
            const platformServices = services.filter(s => s.platform.toLowerCase() === platform.toLowerCase());
            const svc = platformServices.find(s => s.id === config.serviceId);
            const rate = svc ? svc.rate : getEffectiveRate(mKey, config.serviceId);
            const cost = (config.totalQuantity / 1000) * rate;
            const isAuto = autoRunsMode[mKey];
            const estimatedRuns = isAuto ? getSmartAutoRuns(mKey, config.totalQuantity) : Math.min(config.runCount, getMaxRunsForQty(mKey, config.totalQuantity));

            return (
              <div
                key={key}
                className={`flex items-center justify-between p-3.5 ${theme.panelBadgeBg} rounded-2xl border ${theme.panelBadgeBorder} text-xs`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      {config.totalQuantity.toLocaleString()} {label}
                    </span>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                      <span>{isAuto ? '✨ Auto' : '🎛️ Custom'}: ~{estimatedRuns} runs</span>
                      <span>&bull;</span>
                      <span className="truncate max-w-[160px] text-slate-600 dark:text-slate-400 font-semibold">
                        🏛️ {svc?.providerName || 'Primary Panel'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono font-black ${theme.priceChipText} text-sm block`}>
                    ₹{formatCostPrecision(cost)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    @ ₹{formatRatePrecision(rate)}/1k
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-Panel Deduction Summary Box */}
        {(() => {
          const provMap = new Map<string, { providerName: string; totalCost: number; metrics: string[]; currentBalance: number | null }>();
          for (const def of metricDefinitions) {
            const mKey = def.key as keyof typeof metricConfigs;
            if (!enabledMetrics[mKey]) continue;
            const cfg = metricConfigs[mKey];
            const platformServices = services.filter(s => s.platform.toLowerCase() === platform.toLowerCase());
            const svc = platformServices.find(s => s.id === cfg.serviceId);
            const rate = svc ? svc.rate : getEffectiveRate(mKey, cfg.serviceId);
            const cost = (cfg.totalQuantity / 1000) * rate;
            const pId = svc?.providerId || cfg.providerId || 'default';
            const prov = providers.find(p => p.id === pId);
            const pName = prov?.name || svc?.providerName || 'Primary SMM Panel';
            if (!provMap.has(pId)) {
              provMap.set(pId, { providerName: pName, totalCost: 0, metrics: [], currentBalance: prov?.balance ?? null });
            }
            const entry = provMap.get(pId)!;
            entry.totalCost += cost;
            entry.metrics.push(def.label);
          }
          const breakdownList = Array.from(provMap.values());
          if (breakdownList.length <= 0) return null;

          return (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-pink-500" />
                  <span>Multi-SMM Panel Deduction Split:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {breakdownList.length} {breakdownList.length === 1 ? 'Panel' : 'Panels'} Targeted
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {breakdownList.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 dark:text-slate-200 truncate">🏛️ {item.providerName}</span>
                      <span className="font-mono text-pink-600 dark:text-pink-400 font-extrabold">₹{formatCostPrecision(item.totalCost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{item.metrics.join(', ')}</span>
                      {item.currentBalance !== null && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">Bal: ₹{item.currentBalance.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Grand Total Highlight Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-700 text-white shadow-lg shadow-pink-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-200 block">
              TOTAL ORDER AMOUNT (TO PAY)
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight flex items-baseline space-x-1.5 mt-0.5">
              <span>₹{formatCostPrecision(calculatedGrandTotal)}</span>
              <span className="text-xs font-bold text-pink-200 uppercase">INR</span>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <span className="px-2.5 py-1 rounded-lg bg-white/20 text-[11px] font-mono font-black uppercase backdrop-blur-md">
              100% Pacing Guaranteed
            </span>
            <div className="text-[10px] text-pink-100 font-medium">
              {totalEngagementsCount.toLocaleString()} Total Units
            </div>
          </div>
        </div>

        <div className="p-3 bg-pink-50/50 dark:bg-pink-950/40 rounded-xl border border-pink-100 dark:border-pink-900/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
          <span>
            <strong>Smart Safety Guarantee:</strong> Views bundles are strictly &gt; 100 units each; Likes, Comments & Shares bundles are strictly &gt; 10 units each.
          </span>
        </div>
      </div>

      {/* Error & Success Messages */}
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-2xl text-xs flex items-center space-x-2 text-red-900 dark:text-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {orderSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs flex items-center space-x-2 text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{orderSuccessMessage}</span>
        </div>
      )}

      {/* 8. STICKY BOTTOM FLOATING TOTAL CHARGE BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-pink-100 dark:border-slate-800 p-4 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
              TOTAL CHARGE
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline space-x-1">
              <span>₹{formatCostPrecision(calculatedGrandTotal)}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {totalEngagementsCount.toLocaleString()} engagements &bull; {durationHours}h delivery
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirmAndSchedule}
            disabled={submittingOrder}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-pink-600/30 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {submittingOrder ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scheduling Campaign...</span>
              </>
            ) : (
              <>
                <span>Place Order Now</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9. 100+ VIRAL GROWTH CURVES EXPLORER MODAL                                */}
      {/* ========================================================================= */}
      {showPatternModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-pink-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-pink-50/50 via-rose-50/30 to-pink-50/50 dark:from-slate-950 dark:to-slate-900">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-pink-500" />
                  <span>100+ Instagram Organic Growth Patterns</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any viral algorithm curve &bull; Quantity auto-distributes along selected curve
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPatternModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-pink-50 dark:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Category Filters Bar */}
            <div className="p-4 bg-pink-50/30 dark:bg-slate-800/50 border-b border-pink-100 dark:border-slate-800 space-y-3">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 100+ patterns by name, strategy, or keyword (e.g. reels, hook, prime, explore)..."
                  value={patternSearchQuery}
                  onChange={(e) => setPatternSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {GROWTH_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPatternCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      patternCategoryFilter === cat
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-pink-100 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>

            {/* Patterns Grid (100+ Cards with Live SVG Curve Previews) */}
            <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPatterns.map(pattern => {
                const isSelected = selectedPatternId === pattern.id;
                return (
                  <div
                    key={pattern.id}
                    onClick={() => {
                      setSelectedPatternId(pattern.id);
                      setShowPatternModal(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-pink-50/90 dark:bg-pink-950/60 border-pink-600 ring-2 ring-pink-500 shadow-md shadow-pink-500/15'
                        : 'bg-white dark:bg-slate-800 border-pink-100 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow'
                    }`}
                  >
                    {/* Card Top */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 dark:text-white flex items-center space-x-1">
                          <span>{pattern.name}</span>
                        </span>
                        {pattern.badge && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300">
                            {pattern.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {pattern.description}
                      </p>
                    </div>

                    {/* Card SVG Curve Preview */}
                    <div className="h-16 w-full bg-slate-950 rounded-xl p-2 border border-pink-950/50 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path 
                          d={pattern.svgPath} 
                          fill="none" 
                          stroke={isSelected ? "#f472b6" : "#fbcfe8"} 
                          strokeWidth="2.5" 
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Card Bottom Select Status */}
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="text-slate-400 font-medium">{pattern.category.split(' ')[1] || 'Organic'}</span>
                      <span className={`font-extrabold flex items-center space-x-1 ${isSelected ? 'text-pink-600 dark:text-pink-400' : 'text-slate-400'}`}>
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Active Curve</span>
                          </>
                        ) : (
                          <span>Tap to Select &rarr;</span>
                        )}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-pink-50/40 dark:bg-slate-800/80 border-t border-pink-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Showing {filteredPatterns.length} of {GROWTH_PATTERNS_LIST.length} growth curves
              </span>
              <button
                type="button"
                onClick={() => setShowPatternModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold cursor-pointer hover:from-pink-500 hover:to-rose-500 shadow-md shadow-pink-600/20"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
