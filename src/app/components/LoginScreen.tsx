import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ChevronLeft, ArrowRight, CheckCircle2, RefreshCw, Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { auth, supabase } from '../api';
import { toast } from 'sonner';

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (email: string, userId: string, accessToken: string) => void;
}

export function LoginScreen({ onBack, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'confirm'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await auth.signup(email, password, name || undefined);
        if (needsConfirmation) {
          // Email confirmation required — show confirmation screen
          setMode('confirm');
        } else {
          // Email already confirmed (e.g. Supabase confirmations disabled) — sign in directly
          const data = await auth.login(email, password);
          onLoginSuccess(email, data.user.id, data.session.access_token);
        }
      } else {
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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setForgotSent(true);
      toast.success('Email enviado! Verifique a sua caixa de correio.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) throw resendError;
      toast.success('Email reenviado! Verifique a sua caixa de correio.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reenviar email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[7000] bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <button
          onClick={
            mode === 'forgot' ? () => { setMode('login'); setError(null); setForgotSent(false); }
            : mode === 'confirm' ? () => { setMode('signup'); setError(null); }
            : onBack
          }
          className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform shadow-sm border border-slate-100"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={3} />
        </button>
        <span className="font-black text-secondary tracking-widest uppercase text-xs italic">AgroLink</span>
        <div className="w-12 h-12" />
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center py-12">

        {/* ── EMAIL CONFIRMATION VIEW ── */}
        {mode === 'confirm' ? (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-secondary mb-3">Verifique o seu email!</h1>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                Enviámos um link de confirmação para
              </p>
              <p className="text-sm font-black text-primary mt-1 break-all">{email}</p>
              <p className="text-sm font-bold text-slate-500 leading-relaxed mt-2">
                Clique no link para ativar a sua conta. Pode fechar esta janela.
              </p>
            </div>

            <div className="w-full p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl text-amber-700 text-xs font-bold leading-relaxed text-left">
              Não recebeu o email? Verifique a pasta de spam ou reenvie abaixo.
            </div>

            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full h-14 bg-slate-100 text-secondary rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isResending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Reenviar email</>}
            </button>

            <button
              onClick={() => { setMode('login'); setError(null); }}
              className="text-sm font-black text-primary underline underline-offset-2 hover:no-underline"
            >
              Voltar ao login
            </button>
          </div>
        ) : mode === 'forgot' ? (
          <>
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl font-black text-secondary mb-3">Recuperar Palavra-passe</h1>
              <p className="text-sm font-bold text-slate-400 leading-relaxed">
                Introduza o seu email e enviaremos um link para redefinir a sua palavra-passe.
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center">
                {error}
              </motion.div>
            )}

            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-6 bg-green-50 border-2 border-green-100 rounded-3xl text-center px-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="font-black text-secondary">Email enviado!</p>
                <p className="text-sm font-bold text-slate-500">Verifique a sua caixa de correio e clique no link para redefinir a palavra-passe.</p>
                <p className="text-xs text-slate-400 text-center mt-2">Se o email introduzido não estiver associado a uma conta AgroLink, não receberá nenhum email de recuperação.</p>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
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
                    autoFocus
                    className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-[24px] pl-14 pr-6 font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="h-16 bg-primary text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all mt-2"
                >
                  {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Enviar Link</>}
                </button>
              </form>
            )}

            <button
              onClick={() => { setMode('login'); setError(null); setForgotSent(false); }}
              className="mt-8 text-center text-sm font-black text-primary underline underline-offset-2 hover:no-underline"
            >
              Voltar ao login
            </button>
          </>
        ) : (
          /* ── LOGIN / SIGNUP VIEW ── */
          <>
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
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center">
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

              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-sm text-primary font-bold underline underline-offset-2 hover:no-underline"
                  >
                    Esqueceu a palavra-passe?
                  </button>
                </div>
              )}

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
          </>
        )}
      </main>
    </div>
  );
}
