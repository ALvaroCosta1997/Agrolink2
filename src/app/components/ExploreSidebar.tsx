import React from 'react';
import { Filter, RefreshCw, X, AlertCircle, Map as MapIcon, LayoutGrid, ChevronLeft, TrendingUp, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, Species } from '../types';
import { ListingCard } from './ListingCard';
import { ContactPolicy } from '../App';
import { cn } from '../utils/cn';

interface ExploreSidebarProps {
  filters: any;
  setFilters: (f: any) => void;
  setShowFilters: (s: boolean) => void;
  sortBy: string;
  setSortBy: (s: any) => void;
  showSortMenu: boolean;
  setShowSortMenu: (s: boolean) => void;
  handleSpeciesChange: (s: Species) => void;
  activePolygon: any;
  setActivePolygon: (p: any) => void;
  filteredListings: Listing[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  handleListingClick: (l: Listing) => void;
  handleStartChat: (l: Listing) => void;
  handleCall: (l: Listing) => void;
  handleWhatsApp: (l: Listing) => void;
  hoveredListingId: string | null;
  setHoveredListingId: (id: string | null) => void;
  selectedListingId: string | null;
  viewedListings: string[];
  navigateToDetails: (l: Listing) => void;
  cardRefs: React.MutableRefObject<{[key: string]: HTMLDivElement | null}>;
  isLoggedIn?: boolean;
  getContactPolicy: (listing: Listing) => ContactPolicy;
  onReport?: (listing: Listing) => void;
  allListingsCount?: number;
  onPublish?: () => void;
}

export function ExploreSidebar({
  filters,
  setFilters,
  setShowFilters,
  sortBy,
  setSortBy,
  showSortMenu,
  setShowSortMenu,
  handleSpeciesChange,
  activePolygon,
  setActivePolygon,
  filteredListings,
  favorites,
  toggleFavorite,
  handleListingClick,
  handleStartChat,
  handleCall,
  handleWhatsApp,
  hoveredListingId,
  setHoveredListingId,
  selectedListingId,
  viewedListings,
  navigateToDetails,
  cardRefs,
  isLoggedIn,
  getContactPolicy,
  onReport,
  allListingsCount = 0,
  onPublish,
}: ExploreSidebarProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-2">
        {/* Search & Filter Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(true)}
            className="h-12 flex-1 bg-white border border-slate-200 rounded-2xl flex items-center px-4 gap-3 hover:border-primary transition-all shadow-sm active:scale-[0.98] group relative overflow-hidden"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Filter
                className="w-4 h-4 text-primary"
                strokeWidth={3}
              />
            </div>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="font-black text-[9px] text-secondary/40 uppercase tracking-[0.15em] leading-none mb-0.5">Filtros</span>
              <span className="font-bold text-sm text-secondary truncate">
                {filters.species.length > 0 ? filters.species.join(', ') : 'Pesquisa Avançada'}
              </span>
            </div>
            {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : (typeof v === 'number' && v > 0)) && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-sm" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={cn(
                "h-12 px-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 hover:border-secondary transition-all shadow-sm active:scale-[0.98]",
                showSortMenu && "border-secondary ring-2 ring-secondary/5"
              )}
            >
              <span className="text-lg">
                {sortBy === "RECENTES" ? "🕒" : sortBy === "ANTIGOS" ? "📅" : sortBy === "BARATO" ? "💰" : "💎"}
              </span>
              <span className="font-black text-[10px] text-secondary uppercase tracking-wider hidden sm:block">
                {sortBy === "RECENTES" ? "Recentes" : sortBy === "ANTIGOS" ? "Antigos" : sortBy === "BARATO" ? "Mais Barato" : "Mais Caro"}
              </span>
            </button>

            <AnimatePresence>
              {showSortMenu && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowSortMenu(false)}
                    className="fixed inset-0 z-[60] bg-black/5 md:bg-transparent"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[70] p-2 overflow-hidden"
                  >
                    {[
                      { id: "RECENTES", label: "Recentes", icon: "🕒", sub: "Novidades primeiro" },
                      { id: "ANTIGOS", label: "Antigos", icon: "📅", sub: "Publicados há mais tempo" },
                      { id: "BARATO", label: "Mais Barato", icon: "💰", sub: "Preço baixo primeiro" },
                      { id: "CARO", label: "Mais Caro", icon: "💎", sub: "Oportunidades premium" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortBy(opt.id as any);
                          setShowSortMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left active:scale-[0.97]",
                          sortBy === opt.id 
                            ? "bg-secondary text-white shadow-lg" 
                            : "hover:bg-slate-50 text-secondary"
                        )}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-black text-xs uppercase tracking-tight">{opt.label}</span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-tighter opacity-60",
                            sortBy === opt.id ? "text-white/80" : "text-slate-400"
                          )}>{opt.sub}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Species Filter Pills - Responsive via Container Queries */}
        <div className="flex gap-1.5 @sm:gap-3 @md:gap-4 pb-1">
          {(["Vacas", "Ovelhas", "Cabras"] as Species[]).map((s) => {
            const isSelected = filters.species.includes(s);
            return (
              <button
                key={s}
                onClick={() => handleSpeciesChange(s)}
                className={cn(
                  "h-11 @sm:h-14 @md:h-16 flex-1 min-w-0 px-1 @sm:px-4 rounded-2xl font-black text-[9px] @sm:text-xs border-2 transition-all flex flex-col items-center justify-center gap-0.5 @sm:gap-1 active:scale-95",
                  isSelected
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-white text-slate-400 border-slate-100 hover:border-primary/30 hover:text-primary"
                )}
              >
                <span className="text-lg @sm:text-2xl @md:text-3xl leading-none transition-transform group-active:scale-125">
                  {s === "Vacas" ? "🐄" : s === "Ovelhas" ? "🐑" : "🐐"}
                </span>
                <span className="uppercase tracking-tighter @sm:tracking-widest leading-none text-[8px] @sm:text-[10px] text-center truncate w-full">{s}</span>
              </button>
            );
          })}
          {filters.species.length > 0 && (
            <button 
              onClick={() => setFilters((prev: any) => ({ ...prev, species: [] }))}
              className="h-11 @sm:h-14 @md:h-16 px-2 @sm:px-4 rounded-2xl font-black text-[9px] @sm:text-xs text-red-500 bg-red-50 border-2 border-red-100 uppercase tracking-tighter whitespace-nowrap hover:bg-red-100 transition-colors flex flex-col items-center justify-center gap-0.5"
            >
              <span className="text-base @sm:text-xl">✕</span>
              <span className="leading-none text-[9px] @sm:text-[11px]">Limpar</span>
            </button>
          )}
        </div>

        {activePolygon && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-primary/10 p-4 rounded-2xl border-2 border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="bg-primary p-3 rounded-xl text-white shadow-lg shadow-primary/20">
                <MapIcon className="w-6 h-6" strokeWidth={3} />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm text-primary uppercase tracking-widest leading-none">
                  Zona Desenhar
                </p>
                <p className="text-[11px] font-bold text-primary/60 mt-1 uppercase">
                  A mostrar apenas {filteredListings.length} resultados nesta área
                </p>
              </div>
              <button
                onClick={() => {
                  setActivePolygon(null);
                }}
                className="bg-white p-3 hover:bg-red-50 rounded-xl transition-all text-primary hover:text-red-500 shadow-sm border border-primary/5 active:scale-90"
              >
                <X className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      {filteredListings.length === 0 ? (
        allListingsCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="text-6xl mb-6">🌾</span>
            <p className="font-black text-2xl text-secondary mb-3">
              Sem anúncios disponíveis
            </p>
            <p className="text-sm font-bold text-slate-500 mb-8">
              Seja o primeiro a publicar um anúncio no AgroLink!
            </p>
            {onPublish && (
              <button
                onClick={onPublish}
                className="h-14 px-8 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform"
              >
                Publicar Anúncio
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-black text-xl text-secondary">
              Nada encontrado
            </p>
            <p className="text-sm font-medium">
              Tente mudar os filtros ou a zona desenhada.
            </p>
            <button
              onClick={() => {
                setFilters({
                  species: [],
                  breeds: [],
                  lifeStages: [],
                  minMales: 0,
                  minFemales: 0,
                  minPrice: 0,
                  maxPrice: 8000,
                  hasPhotos: false,
                  minMaleWeight: 0,
                  minFemaleWeight: 0,
                });
                setActivePolygon(null);
              }}
              className="mt-6 text-primary font-black text-lg underline underline-offset-4"
            >
              Limpar Tudo
            </button>
          </div>
        )
      ) : (
        <div className="grid gap-6">
          {filteredListings.map((listing, index) => (
            <div
              key={listing.id}
              ref={(el) =>
                (cardRefs.current[listing.id] = el)
              }
            >
              <ListingCard
                listing={listing}
                index={index + 1}
                isFavorite={favorites.includes(listing.id)}
                onToggleFavorite={() => toggleFavorite(listing.id)}
                onClick={() => { handleListingClick(listing); navigateToDetails(listing); }}
                onReport={onReport ? () => onReport(listing) : undefined}
                onChat={() => handleStartChat(listing)}
                onCall={() => handleCall(listing)}
                onWhatsApp={() => handleWhatsApp(listing)}
                onMouseEnter={() => setHoveredListingId(listing.id)}
                onMouseLeave={() => setHoveredListingId(null)}
                isHovered={hoveredListingId === listing.id}
                isSelected={selectedListingId === listing.id}
                isViewed={viewedListings.includes(listing.id)}
                isLoggedIn={isLoggedIn}
                policy={getContactPolicy(listing)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
