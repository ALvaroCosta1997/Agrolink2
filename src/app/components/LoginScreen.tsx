import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ChevronLeft, ArrowRight, CheckCircle2, RefreshCw, Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { auth } from '../api';

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (email: string, userId: string, accessToken: string) => void;
}

export function LoginScreen({ onBack, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // 1. Create user on server (Supabase Auth + KV profile)
        await auth.signup(email, password, name || undefined);
        // 2. Sign in to get session
        const data = await auth.login(email, password);
        onLoginSuccess(email, data.user.id, data.session.access_token);
      } else {
        // Sign in directly
        const data = await auth.login(email, password);
        onLoginSuccess(email, data.user.id, data.session.access_token);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Erro de autenticação');
    } finally {
      setIsLoading(false);
    }
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
        <div className="w-12 h-12" />
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center py-12">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black text-secondary mb-4">
            {mode === 'login' ? 'Bem-vindo' : 'Criar Conta'}
          </h1>
          <p className="text-lg font-bold text-primary tracking-widest uppercase">A ligar produtores.</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5 mb-8">
          <button
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === 'login' ? 'bg-white text-secondary shadow-md' : 'text-slate-400'
            }`}
          >
            <LogIn className="w-4 h-4" /> Entrar
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === 'signup' ? 'bg-white text-secondary shadow-md' : 'text-slate-400'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Registar
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <UserPlus className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="O teu nome"
                className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-[24px] pl-14 pr-6 font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
            </div>
          )}

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
              <Mail className="w-5 h-5" />
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

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (mín. 6 caracteres)"
              required
              minLength={6}
              className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-[24px] pl-14 pr-14 font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="h-16 bg-primary text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all mt-2"
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-xs font-bold text-slate-400 leading-relaxed px-8">
          Ao continuar, aceitas os <button className="text-primary underline">Termos</button> e a <button className="text-primary underline">Política de Privacidade</button>.
        </p>
      </main>
    </div>
  );
}
