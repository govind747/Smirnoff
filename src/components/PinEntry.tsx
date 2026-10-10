import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Lock, ArrowRight, Wine } from 'lucide-react';

type Props = {
  locationName: string;
  onSubmit: (pin: string) => void;
  onBack: () => void;
  error: string | null;
  verifying: boolean;
};

export default function PinEntry({ locationName, onSubmit, onBack, error, verifying }: Props) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }

    if (value && index === 3) {
      const pin = newDigits.join('');
      if (pin.length === 4) {
        onSubmit(pin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d{4}$/.test(pasted)) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      onSubmit(pasted);
    }
  };

  const pinComplete = digits.every((d) => d !== '');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-jamun-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/3 w-60 h-60 bg-mint-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-jamun-300 hover:text-mint-300 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Change Location
        </button>

        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-mint-400/20 blur-lg rounded-full" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-jamun-700 to-jamun-950 rounded-2xl flex items-center justify-center border border-mint-400/30">
                <Lock className="w-7 h-7 text-mint-300" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Wine className="w-4 h-4 text-mint-400" />
            <span className="text-mint-300 text-xs font-medium tracking-wider uppercase">
              {locationName}
            </span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white mb-2">
            Enter Your PIN
          </h2>
          <p className="text-jamun-200 text-sm">
            Enter your 4-digit location PIN to access the reporting dashboard
          </p>
        </div>

        {/* PIN inputs */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { refs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={verifying}
              className={`w-16 h-20 text-center text-2xl font-bold rounded-2xl bg-jamun-800/60 border-2 transition-all duration-200 outline-none
                ${digit
                  ? 'border-mint-400/60 text-mint-200 bg-mint-500/5'
                  : 'border-jamun-600/40 text-white'
                }
                focus:border-mint-400 focus:bg-mint-500/10 focus:scale-110
                disabled:opacity-50
              `}
              placeholder="•"
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center mb-6 animate-scale-in">
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => pinComplete && onSubmit(digits.join(''))}
          disabled={!pinComplete || verifying}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-400 hover:to-mint-500 disabled:from-jamun-700 disabled:to-jamun-800 disabled:text-jamun-400 text-jamun-950 font-semibold py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-mint-500/20 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {verifying ? (
            <>
              <div className="w-5 h-5 border-2 border-jamun-950 border-t-transparent rounded-full animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify & Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-jamun-300/50 text-xs mt-6">
          Contact your supervisor if you don't have your location PIN
        </p>
      </div>
    </div>
  );
}
