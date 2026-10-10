import { Wine, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

type Props = {
  onStart: () => void;
  onAdmin: () => void;
};

export default function WelcomePage({ onStart, onAdmin }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 bg-hero-image">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-jamun-600/30 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-mint-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-jamun-500/20 rounded-full blur-3xl" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-[#32104b]/45 via-[#29103d]/65 to-[#100b1b]/95" />

      <div className="relative z-10 text-center max-w-2xl animate-fade-in-up">
        {/* Logo badge */}
        <div className="inline-flex items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-mint-400/30 blur-xl rounded-full" />
            
              <div className="relative w-24 h-24 bg-gradient-to-br from-jamun-700 to-jamun-950 rounded-3xl flex items-center justify-center border border-mint-400/30 shadow-2xl animate-float">
                <img
                  src="/images/logo.png"
                  alt="Jamun Logo"
                  className="w-16 h-16 object-contain"
                />
              </div>

          </div>
        </div>

        {/* Brand name */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-mint-300" />
          <span className="text-mint-300 text-sm font-medium tracking-[0.3em] uppercase">Smirnoff</span>
          <Sparkles className="w-5 h-5 text-mint-300" />
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-2 leading-tight text-balance">
          Minty Jamun
        </h1>
        <p className="font-display text-2xl md:text-3xl text-mint-300 mb-2 italic">
          Activity Reporting
        </p>
        <p className="text-jamun-200 text-base md:text-lg max-w-md mx-auto mb-10 leading-relaxed">
          Live field reporting portal for the Smirnoff Minty Jamun promotional campaign across Gurugram locations.
        </p>

        {/* CTA */}
        <button
          onClick={onStart}
          className="group inline-flex items-center gap-3 bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-400 hover:to-mint-500 text-jamun-950 font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-mint-500/20 hover:shadow-mint-500/40 hover:scale-105"
        >
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Location chips */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs">
          {['TLW IFFCO Chowk', 'TLW DLF Phase 3', 'PRIVE DLF', 'Bajghera Chowk'].map((loc) => (
            <span key={loc} className="px-3 py-1.5 bg-jamun-800/50 border border-jamun-600/30 rounded-full text-jamun-200">
              {loc}
            </span>
          ))}
        </div>

        <button onClick={onAdmin} className="mt-7 inline-flex items-center gap-2 text-xs text-white/65 hover:text-mint-200 transition-colors">
          <ShieldCheck className="w-4 h-4" /> Supervisor admin access
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-jamun-300/50 text-xs">
        Field Reporting System &middot; 2 PM - 10 PM Daily
      </div>
    </div>
  );
}
