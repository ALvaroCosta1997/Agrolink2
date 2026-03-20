import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export const PHONE_COUNTRIES = [
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+34',  flag: '🇪🇸', name: 'Espanha' },
  { code: '+33',  flag: '🇫🇷', name: 'França' },
];

interface PhoneCountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  /** Extra classes applied to the trigger button */
  className?: string;
}

export function PhoneCountrySelect({ value, onChange, className }: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = PHONE_COUNTRIES.find(c => c.code === value) ?? PHONE_COUNTRIES[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'h-16 bg-slate-100 border-2 rounded-2xl font-black text-sm text-slate-700',
          'flex items-center justify-center gap-1.5 px-4',
          'hover:border-primary/30 active:scale-95 transition-all whitespace-nowrap',
          open ? 'border-primary/40' : 'border-slate-100',
          className,
        )}
      >
        <span className="text-xl leading-none">{selected.flag}</span>
        <span className="tracking-tight">{selected.code}</span>
        <svg className={cn('w-3 h-3 text-slate-400 transition-transform', open && 'rotate-180')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[190px]">
          {PHONE_COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                c.code === value
                  ? 'bg-primary/5 hover:bg-primary/10'
                  : 'hover:bg-slate-50',
              )}
            >
              <span className="text-xl leading-none shrink-0">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-secondary text-xs uppercase tracking-widest leading-none">{c.name}</p>
                <p className="font-bold text-slate-400 text-xs mt-0.5">{c.code}</p>
              </div>
              {c.code === value && (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
