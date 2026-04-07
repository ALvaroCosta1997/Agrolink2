import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Phone, MessageCircle, Share2, Heart, Calendar, Info, CheckCircle2, Flag } from 'lucide-react';
import { Listing } from '../types';
import { ContactPolicy } from '../App';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

import { cn } from '../utils/cn';

interface ListingDetailsProps {
  listing: Listing;
  onBack: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onStartChat?: () => void;
  onCall?: () => void;
  isLoggedIn: boolean;
  onRequireAuth: (action: () => void) => void;
  policy: ContactPolicy;
  onReport?: () => void;
}

export function ListingDetails({ 
  listing, 
  onBack, 
  onToggleFavorite, 
  isFavorite, 
  onStartChat, 
  onCall,
  isLoggedIn,
  onRequireAuth,
  policy,
  onReport,
}: ListingDetailsProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const speciesIcon = listing.species === 'Vacas' ? '🐄' : listing.species === 'Ovelhas' ? '🐑' : '🐐';
  const totalQty = listing.maleQty + listing.femaleQty;

  const formatPrice = (val: number | undefined) => {
    if (val === undefined) return "-";
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatWeight = (val: number | undefined) => {
    if (val === undefined) return "-";
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getCompositionText = () => {
    if (listing.maleQty > 0 && listing.femaleQty === 0) {
      return `${listing.maleQty} ${listing.maleQty === 1 ? 'Macho' : 'Machos'}`;
    }
    if (listing.femaleQty > 0 && listing.maleQty === 0) {
      return `${listing.femaleQty} ${listing.femaleQty === 1 ? 'Fêmea' : 'Fêmeas'}`;
    }
    return `${listing.maleQty} Machos + ${listing.femaleQty} Fêmeas`;
  };

  const getLifeStageLabel = () => {
    const labels: Record<string, string> = {
      NEWBORN: listing.species === 'Vacas' ? 'Vitelo' : listing.species === 'Ovelhas' ? 'Borrego' : 'Cabrito',
      YOUNG: 'Jovem',
      ADULT: 'Adulto',
      SLAUGHTER: 'Pronto para abate'
    };
    const base = labels[listing.lifeStage] || 'Adulto';
    if (listing.lifeStage === 'NEWBORN') return `Recém-nascido / ${base}`;
    return base;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRequireAuth(() => {
      const cleanPhone = listing.contacts.phone.replace(/\D/g, '');
      const finalPhone = cleanPhone.startsWith('351') ? cleanPhone : `351${cleanPhone}`;
      const message = encodeURIComponent(`Olá, vi o seu anúncio de ${listing.species} (${listing.breed || ''}) no AgrowLink e gostaria de mais informações.`);
      window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
    });
  };

  const handleLocalCall = () => {
    onRequireAuth(() => {
      const cleanPhone = listing.contacts.phone.replace(/\D/g, '');
      const finalPhone = cleanPhone.startsWith('351') ? `+${cleanPhone}` : `+351${cleanPhone}`;
      window.location.href = `tel:${finalPhone}`;
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-white overflow-y-auto no-scrollbar pb-32">
      {/* Header Fixo */}
      <div className="sticky top-0 z-30 flex items-center justify-between p-6 bg-white/80 backdrop-blur-md">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          {onReport && (
            <button
              onClick={onReport}
              className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-transform text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors"
              title="Denunciar anúncio"
            >
              <Flag className="w-5 h-5" />
            </button>
          )}
          <button className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Galeria */}
        <div className="relative aspect-[4/3] sm:aspect-video w-full overflow-hidden">
          <ImageWithFallback
            src={listing.photos[photoIndex] || listing.photos[0]}
            alt={listing.species}
            className="w-full h-full object-cover"
          />
          {listing.photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIndex((i) => (i - 1 + listing.photos.length) % listing.photos.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <ChevronLeft className="w-6 h-6 text-secondary" />
              </button>
              <button
                onClick={() => setPhotoIndex((i) => (i + 1) % listing.photos.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <ChevronRight className="w-6 h-6 text-secondary" />
              </button>
              <div className="absolute bottom-6 right-6 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white rounded-xl font-black text-sm">
                {photoIndex + 1} / {listing.photos.length}
              </div>
            </>
          )}
          <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-2xl flex items-center gap-3 font-black text-lg">
            <span>{speciesIcon}</span>
            <span className="uppercase tracking-widest text-sm">{listing.species}</span>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 md:p-10 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
                <Calendar className="w-4 h-4" />
                Publicado em {new Date(listing.createdAt).toLocaleDateString('pt-PT')}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-secondary">
                {getCompositionText()}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 font-bold text-lg">
                <MapPin className="text-primary w-5 h-5" />
                {listing.location.municipality}, {listing.location.freguesia}
              </div>
            </div>

            {/* Favorito Destaque */}
            <button 
              onClick={onToggleFavorite}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg",
                isFavorite 
                  ? "bg-red-50 text-red-500 border-2 border-red-200" 
                  : "bg-white border-2 border-slate-200 text-slate-500"
              )}
            >
              <Heart className={cn("w-6 h-6", isFavorite ? "fill-red-500" : "")} />
              {isFavorite ? "Remover dos Favoritos" : "Guardar nos Favoritos"}
            </button>
          </div>

          {/* Preço destaque */}
          <div className="bg-primary/5 border-2 border-primary/10 rounded-[32px] p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-primary/60 mb-1">Preço Total</p>
              <p className="text-5xl font-black text-primary">
                {typeof listing.price === 'number' ? `${formatPrice(listing.price)}€` : listing.price}
              </p>
            </div>
            {typeof listing.price === 'number' && (
              <div className="flex flex-col gap-2 text-center sm:text-right">
                {listing.maleQty > 0 && listing.malePrice && (
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço p/ Macho</p>
                    <p className="text-xl font-black text-slate-600">{formatPrice(listing.malePrice)}€</p>
                  </div>
                )}
                {listing.femaleQty > 0 && listing.femalePrice && (
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço p/ Fêmea</p>
                    <p className="text-xl font-black text-slate-600">{formatPrice(listing.femalePrice)}€</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detalhes Técnicos */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Espécie', value: listing.species, icon: '🐄' },
                { label: 'Fase', value: getLifeStageLabel(), icon: '📈' },
                { label: 'Raça', value: listing.breed || 'Não especificada', icon: '🧬' },
                { label: 'Total Lote', value: totalQty, icon: '🔢' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{item.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <p className="font-black text-lg text-secondary">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listing.maleQty > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nº Machos</p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-3xl">♂️</span>
                      <p className="font-black text-4xl text-secondary">{listing.maleQty}</p>
                    </div>
                    <div className="w-full bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Peso Médio Macho</p>
                      <p className="text-2xl font-black text-primary">{formatWeight(listing.maleAvgWeight)} kg</p>
                    </div>
                  </div>
                </div>
              )}

              {listing.femaleQty > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nº Fêmeas</p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-3xl">♀️</span>
                      <p className="font-black text-4xl text-secondary">{listing.femaleQty}</p>
                    </div>
                    <div className="w-full bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Peso Médio Fêmea</p>
                      <p className="text-2xl font-black text-primary">{formatWeight(listing.femaleAvgWeight)} kg</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-4">
            <h3 className="text-2xl font-black text-secondary">Descrição do Vendedor</h3>
            <p className="text-lg text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">
              {listing.description}
            </p>
          </div>

          {/* Contactos */}
          <div className="bg-slate-900 text-white rounded-[40px] p-8 md:p-10 flex flex-col gap-8 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Vendedor</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-2xl font-black">{listing.contacts.name}</h4>
                  {!isLoggedIn && (
                    <span className="px-2 py-0.5 bg-white/10 rounded text-[8px] font-black uppercase tracking-widest text-white/40 border border-white/5">Gado Verificado</span>
                  )}
                </div>
                {isLoggedIn && (
                  <p className="text-sm font-bold text-primary/80 mt-1">{listing.contacts.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => onRequireAuth(() => onStartChat?.())}
                className={cn(
                  "h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg shadow-primary/20",
                  !policy.showDirectContact ? "bg-primary text-white col-span-2" : "bg-primary text-white col-span-1 sm:col-span-2"
                )}
              >
                <MessageCircle className="w-6 h-6" /> Enviar Mensagem
              </button>

              {policy.showDirectContact ? (
                <>
                  <button 
                    onClick={handleLocalCall}
                    className="h-16 bg-white text-slate-900 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform border-2 border-slate-100"
                  >
                    <Phone className="w-6 h-6" /> 
                    {isLoggedIn ? "Ligar Agora" : "Ver Número"}
                  </button>
                  {listing.contacts.whatsapp && (
                    <button 
                      onClick={handleWhatsApp}
                      className="h-16 bg-green-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
                    >
                      <MessageCircle className="w-6 h-6" /> WhatsApp
                    </button>
                  )}
                </>
              ) : (
                <div className="col-span-2 p-6 bg-white/5 border-2 border-white/10 rounded-3xl text-center">
                  <p className="text-sm font-bold text-white/60">
                    {policy.reason === 'OFF'
                      ? "O vendedor prefere ser contactado por mensagem interna."
                      : `Disponível por WhatsApp e telefone das ${policy.startTime} às ${policy.endTime}.`}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl text-xs font-medium text-white/60">
              <Info className="w-5 h-5 flex-shrink-0" />
              <p>O AgrowLink recomenda que nunca envie dinheiro adiantado sem ver os animais pessoalmente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
