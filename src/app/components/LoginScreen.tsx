import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ChevronLeft, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (email: string) => void;
}

export function LoginScreen({ onBack, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'confirmation'>('input');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep('confirmation');
    }, 1500);
  };

  const handleMockSuccess = () => {
    onLoginSuccess(email);
  };

  return (
    <div className="fixed inset-0 z-[7000] bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <button 
          onClick={onBack}
          className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform shadow-sm border border-slate-100"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={3} />
        </button>
        <span className="font-black text-secondary tracking-widest uppercase text-xs italic">AgroLink</span>
        <div className="w-12 h-12" /> {/* Spacer */}
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center py-12">
        <AnimatePresence mode="wait">
          {step === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col"
            >
              <div className="mb-10 text-center">
                <h1 className="text-5xl font-black text-secondary mb-4">Bem-vindo</h1>
                <p className="text-lg font-bold text-primary tracking-widest uppercase">A ligar produtores.</p>
              </div>

              {/* Social Login Buttons */}
              <div className="flex flex-col gap-4 mb-8">
                <button
                  onClick={handleMockSuccess}
                  className="h-16 bg-white border-2 border-slate-100 rounded-[24px] flex items-center justify-center gap-4 px-6 font-black text-secondary shadow-sm active:scale-95 transition-all hover:border-primary/20"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                  <span>Continuar com Google</span>
                </button>
                <button
                  onClick={handleMockSuccess}
                  className="h-16 bg-black border-2 border-black rounded-[24px] flex items-center justify-center gap-4 px-6 font-black text-white shadow-xl active:scale-95 transition-all shadow-black/10"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.96.95-2.01 1.63-3.13 1.63-1.14 0-1.61-.71-3-.71-1.35 0-1.92.68-3 .68-1.1 0-2.12-.66-3.14-1.66-2.07-2.03-3.64-5.74-3.64-8.8 0-3.04 1.9-4.66 3.73-4.66 1 0 1.83.61 2.58.61.69 0 1.68-.67 2.87-.67 1.25 0 2.3.49 3.03 1.55-2.73 1.62-2.28 5.41.48 6.53-.62 1.48-1.46 2.97-2.28 3.51zm-4.32-15.65c-.01 0-.01 0 0 0 .52-2.47 2.65-4.2 4.96-4.63.15 2.64-2.11 4.77-4.96 4.63z"/></svg>
                  <span>Continuar com Apple</span>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ou</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {/* Email Magic Link Form */}
              <form onSubmit={handleSendLink} className="flex flex-col gap-4">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <Mail className="w-6 h-6" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="O teu email"
                    required
                    className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-[24px] pl-14 pr-6 font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="h-16 bg-primary text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                >
                  {isLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Enviar link mágico
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-12 text-center text-xs font-bold text-slate-400 leading-relaxed px-8">
                Ao continuar, aceitas os <button className="text-primary underline">Termos</button> e a <button className="text-primary underline">Política de Privacidade</button>.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center mb-8">
                <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={2.5} />
              </div>

              <h2 className="text-4xl font-black text-secondary leading-tight mb-4">
                Email enviado!
              </h2>
              
              <p className="text-lg font-medium text-slate-500 mb-10 max-w-[280px]">
                Enviámos um link mágico para <span className="text-secondary font-black">{email}</span>.
              </p>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={handleMockSuccess}
                  className="w-full h-16 bg-primary text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                >
                  <ArrowRight className="w-5 h-5" />
                  Continuar (Simular Login)
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('input')}
                    className="flex-1 h-16 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    Alterar email
                  </button>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => setIsLoading(false), 1000);
                    }}
                    className="flex-1 h-16 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    Reenviar
                  </button>
                </div>
              </div>

              <p className="mt-10 text-xs font-bold text-slate-400 flex items-center gap-2">
                Não recebeste? Verifica o Spam.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
