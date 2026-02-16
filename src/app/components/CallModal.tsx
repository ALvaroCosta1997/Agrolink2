import React from 'react';
import { X, Phone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  sellerName: string;
}

export function CallModal({ isOpen, onClose, phone, sellerName }: CallModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl border border-white/20"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 pt-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-primary" strokeWidth={3} />
            </div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Contactar Vendedor</p>
            <h2 className="text-2xl font-black text-secondary mb-8">{sellerName}</h2>

            <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-8 group cursor-pointer active:scale-95 transition-transform" onClick={() => window.location.href = `tel:${phone}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Número de Telefone</p>
              <p className="text-3xl font-black text-secondary tracking-tight">
                {phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full">
              <a 
                href={`tel:${phone}`}
                className="h-16 bg-primary text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
              >
                <Phone className="w-6 h-6" /> Ligar Agora
              </a>
              <button 
                onClick={onClose}
                className="h-14 bg-white text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-transform"
              >
                Fechar
              </button>
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 flex items-start gap-4 border-t border-slate-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed text-left">
              O vendedor prefere ser contactado durante o dia. Diga que viu o anúncio no <span className="text-primary font-black uppercase">AgroLink</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
