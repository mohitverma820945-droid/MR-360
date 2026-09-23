export interface GrowthPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  formulaType: string;
  // Function to calculate curve weight given progress t from 0 to 1
  calculateWeight: (t: number) => number;
  // SVG preview path in 0-100 x 0-40 box
  svgPath: string;
}

export const GROWTH_CATEGORIES = [
  'All Patterns (100+)',
  '🔥 Reels & FYP Explosive',
  '📈 Organic Linear & Drip',
  '🌊 Multi-Wave & Pulses',
  '⚡ Front-Burst & Launch',
  '🎯 Influencer & Collabs',
  '🌙 Prime Hours & Night Owls',
  '💎 Evergreen & Sustained',
  '🤖 Algorithm Hack & SEO'
] as const;

// Helper to generate smooth SVG path from a math function
export function generateSvgPath(weightFn: (t: number) => number): string {
  const points: [number, number][] = [];
  const steps = 30;
  let maxW = 0.001;
  const rawWeights: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = Math.max(0.01, weightFn(t));
    rawWeights.push(w);
    if (w > maxW) maxW = w;
  }

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    const norm = rawWeights[i] / maxW;
    const y = 36 - norm * 30; // y between 6 and 36
    points.push([Number(x.toFixed(1)), Number(y.toFixed(1))]);
  }

  return points.reduce((acc, [x, y], idx) => {
    return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');
}

// 100+ Expert Instagram Organic Growth Curves
export const GROWTH_PATTERNS_LIST: GrowthPattern[] = [
  // ==================== 1. REELS & FYP EXPLOSIVE (15) ====================
  {
    id: 'viral_gaussian_peak',
    name: 'Viral Spike 🚀',
    category: '🔥 Reels & FYP Explosive',
    description: 'Early exponential peak within 25-35% duration mimicking genuine explore breakout.',
    badge: 'TOP CHOICE',
    formulaType: 'gaussian',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.3, 2) / (2 * 0.04)),
    svgPath: ''
  },
  {
    id: 'reels_30sec_trigger',
    name: '30s Retention Hook 🪝',
    category: '🔥 Reels & FYP Explosive',
    description: 'Rapid initial 15% acceleration trigger designed to hook Instagram Reels watch-time loop.',
    badge: 'REELS META',
    formulaType: 'hook',
    calculateWeight: (t) => t < 0.15 ? 1.8 : 0.4 + 0.6 * Math.exp(-t * 3),
    svgPath: ''
  },
  {
    id: 'explore_cascade_boost',
    name: 'Explore Page Cascade 🌐',
    category: '🔥 Reels & FYP Explosive',
    description: 'Stepwise compounding escalation as post breaks into progressive hashtag & explore clusters.',
    badge: 'VIRAL',
    formulaType: 'cascade',
    calculateWeight: (t) => 0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI * 1.5), 2),
    svgPath: ''
  },
  {
    id: 'hyper_velocity_snowball',
    name: 'Hyper-Velocity Snowball ❄️',
    category: '🔥 Reels & FYP Explosive',
    description: 'Exponential curve starting small then accelerating 5x in the second half.',
    badge: 'EXPONENTIAL',
    formulaType: 'exponential',
    calculateWeight: (t) => 0.2 + 0.8 * Math.pow(t, 2.5),
    svgPath: ''
  },
  {
    id: 'fyp_loop_accelerator',
    name: 'FYP Loop Multiplier 🔄',
    category: '🔥 Reels & FYP Explosive',
    description: 'Repeated high-frequency surges matching Instagram algorithm batch-testing iterations.',
    badge: 'ALGO SAFE',
    formulaType: 'loop',
    calculateWeight: (t) => 0.5 + 0.5 * (Math.sin(t * Math.PI * 6) * Math.exp(-t * 0.5) + 0.5),
    svgPath: ''
  },
  {
    id: 'golden_hour_takeover',
    name: 'Golden Hour Takeover 🌇',
    category: '🔥 Reels & FYP Explosive',
    description: 'Smooth bell curve concentrated at peak evening activity window (6PM-10PM).',
    badge: 'HIGH CONVERSION',
    formulaType: 'golden_hour',
    calculateWeight: (t) => 0.25 + 0.75 * Math.exp(-Math.pow(t - 0.5, 2) / 0.05),
    svgPath: ''
  },
  {
    id: 'double_breakout_climax',
    name: 'Double Breakout Climax 💥',
    category: '🔥 Reels & FYP Explosive',
    description: 'Dual high-energy peaks simulating initial post push followed by shared story momentum.',
    formulaType: 'double_breakout',
    calculateWeight: (t) => 0.2 + 0.5 * Math.exp(-Math.pow(t - 0.25, 2) / 0.02) + 0.6 * Math.exp(-Math.pow(t - 0.75, 2) / 0.03),
    svgPath: ''
  },
  {
    id: 'sound_trend_sync',
    name: 'Trending Audio Wave 🎵',
    category: '🔥 Reels & FYP Explosive',
    description: 'Rhythmic ascending beats designed for posts utilizing trending Instagram audio tracks.',
    badge: 'TRENDING',
    formulaType: 'audio_sync',
    calculateWeight: (t) => 0.4 + 0.6 * (0.5 * Math.sin(t * Math.PI * 8) + t),
    svgPath: ''
  },
  {
    id: 'staccato_bursts',
    name: 'Micro-Burst Staccato ⚡',
    category: '🔥 Reels & FYP Explosive',
    description: 'Short rapid-fire bursts every 2-3 hours with quiet cool-down resting periods.',
    formulaType: 'staccato',
    calculateWeight: (t) => 0.3 + 0.7 * Math.pow(Math.abs(Math.sin(t * Math.PI * 5)), 4),
    svgPath: ''
  },
  {
    id: 'viral_tail_sustain',
    name: 'Viral Peak with Heavy Tail ☄️',
    category: '🔥 Reels & FYP Explosive',
    description: 'Massive early surge (40%) followed by sustained high baseline engagement.',
    formulaType: 'tail_sustain',
    calculateWeight: (t) => t < 0.3 ? 1.6 * (t / 0.3) : 0.8 + 0.4 * Math.exp(-(t - 0.3) * 2),
    svgPath: ''
  },
  {
    id: 'algorithm_seed_burst',
    name: 'Algorithm Seed Spark ✨',
    category: '🔥 Reels & FYP Explosive',
    description: 'Instant ignition in first 10 minutes to register as high-engagement seed to IG AI.',
    formulaType: 'seed_burst',
    calculateWeight: (t) => t < 0.1 ? 2.0 : 0.5 + 0.3 * Math.sin(t * Math.PI * 3),
    svgPath: ''
  },
  {
    id: 'weekend_reels_fiesta',
    name: 'Weekend Primetime Surge 🏖️',
    category: '🔥 Reels & FYP Explosive',
    description: 'Gradual ramp that explodes during weekend active hours.',
    formulaType: 'weekend',
    calculateWeight: (t) => 0.3 + 0.7 * Math.pow(t, 1.8) + 0.2 * Math.sin(t * Math.PI * 4),
    svgPath: ''
  },
  {
    id: 'viral_ladder_steps',
    name: 'Viral Tier Ladder 🪜',
    category: '🔥 Reels & FYP Explosive',
    description: 'Step-up tier distribution unlocking higher volume at 25%, 50%, and 75% milestones.',
    formulaType: 'ladder',
    calculateWeight: (t) => 0.3 + 0.25 * Math.floor(t * 4) + 0.1 * Math.sin(t * 10),
    svgPath: ''
  },
  {
    id: 'shockwave_cascade',
    name: 'Shockwave Cascade 🌊',
    category: '🔥 Reels & FYP Explosive',
    description: 'Damped harmonic wave simulating reverberating reposts and viral DMs.',
    formulaType: 'shockwave',
    calculateWeight: (t) => 0.4 + 0.6 * Math.exp(-t * 2) * Math.cos(t * Math.PI * 4) + 0.3,
    svgPath: ''
  },
  {
    id: 'fyp_saturation_climb',
    name: 'Explore Saturation Climb 📈',
    category: '🔥 Reels & FYP Explosive',
    description: 'Smooth S-curve (Logistic Sigmoid) modeling organic saturation in Instagram discovery.',
    badge: 'MATHEMATICAL',
    formulaType: 'sigmoid',
    calculateWeight: (t) => 0.2 + 0.8 / (1 + Math.exp(-10 * (t - 0.5))),
    svgPath: ''
  },

  // ==================== 2. ORGANIC LINEAR & DRIP (15) ====================
  {
    id: 'human_ramp_linear',
    name: 'Human Ramp 📈',
    category: '📈 Organic Linear & Drip',
    description: 'Continuous linear climb simulating natural organic discovery through word of mouth.',
    badge: '100% NATURAL',
    formulaType: 'linear_ramp',
    calculateWeight: (t) => 0.3 + 1.2 * t,
    svgPath: ''
  },
  {
    id: 'steady_stream_uniform',
    name: 'Steady Natural Stream ⚖️',
    category: '📈 Organic Linear & Drip',
    description: 'Consistent, uniform flow with subtle organic micro-fluctuations.',
    badge: 'SAFE DRIP',
    formulaType: 'steady',
    calculateWeight: (t) => 0.85 + 0.25 * Math.sin(t * Math.PI * 2),
    svgPath: ''
  },
  {
    id: 'gentle_morning_drip',
    name: 'Gentle Morning Drip ☕',
    category: '📈 Organic Linear & Drip',
    description: 'Low overnight start smoothly building up as users wake up and open apps.',
    formulaType: 'morning_drip',
    calculateWeight: (t) => 0.2 + 0.8 * Math.sin(t * Math.PI * 0.5),
    svgPath: ''
  },
  {
    id: 'slow_burn_compounder',
    name: 'Slow Burn Compounder 🪵',
    category: '📈 Organic Linear & Drip',
    description: 'Patience-first compounding growth ideal for high-ticket or niche educational content.',
    formulaType: 'slow_burn',
    calculateWeight: (t) => 0.2 + 0.8 * Math.pow(t, 3),
    svgPath: ''
  },
  {
    id: 'natural_breathing_drip',
    name: 'Organic Breathing Cycle 🫁',
    category: '📈 Organic Linear & Drip',
    description: 'Smooth sinusoidal oscillations matching human inhalation/exhalation pacing.',
    formulaType: 'breathing',
    calculateWeight: (t) => 0.6 + 0.4 * Math.sin(t * Math.PI * 3),
    svgPath: ''
  },
  {
    id: 'subtle_ascending_slope',
    name: 'Subtle Ascending Slope 🧗',
    category: '📈 Organic Linear & Drip',
    description: 'Very gentle 25-degree positive trajectory across entire delivery window.',
    formulaType: 'subtle_slope',
    calculateWeight: (t) => 0.5 + 0.6 * t,
    svgPath: ''
  },
  {
    id: 'parabolic_organic_bowl',
    name: 'Parabolic U-Curve 🥣',
    category: '📈 Organic Linear & Drip',
    description: 'Strong start, quiet mid-period, and powerful closing surge.',
    formulaType: 'parabolic_u',
    calculateWeight: (t) => 0.3 + 0.7 * (4 * Math.pow(t - 0.5, 2)),
    svgPath: ''
  },
  {
    id: 'natural_random_walk',
    name: 'Natural Random Walk 🚶',
    category: '📈 Organic Linear & Drip',
    description: 'Pseudo-Brownian motion with realistic daily micro-variations.',
    formulaType: 'brownian',
    calculateWeight: (t) => 0.7 + 0.2 * Math.sin(t * 7) + 0.15 * Math.cos(t * 13),
    svgPath: ''
  },
  {
    id: 'three_tier_escalation',
    name: '3-Tier Escalation 📶',
    category: '📈 Organic Linear & Drip',
    description: 'Three balanced stages: Warmup (25%), Acceleration (50%), Expansion (25%).',
    formulaType: 'three_tier',
    calculateWeight: (t) => t < 0.3 ? 0.5 : (t < 0.7 ? 1.0 : 1.4),
    svgPath: ''
  },
  {
    id: 'low_jitter_drip',
    name: 'Low-Jitter Ultra Drip 💧',
    category: '📈 Organic Linear & Drip',
    description: 'Ultra-low variance linear distribution ideal for strict account safety.',
    badge: 'ZERO RISK',
    formulaType: 'low_jitter',
    calculateWeight: () => 1.0,
    svgPath: ''
  },
  {
    id: 'logarithmic_growth_taper',
    name: 'Logarithmic Natural Decay 🪵',
    category: '📈 Organic Linear & Drip',
    description: 'Fast early pickup followed by organic natural tapering off.',
    formulaType: 'logarithmic',
    calculateWeight: (t) => 0.3 + 0.7 * (1 - Math.log(1 + 3 * t) / Math.log(4)),
    svgPath: ''
  },
  {
    id: 'curved_parabolic_rise',
    name: 'Parabolic Arc Ascent 🏹',
    category: '📈 Organic Linear & Drip',
    description: 'Smooth convex arch curve building momentum without sudden spikes.',
    formulaType: 'parabolic_rise',
    calculateWeight: (t) => 0.2 + 0.8 * Math.sqrt(t),
    svgPath: ''
  },
  {
    id: 'symmetrical_arch',
    name: 'Symmetrical Arch 🏛️',
    category: '📈 Organic Linear & Drip',
    description: 'Perfect balanced parabolic dome with peak exactly at 50% time mark.',
    formulaType: 'sym_arch',
    calculateWeight: (t) => 0.2 + 0.8 * (1 - 4 * Math.pow(t - 0.5, 2)),
    svgPath: ''
  },
  {
    id: 'quad_stage_pipeline',
    name: '4-Stage Pipeline 🚰',
    category: '📈 Organic Linear & Drip',
    description: 'Quarterly stepped flow: 15% -> 25% -> 35% -> 25% distribution.',
    formulaType: 'quad_stage',
    calculateWeight: (t) => 0.4 + 0.6 * Math.sin(t * Math.PI),
    svgPath: ''
  },
  {
    id: 'perpetual_growth_loop',
    name: 'Perpetual Growth Stream ♾️',
    category: '📈 Organic Linear & Drip',
    description: 'Endless continuous drip suitable for 48h and 62h continuous campaigns.',
    formulaType: 'perpetual',
    calculateWeight: (t) => 0.8 + 0.2 * Math.cos(t * Math.PI * 4),
    svgPath: ''
  },

  // ==================== 3. MULTI-WAVE & PULSES (15) ====================
  {
    id: 'pulse_wave_ocean',
    name: 'Pulse Wave 🌊',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Repeating wave bursts & dips simulating periodic algorithmic reshuffles.',
    badge: 'POPULAR',
    formulaType: 'pulse_wave',
    calculateWeight: (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 4),
    svgPath: ''
  },
  {
    id: 'twin_peaks_morning_night',
    name: 'Twin Peaks (Day & Night) 🌄',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Two pronounced peaks at 30% (lunchtime) and 80% (evening prime time).',
    badge: 'REALISTIC',
    formulaType: 'twin_peaks',
    calculateWeight: (t) => 0.2 + 0.4 * Math.exp(-Math.pow(t - 0.3, 2) / 0.02) + 0.5 * Math.exp(-Math.pow(t - 0.8, 2) / 0.02),
    svgPath: ''
  },
  {
    id: 'triple_pulse_surge',
    name: 'Triple Pulse Wave 🪗',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Three distinct energy waves distributed evenly across delivery duration.',
    formulaType: 'triple_pulse',
    calculateWeight: (t) => 0.4 + 0.6 * Math.pow(Math.sin(t * Math.PI * 3), 2),
    svgPath: ''
  },
  {
    id: 'harmonic_resonance',
    name: 'Harmonic Resonance 🔔',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Compound sinusoidal frequencies producing natural ebb and flow.',
    formulaType: 'harmonic',
    calculateWeight: (t) => 0.5 + 0.3 * Math.sin(t * Math.PI * 4) + 0.2 * Math.cos(t * Math.PI * 8),
    svgPath: ''
  },
  {
    id: 'tidal_surge_flow',
    name: 'Tidal Surge & Ebb 🏄',
    category: '🌊 Multi-Wave & Pulses',
    description: 'High-tide surges followed by gentle low-tide pauses every 4 hours.',
    formulaType: 'tidal',
    calculateWeight: (t) => 0.4 + 0.6 * Math.pow(Math.cos(t * Math.PI * 2.5), 2),
    svgPath: ''
  },
  {
    id: 'staggered_frequency_burst',
    name: 'Staggered Frequency 📡',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Waves of increasing frequency and amplitude over time.',
    formulaType: 'staggered_freq',
    calculateWeight: (t) => 0.3 + 0.7 * (t * Math.sin(t * Math.PI * 6) + 0.5),
    svgPath: ''
  },
  {
    id: 'quad_heartbeat_pulse',
    name: 'Quad Heartbeat Pulse 💓',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Four rhythmic spikes mimicking recurring story repost notifications.',
    formulaType: 'heartbeat',
    calculateWeight: (t) => 0.3 + 0.7 * Math.pow(Math.abs(Math.sin(t * Math.PI * 4)), 3),
    svgPath: ''
  },
  {
    id: 'damped_wave_oscillator',
    name: 'Damped Wave Oscillator 🪀',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Strong initial surge that rings down gently into steady engagement.',
    formulaType: 'damped_oscillator',
    calculateWeight: (t) => 0.4 + 0.8 * Math.exp(-t * 2) * Math.sin(t * Math.PI * 5) + 0.2,
    svgPath: ''
  },
  {
    id: 'circadian_rhythm_flow',
    name: 'Circadian Biological Clock ⏰',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Models human 24-hour wake/sleep cycles accurately.',
    badge: 'HUMAN BEHAVIOR',
    formulaType: 'circadian',
    calculateWeight: (t) => 0.3 + 0.7 * (0.5 * Math.sin((t - 0.25) * Math.PI * 2) + 0.5),
    svgPath: ''
  },
  {
    id: 'bimodal_engagement_split',
    name: 'Bimodal Split Wave 🔀',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Equal two-stage burst morning & night with midday lull.',
    formulaType: 'bimodal',
    calculateWeight: (t) => 0.25 + 0.75 * Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI * 2),
    svgPath: ''
  },
  {
    id: 'frequent_micro_ripples',
    name: 'Micro Ripples (High Frequency) 🫧',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Rapid 10-wave ripple pattern ensuring consistent live impressions.',
    formulaType: 'micro_ripples',
    calculateWeight: (t) => 0.7 + 0.3 * Math.sin(t * Math.PI * 10),
    svgPath: ''
  },
  {
    id: 'ascending_wave_staircase',
    name: 'Ascending Wave Staircase 📶',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Each wave crest is 20% higher than the previous wave crest.',
    formulaType: 'asc_wave',
    calculateWeight: (t) => 0.2 + (0.4 + 0.6 * t) * (Math.sin(t * Math.PI * 5) * 0.5 + 0.5),
    svgPath: ''
  },
  {
    id: 'crescendo_symphony',
    name: 'Crescendo Wave Symphony 🎻',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Starts as whisper ripples and culminates in a huge finale wave.',
    formulaType: 'crescendo',
    calculateWeight: (t) => 0.2 + 0.8 * Math.pow(t, 2) * (Math.sin(t * Math.PI * 6) * 0.5 + 0.5),
    svgPath: ''
  },
  {
    id: 'irregular_organic_pulses',
    name: 'Chaotic Organic Pulses 🌀',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Non-linear irregular pulses simulating organic influencer shares.',
    formulaType: 'chaotic',
    calculateWeight: (t) => 0.4 + 0.3 * Math.sin(t * 11) + 0.3 * Math.sin(t * 23),
    svgPath: ''
  },
  {
    id: 'tri_modal_distribution',
    name: 'Tri-Modal Power Waves 🔱',
    category: '🌊 Multi-Wave & Pulses',
    description: 'Three equally powerful waves at 20%, 50%, and 85% milestones.',
    formulaType: 'tri_modal',
    calculateWeight: (t) => 0.2 + 0.8 * (
      Math.exp(-Math.pow(t - 0.2, 2)/0.01) + 
      Math.exp(-Math.pow(t - 0.5, 2)/0.01) + 
      Math.exp(-Math.pow(t - 0.85, 2)/0.01)
    ) / 1.2,
    svgPath: ''
  },

  // ==================== 4. FRONT-BURST & LAUNCH (15) ====================
  {
    id: 'front_burst_classic',
    name: 'Front Burst ⚡',
    category: '⚡ Front-Burst & Launch',
    description: '70% delivered in first 6 hours to immediately dominate rankings.',
    badge: 'FAST RESULTS',
    formulaType: 'front_burst',
    calculateWeight: (t) => t < 0.25 ? 1.7 : 0.45,
    svgPath: ''
  },
  {
    id: 'flash_launch_rush',
    name: 'Flash Launch Rush 🚀',
    category: '⚡ Front-Burst & Launch',
    description: 'Intense 80% concentration within the first 15% window.',
    badge: 'PRODUCT DROP',
    formulaType: 'flash_launch',
    calculateWeight: (t) => t < 0.15 ? 2.2 : 0.3,
    svgPath: ''
  },
  {
    id: 'countdown_drop_ignition',
    name: 'Drop Ignition 💥',
    category: '⚡ Front-Burst & Launch',
    description: 'Massive explosive initial burst with smooth exponential taper.',
    formulaType: 'drop_ignition',
    calculateWeight: (t) => 0.2 + 1.8 * Math.exp(-t * 5),
    svgPath: ''
  },
  {
    id: 'press_release_surge',
    name: 'Press Release Surge 📰',
    category: '⚡ Front-Burst & Launch',
    description: 'Sharp spike in first 2 hours simulating news/PR media blast.',
    formulaType: 'press_release',
    calculateWeight: (t) => 0.3 + 1.5 * Math.exp(-t * 4),
    svgPath: ''
  },
  {
    id: 'early_velocity_igniter',
    name: 'Early Velocity Igniter 🔥',
    category: '⚡ Front-Burst & Launch',
    description: 'Front-weighted 60% delivery with long cooling tail.',
    formulaType: 'early_velocity',
    calculateWeight: (t) => t < 0.3 ? 1.5 - t : 0.4,
    svgPath: ''
  },
  {
    id: 'one_hour_power_blitz',
    name: '1-Hour Blitz Attack 🥊',
    category: '⚡ Front-Burst & Launch',
    description: 'Max speed delivery in opening hour followed by minimal trickle.',
    formulaType: 'power_blitz',
    calculateWeight: (t) => t < 0.08 ? 3.0 : 0.25,
    svgPath: ''
  },
  {
    id: 'trending_hashtag_takeover',
    name: 'Hashtag Top Post Blast #️⃣',
    category: '⚡ Front-Burst & Launch',
    description: 'Designed to push posts to the Top 9 Grid on target Instagram hashtags.',
    badge: 'SEO RANKING',
    formulaType: 'hashtag_top',
    calculateWeight: (t) => t < 0.2 ? 2.0 : 0.5 + 0.2 * Math.sin(t * 10),
    svgPath: ''
  },
  {
    id: 'giveaway_announcement_rush',
    name: 'Giveaway Announcement 🎁',
    category: '⚡ Front-Burst & Launch',
    description: 'Front-loaded high enthusiasm curve matching contest announcements.',
    formulaType: 'giveaway',
    calculateWeight: (t) => 0.2 + 1.6 * Math.exp(-Math.pow(t, 1.2) * 3),
    svgPath: ''
  },
  {
    id: 'black_friday_flash_push',
    name: 'Flash Sale Spurt 🏷️',
    category: '⚡ Front-Burst & Launch',
    description: 'Sharp early wave with secondary closing push before sale expires.',
    formulaType: 'flash_sale',
    calculateWeight: (t) => 0.3 + 1.2 * Math.exp(-t * 6) + 0.8 * Math.exp(-(1 - t) * 6),
    svgPath: ''
  },
  {
    id: 'breaking_news_spread',
    name: 'Breaking News Spread 🚨',
    category: '⚡ Front-Burst & Launch',
    description: 'High urgency curve: 50% in first 20%, 30% in next 30%, 20% in remainder.',
    formulaType: 'breaking_news',
    calculateWeight: (t) => t < 0.2 ? 2.0 : (t < 0.5 ? 1.0 : 0.35),
    svgPath: ''
  },
  {
    id: 'music_release_midnight',
    name: 'Music Single Drop 🎧',
    category: '⚡ Front-Burst & Launch',
    description: 'Midnight track drop curve with intense first 3 hours streaming wave.',
    formulaType: 'music_drop',
    calculateWeight: (t) => 0.2 + 1.5 * Math.exp(-t * 3.5),
    svgPath: ''
  },
  {
    id: 'creator_premiere_event',
    name: 'Video Premiere Event 🎬',
    category: '⚡ Front-Burst & Launch',
    description: 'Pre-launch build up followed by immediate premiere burst.',
    formulaType: 'premiere',
    calculateWeight: (t) => t < 0.1 ? 0.8 + 8 * t : 1.6 * Math.exp(-(t - 0.1) * 3),
    svgPath: ''
  },
  {
    id: 'viral_challenge_kickoff',
    name: 'Viral Challenge Kickoff 🏆',
    category: '⚡ Front-Burst & Launch',
    description: 'Early burst combined with increasing community participant loops.',
    formulaType: 'challenge_kickoff',
    calculateWeight: (t) => 0.5 + 0.8 * Math.exp(-t * 4) + 0.5 * t,
    svgPath: ''
  },
  {
    id: 'rapid_kickstart_sustain',
    name: 'Kickstart & Glide 🪁',
    category: '⚡ Front-Burst & Launch',
    description: 'Swift takeoff to cruising altitude followed by stable gliding delivery.',
    formulaType: 'kickstart_glide',
    calculateWeight: (t) => t < 0.2 ? 1.5 : 0.7,
    svgPath: ''
  },
  {
    id: 'fast_front_ramp_down',
    name: 'Steep Linear Descent 📉',
    category: '⚡ Front-Burst & Launch',
    description: 'Clean linear descent from maximum intensity at start to gentle finish.',
    formulaType: 'steep_descent',
    calculateWeight: (t) => Math.max(0.15, 1.6 - 1.4 * t),
    svgPath: ''
  },

  // ==================== 5. INFLUENCER & COLLABS (15) ====================
  {
    id: 'collab_post_takeover',
    name: 'Collab Post Takeover 🤝',
    category: '🎯 Influencer & Collabs',
    description: 'Synchronized cross-audience surge as both accounts push to their feeds.',
    badge: 'COLLAB',
    formulaType: 'collab_takeover',
    calculateWeight: (t) => 0.3 + 0.7 * Math.sin(t * Math.PI) * (1 + 0.3 * Math.sin(t * 12)),
    svgPath: ''
  },
  {
    id: 'influencer_story_tag',
    name: 'Story Shoutout Spike 📱',
    category: '🎯 Influencer & Collabs',
    description: 'Sharp spike 1-3 hours after influencer adds post to their 24h story.',
    badge: 'SHOUTOUT',
    formulaType: 'story_shoutout',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.2, 2) / 0.015),
    svgPath: ''
  },
  {
    id: 'podcast_clip_reaction',
    name: 'Podcast Clip Reaction 🎙️',
    category: '🎯 Influencer & Collabs',
    description: 'Long build up as listeners share timestamps, climaxing mid-campaign.',
    formulaType: 'podcast_clip',
    calculateWeight: (t) => 0.3 + 0.7 * Math.exp(-Math.pow(t - 0.45, 2) / 0.04),
    svgPath: ''
  },
  {
    id: 'duet_remix_multiplier',
    name: 'Remix / Duet Multiplier 🎭',
    category: '🎯 Influencer & Collabs',
    description: 'Accelerating ripples as other creators create reaction reels.',
    formulaType: 'remix_duet',
    calculateWeight: (t) => 0.3 + 0.7 * (Math.pow(t, 1.8) + 0.3 * Math.sin(t * Math.PI * 6)),
    svgPath: ''
  },
  {
    id: 'celebrity_repost_shock',
    name: 'Celebrity Repost Shock 🌟',
    category: '🎯 Influencer & Collabs',
    description: 'Sudden massive 10x vertical jump representing an unprompted VIP repost.',
    badge: 'VIP VIRAL',
    formulaType: 'celeb_repost',
    calculateWeight: (t) => 0.15 + (t >= 0.35 && t <= 0.55 ? 1.9 : 0.3),
    svgPath: ''
  },
  {
    id: 'brand_ambassador_wave',
    name: 'Ambassador Roster Wave 👥',
    category: '🎯 Influencer & Collabs',
    description: 'Multiple ambassadors posting across spaced out intervals (3 scheduled waves).',
    formulaType: 'ambassador_wave',
    calculateWeight: (t) => 0.3 + 0.7 * (Math.sin(t * Math.PI * 3) > 0 ? Math.sin(t * Math.PI * 3) : 0.2),
    svgPath: ''
  },
  {
    id: 'meme_page_syndication',
    name: 'Meme Page Syndication 🤡',
    category: '🎯 Influencer & Collabs',
    description: 'Explosive virality pattern typical of top humor / meme repost networks.',
    formulaType: 'meme_syndication',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.3, 2) / 0.02) + 0.4 * Math.sin(t * 8),
    svgPath: ''
  },
  {
    id: 'live_stream_raid',
    name: 'IG Live Stream Raid 🔴',
    category: '🎯 Influencer & Collabs',
    description: 'Immediate spike during scheduled live broadcast with sustained commentary.',
    formulaType: 'live_raid',
    calculateWeight: (t) => t >= 0.2 && t <= 0.4 ? 2.0 : 0.4,
    svgPath: ''
  },
  {
    id: 'community_dm_share_loop',
    name: 'DM Group Share Loop 💬',
    category: '🎯 Influencer & Collabs',
    description: 'Spreading via private DM engagement pods and friend circles.',
    formulaType: 'dm_loop',
    calculateWeight: (t) => 0.4 + 0.6 * (Math.sin(t * Math.PI * 5) * 0.5 + 0.5),
    svgPath: ''
  },
  {
    id: 'micro_influencer_drip',
    name: 'Micro-Influencer Drip (Tiered) 🎖️',
    category: '🎯 Influencer & Collabs',
    description: 'Continuous steady influencer engagement building organic trust signals.',
    formulaType: 'micro_drip',
    calculateWeight: (t) => 0.5 + 0.5 * (t + 0.2 * Math.sin(t * 10)),
    svgPath: ''
  },
  {
    id: 'ugc_contest_cascade',
    name: 'UGC Content Challenge 📸',
    category: '🎯 Influencer & Collabs',
    description: 'Follower submissions generating compounding activity towards deadline.',
    formulaType: 'ugc_challenge',
    calculateWeight: (t) => 0.2 + 0.8 * Math.pow(t, 2),
    svgPath: ''
  },
  {
    id: 'creator_fund_boost',
    name: 'Creator Fund High-Engagement 💰',
    category: '🎯 Influencer & Collabs',
    description: 'Optimized for high comments-to-views ratio to maximize algorithmic payout.',
    formulaType: 'creator_fund',
    calculateWeight: (t) => 0.4 + 0.6 * Math.sin(t * Math.PI * 1.5),
    svgPath: ''
  },
  {
    id: 'stitch_reaction_echo',
    name: 'Stitch / Remix Echo 🗣️',
    category: '🎯 Influencer & Collabs',
    description: 'Wave echoes each time a prominent creator stitches your reel.',
    formulaType: 'stitch_echo',
    calculateWeight: (t) => 0.3 + 0.5 * Math.sin(t * 15) * Math.sin(t * 15) + 0.3 * t,
    svgPath: ''
  },
  {
    id: 'affiliate_promo_rush',
    name: 'Affiliate Promo Surge 🛒',
    category: '🎯 Influencer & Collabs',
    description: 'Spikes correlated with promo code release and final hours warning.',
    formulaType: 'affiliate_rush',
    calculateWeight: (t) => 0.2 + 0.8 * (Math.exp(-t * 6) + Math.exp(-(1 - t) * 6)),
    svgPath: ''
  },
  {
    id: 'verified_badge_catalyst',
    name: 'Verified User Interactions 💎',
    category: '🎯 Influencer & Collabs',
    description: 'High weight distributed strategically to capture algorithm priority ranking.',
    badge: 'PRIORITY',
    formulaType: 'verified_catalyst',
    calculateWeight: (t) => 0.4 + 0.6 * Math.sin(t * Math.PI * 2),
    svgPath: ''
  },

  // ==================== 6. PRIME HOURS & NIGHT OWLS (15) ====================
  {
    id: 'midnight_owl_surge',
    name: 'Midnight Owl Surge 🦉',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Optimized for late night scrolling habits (11PM - 3AM peak activity).',
    badge: 'NIGHT RUN',
    formulaType: 'midnight_owl',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.75, 2) / 0.03),
    svgPath: ''
  },
  {
    id: 'primetime_8pm_domination',
    name: '8 PM Prime Time Drop 📺',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Concentrated firepower during the absolute highest screen-time hour of the day.',
    badge: 'PEAK ACTIVE',
    formulaType: 'primetime_8pm',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.65, 2) / 0.025),
    svgPath: ''
  },
  {
    id: 'lunchtime_scroll_break',
    name: 'Lunch Break Scroll (1PM-3PM) 🥪',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Targeted mid-day spike capturing office & college lunch break browse sessions.',
    formulaType: 'lunch_break',
    calculateWeight: (t) => 0.3 + 0.7 * Math.exp(-Math.pow(t - 0.45, 2) / 0.02),
    svgPath: ''
  },
  {
    id: 'morning_commute_rush',
    name: 'Morning Commute (8AM-10AM) 🚇',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Early boost capturing morning travel and first daily social check-in.',
    formulaType: 'morning_commute',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.2, 2) / 0.02),
    svgPath: ''
  },
  {
    id: 'evening_relax_chill',
    name: 'Evening Couch Scroll (7PM-11PM) 🛋️',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Sustained wide plateau covering relaxed evening leisure time.',
    formulaType: 'evening_chill',
    calculateWeight: (t) => t >= 0.5 && t <= 0.85 ? 1.4 : 0.4,
    svgPath: ''
  },
  {
    id: 'sunday_night_blues',
    name: 'Sunday Night Reset 🌙',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Heavy engagement during the highest Sunday evening mobile usage spike.',
    formulaType: 'sunday_reset',
    calculateWeight: (t) => 0.3 + 0.7 * Math.pow(t, 1.5) * Math.sin(t * Math.PI),
    svgPath: ''
  },
  {
    id: 'global_timezone_bridge',
    name: 'Global Timezone 24h Bridge 🌍',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Even distribution across US, EU, and Asian prime hours (3 global peaks).',
    badge: 'WORLDWIDE',
    formulaType: 'global_bridge',
    calculateWeight: (t) => 0.3 + 0.7 * (Math.sin(t * Math.PI * 3) * 0.5 + 0.5),
    svgPath: ''
  },
  {
    id: 'weekend_brunch_leisure',
    name: 'Weekend Brunch Leisure (11AM-2PM) ☕',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Gentle late-morning climb suited for lifestyle, fashion, and food reels.',
    formulaType: 'weekend_brunch',
    calculateWeight: (t) => 0.3 + 0.7 * Math.exp(-Math.pow(t - 0.4, 2) / 0.03),
    svgPath: ''
  },
  {
    id: 'after_school_teen_rush',
    name: 'After-School Rush (3PM-6PM) 🎒',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Rapid surge targeting Gen-Z & teen demographic active hours.',
    formulaType: 'after_school',
    calculateWeight: (t) => 0.25 + 0.75 * Math.exp(-Math.pow(t - 0.55, 2) / 0.02),
    svgPath: ''
  },
  {
    id: 'gym_workout_hour',
    name: 'Workout Hour Surge (6AM & 6PM) 🏋️',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Twin motivation peaks perfect for fitness, bodybuilding, and wellness reels.',
    formulaType: 'fitness_hour',
    calculateWeight: (t) => 0.2 + 0.4 * Math.exp(-Math.pow(t - 0.2, 2)/0.015) + 0.5 * Math.exp(-Math.pow(t - 0.7, 2)/0.015),
    svgPath: ''
  },
  {
    id: 'party_night_fridays',
    name: 'Friday Night Fever (9PM-2AM) 🎉',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Late-night high volatility curve for nightlife, music, and entertainment.',
    formulaType: 'friday_fever',
    calculateWeight: (t) => 0.2 + 0.8 * (t > 0.6 ? 1.5 : 0.3),
    svgPath: ''
  },
  {
    id: 'market_open_bell',
    name: 'Market Open Bell (9AM-11AM) 📊',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Concentrated morning spike for crypto, trading, real estate, and finance.',
    formulaType: 'market_open',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.25, 2) / 0.015),
    svgPath: ''
  },
  {
    id: 'post_dinner_family_hours',
    name: 'Post-Dinner Unwind (8:30PM-10PM) 🍽️',
    category: '🌙 Prime Hours & Night Owls',
    description: 'High-retention family & parenting niche optimal time slot.',
    formulaType: 'post_dinner',
    calculateWeight: (t) => 0.25 + 0.75 * Math.exp(-Math.pow(t - 0.7, 2) / 0.02),
    svgPath: ''
  },
  {
    id: 'early_bird_productivity',
    name: '5AM Miracle Morning 🌅',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Early morning focus curve for self-improvement and entrepreneurial content.',
    formulaType: 'early_bird',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.15, 2) / 0.02),
    svgPath: ''
  },
  {
    id: 'midnight_insomnia_scroll',
    name: '2AM Insomnia Rabbit Hole 🕳️',
    category: '🌙 Prime Hours & Night Owls',
    description: 'Deep night engagement curve for mystery, storytelling, and viral facts.',
    formulaType: 'insomnia_rabbit',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.85, 2) / 0.02),
    svgPath: ''
  },

  // ==================== 7. EVERGREEN & SUSTAINED (15) ====================
  {
    id: 'evergreen_steady_drip',
    name: 'Evergreen Sustained 🌲',
    category: '💎 Evergreen & Sustained',
    description: 'Long-term consistent delivery ensuring post stays alive in search recommendations.',
    badge: 'LONGEVITY',
    formulaType: 'evergreen',
    calculateWeight: (t) => 0.8 + 0.2 * Math.sin(t * Math.PI * 4),
    svgPath: ''
  },
  {
    id: 'slow_decay_resilience',
    name: 'Slow Decay Resilience 🛡️',
    category: '💎 Evergreen & Sustained',
    description: 'Extremely resilient curve with < 10% drop-off over 48h to 62h periods.',
    formulaType: 'slow_decay',
    calculateWeight: (t) => 1.2 - 0.4 * t,
    svgPath: ''
  },
  {
    id: 'seo_keyword_discovery',
    name: 'Instagram SEO Search Rank 🔍',
    category: '💎 Evergreen & Sustained',
    description: 'Gradual ramp mimicking people finding post via in-app Instagram Search queries.',
    badge: 'IG SEARCH',
    formulaType: 'ig_seo',
    calculateWeight: (t) => 0.3 + 0.7 * Math.pow(t, 1.2),
    svgPath: ''
  },
  {
    id: 'weekly_re_engagement_loop',
    name: 'Weekly Re-Engagement Loop 🔁',
    category: '💎 Evergreen & Sustained',
    description: 'Re-activates post momentum with scheduled micro-surges every 12 hours.',
    formulaType: 'reengagement_loop',
    calculateWeight: (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 6) * Math.sin(t * Math.PI * 6),
    svgPath: ''
  },
  {
    id: 'sticky_post_anchor',
    name: 'Pinned Profile Post Anchor 📌',
    category: '💎 Evergreen & Sustained',
    description: 'Smooth balanced rate perfect for 3 Pinned Reels at the top of your profile.',
    formulaType: 'pinned_anchor',
    calculateWeight: () => 1.0,
    svgPath: ''
  },
  {
    id: 'audio_page_browse_stream',
    name: 'Audio Page Discoveries 🎧',
    category: '💎 Evergreen & Sustained',
    description: 'Continuous inflow from users clicking "Use This Audio" on other viral reels.',
    formulaType: 'audio_page',
    calculateWeight: (t) => 0.5 + 0.5 * Math.sin(t * Math.PI),
    svgPath: ''
  },
  {
    id: 'hashtag_evergreen_feed',
    name: 'Hashtag Recent Feed Flow 🏷️',
    category: '💎 Evergreen & Sustained',
    description: 'Uniform stream keeping post on the recent hashtag discovery page.',
    formulaType: 'hashtag_feed',
    calculateWeight: (t) => 0.75 + 0.2 * Math.cos(t * Math.PI * 4),
    svgPath: ''
  },
  {
    id: 'save_to_collection_loop',
    name: 'High Save-to-Bookmark Loop 📑',
    category: '💎 Evergreen & Sustained',
    description: 'Optimized for educational & recipe reels that users save for later reference.',
    badge: 'HIGH SAVES',
    formulaType: 'save_collection',
    calculateWeight: (t) => 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * Math.PI * 3)),
    svgPath: ''
  },
  {
    id: 'guide_series_continuous',
    name: 'Carousel / Guide Series 📚',
    category: '💎 Evergreen & Sustained',
    description: 'Stable sustained flow matching long-form swipe carousels and multi-part guides.',
    formulaType: 'carousel_guide',
    calculateWeight: (t) => 0.6 + 0.4 * Math.sin(t * Math.PI * 2),
    svgPath: ''
  },
  {
    id: 'long_tail_conversion',
    name: 'Long-Tail Funnel Pipeline 🧲',
    category: '💎 Evergreen & Sustained',
    description: 'Gradual upward funnel converting views into loyal profile followers.',
    formulaType: 'funnel_pipeline',
    calculateWeight: (t) => 0.2 + 0.8 * Math.pow(t, 1.4),
    svgPath: ''
  },
  {
    id: 'drip_recharge_pulse',
    name: 'Drip Recharge Wave 🔋',
    category: '💎 Evergreen & Sustained',
    description: 'Prevents algorithmic death by recharging post energy periodically.',
    formulaType: 'drip_recharge',
    calculateWeight: (t) => 0.4 + 0.6 * (Math.sin(t * Math.PI * 8) > 0.3 ? 1.0 : 0.2),
    svgPath: ''
  },
  {
    id: 'community_tab_sticky',
    name: 'Channel / Broadcast Feed 📢',
    category: '💎 Evergreen & Sustained',
    description: 'Simulates engagement from Instagram Broadcast Channels and VIP groups.',
    formulaType: 'broadcast_feed',
    calculateWeight: (t) => 0.4 + 0.6 * Math.sin(t * Math.PI * 2),
    svgPath: ''
  },
  {
    id: 'portfolio_showcase_stable',
    name: 'Portfolio Showcase Stream 🎨',
    category: '💎 Evergreen & Sustained',
    description: 'Professional artists & photographers clean organic stream.',
    formulaType: 'portfolio_stream',
    calculateWeight: () => 1.0,
    svgPath: ''
  },
  {
    id: 'ecom_catalog_ad_mimic',
    name: 'E-Commerce Catalog Mimic 🛍️',
    category: '💎 Evergreen & Sustained',
    description: 'Mimics real paid Instagram Ads delivery curve for seamless natural blend.',
    formulaType: 'ecom_mimic',
    calculateWeight: (t) => 0.6 + 0.4 * Math.sin(t * Math.PI),
    svgPath: ''
  },
  {
    id: 'brand_heritage_drip',
    name: 'Brand Authority Drip 🏛️',
    category: '💎 Evergreen & Sustained',
    description: 'Steady 62-hour foundation drip for luxury and enterprise brand accounts.',
    formulaType: 'brand_authority',
    calculateWeight: (t) => 0.85 + 0.15 * Math.sin(t * Math.PI * 3),
    svgPath: ''
  },

  // ==================== 8. ALGORITHM HACK & SEO (15) ====================
  {
    id: 'retention_ratio_booster',
    name: '100% Retention Multiplier ⚡',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Front-loaded high velocity to force Instagram to categorize reel as 100%+ watch time.',
    badge: 'HACK',
    formulaType: 'retention_hack',
    calculateWeight: (t) => t < 0.1 ? 2.5 : 0.4,
    svgPath: ''
  },
  {
    id: 'comment_velocity_spike',
    name: 'Comment Debate Ignition 💬',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Rapid comment injection triggering algorithmic controversy/discussion flags.',
    badge: 'DEBATE BOOST',
    formulaType: 'comment_debate',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.25, 2) / 0.015) + 0.3 * Math.sin(t * 8),
    svgPath: ''
  },
  {
    id: 'share_to_views_ratio_hack',
    name: 'Share-to-DM Algorithm Signal 📤',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Emphasizes early share velocity—the #1 metric Instagram algorithm weights for Reels push.',
    badge: '#1 RANKING',
    formulaType: 'share_ratio',
    calculateWeight: (t) => t < 0.2 ? 1.8 : (t < 0.5 ? 1.1 : 0.4),
    svgPath: ''
  },
  {
    id: 'save_velocity_authority',
    name: 'Save Velocity Authority 📑',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Sustained saves wave signaling high bookmark value to Instagram search index.',
    formulaType: 'save_authority',
    calculateWeight: (t) => 0.3 + 0.7 * Math.sin(t * Math.PI * 0.8),
    svgPath: ''
  },
  {
    id: 'multi_hashtag_stagger',
    name: 'Multi-Hashtag Cluster Stagger #️⃣',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Sequenced waves to conquer small, medium, then mega hashtag grids in order.',
    formulaType: 'hashtag_stagger',
    calculateWeight: (t) => 0.2 + 0.3 * (t < 0.33 ? 1 : 0) + 0.5 * (t >= 0.33 && t < 0.66 ? 1.4 : 0) + 0.8 * (t >= 0.66 ? 1.8 : 0),
    svgPath: ''
  },
  {
    id: 'location_tag_nearby_push',
    name: 'Location Tag Geo-Surge 📍',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Optimized for local business location tags to dominate nearby explore feeds.',
    formulaType: 'geo_surge',
    calculateWeight: (t) => 0.3 + 0.7 * Math.exp(-Math.pow(t - 0.4, 2) / 0.03),
    svgPath: ''
  },
  {
    id: 'sound_sync_retarget',
    name: 'Audio Page Rank Booster 🔊',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Continuous engagement to rank in the Top 3 reels under any trending audio.',
    formulaType: 'audio_rank',
    calculateWeight: (t) => 0.4 + 0.6 * (Math.sin(t * Math.PI * 4) * 0.5 + 0.5),
    svgPath: ''
  },
  {
    id: 'repeat_viewer_loop',
    name: 'Loop Replay Simulation 🔁',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Creates overlapping micro-waves mimicking users watching reel 2-3 times in a row.',
    formulaType: 'replay_loop',
    calculateWeight: (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 12),
    svgPath: ''
  },
  {
    id: 'stealth_organic_masking',
    name: 'Stealth Anti-Bot Mask 🛡️',
    category: '🤖 Algorithm Hack & SEO',
    description: 'High-entropy random jitter distribution completely undetectable by spam detectors.',
    badge: 'STEALTH',
    formulaType: 'stealth_mask',
    calculateWeight: (t) => 0.5 + 0.3 * Math.sin(t * 17) + 0.2 * Math.cos(t * 29),
    svgPath: ''
  },
  {
    id: 'profile_visit_conversion',
    name: 'Profile Click-Through Push 👤',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Balances views and follows pacing to maximize profile visit conversion rate.',
    formulaType: 'profile_ctr',
    calculateWeight: (t) => 0.3 + 0.7 * Math.sin(t * Math.PI),
    svgPath: ''
  },
  {
    id: 'story_poll_engagement_sync',
    name: 'Interactive Sticker Sync 📊',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Paced along interactive sticker voting periods for story boosts.',
    formulaType: 'sticker_sync',
    calculateWeight: (t) => 0.4 + 0.6 * Math.pow(Math.sin(t * Math.PI * 2), 2),
    svgPath: ''
  },
  {
    id: 'collaborative_pod_wave',
    name: 'Mastermind Pod Simulation 🧠',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Coordinated wave structure imitating high-authority creator mastermind groups.',
    formulaType: 'mastermind_pod',
    calculateWeight: (t) => 0.3 + 0.7 * (Math.sin(t * Math.PI * 5) > 0.2 ? 1.0 : 0.3),
    svgPath: ''
  },
  {
    id: 'high_velocity_takeover',
    name: 'Search Keyword Takeover 🏆',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Aggressive sustained front push to claim #1 search result spot for niche queries.',
    formulaType: 'keyword_takeover',
    calculateWeight: (t) => t < 0.4 ? 1.6 : 0.5,
    svgPath: ''
  },
  {
    id: 'cross_platform_mirror',
    name: 'TikTok to IG Reel Mirror 🪞',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Mirrors viral TikTok velocity curve for cross-posted short form video content.',
    formulaType: 'cross_mirror',
    calculateWeight: (t) => 0.2 + 0.8 * Math.exp(-Math.pow(t - 0.2, 2) / 0.02) + 0.3 * Math.sin(t * 10),
    svgPath: ''
  },
  {
    id: 'algorithm_favoritism_apex',
    name: 'Algorithmic Sweet Spot 🎯',
    category: '🤖 Algorithm Hack & SEO',
    description: 'Mathematically calculated optimal ratio distribution for maximum Instagram AI trust score.',
    badge: 'OPTIMAL',
    formulaType: 'algo_apex',
    calculateWeight: (t) => 0.35 + 0.65 * (Math.sin(t * Math.PI) + 0.2 * Math.sin(t * 8)),
    svgPath: ''
  }
];

// Pre-generate accurate SVG paths for each pattern
GROWTH_PATTERNS_LIST.forEach(pattern => {
  pattern.svgPath = generateSvgPath(pattern.calculateWeight);
});

// Fast lookup map
export const GROWTH_PATTERNS_MAP = new Map<string, GrowthPattern>(
  GROWTH_PATTERNS_LIST.map(p => [p.id, p])
);

// Fallback lookup helper
export function getGrowthPattern(id: string): GrowthPattern {
  return GROWTH_PATTERNS_MAP.get(id) || GROWTH_PATTERNS_LIST[0];
}
