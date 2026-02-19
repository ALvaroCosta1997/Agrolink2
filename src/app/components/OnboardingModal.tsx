import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, LayoutGrid, CheckCircle2, Package } from 'lucide-react';
import { UsageMode } from '../types';
import { cn } from '../utils/cn';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (mode: UsageMode) => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [selectedMode, setSelectedMode] = React.useState<UsageMode | null>(null);

  const modes: { id: UsageMode; label: string; desc: string; icon: any; color: string }[] = [
    { 
      id: 'COMPRAR', 
      label: 'Comprar', 
      desc: 'Procurar animais e entrar em contacto com vendedores.', 
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    { 
      id: 'VENDER', 
      label: 'Vender', 
      desc: 'Publicar anúncios e gerir propostas de compradores.', 
      icon: Package,
      color: 'bg-green-500'
    },
    { 
      id: 'AMBOS', 
      label: 'Ambos', 
      desc: 'Aproveitar todas as ferramentas do mercado.', 
      icon: LayoutGrid,
      color: 'bg-primary'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-secondary/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-md bg-white rounded-[48px] shadow-2xl overflow-hidden p-8 pt-12"
          >
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center mb-6">
                <LayoutGrid className="w-8 h-8 text-primary" strokeWidth={2.5} />
              </div>
              <h2 className="text-4xl font-black text-secondary leading-tight mb-3">
                Como vais usar a app?
              </h2>
              <p className="text-slate-500 font-medium">
                Personaliza a tua experiência de acordo com o teu objetivo.
              </p>
            </div>

            <div className="flex flex-col gap-4 mb-10">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "relative group p-6 rounded-[32px] border-2 transition-all text-left flex items-start gap-4 active:scale-95",
                    selectedMode === mode.id
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform",
                    selectedMode === mode.id ? mode.color + " text-white" : "bg-slate-50 text-slate-400 group-hover:scale-110"
                  )}>
                    <mode.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 pr-8">
                    <p className={cn(
                      "font-black text-lg transition-colors",
                      selectedMode === mode.id ? "text-secondary" : "text-slate-400"
                    )}>{mode.label}</p>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed mt-1">{mode.desc}</p>
                  </div>
                  {selectedMode === mode.id && (
                    <div className="absolute top-6 right-6 text-primary">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => selectedMode && onComplete(selectedMode)}
              disabled={!selectedMode}
              className="w-full h-16 bg-primary text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              Continuar
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
);
