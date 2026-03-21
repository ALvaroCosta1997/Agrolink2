import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu'
];

interface DistritoSelectProps {
  value: string;
  onChange: (district: string) => void;
  className?: string;
}

export function DistritoSelect({ value, onChange, className }: DistritoSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all',
          'font-bold text-sm uppercase tracking-widest',
          value ? 'text-primary' : 'text-slate-400',
          'hover:bg-primary/5 active:scale-95',
          open && 'bg-primary/5'
        )}
      >
        <span>{value || 'Selecionar Distrito'}</span>
        <svg
          className={cn('w-3 h-3 text-slate-400 transition-transform', open && 'rotate-180')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-xl z-[100] overflow-hidden min-w-[190px] max-h-72 overflow-y-auto">
          {DISTRICTS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => { onChange(d); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors',
                d === value ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-50'
              )}
            >
              <span className={cn(
                'font-bold text-xs uppercase tracking-widest',
                d === value ? 'text-primary' : 'text-secondary'
              )}>
                {d}
              </span>
              {d === value && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
