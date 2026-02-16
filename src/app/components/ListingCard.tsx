import React, { useState } from 'react';
import { Heart, MapPin, CheckCircle2, Phone, MessageCircle, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Listing } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ImageWithFallback } from './figma/ImageWithFallback';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  isHovered?: boolean;
  isSelected?: boolean;
  isViewed?: boolean;
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
  isHovered,
  isSelected,
  isViewed
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
        "group relative bg-white border-2 rounded-[24px] overflow-hidden transition-all duration-300 cursor-pointer",
        isSelected || isHovered ? "border-primary shadow-xl ring-4 ring-primary/10" : "border-border shadow-sm hover:border-primary/50",
        isViewed && !(isSelected || isHovered) && "opacity-85 grayscale-[0.1] bg-slate-50 border-slate-200"
      )}
    >
      <div className="flex flex-col sm:flex-row items-stretch min-h-[190px]">
        {/* Imagem com Carousel */}
        <div className="relative w-full sm:w-60 aspect-[4/3] sm:aspect-auto overflow-hidden bg-slate-100 group/image shrink-0">
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

          {/* Favorito Destaque - Agora dentro do container da imagem para alinhamento total */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            className={cn(
              "absolute top-3 left-3 z-30 w-11 h-11 rounded-full shadow-xl transition-all active:scale-90 flex items-center justify-center border-2",
              isFavorite ? "bg-red-500 text-white border-red-500" : "bg-white/95 backdrop-blur-sm text-slate-400 border-white"
            )}
          >
            <Heart className={cn("w-6 h-6", isFavorite ? "fill-white" : "")} />
          </button>

          {listing.photos.length > 1 && (
            <>
              <button 
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/image:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft className="w-5 h-5 text-secondary" strokeWidth={3} />
              </button>
              <button 
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/image:opacity-100 transition-opacity z-10"
              >
                <ChevronRight className="w-5 h-5 text-secondary" strokeWidth={3} />
              </button>
              
              <div className="absolute bottom-3 right-3 flex gap-1 z-10">
                {listing.photos.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === currentPhotoIndex ? "bg-white w-3" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center gap-2 text-xs font-bold z-10">
            <span>{speciesIcon}</span>
            <span className="uppercase tracking-widest">{listing.species}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between mb-1">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black leading-tight tracking-tight text-secondary">
                  {listing.species} — {getCompositionText()}
                </h3>
                
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total: {totalQty}</p>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                    {getLifeStageLabel()}
                  </p>
                </div>

                {listing.breed && (
                  <div className="flex items-center gap-1.5 text-primary mt-1">
                    <span className="text-xs font-black uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                      {listing.breed}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="text-2xl font-black text-primary">
                  {typeof listing.price === 'number' 
                    ? `${listing.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}€` 
                    : listing.price}
                </p>
                {typeof listing.price === 'number' && (
                  <div className="flex flex-col items-start gap-1.5 border-t border-slate-100 pt-2 min-w-[100px]">
                    {listing.maleQty > 0 && listing.malePrice && (
                      <p className="text-[14px] font-black text-secondary leading-none">
                        ♂️ {listing.malePrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}€/un
                      </p>
                    )}
                    {listing.femaleQty > 0 && listing.femalePrice && (
                      <p className="text-[14px] font-black text-secondary leading-none">
                        ♀️ {listing.femalePrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}€/un
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-500 font-medium mt-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">
                {listing.location.municipality}
                {!listing.location.showExactLocation && <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold text-slate-400">Prox.</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
            <div className="grid grid-cols-3 gap-2 w-full">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.();
                }}
                className="h-12 bg-primary text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-primary/10 transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={3} />
                <span className="text-[8px] font-black uppercase">Chat</span>
              </button>
              
              <a 
                href={`https://wa.me/${listing.contacts.phone.replace(/\s/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-12 bg-green-500 text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-green-500/10 no-underline transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={3} />
                <span className="text-[8px] font-black uppercase">WhatsApp</span>
              </a>

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCall?.();
                }}
                className="h-12 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-slate-900/10 no-underline transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={3} />
                <span className="text-[8px] font-black uppercase">Ligar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
