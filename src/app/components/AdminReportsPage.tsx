import React, { useState, useEffect } from "react";
import { ChevronLeft, Flag, AlertTriangle, CheckCircle2, Clock, XCircle, BarChart2 } from "lucide-react";
import { cn } from "../utils/cn";
import * as api from "../api";

interface AdminReportsPageProps {
  onBack: () => void;
}

interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  listing_id: string | null;
  reported_user_id: string | null;
  reporter_id: string;
  resolved_notes?: string | null;
  reporter?: { email: string } | null;
  reported_user?: { email: string } | null;
}

type FilterTab = "all" | "pending" | "reviewing" | "resolved" | "rejected";

const STATUS_OPTIONS = [
  { value: "pending",   label: "Pendente",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "reviewing", label: "Em análise", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "resolved",  label: "Resolvida",  cls: "bg-green-100 text-green-700 border-green-200" },
  { value: "rejected",  label: "Rejeitada",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
];

const statusConfig = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",       label: "Todas" },
  { key: "pending",   label: "Pendentes" },
  { key: "reviewing", label: "Em análise" },
  { key: "resolved",  label: "Resolvidas" },
];

function StatCard({ label, count, cls }: { label: string; count: number; cls: string }) {
  return (
    <div className={`flex-1 rounded-2xl border-2 p-4 flex flex-col items-center gap-1 ${cls}`}>
      <span className="text-2xl font-black leading-none">{count}</span>
      <span className="text-[10px] font-black uppercase tracking-widest leading-none text-center">{label}</span>
    </div>
  );
}

function ReportCard({ report, onStatusChange }: { report: AdminReport; onStatusChange: (id: string, status: string, notes: string) => void }) {
  const [status, setStatus] = useState(report.status);
  const [notes, setNotes] = useState(report.resolved_notes ?? "");
  const [saving, setSaving] = useState(false);
  const cfg = statusConfig(status);

  const date = new Date(report.created_at).toLocaleDateString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleSave = async () => {
    setSaving(true);
    await onStatusChange(report.id, status, notes);
    setSaving(false);
  };

  const changed = status !== report.status || notes !== (report.resolved_notes ?? "");

  return (
    <div className={cn(
      "bg-white rounded-3xl border-2 p-6 flex flex-col gap-4",
      report.status === "pending" ? "border-amber-200 shadow-amber-50 shadow-lg" : "border-slate-100"
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-secondary text-base leading-snug">{report.reason}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{date}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {/* Details */}
      {report.details && (
        <p className="text-sm font-medium text-slate-600 bg-slate-50 rounded-2xl p-3 leading-relaxed">
          "{report.details}"
        </p>
      )}

      {/* Meta info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {report.reporter?.email && (
          <div className="bg-slate-50 rounded-2xl px-4 py-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Denunciante</p>
            <p className="text-sm font-bold text-secondary mt-0.5 truncate">{report.reporter.email}</p>
          </div>
        )}
        {report.reported_user?.email && (
          <div className="bg-red-50 rounded-2xl px-4 py-3">
            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Denunciado</p>
            <p className="text-sm font-bold text-red-700 mt-0.5 truncate">{report.reported_user.email}</p>
          </div>
        )}
        {report.listing_id && (
          <div className="bg-primary/5 rounded-2xl px-4 py-3 sm:col-span-2">
            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">ID do Anúncio</p>
            <p className="text-xs font-bold text-primary mt-0.5 truncate font-mono">{report.listing_id}</p>
          </div>
        )}
      </div>

      {/* Status change */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Atualizar Estado</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                  status === opt.value ? opt.cls + " ring-2 ring-offset-1 ring-current/30" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas de resolução (opcional)..."
          rows={2}
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-secondary placeholder-slate-300 resize-none focus:outline-none focus:border-primary/40 transition-colors"
        />
        {changed && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="self-end px-6 py-2.5 bg-secondary text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-secondary/10"
          >
            {saving ? "A guardar..." : "Guardar Alterações"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminReportsPage({ onBack }: AdminReportsPageProps) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");

  useEffect(() => {
    setLoading(true);
    api.supabase
      .from("reports")
      .select(`
        id, reason, details, status, created_at, listing_id, reported_user_id, reporter_id, resolved_notes,
        reporter:profiles!reporter_id(email),
        reported_user:profiles!reported_user_id(email)
      `)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Admin fetch error:", error);
        if (data) setReports(data as unknown as AdminReport[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, status: string, notes: string) => {
    const { error } = await api.supabase
      .from("reports")
      .update({
        status,
        resolved_notes: notes || null,
        resolved_at: ["resolved", "rejected"].includes(status) ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      console.error("Failed to update report:", error);
      return;
    }
    setReports((prev) =>
      prev.map((r) => r.id === id ? { ...r, status, resolved_notes: notes || null } : r)
    );
  };

  const counts = {
    all:       reports.length,
    pending:   reports.filter((r) => r.status === "pending").length,
    reviewing: reports.filter((r) => r.status === "reviewing").length,
    resolved:  reports.filter((r) => r.status === "resolved").length,
    rejected:  reports.filter((r) => r.status === "rejected").length,
  };

  const visible = tab === "all" ? reports : reports.filter((r) => r.status === tab);

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-50 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 px-4 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-secondary" />
        </button>
        <div>
          <h1 className="text-xl font-black text-secondary leading-none">⚙️ Admin — Denúncias</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Painel de Administração</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-10 pb-24 flex flex-col gap-5">
        {/* Stats */}
        <div className="flex gap-3">
          <StatCard label="Total"    count={counts.all}       cls="bg-white border-slate-100 text-secondary" />
          <StatCard label="Pendente" count={counts.pending}   cls="bg-amber-50 border-amber-200 text-amber-700" />
          <StatCard label="Análise"  count={counts.reviewing} cls="bg-blue-50 border-blue-200 text-blue-700" />
          <StatCard label="Resolvida" count={counts.resolved} cls="bg-green-50 border-green-200 text-green-700" />
        </div>

        {/* Filter tabs */}
        <div className="bg-slate-100 rounded-2xl p-1 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 relative",
                tab === t.key ? "bg-white text-secondary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t.label}
              {t.key === "pending" && counts.pending > 0 && (
                <span className="absolute -top-1.5 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center bg-white rounded-3xl border-2 border-slate-100">
            <span className="text-4xl mb-3">🏳️</span>
            <p className="font-black text-slate-400">Sem denúncias nesta categoria</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((r) => (
              <ReportCard key={r.id} report={r} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
