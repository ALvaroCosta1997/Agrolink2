import React from 'react';
import { Eye, MessageSquare, Heart, Edit2, CheckCircle2, MoreVertical, TrendingUp } from 'lucide-react';
import { Listing } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MyListingCardProps {
  listing: Listing;
  onEdit?: () => void;
  onMarkAsSold?: () => void;
}

export function MyListingCard({ listing, onEdit, onMarkAsSold }: MyListingCardProps) {
  const stats = listing.stats || { views: 0, contacts: 0, saves: 0 };
  const totalQty = listing.maleQty + listing.femaleQty;
  
  return (
    <div className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row">
        {/* Visual Preview */}
        <div className="relative w-full sm:w-48 aspect-[4/3] sm:aspect-auto shrink-0 bg-slate-100">
          <ImageWithFallback 
            src={listing.photos[0]} 
            alt={listing.species} 
            className="w-full h-full object-cover" 
          />
          <div className={cn(
            "absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg",
            listing.status === 'Ativo' ? "bg-green-500 text-white" : "bg-slate-500 text-white"
          )}>
            {listing.status}
          </div>
        </div>

        {/* Content & KPIs */}
        <div className="flex-1 p-5 flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black text-secondary leading-tight">
                {listing.species} — {totalQty} unidades
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Publicado em {new Date(listing.createdAt).toLocaleDateString('pt-PT')}
              </p>
            </div>
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <Eye className="w-4 h-4 text-primary mb-1" />
              <span className="text-lg font-black text-secondary">{stats.views}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Vistas</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <MessageSquare className="w-4 h-4 text-green-500 mb-1" />
              <span className="text-lg font-black text-secondary">{stats.contacts}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Contactos</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <Heart className="w-4 h-4 text-red-500 mb-1" />
              <span className="text-lg font-black text-secondary">{stats.saves}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Guardados</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button 
              onClick={onEdit}
              className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
            <button 
              onClick={onMarkAsSold}
              className="flex-1 h-12 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Marcar Vendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
