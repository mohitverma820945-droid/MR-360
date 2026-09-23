import React, { useState } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  Clock, 
  Sparkles, 
  Server, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Sliders, 
  Lock, 
  Check, 
  HelpCircle,
  BarChart3,
  Flame,
  Activity,
  Globe,
  Star,
  Users
} from 'lucide-react';
import { GROWTH_PATTERNS_LIST, GrowthPattern } from '../data/growthPatterns';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [activePatternIndex, setActivePatternIndex] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState('24h');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const featuredPatterns: GrowthPattern[] = GROWTH_PATTERNS_LIST.slice(0, 6);
  const currentPattern: GrowthPattern = GROWTH_PATTERNS_LIST[activePatternIndex] || GROWTH_PATTERNS_LIST[0];

  const faqs = [
    {
      q: 'How does the Organic Natural Scheduling algorithm protect my account?',
      a: 'Unlike traditional SMM panels that dump 10,000 views in 60 seconds (which triggers Instagram shadowbans), our engine dynamically segments deliveries across 6h–62h duration windows using Gaussian curves and mathematical jitter. Every batch has organic varying quantities (e.g. 312 views, then 485 views, then 210 views).'
    },
    {
      q: 'Can I connect my own wholesale SMM Panel API keys?',
      a: 'Yes! Our Bring-Your-Own-Provider (BYOP) engine allows you to connect any standard SMM API v2 panel (JustAnotherPanel, SMMGlobe, etc.). All your orders and scheduled runs will dispatch directly through your own keys at 0% markup.'
    },
    {
      q: 'What are the 100+ Viral Instagram Patterns?',
      a: 'We engineered mathematical delivery models based on real viral reels: Front-Loaded Explore Push, Prime-Time Evening Surges, Steady Drip Retention, Weekend Viral Waveform, and 95+ other algorithmic profiles.'
    },
    {
      q: 'Are exact quantities guaranteed across scheduled runs?',
      a: 'Yes! We use the Hamilton Largest-Remainder theorem so every single unit ordered is accounted for, while ensuring each individual batch arrives in dynamic, non-flat batches.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-pink-500 selection:text-white overflow-hidden">
      
      {/* Background Ambient Pink / Rose Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-pink-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 right-0 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Top Bar Header (Zone 1 Wordmark, Zone 2 Clean Nav, Zone 3 Actions) */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Brand Wordmark */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src="/mr360_logo.jpg" 
                alt="MR.360 Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-white">
                MR.<span className="text-amber-500">360</span>
              </span>
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/50">
                SMM PANEL
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-pink-400 transition-colors">Features</a>
            <a href="#patterns" className="hover:text-pink-400 transition-colors">100+ Patterns</a>
            <a href="#all-in-one" className="hover:text-pink-400 transition-colors">Organic Engine</a>
            <a href="#pricing" className="hover:text-pink-400 transition-colors">Wholesale Pricing</a>
            <a href="#faq" className="hover:text-pink-400 transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-lg shadow-pink-600/30 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          {/* Official MR.360 3D Emblem Showcase */}
          <div className="flex justify-center mb-2">
            <div className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition duration-1000 animate-pulse" />
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1 bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 shadow-2xl shadow-amber-500/50 flex items-center justify-center overflow-hidden">
                <img 
                  src="/mr360_logo.jpg" 
                  alt="MR.360 SMM Panel Logo" 
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          {/* Top Pill Kicker */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-pink-950/60 border border-pink-500/30 text-pink-300 text-xs font-bold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>Next-Gen Organic SMM Delivery Engine · Anti-Ban Safe Pacing</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Scale Viral Social Reach With <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent">Organic Algorithmic Curves</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Stop flat robotic drops that get flagged. MR.360 distributes Views, Likes, Comments, Shares & Saves across 100+ proven Instagram viral delivery patterns with dynamic non-equal batches and direct SMM API execution.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-pink-600/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4 text-pink-400" />
              <span>Sign In to Dashboard</span>
            </button>
          </div>

          {/* Live Trust Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10">
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-1">
              <div className="text-2xl font-black text-white font-mono">100+</div>
              <div className="text-xs text-slate-400">Viral Growth Patterns</div>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-1">
              <div className="text-2xl font-black text-pink-400 font-mono">6h - 62h</div>
              <div className="text-xs text-slate-400">Custom Time Durations</div>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-1">
              <div className="text-2xl font-black text-emerald-400 font-mono">0% Markup</div>
              <div className="text-xs text-slate-400">Wholesale SMM Rates</div>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-1">
              <div className="text-2xl font-black text-rose-400 font-mono">100%</div>
              <div className="text-xs text-slate-400">Exact Quantity Guarantee</div>
            </div>
          </div>

        </div>
      </section>

      {/* INTERACTIVE ALGORITHM SIMULATION SHOWCASE */}
      <section id="all-in-one" className="relative z-10 py-16 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              The All-in-One Organic Delivery Engine
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Simulate realistic human behavior. Balance views with corresponding likes, comments, shares, and saves delivered at mathematically modulated intervals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Interactive Curve Visualizer */}
            <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">Live Delivery Simulation</span>
                  <h3 className="text-lg font-black text-white">{currentPattern.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {['6h', '12h', '24h', '48h', '62h'].map(dur => (
                    <button
                      key={dur}
                      onClick={() => setSelectedDuration(dur)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedDuration === dur 
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic SVG Waveform */}
              <div className="h-52 w-full bg-slate-950 rounded-2xl p-4 border border-slate-800/80 relative flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Start (0h)</span>
                  <span className="text-pink-400 font-bold">{currentPattern.badge || 'Viral Curve'}</span>
                  <span>End ({selectedDuration})</span>
                </div>

                <div className="w-full h-32 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={`${currentPattern.svgPath} L 100,40 L 0,40 Z`} fill="url(#pinkGrad)" />
                    <path d={currentPattern.svgPath} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900 pt-1">
                  <span>Entropy Variance: &plusmn;15% Natural Jitter</span>
                  <span className="text-emerald-400 font-bold">100% Guaranteed Sum</span>
                </div>
              </div>

              {/* Dynamic Metric Run Quantities Preview */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <div className="font-bold text-white">10,000</div>
                  <div className="text-[10px] text-slate-500">Views</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <Heart className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                  <div className="font-bold text-white">432</div>
                  <div className="text-[10px] text-slate-500">Likes</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <MessageSquare className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <div className="font-bold text-white">91</div>
                  <div className="text-[10px] text-slate-500">Comments</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <Share2 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <div className="font-bold text-white">322</div>
                  <div className="text-[10px] text-slate-500">Shares</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <Bookmark className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <div className="font-bold text-white">317</div>
                  <div className="text-[10px] text-slate-500">Saves</div>
                </div>
              </div>
            </div>

            {/* Pattern Selection Column */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                Select Curve Pattern to Test
              </span>
              <div className="space-y-2.5">
                {featuredPatterns.map((pat, idx) => (
                  <button
                    key={pat.id}
                    onClick={() => setActivePatternIndex(idx)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      activePatternIndex === idx
                        ? 'bg-gradient-to-r from-pink-950/60 to-rose-950/40 border-pink-500 shadow-lg shadow-pink-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{pat.name}</span>
                        {pat.badge && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-pink-900/80 text-pink-300">
                            {pat.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{pat.description}</p>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                      activePatternIndex === idx ? 'border-pink-500 bg-pink-500' : 'border-slate-600'
                    }`}>
                      {activePatternIndex === idx && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* BYOP (BRING YOUR OWN PROVIDER) HIGHLIGHT */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/40 border border-pink-500/20 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold">
              <Server className="w-3.5 h-3.5" />
              <span>Customer SMM API Integration</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Connect Any SMM Provider API Key
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every customer account has full access to add their own custom SMM Panel API keys and URLs. You get the luxury of our Organic Pacing &amp; 100+ Viral Curves while dispatching orders directly to your existing provider balance at true wholesale pricing.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onOpenAuth('register')}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs rounded-xl shadow-lg shadow-pink-600/25 cursor-pointer"
              >
                Connect Provider in Dashboard &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">Everything you need to know about organic SMM delivery</p>
        </div>

        <div className="space-y-3 pt-4">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 transition-all cursor-pointer"
              onClick={() => setActiveFaq(activeFaq === i ? null : i)}
            >
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <span>{f.q}</span>
                <span className="text-pink-400 text-lg font-mono ml-3">{activeFaq === i ? '−' : '+'}</span>
              </div>
              {activeFaq === i && (
                <p className="text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-3 leading-relaxed">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="py-20 relative z-10 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Ready to Run Organic Social Campaigns?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Create your account in seconds. Access 100+ viral patterns, connect your SMM provider, and schedule orders with zero risk of flat-drop shadowbans.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-pink-600/30 cursor-pointer flex items-center space-x-2"
            >
              <span>Get Started Now (No OTP Required)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5 font-bold text-slate-400">
            <div className="w-6 h-6 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 overflow-hidden shrink-0">
              <img 
                src="/mr360_logo.jpg" 
                alt="MR.360 Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <span>MR.360 SMM &copy; {new Date().getFullYear()} · All rights reserved.</span>
          </div>
          <div className="flex space-x-6 text-slate-500">
            <span className="hover:text-pink-400 cursor-pointer" onClick={() => onOpenAuth('login')}>Sign In</span>
            <span className="hover:text-pink-400 cursor-pointer" onClick={() => onOpenAuth('register')}>Register</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
