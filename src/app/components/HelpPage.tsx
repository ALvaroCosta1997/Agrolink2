import React, { useState } from "react";
import { ChevronLeft, ChevronDown, HelpCircle, MessageCircle, ShoppingCart, Megaphone, MapPin, Shield, Eye, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../utils/cn";

interface HelpPageProps {
  onBack: () => void;
}

const sections = [
  {
    icon: HelpCircle,
    title: "O que é o AgrowLink?",
    content: "O AgrowLink é uma plataforma de visibilidade que liga pequenos produtores pecuários (vendedores) a compradores em todo o Portugal. O AgrowLink NÃO processa pagamentos, não gere logística nem intermedeia transações — todos os negócios acontecem diretamente entre comprador e vendedor.",
  },
  {
    icon: ShoppingCart,
    title: "Como funciona para Compradores?",
    content: "Navegue pelos anúncios no mapa ou na lista. Filtre por espécie (Vacas, Ovelhas, Cabras), região, preço e raça. Guarde anúncios nos Favoritos. Contacte os vendedores por Chat, WhatsApp ou Telefone diretamente pela plataforma.",
  },
  {
    icon: Megaphone,
    title: "Como funciona para Vendedores?",
    content: "Crie uma conta, publique o seu anúncio com fotos, espécie, raça, quantidades, preços e localização. Gira os seus anúncios na secção \"Meus Anúncios\". Controle quando os seus contactos (WhatsApp e telefone) ficam visíveis aos compradores.",
  },
  {
    icon: MapPin,
    title: "Como publicar um anúncio?",
    content: "Toque em \"Publicar Venda\" no canto superior direito. Siga os passos: escolha a espécie, indique quantidades e fase de vida, defina preços e raça, marque a localização no mapa, adicione fotos e contacto. Reveja e publique.",
  },
  {
    icon: MessageCircle,
    title: "Mensagens e Chat",
    content: "O AgrowLink oferece um sistema de mensagens integrado. Pode enviar uma mensagem automática personalizada e alterá-la a qualquer momento. As conversas estão organizadas em \"Comprar\" (quando contacta vendedores) e \"Vender\" (quando recebe mensagens de compradores).",
  },
  {
    icon: Eye,
    title: "Gerir a visibilidade dos contactos",
    content: "Na secção \"Meus Anúncios\" pode controlar se o seu WhatsApp e telefone ficam sempre visíveis, apenas num horário definido, ou nunca (só chat). Isto permite evitar contactos fora de horas.",
  },
  {
    icon: User,
    title: "A minha conta e dados pessoais",
    content: "Pode editar o seu nome, telefone, distrito e mensagem automática no Perfil. Para eliminar a sua conta e todos os dados associados, contacte-nos em av.pereiradacosta@gmail.com. Tem o direito legal de solicitar a eliminação dos seus dados (RGPD).",
  },
  {
    icon: Shield,
    title: "Contactar o AgrowLink",
    content: "Para questões, sugestões ou problemas:\nEmail: av.pereiradacosta@gmail.com",
  },
];

function AccordionItem({ section, index }: { section: typeof sections[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div
      className={cn(
        "bg-white rounded-3xl border-2 transition-all overflow-hidden",
        open ? "border-primary/20 shadow-lg shadow-primary/5" : "border-slate-100"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-6 text-left"
      >
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
          open ? "bg-primary text-white" : "bg-primary/10 text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="flex-1 text-base font-black text-secondary leading-snug">{section.title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 pt-0">
              <div className="pl-[60px]">
                <p className="text-slate-600 font-medium leading-relaxed text-sm whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HelpPage({ onBack }: HelpPageProps) {
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
          <h1 className="text-xl font-black text-secondary leading-none">Ajuda</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Centro de Ajuda</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-10 pb-24">
        {/* Hero */}
        <div className="bg-primary rounded-[40px] p-8 md:p-10 mb-8 flex flex-col gap-3">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight italic">
            Como podemos ajudar?
          </h2>
          <p className="text-white/80 font-medium text-sm leading-relaxed">
            Encontre respostas às perguntas mais frequentes sobre o AgrowLink.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {sections.map((s, i) => (
            <AccordionItem key={i} section={s} index={i} />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-8 bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-black text-secondary text-base">Não encontrou resposta?</p>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Contacte-nos diretamente em{" "}
              <span className="text-primary font-black">av.pereiradacosta@gmail.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
