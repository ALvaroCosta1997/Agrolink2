import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Toaster, toast } from "sonner";
import {
  Heart,
  PlusCircle,
  LayoutGrid,
  User,
  Map as MapIcon,
  Filter,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  X,
  MessageCircle,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Resizable } from "re-resizable";
import L from "leaflet";
import { Listing, Species, Sex } from "./types";
import { INITIAL_LISTINGS } from "./mockData";
import { ListingCard } from "./components/ListingCard";
import { MapView } from "./components/MapView";
import { ExploreSidebar } from "./components/ExploreSidebar";
import { ListingDetails } from "./components/ListingDetails";
import { PublishWizard } from "./components/PublishWizard";
import { FilterModal } from "./components/FilterModal";
import { MyListingCard } from "./components/MyListingCard";
import { FavoriteCard } from "./components/FavoriteCard";
import { ChatHistory } from "./components/ChatHistory";
import { CallModal } from "./components/CallModal";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Chat, ChatMessage, User as UserType } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View =
  | "explorar"
  | "favoritos"
  | "publicar"
  | "meus-anuncios"
  | "perfil"
  | "detalhes"
  | "mensagens";

const isPointInPolygon = (
  point: [number, number],
  polygon: [number, number][],
) => {
  const lat = point[0],
    lng = point[1];
  let inside = false;
  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const latI = polygon[i][0],
      lngI = polygon[i][1];
    const latJ = polygon[j][0],
      lngJ = polygon[j][1];
    
    // Standard Jordan Curve theorem / Ray Casting
    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) inside = !inside;
  }
  return inside;
};

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] =
    useState<View>("explorar");
  const [selectedListing, setSelectedListing] =
    useState<Listing | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const PRICE_SCALE_BY_SPECIES = {
    Vacas: { min: 0, max: 8000, step: 50, midpoint: 4000, defaultMin: 600, defaultMax: 3200 },
    Ovelhas: { min: 0, max: 600, step: 5, midpoint: 300, defaultMin: 80, defaultMax: 250 },
    Cabras: { min: 0, max: 700, step: 5, midpoint: 350, defaultMin: 80, defaultMax: 250 }
  };

  const [filters, setFilters] = useState({
    species: [] as Species[],
    breeds: [] as string[],
    lifeStages: [] as string[],
    minMales: 0,
    minFemales: 0,
    minPrice: 0,
    maxPrice: 8000,
    hasPhotos: false,
    minMaleWeight: 0,
    minFemaleWeight: 0,
  });

  // Reset/Clamp price filters when species changes
  useEffect(() => {
    if (filters.species.length === 1) {
      const sp = filters.species[0];
      const config = PRICE_SCALE_BY_SPECIES[sp];
      
      // If price was at default or 0/8000, or species just changed, set defaults
      setFilters(prev => {
        // We only reset if the previous species was different or empty
        // Since we don't have "previousSpecies" state, we check if current values are out of range
        // or we can use a ref to track last species
        return {
          ...prev,
          minPrice: Math.max(config.min, Math.min(prev.minPrice, config.max)),
          maxPrice: Math.max(config.min, Math.min(prev.maxPrice, config.max)),
        };
      });
    }
  }, [filters.species]);

  // Handle Species change defaults explicitly
  const handleSpeciesChange = (s: Species) => {
    setFilters((prev) => {
      const isSelectedNow = prev.species.includes(s);
      const newSpecies = isSelectedNow ? [] : [s];
      
      let nextFilters = {
        ...prev,
        species: newSpecies,
        breeds: [],
      };

      if (newSpecies.length === 1) {
        const config = PRICE_SCALE_BY_SPECIES[newSpecies[0] as Species];
        nextFilters.minPrice = config.defaultMin;
        nextFilters.maxPrice = config.defaultMax;
      }

      return nextFilters;
    });
  };
  const [hoveredListingId, setHoveredListingId] = useState<
    string | null
  >(null);
  const [selectedListingId, setSelectedListingId] = useState<
    string | null
  >(null);
  const [viewedListings, setViewedListings] = useState<
    string[]
  >([]);
  const [mobileViewMode, setMobileViewMode] = useState<
    "list" | "map"
  >("list");
  const [currentBounds, setCurrentBounds] =
    useState<L.LatLngBounds | null>(null);
  const [activePolygon, setActivePolygon] = useState<
    [number, number][] | null
  >(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [sortBy, setSortBy] = useState<"RECENTES" | "ANTIGOS" | "BARATO" | "CARO">("RECENTES");

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number | string>("35%");
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // New States for Chat and Call
  const [currentUser, setCurrentUser] = useState<UserType>({
    id: "user_current",
    name: "Produtor Demo",
    isLoggedIn: true,
    draftMessage:
      "Boa tarde, vi o seu anúncio no AgroLink e estou interessado. Ainda está disponível?",
  });
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<
    string | null
  >(null);
  const [callModalData, setCallModalData] = useState<{
    isOpen: boolean;
    phone: string;
    name: string;
  }>({
    isOpen: false,
    phone: "",
    name: "",
  });

  const cardRefs = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({});

  useEffect(() => {
    // Load chats from localStorage
    const savedChats = localStorage.getItem("agrolink_chats");
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "agrolink_chats",
      JSON.stringify(chats),
    );
  }, [chats]);

  const handleStartChat = (listing: Listing) => {
    // Check if chat already exists for this listing/seller
    let existingChat = chats.find(
      (c) =>
        c.listingId === listing.id ||
        (c.sellerId === listing.sellerId &&
          c.listingTitle ===
            `${listing.species} — ${listing.breed}`),
    );

    if (existingChat) {
      setSelectedChatId(existingChat.id);
    } else {
      // Process draft message to include listing context
      const listingContext = `${listing.species} — ${listing.breed || "Lote"}`;
      const processedMessage =
        currentUser.draftMessage.includes("{anuncio}")
          ? currentUser.draftMessage.replace(
              "{anuncio}",
              listingContext,
            )
          : `Olá! Estou interessado no seu anúncio "${listingContext}". ${currentUser.draftMessage}`;

      const newChat: Chat = {
        id: `chat_${Date.now()}`,
        listingId: listing.id,
        sellerId: listing.sellerId,
        buyerId: currentUser.id,
        listingTitle: listingContext,
        listingPreview: listing.photos[0],
        userName: listing.contacts.name,
        unread: false,
        lastUpdate: new Date().toISOString(),
        messages: [
          {
            id: `msg_${Date.now()}`,
            text: processedMessage,
            senderId: currentUser.id,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
    }
    setCurrentView("mensagens");
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) setSelectedChatId(null);
    toast.success("Conversa eliminada");
  };

  const handleCall = (listing: Listing) => {
    setCallModalData({
      isOpen: true,
      phone: listing.contacts.phone,
      name: listing.contacts.name,
    });
  };

  const handleSendMessage = (chatId: string, text: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            lastUpdate: new Date().toISOString(),
            messages: [
              ...c.messages,
              {
                id: `msg_${Date.now()}`,
                text,
                senderId: currentUser.id,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ],
          };
        }
        return c;
      }),
    );
  };

  useEffect(() => {
    const savedListingsRaw = localStorage.getItem(
      "agrolink_listings",
    );
    let finalListings: Listing[] = [];

    if (savedListingsRaw) {
      const parsed = JSON.parse(savedListingsRaw);
      // Migration Logic
      finalListings = parsed.map((l: any) => {
        let updatedListing = { ...l };

        // Old Sex/Qty migration
        if ("sex" in l && "quantity" in l) {
          const { sex, quantity, ...rest } = l;
          let maleQty = 0;
          let femaleQty = 0;
          if (sex === "Macho") maleQty = quantity;
          else if (sex === "Fêmea") femaleQty = quantity;
          else if (sex === "Misto") {
            maleQty = 1;
            femaleQty = Math.max(quantity - 1, 0);
          }
          updatedListing = { ...rest, maleQty, femaleQty };
        }

        // LifeStage migration
        if (!updatedListing.lifeStage) {
          const desc = (
            updatedListing.description || ""
          ).toLowerCase();
          if (
            desc.includes("abate") ||
            desc.includes("matadouro") ||
            desc.includes("engorda final")
          ) {
            updatedListing.lifeStage = "SLAUGHTER";
          } else if (
            desc.includes("vitelo") ||
            desc.includes("borrego") ||
            desc.includes("cabrito") ||
            desc.includes("recém-nascido")
          ) {
            updatedListing.lifeStage = "NEWBORN";
          } else if (updatedListing.ageGroup === "Jovem") {
            updatedListing.lifeStage = "YOUNG";
          } else {
            updatedListing.lifeStage = "ADULT";
          }
        }

        return updatedListing;
      });
      setListings(finalListings);
    } else {
      setListings(INITIAL_LISTINGS);
      localStorage.setItem(
        "agrolink_listings",
        JSON.stringify(INITIAL_LISTINGS),
      );
    }

    const savedFavs = localStorage.getItem(
      "agrolink_favorites",
    );
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
  }, []);

  const filteredListings = useMemo(() => {
    const filtered = listings.filter((l) => {
      const matchSpecies =
        filters.species.length === 0 ||
        filters.species.includes(l.species);
      const matchBreeds =
        filters.breeds.length === 0 ||
        (l.breed && filters.breeds.includes(l.breed));
      const matchLifeStage =
        filters.lifeStages.length === 0 ||
        filters.lifeStages.includes(l.lifeStage);

      const matchPrice = (() => {
        if (filters.species.length !== 1) return true;
        
        const inRange = (p?: number) => p !== undefined && p !== null && p >= filters.minPrice && p <= filters.maxPrice;
        
        const hasMalePrice = l.malePrice !== undefined && l.malePrice !== null;
        const hasFemalePrice = l.femalePrice !== undefined && l.femalePrice !== null;
        
        if (!hasMalePrice && !hasFemalePrice) return false;
        
        return inRange(l.malePrice) || inRange(l.femalePrice);
      })();

      const matchMales = l.maleQty >= filters.minMales;
      const matchFemales = l.femaleQty >= filters.minFemales;

      const matchMaleWeight =
        filters.minMaleWeight === 0 ||
        (l.maleAvgWeight &&
          l.maleAvgWeight >= filters.minMaleWeight);
      const matchFemaleWeight =
        filters.minFemaleWeight === 0 ||
        (l.femaleAvgWeight &&
          l.femaleAvgWeight >= filters.minFemaleWeight);

      const matchPolygon =
        !activePolygon ||
        isPointInPolygon(
          [l.location.lat, l.location.lng],
          activePolygon,
        );
      const matchBounds = activePolygon
        ? true
        : !currentBounds ||
          currentBounds.contains([
            l.location.lat,
            l.location.lng,
          ]);

      return (
        matchSpecies &&
        matchBreeds &&
        matchLifeStage &&
        matchPrice &&
        matchMales &&
        matchFemales &&
        matchMaleWeight &&
        matchFemaleWeight &&
        matchPolygon &&
        matchBounds
      );
    });

    // Sorting logic
    return [...filtered].sort((a, b) => {
      if (sortBy === "RECENTES") {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      }
      
      if (sortBy === "ANTIGOS") {
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      }

      const getMinPrice = (l: Listing) => {
        if (l.price === "Sob consulta") return Infinity;
        const prices = [];
        if (l.maleQty > 0 && l.malePrice) prices.push(l.malePrice);
        if (l.femaleQty > 0 && l.femalePrice) prices.push(l.femalePrice);
        return prices.length > 0 ? Math.min(...prices) : Infinity;
      };

      const priceA = getMinPrice(a);
      const priceB = getMinPrice(b);

      if (sortBy === "BARATO") {
        return priceA - priceB;
      } else if (sortBy === "CARO") {
        return priceB - priceA;
      }
      return 0;
    });
  }, [listings, filters, currentBounds, activePolygon, sortBy]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((fid) => fid !== id)
        : [...prev, id];
      localStorage.setItem(
        "agrolink_favorites",
        JSON.stringify(next),
      );
      if (!prev.includes(id))
        toast.success("Guardado nos favoritos");
      else toast.info("Removido dos favoritos");
      return next;
    });
  };

  const handlePublish = (newListing: Listing) => {
    const updated = [newListing, ...listings];
    setListings(updated);
    localStorage.setItem(
      "agrolink_listings",
      JSON.stringify(updated),
    );
    setCurrentView("meus-anuncios");
    toast.success("Anúncio publicado com sucesso!");
  };

  const handleListingClick = (listing: Listing) => {
    setSelectedListingId(listing.id);
    if (!viewedListings.includes(listing.id)) {
      const nextViewed = [...viewedListings, listing.id];
      setViewedListings(nextViewed);

      // Update the listing object itself so cards reflect it
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, viewed: true } : l,
        ),
      );
    }
    if (mobileViewMode === "map") {
      // Keep map active
    } else {
      setTimeout(() => {
        cardRefs.current[listing.id]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  };

  const navigateToDetails = (listing: Listing) => {
    setSelectedListing(listing);
    setCurrentView("detalhes");
  };

  const navigateToChat = (listing?: Listing) => {
    setCurrentView("mensagens");
    if (listing) {
      toast.success(
        `A iniciar conversa sobre o anúncio de ${listing.species}`,
      );
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "explorar":
        return (
          <div className="flex flex-col h-[calc(100dvh-128px)] md:h-[calc(100vh-96px)] md:flex-row overflow-hidden relative">
            {isDesktop ? (
              <Resizable
                size={{ width: sidebarWidth, height: "100%" }}
                onResize={(e, direction, ref, d) => {
                  setSidebarWidth(ref.offsetWidth);
                }}
                minWidth={420}
                maxWidth="65%"
                enable={{ right: true }}
                handleClasses={{ right: "group relative" }}
                handleComponent={{
                  right: (
                    <div className="absolute inset-y-0 -right-1 w-3 flex items-center justify-center cursor-col-resize z-50 hover:bg-primary/5 transition-colors">
                      <div className="w-1.5 h-24 bg-slate-200 rounded-full group-hover:bg-primary transition-all shadow-sm" />
                    </div>
                  )
                }}
                className={cn(
                  "relative bg-background border-r-2 border-primary/5 min-w-0 h-full flex flex-col",
                  mobileViewMode === "map" ? "hidden md:flex" : "flex"
                )}
              >
                <div className="@container h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 no-scrollbar flex flex-col gap-6">
                  <ExploreSidebar 
                    filters={filters}
                    setFilters={setFilters}
                    setShowFilters={setShowFilters}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    showSortMenu={showSortMenu}
                    setShowSortMenu={setShowSortMenu}
                    handleSpeciesChange={handleSpeciesChange}
                    activePolygon={activePolygon}
                    setActivePolygon={setActivePolygon}
                    filteredListings={filteredListings}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    handleListingClick={handleListingClick}
                    handleStartChat={handleStartChat}
                    handleCall={handleCall}
                    hoveredListingId={hoveredListingId}
                    setHoveredListingId={setHoveredListingId}
                    selectedListingId={selectedListingId}
                    viewedListings={viewedListings}
                    navigateToDetails={navigateToDetails}
                    cardRefs={cardRefs}
                  />
                </div>
              </Resizable>
            ) : (
              <div
                className={cn(
                  "flex-1 overflow-y-auto bg-background p-4 flex flex-col gap-6 no-scrollbar",
                  mobileViewMode === "map" ? "hidden" : "flex"
                )}
              >
                <ExploreSidebar 
                  filters={filters}
                  setFilters={setFilters}
                  setShowFilters={setShowFilters}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  showSortMenu={showSortMenu}
                  setShowSortMenu={setShowSortMenu}
                  handleSpeciesChange={handleSpeciesChange}
                  activePolygon={activePolygon}
                  setActivePolygon={setActivePolygon}
                  filteredListings={filteredListings}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  handleListingClick={handleListingClick}
                  handleStartChat={handleStartChat}
                  handleCall={handleCall}
                  hoveredListingId={hoveredListingId}
                  setHoveredListingId={setHoveredListingId}
                  selectedListingId={selectedListingId}
                  viewedListings={viewedListings}
                  navigateToDetails={navigateToDetails}
                  cardRefs={cardRefs}
                />
              </div>
            )}

            <div
              className={cn(
                "flex-1 relative md:flex min-w-0 border-l-2 border-primary/10",
                mobileViewMode === "list"
                  ? "hidden md:flex"
                  : "flex",
              )}
            >
              <MapView
                listings={filteredListings}
                onMarkerClick={(l) => handleListingClick(l)}
                onNavigateToDetails={(l) =>
                  navigateToDetails(l)
                }
                onChat={(l) => handleStartChat(l)}
                onCall={(l) => handleCall(l)}
                hoveredId={hoveredListingId}
                onMarkerHover={setHoveredListingId}
                onBoundsChange={(bounds) => {
                  setCurrentBounds(bounds);
                  setShowSearchHere(true);
                }}
                selectedId={selectedListingId}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onPolygonCreated={(poly) => {
                  setActivePolygon(poly);
                  setShowSearchHere(false);
                }}
                onPolygonDeleted={() => setActivePolygon(null)}
                mobileViewMode={mobileViewMode}
              />

              {showSearchHere && !activePolygon && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
                  <button
                    onClick={() => {
                      setShowSearchHere(false);
                      toast.success(
                        "Lista atualizada para esta zona",
                      );
                    }}
                    className="bg-white text-primary px-6 py-3 rounded-full font-black text-sm shadow-2xl border-2 border-primary/20 flex items-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Pesquisar nesta zona
                  </button>
                </div>
              )}
            </div>

            <div className="md:hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
              <button
                onClick={() =>
                  setMobileViewMode(
                    mobileViewMode === "list" ? "map" : "list",
                  )
                }
                className="bg-primary text-white px-8 py-4 rounded-full font-black text-lg shadow-2xl flex items-center gap-3 active:scale-90 transition-transform"
              >
                {mobileViewMode === "list" ? (
                  <>
                    <MapIcon
                      className="w-6 h-6"
                      strokeWidth={3}
                    />{" "}
                    Ver Mapa
                  </>
                ) : (
                  <>
                    <LayoutGrid
                      className="w-6 h-6"
                      strokeWidth={3}
                    />{" "}
                    Ver Lista
                  </>
                )}
              </button>
            </div>
          </div>
        );
      case "favoritos":
        const favoriteListings = listings.filter((l) =>
          favorites.includes(l.id),
        );
        return (
          <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col gap-2">
              <h1 className="text-5xl font-black text-secondary">
                Favoritos
              </h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                {favoriteListings.length}{" "}
                {favoriteListings.length === 1
                  ? "Anúncio guardado"
                  : "Anúncios guardados"}
              </p>
            </div>

            {favoriteListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 bg-white rounded-[48px] border-4 border-dashed border-primary/10">
                <Heart className="w-24 h-24 mb-6 opacity-10" />
                <p className="text-2xl font-black text-secondary">
                  Ainda não guardou anúncios
                </p>
                <p className="text-lg font-medium">
                  Toque no coração para guardar oportunidades
                  interessantes.
                </p>
                <button
                  onClick={() => setCurrentView("explorar")}
                  className="mt-8 px-10 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                >
                  Explorar Mercado
                </button>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {favoriteListings.map((l) => (
                  <FavoriteCard
                    key={l.id}
                    listing={l}
                    onRemove={() => toggleFavorite(l.id)}
                    onClick={() => navigateToDetails(l)}
                    onChat={() => handleStartChat(l)}
                    onCall={() => handleCall(l)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "meus-anuncios":
        const myAds = listings.filter(
          (l) =>
            l.sellerId === "user_current" ||
            l.sellerId === "user_1" ||
            l.id.startsWith("generated-1"),
        );
        return (
          <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-10 pb-32">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("perfil")}
                className="w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary active:scale-90 transition-all shadow-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col gap-1">
                <h1 className="text-4xl font-black text-secondary uppercase leading-none">
                  Os Meus Anúncios
                </h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  +12% vistas esta semana
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100">
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-500 max-w-md uppercase tracking-tight">
                  Gira os seus anúncios de gado num único lugar.
                </p>
              </div>
              <button
                onClick={() => setCurrentView("publicar")}
                className="h-16 bg-primary text-white px-10 rounded-[24px] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95 whitespace-nowrap"
              >
                <PlusCircle
                  className="w-7 h-7"
                  strokeWidth={3}
                />{" "}
                Criar Novo
              </button>
            </div>

            {/* Global Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Anúncios Ativos",
                  value: myAds.length,
                  color: "text-primary",
                },
                {
                  label: "Total Vistas",
                  value: "1.2k",
                  color: "text-secondary",
                },
                {
                  label: "Total Contactos",
                  value: "45",
                  color: "text-green-600",
                },
                {
                  label: "Interessados",
                  value: "89",
                  color: "text-red-500",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-black",
                      stat.color,
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {myAds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 bg-slate-50 rounded-[48px] border-4 border-dashed border-slate-200">
                <LayoutGrid className="w-24 h-24 mb-6 opacity-10" />
                <p className="text-2xl font-black text-secondary">
                  Ainda não tem anúncios
                </p>
                <p className="text-lg font-medium">
                  Venda o seu gado de forma rápida e segura.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {myAds.map((l) => (
                  <MyListingCard
                    key={l.id}
                    listing={l}
                    onMarkAsSold={() =>
                      toast.success(
                        "Anúncio marcado como vendido!",
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "mensagens":
        return (
          <ChatHistory
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onSendMessage={handleSendMessage}
            onDeleteChat={handleDeleteChat}
            currentUser={currentUser}
            onUpdateDraft={(text) =>
              setCurrentUser((prev) => ({
                ...prev,
                draftMessage: text,
              }))
            }
            onViewDetails={(listingId) => {
              const listing = listings.find(
                (l) => l.id === listingId,
              );
              if (listing) {
                setSelectedListing(listing);
                setCurrentView("detalhes");
              }
            }}
          />
        );
      case "publicar":
        return (
          <PublishWizard
            onCancel={() => setCurrentView("explorar")}
            onPublish={handlePublish}
          />
        );
      case "detalhes":
        return selectedListing ? (
          <ListingDetails
            listing={selectedListing}
            onBack={() => setCurrentView("explorar")}
            onToggleFavorite={() =>
              toggleFavorite(selectedListing.id)
            }
            isFavorite={favorites.includes(selectedListing.id)}
            onStartChat={() => handleStartChat(selectedListing)}
            onCall={() => handleCall(selectedListing)}
          />
        ) : null;
      case "perfil":
        const myAdsCount = listings.filter(
          (l) =>
            l.sellerId === "user_current" ||
            l.sellerId === "user_1" ||
            l.id.startsWith("generated-1"),
        ).length;
        return (
          <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-8 pb-32">
            <h1 className="text-5xl font-black text-secondary">
              O Meu Perfil
            </h1>
            <div className="bg-white p-10 rounded-[48px] border-2 border-primary/10 flex flex-col sm:flex-row items-center gap-8 shadow-sm">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-primary" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-3xl font-black text-secondary">
                  {currentUser.name}
                </h2>
                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">
                  Alentejo, Portugal
                </p>
              </div>
              <button
                onClick={() => setCurrentView("explorar")}
                className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* My Listings Entry Point - Unified UI */}
            <button
              onClick={() => setCurrentView("meus-anuncios")}
              className="w-full bg-secondary text-white p-8 rounded-[40px] flex items-center justify-between shadow-xl shadow-secondary/10 group active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                  <LayoutGrid className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black uppercase leading-none">
                    Os Meus Anúncios
                  </h3>
                  <p className="text-sm font-bold text-white/60 uppercase tracking-widest mt-1">
                    {myAdsCount} anúncios publicados
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-10 h-10 rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Quick Settings - Draft Message */}
            <div className="bg-primary/5 rounded-[40px] p-8 border-2 border-primary/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-secondary leading-none uppercase">
                    Mensagem Automática
                  </h3>
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">
                    Configuração de Resposta Rápida
                  </p>
                </div>
              </div>
              <textarea
                value={currentUser.draftMessage}
                onChange={(e) =>
                  setCurrentUser((prev) => ({
                    ...prev,
                    draftMessage: e.target.value,
                  }))
                }
                className="w-full h-32 bg-white border-2 border-primary/10 rounded-3xl p-6 font-bold text-secondary text-sm focus:border-primary outline-none transition-all resize-none mb-4"
                placeholder="Escreva a sua mensagem automática padrão..."
              />
              <p className="text-[10px] font-bold text-slate-400 italic text-center leading-tight">
                Esta mensagem será enviada automaticamente
                quando iniciar uma nova conversa com um
                vendedor.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                "Segurança e Pagamentos",
                "Contactar Apoio",
                "Sair da Conta",
              ].map((item, i) => (
                <button
                  key={i}
                  className="w-full text-left px-8 py-6 bg-white border-2 border-primary/5 rounded-[32px] flex items-center justify-between hover:border-primary/20 transition-all"
                >
                  <span className="text-lg font-black text-secondary">
                    {item}
                  </span>
                  <ChevronLeft className="w-6 h-6 rotate-180 text-primary/30" />
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-['Inter',_sans-serif]">
      <header className="hidden md:grid grid-cols-[1.2fr_auto_1.2fr] h-24 items-center px-10 border-b border-primary/10 sticky top-0 bg-background/80 backdrop-blur-md z-[1500]">
        <div
          className="flex items-center gap-4 cursor-pointer min-w-0"
          onClick={() => setCurrentView("explorar")}
        >
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="text-white font-black text-3xl italic">
              A
            </span>
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden pr-4">
            <span className="font-black text-2xl lg:text-3xl tracking-tighter leading-none text-secondary">
              AgroLink
            </span>
            <span className="hidden lg:block text-[10px] text-primary/60 uppercase tracking-[0.3em] font-black mt-1 leading-tight">
              A Ligar Produtores
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 xl:gap-3 bg-white/50 p-1.5 xl:p-2 rounded-full border border-primary/10 shadow-inner">
          {[
            { id: "explorar", icon: MapIcon, label: "Mapa" },
            {
              id: "mensagens",
              icon: MessageCircle,
              label: "Mensagens",
            },
            {
              id: "favoritos",
              icon: Heart,
              label: "Favoritos",
            },
            { id: "perfil", icon: User, label: "Perfil" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "flex items-center gap-2 xl:gap-3 px-4 xl:px-8 py-4 rounded-full text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap",
                currentView === item.id
                  ? "bg-primary text-white shadow-xl scale-105"
                  : "text-slate-400 hover:text-primary",
              )}
            >
              <item.icon className="w-4 h-4 xl:w-5 xl:h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex justify-end">
          <button
            onClick={() => setCurrentView("publicar")}
            className="bg-secondary text-white h-16 px-6 xl:px-10 rounded-2xl font-black text-base xl:text-lg shadow-xl shadow-secondary/20 hover:scale-105 transition-transform shrink-0 whitespace-nowrap"
          >
            Publicar Venda
          </button>
        </div>
      </header>

      {[
        "explorar",
        "favoritos",
        "meus-anuncios",
        "perfil",
      ].includes(currentView) && (
        <header className="md:hidden flex items-center justify-between px-6 py-5 bg-background border-b border-primary/10 sticky top-0 z-[1500]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-2xl">
                A
              </span>
            </div>
            <span className="font-black text-2xl tracking-tighter text-secondary">
              AgroLink
            </span>
          </div>
          <div className="flex items-center gap-3">
            {currentView === "explorar" && (
              <button
                onClick={() => setCurrentView("publicar")}
                className="w-12 h-12 bg-secondary text-white rounded-xl flex items-center justify-center shadow-lg"
              >
                <PlusCircle
                  className="w-7 h-7"
                  strokeWidth={3}
                />
              </button>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 md:pb-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-primary/10 px-6 py-5 flex justify-between items-center z-[1500]">
        {[
          { id: "explorar", icon: MapIcon, label: "Mapa" },
          {
            id: "mensagens",
            icon: MessageCircle,
            label: "Mensagens",
          },
          { id: "favoritos", icon: Heart, label: "Favoritos" },
          { id: "perfil", icon: User, label: "Perfil" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as View)}
            className={cn(
              "flex flex-col items-center gap-2 transition-all",
              currentView === item.id
                ? "text-primary scale-110"
                : "text-slate-400",
            )}
          >
            <item.icon
              className={cn(
                "w-8 h-8",
                currentView === item.id
                  ? "stroke-[3px]"
                  : "stroke-2",
              )}
            />
            <span className="text-[11px] font-black uppercase tracking-widest">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <CallModal
        isOpen={callModalData.isOpen}
        onClose={() =>
          setCallModalData((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        phone={callModalData.phone}
        sellerName={callModalData.name}
      />

      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
      />
      <Toaster position="top-center" richColors />
    </div>
  );
}