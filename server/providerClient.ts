import { SmmProvider } from '../src/types';

export interface ProviderAddOrderPayload {
  service: number | string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  comments?: string;
}

export interface ProviderAddOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface ProviderBalanceResult {
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

export function processProviderBalance(rawBalance: number, currencyStr: string = 'USD') {
  const curr = (currencyStr || 'USD').toUpperCase().trim();
  let balanceUsd = rawBalance;
  let balanceInr = rawBalance;

  if (curr === 'USD' || curr === '$') {
    balanceUsd = rawBalance;
    balanceInr = rawBalance * 87.0; // Standard USD to INR rate 87.0
  } else if (curr === 'INR' || curr === 'RS' || curr === '₹') {
    balanceInr = rawBalance;
    balanceUsd = rawBalance / 87.0;
  } else if (curr === 'EUR' || curr === '€') {
    balanceUsd = rawBalance * 1.08;
    balanceInr = rawBalance * 94.0;
  } else {
    balanceUsd = rawBalance;
    balanceInr = rawBalance * 87.0;
  }

  balanceInr = parseFloat(balanceInr.toFixed(2));
  balanceUsd = parseFloat(balanceUsd.toFixed(2));

  return {
    rawBalance,
    balanceInr,
    balanceUsd,
    rawCurrency: curr,
    formatted: `₹${balanceInr.toFixed(2)} INR ($${balanceUsd.toFixed(2)} USD)`
  };
}

export interface ProviderServiceItem {
  service: number | string;
  name: string;
  category: string;
  rate: number | string;
  min: number | string;
  max: number | string;
  type?: string;
  refill?: boolean;
}

export class ProviderClient {
  
  /**
   * Helper to execute POST form-urlencoded requests to SMM API v2 endpoints
   */
  private static async makeApiCall(apiUrl: string, params: Record<string, string>): Promise<any> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ZYNYX-SMM-Engine/1.0'
      },
      body: searchParams.toString()
    });

    const rawText = await response.text();

    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error(`Invalid non-JSON provider response: ${rawText.substring(0, 150)}`);
    }
  }

  /**
   * Fetch Real Provider Balance
   */
  static async getBalance(provider: SmmProvider): Promise<ProviderBalanceResult> {
    try {
      if (!provider.apiUrl || !provider.apiKey) {
        return { success: false, error: 'Provider API URL or API Key is missing' };
      }

      const data = await this.makeApiCall(provider.apiUrl, {
        key: provider.apiKey,
        action: 'balance'
      });

      if (data && data.balance !== undefined) {
        const balanceNum = parseFloat(data.balance);
        if (isNaN(balanceNum)) {
          return { success: false, error: 'Provider returned non-numeric balance' };
        }
        return {
          success: true,
          balance: balanceNum,
          currency: data.currency || 'USD'
        };
      }

      if (data && data.error) {
        return { success: false, error: data.error };
      }

      return { success: false, error: 'Malformed provider balance response' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reach provider API' };
    }
  }

  /**
   * Fetch Real Provider Services Catalog
   */
  static async getServices(provider: SmmProvider): Promise<{ success: boolean; services?: ProviderServiceItem[]; error?: string }> {
    try {
      if (!provider.apiUrl || !provider.apiKey) {
        return { success: false, error: 'Provider API URL or API Key missing' };
      }

      const data = await this.makeApiCall(provider.apiUrl, {
        key: provider.apiKey,
        action: 'services'
      });

      if (Array.isArray(data)) {
        return { success: true, services: data };
      }

      if (data && data.error) {
        return { success: false, error: data.error };
      }

      return { success: false, error: 'Provider returned unexpected service catalog format' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch services from provider' };
    }
  }

  /**
   * Submit REAL Order to Provider
   */
  static async addOrder(provider: SmmProvider, payload: ProviderAddOrderPayload): Promise<ProviderAddOrderResult> {
    try {
      if (!provider.apiUrl || !provider.apiKey) {
        return { success: false, error: 'Provider configuration missing' };
      }

      const postData: Record<string, string> = {
        key: provider.apiKey,
        action: 'add',
        service: payload.service.toString(),
        link: payload.link,
        quantity: payload.quantity.toString()
      };

      if (payload.runs) postData.runs = payload.runs.toString();
      if (payload.interval) postData.interval = payload.interval.toString();
      if (payload.comments) postData.comments = payload.comments;

      const data = await this.makeApiCall(provider.apiUrl, postData);

      // SMM v2 standard response format: { "order": 12345 } or { "order": "12345" }
      if (data && data.order) {
        return {
          success: true,
          orderId: data.order.toString(),
          rawResponse: data
        };
      }

      if (data && data.error) {
        return {
          success: false,
          error: data.error,
          rawResponse: data
        };
      }

      return {
        success: false,
        error: 'Provider API response missing "order" field',
        rawResponse: data
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network exception calling provider API'
      };
    }
  }

  /**
   * Check Real Provider Order Status
   */
  static async getOrderStatus(provider: SmmProvider, providerOrderId: string): Promise<{ success: boolean; status?: string; remains?: number; error?: string }> {
    try {
      const data = await this.makeApiCall(provider.apiUrl, {
        key: provider.apiKey,
        action: 'status',
        order: providerOrderId
      });

      if (data && data.status) {
        return {
          success: true,
          status: data.status,
          remains: data.remains !== undefined ? parseInt(data.remains, 10) : undefined
        };
      }

      if (data && data.error) {
        return { success: false, error: data.error };
      }

      return { success: false, error: 'Unknown status response' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Cancel Order on Real Provider API (Standard SMM v2 protocol)
   */
  static async cancelOrder(provider: SmmProvider, providerOrderId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      if (!provider.apiUrl || !provider.apiKey || !providerOrderId) {
        return { success: false, error: 'Provider configuration or order ID missing' };
      }

      const data = await this.makeApiCall(provider.apiUrl, {
        key: provider.apiKey,
        action: 'cancel',
        order: providerOrderId
      });

      if (data && (data.cancel || data.status || data.success)) {
        return { success: true, result: data };
      }

      if (data && data.error) {
        return { success: false, error: data.error };
      }

      return { success: true, result: data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to cancel order with provider' };
    }
  }
}
