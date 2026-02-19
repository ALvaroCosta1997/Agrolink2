import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, LogIn, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface AuthGateProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function AuthGate({ isOpen, onClose, onLogin }: AuthGateProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 pt-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary/5 rounded-[32px] flex items-center justify-center mb-6">
                <Lock className="w-10 h-10 text-primary" strokeWidth={2.5} />
              </div>

              <h3 className="text-3xl font-black text-secondary leading-tight mb-3">
                Para continuar...
              </h3>
              
              <p className="text-slate-500 font-medium mb-8">
                Entra para ver contactos e falar com produtores.
              </p>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={onLogin}
                  className="w-full h-16 bg-primary text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                >
                  <LogIn className="w-5 h-5" />
                  Entrar
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full h-16 bg-slate-50 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                >
                  Continuar a navegar
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 w-full flex justify-around">
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">📞</div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Contactos</span>
                </div>
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">💬</div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Mensagens</span>
                </div>
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">❤️</div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Favoritos</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
