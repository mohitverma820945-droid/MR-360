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
   * with browser headers, timeout safety, and fast transparent socket recovery
   */
  private static async makeApiCall(apiUrl: string, params: Record<string, string>, retriesLeft = 2): Promise<any> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString().trim());
      }
    }

    const cleanUrl = apiUrl.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: searchParams.toString(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();

      try {
        return JSON.parse(rawText);
      } catch {
        // Robust JSON fallback: check if raw text contains {"order": 12345} or an order number
        const orderMatch = rawText.match(/"order"\s*:\s*"?(\d+)"?/i) || rawText.match(/\b(order\s*id\s*[:#]?\s*(\d+))\b/i);
        if (orderMatch) {
          const extracted = orderMatch[1] || orderMatch[2];
          return { order: extracted };
        }
        throw new Error(`Invalid non-JSON provider response: ${rawText.substring(0, 150)}`);
      }
    } catch (err: any) {
      if (retriesLeft > 0) {
        // Fast instant retry under 250ms so user NEVER experiences a first-time handshake glitch
        await new Promise(r => setTimeout(r, 200));
        return this.makeApiCall(apiUrl, params, retriesLeft - 1);
      }
      throw err;
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
        key: provider.apiKey.trim(),
        action: 'add',
        service: String(Math.round(Number(payload.service))).trim(),
        link: payload.link.trim(),
        quantity: Math.max(1, Math.round(Number(payload.quantity))).toString()
      };

      if (payload.comments && payload.comments.trim().length > 0) {
        postData.comments = payload.comments.trim();
      }

      if (payload.runs && Number(payload.runs) > 1 && payload.interval && Number(payload.interval) > 0) {
        postData.runs = payload.runs.toString();
        postData.interval = payload.interval.toString();
      }

      const data = await this.makeApiCall(provider.apiUrl, postData);

      // SMM v2 standard response format: { "order": 12345 } or { "order": "12345" } or { "order_id": 12345 }
      if (data && (data.order !== undefined || data.order_id !== undefined)) {
        const orderId = String(data.order ?? data.order_id);
        return {
          success: true,
          orderId,
          rawResponse: data
        };
      }

      if (data && data.error) {
        return {
          success: false,
          error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error),
          rawResponse: data
        };
      }

      return {
        success: false,
        error: 'Provider API response missing "order" confirmation',
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
