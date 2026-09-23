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

    // 1. Smart Run Count Resolution (Auto Mode or Clamping)
    let actualRunCount: number;
    let explanationNote: string | undefined = undefined;

    // Check if auto mode requested (0, -1, or not provided)
    if (!requestedRunCount || requestedRunCount <= 0 || (requestedRunCount as any) === 'auto') {
      actualRunCount = this.calculateOptimalAutoRuns(metric, totalQuantity, durationHours, minBundleSize);
      explanationNote = `✨ Smart Auto Mode: Generated ${actualRunCount} natural bundles for ${totalQuantity.toLocaleString()} ${metric} (all > ${minBundleSize} units guaranteed).`;
    } else if (requestedRunCount > maxPossibleBundles) {
      // User requested more bundles than mathematically possible (e.g. 20 bundles for 1357 views where max is 13)
      actualRunCount = Math.max(1, maxPossibleBundles);
      explanationNote = `💡 Smart Safety: For ${totalQuantity.toLocaleString()} ${metric}, maximum ${actualRunCount} bundles possible to guarantee each bundle satisfies > ${minBundleSize} units (adjusted from ${requestedRunCount}).`;
    } else {
      actualRunCount = Math.max(1, Math.min(maxPossibleBundles, requestedRunCount));
    }

    // 2. Compute pattern curve multiplier weights across runs
    const varianceRatio = Math.min(0.35, Math.max(0, randomVariancePercent / 100));
    const rawWeights: number[] = [];

    // Lookup selected pattern from 100+ catalog
    const registeredPattern = GROWTH_PATTERNS_MAP.get(patternType);

    for (let i = 0; i < actualRunCount; i++) {
      const progress = actualRunCount > 1 ? i / (actualRunCount - 1) : 0.5;
      let basePatternWeight = 1.0;

      if (!patternEnabled || patternType === 'none') {
        // Flat uniform distribution if pattern scheduling is turned OFF
        basePatternWeight = 1.0;
      } else if (registeredPattern) {
        // Use exact mathematical formula from 100+ catalog
        basePatternWeight = Math.max(0.01, registeredPattern.calculateWeight(progress));
      } else if (patternType === 'viral' || patternType === 'viral_gaussian_peak') {
        // Gaussian peak curve centered around 30% duration
        const peak = 0.3;
        const width = 0.18;
        basePatternWeight = 0.1 + 0.9 * Math.exp(-Math.pow(progress - peak, 2) / (2 * width * width));
      } else if (patternType === 'ramp') {
        // Ascending ramp (Kam se Zyada)
        basePatternWeight = 0.1 + 1.4 * progress;
      } else if (patternType === 'pulse') {
        // Multi-wave pulse
        basePatternWeight = 0.3 + 0.7 * (0.5 * Math.sin(progress * Math.PI * 4) + 0.5);
      } else if (patternType === 'front') {
        // Front-heavy burst (Zyada se Kam)
        basePatternWeight = progress < 0.25 ? 2.0 : 0.3;
      } else {
        basePatternWeight = 0.85 + 0.3 * Math.sin(progress * Math.PI * 2);
      }

      // Add controlled organic entropy jitter if variance is enabled (without inverting general curve shape)
      let finalWeight = basePatternWeight;
      if (patternEnabled && varianceRatio > 0) {
        const jitterFactor = 1 + ((Math.random() - 0.5) * 2 * varianceRatio * 0.4);
        finalWeight = Math.max(0.01, basePatternWeight * jitterFactor);
      }

      rawWeights.push(finalWeight);
    }

    // 3. Constrained Exact-Sum Water-Filling Allocation
    // Directly projects the mathematical curve weights onto totalQuantity while guaranteeing:
    // a) Every bundle >= minBundleSize
    // b) Every bundle <= maxBundleSize
    // c) Exact sum === totalQuantity
    // d) Faithful reproduction of curve profile (ascending / descending / peak / wave)
    const rawQuantities: number[] = new Array(actualRunCount).fill(0);
    let remainingUnits = totalQuantity;
    const activeIndices = new Set<number>(Array.from({ length: actualRunCount }, (_, idx) => idx));

    while (activeIndices.size > 0) {
      const activeWeightSum = Array.from(activeIndices).reduce((sum, idx) => sum + rawWeights[idx], 0);

      if (activeWeightSum <= 0) {
        const perItem = Math.floor(remainingUnits / activeIndices.size);
        let rem = remainingUnits % activeIndices.size;
        for (const idx of activeIndices) {
          rawQuantities[idx] = perItem + (rem > 0 ? 1 : 0);
          if (rem > 0) rem--;
        }
        break;
      }

      let anyClamped = false;
      for (const idx of Array.from(activeIndices)) {
        const share = (rawWeights[idx] / activeWeightSum) * remainingUnits;
        if (share < minBundleSize) {
          rawQuantities[idx] = minBundleSize;
          remainingUnits -= minBundleSize;
          activeIndices.delete(idx);
          anyClamped = true;
          break;
        } else if (share > maxBundleSize) {
          rawQuantities[idx] = maxBundleSize;
          remainingUnits -= maxBundleSize;
          activeIndices.delete(idx);
          anyClamped = true;
          break;
        }
      }

      if (!anyClamped) {
        // Distribute remaining units with Largest-Remainder (Hamilton) Method
        const shares = Array.from(activeIndices).map(idx => {
          const floatVal = (rawWeights[idx] / activeWeightSum) * remainingUnits;
          const floorVal = Math.floor(floatVal);
          const remainder = floatVal - floorVal;
          return { idx, floorVal, remainder };
        });

        const sumFloors = shares.reduce((s, it) => s + it.floorVal, 0);
        let residual = remainingUnits - sumFloors;

        // Sort by remainder descending to award residual single units
        shares.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < residual; i++) {
          shares[i % shares.length].floorVal += 1;
        }

        for (const sh of shares) {
          rawQuantities[sh.idx] = Math.max(minBundleSize, Math.min(maxBundleSize, sh.floorVal));
        }
        break;
      }
    }

    // 3b. Exact Sum Safeguard Verification & Fine Calibration
    let allocatedSum = rawQuantities.reduce((a, b) => a + b, 0);
    let discrepancy = totalQuantity - allocatedSum;

    if (discrepancy !== 0) {
      const sortedByWeightDesc = Array.from({ length: actualRunCount }, (_, i) => i)
        .sort((a, b) => rawWeights[b] - rawWeights[a]);

      if (discrepancy > 0) {
        for (let i = 0; i < discrepancy; i++) {
          const targetIdx = sortedByWeightDesc[i % sortedByWeightDesc.length];
          if (rawQuantities[targetIdx] < maxBundleSize) {
            rawQuantities[targetIdx] += 1;
          }
        }
      } else {
        const sortedByWeightAsc = [...sortedByWeightDesc].reverse();
        let neededToSubtract = Math.abs(discrepancy);
        for (let i = 0; i < neededToSubtract; i++) {
          for (const targetIdx of sortedByWeightAsc) {
            if (rawQuantities[targetIdx] > minBundleSize) {
              rawQuantities[targetIdx] -= 1;
              neededToSubtract--;
              if (neededToSubtract === 0) break;
            }
          }
          if (neededToSubtract === 0) break;
        }
      }
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
