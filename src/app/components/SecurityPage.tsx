import React, { useState, useEffect } from "react";
import { ChevronLeft, Shield, AlertTriangle, FileText, Phone, Flag } from "lucide-react";
import * as api from "../api";

interface SecurityPageProps {
  onBack: () => void;
  userId?: string;
}

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  listing_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pendente",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  reviewing:  { label: "Em análise", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  resolved:   { label: "Resolvida",  cls: "bg-green-100 text-green-700 border-green-200" },
};

function SectionCard({
  title,
  items,
  colorClass,
  bgClass,
  borderClass,
  icon,
}: {
  title: string;
  items: string[];
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl border-2 p-6 md:p-8 ${bgClass} ${borderClass}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${bgClass.replace("50", "100").replace("bg-white", "bg-slate-100")}`}>
          {icon}
        </div>
        <h3 className={`text-lg font-black leading-snug ${colorClass}`}>{title}</h3>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${colorClass.replace("text-", "bg-")}`} />
            <span className="text-slate-600 font-medium text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SecurityPage({ onBack, userId }: SecurityPageProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoadingReports(true);
    api.supabase
      .from("reports")
      .select("id, reason, details, status, created_at, listing_id")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data as Report[]);
      })
      .finally(() => setLoadingReports(false));
  }, [userId]);

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
          <h1 className="text-xl font-black text-secondary leading-none">Segurança</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Evitar Burlas</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-10 pb-24 flex flex-col gap-5">
        {/* Hero */}
        <div className="bg-amber-500 rounded-[40px] p-8 md:p-10 flex flex-col gap-3">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight italic">
            A sua segurança é a nossa prioridade
          </h2>
          <p className="text-white/90 font-medium text-sm leading-relaxed">
            Leia estas dicas antes de comprar ou vender no AgrowLink.
          </p>
        </div>

        {/* Alert Banner */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-800 font-bold text-sm leading-relaxed">
            ⚠️ O AgrowLink é uma plataforma de visibilidade. Não processamos pagamentos nem garantimos transações.{" "}
            <span className="font-black">Verifique sempre pessoalmente os animais antes de qualquer pagamento.</span>
          </p>
        </div>

        {/* Buyers */}
        <SectionCard
          title="🛡️ Dicas para Compradores"
          bgClass="bg-green-50"
          borderClass="border-green-200"
          colorClass="text-green-800"
          icon={<Shield className="w-5 h-5 text-green-600" />}
          items={[
            "Visite SEMPRE a exploração e veja os animais pessoalmente antes de pagar.",
            "Nunca envie dinheiro adiantado sem ver o gado — especialmente por transferência bancária a desconhecidos.",
            "Verifique a identidade do vendedor: peça o nome, NIF e número de exploração pecuária (registado na DGAV).",
            "Exija a documentação sanitária: boletim sanitário e guia de transporte (obrigatórios por lei — Regulamento UE 2016/429).",
            "Desconfie de preços muito abaixo do valor de mercado.",
            "Encontre-se na exploração registada do vendedor, nunca em pontos de encontro aleatórios.",
            "Leve alguém consigo na primeira visita a uma exploração.",
          ]}
        />

        {/* Sellers */}
        <SectionCard
          title="🛡️ Dicas para Vendedores"
          bgClass="bg-green-50"
          borderClass="border-green-200"
          colorClass="text-green-800"
          icon={<Shield className="w-5 h-5 text-green-600" />}
          items={[
            "Não partilhe informações pessoais desnecessárias antes de confirmar o interesse do comprador.",
            "Use o Chat do AgrowLink para o contacto inicial — cria um registo da conversa.",
            "Tenha cuidado com compradores que querem pagar por métodos invulgares ou que pressionam para fechar o negócio urgentemente.",
            "Nunca envie animais sem pagamento confirmado.",
            "Use o controlo de horário de contactos para gerir quando os compradores podem ligar.",
          ]}
        />

        {/* Red Flags */}
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-red-800 leading-snug">🚨 Sinais de Alerta</h3>
          </div>
          <ul className="flex flex-col gap-3">
            {[
              "O comprador/vendedor recusa encontrar-se pessoalmente.",
              "Pedidos de pagamento por criptomoeda, cartões presente ou métodos não rastreáveis.",
              "Pressão para fechar o negócio imediatamente sem visita à exploração.",
              "Fotos ou descrições falsas nos anúncios.",
              "Pedidos de dados bancários pessoais (passwords, códigos).",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                <span className="text-red-800 font-medium text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal Docs */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-black text-blue-900 leading-snug">📋 Documentação Obrigatória</h3>
          </div>
          <p className="text-blue-800 font-bold text-sm mb-4">
            Para qualquer movimentação de animais vivos em Portugal é obrigatório:
          </p>
          <ul className="flex flex-col gap-3">
            {[
              "Guia de transporte (obrigatória para todas as movimentações de gado — DGAV).",
              "Boletim sanitário (certificado de saúde animal).",
              "Identificação animal (brincos/marcas auriculares para bovinos, ovinos e caprinos — Reg. UE 2016/429).",
              "Número de exploração pecuária registado na DGAV/IFAP.",
              "O comprador deve registar os animais na sua exploração dentro do prazo legal.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                <span className="text-blue-900 font-medium text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Report */}
        <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="text-lg font-black text-secondary leading-snug">Como denunciar</h3>
          </div>
          <p className="text-slate-600 font-medium text-sm mb-5 leading-relaxed">
            Se encontrar um anúncio suspeito ou foi vítima de burla:
          </p>
          <div className="flex flex-col gap-3">
            {[
              { label: "AgrowLink", value: "av.pereiradacosta@gmail.com" },
              { label: "GNR", value: "213 217 000" },
              { label: "PSP", value: "218 111 000" },
              { label: "DGAV", value: "213 239 500" },
              { label: "Portal da Queixa", value: "www.portaldaqueixa.com" },
              { label: "Livro de Reclamações", value: "www.livroreclamacoes.pt" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                <span className="text-sm font-black text-secondary">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* My Reports */}
        {userId && (
          <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                <Flag className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-secondary leading-snug">As Minhas Denúncias</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Denúncias que submeteu</p>
              </div>
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="text-3xl mb-3">🏳️</span>
                <p className="font-black text-slate-400 text-sm">Não tem denúncias submetidas</p>
                <p className="text-xs font-medium text-slate-300 mt-1">As suas denúncias aparecerão aqui.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const date = new Date(r.created_at).toLocaleDateString("pt-PT", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  return (
                    <div key={r.id} className="flex items-start justify-between gap-3 py-4 border-b border-slate-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-secondary text-sm leading-snug">{r.reason}</p>
                        {r.details && (
                          <p className="text-xs font-medium text-slate-400 mt-0.5 truncate">{r.details}</p>
                        )}
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">{date}</p>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
