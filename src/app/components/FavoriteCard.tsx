import React from 'react';
import { Heart, MapPin, Calendar, ArrowRight, Trash2, MessageSquare, Phone, MessageCircle } from 'lucide-react';
import { Listing } from '../types';
import { ContactPolicy } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { cn } from '../utils/cn';

interface FavoriteCardProps {
  listing: Listing;
  onRemove: () => void;
  onClick: () => void;
  onChat?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  isLoggedIn?: boolean;
  policy: ContactPolicy;
}

export function FavoriteCard({ listing, onRemove, onClick, onChat, onCall, onWhatsApp, isLoggedIn, policy }: FavoriteCardProps) {
  const totalQty = listing.maleQty + listing.femaleQty;
  const priceDisplay = typeof listing.price === 'string' 
    ? listing.price 
    : `${listing.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}€`;

  const phoneHref = `tel:${listing.contacts.phone}`;
  const whatsappHref = `https://wa.me/${listing.contacts.phone.replace(/\s/g, '')}`;

  return (
    <div className="group relative bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
      <div className="flex flex-col h-full">
        {/* Top Section with Image */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <ImageWithFallback 
            src={listing.photos[0]} 
            alt={listing.species} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
          />
          
          {/* Price Tag */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-primary px-4 py-2 rounded-2xl shadow-xl shadow-primary/20 border-2 border-white/20">
              <span className="text-xl font-black text-white">{priceDisplay}</span>
            </div>
          </div>

          {/* Species Badge */}
          <div className="absolute top-4 left-4">
            <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2">
              <span className="text-lg">{listing.species === 'Vacas' ? '🐄' : listing.species === 'Ovelhas' ? '🐑' : '🐐'}</span>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{listing.species}</span>
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-6 flex flex-col flex-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{listing.location.municipality}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{totalQty} cab.</span>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-secondary line-clamp-1 leading-none pt-1">
              {listing.breed || 'Raça não especificada'}
            </h3>
            
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {listing.maleQty > 0 && `${listing.maleQty}M`} {listing.maleQty > 0 && listing.femaleQty > 0 && '•'} {listing.femaleQty > 0 && `${listing.femaleQty}F`}
            </p>
          </div>

          {/* Action Buttons - 3 Contacts + View More */}
          <div className="flex flex-col gap-3 mt-auto">
            <div className={cn(
              "grid gap-2",
              policy.showDirectContact ? "grid-cols-3" : "grid-cols-1"
            )}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.();
                }}
                className={cn(
                  "h-12 bg-primary text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-primary/10 transition-all active:scale-95",
                  !policy.showDirectContact ? "flex-row gap-3 h-14" : ""
                )}
              >
                <MessageSquare className={cn("w-3.5 h-3.5", !policy.showDirectContact ? "w-5 h-5" : "")} strokeWidth={3} />
                <span className={cn("text-[8px] font-black uppercase", !policy.showDirectContact ? "text-[12px]" : "")}>
                  {policy.showDirectContact ? (isLoggedIn ? "Chat" : "Ver") : "Enviar Mensagem"}
                </span>
              </button>
              
              {!policy.showDirectContact && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 text-center">
                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">
                    {policy.reason === 'OFF' ? 'Só Chat Activo' : 'Fora do Horário'}
                  </p>
                  <p className="text-[9px] font-bold text-orange-400 mt-1 uppercase">
                    {policy.reason === 'OFF' ? 'Contacto oculto pelo vendedor' : `Aberto às ${policy.startTime}`}
                  </p>
                </div>
              )}
              
              {policy.showDirectContact && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp?.();
                    }}
                    className="h-12 bg-green-500 text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-green-500/10 no-underline transition-all active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase">
                      {isLoggedIn ? "WhatsApp" : "Ver"}
                    </span>
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall?.();
                    }}
                    className="h-12 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-slate-900/10 no-underline transition-all active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase">
                      {isLoggedIn ? "Ligar" : "Ver"}
                    </span>
                  </button>
                </>
              )}
            </div>

            <button 
              onClick={onClick}
              className="h-10 w-full bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
            >
              Ver detalhes completos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
