import { MapPin, ArrowLeft, ArrowRight, Wine } from 'lucide-react';
import type { Location } from '@/lib/supabase';

type Props = {
  locations: Location[];
  onSelect: (location: Location) => void;
  onBack: () => void;
  loading: boolean;
};

const ICONS = [
  '🏪',
  '🏬',
  '🏛️',
  '🛣️',
];

export default function LocationSelect({ locations, onSelect, onBack, loading }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-jamun-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-60 h-60 bg-mint-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-jamun-300 hover:text-mint-300 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Welcome
        </button>

        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-jamun-700 to-jamun-950 rounded-2xl flex items-center justify-center border border-mint-400/20">
              <Wine className="w-7 h-7 text-mint-300" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
            Who is logging in?
          </h2>
          <p className="text-jamun-200 text-sm">
            Select your location to continue
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-10 h-10 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-jamun-300 text-sm">Loading locations...</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.map((loc, idx) => (
              <button
                key={loc.id}
                onClick={() => onSelect(loc)}
                className="group relative overflow-hidden text-left p-6 rounded-2xl bg-gradient-to-br from-jamun-800/80 to-jamun-900/80 border border-jamun-600/30 hover:border-mint-400/50 transition-all duration-300 hover:scale-[1.02] animate-scale-in"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-mint-500/0 to-mint-500/0 group-hover:from-mint-500/5 group-hover:to-mint-400/5 transition-all duration-500" />

                <div className="relative flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-jamun-700/50 group-hover:bg-mint-500/20 rounded-xl flex items-center justify-center transition-colors duration-300">
                    <span className="text-2xl">{ICONS[idx] ?? '📍'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-mint-300 text-xs font-semibold tracking-wider">
                        LOCATION {loc.id}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-lg leading-snug group-hover:text-mint-100 transition-colors">
                      {loc.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2 text-jamun-300 text-xs">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Purbna</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-jamun-500 group-hover:text-mint-300 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
