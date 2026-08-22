import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, MapPin, Scale, Wrench, ShieldAlert, Sparkles, ArrowRight, Activity, Recycle } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      
      {/* 1. HERO SECTION (Squarespace Split Layout) */}
      <section className="relative overflow-hidden pt-12 pb-24 border-b border-zinc-150">
        {/* Ambient Glowing Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-primary-400/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/50 w-fit mb-8 animate-fade-in shadow-sm">
                <Recycle className="h-3.5 w-3.5 text-emerald-600 animate-spin-slow" /> Hackathon MVP - Circular Economy
              </span>
              
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light text-zinc-950 tracking-tight leading-none">
                Understand what's <span className="font-serif italic font-normal text-primary-600">broken</span>.<br />
                Know if it's worth <span className="font-serif italic font-normal text-zinc-950">repairing</span>.<br />
                Find the right <span className="font-serif italic font-normal text-zinc-950">technician</span>.
              </h1>
              
              <p className="mt-8 text-sm sm:text-base text-zinc-500 max-w-xl leading-relaxed">
                RepairConnect blends Google Gemini AI, structured worthiness diagnostics, and geo-spatial routing to extend product lifecycles, verify technician credentials, and reduce e-waste.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="bg-zinc-950 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-zinc-900 transition-all hover:scale-[1.02] active:scale-[0.98] text-center text-sm border border-zinc-950 flex items-center justify-center gap-2"
                >
                  Analyze Damaged Item <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="bg-white text-zinc-800 font-semibold px-8 py-4 rounded-xl hover:bg-zinc-50 transition-all hover:scale-[1.02] active:scale-[0.98] text-center text-sm border border-zinc-250 flex items-center justify-center gap-2"
                >
                  Local Repair Shops
                </Link>
              </div>
            </div>

            {/* Right Mockup Column (Dribbble Glassmorphic UI Showcase) */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200/20 to-primary-100/30 rounded-3xl blur-2xl transform rotate-6 scale-95 pointer-events-none" />
              
              {/* Glassmorphic Widget Container */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-zinc-150 rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition-transform duration-500">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary-500" /> AI Diagnostic Report
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">MacBook Pro 14"</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Diagnosed via Gemini 1.5</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
                      Score: 88/100
                    </span>
                  </div>

                  {/* Worthiness decision bar */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Worthiness Verdict</span>
                      <span className="text-[10px] font-bold text-emerald-600">Highly Recommended</span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>

                  {/* Metrics Comparison Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="border border-zinc-100 p-3 rounded-xl">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">Est. Repair Cost</p>
                      <p className="text-sm font-extrabold text-zinc-900 mt-0.5">₹3,500 - ₹7,000</p>
                    </div>
                    <div className="border border-zinc-100 p-3 rounded-xl">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">Replacement Cost</p>
                      <p className="text-sm font-extrabold text-zinc-400 line-through mt-0.5">₹1,20,000</p>
                    </div>
                  </div>

                  {/* Eco Impact Indicator */}
                  <div className="flex items-center gap-3 border-t border-zinc-100 pt-4 mt-2 text-xs">
                    <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-bold text-zinc-800">~220 kg CO₂ Saved</p>
                      <p className="text-[10px] text-zinc-400">Equivalent to planting 10 saplings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (Squarespace Editorial Grid Layout) */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-4xl font-light text-zinc-950 tracking-tight">
              A Seamless <span className="font-serif italic font-normal text-primary-600">Lifecycle</span> Loop
            </h2>
            <p className="text-zinc-500 text-sm mt-3">From instant diagnosis to scheduling local repairs, all under one platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-zinc-200">
            
            {/* Step 1 */}
            <div className="bg-white p-10 border-r border-b border-zinc-200 flex flex-col gap-6 hover:bg-zinc-50/50 transition-all duration-300">
              <span className="font-serif italic text-6xl text-zinc-200">01</span>
              <div className="flex flex-col gap-3">
                <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                  <Camera className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-zinc-900">Upload & AI Diagnosed</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Provide an image or video description. Gemini analyses faults, lists probable causes, checks safety criteria, and generates troubleshooting guides.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-10 border-r border-b border-zinc-200 flex flex-col gap-6 hover:bg-zinc-50/50 transition-all duration-300">
              <span className="font-serif italic text-6xl text-zinc-200">02</span>
              <div className="flex flex-col gap-3">
                <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                  <Scale className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-zinc-900">Worthiness Metrics</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Evaluate price ranges against typical service index benchmarks. Access immediate sustainability impact indices and prevent electronic waste.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-10 border-r border-b border-zinc-200 flex flex-col gap-6 hover:bg-zinc-50/50 transition-all duration-300">
              <span className="font-serif italic text-6xl text-zinc-200">03</span>
              <div className="flex flex-col gap-3">
                <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                  <MapPin className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-zinc-900">Geo-spatial Booking</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Find local certified shops. Map spherical distance checks, compare repair rates, submit dates, authorize estimates, and track workflows dynamically.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. SAFETY GUARANTEE (Stark Deep-Dark Contrast Section) */}
      <section className="py-24 bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-950/20 blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            <span className="p-3.5 bg-white/5 border border-white/10 text-emerald-400 rounded-2xl mb-8">
              <Wrench className="h-6 w-6" />
            </span>
            
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white leading-none">
              Rigorous <span className="font-serif italic font-normal text-emerald-400">Safety Verification</span>
            </h2>
            
            <p className="mt-6 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
              We separate simple DIY maintenance from professional tasks. For power modules, battery swaps, and dangerous casings, the platform restricts self-repair steps and directs you directly to verified repairers.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold">
              <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-zinc-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Certified Technicians
              </span>
              <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-zinc-200">
                <ShieldAlert className="h-4 w-4 text-orange-400" /> Real-time Hazard Alerting
              </span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
