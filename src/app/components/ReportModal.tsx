import React, { useState } from "react";
import { Flag, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../utils/cn";
import * as api from "../api";

const REASONS = [
  "Anúncio falso ou enganoso",
  "Fotos falsas",
  "Preço irreal",
  "Suspeita de burla",
  "Conteúdo ofensivo",
  "Animal sem documentação",
  "Outro",
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId?: string;
  listingTitle?: string;
  reportedUserId?: string;
  currentUserId: string;
}

export function ReportModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  reportedUserId,
  currentUserId,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedReason(null);
    setDetails("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Selecione um motivo para a denúncia.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await api.supabase.from("reports").insert({
        reporter_id: currentUserId,
        listing_id: listingId || null,
        reported_user_id: reportedUserId || null,
        reason: selectedReason,
        details: details.trim() || null,
        status: "pending",
      }).select("id").single();
      if (error) {
        if (error.code === "23505") {
          toast.error("Já denunciou este anúncio anteriormente.");
        } else {
          throw error;
        }
        return;
      }
      // Log for Vercel runtime monitoring
      console.warn("[REPORT SUBMITTED]", {
        reportId: data?.id,
        listingId,
        reportedUserId,
        reason: selectedReason,
        details: details.trim() || null,
        timestamp: new Date().toISOString(),
      });
      toast.success("Denúncia enviada com sucesso. Vamos analisar o mais brevemente possível.");
      handleClose();
    } catch (e) {
      console.error("Failed to submit report:", e);
      toast.error("Erro ao enviar denúncia. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[3000] bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="report-modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[3001] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden">
              {/* Handle bar (mobile) */}
              <div className="flex justify-center pt-4 pb-0 sm:hidden">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-red-100 rounded-2xl flex items-center justify-center">
                      <Flag className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-secondary leading-none">Denunciar Anúncio</h2>
                      {listingTitle && (
                        <p className="text-xs font-bold text-slate-400 mt-0.5 truncate max-w-[180px]">{listingTitle}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Reason pills */}
                <div className="mb-5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Motivo</p>
                  <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedReason(r)}
                        className={cn(
                          "px-4 py-2 rounded-2xl border-2 text-sm font-black transition-all active:scale-95",
                          selectedReason === r
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="mb-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                    Detalhes adicionais <span className="normal-case font-bold">(opcional)</span>
                  </p>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Descreva o problema com mais detalhe..."
                    rows={3}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-sm font-medium text-secondary placeholder-slate-300 resize-none focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 h-13 py-3.5 rounded-2xl border-2 border-slate-200 font-black text-slate-500 text-sm uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 h-13 py-3.5 rounded-2xl bg-red-500 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {submitting ? "A enviar..." : "Enviar Denúncia"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
