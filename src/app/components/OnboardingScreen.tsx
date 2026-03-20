import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Phone, ArrowRight, CheckCircle2, ChevronRight, Map, Building2, RefreshCw } from 'lucide-react';
import { User as UserType } from '../types';
import { cn } from '../utils/cn';

const PHONE_COUNTRIES = [
  { code: '+351', flag: '🇵🇹' },
  { code: '+34',  flag: '🇪🇸' },
  { code: '+33',  flag: '🇫🇷' },
];

interface OnboardingScreenProps {
  user: UserType;
  onComplete: (updatedUser: UserType) => void;
}

const DISTRICTS = [
  'Beja', 'Évora', 'Portalegre', 'Santarém', 'Setúbal', 'Castelo Branco', 'Faro', 'Lisboa', 'Porto', 'Braga', 'Viseu', 'Aveiro', 'Coimbra', 'Leiria', 'Viana do Castelo', 'Vila Real', 'Bragança', 'Guarda'
].sort();

export function OnboardingScreen({ user, onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [phoneCountry, setPhoneCountry] = useState(user.phoneCountry || '+351');
  const [district, setDistrict] = useState('');
  const [mode, setMode] = useState<'COMPRAR' | 'VENDER' | 'AMBOS'>(user.mode || 'AMBOS');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({
        ...user,
        name,
        phoneNumber,
        phoneCountry,
        region: district ? `${district}, Portugal` : user.region,
        mode,
        isFirstLogin: false
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[2000] flex flex-col">
      {/* Progress Bar */}
      <div className="h-2 w-full bg-slate-100">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center">
                <User className="w-12 h-12 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-secondary italic leading-tight">Bem-vindo ao AgroLink!</h1>
                <p className="text-slate-500 font-bold">Vamos configurar o seu perfil profissional.</p>
              </div>

              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Profissional</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full h-18 bg-slate-50 border-2 border-slate-100 rounded-[24px] px-6 text-xl font-black text-secondary focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Telemóvel</label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className="h-16 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-black text-sm text-slate-600 text-center outline-none focus:border-primary px-3 shrink-0"
                    >
                      {PHONE_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="912 345 678"
                      className="flex-1 h-16 bg-slate-50 border-2 border-slate-100 rounded-[24px] px-6 text-xl font-black text-secondary focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center">
                <MapPin className="w-12 h-12 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-secondary italic leading-tight">Onde se encontra?</h1>
                <p className="text-slate-500 font-bold">Isto ajuda-nos a mostrar-lhe anúncios perto de si.</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {DISTRICTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDistrict(d)}
                    className={cn(
                      "h-16 rounded-2xl border-2 font-black text-sm transition-all flex items-center justify-center px-4 text-center",
                      district === d 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
                        : "bg-white border-slate-100 text-secondary hover:border-primary/30"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center">
                <Building2 className="w-12 h-12 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-secondary italic leading-tight">Qual o seu objetivo?</h1>
                <p className="text-slate-500 font-bold">Personalize a sua experiência no AgroLink.</p>
              </div>

              <div className="w-full flex flex-col gap-4">
                {[
                  { id: 'COMPRAR', label: 'Quero Comprar', sub: 'Procurar gado e oportunidades', icon: Map },
                  { id: 'VENDER', label: 'Quero Vender', sub: 'Publicar e gerir os meus anúncios', icon: ArrowRight },
                  { id: 'AMBOS', label: 'Ambos', sub: 'Comprar e vender no mercado', icon: RefreshCw }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id as any)}
                    className={cn(
                      "w-full p-6 rounded-[32px] border-2 flex items-center gap-6 transition-all",
                      mode === item.id 
                        ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                        : "bg-white border-slate-100 text-secondary hover:border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                      mode === item.id ? "bg-white/20" : "bg-primary/5"
                    )}>
                      <item.icon className={cn("w-7 h-7", mode === item.id ? "text-white" : "text-primary")} />
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-black uppercase leading-tight">{item.label}</div>
                      <div className={cn("text-xs font-bold", mode === item.id ? "text-white/70" : "text-slate-400")}>
                        {item.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <button
          onClick={handleNext}
          disabled={step === 1 && (!name || !phoneNumber)}
          className="w-full h-18 bg-secondary text-white rounded-[32px] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          {step === 3 ? 'CONCLUIR' : 'CONTINUAR'}
          <ChevronRight className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
