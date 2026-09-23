export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: UserRole;
  balance?: number;
  apiKey: string;
  passwordHash?: string;
  createdAt: string;
}

export type ProviderStatus = 'active' | 'inactive' | 'error';

export interface SmmProvider {
  id: string;
  userId?: string;
  name: string;
  apiUrl: string;
  apiKey: string; // Server side key (masked on client)
  status: ProviderStatus;
  balance: number | null;
  balanceUsd?: number | null;
  balanceInr?: number | null;
  balanceCurrency: string;
  lastBalanceCheck: string | null;
  errorMessage?: string;
  createdAt: string;
}

export type PlatformCategory = 'Instagram' | 'TikTok' | 'YouTube' | 'Telegram' | 'Twitter/X' | 'Spotify' | 'Facebook' | 'Other';

export interface SmmService {
  id: number;
  providerId: string;
  providerServiceId: number;
  providerName?: string;
  platform: PlatformCategory;
  category: string;
  name: string;
  rate: number; // Selling rate per 1k
  providerRate: number; // Raw cost from provider per 1k
  min: number;
  max: number;
  status: 'active' | 'inactive';
  type: 'default' | 'package' | 'custom_comments' | 'drip_feed';
  refill: boolean;
  refillDays?: number;
  updatedAt?: string;
}

export type OrderType = 'single' | 'drip_feed' | 'all_in_one_parent' | 'all_in_one_child';

export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Partial' | 'Canceled' | 'Failed';

export interface Order {
  id: number; // Local database ID e.g. 10001
  providerOrderId: string | null; // REAL provider order ID from SMM API
  parentOrderId?: number | null; // For linking child bundle orders to all-in-one parent
  userId: string;
  orderType: OrderType;
  platform: PlatformCategory;
  category: string;
  serviceId: number;
  serviceName: string;
  providerId: string;
  providerName?: string;
  link: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  providerStatus?: string;
  errorMessage?: string;
  runs?: number;
  interval?: number;
  comments?: string;
  totalBundles?: number;
  completedBundles?: number;
  remainingBundles?: number;
  canceledBundles?: number;
  failedBundles?: number;
  nextRunAt?: string | null;
  durationHours?: number;
  schedules?: ScheduleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  parentOrderId: number;
  serviceId: number;
  serviceName: string;
  providerId: string;
  providerName?: string;
  link: string;
  quantity: number;
  scheduledAt: string;
  status: 'pending' | 'processing' | 'submitted' | 'failed' | 'canceled';
  providerOrderId: string | null;
  errorMessage?: string;
  runNumber: number;
  totalRuns: number;
  metric: string;
  createdAt: string;
}

export interface BundlePreview {
  runNumber: number;
  metric: string;
  serviceId: number;
  serviceName: string;
  quantity: number;
  scheduledAt: string;
  providerId: string;
  providerName: string;
  providerRate: number;
  cost: number;
}

export interface AllInOneMetricConfig {
  serviceId: number;
  totalQuantity: number;
  runCount: number; // e.g. 20, 30, 50, 100, N
  providerId?: string;
}

export interface AllInOneOrderRequest {
  platform: PlatformCategory;
  targetUrl: string;
  durationHours: number; // Delivery window e.g. 24
  metricsConfig: Record<string, AllInOneMetricConfig>; // e.g. { views: { serviceId: 101, totalQuantity: 20000, runCount: 100 } }
  randomVariancePercent: number; // e.g. 15
  peakHoursWeight: boolean;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeOrders: number;
  totalOrders: number;
  totalUnitsDelivered: number;
  revenue: number;
  activeProvidersCount: number;
  lastCronRun: string;
}

export interface AuditLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  details?: string;
  createdAt: string;
}

export interface SystemSettings {
  markupPercentage: number;
  providerBalanceAutoRefreshMinutes: number;
  cronExecutionIntervalSeconds: number;
}
