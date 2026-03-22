import React, { useState } from "react";
import { ChevronLeft, Scale, Lock } from "lucide-react";
import { cn } from "../utils/cn";

interface TermsPageProps {
  onBack: () => void;
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-xs font-black text-primary">{number}</span>
        </div>
        <h3 className="font-black text-secondary text-base leading-snug">{title}</h3>
      </div>
      <div className="pl-11 text-slate-600 font-medium text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 mt-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mt-3 text-amber-800 font-bold text-sm leading-relaxed">
      {children}
    </div>
  );
}

function TermsContent() {
  return (
    <div className="flex flex-col gap-8">
      <Section number={1} title="Identificação do Prestador">
        <p>Nome: Alvaro Costa</p>
        <p className="mt-1">Email: av.pereiradacosta@gmail.com</p>
        <p className="mt-1">Plataforma: AgroLink — agrolink2.vercel.app</p>
      </Section>

      <Section number={2} title="Objeto da Plataforma">
        <p>O AgroLink é uma plataforma online para publicação e consulta de anúncios classificados de produtos agrícolas e pecuários em Portugal.</p>
        <Callout>
          O AgroLink NÃO compra, vende, detém ou transporta quaisquer animais ou produtos. O AgroLink NÃO processa pagamentos entre utilizadores. O AgroLink atua exclusivamente como intermediário de visibilidade.
        </Callout>
      </Section>

      <Section number={3} title="Condições de Acesso e Utilização">
        <ul className="flex flex-col gap-0">
          <Bullet>Os utilizadores devem ter pelo menos 18 anos de idade.</Bullet>
          <Bullet>O registo requer um endereço de email válido.</Bullet>
          <Bullet>Os utilizadores são responsáveis pela veracidade das informações nos seus perfis e anúncios.</Bullet>
          <Bullet>É proibido publicar conteúdo fraudulento, enganoso ou ilegal.</Bullet>
          <Bullet>O AgroLink reserva-se o direito de remover anúncios ou suspender contas que violem estes termos.</Bullet>
        </ul>
      </Section>

      <Section number={4} title="Responsabilidade dos Utilizadores">
        <p>Os vendedores são os únicos responsáveis pela veracidade dos seus anúncios. Os vendedores devem cumprir toda a legislação portuguesa e europeia relativa à venda e transporte de gado, incluindo o registo na DGAV, certificados de sanidade animal e identificação por brinco (Reg. UE 2016/429).</p>
        <p className="mt-2">Os compradores são responsáveis por verificar o estado e documentação dos animais antes da compra. Todas as transações ocorrem diretamente entre comprador e vendedor.</p>
      </Section>

      <Section number={5} title="Conteúdo dos Anúncios">
        <p>Os anúncios devem referir-se a produtos agrícolas ou pecuários legalmente comercializáveis em Portugal.</p>
        <p className="mt-2 font-bold text-slate-700">É proibido:</p>
        <ul className="flex flex-col gap-0">
          <Bullet>Espécies ameaçadas.</Bullet>
          <Bullet>Animais sem registo DGAV.</Bullet>
          <Bullet>Fotos enganosas ou manipulação de preços.</Bullet>
        </ul>
        <p className="mt-2">O AgroLink reserva-se o direito de moderar e remover qualquer conteúdo.</p>
      </Section>

      <Section number={6} title="Limitação de Responsabilidade">
        <ul className="flex flex-col gap-0">
          <Bullet>O AgroLink não é responsável pela qualidade, legalidade ou segurança dos produtos anunciados.</Bullet>
          <Bullet>O AgroLink não é responsável pela conduta dos utilizadores.</Bullet>
          <Bullet>O AgroLink não é responsável por quaisquer danos resultantes de transações entre utilizadores.</Bullet>
          <Bullet>A plataforma é fornecida "tal como está" sem garantias de qualquer tipo.</Bullet>
        </ul>
      </Section>

      <Section number={7} title="Propriedade Intelectual">
        <p>Todo o branding, design e código do AgroLink é propriedade do AgroLink. Os utilizadores mantêm a propriedade do seu conteúdo (fotos, descrições) mas concedem ao AgroLink licença para o exibir na plataforma.</p>
      </Section>

      <Section number={8} title="Resolução de Litígios">
        <p>Para litígios relacionados com a plataforma, os utilizadores podem recorrer à plataforma europeia de resolução de litígios:</p>
        <p className="mt-2 font-black text-primary">https://ec.europa.eu/consumers/odr</p>
      </Section>

      <Section number={9} title="Legislação Aplicável">
        <p>Estes termos são regidos pela lei portuguesa.</p>
      </Section>

      <Section number={10} title="Modificações">
        <p>O AgroLink reserva-se o direito de modificar estes termos a qualquer momento. Os utilizadores serão notificados de alterações significativas.</p>
        <p className="mt-2 text-xs font-black text-slate-400 uppercase tracking-widest">Última atualização: Março 2026</p>
      </Section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="flex flex-col gap-8">
      <Section number={1} title="Responsável pelo Tratamento">
        <p>Alvaro Costa — av.pereiradacosta@gmail.com</p>
      </Section>

      <Section number={2} title="Dados Pessoais Recolhidos">
        <ul className="flex flex-col gap-0">
          <Bullet><span className="font-bold text-slate-700">Registo:</span> email, nome.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Perfil:</span> número de telefone, indicativo do país, distrito.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Anúncios:</span> nome de contacto, telefone, coordenadas de localização, fotos.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Dados de utilização:</span> informação de dispositivo, endereço IP (via Vercel Analytics).</Bullet>
          <Bullet>Mensagens de chat entre utilizadores.</Bullet>
        </ul>
      </Section>

      <Section number={3} title="Finalidade do Tratamento">
        <ul className="flex flex-col gap-0">
          <Bullet>Criação e autenticação de conta.</Bullet>
          <Bullet>Exibição de anúncios e possibilidade de contacto entre utilizadores.</Bullet>
          <Bullet>Melhoria da plataforma e análise de utilização.</Bullet>
        </ul>
      </Section>

      <Section number={4} title="Base Legal (Artigo 6.º RGPD)">
        <ul className="flex flex-col gap-0">
          <Bullet><span className="font-bold text-slate-700">Consentimento</span> — o registo implica consentimento para o tratamento de dados necessário ao funcionamento da plataforma.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Interesse legítimo</span> — prevenção de fraude, segurança da plataforma.</Bullet>
        </ul>
      </Section>

      <Section number={5} title="Partilha de Dados">
        <ul className="flex flex-col gap-0">
          <Bullet><span className="font-bold text-slate-700">Com outros utilizadores:</span> informações de perfil e contacto dos anúncios são visíveis para outros utilizadores registados (sujeito às definições de visibilidade de contacto).</Bullet>
          <Bullet><span className="font-bold text-slate-700">Prestadores de serviço:</span> Supabase (alojamento de base de dados — UE), Vercel (alojamento — EUA, com acordos de processamento de dados na UE).</Bullet>
          <Bullet>O AgroLink NÃO vende dados pessoais a terceiros.</Bullet>
        </ul>
      </Section>

      <Section number={6} title="Retenção de Dados">
        <ul className="flex flex-col gap-0">
          <Bullet>Os dados da conta são mantidos enquanto a conta estiver ativa.</Bullet>
          <Bullet>Após eliminação da conta, os dados são removidos num prazo de 30 dias.</Bullet>
        </ul>
      </Section>

      <Section number={7} title="Direitos dos Utilizadores (Artigos 15.º-22.º RGPD)">
        <ul className="flex flex-col gap-0">
          <Bullet><span className="font-bold text-slate-700">Direito de acesso:</span> solicitar uma cópia dos seus dados pessoais.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Direito de retificação:</span> corrigir dados incorretos.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Direito ao apagamento:</span> solicitar a eliminação da conta e dados.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Direito à portabilidade:</span> receber os seus dados em formato estruturado.</Bullet>
          <Bullet><span className="font-bold text-slate-700">Direito de oposição:</span> opor-se ao tratamento de dados.</Bullet>
          <Bullet>Direito de retirar o consentimento a qualquer momento.</Bullet>
        </ul>
        <Callout>
          Para exercer estes direitos, contacte: av.pereiradacosta@gmail.com<br />
          Direito de reclamação à CNPD (Comissão Nacional de Proteção de Dados): www.cnpd.pt
        </Callout>
      </Section>

      <Section number={8} title="Cookies">
        <ul className="flex flex-col gap-0">
          <Bullet>O AgroLink utiliza cookies essenciais para autenticação e gestão de sessão.</Bullet>
          <Bullet>Cookies de análise via Vercel Web Analytics (anonimizados).</Bullet>
          <Bullet>Sem cookies de publicidade ou rastreamento de terceiros.</Bullet>
        </ul>
      </Section>

      <Section number={9} title="Segurança dos Dados">
        <ul className="flex flex-col gap-0">
          <Bullet>Dados encriptados em trânsito (HTTPS) e em repouso.</Bullet>
          <Bullet>Autenticação gerida pelo Supabase Auth com gestão segura de sessões.</Bullet>
          <Bullet>Row-Level Security (RLS) garante que os utilizadores só acedem aos seus próprios dados privados.</Bullet>
        </ul>
      </Section>

      <Section number={10} title="Transferências Internacionais">
        <p>Alguns dados podem ser processados nos Estados Unidos (alojamento Vercel), ao abrigo do EU-US Data Privacy Framework e Cláusulas Contratuais-Tipo.</p>
        <p className="mt-3 text-xs font-black text-slate-400 uppercase tracking-widest">Última atualização: Março 2026</p>
      </Section>
    </div>
  );
}

export function TermsPage({ onBack }: TermsPageProps) {
  const [activeTab, setActiveTab] = useState<"termos" | "privacidade">("termos");

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
          <h1 className="text-xl font-black text-secondary leading-none">Termos e Privacidade</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Informação Legal</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-10 pb-24 flex flex-col gap-6">
        {/* Hero */}
        <div className="bg-secondary rounded-[40px] p-8 md:p-10 flex flex-col gap-3">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight italic">
            Informação Legal
          </h2>
          <p className="text-white/80 font-medium text-sm leading-relaxed">
            Termos de utilização e política de privacidade do AgroLink.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="bg-slate-100 rounded-2xl p-1 flex gap-1">
          {(["termos", "privacidade"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95",
                activeTab === tab
                  ? "bg-white text-secondary shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab === "termos" ? "Termos de Uso" : "Privacidade"}
            </button>
          ))}
        </div>

        {/* Tab icon banner */}
        <div className={cn(
          "flex items-center gap-4 rounded-2xl p-4 border-2",
          activeTab === "termos"
            ? "bg-primary/5 border-primary/10"
            : "bg-blue-50 border-blue-100"
        )}>
          {activeTab === "termos"
            ? <Scale className="w-5 h-5 text-primary shrink-0" />
            : <Lock className="w-5 h-5 text-blue-600 shrink-0" />
          }
          <p className={cn(
            "text-sm font-bold",
            activeTab === "termos" ? "text-primary" : "text-blue-700"
          )}>
            {activeTab === "termos"
              ? "Termos e Condições de Utilização da plataforma AgroLink."
              : "Política de Privacidade — como recolhemos e tratamos os seus dados (RGPD)."
            }
          </p>
        </div>

        {/* Content card */}
        <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-10">
          {activeTab === "termos" ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </div>
  );
}
