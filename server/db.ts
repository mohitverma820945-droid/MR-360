import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  UserProfile, 
  SmmProvider, 
  SmmService, 
  Order, 
  ScheduleItem, 
  AdminDashboardStats, 
  AuditLog, 
  SystemSettings 
} from '../src/types';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_zynyx_salt_secure_99').digest('hex');
}

interface DatabaseSchema {
  isInitialized?: boolean;
  users: UserProfile[];
  providers: SmmProvider[];
  services: SmmService[];
  orders: Order[];
  schedules: ScheduleItem[];
  settings: SystemSettings;
  logs: AuditLog[];
  nextOrderId: number;
}

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
const SEED_FILE_PATH = path.join(process.cwd(), 'data_store.json');
const DB_FILE_PATH = isVercel
  ? path.join('/tmp', 'data_store.json')
  : SEED_FILE_PATH;

class DatabaseEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
    this.ensureDefaultData();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(raw);
      } else if (isVercel && fs.existsSync(SEED_FILE_PATH)) {
        const raw = fs.readFileSync(SEED_FILE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to read database file, initializing new database:', err);
    }

    return {
      users: [],
      providers: [],
      services: [],
      orders: [],
      schedules: [],
      settings: {
        markupPercentage: 0,
        providerBalanceAutoRefreshMinutes: 30,
        cronExecutionIntervalSeconds: 10
      },
      logs: [],
      nextOrderId: 10001
    };
  }

  private saveDatabase(): void {
    try {
      const tempPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, DB_FILE_PATH);
      }
    } catch (err) {
      console.warn('[DB] Failed to persist database to disk (ignoring in serverless):', err);
    }
  }

  private ensureDefaultData(): void {
    // 1. Ensure Mohit Verma Owner account exists with password Mohit123@
    const mohitEmail = 'mohitverma820925@gmail.com';
    const mohitAltEmail = 'mohitverma820945@gmail.com';
    const mohitMetadataEmail = 'mohitkumar820945@gmail.com';
    const mohitUserEmail = 'mohitverma912022@gmail.com';

    let mohitUser = this.data.users.find(u => 
      u.email.toLowerCase() === mohitEmail.toLowerCase() ||
      u.email.toLowerCase() === mohitAltEmail.toLowerCase() ||
      u.email.toLowerCase() === mohitMetadataEmail.toLowerCase() ||
      u.email.toLowerCase() === mohitUserEmail.toLowerCase()
    );

    if (!mohitUser) {
      mohitUser = {
        id: 'usr_mohit_owner',
        username: 'MohitVerma',
        name: 'Mohit Verma',
        email: mohitEmail,
        role: 'admin',
        balance: 100000.00,
        apiKey: 'smm_ak_mohit_owner_882199',
        passwordHash: hashPassword('Mohit123@'),
        createdAt: new Date().toISOString()
      };
      this.data.users.push(mohitUser);
    } else {
      mohitUser.email = mohitEmail;
      mohitUser.role = 'admin';
      mohitUser.passwordHash = hashPassword('Mohit123@');
      if (mohitUser.balance === undefined || mohitUser.balance < 1000) {
        mohitUser.balance = 100000.00;
      }
    }

    // Also ensure secondary login alias for Mohit123@
    const altMohit = this.data.users.find(u => u.email.toLowerCase() === mohitAltEmail.toLowerCase());
    if (!altMohit) {
      this.data.users.push({
        id: 'usr_mohit_alt',
        username: 'MohitVermaAlt',
        name: 'Mohit Verma',
        email: mohitAltEmail,
        role: 'admin',
        balance: 100000.00,
        apiKey: 'smm_ak_mohit_alt_771822',
        passwordHash: hashPassword('Mohit123@'),
        createdAt: new Date().toISOString()
      });
    }

    // Assign any existing unowned providers to Mohit's owner account
    for (const p of this.data.providers) {
      if (!p.userId) {
        p.userId = mohitUser.id;
      }
    }

    // Ensure all services strictly preserve 1:1 matching providerServiceId and exact rates
    for (const s of this.data.services) {
      if (s.providerServiceId && s.id !== s.providerServiceId) {
        s.id = s.providerServiceId;
      }
      if (s.providerRate !== undefined) {
        s.rate = s.providerRate;
      }
    }

    this.saveDatabase();
  }

  // Users
  getUsers(): UserProfile[] {
    return this.data.users.map(({ passwordHash, ...rest }) => rest as UserProfile);
  }

  getUserById(id: string): UserProfile | undefined {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return undefined;
    const { passwordHash, ...rest } = user;
    return rest as UserProfile;
  }

  getUserByEmail(email: string): UserProfile | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  getUserByApiKey(key: string): UserProfile | undefined {
    return this.data.users.find(u => u.apiKey === key);
  }

  registerUser(data: { email: string; password: string; username?: string; name?: string; role?: 'admin' | 'user' }): { success: boolean; user?: UserProfile; error?: string } {
    const email = data.email.trim().toLowerCase();
    if (!email || !data.password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (this.getUserByEmail(email)) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const username = data.username?.trim() || email.split('@')[0];
    const isOwner = email === 'mohitverma820925@gmail.com';
    const newUser: UserProfile = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      username,
      name: data.name || username,
      email,
      role: isOwner ? 'admin' : (data.role || 'user'),
      balance: isOwner ? 100000.00 : 500.00,
      apiKey: 'smm_ak_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      passwordHash: hashPassword(data.password),
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.saveDatabase();
    this.addLog('info', 'Auth', `New user registered: ${newUser.email} (${newUser.role})`);

    const { passwordHash, ...sanitized } = newUser;
    return { success: true, user: sanitized as UserProfile };
  }

  authenticateUser(email: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
    const user = this.getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const fullUser = this.data.users.find(u => u.id === user.id);
    if (!fullUser || !fullUser.passwordHash) {
      return { success: false, error: 'User account security error' };
    }

    const hashedInput = hashPassword(password);
    if (fullUser.passwordHash !== hashedInput) {
      return { success: false, error: 'Invalid email or password' };
    }

    this.addLog('info', 'Auth', `User logged in successfully: ${fullUser.email}`);
    const { passwordHash, ...sanitized } = fullUser;
    return { success: true, user: sanitized as UserProfile };
  }

  updateUserBalance(userId: string, amountChange: number): UserProfile | undefined {
    const index = this.data.users.findIndex(u => u.id === userId);
    if (index === -1) return undefined;
    const current = this.data.users[index].balance || 0;
    this.data.users[index].balance = Math.max(0, current + amountChange);
    this.saveDatabase();
    const { passwordHash, ...sanitized } = this.data.users[index];
    return sanitized as UserProfile;
  }

  // Providers - Return all connected providers for system and user APIs
  getProviders(userId?: string): SmmProvider[] {
    return this.data.providers;
  }

  getProviderById(id: string, userId?: string): SmmProvider | undefined {
    const p = this.data.providers.find(p => p.id === id);
    if (!p) return undefined;
    if (userId && p.userId && p.userId !== userId) {
      return undefined; // Security: do not leak another user's provider
    }
    return p;
  }

  addProvider(provider: Omit<SmmProvider, 'id' | 'createdAt'>, userId?: string): SmmProvider {
    const newProv: SmmProvider = {
      ...provider,
      userId: userId || provider.userId || 'usr_mohit_owner',
      id: 'prov_' + Date.now().toString(36),
      createdAt: new Date().toISOString()
    };
    this.data.providers.push(newProv);
    this.saveDatabase();
    this.addLog('info', 'Providers', `Added new SMM Provider: ${newProv.name} (User: ${newProv.userId})`, JSON.stringify({ apiUrl: newProv.apiUrl }));
    return newProv;
  }

  updateProvider(id: string, updates: Partial<SmmProvider>, userId?: string): SmmProvider {
    const index = this.data.providers.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Provider ${id} not found`);

    if (userId && this.data.providers[index].userId && this.data.providers[index].userId !== userId) {
      throw new Error(`Unauthorized to update provider ${id}`);
    }

    this.data.providers[index] = { ...this.data.providers[index], ...updates };
    this.saveDatabase();
    return this.data.providers[index];
  }

  deductProviderBalance(providerId: string, amount: number): SmmProvider | undefined {
    const index = this.data.providers.findIndex(p => p.id === providerId);
    if (index === -1) return undefined;
    const current = this.data.providers[index].balance ?? 0;
    const newBal = Math.max(0, current - amount);
    this.data.providers[index].balance = parseFloat(newBal.toFixed(4));
    if (this.data.providers[index].balanceInr !== undefined && this.data.providers[index].balanceInr !== null) {
      this.data.providers[index].balanceInr = parseFloat(newBal.toFixed(4));
    }
    this.saveDatabase();
    return this.data.providers[index];
  }

  deleteProvider(id: string, userId?: string): void {
    const prov = this.data.providers.find(p => p.id === id);
    if (!prov) return;
    if (userId && prov.userId && prov.userId !== userId) {
      throw new Error(`Unauthorized to delete provider ${id}`);
    }

    this.data.providers = this.data.providers.filter(p => p.id !== id);
    this.data.services = this.data.services.filter(s => s.providerId !== id);
    this.saveDatabase();
    this.addLog('info', 'Providers', `Deleted provider ${id} and associated services`);
  }

  deleteAllProviders(userId?: string): void {
    if (userId) {
      const userProvIds = this.data.providers.filter(p => p.userId === userId).map(p => p.id);
      this.data.providers = this.data.providers.filter(p => p.userId !== userId);
      this.data.services = this.data.services.filter(s => !userProvIds.includes(s.providerId));
    } else {
      this.data.providers = [];
      this.data.services = [];
    }
    this.saveDatabase();
    this.addLog('info', 'Providers', 'Deleted providers and associated services');
  }

  // Services - Scoped to Active Connected Providers
  getServices(userId?: string): SmmService[] {
    const activeProvIds = new Set(
      this.data.providers
        .filter(p => p.status !== 'inactive')
        .map(p => p.id)
    );

    return this.data.services.filter(s => {
      if (s.status === 'inactive') return false;
      // If the service has a providerId, it must belong to an active provider
      if (s.providerId && !activeProvIds.has(s.providerId)) {
        return false;
      }
      return true;
    });
  }

  getServiceById(id: number): SmmService | undefined {
    return this.data.services.find(s => s.id === id || s.providerServiceId === id);
  }

  saveServices(services: SmmService[]): void {
    this.data.services = services;
    this.saveDatabase();
  }

  saveServicesForProvider(providerId: string, services: SmmService[]): void {
    // Replace only services belonging to this providerId
    const otherServices = this.data.services.filter(s => s.providerId !== providerId);
    this.data.services = [...otherServices, ...services];
    this.saveDatabase();
  }

  updateService(id: number, updates: Partial<SmmService>): SmmService {
    const index = this.data.services.findIndex(s => s.id === id || s.providerServiceId === id);
    if (index === -1) throw new Error(`Service ${id} not found`);

    this.data.services[index] = { ...this.data.services[index], ...updates };
    this.saveDatabase();
    return this.data.services[index];
  }

  addService(service: Omit<SmmService, 'id'>): SmmService {
    const nextId = Math.floor(1000 + Math.random() * 9000);
    const newSvc: SmmService = {
      ...service,
      id: nextId
    };
    this.data.services.push(newSvc);
    this.saveDatabase();
    return newSvc;
  }

  deleteService(id: number): void {
    this.data.services = this.data.services.filter(s => s.id !== id && s.providerServiceId !== id);
    this.saveDatabase();
  }

  // Orders
  getOrders(userId?: string): Order[] {
    const list = [...this.data.orders];
    if (userId) {
      return list.filter(o => o.userId === userId).reverse();
    }
    return list.reverse(); // latest first
  }

  getOrderById(id: number): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
    const orderId = this.data.nextOrderId++;
    const newOrder: Order = {
      ...orderData,
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.orders.unshift(newOrder);
    this.saveDatabase();
    this.addLog('info', 'Orders', `Created Order #${newOrder.id} (${newOrder.orderType})`, JSON.stringify({
      serviceId: newOrder.serviceId,
      quantity: newOrder.quantity,
      price: newOrder.price
    }));
    return newOrder;
  }

  updateOrder(id: number, updates: Partial<Order>): Order {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error(`Order ${id} not found`);

    const existing = this.data.orders[index];
    // Protect Canceled/Failed orders from being overwritten back to Processing or Pending by background workers
    if ((existing.status === 'Canceled' || existing.status === 'Failed') && updates.status && updates.status !== existing.status) {
      delete updates.status;
    }

    this.data.orders[index] = {
      ...this.data.orders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveDatabase();
    return this.data.orders[index];
  }

  cancelOrder(id: number): Order {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error(`Order #${id} not found`);

    const order = this.data.orders[index];
    order.status = 'Canceled';
    order.updatedAt = new Date().toISOString();

    // Cancel all pending/processing schedules for this order
    let canceledCount = 0;
    this.data.schedules.forEach(s => {
      if (s.parentOrderId === id && (s.status === 'pending' || s.status === 'processing')) {
        s.status = 'canceled';
        s.errorMessage = 'Canceled by user';
        canceledCount++;
      }
    });

    // Also cancel any active child orders
    this.data.orders.forEach(o => {
      if (o.parentOrderId === id && (o.status === 'Pending' || o.status === 'Processing')) {
        o.status = 'Canceled';
        o.updatedAt = new Date().toISOString();
      }
    });

    this.saveDatabase();
    this.addLog('info', 'Orders', `Canceled Order #${id} and halted ${canceledCount} scheduled bundle(s)`);
    return order;
  }

  deleteOrder(id: number): boolean {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index === -1) return false;

    // Remove all associated schedules
    this.data.schedules = this.data.schedules.filter(s => s.parentOrderId !== id);

    // Remove all associated child orders
    this.data.orders = this.data.orders.filter(o => o.parentOrderId !== id && o.id !== id);

    this.saveDatabase();
    this.addLog('info', 'Orders', `Deleted Order #${id} and all related bundle records`);
    return true;
  }

  // Schedules (Child Runs for All-in-One and Drip)
  getSchedules(parentOrderId?: number): ScheduleItem[] {
    if (parentOrderId) {
      return this.data.schedules.filter(s => s.parentOrderId === parentOrderId);
    }
    return this.data.schedules;
  }

  getDueSchedules(limit = 50): ScheduleItem[] {
    const now = new Date();
    return this.data.schedules
      .filter(s => {
        if (s.status !== 'pending') return false;
        if (new Date(s.scheduledAt) > now) return false;
        if (s.parentOrderId) {
          const parent = this.getOrderById(s.parentOrderId);
          if (!parent) {
            s.status = 'canceled';
            s.errorMessage = 'Parent order deleted';
            return false;
          }
          if (parent.status === 'Canceled' || parent.status === 'Failed') {
            s.status = 'canceled';
            s.errorMessage = 'Parent order canceled';
            return false;
          }
        }
        return true;
      })
      .slice(0, limit);
  }

  getPendingSchedules(limit = 50): ScheduleItem[] {
    return this.getDueSchedules(limit);
  }

  claimDueScheduleItem(id: string): boolean {
    const item = this.data.schedules.find(s => s.id === id);
    if (!item || item.status !== 'pending') return false;
    item.status = 'processing';
    this.saveDatabase();
    return true;
  }

  addSchedules(items: Omit<ScheduleItem, 'id' | 'createdAt'>[]): ScheduleItem[] {
    const created: ScheduleItem[] = items.map((item, idx) => ({
      ...item,
      id: `sch_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    }));

    this.data.schedules.push(...created);
    this.saveDatabase();
    return created;
  }

  updateSchedule(id: string, updates: Partial<ScheduleItem>): ScheduleItem {
    const index = this.data.schedules.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Schedule ${id} not found`);

    this.data.schedules[index] = {
      ...this.data.schedules[index],
      ...updates
    };
    this.saveDatabase();
    return this.data.schedules[index];
  }

  updateScheduleItem(id: string, updates: Partial<ScheduleItem>): ScheduleItem {
    return this.updateSchedule(id, updates);
  }

  // Settings
  getSettings(): SystemSettings {
    return this.data.settings;
  }

  updateSettings(settings: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveDatabase();
    this.addLog('info', 'Settings', 'Updated system settings');
    return this.data.settings;
  }

  // Logs
  getLogs(limit = 100): AuditLog[] {
    return this.data.logs.slice(-limit).reverse();
  }

  addLog(level: 'info' | 'warn' | 'error', source: string, message: string, details?: string): void {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      level,
      source,
      message,
      details
    };
    this.data.logs.push(log);
    // Keep max 2000 logs in memory
    if (this.data.logs.length > 2000) {
      this.data.logs.splice(0, this.data.logs.length - 2000);
    }
    this.saveDatabase();
  }

  // Stats
  getDashboardStats(): AdminDashboardStats {
    const orders = this.data.orders;
    const activeProviders = this.data.providers.filter(p => p.status === 'active');
    const totalDelivered = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const totalRev = orders.reduce((sum, o) => sum + (o.price || 0), 0);

    return {
      totalUsers: this.data.users.length,
      activeOrders: orders.filter(o => o.status === 'Processing' || o.status === 'Pending').length,
      totalOrders: orders.length,
      totalUnitsDelivered: totalDelivered,
      revenue: totalRev,
      activeProvidersCount: activeProviders.length,
      lastCronRun: new Date().toISOString()
    };
  }

  getAdminStats(): AdminDashboardStats {
    return this.getDashboardStats();
  }
}

export const db = new DatabaseEngine();
