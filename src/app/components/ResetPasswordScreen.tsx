import React, { useState } from "react";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { supabase } from "../api";

interface ResetPasswordScreenProps {
  onDone: () => void;
}

export function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success("Palavra-passe atualizada com sucesso!");
      onDone();
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar palavra-passe.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[7500] bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Icon + title */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-secondary leading-tight">Nova Palavra-passe</h1>
          <p className="text-sm font-bold text-slate-400 mt-3 leading-relaxed">
            Escolha uma nova palavra-passe para a sua conta.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* New password */}
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova palavra-passe (mín. 6 caracteres)"
              required
              minLength={6}
              autoFocus
              className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-[24px] pl-14 pr-14 font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar palavra-passe"
              required
              minLength={6}
              className="w-full h-16 bg-slate-50 border-2 border-slate-50 rounded-[24px] pl-14 pr-6 font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirm}
            className="h-16 bg-primary text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all mt-2 uppercase tracking-widest"
          >
            {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : "Redefinir Palavra-passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
