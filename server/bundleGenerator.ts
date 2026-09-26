import { SmmService, BundlePreview, AllInOneMetricConfig, SmmProvider } from '../src/types';
import { GROWTH_PATTERNS_MAP } from '../src/data/growthPatterns';

export interface BundleGenerationParams {
  metric: string; // 'Views' | 'Likes' | 'Comments' | 'Shares' | 'Saves' | 'Reposts'
  service: SmmService;
  provider: SmmProvider;
  totalQuantity: number;
  requestedRunCount: number; // 20, 30, 50, 100, N
  durationHours: number; // e.g. 24
  randomVariancePercent?: number; // e.g. 15%
  peakHoursWeight?: boolean;
  patternType?: string; // Pattern ID from 100+ catalog, or 'viral', 'ramp', 'pulse', 'front', 'steady', 'none'
  patternEnabled?: boolean; // Whether organic growth curve scheduling is ON or OFF
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

    // Target average bundle size for authentic algorithm pacing
    let targetAverageSize: number;
    if (isViews) {
      if (totalQuantity <= 1500) {
        targetAverageSize = 140; // e.g. 1295 -> ~9 bundles (102, 167, 146, 196...)
      } else if (totalQuantity <= 5000) {
        targetAverageSize = 250; // e.g. 3000 -> ~12 bundles
      } else if (totalQuantity <= 20000) {
        targetAverageSize = 500;
      } else {
        targetAverageSize = Math.max(600, Math.floor(totalQuantity / Math.min(50, Math.max(10, durationHours * 2))));
      }
    } else {
      // Likes, Comments, Shares, Saves
      if (totalQuantity <= 100) {
        targetAverageSize = 15;
      } else if (totalQuantity <= 500) {
        targetAverageSize = 25;
      } else {
        targetAverageSize = Math.max(30, Math.floor(totalQuantity / Math.min(40, Math.max(8, durationHours * 1.5))));
      }
    }

    let calculatedRuns = Math.round(totalQuantity / targetAverageSize);
    calculatedRuns = Math.max(1, Math.min(maxPossible, calculatedRuns));
    return calculatedRuns;
  }

  /**
   * Main Dynamic Bundle Generator with Natural Non-Equal Partitioning
   */
  static generateMetricBundles(params: BundleGenerationParams): GeneratedMetricPlan {
    const {
      metric,
      service,
      provider,
      totalQuantity,
      requestedRunCount,
      durationHours,
      randomVariancePercent = 15,
      peakHoursWeight = false,
      patternType = 'viral_gaussian_peak',
      patternEnabled = true
    } = params;

    const minBundleSize = this.getMinimumBundleSize(metric, service.min);
    const maxBundleSize = service.max || 10000000;
    const maxPossibleBundles = Math.floor(totalQuantity / minBundleSize);

    if (maxPossibleBundles < 1) {
      const baseRule = this.getMinimumBundleSize(metric, 1);
      if (totalQuantity < baseRule) {
        throw new Error(
          `Total quantity of ${totalQuantity.toLocaleString()} for ${metric} is below the minimum required quantity of ${baseRule} units.`
        );
      }
      throw new Error(
        `Selected service "${service.name}" requires a minimum order of ${service.min.toLocaleString()} units. Total quantity of ${totalQuantity.toLocaleString()} for ${metric} is below this service's minimum. Please select a service with a lower minimum (Min: ${baseRule}) or increase quantity.`
      );
    }

    // 1. Smart Run Count & Safe Curve Floor Resolution
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

    // Calculate sample minimum weight ratio to prevent tail bundle starvation
    const sampleWeights: number[] = [];
    for (let i = 0; i < 20; i++) {
      sampleWeights.push(weightEvaluator(i / 19));
    }
    const minW = Math.min(...sampleWeights);
    const avgW = sampleWeights.reduce((a, b) => a + b, 0) / (sampleWeights.length || 1);
    const minWeightRatio = Math.max(0.35, minW / (avgW || 1));

    // Determine safe maximum runs so no bundle is forced down to minBundleSize
    const safeAvgForUnique = Math.ceil((minBundleSize + 15) / minWeightRatio);
    const maxSafeRuns = Math.max(1, Math.floor(totalQuantity / safeAvgForUnique));

    let actualRunCount: number;
    let explanationNote: string | undefined = undefined;

    if (!requestedRunCount || requestedRunCount <= 0 || (requestedRunCount as any) === 'auto') {
      const autoCalculated = this.calculateOptimalAutoRuns(metric, totalQuantity, durationHours, minBundleSize);
      actualRunCount = Math.max(1, Math.min(maxSafeRuns, autoCalculated));
      explanationNote = `✨ Smart Auto Mode: Generated ${actualRunCount} natural, non-equal bundles along ${registeredPattern?.name || patternType} curve.`;
    } else {
      actualRunCount = Math.max(1, Math.min(maxPossibleBundles, Math.min(maxSafeRuns, requestedRunCount)));
    }

    // 2. Compute run weights with organic random entropy jitter
    const runWeights: number[] = [];
    const varianceRatio = Math.min(0.35, Math.max(0.12, (randomVariancePercent || 15) / 100));

    for (let i = 0; i < actualRunCount; i++) {
      const progress = actualRunCount > 1 ? i / (actualRunCount - 1) : 0.5;
      const baseW = weightEvaluator(progress);
      const clampedW = Math.max(avgW * minWeightRatio, baseW);
      // Organic entropy jitter
      const jitterFactor = 1 + ((Math.random() - 0.5) * 2 * varianceRatio * 0.5);
      runWeights.push(Math.max(0.05, clampedW * jitterFactor));
    }

    // 3. Constrained Exact-Sum Allocation
    const wSum = runWeights.reduce((a, b) => a + b, 0);
    const rawQuantities = runWeights.map(w => Math.floor((w / wSum) * totalQuantity));
    let currentSum = rawQuantities.reduce((a, b) => a + b, 0);
    let rem = totalQuantity - currentSum;

    // Distribute remaining residual units based on largest remainder fractional weight
    const remainders = runWeights.map((w, idx) => ({
      idx,
      frac: ((w / wSum) * totalQuantity) - rawQuantities[idx]
    })).sort((a, b) => b.frac - a.frac);

    for (let i = 0; i < rem; i++) {
      rawQuantities[remainders[i % remainders.length].idx] += 1;
    }

    // Enforce min / max bounds
    for (let i = 0; i < actualRunCount; i++) {
      if (rawQuantities[i] < minBundleSize) rawQuantities[i] = minBundleSize;
      if (rawQuantities[i] > maxBundleSize) rawQuantities[i] = maxBundleSize;
    }

    // Exact sum safeguard adjustment
    currentSum = rawQuantities.reduce((a, b) => a + b, 0);
    let discrepancy = totalQuantity - currentSum;
    let safeguardLoop = 0;
    while (discrepancy !== 0 && safeguardLoop < 100) {
      safeguardLoop++;
      for (let i = 0; i < actualRunCount; i++) {
        if (discrepancy > 0 && rawQuantities[i] < maxBundleSize) {
          rawQuantities[i]++;
          discrepancy--;
        } else if (discrepancy < 0 && rawQuantities[i] > minBundleSize) {
          rawQuantities[i]--;
          discrepancy++;
        }
        if (discrepancy === 0) break;
      }
    }

    // 4. ANTI-DUPLICATE & UNIQUE VALUE PASS (Guarantees no two bundles are identical!)
    let antiDupLoop = 0;
    while (antiDupLoop < 100 && actualRunCount > 1) {
      antiDupLoop++;
      let foundDup = false;
      const seenVals = new Map<number, number>();

      for (let i = 0; i < actualRunCount; i++) {
        const val = rawQuantities[i];
        if (seenVals.has(val)) {
          foundDup = true;
          const prevIdx = seenVals.get(val)!;

          // Find a donor bundle with extra capacity above minBundleSize + 25
          let donorIdx = -1;
          for (let k = 0; k < actualRunCount; k++) {
            if (k !== i && k !== prevIdx && rawQuantities[k] >= minBundleSize + 30) {
              donorIdx = k;
              break;
            }
          }

          if (donorIdx !== -1) {
            let candidateDelta = 13 + Math.floor(Math.random() * 15);
            for (let offset = 0; offset < 20; offset++) {
              const tryDelta = candidateDelta + offset;
              const newValI = rawQuantities[i] + tryDelta;
              const newValDonor = rawQuantities[donorIdx] - tryDelta;
              if (
                newValDonor >= minBundleSize + 5 &&
                newValI <= maxBundleSize &&
                !rawQuantities.includes(newValI) &&
                !rawQuantities.includes(newValDonor)
              ) {
                candidateDelta = tryDelta;
                break;
              }
            }
            rawQuantities[donorIdx] -= candidateDelta;
            rawQuantities[i] += candidateDelta;
          } else {
            let candidateDelta = 5 + Math.floor(Math.random() * 9);
            if (rawQuantities[i] + candidateDelta <= maxBundleSize && rawQuantities[prevIdx] - candidateDelta >= minBundleSize) {
              rawQuantities[i] += candidateDelta;
              rawQuantities[prevIdx] -= candidateDelta;
            } else if (rawQuantities[i] - candidateDelta >= minBundleSize && rawQuantities[prevIdx] + candidateDelta <= maxBundleSize) {
              rawQuantities[i] -= candidateDelta;
              rawQuantities[prevIdx] += candidateDelta;
            }
          }
        } else {
          seenVals.set(val, i);
        }
      }
      if (!foundDup) break;
    }

    // 4. Generate Timestamps across duration window
    const nowMs = Date.now();
    const durationMs = durationHours * 60 * 60 * 1000;
    const intervalMs = actualRunCount > 1 ? durationMs / (actualRunCount - 1) : 0;

    const bundles: BundlePreview[] = [];
    let prevDelayMs = 0;

    for (let i = 0; i < actualRunCount; i++) {
      // First bundle executes immediately (delay = 0)
      let delayMs = i * intervalMs;

      // Add gentle timing variation for intermediate bundles while strictly maintaining order
      if (i > 0 && i < actualRunCount - 1) {
        const maxJitter = intervalMs * 0.15;
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
