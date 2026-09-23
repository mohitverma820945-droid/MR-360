import express from 'express';
import { db } from './server/db';
import { ProviderClient, processProviderBalance } from './server/providerClient';
import { BundleGenerator } from './server/bundleGenerator';
import { Order, ScheduleItem, SmmService, SmmProvider, AllInOneOrderRequest, OrderType, BundlePreview } from './src/types';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to extract authenticated/requesting user ID
function getRequestUserId(req: express.Request): string | undefined {
  const hId = req.headers['x-user-id'] as string;
  if (hId && typeof hId === 'string' && hId.trim().length > 0) return hId.trim();
  const qId = (req.query.userId || req.query.user_id) as string;
  if (qId && typeof qId === 'string' && qId.trim().length > 0) return qId.trim();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = db.getUserByApiKey(token) || db.getUserById(token);
    if (user) return user.id;
  }
  return undefined;
}

// ==========================================
// AUTHENTICATION & USER MANAGEMENT API
// ==========================================
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, username, name } = req.body;
    const result = db.registerUser({ email, password, username, name });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, user: result.user, message: 'Registration successful' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const result = db.authenticateUser(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json({ success: true, user: result.user, message: 'Login successful' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const userId = getRequestUserId(req);
  if (userId) {
    const user = db.getUserById(userId);
    if (user) return res.json({ success: true, user });
  }

  res.status(401).json({ success: false, error: 'Not authenticated' });
});

app.get('/api/users', (req, res) => {
  res.json(db.getUsers());
});

app.post('/api/users/:id/balance', (req, res) => {
  try {
    const { amount } = req.body;
    const updated = db.updateUserBalance(req.params.id, parseFloat(amount) || 0);
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PROVIDERS MANAGEMENT API (SCOPED PER USER)
// ==========================================
app.get('/api/providers', (req, res) => {
  const userId = getRequestUserId(req);
  res.json(db.getProviders(userId));
});

app.post('/api/providers', async (req, res) => {
  try {
    const { name, apiUrl, apiKey } = req.body;
    const userId = getRequestUserId(req) || req.body.userId || 'usr_mohit_owner';

    if (!name || !apiUrl || !apiKey) {
      return res.status(400).json({ success: false, error: 'Name, API URL, and API Key are required' });
    }

    const provider = db.addProvider({
      name,
      apiUrl: apiUrl.trim(),
      apiKey: apiKey.trim(),
      status: 'active',
      balance: null,
      balanceCurrency: 'USD',
      lastBalanceCheck: null
    }, userId);

    ProviderClient.getBalance(provider).then(bRes => {
      if (bRes.success && bRes.balance !== undefined) {
        const processed = processProviderBalance(bRes.balance, bRes.currency);
        db.updateProvider(provider.id, {
          balance: processed.balanceInr,
          balanceInr: processed.balanceInr,
          balanceUsd: processed.balanceUsd,
          balanceCurrency: bRes.currency || 'USD'
        });
      }
    });

    try {
      const catalogRes = await ProviderClient.getServices(provider);
      if (catalogRes.success && catalogRes.services) {
        const rawItems = catalogRes.services;
        const existingServices = db.getServices();
        const markupPct = db.getSettings().markupPercentage || 0;

        const updatedList: SmmService[] = [...existingServices.filter(s => s.providerId !== provider.id)];

        for (const item of rawItems) {
          const pRate = typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate;
          const pMin = typeof item.min === 'string' ? parseInt(item.min, 10) : item.min;
          const pMax = typeof item.max === 'string' ? parseInt(item.max, 10) : item.max;

          if (isNaN(pRate)) continue;

          const pCatStr = item.category || 'General';
          let platform: any = 'Instagram';
          const catLower = pCatStr.toLowerCase();

          if (catLower.includes('tiktok')) platform = 'TikTok';
          else if (catLower.includes('youtube') || catLower.includes('yt')) platform = 'YouTube';
          else if (catLower.includes('telegram') || catLower.includes('tg')) platform = 'Telegram';
          else if (catLower.includes('twitter') || catLower.includes('x')) platform = 'Twitter/X';
          else if (catLower.includes('spotify')) platform = 'Spotify';
          else if (catLower.includes('facebook') || catLower.includes('fb')) platform = 'Facebook';

          const svcId = typeof item.service === 'number' ? item.service : parseInt(item.service as string, 10);

          updatedList.push({
            id: svcId,
            providerId: provider.id,
            providerServiceId: svcId,
            providerName: provider.name,
            platform,
            category: pCatStr,
            name: item.name || `Service #${svcId}`,
            rate: parseFloat((pRate * (1 + markupPct / 100)).toFixed(4)),
            providerRate: pRate,
            min: pMin || 10,
            max: pMax || 1000000,
            status: 'active',
            type: item.type === 'Custom Comments' ? 'custom_comments' : 'default',
            refill: !!item.refill
          });
        }

        db.saveServices(updatedList);
      }
    } catch (err) {
      console.error('[Provider] Auto-sync failed upon addition:', err);
    }

    res.json({ success: true, provider, message: 'Provider added & live services synced successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/providers/:id', (req, res) => {
  try {
    const provider = db.updateProvider(req.params.id, req.body);
    res.json({ success: true, provider });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/providers', (req, res) => {
  try {
    db.deleteAllProviders();
    res.json({ success: true, message: 'All provider nodes removed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/providers/:id', (req, res) => {
  try {
    db.deleteProvider(req.params.id);
    res.json({ success: true, message: 'Provider removed successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/providers/:id/test', async (req, res) => {
  try {
    const provider = db.getProviderById(req.params.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const balRes = await ProviderClient.getBalance(provider);
    if (balRes.success && balRes.balance !== undefined) {
      const processed = processProviderBalance(balRes.balance, balRes.currency);
      db.updateProvider(provider.id, {
        balance: processed.balanceInr,
        balanceInr: processed.balanceInr,
        balanceUsd: processed.balanceUsd,
        status: 'active',
        lastBalanceCheck: new Date().toISOString(),
        errorMessage: undefined
      });
      return res.json({
        success: true,
        balance: processed.balanceInr,
        balanceUsd: processed.balanceUsd,
        currency: 'INR',
        rawCurrency: balRes.currency,
        message: `Connection successful! Real Balance: ₹${processed.balanceInr.toFixed(2)} INR ($${processed.balanceUsd.toFixed(2)} USD)`
      });
    } else {
      db.updateProvider(provider.id, {
        status: 'error',
        errorMessage: balRes.error
      });
      return res.status(400).json({ success: false, error: balRes.error || 'Connection failed' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/providers/:id/sync-services', async (req, res) => {
  try {
    const provider = db.getProviderById(req.params.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const catalogRes = await ProviderClient.getServices(provider);
    if (!catalogRes.success || !catalogRes.services) {
      return res.status(400).json({ success: false, error: catalogRes.error || 'Failed to fetch service catalog from provider' });
    }

    const rawItems = catalogRes.services;
    const existingServices = db.getServices();
    const markupPct = db.getSettings().markupPercentage || 0;

    const updatedList: SmmService[] = [...existingServices.filter(s => s.providerId !== provider.id)];

    for (const item of rawItems) {
      const pRate = typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate;
      const pMin = typeof item.min === 'string' ? parseInt(item.min, 10) : item.min;
      const pMax = typeof item.max === 'string' ? parseInt(item.max, 10) : item.max;

      if (isNaN(pRate)) continue;

      const pCatStr = item.category || 'General';
      let platform: any = 'Instagram';
      const catLower = pCatStr.toLowerCase();

      if (catLower.includes('tiktok')) platform = 'TikTok';
      else if (catLower.includes('youtube') || catLower.includes('yt')) platform = 'YouTube';
      else if (catLower.includes('telegram') || catLower.includes('tg')) platform = 'Telegram';
      else if (catLower.includes('twitter') || catLower.includes('x')) platform = 'Twitter/X';
      else if (catLower.includes('spotify')) platform = 'Spotify';
      else if (catLower.includes('facebook') || catLower.includes('fb')) platform = 'Facebook';

      const sellingRate = parseFloat((pRate * (1 + markupPct / 100)).toFixed(4));

      updatedList.push({
        id: typeof item.service === 'number' ? item.service : parseInt(item.service as string, 10) || Math.floor(1000 + Math.random() * 9000),
        providerId: provider.id,
        providerServiceId: typeof item.service === 'number' ? item.service : parseInt(item.service as string, 10),
        providerName: provider.name,
        platform,
        category: pCatStr,
        name: item.name || `Service #${item.service}`,
        rate: sellingRate,
        providerRate: pRate,
        min: pMin || 10,
        max: pMax || 1000000,
        status: 'active',
        type: item.type === 'Custom Comments' ? 'custom_comments' : 'default',
        refill: !!item.refill
      });
    }

    db.saveServices(updatedList);
    res.json({ success: true, count: rawItems.length, message: `Synced ${rawItems.length} services from ${provider.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SERVICES API
// ==========================================
app.get('/api/services', (req, res) => {
  const userId = getRequestUserId(req);
  res.json(db.getServices(userId));
});

app.post('/api/services', (req, res) => {
  try {
    const service = db.addService(req.body);
    res.json({ success: true, service });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const service = db.updateService(parseInt(req.params.id, 10), req.body);
    res.json({ success: true, service });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/services/:id', (req, res) => {
  try {
    db.deleteService(parseInt(req.params.id, 10));
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// ORDERS API
// ==========================================
app.get('/api/orders', (req, res) => {
  const userId = getRequestUserId(req);
  res.json(db.getOrders(userId));
});

app.post('/api/orders/single', async (req, res) => {
  try {
    const userId = getRequestUserId(req) || req.body.userId;
    const user = userId ? db.getUserById(userId) : undefined;

    const { serviceId, link, quantity, comments, runs, interval } = req.body;
    const service = db.getServiceById(parseInt(serviceId, 10));

    if (!service) {
      return res.status(400).json({ success: false, error: 'Service not found' });
    }

    const price = parseFloat(((service.rate / 1000) * quantity).toFixed(4));

    if (user && user.balance !== undefined && user.balance < price) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Required: ₹${price.toFixed(2)}, Available: ₹${user.balance.toFixed(2)}` });
    }

    const provider = db.getProviderById(service.providerId);
    let providerOrderId: string | null = null;
    let status: any = 'Pending';
    let errorMessage: string | undefined;

    if (provider && provider.apiUrl && provider.apiKey) {
      const pRes = await ProviderClient.addOrder(provider, {
        service: service.providerServiceId,
        link,
        quantity,
        comments
      });

      if (pRes.success && pRes.orderId) {
        providerOrderId = String(pRes.orderId);
        status = 'Processing';
      } else {
        status = 'Error';
        errorMessage = pRes.error || 'Provider execution failed';
      }
    }

    if (user && status !== 'Error') {
      db.updateUserBalance(user.id, -price);
    }

    const newOrder = db.createOrder({
      userId: user?.id || 'usr_guest',
      orderType: 'single',
      serviceId: service.id,
      serviceName: service.name,
      platform: service.platform,
      category: service.category,
      link,
      quantity,
      price,
      status,
      providerId: service.providerId,
      providerOrderId,
      errorMessage,
      runs,
      interval,
      comments
    });

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const userId = getRequestUserId(req) || req.body.userId;
    const user = userId ? db.getUserById(userId) : undefined;

    const { serviceId, link, quantity, comments, runs, interval } = req.body;
    const service = db.getServiceById(parseInt(serviceId, 10));

    if (!service) {
      return res.status(400).json({ success: false, error: 'Service not found' });
    }

    const price = parseFloat(((service.rate / 1000) * quantity).toFixed(4));

    if (user && user.balance !== undefined && user.balance < price) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Required: ₹${price.toFixed(2)}, Available: ₹${user.balance.toFixed(2)}` });
    }

    const provider = db.getProviderById(service.providerId);
    let providerOrderId: string | null = null;
    let status: any = 'Pending';
    let errorMessage: string | undefined;

    if (provider && provider.apiUrl && provider.apiKey) {
      const pRes = await ProviderClient.addOrder(provider, {
        service: service.providerServiceId,
        link,
        quantity,
        comments
      });

      if (pRes.success && pRes.orderId) {
        providerOrderId = String(pRes.orderId);
        status = 'Processing';
      } else {
        status = 'Error';
        errorMessage = pRes.error || 'Provider execution failed';
      }
    }

    if (user && status !== 'Error') {
      db.updateUserBalance(user.id, -price);
    }

    const newOrder = db.createOrder({
      userId: user?.id || 'usr_guest',
      orderType: 'single',
      serviceId: service.id,
      serviceName: service.name,
      platform: service.platform,
      category: service.category,
      link,
      quantity,
      price,
      status,
      providerId: service.providerId,
      providerOrderId,
      errorMessage,
      runs,
      interval,
      comments
    });

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/:id/cancel', (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = db.cancelOrder(orderId);
    res.json({ success: true, order, message: `Order #${orderId} canceled! All upcoming scheduled runs halted.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const deleted = db.deleteOrder(orderId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: `Order #${orderId} not found` });
    }
    res.json({ success: true, message: `Order #${orderId} permanently deleted.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/all-in-one/preview', (req, res) => {
  try {
    const reqBody = req.body || {};
    const { platform, targetUrl, durationHours } = reqBody;
    const mConfigs = reqBody.metricConfigs || reqBody.metricsConfig || {};
    const autoRunsMode = reqBody.autoRunsMode || {};

    const metricPlans: any[] = [];
    let grandTotalCost = 0;
    const timelinePreview: BundlePreview[] = [];

    for (const [metricKey, configAny] of Object.entries(mConfigs)) {
      const config = configAny as any;
      if (!config.serviceId || config.totalQuantity <= 0) continue;

      const service = db.getServiceById(config.serviceId);
      if (!service) continue;

      const provider = db.getProviderById(service.providerId);
      if (!provider) continue;

      const autoMode = autoRunsMode[metricKey] ?? true;
      const minSize = BundleGenerator.getMinimumBundleSize(metricKey, service.min);

      const runCount = autoMode 
        ? BundleGenerator.calculateOptimalAutoRuns(metricKey, config.totalQuantity, durationHours, minSize)
        : Math.max(1, config.runCount || 10);

      const plan = BundleGenerator.generateMetricBundles({
        metric: metricKey,
        service,
        provider,
        totalQuantity: config.totalQuantity,
        requestedRunCount: runCount,
        durationHours
      });

      metricPlans.push(plan);
      grandTotalCost += plan.totalCost;
      timelinePreview.push(...plan.bundles);
    }

    timelinePreview.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    res.json({
      success: true,
      data: {
        summary: {
          platform,
          targetUrl,
          durationHours,
          totalBundles: timelinePreview.length,
          grandTotalCost: parseFloat(grandTotalCost.toFixed(4)),
          providerName: 'Multi-Provider Engine'
        },
        metricPlans,
        timelinePreview
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/all-in-one/submit', (req, res) => {
  try {
    const userId = getRequestUserId(req) || req.body.userId;
    const user = userId ? db.getUserById(userId) : undefined;

    const reqBody = req.body || {};
    const { platform, targetUrl, durationHours } = reqBody;
    const mConfigs = reqBody.metricConfigs || reqBody.metricsConfig || {};
    const autoRunsMode = reqBody.autoRunsMode || {};

    const metricPlans: any[] = [];
    let grandTotalCost = 0;
    const timelinePreview: BundlePreview[] = [];

    for (const [metricKey, configAny] of Object.entries(mConfigs)) {
      const config = configAny as any;
      if (!config.serviceId || config.totalQuantity <= 0) continue;

      const service = db.getServiceById(config.serviceId);
      if (!service) continue;

      const provider = db.getProviderById(service.providerId);
      if (!provider) continue;

      const autoMode = autoRunsMode[metricKey] ?? true;
      const minSize = BundleGenerator.getMinimumBundleSize(metricKey, service.min);

      const runCount = autoMode 
        ? BundleGenerator.calculateOptimalAutoRuns(metricKey, config.totalQuantity, durationHours, minSize)
        : Math.max(1, config.runCount || 10);

      const plan = BundleGenerator.generateMetricBundles({
        metric: metricKey,
        service,
        provider,
        totalQuantity: config.totalQuantity,
        requestedRunCount: runCount,
        durationHours
      });

      metricPlans.push(plan);
      grandTotalCost += plan.totalCost;
      timelinePreview.push(...plan.bundles);
    }

    if (user && user.balance !== undefined && user.balance < grandTotalCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient user balance. Required: ₹${grandTotalCost.toFixed(2)}, Available: ₹${user.balance.toFixed(2)}`
      });
    }

    if (user) {
      db.updateUserBalance(user.id, -grandTotalCost);
    }

    const parentOrder = db.createOrder({
      userId: user?.id || 'usr_guest',
      orderType: 'all_in_one_parent',
      platform,
      category: 'Organic Campaign',
      serviceId: 0,
      serviceName: `All-In-One Campaign (${timelinePreview.length} Bundles)`,
      link: targetUrl,
      quantity: metricPlans.reduce((sum, p) => sum + p.totalQuantity, 0),
      price: parseFloat(grandTotalCost.toFixed(4)),
      status: 'Processing',
      totalBundles: timelinePreview.length,
      completedBundles: 0,
      durationHours,
      providerId: 'multi',
      providerOrderId: `aio_${Date.now()}`
    });

    const schedulesToInsert = timelinePreview.map((bundle, idx) => ({
      parentOrderId: parentOrder.id,
      metric: bundle.metric,
      serviceId: bundle.serviceId,
      serviceName: bundle.serviceName || `Service #${bundle.serviceId}`,
      providerId: bundle.providerId,
      providerOrderId: String(bundle.serviceId),
      link: targetUrl,
      quantity: bundle.quantity,
      scheduledAt: bundle.scheduledAt,
      status: 'pending' as const,
      runNumber: idx + 1,
      totalRuns: timelinePreview.length
    }));

    db.addSchedules(schedulesToInsert);

    res.json({
      success: true,
      order: parentOrder,
      message: `All-in-One Campaign #${parentOrder.id} successfully created with ${timelinePreview.length} scheduled runs!`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/balance', async (req, res) => {
  try {
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string, 10) : null;
    const providerId = req.query.providerId as string | undefined;

    let targetProvider: SmmProvider | undefined;

    if (serviceId) {
      const service = db.getServiceById(serviceId);
      if (service) {
        targetProvider = db.getProviderById(service.providerId);
      }
    } else if (providerId) {
      targetProvider = db.getProviderById(providerId);
    }

    const allProviders = db.getProviders();

    // Fetch live balances for all connected providers
    const providerList: Array<{
      id: string;
      name: string;
      balanceInr: number | null;
      balanceUsd: number | null;
      currency: string;
      status: string;
    }> = [];

    for (const p of allProviders) {
      let bInr = p.balanceInr ?? p.balance ?? null;
      let bUsd = p.balanceUsd ?? null;
      let curr = (p as any).currency || 'INR';

      if (p.apiUrl && p.apiKey) {
        try {
          const bRes = await ProviderClient.getBalance(p);
          if (bRes.success && bRes.balance !== undefined) {
            const processed = processProviderBalance(bRes.balance, bRes.currency || (p as any).currency || 'USD');
            bInr = processed.balanceInr;
            bUsd = processed.balanceUsd;
            curr = processed.rawCurrency;

            db.updateProvider(p.id, {
              balance: processed.balanceInr,
              balanceInr: processed.balanceInr,
              balanceUsd: processed.balanceUsd
            });
          }
        } catch {
          // ignore transient API errors
        }
      }

      providerList.push({
        id: p.id,
        name: p.name,
        balanceInr: bInr,
        balanceUsd: bUsd,
        currency: curr,
        status: p.status
      });
    }

    if (targetProvider) {
      const matched = providerList.find(p => p.id === targetProvider!.id);
      return res.json({
        success: true,
        providerName: targetProvider.name,
        balance: matched?.balanceInr ?? null,
        balanceUsd: matched?.balanceUsd ?? null,
        providers: providerList
      });
    }

    res.json({
      success: true,
      providerName: providerList[0]?.name || 'Connected SMM Panels',
      balance: providerList[0]?.balanceInr ?? null,
      balanceUsd: providerList[0]?.balanceUsd ?? null,
      providers: providerList
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SYSTEM SETTINGS API
// ==========================================
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', (req, res) => {
  try {
    const settings = db.updateSettings(req.body);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { app };
