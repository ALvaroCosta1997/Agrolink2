import React, { useState } from 'react';
import { Heart, MapPin, Phone, MessageCircle, ChevronLeft, ChevronRight, MessageSquare, Flag } from 'lucide-react';
import { Listing, formatCurrency } from '../types';
import { ContactPolicy } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

import { cn } from '../utils/cn';

interface ListingCardProps {
  listing: Listing;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onChat?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  isHovered?: boolean;
  isSelected?: boolean;
  isViewed?: boolean;
  isLoggedIn?: boolean;
  policy: ContactPolicy;
  onReport?: () => void;
}

export function ListingCard({ 
  listing, 
  index, 
  isFavorite, 
  onToggleFavorite, 
  onClick,
  onMouseEnter,
  onMouseLeave,
  onChat,
  onCall,
  onWhatsApp,
  isHovered,
  isSelected,
  isViewed,
  isLoggedIn,
  policy,
  onReport,
}: ListingCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const speciesIcon = listing.species === 'Vacas' ? '🐄' : listing.species === 'Ovelhas' ? '🐑' : '🐐';
  
  const totalQty = listing.maleQty + listing.femaleQty;
  
  const getCompositionText = () => {
    if (listing.maleQty > 0 && listing.femaleQty === 0) {
      return `${listing.maleQty} ${listing.maleQty === 1 ? 'Macho' : 'Machos'}`;
    }
    if (listing.femaleQty > 0 && listing.maleQty === 0) {
      return `${listing.femaleQty} ${listing.femaleQty === 1 ? 'Fêmea' : 'Fêmeas'}`;
    }
    return `${listing.maleQty} M + ${listing.femaleQty} F`;
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % listing.photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + listing.photos.length) % listing.photos.length);
  };

  const getLifeStageLabel = () => {
    const labels: Record<string, string> = {
      NEWBORN: listing.species === 'Vacas' ? 'Vitelo' : listing.species === 'Ovelhas' ? 'Borrego' : 'Cabrito',
      YOUNG: 'Jovem',
      ADULT: 'Adulto',
      SLAUGHTER: 'Abate'
    };
    return labels[listing.lifeStage] || 'Adulto';
  };

  return (
    <motion.div
      layout
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={cn(
        "group relative bg-white border-2 rounded-[20px] sm:rounded-[24px] overflow-hidden transition-all duration-300 cursor-pointer",
        isSelected || isHovered ? "border-primary shadow-xl ring-4 ring-primary/10" : "border-border shadow-sm hover:border-primary/50",
        isViewed && !(isSelected || isHovered) && "opacity-85 grayscale-[0.1] bg-slate-50 border-slate-200"
      )}
    >
      {/* Responds to Sidebar Width with Container Queries */}
      <div className="flex flex-row items-stretch h-[110px] @sm:h-[130px] @md:h-[160px] @lg:h-[180px]">
        {/* Image / Carousel Section */}
        <div className="relative w-[30%] min-w-[90px] h-full overflow-hidden bg-slate-100 group/image shrink-0 border-r border-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhotoIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <ImageWithFallback 
                src={listing.photos[currentPhotoIndex]} 
                alt={listing.species} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
            </motion.div>
          </AnimatePresence>

          {/* Species Badge */}
          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center gap-1 text-[8px] @sm:text-[10px] font-bold z-10 border border-white/10">
            <span>{speciesIcon}</span>
            <span className="uppercase tracking-widest hidden @sm:inline">{listing.species}</span>
          </div>

          {listing.photos.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-1 opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none">
              <button 
                onClick={prevPhoto}
                className="pointer-events-auto w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-md active:scale-90"
              >
                <ChevronLeft className="w-4 h-4 text-secondary" strokeWidth={3} />
              </button>
              <button 
                onClick={nextPhoto}
                className="pointer-events-auto w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-md active:scale-90"
              >
                <ChevronRight className="w-4 h-4 text-secondary" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1 p-2 @sm:p-3 @md:p-4 flex flex-col justify-between gap-1 min-w-0">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0 min-w-0 flex-1">
                <h3 className="text-[12px] @sm:text-[14px] @md:text-[17px] font-black leading-tight tracking-tight text-secondary truncate">
                  {listing.species} — {getCompositionText()}
                </h3>
                
                <div className="flex flex-wrap gap-x-1 @sm:gap-x-2">
                  <p className="text-[9px] @sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter @sm:tracking-widest">Lote: {totalQty}</p>
                  <p className="text-[9px] @sm:text-[10px] font-bold text-primary uppercase tracking-tighter @sm:tracking-widest truncate">
                    {getLifeStageLabel()}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end shrink-0">
                <p className="text-[13px] @sm:text-[15px] @md:text-[20px] font-black text-primary leading-tight">
                  {typeof listing.price === 'number'
                    ? formatCurrency(listing.price)
                    : listing.price}
                </p>
                <div className="flex items-center gap-0.5 mt-1">
                  {onReport && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onReport(); }}
                      className="w-6 h-6 @sm:w-7 @sm:h-7 rounded-full text-slate-200 hover:text-red-400 transition-colors active:scale-90 flex items-center justify-center"
                      title="Denunciar anúncio"
                    >
                      <Flag className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.();
                    }}
                    className={cn(
                      "w-6 h-6 @sm:w-8 @sm:h-8 rounded-full transition-all active:scale-90 flex items-center justify-center",
                      isFavorite ? "text-red-500" : "text-slate-300"
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5 @sm:w-5 @sm:h-5", isFavorite ? "fill-red-500" : "")} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-500 font-medium mt-0 @sm:mt-0.5">
              <MapPin className="w-2.5 h-2.5 @sm:w-3.5 @sm:h-3.5 text-primary shrink-0" />
              <span className="text-[9px] @sm:text-[11px] font-bold truncate">
                {listing.location.municipality}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 @sm:gap-2 pt-1 @sm:pt-2 border-t border-slate-50">
            <div className={cn(
              "grid gap-1 @sm:gap-2 w-full",
              policy.showDirectContact ? "grid-cols-3" : "grid-cols-1"
            )}>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.();
                }}
                className={cn(
                  "h-7 @sm:h-9 @md:h-11 bg-primary text-white rounded-lg @sm:rounded-xl flex flex-col items-center justify-center gap-0 @sm:gap-0.5 shadow-sm shadow-primary/10 transition-all active:scale-95",
                  !policy.showDirectContact ? "h-10 @sm:h-12 flex-row gap-2" : ""
                )}
              >
                <MessageSquare className={cn("w-2.5 h-2.5 @sm:w-3.5 @sm:h-3.5", !policy.showDirectContact ? "w-4 h-4" : "")} strokeWidth={3} />
                <span className={cn("text-[8px] @sm:text-[10px] font-black uppercase", !policy.showDirectContact ? "text-[10px]" : "")}>
                  {policy.showDirectContact ? "Chat" : "Enviar Mensagem"}
                </span>
              </button>
              
              {!policy.showDirectContact && (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[9px] @sm:text-[11px] font-black text-orange-500 uppercase tracking-tighter leading-none italic animate-pulse">
                    {policy.reason === 'OFF' ? 'SÓ CHAT ACTIVO' : 'FORA DO HORÁRIO'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-300 uppercase mt-0.5">
                    {policy.reason === 'OFF' ? 'Contactos ocultos' : `Aberto às ${policy.startTime}`}
                  </span>
                </div>
              )}
              
              {policy.showDirectContact && (
                <>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp?.();
                    }}
                    className="h-7 @sm:h-9 @md:h-11 bg-green-500 text-white rounded-lg @sm:rounded-xl flex flex-col items-center justify-center gap-0 @sm:gap-0.5 shadow-sm shadow-green-500/10 no-underline transition-all active:scale-95"
                  >
                    <MessageCircle className="w-2.5 h-2.5 @sm:w-3 @sm:h-3" strokeWidth={3} />
                    <span className="text-[8px] @sm:text-[10px] font-black uppercase truncate px-1">
                      {isLoggedIn ? "WhatsApp" : "Ver"}
                    </span>
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall?.();
                    }}
                    className="h-7 @sm:h-9 @md:h-11 bg-slate-900 text-white rounded-lg @sm:rounded-xl flex flex-col items-center justify-center gap-0 @sm:gap-0.5 shadow-sm shadow-slate-900/10 no-underline transition-all active:scale-95"
                  >
                    <Phone className="w-2.5 h-2.5 @sm:w-3 @sm:h-3" strokeWidth={3} />
                    <span className="text-[8px] @sm:text-[10px] font-black uppercase truncate px-1">
                      {isLoggedIn ? "Ligar" : "Ver"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
