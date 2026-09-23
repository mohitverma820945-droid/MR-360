import { db } from './db';
import { ProviderClient, processProviderBalance } from './providerClient';
import { OrderStatus } from '../src/types';

export class SchedulerWorker {
  private static isRunning = false;
  private static schedulerInterval: NodeJS.Timeout | null = null;
  private static statusSyncInterval: NodeJS.Timeout | null = null;
  private static balanceRefreshInterval: NodeJS.Timeout | null = null;

  /**
   * Start Background Scheduler & Background Services
   */
  static start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Scheduler] Starting ZYNYX Background Scheduler Worker...');
    db.addLog('info', 'Scheduler', 'Background Scheduler Worker started');

    // 1. Process Due Scheduled Orders every 10 seconds
    const cronSecs = db.getSettings().cronExecutionIntervalSeconds || 10;
    this.schedulerInterval = setInterval(() => {
      this.processDueSchedules().catch(err => {
        console.error('[Scheduler] Error processing due schedules:', err);
      });
    }, cronSecs * 1000);

    // Initial immediate check
    setTimeout(() => this.processDueSchedules(), 1000);

    // 2. Sync Provider Order Statuses every 2 minutes
    this.statusSyncInterval = setInterval(() => {
      this.syncActiveOrderStatus().catch(err => {
        console.error('[Scheduler] Error syncing order status:', err);
      });
    }, 2 * 60 * 1000);

    // 3. Auto-Refresh Provider Balances every 30 minutes
    const balanceMins = db.getSettings().providerBalanceAutoRefreshMinutes || 30;
    this.balanceRefreshInterval = setInterval(() => {
      this.refreshAllProviderBalances().catch(err => {
        console.error('[Scheduler] Error refreshing provider balances:', err);
      });
    }, balanceMins * 60 * 1000);

    // Initial provider balance fetch on server startup
    setTimeout(() => this.refreshAllProviderBalances(), 3000);
  }

  /**
   * Process Due Schedule Items Atomically
   */
  private static async processDueSchedules(): Promise<void> {
    const dueItems = db.getDueSchedules();
    if (dueItems.length === 0) return;

    for (const item of dueItems) {
      // Atomic Job Claim for Idempotency
      const claimed = db.claimDueScheduleItem(item.id);
      if (!claimed) continue; // Already claimed by another worker pass

      try {
        const service = db.getServiceById(item.serviceId);
        if (!service) {
          db.updateScheduleItem(item.id, {
            status: 'failed',
            errorMessage: `Service #${item.serviceId} not found in database`
          });
          continue;
        }

        const provider = db.getProviderById(item.providerId || service.providerId);
        if (!provider) {
          db.updateScheduleItem(item.id, {
            status: 'failed',
            errorMessage: `Provider for service #${service.id} not found`
          });
          continue;
        }

        console.log(`[Scheduler] Submitting real provider order for Schedule #${item.id} (Run ${item.runNumber}/${item.totalRuns}, Qty ${item.quantity})...`);

        // Execute Real Provider API Order
        const result = await ProviderClient.addOrder(provider, {
          service: service.providerServiceId,
          link: item.link,
          quantity: item.quantity
        });

        if (result.success && result.orderId) {
          db.updateScheduleItem(item.id, {
            status: 'submitted',
            providerOrderId: result.orderId,
            errorMessage: undefined
          });

          // Deduct exact execution charge from the specific provider's balance
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

          // Create or update real child order record in Database
          db.createOrder({
            providerOrderId: result.orderId,
            parentOrderId: item.parentOrderId,
            userId: 'usr_admin_1', // default or parent owner
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
            status: 'Processing',
            providerStatus: 'Pending'
          });

          // Update parent order progress
          const parentOrder = db.getOrderById(item.parentOrderId);
          if (parentOrder) {
            const completedBundles = (parentOrder.completedBundles || 0) + 1;
            const isFullyDone = completedBundles >= (parentOrder.totalBundles || 1);

            db.updateOrder(parentOrder.id, {
              completedBundles,
              status: isFullyDone ? 'Completed' : 'Processing'
            });
          }

          db.addLog(
            'info',
            'Scheduler',
            `Successfully submitted Provider Order #${result.orderId} for Schedule #${item.id} (Qty: ${item.quantity})`
          );

        } else {
          // Provider API error
          const errMsg = result.error || 'Provider returned unsuccessful response';
          db.updateScheduleItem(item.id, {
            status: 'failed',
            errorMessage: errMsg
          });

          db.addLog(
            'error',
            'Scheduler',
            `Failed to submit Schedule #${item.id} to Provider ${provider.name}: ${errMsg}`
          );
        }

      } catch (err: any) {
        db.updateScheduleItem(item.id, {
          status: 'failed',
          errorMessage: err.message || 'Exception during provider order execution'
        });

        db.addLog(
          'error',
          'Scheduler',
          `Exception processing schedule #${item.id}: ${err.message}`
        );
      }
    }
  }

  /**
   * Synchronize Active Orders Status from Real Provider API
   */
  static async syncActiveOrderStatus(): Promise<void> {
    const activeOrders = db.getOrders().filter(
      o => o.providerOrderId && (o.status === 'Processing' || o.status === 'Pending')
    );

    if (activeOrders.length === 0) return;

    for (const order of activeOrders.slice(0, 15)) { // batch limit
      if (!order.providerOrderId) continue;

      const provider = db.getProviderById(order.providerId);
      if (!provider) continue;

      try {
        const res = await ProviderClient.getOrderStatus(provider, order.providerOrderId);
        if (res.success && res.status) {
          const rawStatus = res.status.toLowerCase();

          let normalizedStatus: OrderStatus = order.status;

          if (rawStatus.includes('completed') || rawStatus.includes('finish')) {
            normalizedStatus = 'Completed';
          } else if (rawStatus.includes('processing') || rawStatus.includes('in progress') || rawStatus.includes('pending')) {
            normalizedStatus = 'Processing';
          } else if (rawStatus.includes('partial')) {
            normalizedStatus = 'Partial';
          } else if (rawStatus.includes('cancel')) {
            normalizedStatus = 'Canceled';
          } else if (rawStatus.includes('fail')) {
            normalizedStatus = 'Failed';
          }

          if (normalizedStatus !== order.status || rawStatus !== order.providerStatus) {
            db.updateOrder(order.id, {
              status: normalizedStatus,
              providerStatus: res.status
            });
          }
        }
      } catch (err) {
        console.error(`[Scheduler] Status check error for Order #${order.id}:`, err);
      }
    }
  }

  /**
   * Refresh Real Provider Balances
   */
  static async refreshAllProviderBalances(): Promise<void> {
    const providers = db.getProviders();

    for (const prov of providers) {
      if (prov.status === 'inactive') continue;

      const res = await ProviderClient.getBalance(prov);
      if (res.success && res.balance !== undefined) {
        const processed = processProviderBalance(res.balance, res.currency);
        db.updateProvider(prov.id, {
          balance: processed.balanceInr,
          balanceInr: processed.balanceInr,
          balanceUsd: processed.balanceUsd,
          balanceCurrency: res.currency || 'USD',
          lastBalanceCheck: new Date().toISOString(),
          errorMessage: undefined
        });
      } else {
        db.updateProvider(prov.id, {
          errorMessage: res.error || 'Failed to fetch provider balance',
          lastBalanceCheck: new Date().toISOString()
        });
      }
    }
  }
}
