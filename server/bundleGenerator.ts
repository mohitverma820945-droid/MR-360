import { SmmService, BundlePreview, SmmProvider } from '../src/types';
import { GROWTH_PATTERNS_MAP } from '../src/data/growthPatterns';

export interface BundleGenerationParams {
  metric: string; // 'Views' | 'Likes' | 'Comments' | 'Shares' | 'Saves' | 'Reposts'
  service: SmmService;
  provider: SmmProvider;
  totalQuantity: number;
  requestedRunCount: number; // 20, 30, 50, 100, N, or 0/auto
  durationHours: number; // e.g. 24
  randomVariancePercent?: number; // e.g. 25
  peakHoursWeight?: boolean;
  patternType?: string; // Pattern ID from catalog or 'viral', 'ramp', 'pulse', 'front', 'none'
  patternEnabled?: boolean;
}

export interface GeneratedMetricPlan {
  metric: string;
  serviceId: number;
  serviceName: string;
  totalQuantity: number;
  actualRunCount: number;
  explanationNote?: string;
  bundles: BundlePreview[];
  totalCost: number;
}

export interface DripFeedGenerationParams {
  metric: string; // 'Views' | 'Likes' | 'Comments' | 'Shares' | 'Saves' | 'Reposts'
  service: SmmService;
  provider: SmmProvider;
  quantityPerRun?: number;
  totalQuantity?: number;
  runs: number;
  intervalMinutes: number;
  organicRandomize?: boolean; // default true
  randomVariancePercent?: number; // default 35%
}

export interface GeneratedDripFeedPlan {
  metric: string;
  serviceId: number;
  serviceName: string;
  quantityPerRun: number;
  totalRuns: number;
  totalQuantity: number;
  intervalMinutes: number;
  organicRandomize: boolean;
  bundles: BundlePreview[];
  totalCost: number;
}

export class BundleGenerator {

  /**
   * Determine Minimum Bundle Requirement based on metric type
   */
  static getMinimumBundleSize(metric: string, serviceMin: number): number {
    const isViews = metric.toLowerCase().includes('view');
    const metricMinRule = isViews ? 100 : 10;
    return Math.max(metricMinRule, serviceMin || 1);
  }

  /**
   * Calculate optimal automatic bundle count based on metric, quantity, and campaign duration
   */
  static calculateOptimalAutoRuns(
    metric: string,
    totalQuantity: number,
    durationHours: number,
    minBundleSize: number
  ): number {
    const isViews = metric.toLowerCase().includes('view');
    const maxPossible = Math.max(1, Math.floor(totalQuantity / minBundleSize));

    let targetAverageSize: number;
    if (isViews) {
      if (totalQuantity <= 1500) {
        targetAverageSize = 140;
      } else if (totalQuantity <= 5000) {
        targetAverageSize = 250;
      } else if (totalQuantity <= 20000) {
        targetAverageSize = 400;
      } else if (totalQuantity <= 100000) {
        targetAverageSize = Math.max(500, Math.floor(totalQuantity / Math.min(100, Math.max(12, durationHours * 2))));
      } else {
        // High-scale: 500k, 1M+ views
        targetAverageSize = Math.max(1000, Math.floor(totalQuantity / Math.min(100, Math.max(20, durationHours * 2.5))));
      }
    } else {
      if (totalQuantity <= 100) {
        targetAverageSize = 15;
      } else if (totalQuantity <= 500) {
        targetAverageSize = 25;
      } else if (totalQuantity <= 5000) {
        targetAverageSize = Math.max(30, Math.floor(totalQuantity / Math.min(50, Math.max(8, durationHours * 1.5))));
      } else {
        // Large likes/shares/comments
        targetAverageSize = Math.max(100, Math.floor(totalQuantity / Math.min(60, Math.max(12, durationHours * 2))));
      }
    }

    let calculatedRuns = Math.round(totalQuantity / targetAverageSize);
    return Math.max(1, Math.min(maxPossible, calculatedRuns));
  }

  /**
   * Main Dynamic Bundle Generator with Natural Non-Equal Partitioning (All-in-One & High Scale)
   */
  static generateMetricBundles(params: BundleGenerationParams): GeneratedMetricPlan {
    const {
      metric,
      service,
      provider,
      totalQuantity,
      requestedRunCount,
      durationHours,
      randomVariancePercent = 25,
      peakHoursWeight = false,
      patternType = 'viral_gaussian_peak',
      patternEnabled = true
    } = params;

    const minBundleSize = this.getMinimumBundleSize(metric, service.min);
    const maxBundleSize = service.max || 10000000;
    const maxPossibleBundles = Math.max(1, Math.floor(totalQuantity / minBundleSize));

    if (totalQuantity < minBundleSize) {
      throw new Error(
        `Total quantity of ${totalQuantity.toLocaleString()} for ${metric} is below the minimum required quantity of ${minBundleSize.toLocaleString()} units.`
      );
    }

    // 1. Determine Bundle Count N
    let actualRunCount: number;
    let explanationNote: string | undefined = undefined;

    if (!requestedRunCount || requestedRunCount <= 0 || (requestedRunCount as any) === 'auto') {
      const autoCalculated = this.calculateOptimalAutoRuns(metric, totalQuantity, durationHours, minBundleSize);
      actualRunCount = Math.max(1, Math.min(maxPossibleBundles, autoCalculated));
      explanationNote = `✨ Smart Auto Mode: Generated ${actualRunCount} natural, non-equal bundles.`;
    } else {
      // User explicitly requested N bundles (e.g. 20, 30, 50, 100)
      actualRunCount = Math.max(1, Math.min(maxPossibleBundles, requestedRunCount));
    }

    // 2. Growth Pattern Weight Evaluator
    const registeredPattern = GROWTH_PATTERNS_MAP.get(patternType);
    const weightEvaluator = (progress: number): number => {
      if (!patternEnabled || patternType === 'none') return 1.0;
      if (registeredPattern) return Math.max(0.01, registeredPattern.calculateWeight(progress));
      if (patternType === 'viral' || patternType === 'viral_gaussian_peak') {
        const peak = 0.3, width = 0.18;
        return 0.1 + 0.9 * Math.exp(-Math.pow(progress - peak, 2) / (2 * width * width));
      }
      if (patternType === 'ramp') return 0.1 + 1.4 * progress;
      if (patternType === 'pulse') return 0.3 + 0.7 * (0.5 * Math.sin(progress * Math.PI * 4) + 0.5);
      if (patternType === 'front') return progress < 0.25 ? 2.0 : 0.3;
      return 0.85 + 0.3 * Math.sin(progress * Math.PI * 2);
    };

    // 3. Generate Weights with Organic Variance Jitter
    const runWeights: number[] = [];
    const varianceRatio = Math.min(0.60, Math.max(0.10, (randomVariancePercent || 25) / 100));

    for (let i = 0; i < actualRunCount; i++) {
      const progress = actualRunCount > 1 ? i / (actualRunCount - 1) : 0.5;
      const baseW = weightEvaluator(progress);
      // Organic entropy jitter creates natural variance
      const jitterFactor = 1 + ((Math.random() - 0.5) * 2 * varianceRatio);
      runWeights.push(Math.max(0.05, baseW * jitterFactor));
    }

    // 4. Initial Proportional Allocation
    const wSum = runWeights.reduce((a, b) => a + b, 0);
    const rawQuantities = runWeights.map(w => Math.floor((w / wSum) * totalQuantity));

    // Distribute remaining residual units by largest remainder
    let currentSum = rawQuantities.reduce((a, b) => a + b, 0);
    let rem = totalQuantity - currentSum;

    const remainders = runWeights.map((w, idx) => ({
      idx,
      frac: ((w / wSum) * totalQuantity) - rawQuantities[idx]
    })).sort((a, b) => b.frac - a.frac);

    for (let i = 0; i < rem; i++) {
      rawQuantities[remainders[i % remainders.length].idx] += 1;
    }

    // Enforce min / max bounds initially
    for (let i = 0; i < actualRunCount; i++) {
      if (rawQuantities[i] < minBundleSize) rawQuantities[i] = minBundleSize;
      if (rawQuantities[i] > maxBundleSize) rawQuantities[i] = maxBundleSize;
    }

    // High-performance Chunked Discrepancy Rebalance (Handles 100k, 500k, 1M smoothly)
    currentSum = rawQuantities.reduce((a, b) => a + b, 0);
    let discrepancy = totalQuantity - currentSum;
    let safeguardLoop = 0;
    while (discrepancy !== 0 && safeguardLoop < 100) {
      safeguardLoop++;
      const step = Math.max(1, Math.floor(Math.abs(discrepancy) / actualRunCount));
      for (let i = 0; i < actualRunCount && discrepancy !== 0; i++) {
        if (discrepancy > 0 && rawQuantities[i] < maxBundleSize) {
          const add = Math.min(step, discrepancy, maxBundleSize - rawQuantities[i]);
          rawQuantities[i] += add;
          discrepancy -= add;
        } else if (discrepancy < 0 && rawQuantities[i] > minBundleSize) {
          const sub = Math.min(step, -discrepancy, rawQuantities[i] - minBundleSize);
          rawQuantities[i] -= sub;
          discrepancy += sub;
        }
      }
    }

    // Final exact single-unit balance if any fractional discrepancy remains
    currentSum = rawQuantities.reduce((a, b) => a + b, 0);
    discrepancy = totalQuantity - currentSum;
    if (discrepancy > 0) {
      for (let i = 0; i < discrepancy; i++) {
        rawQuantities[i % actualRunCount]++;
      }
    } else if (discrepancy < 0) {
      for (let i = 0; i < -discrepancy; i++) {
        const idx = i % actualRunCount;
        if (rawQuantities[idx] > minBundleSize) rawQuantities[idx]--;
      }
    }

    // 5. ANTI-DUPLICATE & PROPORTIONAL NATURAL VARIATION REFINEMENT
    if (actualRunCount > 1) {
      let antiDupLoop = 0;
      while (antiDupLoop < 150) {
        antiDupLoop++;
        let foundDup = false;
        const seenVals = new Map<number, number>();

        for (let i = 0; i < actualRunCount; i++) {
          const val = rawQuantities[i];
          if (seenVals.has(val)) {
            foundDup = true;
            const prevIdx = seenVals.get(val)!;

            let donorIdx = -1;
            for (let k = 0; k < actualRunCount; k++) {
              if (k !== i && k !== prevIdx && rawQuantities[k] >= minBundleSize + 10) {
                donorIdx = k;
                break;
              }
            }

            if (donorIdx !== -1) {
              const maxDelta = Math.min(
                Math.floor((rawQuantities[donorIdx] - minBundleSize) * 0.25),
                Math.max(15, Math.floor(totalQuantity / (actualRunCount * 6)))
              );
              const delta = Math.max(1, Math.floor(Math.random() * maxDelta));
              if (rawQuantities[donorIdx] - delta >= minBundleSize && rawQuantities[i] + delta <= maxBundleSize) {
                rawQuantities[donorIdx] -= delta;
                rawQuantities[i] += delta;
              }
            } else if (rawQuantities[prevIdx] >= minBundleSize + 2) {
              const delta = 1;
              rawQuantities[prevIdx] -= delta;
              rawQuantities[i] += delta;
            }
          } else {
            seenVals.set(val, i);
          }
        }
        if (!foundDup) break;
      }
    }

    // Final Exact Sum Safety Verification
    currentSum = rawQuantities.reduce((a, b) => a + b, 0);
    discrepancy = totalQuantity - currentSum;
    if (discrepancy !== 0) {
      rawQuantities[rawQuantities.length - 1] += discrepancy;
    }

    // 6. Generate Timestamps across duration window
    const nowMs = Date.now();
    const durationMs = durationHours * 60 * 60 * 1000;
    const intervalMs = actualRunCount > 1 ? durationMs / (actualRunCount - 1) : 0;

    const bundles: BundlePreview[] = [];
    let prevDelayMs = 0;

    for (let i = 0; i < actualRunCount; i++) {
      let delayMs = i * intervalMs;

      if (i > 0 && i < actualRunCount - 1) {
        const maxJitter = Math.min(intervalMs * 0.20, 300000);
        const jitter = (Math.random() - 0.5) * 2 * maxJitter;
        delayMs = Math.max(prevDelayMs + 2000, Math.min(durationMs - 2000, delayMs + jitter));
      } else if (i === actualRunCount - 1 && actualRunCount > 1) {
        delayMs = Math.max(prevDelayMs + 2000, durationMs);
      }
      prevDelayMs = delayMs;

      const scheduledDate = new Date(nowMs + delayMs);
      const qty = rawQuantities[i];
      const cost = parseFloat(((qty / 1000) * service.rate).toFixed(4));

      bundles.push({
        runNumber: i + 1,
        metric,
        serviceId: service.id,
        serviceName: service.name,
        quantity: qty,
        scheduledAt: scheduledDate.toISOString(),
        providerId: provider.id,
        providerName: provider.name,
        providerRate: service.providerRate || service.rate,
        cost
      });
    }

    const totalCost = parseFloat(
      bundles.reduce((sum, b) => sum + b.cost, 0).toFixed(4)
    );

    // 7. Validate Plan
    const validation = this.validateBundlePlan(bundles, totalQuantity, metric, service);
    if (!validation.valid) {
      console.warn(`[BundleGenerator] Plan validation warnings for ${metric}:`, validation.errors);
    }

    return {
      metric,
      serviceId: service.id,
      serviceName: service.name,
      totalQuantity,
      actualRunCount,
      explanationNote,
      bundles,
      totalCost
    };
  }

  /**
   * Dedicated Drip-Feed Bundle Generator with Natural Anti-Bot Randomization
   * Example: 1160 views x 10 runs (60m interval) -> total 11600 views
   * Randomizes runs naturally (e.g. 357, 978, 1168, 1257, 1368, 689...) while SUM strictly === 11600!
   * Example: 50 likes x 10 runs (70m interval) -> total 500 likes
   * Randomizes runs naturally (e.g. 20, 46, 47, 24, 32...) while SUM strictly === 500!
   */
  static generateDripFeedBundles(params: DripFeedGenerationParams): GeneratedDripFeedPlan {
    const {
      metric,
      service,
      provider,
      runs,
      intervalMinutes,
      organicRandomize = true,
      randomVariancePercent = 35
    } = params;

    const totalQuantity = params.totalQuantity && params.totalQuantity > 0
      ? params.totalQuantity
      : (params.quantityPerRun || 1000) * runs;
    const quantityPerRun = Math.round(totalQuantity / runs);
    const minBundleSize = this.getMinimumBundleSize(metric, service.min);
    const maxBundleSize = service.max || 10000000;

    if (totalQuantity < minBundleSize * runs && !organicRandomize) {
      throw new Error(`Quantity per run (${quantityPerRun}) is below service minimum of ${minBundleSize}.`);
    }

    const rawQuantities: number[] = [];

    if (!organicRandomize || runs <= 1) {
      // Standard static drip feed without randomization
      for (let i = 0; i < runs; i++) {
        rawQuantities.push(quantityPerRun);
      }
    } else {
      // Natural Organic Randomization
      // Generate diverse random multipliers that average to 1.0
      const varianceRatio = Math.min(0.65, Math.max(0.15, randomVariancePercent / 100));
      const weights: number[] = [];

      for (let i = 0; i < runs; i++) {
        // Natural bell-curve with entropy jitter
        const u1 = Math.random();
        const u2 = Math.random();
        const randStdNormal = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
        const factor = Math.max(0.20, 1.0 + (randStdNormal * varianceRatio));
        weights.push(factor);
      }

      const sumW = weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < runs; i++) {
        const initialQty = Math.floor((weights[i] / sumW) * totalQuantity);
        rawQuantities.push(Math.max(minBundleSize, Math.min(maxBundleSize, initialQty)));
      }

      // Rebalance discrepancy to guarantee exact total
      let currentSum = rawQuantities.reduce((a, b) => a + b, 0);
      let discrepancy = totalQuantity - currentSum;
      let loop = 0;

      while (discrepancy !== 0 && loop < 100) {
        loop++;
        const step = Math.max(1, Math.floor(Math.abs(discrepancy) / runs));
        for (let i = 0; i < runs && discrepancy !== 0; i++) {
          if (discrepancy > 0 && rawQuantities[i] < maxBundleSize) {
            const add = Math.min(step, discrepancy, maxBundleSize - rawQuantities[i]);
            rawQuantities[i] += add;
            discrepancy -= add;
          } else if (discrepancy < 0 && rawQuantities[i] > minBundleSize) {
            const sub = Math.min(step, -discrepancy, rawQuantities[i] - minBundleSize);
            rawQuantities[i] -= sub;
            discrepancy += sub;
          }
        }
      }

      // Final single-unit precision balance
      currentSum = rawQuantities.reduce((a, b) => a + b, 0);
      discrepancy = totalQuantity - currentSum;
      if (discrepancy > 0) {
        for (let i = 0; i < discrepancy; i++) {
          rawQuantities[i % runs]++;
        }
      } else if (discrepancy < 0) {
        for (let i = 0; i < -discrepancy; i++) {
          const idx = i % runs;
          if (rawQuantities[idx] > minBundleSize) rawQuantities[idx]--;
        }
      }

      // Anti-duplicate refinement for drip runs so no two consecutive runs are identical
      for (let i = 1; i < runs; i++) {
        if (rawQuantities[i] === rawQuantities[i - 1] && rawQuantities[i] > minBundleSize + 4) {
          const delta = Math.min(5, Math.floor(rawQuantities[i] * 0.1) || 1);
          rawQuantities[i - 1] += delta;
          rawQuantities[i] -= delta;
        }
      }

      // Re-verify exact sum
      currentSum = rawQuantities.reduce((a, b) => a + b, 0);
      discrepancy = totalQuantity - currentSum;
      if (discrepancy !== 0) {
        rawQuantities[runs - 1] += discrepancy;
      }
    }

    // Generate schedule timestamps based on intervalMinutes
    // Run 1 fires immediately (now), Run 2 fires at now + interval, etc.
    const nowMs = Date.now();
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    const bundles: BundlePreview[] = [];

    for (let i = 0; i < runs; i++) {
      let runDelayMs = i * intervalMs;
      // Organic minute timing jitter (+- 1-2 minutes for runs > 0 so it doesn't fire at exact clock seconds)
      if (organicRandomize && i > 0 && intervalMinutes >= 10) {
        const jitterMs = (Math.random() - 0.5) * 2 * Math.min(120000, intervalMs * 0.05);
        runDelayMs = Math.max((i - 0.8) * intervalMs, runDelayMs + jitterMs);
      }

      const scheduledDate = new Date(nowMs + runDelayMs);
      const qty = rawQuantities[i];
      const cost = parseFloat(((qty / 1000) * service.rate).toFixed(4));

      bundles.push({
        runNumber: i + 1,
        metric,
        serviceId: service.id,
        serviceName: service.name,
        quantity: qty,
        scheduledAt: scheduledDate.toISOString(),
        providerId: provider.id,
        providerName: provider.name,
        providerRate: service.providerRate || service.rate,
        cost
      });
    }

    const totalCost = parseFloat(
      bundles.reduce((sum, b) => sum + b.cost, 0).toFixed(4)
    );

    return {
      metric,
      serviceId: service.id,
      serviceName: service.name,
      quantityPerRun,
      totalRuns: runs,
      totalQuantity,
      intervalMinutes,
      organicRandomize,
      bundles,
      totalCost
    };
  }

  /**
   * Central Bundle Validator
   */
  static validateBundlePlan(
    bundles: BundlePreview[],
    expectedTotalQuantity: number,
    metric: string,
    service: SmmService
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!bundles || bundles.length === 0) {
      errors.push('Bundle plan contains zero executions.');
      return { valid: false, errors };
    }

    // 1. Verify exact sum match
    const actualSum = bundles.reduce((s, b) => s + b.quantity, 0);
    if (actualSum !== expectedTotalQuantity) {
      errors.push(`Total quantity sum mismatch: expected ${expectedTotalQuantity}, got ${actualSum}.`);
    }

    // 2. Minimum rule verification
    const minRule = this.getMinimumBundleSize(metric, service.min);
    const invalidMinBundles = bundles.filter(b => b.quantity < minRule);
    if (invalidMinBundles.length > 0) {
      errors.push(`${invalidMinBundles.length} bundle(s) fall below the minimum threshold of ${minRule} for ${metric}.`);
    }

    // 3. Service maximum limit verification
    if (service.max) {
      const invalidMaxBundles = bundles.filter(b => b.quantity > service.max);
      if (invalidMaxBundles.length > 0) {
        errors.push(`${invalidMaxBundles.length} bundle(s) exceed service max limit of ${service.max}.`);
      }
    }

    // 4. Timestamp validity check
    const invalidTimestamps = bundles.filter(b => isNaN(new Date(b.scheduledAt).getTime()));
    if (invalidTimestamps.length > 0) {
      errors.push('Bundle plan contains invalid timestamp dates.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
