import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { ProviderClient, processProviderBalance } from './server/providerClient';
import { BundleGenerator } from './server/bundleGenerator';
import { SchedulerWorker } from './server/scheduler';
import { Order, ScheduleItem, SmmService, SmmProvider, AllInOneOrderRequest, OrderType } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Start Server-Side Background Scheduler Worker
  SchedulerWorker.start();

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
    // Return only providers belonging to this user
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

      // Trigger immediate background balance test & service catalog sync
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

      // Auto-sync live services from this provider immediately
      try {
        const catalogRes = await ProviderClient.getServices(provider);
        if (catalogRes.success && catalogRes.services) {
          const rawItems = catalogRes.services;
          const existingServices = db.getServices();
          const markupPct = db.getSettings().markupPercentage || 0;

          let syncedCount = 0;
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
            syncedCount++;
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

      let syncedCount = 0;
      const updatedList: SmmService[] = [...existingServices.filter(s => s.providerId !== provider.id)];

      for (const item of rawItems) {
        const pRate = typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate;
        const pMin = typeof item.min === 'string' ? parseInt(item.min, 10) : item.min;
        const pMax = typeof item.max === 'string' ? parseInt(item.max, 10) : item.max;

        if (isNaN(pRate)) continue;

        // Determine platform & category from provider category string
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
          name: item.name || 'SMM Engagement Service',
          rate: sellingRate,
          providerRate: pRate,
          min: pMin || 10,
          max: pMax || 1000000,
          status: 'active',
          type: item.type === 'Custom Comments' ? 'custom_comments' : 'default',
          refill: !!item.refill
        });
        syncedCount++;
      }

      db.saveServices(updatedList);
      db.addLog('info', 'Providers', `Synced ${syncedCount} services from Provider ${provider.name}`);

      res.json({ success: true, count: syncedCount, message: `Successfully synced ${syncedCount} real services from provider` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/providers/refresh-balance', async (req, res) => {
    try {
      await SchedulerWorker.refreshAllProviderBalances();
      res.json({ success: true, providers: db.getProviders(), message: 'Refreshed provider balances' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // REAL PROVIDER BALANCE API
  // ==========================================
  app.get('/api/balance', async (req, res) => {
    const providerId = req.query.providerId as string;
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string, 10) : undefined;

    let targetProvider = providerId ? db.getProviderById(providerId) : undefined;

    if (!targetProvider && serviceId) {
      const service = db.getServiceById(serviceId);
      if (service) {
        targetProvider = db.getProviderById(service.providerId);
      }
    }

    if (!targetProvider) {
      const allProviders = db.getProviders();
      targetProvider = allProviders.find(p => p.status === 'active') || allProviders[0];
    }

    if (!targetProvider) {
      return res.json({ success: false, status: 'unavailable', message: 'No SMM provider connected' });
    }

    // Always fetch live balance from provider API
    try {
      const balRes = await ProviderClient.getBalance(targetProvider);
      if (balRes.success && balRes.balance !== undefined) {
        const processed = processProviderBalance(balRes.balance, balRes.currency);
        db.updateProvider(targetProvider.id, {
          balance: processed.balanceInr,
          balanceInr: processed.balanceInr,
          balanceUsd: processed.balanceUsd,
          balanceCurrency: balRes.currency || 'USD',
          lastBalanceCheck: new Date().toISOString()
        });
        targetProvider = db.getProviderById(targetProvider.id);
      }
    } catch (e) {
      console.error('[Balance] Live fetch error:', e);
    }

    if (targetProvider && targetProvider.balance !== null && targetProvider.balance !== undefined) {
      return res.json({
        success: true,
        providerId: targetProvider.id,
        providerName: targetProvider.name,
        balance: targetProvider.balanceInr || targetProvider.balance,
        balanceUsd: targetProvider.balanceUsd,
        currency: 'INR',
        rawCurrency: targetProvider.balanceCurrency || 'USD',
        lastChecked: targetProvider.lastBalanceCheck
      });
    }

    res.json({
      success: false,
      status: 'unavailable',
      providerName: targetProvider?.name || 'Unknown',
      message: targetProvider?.errorMessage || 'Balance unavailable from provider'
    });
  });

  // ==========================================
  // SERVICES CATALOG API
  // ==========================================
  app.post('/api/services/sync-all', async (req, res) => {
    try {
      const providers = db.getProviders().filter(p => p.status === 'active');
      if (providers.length === 0) {
        return res.status(400).json({ success: false, error: 'No active SMM provider node configured' });
      }

      const markupPct = db.getSettings().markupPercentage || 0;
      let totalSynced = 0;
      let allUpdatedServices: SmmService[] = [];

      for (const provider of providers) {
        const catalogRes = await ProviderClient.getServices(provider);
        if (catalogRes.success && catalogRes.services) {
          const rawItems = catalogRes.services;
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

            allUpdatedServices.push({
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
            totalSynced++;
          }
        }
      }

      if (allUpdatedServices.length > 0) {
        db.saveServices(allUpdatedServices);
        db.addLog('info', 'Services', `Synced ${totalSynced} live services from active providers`);
        return res.json({ success: true, count: totalSynced, message: `Successfully synced ${totalSynced} services 1:1 from real providers` });
      } else {
        return res.status(400).json({ success: false, error: 'Failed to fetch services from active providers. Check API key and URL.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get('/api/services', (req, res) => {
    const userId = getRequestUserId(req);
    const { platform, category } = req.query;
    let services = db.getServices(userId).filter(s => s.status === 'active');

    if (platform) {
      services = services.filter(s => s.platform.toLowerCase() === (platform as string).toLowerCase());
    }

    if (category) {
      services = services.filter(s => s.category.toLowerCase() === (category as string).toLowerCase());
    }

    res.json(services);
  });

  app.put('/api/services/:id', (req, res) => {
    try {
      const service = db.updateService(parseInt(req.params.id, 10), req.body);
      res.json({ success: true, service });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // SINGLE & DRIP FEED ORDER PLACEMENT
  // ==========================================
  app.post('/api/orders/single', async (req, res) => {
    try {
      const { serviceId, link, quantity, runs, interval, comments } = req.body;

      if (!serviceId || !link || !quantity) {
        return res.status(400).json({ success: false, error: 'Service, Link, and Quantity are required' });
      }

      const service = db.getServiceById(parseInt(serviceId, 10));
      if (!service) {
        return res.status(404).json({ success: false, error: `Service #${serviceId} not found` });
      }

      const qtyNum = parseInt(quantity, 10);
      if (isNaN(qtyNum) || qtyNum < service.min || qtyNum > service.max) {
        return res.status(400).json({ 
          success: false, 
          error: `Quantity must be between ${service.min} and ${service.max} for this service.` 
        });
      }

      const provider = db.getProviderById(service.providerId);
      if (!provider) {
        return res.status(400).json({ success: false, error: 'Assigned SMM Provider is not configured or missing' });
      }

      const runsNum = runs ? parseInt(runs, 10) : undefined;
      const intervalNum = interval ? parseInt(interval, 10) : undefined;
      const isDripFeed = !!(runsNum && runsNum > 1);

      // Authoritative Price Calculation for Total Quantity (runs * quantity)
      const totalUnits = isDripFeed ? qtyNum * runsNum! : qtyNum;
      const price = parseFloat(((totalUnits / 1000) * service.rate).toFixed(6));
      const orderType: OrderType = isDripFeed ? 'drip_feed' : 'single';

      // ==========================================
      // DRIP-FEED WORKFLOW (NATIVE + SMART SCHEDULER FALLBACK)
      // ==========================================
      if (isDripFeed) {
        console.log(`[Drip-Feed Order] Submitting drip-feed order: ${runsNum} runs of ${qtyNum} units every ${intervalNum} mins to Provider ${provider.name}...`);
        
        // 1. Attempt native provider drip-feed first
        let providerResult = await ProviderClient.addOrder(provider, {
          service: service.providerServiceId,
          link,
          quantity: qtyNum,
          runs: runsNum,
          interval: intervalNum,
          comments
        });

        if (providerResult.success && providerResult.orderId) {
          // Native drip feed accepted by provider!
          const totalCost = (totalUnits / 1000) * (service.providerRate || service.rate);
          db.deductProviderBalance(provider.id, totalCost);
          ProviderClient.getBalance(provider).then(bRes => {
            if (bRes.success && bRes.balance !== undefined) {
              const proc = processProviderBalance(bRes.balance, bRes.currency);
              db.updateProvider(provider.id, {
                balance: proc.balanceInr,
                balanceInr: proc.balanceInr,
                balanceUsd: proc.balanceUsd,
                lastBalanceCheck: new Date().toISOString()
              });
            }
          }).catch(() => {});

          const parentOrder = db.createOrder({
            providerOrderId: providerResult.orderId,
            userId: 'usr_admin_1',
            orderType: 'drip_feed',
            platform: service.platform,
            category: service.category,
            serviceId: service.id,
            serviceName: service.name,
            providerId: provider.id,
            providerName: provider.name,
            link,
            quantity: totalUnits,
            price,
            status: 'Processing',
            providerStatus: 'Pending',
            runs: runsNum,
            interval: intervalNum,
            totalBundles: runsNum,
            completedBundles: 1,
            durationHours: parseFloat(((runsNum! * (intervalNum || 30)) / 60).toFixed(1))
          });

          // Generate schedule records for user visibility of bundle timings
          const schedules: any[] = [];
          const nowMs = Date.now();
          for (let i = 0; i < runsNum!; i++) {
            const runTime = new Date(nowMs + i * (intervalNum || 30) * 60000).toISOString();
            schedules.push({
              id: `sch_drip_${parentOrder.id}_${i + 1}_${Date.now().toString(36)}`,
              parentOrderId: parentOrder.id,
              serviceId: service.id,
              serviceName: service.name,
              providerId: provider.id,
              providerName: provider.name,
              link,
              quantity: qtyNum,
              scheduledAt: runTime,
              status: i === 0 ? 'submitted' : 'pending',
              providerOrderId: i === 0 ? providerResult.orderId : null,
              runNumber: i + 1,
              totalRuns: runsNum,
              metric: service.category || 'Engagement',
              createdAt: new Date().toISOString()
            });
          }
          db.addSchedules(schedules);

          return res.json({
            success: true,
            order: parentOrder,
            providerOrderId: providerResult.orderId,
            message: `Drip-feed Order #${parentOrder.id} active with Provider #${providerResult.orderId}! Delivered over ${runsNum} runs.`
          });
        }

        // 2. Provider rejected native drip-feed: Activate ZYNYX Intelligent Scheduler Drip-Feed Fallback!
        console.log(`[Drip-Feed Smart Fallback] Provider does not support native drip-feed (${providerResult.error}). Dispatching via ZYNYX Intelligent Scheduler...`);

        const initialRunResult = await ProviderClient.addOrder(provider, {
          service: service.providerServiceId,
          link,
          quantity: qtyNum,
          comments
        });

        if (!initialRunResult.success || !initialRunResult.orderId) {
          return res.status(400).json({
            success: false,
            error: `Provider rejected order: ${initialRunResult.error || providerResult.error}`
          });
        }

        const parentOrder = db.createOrder({
          providerOrderId: initialRunResult.orderId,
          userId: 'usr_admin_1',
          orderType: 'drip_feed',
          platform: service.platform,
          category: service.category,
          serviceId: service.id,
          serviceName: service.name,
          providerId: provider.id,
          providerName: provider.name,
          link,
          quantity: totalUnits,
          price,
          status: 'Processing',
          providerStatus: 'Pending',
          runs: runsNum,
          interval: intervalNum,
          totalBundles: runsNum,
          completedBundles: 1,
          durationHours: parseFloat(((runsNum! * (intervalNum || 30)) / 60).toFixed(1))
        });

        // Record child order for Run #1
        const initialCost = (qtyNum / 1000) * (service.providerRate || service.rate);
        db.deductProviderBalance(provider.id, initialCost);
        ProviderClient.getBalance(provider).then(bRes => {
          if (bRes.success && bRes.balance !== undefined) {
            const proc = processProviderBalance(bRes.balance, bRes.currency);
            db.updateProvider(provider.id, {
              balance: proc.balanceInr,
              balanceInr: proc.balanceInr,
              balanceUsd: proc.balanceUsd,
              lastBalanceCheck: new Date().toISOString()
            });
          }
        }).catch(() => {});

        db.createOrder({
          providerOrderId: initialRunResult.orderId,
          parentOrderId: parentOrder.id,
          userId: 'usr_admin_1',
          orderType: 'all_in_one_child',
          platform: service.platform,
          category: service.category,
          serviceId: service.id,
          serviceName: `${service.name} (Run 1/${runsNum})`,
          providerId: provider.id,
          providerName: provider.name,
          link,
          quantity: qtyNum,
          price: parseFloat(((qtyNum / 1000) * service.rate).toFixed(6)),
          status: 'Processing',
          providerStatus: 'Pending'
        });

        // Schedule remaining runs
        const schedules: any[] = [];
        const nowMs = Date.now();
        schedules.push({
          id: `sch_drip_${parentOrder.id}_1_${Date.now().toString(36)}`,
          parentOrderId: parentOrder.id,
          serviceId: service.id,
          serviceName: service.name,
          providerId: provider.id,
          providerName: provider.name,
          link,
          quantity: qtyNum,
          scheduledAt: new Date(nowMs).toISOString(),
          status: 'submitted',
          providerOrderId: initialRunResult.orderId,
          runNumber: 1,
          totalRuns: runsNum,
          metric: service.category || 'Engagement',
          createdAt: new Date().toISOString()
        });

        for (let i = 1; i < runsNum!; i++) {
          const runTime = new Date(nowMs + i * (intervalNum || 30) * 60000).toISOString();
          schedules.push({
            id: `sch_drip_${parentOrder.id}_${i + 1}_${Date.now().toString(36)}`,
            parentOrderId: parentOrder.id,
            serviceId: service.id,
            serviceName: service.name,
            providerId: provider.id,
            providerName: provider.name,
            link,
            quantity: qtyNum,
            scheduledAt: runTime,
            status: 'pending',
            providerOrderId: null,
            runNumber: i + 1,
            totalRuns: runsNum,
            metric: service.category || 'Engagement',
            createdAt: new Date().toISOString()
          });
        }

        db.addSchedules(schedules);

        return res.json({
          success: true,
          order: parentOrder,
          providerOrderId: initialRunResult.orderId,
          message: `Drip-feed Order #${parentOrder.id} active! Initial run dispatched to provider (Order #${initialRunResult.orderId}). Remaining ${runsNum! - 1} runs scheduled every ${intervalNum}m.`
        });
      }

      // ==========================================
      // STANDARD SINGLE ORDER WORKFLOW
      // ==========================================
      console.log(`[Single Order] Submitting real order to provider ${provider.name} for Service #${service.providerServiceId}, Qty ${qtyNum}...`);

      const providerResult = await ProviderClient.addOrder(provider, {
        service: service.providerServiceId,
        link,
        quantity: qtyNum,
        comments
      });

      if (providerResult.success && providerResult.orderId) {
        // Deduct provider balance and refresh asynchronously
        const singleCost = (qtyNum / 1000) * (service.providerRate || service.rate);
        db.deductProviderBalance(provider.id, singleCost);
        ProviderClient.getBalance(provider).then(bRes => {
          if (bRes.success && bRes.balance !== undefined) {
            const proc = processProviderBalance(bRes.balance, bRes.currency);
            db.updateProvider(provider.id, {
              balance: proc.balanceInr,
              balanceInr: proc.balanceInr,
              balanceUsd: proc.balanceUsd,
              lastBalanceCheck: new Date().toISOString()
            });
          }
        }).catch(() => {});

        const newOrder = db.createOrder({
          providerOrderId: providerResult.orderId,
          userId: 'usr_admin_1',
          orderType: 'single',
          platform: service.platform,
          category: service.category,
          serviceId: service.id,
          serviceName: service.name,
          providerId: provider.id,
          providerName: provider.name,
          link,
          quantity: qtyNum,
          price,
          status: 'Processing',
          providerStatus: 'Pending',
          totalBundles: 1,
          completedBundles: 1
        });

        return res.json({
          success: true,
          order: newOrder,
          providerOrderId: providerResult.orderId,
          message: `Order #${newOrder.id} placed successfully with Provider Order ID #${providerResult.orderId}`
        });

      } else {
        const errorMsg = providerResult.error || 'Provider API rejected order';

        const failedOrder = db.createOrder({
          providerOrderId: null,
          userId: 'usr_admin_1',
          orderType: 'single',
          platform: service.platform,
          category: service.category,
          serviceId: service.id,
          serviceName: service.name,
          providerId: provider.id,
          providerName: provider.name,
          link,
          quantity: qtyNum,
          price,
          status: 'Failed',
          errorMessage: errorMsg,
          totalBundles: 1,
          completedBundles: 0
        });

        return res.status(400).json({
          success: false,
          error: `Provider API Error: ${errorMsg}`,
          localOrderId: failedOrder.id
        });
      }

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Server error placing order' });
    }
  });

  // ==========================================
  // ALL-IN-ONE ENGAGEMENT ORDER PREVIEW & SUBMIT
  // ==========================================
  function findCompatibleService(
    platform: string,
    metricKey: string,
    totalQuantity: number,
    platformServices: any[],
    preferredProviderId?: string
  ): any | null {
    const m = metricKey.toLowerCase();
    let keywords: string[] = [m];
    if (m === 'views') keywords = ['view', 'reel view', 'video view', 'views'];
    if (m === 'likes') keywords = ['like', 'likes'];
    if (m === 'comments') keywords = ['comment', 'comments'];
    if (m === 'shares') keywords = ['share', 'shares', 'reaction'];
    if (m === 'saves') keywords = ['save', 'saves', 'bookmark'];

    const excludeWords = [
      'combo', 'follower', 'followers', '+ 1000', '+ 2000', 'package',
      'linkedin', 'snapchat', 'twitter', 'maroof', 'kwai', 'trovo', 'twitch', 'rumble', 'tiktok', 'youtube', 'facebook'
    ];
    if (m === 'likes') {
      excludeWords.push('comment');
    }

    let matched = platformServices.filter(s => {
      const text = (s.name + ' ' + s.category).toLowerCase();
      const hasKeyword = keywords.some(k => text.includes(k));
      if (!hasKeyword) return false;
      const hasExclude = excludeWords.some(e => text.includes(e));
      if (hasExclude) return false;
      return s.min <= totalQuantity && (s.max || 10000000) >= totalQuantity && s.status !== 'inactive';
    });

    if (matched.length === 0) {
      matched = platformServices.filter(s => {
        const text = (s.name + ' ' + s.category).toLowerCase();
        return keywords.some(k => text.includes(k)) && !text.includes('combo') && !text.includes('follower') && s.min <= totalQuantity && (s.max || 10000000) >= totalQuantity;
      });
    }

    const pName = platform.toLowerCase();
    const specific = matched.filter(s => {
      const text = (s.name + ' ' + s.category).toLowerCase();
      return text.includes(pName) || (pName === 'instagram' && (text.includes('ig') || text.includes('reel')));
    });
    if (specific.length > 0) {
      matched = specific;
    }

    // Prioritize services from the user's preferred provider if requested
    if (preferredProviderId) {
      const fromPreferred = matched.filter(s => s.providerId === preferredProviderId);
      if (fromPreferred.length > 0) {
        matched = fromPreferred;
      }
    }

    if (matched.length === 0) return null;

    const minThreshold = m === 'views' ? 100 : 10;
    return matched.sort((a, b) => {
      const aValid = a.min <= minThreshold ? 0 : 1;
      const bValid = b.min <= minThreshold ? 0 : 1;
      if (aValid !== bValid) return aValid - bValid;
      if (a.min !== b.min) return a.min - b.min;
      return (a.rate || 0) - (b.rate || 0);
    })[0] || null;
  }

  app.post('/api/orders/all-in-one/preview', (req, res) => {
    try {
      const {
        platform,
        targetUrl,
        durationHours = 24,
        metricsConfig,
        randomVariancePercent = 15,
        peakHoursWeight = false,
        patternType = 'viral_gaussian_peak',
        patternEnabled = true
      }: AllInOneOrderRequest & { patternType?: any; patternEnabled?: boolean } = req.body;

      if (!targetUrl || !metricsConfig || Object.keys(metricsConfig).length === 0) {
        return res.status(400).json({ success: false, error: 'Target URL and at least one metric configuration are required.' });
      }

      const generatedMetricPlans: { metricPlan: any; service: SmmService; provider: SmmProvider }[] = [];
      let grandTotalCost = 0;
      let totalBundlesCount = 0;
      const allBundlesTimeline: any[] = [];

      for (const [metricKey, config] of Object.entries(metricsConfig)) {
        if (!config || !config.serviceId || !config.totalQuantity) continue;

        let service = db.getServiceById(config.serviceId);
        if (!service) {
          return res.status(404).json({ success: false, error: `Service #${config.serviceId} for metric ${metricKey} not found.` });
        }

        // Auto-swap protection: If selected service has min > config.totalQuantity, find a compatible service on the same platform
        if (service.min > config.totalQuantity) {
          const platformServices = db.getServices().filter(s => s.platform.toLowerCase() === platform.toLowerCase());
          const compatibleSvc = findCompatibleService(platform, metricKey, config.totalQuantity, platformServices, config.providerId || service.providerId);

          if (compatibleSvc) {
            console.log(`[Auto-Swap Preview] ${metricKey}: Replaced service #${service.id} (min ${service.min}) with #${compatibleSvc.id} (min ${compatibleSvc.min}) for quantity ${config.totalQuantity}`);
            service = compatibleSvc;
          }
        }

        if (!service) {
          return res.status(404).json({ success: false, error: `Service for metric ${metricKey} not found.` });
        }

        const provider = db.getProviderById(service.providerId);
        if (!provider) {
          return res.status(400).json({ success: false, error: `Provider for service #${service.id} is missing.` });
        }

        // Generate Dynamic Bundles with Natural Non-Equal Partitioning & Pattern Curve
        const metricPlan = BundleGenerator.generateMetricBundles({
          metric: metricKey,
          service,
          provider,
          totalQuantity: config.totalQuantity,
          requestedRunCount: config.runCount || 20,
          durationHours,
          randomVariancePercent,
          peakHoursWeight,
          patternType,
          patternEnabled
        });

        // Validate Bundle Plan
        const validation = BundleGenerator.validateBundlePlan(
          metricPlan.bundles,
          config.totalQuantity,
          metricKey,
          service
        );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: `Bundle validation failed for ${metricKey}: ${validation.errors.join('; ')}`
          });
        }

        generatedMetricPlans.push({ metricPlan, service, provider });
        grandTotalCost += metricPlan.totalCost;
        totalBundlesCount += metricPlan.actualRunCount;
        allBundlesTimeline.push(...metricPlan.bundles);
      }

      // Sort full timeline chronologically
      allBundlesTimeline.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      // Multi-Provider Itemized Breakdown Calculation
      const providerMap = new Map<string, {
        providerId: string;
        providerName: string;
        metrics: string[];
        totalQuantity: number;
        cost: number;
        currentBalance: number | null;
        currency: string;
      }>();

      for (const item of generatedMetricPlans) {
        const prov = item.provider;
        const provKey = prov.id;
        if (!providerMap.has(provKey)) {
          providerMap.set(provKey, {
            providerId: prov.id,
            providerName: prov.name,
            metrics: [item.metricPlan.metric],
            totalQuantity: item.metricPlan.totalQuantity,
            cost: parseFloat(item.metricPlan.totalCost.toFixed(4)),
            currentBalance: prov.balance ?? null,
            currency: prov.balanceCurrency || 'INR'
          });
        } else {
          const entry = providerMap.get(provKey)!;
          entry.metrics.push(item.metricPlan.metric);
          entry.totalQuantity += item.metricPlan.totalQuantity;
          entry.cost = parseFloat((entry.cost + item.metricPlan.totalCost).toFixed(4));
        }
      }

      const providerBreakdown = Array.from(providerMap.values());
      const providerDisplayNames = providerBreakdown.map(p => p.providerName).join(' + ');

      res.json({
        success: true,
        summary: {
          platform,
          targetUrl,
          durationHours,
          totalBundles: totalBundlesCount,
          grandTotalCost: parseFloat(grandTotalCost.toFixed(4)),
          providerName: providerDisplayNames || 'Multiple Providers',
          providerBalance: providerBreakdown[0]?.currentBalance ?? null,
          providerBalanceStatus: 'available',
          providerBreakdown
        },
        metricPlans: generatedMetricPlans.map(g => g.metricPlan),
        timelinePreview: allBundlesTimeline
      });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/orders/all-in-one/submit', async (req, res) => {
    try {
      const {
        platform,
        targetUrl,
        durationHours = 24,
        metricsConfig,
        randomVariancePercent = 15,
        peakHoursWeight = false,
        patternType = 'viral_gaussian_peak',
        patternEnabled = true
      }: AllInOneOrderRequest & { patternType?: any; patternEnabled?: boolean } = req.body;

      if (!targetUrl || !metricsConfig) {
        return res.status(400).json({ success: false, error: 'Target URL and metrics configuration required' });
      }

      const generatedMetricPlans: { metricPlan: any; service: SmmService; provider: SmmProvider }[] = [];
      let grandTotalCost = 0;
      let totalBundlesCount = 0;
      const allScheduleItems: ScheduleItem[] = [];

      // 1. Generate & Validate all metric bundle plans
      for (const [metricKey, config] of Object.entries(metricsConfig)) {
        if (!config || !config.serviceId || !config.totalQuantity) continue;

        let service = db.getServiceById(config.serviceId);
        if (!service) return res.status(404).json({ success: false, error: `Service #${config.serviceId} not found` });

        // Auto-swap protection: If selected service has min > config.totalQuantity, find a compatible service on the same platform
        if (service.min > config.totalQuantity) {
          const platformServices = db.getServices().filter(s => s.platform.toLowerCase() === platform.toLowerCase());
          const compatibleSvc = findCompatibleService(platform, metricKey, config.totalQuantity, platformServices, config.providerId || service.providerId);

          if (compatibleSvc) {
            console.log(`[Auto-Swap Submit] ${metricKey}: Replaced service #${service.id} (min ${service.min}) with #${compatibleSvc.id} (min ${compatibleSvc.min}) for quantity ${config.totalQuantity}`);
            service = compatibleSvc;
          }
        }

        if (!service) return res.status(404).json({ success: false, error: `Service #${config.serviceId} not found` });

        const provider = db.getProviderById(service.providerId);
        if (!provider) return res.status(400).json({ success: false, error: `Provider for service #${service.id} not found` });

        const metricPlan = BundleGenerator.generateMetricBundles({
          metric: metricKey,
          service,
          provider,
          totalQuantity: config.totalQuantity,
          requestedRunCount: config.runCount || 20,
          durationHours,
          randomVariancePercent,
          peakHoursWeight,
          patternType,
          patternEnabled
        });

        const validation = BundleGenerator.validateBundlePlan(
          metricPlan.bundles,
          config.totalQuantity,
          metricKey,
          service
        );

        if (!validation.valid) {
          return res.status(400).json({ success: false, error: `Invalid plan for ${metricKey}: ${validation.errors.join(' ')}` });
        }

        generatedMetricPlans.push({ metricPlan, service, provider });
        grandTotalCost += metricPlan.totalCost;
        totalBundlesCount += metricPlan.actualRunCount;
      }

      const userId = (req.headers['x-user-id'] as string) || 'usr_mohit_owner';

      // Multi-Provider Itemized Breakdown Calculation
      const providerMap = new Map<string, {
        providerId: string;
        providerName: string;
        metrics: string[];
        totalQuantity: number;
        cost: number;
        currentBalance: number | null;
        currency: string;
      }>();

      for (const item of generatedMetricPlans) {
        const prov = item.provider;
        const provKey = prov.id;
        if (!providerMap.has(provKey)) {
          providerMap.set(provKey, {
            providerId: prov.id,
            providerName: prov.name,
            metrics: [item.metricPlan.metric],
            totalQuantity: item.metricPlan.totalQuantity,
            cost: parseFloat(item.metricPlan.totalCost.toFixed(4)),
            currentBalance: prov.balance ?? null,
            currency: prov.balanceCurrency || 'INR'
          });
        } else {
          const entry = providerMap.get(provKey)!;
          entry.metrics.push(item.metricPlan.metric);
          entry.totalQuantity += item.metricPlan.totalQuantity;
          entry.cost = parseFloat((entry.cost + item.metricPlan.totalCost).toFixed(4));
        }
      }

      const providerBreakdown = Array.from(providerMap.values());
      const uniqueProviderNames = providerBreakdown.map(p => p.providerName).join(' + ');

      // 2. Create Parent All-in-One Order Record
      const parentOrder = db.createOrder({
        providerOrderId: null,
        userId,
        orderType: 'all_in_one_parent',
        platform,
        category: 'All-in-One Engagement Campaign',
        serviceId: generatedMetricPlans[0].service.id,
        serviceName: `${platform} Multi-Metric Campaign (${totalBundlesCount} Bundles over ${durationHours}h)`,
        providerId: generatedMetricPlans[0].provider.id,
        providerName: uniqueProviderNames || generatedMetricPlans[0].provider.name,
        link: targetUrl,
        quantity: generatedMetricPlans.reduce((sum, mp) => sum + mp.metricPlan.totalQuantity, 0),
        price: parseFloat(grandTotalCost.toFixed(4)),
        status: 'Processing',
        totalBundles: totalBundlesCount,
        completedBundles: 0,
        durationHours
      });

      // 3. Build Schedule Queue Items
      for (const { metricPlan, service, provider } of generatedMetricPlans) {
        for (const bundle of metricPlan.bundles) {
          allScheduleItems.push({
            id: 'sch_' + parentOrder.id + '_' + bundle.metric + '_' + bundle.runNumber + '_' + Date.now().toString(36),
            parentOrderId: parentOrder.id,
            serviceId: service.id,
            serviceName: service.name,
            providerId: provider.id,
            providerName: provider.name,
            link: targetUrl,
            quantity: bundle.quantity,
            scheduledAt: bundle.scheduledAt,
            status: 'pending',
            providerOrderId: null,
            runNumber: bundle.runNumber,
            totalRuns: metricPlan.actualRunCount,
            metric: bundle.metric,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Save schedules to persistent database
      db.addSchedules(allScheduleItems);

      // 4. Initial Delivery Execution (Execute immediate bundle items where scheduledAt <= now + 5 seconds)
      const immediateDueSchedules = db.getDueSchedules().filter(s => s.parentOrderId === parentOrder.id);

      let immediateExecutionsSuccess = 0;
      for (const item of immediateDueSchedules) {
        if (db.claimDueScheduleItem(item.id)) {
          const service = db.getServiceById(item.serviceId)!;
          const provider = db.getProviderById(item.providerId)!;

          const pRes = await ProviderClient.addOrder(provider, {
            service: service.providerServiceId,
            link: item.link,
            quantity: item.quantity
          });

          if (pRes.success && pRes.orderId) {
            db.updateScheduleItem(item.id, {
              status: 'submitted',
              providerOrderId: pRes.orderId
            });

            // Deduct exact execution charge from this specific provider's balance
            const bundleCost = (item.quantity / 1000) * (service.providerRate || service.rate);
            db.deductProviderBalance(provider.id, bundleCost);

            // Asynchronously sync latest real balance from provider API
            ProviderClient.getBalance(provider).then(bRes => {
              if (bRes.success && bRes.balance !== undefined) {
                const proc = processProviderBalance(bRes.balance, bRes.currency);
                db.updateProvider(provider.id, {
                  balance: proc.balanceInr,
                  balanceInr: proc.balanceInr,
                  balanceUsd: proc.balanceUsd,
                  lastBalanceCheck: new Date().toISOString()
                });
              }
            }).catch(() => {});

            db.createOrder({
              providerOrderId: pRes.orderId,
              parentOrderId: parentOrder.id,
              userId,
              orderType: 'all_in_one_child',
              platform: service.platform,
              category: service.category,
              serviceId: service.id,
              serviceName: service.name,
              providerId: provider.id,
              providerName: provider.name,
              link: item.link,
              quantity: item.quantity,
              price: parseFloat(((item.quantity / 1000) * service.rate).toFixed(4)),
              status: 'Processing'
            });

            immediateExecutionsSuccess++;
          } else {
            db.updateScheduleItem(item.id, {
              status: 'failed',
              errorMessage: pRes.error || 'Provider rejected initial delivery'
            });
          }
        }
      }

      // Update parent order completed bundles count from initial delivery
      db.updateOrder(parentOrder.id, { completedBundles: immediateExecutionsSuccess });

      res.json({
        success: true,
        parentOrder,
        totalBundles: totalBundlesCount,
        grandTotalCost: parseFloat(grandTotalCost.toFixed(4)),
        durationHours,
        immediateExecutions: immediateExecutionsSuccess,
        providerBreakdown,
        message: `All-in-One Campaign #${parentOrder.id} created! Total: ₹${grandTotalCost >= 1 ? grandTotalCost.toFixed(2) : (grandTotalCost >= 0.01 ? grandTotalCost.toFixed(3) : grandTotalCost.toFixed(4))} INR (${totalBundlesCount} scheduled runs over ${durationHours}h across ${providerBreakdown.length} panel(s)). ${immediateExecutionsSuccess} initial run(s) dispatched immediately.`
      });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // ORDERS HISTORY API (WITH BUNDLE PROGRESS & CONTROLS)
  // ==========================================
  app.get('/api/orders', (req, res) => {
    try {
      const orders = db.getOrders();
      const allSchedules = db.getSchedules();

      const enriched = orders.map(o => {
        const relatedSchedules = allSchedules.filter(s => s.parentOrderId === o.id);
        
        let total = o.totalBundles;
        if (!total || total < 1) {
          total = relatedSchedules.length > 0 ? relatedSchedules.length : 1;
        }

        const completed = relatedSchedules.length > 0
          ? relatedSchedules.filter(s => s.status === 'submitted').length
          : (o.completedBundles !== undefined ? o.completedBundles : (o.status === 'Completed' ? 1 : 0));

        const remaining = relatedSchedules.length > 0
          ? relatedSchedules.filter(s => s.status === 'pending' || s.status === 'processing').length
          : (o.status === 'Processing' || o.status === 'Pending' ? Math.max(0, total - completed) : 0);

        const canceled = relatedSchedules.filter(s => s.status === 'canceled').length;
        const failed = relatedSchedules.filter(s => s.status === 'failed').length;

        const pendingSchedules = relatedSchedules
          .filter(s => s.status === 'pending')
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        const nextRunAt = pendingSchedules.length > 0 ? pendingSchedules[0].scheduledAt : null;

        return {
          ...o,
          totalBundles: total,
          completedBundles: completed,
          remainingBundles: remaining,
          canceledBundles: canceled,
          failedBundles: failed,
          nextRunAt,
          schedules: relatedSchedules.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/orders/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const order = db.getOrderById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const schedules = db.getSchedules().filter(s => s.parentOrderId === id)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const childOrders = db.getOrders().filter(o => o.parentOrderId === id);

    res.json({
      order,
      schedules,
      childOrders
    });
  });

  // Cancel Order & Halt Scheduling Immediately
  app.post('/api/orders/:id/cancel', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const order = db.getOrderById(id);
      if (!order) {
        return res.status(404).json({ success: false, error: `Order #${id} not found` });
      }

      // If active on provider, attempt real provider cancellation
      if (order.providerOrderId) {
        try {
          const provider = db.getProviderById(order.providerId);
          if (provider) {
            await ProviderClient.cancelOrder(provider, order.providerOrderId);
          }
        } catch (pErr: any) {
          console.log(`[Provider Cancel] Note: Provider API cancel returned: ${pErr.message}`);
        }
      }

      const canceledOrder = db.cancelOrder(id);

      res.json({
        success: true,
        order: canceledOrder,
        message: `Order #${id} canceled successfully! All upcoming scheduled runs have been halted.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete Order & Permanently Purge From History
  app.delete('/api/orders/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const order = db.getOrderById(id);
      if (!order) {
        return res.status(404).json({ success: false, error: `Order #${id} not found` });
      }

      // Cancel provider order if active
      if (order.providerOrderId) {
        try {
          const provider = db.getProviderById(order.providerId);
          if (provider) {
            await ProviderClient.cancelOrder(provider, order.providerOrderId);
          }
        } catch (pErr: any) {
          // ignore
        }
      }

      const deleted = db.deleteOrder(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: `Order #${id} could not be deleted` });
      }

      res.json({
        success: true,
        message: `Order #${id} and all related scheduling records have been deleted permanently.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // RESELLER API V2 STANDARD PROTOCOL (/api/v2)
  // ==========================================
  app.post('/api/v2', async (req, res) => {
    const { key, action, service, link, quantity, runs, interval, order, orders } = req.body;

    const user = db.getUserByApiKey(key);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    if (action === 'services') {
      const services = db.getServices().filter(s => s.status === 'active').map(s => ({
        service: s.id,
        name: s.name,
        type: s.type === 'custom_comments' ? 'Custom Comments' : 'Default',
        category: s.category,
        rate: s.rate.toFixed(4),
        min: s.min,
        max: s.max,
        refill: s.refill
      }));
      return res.json(services);
    }

    if (action === 'balance') {
      const activeProviders = db.getProviders().filter(p => p.status === 'active');
      const totalBalance = activeProviders.reduce((sum, p) => sum + (p.balance || 0), 0);
      return res.json({ balance: totalBalance.toFixed(2), currency: 'USD' });
    }

    if (action === 'add') {
      if (!service || !link || !quantity) {
        return res.json({ error: 'Incorrect request parameters' });
      }

      const smmService = db.getServiceById(parseInt(service, 10));
      if (!smmService) return res.json({ error: 'Service not found' });

      const provider = db.getProviderById(smmService.providerId);
      if (!provider) return res.json({ error: 'Assigned provider unavailable' });

      const pRes = await ProviderClient.addOrder(provider, {
        service: smmService.providerServiceId,
        link,
        quantity: parseInt(quantity, 10),
        runs: runs ? parseInt(runs, 10) : undefined,
        interval: interval ? parseInt(interval, 10) : undefined
      });

      if (pRes.success && pRes.orderId) {
        const newOrder = db.createOrder({
          providerOrderId: pRes.orderId,
          userId: user.id,
          orderType: runs ? 'drip_feed' : 'single',
          platform: smmService.platform,
          category: smmService.category,
          serviceId: smmService.id,
          serviceName: smmService.name,
          providerId: provider.id,
          providerName: provider.name,
          link,
          quantity: parseInt(quantity, 10),
          price: parseFloat(((parseInt(quantity, 10) / 1000) * smmService.rate).toFixed(4)),
          status: 'Processing'
        });

        return res.json({ order: newOrder.id });
      } else {
        return res.json({ error: pRes.error || 'Provider rejected order' });
      }
    }

    if (action === 'status') {
      if (!order) return res.json({ error: 'Order ID required' });

      const dbOrder = db.getOrderById(parseInt(order, 10));
      if (!dbOrder) return res.json({ error: 'Order not found' });

      return res.json({
        charge: dbOrder.price.toFixed(4),
        start_count: "0",
        status: dbOrder.status.toLowerCase(),
        remains: "0",
        currency: "USD"
      });
    }

    res.status(400).json({ error: 'Unsupported API action' });
  });

  // ==========================================
  // ADMIN DASHBOARD & HUB API
  // ==========================================
  app.get('/api/admin/dashboard', (req, res) => {
    res.json(db.getAdminStats());
  });

  app.get('/api/admin/schedules', (req, res) => {
    res.json(db.getSchedules());
  });

  app.get('/api/admin/logs', (req, res) => {
    res.json(db.getLogs());
  });

  app.get('/api/admin/settings', (req, res) => {
    res.json(db.getSettings());
  });

  app.post('/api/admin/settings', (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  });

  app.post('/api/admin/orders/:id/retry', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const order = db.getOrderById(orderId);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      const service = db.getServiceById(order.serviceId);
      const provider = service ? db.getProviderById(service.providerId) : undefined;

      if (!service || !provider) {
        return res.status(400).json({ success: false, error: 'Service or provider configuration missing for retry' });
      }

      const pRes = await ProviderClient.addOrder(provider, {
        service: service.providerServiceId,
        link: order.link,
        quantity: order.quantity
      });

      if (pRes.success && pRes.orderId) {
        db.updateOrder(order.id, {
          providerOrderId: pRes.orderId,
          status: 'Processing',
          errorMessage: undefined
        });
        return res.json({ success: true, providerOrderId: pRes.orderId, message: `Retry successful! Provider Order ID #${pRes.orderId}` });
      } else {
        db.updateOrder(order.id, {
          errorMessage: pRes.error || 'Retry failed'
        });
        return res.status(400).json({ success: false, error: pRes.error || 'Retry rejected by provider' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MR.360 SMM Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
