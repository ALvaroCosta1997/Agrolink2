import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
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
  Phone,
  Info,
  CheckCircle2,
  MapPin,
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
import { Chat, ChatMessage, User as UserType, UsageMode } from "./types";
import { AuthGate } from "./components/AuthGate";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { Lock, LogIn, Loader2 } from "lucide-react";
import { HelpPage } from "./components/HelpPage";
import { SecurityPage } from "./components/SecurityPage";
import { TermsPage } from "./components/TermsPage";
import { ReportModal } from "./components/ReportModal";
import { AdminReportsPage } from "./components/AdminReportsPage";

import { cn } from "./utils/cn";
import * as api from "./api";
import { PhoneCountrySelect } from "./components/PhoneCountrySelect";
import { DistritoSelect } from "./components/DistritoSelect";

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

export type ContactPolicy = {
  showDirectContact: boolean;
  reason: 'ON' | 'OFF' | 'OUT_OF_HOURS';
  startTime?: string;
  endTime?: string;
};

const getContactPolicy = (listing: Listing, currentUser: UserType | null): ContactPolicy => {
  // 1. Resolve Seller Visibility
  const defaultVisibility = {
    enabled: true,
    mode: 'ALWAYS' as const,
    startTime: '09:00',
    endTime: '19:00'
  };

  const isOwner = currentUser && (
    listing.sellerId === currentUser.id || 
    listing.id.startsWith("generated-1")
  );

  const visibility = isOwner && currentUser 
    ? (currentUser.contactVisibility || defaultVisibility)
    : (listing.location.municipality === 'Beja' 
      ? { enabled: true, mode: 'SCHEDULE' as const, startTime: '10:00', endTime: '14:00' }
      : (listing.location.municipality === 'Elvas'
        ? { enabled: false, mode: 'ALWAYS' as const, startTime: '09:00', endTime: '19:00' }
        : defaultVisibility));

  // 2. Compute Policy
  if (!visibility.enabled) {
    return { showDirectContact: false, reason: 'OFF' };
  }

  if (visibility.mode === 'ALWAYS') {
    return { showDirectContact: true, reason: 'ON' };
  }

  // Schedule check (Portugal Time)
  const now = new Date();
  const options = { timeZone: 'Europe/Lisbon', hour12: false, hour: '2-digit', minute: '2-digit' } as const;
  const currentTimeStr = now.toLocaleTimeString('pt-PT', options);
  
  const [currentH, currentM] = currentTimeStr.split(':').map(Number);
  const [startH, startM] = visibility.startTime.split(':').map(Number);
  const [endH, endM] = visibility.endTime.split(':').map(Number);
  
  const currentTotal = currentH * 60 + currentM;
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  
  const inHours = currentTotal >= startTotal && currentTotal <= endTotal;

  if (!inHours) {
    return { 
      showDirectContact: false, 
      reason: 'OUT_OF_HOURS', 
      startTime: visibility.startTime, 
      endTime: visibility.endTime 
    };
  }

  return { showDirectContact: true, reason: 'ON' };
};

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] =
    useState<View>("explorar");
  const [selectedListing, setSelectedListing] =
    useState<Listing | null>(null);
  const [editingListing, setEditingListing] =
    useState<Listing | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(() =>
    !document.cookie.split(";").some((c) => c.trim().startsWith("agrolink_consent="))
  );

  const handleCookieConsent = (accepted: boolean) => {
    const value = accepted ? "accepted" : "rejected";
    document.cookie = `agrolink_consent=${value}; path=/; max-age=31536000; SameSite=Lax`;
    setShowCookieBanner(false);
  };
  const [favSpeciesFilter, setFavSpeciesFilter] = useState<Species | null>(null);
  const [profileSubPage, setProfileSubPage] = useState<"ajuda" | "seguranca" | "termos" | "admin" | null>(null);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  const ADMIN_EMAIL = "av.pereiradacosta@gmail.com";
  const [reportTarget, setReportTarget] = useState<{
    listingId?: string;
    listingTitle?: string;
    reportedUserId?: string;
  } | null>(null);

  const handleOpenReport = (listingId?: string, reportedUserId?: string, listingTitle?: string) => {
    requireAuth(async () => {
      const user = currentUserRef.current;
      if (!user || !listingId) {
        setReportTarget({ listingId, reportedUserId, listingTitle });
        return;
      }
      try {
        const { data } = await api.supabase
          .from("reports")
          .select("id")
          .eq("reporter_id", user.id)
          .eq("listing_id", listingId)
          .maybeSingle();
        if (data) {
          toast.info("Já denunciou este anúncio. Estamos a analisar.");
          return;
        }
      } catch {
        // If the check fails, still allow the modal to open
      }
      setReportTarget({ listingId, reportedUserId, listingTitle });
    });
  };

  const [filters, setFilters] = useState({
    species: [] as Species[],
    breeds: [] as string[],
    lifeStages: [] as string[],
    minMales: 0,
    minFemales: 0,
    minPrice: 0,
    maxPrice: 999999, // effectively "no upper limit" until user sets one in the modal
    hasPhotos: false,
    minMaleWeight: 0,
    minFemaleWeight: 0,
  });


  // Quick species filter buttons — only toggle species, never touch price range
  const handleSpeciesChange = (s: Species) => {
    setFilters((prev) => ({
      ...prev,
      species: prev.species.includes(s) ? [] : [s],
      breeds: [],
    }));
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

  // Loading state
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // New States for Auth
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  const currentUserRef = useRef<UserType | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const [isAuthGateVisible, setIsAuthGateVisible] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requireAuth = (action: () => void) => {
    if (currentUser?.isLoggedIn) {
      action();
    } else {
      setPendingAction(() => action);
      setIsAuthGateVisible(true);
    }
  };

  const handleLoginSuccess = async (email: string, userId: string, token: string) => {
    setAccessToken(token);
    setIsLoginVisible(false);

    try {
      // Fetch profile from backend
      const profileData = await api.profile.get();
      
      const userProfile: UserType = {
        id: userId,
        name: profileData?.name || email.split('@')[0],
        email: email,
        isLoggedIn: true,
        draftMessage: profileData?.draftMessage || "Boa tarde, vi o seu anúncio no AgroLink e estou interessado. Ainda está disponível?",
        mode: profileData?.mode || 'AMBOS',
        region: profileData?.region || '',
        isFirstLogin: profileData?.isFirstLogin ?? true,
        phoneNumber: profileData?.phoneNumber || '',
        phoneCountry: profileData?.phoneCountry || '+351',
        contactVisibility: profileData?.contactVisibility || {
          enabled: true,
          mode: 'ALWAYS',
          startTime: '09:00',
          endTime: '19:00'
        }
      };

      setCurrentUser(userProfile);

      // Load user-specific data from backend
      try {
        const [userFavs, userChats] = await Promise.all([
          api.favorites.get(),
          api.chats.getAll(),
        ]);
        setFavorites(userFavs);
        // Compute unread flag for each chat
        try {
          const { data: unreadRows } = await api.supabase
            .from("chat_messages")
            .select("chat_id")
            .neq("sender_id", userId)
            .is("read_at", null);
          if (unreadRows && unreadRows.length > 0) {
            const unreadChatIds = new Set(unreadRows.map((r: any) => r.chat_id as string));
            setChats(userChats.map((c) => ({ ...c, unread: unreadChatIds.has(c.id) })));
          } else {
            setChats(userChats);
          }
        } catch {
          setChats(userChats);
        }
      } catch (e) {
        console.log("Non-critical: failed to load user data", e);
      }

      if (userProfile.isFirstLogin) {
        setIsOnboardingVisible(true);
      } else {
        if (pendingAction) {
          setTimeout(() => {
            pendingAction();
            setPendingAction(null);
          }, 300);
        }
        toast.success("Bem-vindo de volta ao AgroLink!");
      }
    } catch (err) {
      console.error("Error loading profile after login:", err);
      // Fallback: create minimal user
      setCurrentUser({
        id: userId,
        name: email.split('@')[0],
        email,
        isLoggedIn: true,
        draftMessage: "Boa tarde, vi o seu anúncio no AgroLink e estou interessado. Ainda está disponível?",
        mode: 'AMBOS',
        isFirstLogin: true,
      });
      setIsOnboardingVisible(true);
    }
  };

  const handleOnboardingComplete = async (updatedUser: UserType) => {
    setCurrentUser(updatedUser);
    setIsOnboardingVisible(false);
    toast.success("Perfil configurado com sucesso!");
    
    // Persist profile to backend
    try {
      await api.profile.update({
        ...updatedUser,
        isFirstLogin: false,
      });
    } catch (err) {
      console.error("Error saving profile after onboarding:", err);
    }

    if (pendingAction) {
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 300);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.log("Logout error (non-critical):", e);
    }
    setCurrentUser(null);
    setAccessToken(null);
    setFavorites([]);
    setChats([]);
    setCurrentView("explorar");
    toast.info("Sessão terminada");
  };

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
  // Stores the latest map bounds without triggering a re-render on every pan/zoom.
  // currentBounds (state) is only updated when the user clicks "Pesquisar nesta zona".
  const latestBoundsRef = useRef<L.LatLngBounds | null>(null);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  // Chats are loaded from backend during init and after login — no localStorage needed

  const handleStartChat = (listing: Listing) => {
    requireAuth(async () => {
      const user = currentUserRef.current;
      if (!user) return;

      if (!isUuid(listing.sellerId)) {
        toast.error("Este anúncio é apenas de demonstração e não suporta chat.");
        return;
      }

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
        const listingContext = `${listing.species} — ${listing.breed || "Lote"}`;

        const newChat: Chat = {
          id: `chat_${Date.now()}`,
          listingId: listing.id,
          sellerId: listing.sellerId,
          buyerId: user.id,
          listingTitle: listingContext,
          listingPreview: listing.photos[0],
          userName: listing.contacts.name,
          unread: false,
          lastUpdate: new Date().toISOString(),
          messages: [],
        };
        setChats((prev) => [newChat, ...prev]);
        setSelectedChatId(newChat.id);

        // Persist chat to backend and replace temporary local id with DB id
        try {
          const savedChat = await api.chats.create(newChat);
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === newChat.id
                ? {
                    ...chat,
                    ...savedChat,
                    messages: savedChat.messages || chat.messages,
                  }
                : chat,
            ),
          );
          setSelectedChatId(savedChat.id);
        } catch (e) {
          console.error("Failed to persist chat:", e);
          toast.error("Não foi possível iniciar a conversa.");
        }
      }
      setCurrentView("mensagens");
    });
  };

  const handleSelectChat = async (chatId: string | null) => {
    setSelectedChatId(chatId);
    if (!chatId || !currentUser) return;
    // Optimistically clear unread badge
    setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, unread: false } : c));
    // Mark messages as read in DB
    try {
      await api.supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("chat_id", chatId)
        .neq("sender_id", currentUser.id)
        .is("read_at", null);
    } catch (e) {
      console.log("Non-critical: failed to mark messages as read", e);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) setSelectedChatId(null);
    toast.success("Conversa eliminada");
    try {
      await api.chats.remove(chatId);
    } catch (e) {
      console.error("Failed to delete chat from backend:", e);
    }
  };

  const handleCall = (listing: Listing) => {
    requireAuth(() => {
      setCallModalData({
        isOpen: true,
        phone: listing.contacts.phone,
        name: listing.contacts.name,
      });
    });
  };

  const handleWhatsApp = (listing: Listing) => {
    requireAuth(() => {
      const cleanPhone = listing.contacts.phone.replace(/\D/g, '');
      const finalPhone = cleanPhone.startsWith('351') ? cleanPhone : `351${cleanPhone}`;
      const message = encodeURIComponent(`Olá, vi o seu anúncio de ${listing.species} (${listing.breed || ''}) no AgroLink e gostaria de mais informações.`);
      window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
    });
  };

  const handleSendMessage = async (chatId: string, text: string) => {
    if (!currentUser) return;
    // Optimistic update
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
    // Persist to backend
    try {
      await api.chats.sendMessage(chatId, text);
    } catch (e) {
      console.error("Failed to send message to backend:", e);
    }
  };

  // ── App initialization: restore session + fetch listings from backend ──
  useEffect(() => {
    const init = async () => {
      setIsAppLoading(true);
      // Chats are deferred so we can enrich listingPreview after listing photos are loaded
      let pendingChats: Chat[] = [];
      try {
        // 1. Check for existing session
        const session = await api.auth.getSession();
        if (session) {
          setAccessToken(session.access_token);

          // Always restore the user — even if profile fetch fails
          let profileData: UserType | null = null;
          try {
            profileData = await api.profile.get();
          } catch (e) {
            console.log("Failed to load profile on init:", e);
          }

          setCurrentUser({
            id: session.user.id,
            name: profileData?.name || session.user.email?.split("@")[0] || "Utilizador",
            email: session.user.email || "",
            isLoggedIn: true,
            draftMessage:
              profileData?.draftMessage ||
              "Boa tarde, vi o seu anúncio no AgroLink e estou interessado. Ainda está disponível?",
            mode: profileData?.mode || "AMBOS",
            region: profileData?.region || "",
            isFirstLogin: profileData?.isFirstLogin ?? false,
            phoneNumber: profileData?.phoneNumber || "",
            phoneCountry: profileData?.phoneCountry || "+351",
            contactVisibility: profileData?.contactVisibility || {
              enabled: true,
              mode: "ALWAYS",
              startTime: "09:00",
              endTime: "19:00",
            },
          } as UserType);

          try {
            const [userFavs, userChats] = await Promise.all([
              api.favorites.get(),
              api.chats.getAll(),
            ]);
            setFavorites(userFavs);
            // Compute unread flag: any message in the chat not sent by us with read_at IS NULL
            try {
              const { data: unreadRows } = await api.supabase
                .from("chat_messages")
                .select("chat_id")
                .neq("sender_id", session.user.id)
                .is("read_at", null);
              if (unreadRows && unreadRows.length > 0) {
                const unreadChatIds = new Set(unreadRows.map((r: any) => r.chat_id as string));
                pendingChats = userChats.map((c) => ({ ...c, unread: unreadChatIds.has(c.id) }));
              } else {
                pendingChats = userChats;
              }
            } catch {
              pendingChats = userChats;
            }
          } catch (e) {
            console.log("Non-critical: failed to load user data on init", e);
          }
        }

        // 2. Fetch listings from backend
        let serverListings = await api.listings.getAll();

        if (serverListings.length === 0) {
          // In relational mode, try seed endpoint once then re-fetch real DB listings.
          // Avoid falling back to local demo listings because they contain non-UUID ids
          // that break chat and favorites persistence against Postgres.
          console.log("No listings found, trying server seed...");
          try {
            await api.seed.run(INITIAL_LISTINGS);
            serverListings = await api.listings.getAll();
          } catch (e) {
            console.log("Seed failed, keeping DB listings only:", e);
          }
        }

        // 3. Merge photos from listing_photos table (photos column doesn't exist on listings table)
        const STORAGE_BASE = 'https://odznjlpzknczzutgirvk.supabase.co/storage/v1/object/public/listing-photos/';
        try {
          const { data: photosData } = await api.supabase
            .from("listing_photos")
            .select("listing_id, storage_path, sort_order")
            .order("sort_order", { ascending: true });
          if (photosData && photosData.length > 0) {
            const photosByListing: Record<string, string[]> = {};
            photosData.forEach(({ listing_id, storage_path }: { listing_id: string; storage_path: string }) => {
              if (!photosByListing[listing_id]) photosByListing[listing_id] = [];
              photosByListing[listing_id].push(STORAGE_BASE + storage_path);
            });
            serverListings = serverListings.map((l) => ({
              ...l,
              photos: photosByListing[l.id]?.length > 0 ? photosByListing[l.id] : l.photos,
            }));
          }
        } catch (e) {
          console.log("Non-critical: failed to fetch listing photos", e);
        }

        setListings(serverListings);

        // 4. Enrich chats with listing photo URLs (now that serverListings has photos merged in)
        const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800';
        setChats(pendingChats.map((chat) => {
          const listing = serverListings.find((l) => l.id === chat.listingId);
          if (!listing) return chat;
          return {
            ...chat,
            listingPreview: chat.listingPreview || listing.photos[0] || FALLBACK_PHOTO,
            listingTitle: chat.listingTitle || `${listing.species} — ${listing.breed || 'Lote'}`,
          };
        }));
      } catch (err) {
        console.error("Init error, falling back to local data:", err);
        setListings(INITIAL_LISTINGS);
      } finally {
        setIsAppLoading(false);
      }
    };

    init();
  }, []);

  const totalUnreadMessages = currentUser?.isLoggedIn
    ? chats.filter((c) => c.unread).length
    : 0;

  // Fetch pending reports count for admin badge
  useEffect(() => {
    if (currentUser?.email !== ADMIN_EMAIL) return;
    api.supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPendingReportsCount(count ?? 0));
  }, [currentUser?.email]);

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
        
        if (!hasMalePrice && !hasFemalePrice) return true; // consulta listings always pass the price filter
        
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
    requireAuth(() => {
      setFavorites((prev) => {
        const next = prev.includes(id)
          ? prev.filter((fid) => fid !== id)
          : [...prev, id];
        // Persist to backend
        api.favorites.save(next).catch((e) =>
          console.error("Failed to save favorites:", e)
        );
        if (!prev.includes(id))
          toast.success("Guardado nos favoritos");
        else toast.info("Removido dos favoritos");
        return next;
      });
    });
  };

  const handlePublish = (newListing: Listing) => {
    requireAuth(async () => {
      const user = currentUserRef.current;
      const finalListing = {
        ...newListing,
        sellerId: user?.id || newListing.sellerId
      };
      
      // Optimistic update
      setListings((prev) => [finalListing, ...prev]);
      setCurrentView("meus-anuncios");
      toast.success("Anúncio publicado com sucesso!");

      // Persist to backend
      try {
        const savedListing = await api.listings.create(finalListing);
        // Replace the optimistic (local-id) listing with the DB version
        setListings((prev) =>
          prev.map((l) =>
            l.id === finalListing.id
              ? { ...savedListing, photos: finalListing.photos }
              : l
          )
        );
        // Persist photos into listing_photos table using storage_path
        if (finalListing.photos.length > 0) {
          const STORAGE_BASE_PUBLISH = 'https://odznjlpzknczzutgirvk.supabase.co/storage/v1/object/public/listing-photos/';
          await api.supabase.from("listing_photos").insert(
            finalListing.photos.map((url, i) => {
              const storage_path = url.startsWith(STORAGE_BASE_PUBLISH)
                ? decodeURIComponent(url.slice(STORAGE_BASE_PUBLISH.length))
                : url;
              return { listing_id: savedListing.id, storage_path, sort_order: i };
            })
          );
        }
      } catch (e) {
        console.error("Failed to persist listing:", e);
        toast.error("Erro ao guardar anúncio no servidor. O anúncio está visível localmente.");
      }
    });
  };

  const handleUpdate = (updatedListing: Listing) => {
    requireAuth(async () => {
      const originalId = editingListing!.id;
      const merged = { ...updatedListing, id: originalId };
      // Optimistic update
      setListings((prev) => prev.map((l) => (l.id === originalId ? merged : l)));
      setEditingListing(null);
      setCurrentView("meus-anuncios");
      toast.success("Anúncio atualizado com sucesso!");

      try {
        const savedListing = await api.listings.update(originalId, merged);
        // Replace photos: delete old rows, insert new ones
        await api.supabase.from("listing_photos").delete().eq("listing_id", originalId);
        if (merged.photos.length > 0) {
          const STORAGE_BASE_UPDATE = 'https://odznjlpzknczzutgirvk.supabase.co/storage/v1/object/public/listing-photos/';
          await api.supabase.from("listing_photos").insert(
            merged.photos.map((url, i) => {
              const storage_path = url.startsWith(STORAGE_BASE_UPDATE)
                ? decodeURIComponent(url.slice(STORAGE_BASE_UPDATE.length))
                : url;
              return { listing_id: originalId, storage_path, sort_order: i };
            })
          );
        }
        setListings((prev) =>
          prev.map((l) => (l.id === originalId ? { ...savedListing, photos: merged.photos } : l))
        );
      } catch (e) {
        console.error("Failed to update listing:", e);
        toast.error("Erro ao atualizar anúncio no servidor.");
      }
    });
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
                    handleWhatsApp={handleWhatsApp}
                    hoveredListingId={hoveredListingId}
                    setHoveredListingId={setHoveredListingId}
                    selectedListingId={selectedListingId}
                    viewedListings={viewedListings}
                    navigateToDetails={navigateToDetails}
                    cardRefs={cardRefs}
                    isLoggedIn={!!currentUser}
                    getContactPolicy={(l) => getContactPolicy(l, currentUser)}
                    onReport={(l) => handleOpenReport(l.id, l.sellerId, `${l.species} — ${l.breed || 'Lote'}`)}
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
                  handleWhatsApp={handleWhatsApp}
                  hoveredListingId={hoveredListingId}
                  setHoveredListingId={setHoveredListingId}
                  selectedListingId={selectedListingId}
                  viewedListings={viewedListings}
                  navigateToDetails={navigateToDetails}
                  cardRefs={cardRefs}
                  isLoggedIn={!!currentUser}
                  getContactPolicy={(l) => getContactPolicy(l, currentUser)}
                  onReport={(l) => handleOpenReport(l.id, l.sellerId, `${l.species} — ${l.breed || 'Lote'}`)}
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
                onWhatsApp={(l) => handleWhatsApp(l)}
                hoveredId={hoveredListingId}
                onMarkerHover={setHoveredListingId}
                onBoundsChange={(bounds) => {
                  latestBoundsRef.current = bounds;
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
                getContactPolicy={(l) => getContactPolicy(l, currentUser)}
                contactVisibilityVersion={currentUser?.contactVisibility}
              />

              {showSearchHere && !activePolygon && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
                  <button
                    onClick={() => {
                      if (latestBoundsRef.current) {
                        setCurrentBounds(latestBoundsRef.current);
                      }
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
        if (!currentUser?.isLoggedIn) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto h-full">
              <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center mb-8">
                <Heart className="w-12 h-12 text-primary/20" />
              </div>
              <h2 className="text-3xl font-black text-secondary mb-4 italic">
                Guardar Favoritos
              </h2>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                Entra na tua conta para guardar os anúncios que te interessam e recebê-los no teu telemóvel.
              </p>
              <button
                onClick={() => setIsAuthGateVisible(true)}
                className="w-full h-16 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <LogIn className="w-6 h-6" />
                Entrar para Guardar
              </button>
              <button
                onClick={() => setCurrentView("explorar")}
                className="mt-6 text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-primary transition-colors"
              >
                Continuar a navegar
              </button>
            </div>
          );
        }
        const favoriteListings = listings.filter((l) =>
          favorites.includes(l.id),
        );
        const filteredFavorites = favSpeciesFilter
          ? favoriteListings.filter((l) => l.species === favSpeciesFilter)
          : favoriteListings;
        return (
          <div className="p-4 md:p-10 max-w-5xl mx-auto pb-32">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-secondary leading-tight italic">
                  Favoritos
                </h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                  Anúncios Guardados
                </p>
              </div>
              <div className="bg-primary/10 px-4 py-2 rounded-xl text-primary font-black text-sm">
                {filteredFavorites.length} ITENS
              </div>
            </div>

            {favoriteListings.length > 0 && (
              <div className="flex gap-3 mb-6">
                {(["Vacas", "Ovelhas", "Cabras"] as Species[]).map((s) => {
                  const isSelected = favSpeciesFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setFavSpeciesFilter(isSelected ? null : s)}
                      className={cn(
                        "h-14 flex-1 px-4 rounded-2xl font-black text-xs border-2 transition-all flex flex-col items-center justify-center gap-1 active:scale-95",
                        isSelected
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-white text-slate-400 border-slate-100 hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      <span className="text-2xl leading-none">
                        {s === "Vacas" ? "🐄" : s === "Ovelhas" ? "🐑" : "🐐"}
                      </span>
                      <span className="uppercase tracking-widest leading-none text-[10px] text-center truncate w-full">{s}</span>
                    </button>
                  );
                })}
                {favSpeciesFilter && (
                  <button
                    onClick={() => setFavSpeciesFilter(null)}
                    className="h-14 px-4 rounded-2xl font-black text-xs text-red-500 bg-red-50 border-2 border-red-100 uppercase tracking-tighter whitespace-nowrap hover:bg-red-100 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-xl">✕</span>
                    <span className="leading-none text-[9px]">Limpar</span>
                  </button>
                )}
              </div>
            )}

            {favoriteListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200 p-10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Heart className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-xl font-black text-secondary">
                  Ainda não guardou nenhum anúncio
                </p>
                <p className="text-sm font-bold text-slate-400 mt-2 max-w-xs mx-auto">
                  Toque no coração nos anúncios para os guardar aqui e ver mais tarde.
                </p>
                <button
                  onClick={() => setCurrentView("explorar")}
                  className="mt-8 px-8 h-14 bg-secondary text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  Explorar Mercado
                </button>
              </div>
            ) : filteredFavorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200 p-10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">{favSpeciesFilter === "Vacas" ? "🐄" : favSpeciesFilter === "Ovelhas" ? "🐑" : "🐐"}</span>
                </div>
                <p className="text-xl font-black text-secondary">
                  Sem favoritos de {favSpeciesFilter}
                </p>
                <p className="text-sm font-bold text-slate-400 mt-2 max-w-xs mx-auto">
                  Não tem nenhum anúncio de {favSpeciesFilter} guardado.
                </p>
                <button
                  onClick={() => setFavSpeciesFilter(null)}
                  className="mt-8 px-8 h-14 bg-secondary text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  Ver Todos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFavorites.map((l) => (
                  <FavoriteCard
                    key={l.id}
                    listing={l}
                    onRemove={() => toggleFavorite(l.id)}
                    onClick={() => navigateToDetails(l)}
                    onChat={() => handleStartChat(l)}
                    onCall={() => handleCall(l)}
                    onWhatsApp={() => handleWhatsApp(l)}
                    isLoggedIn={!!currentUser}
                    policy={getContactPolicy(l, currentUser)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "meus-anuncios":
        const myAds = listings.filter(
          (l) =>
            l.sellerId === (currentUser?.id || "none") ||
            l.id.startsWith("generated-1"),
        );
        
        const visibility = currentUser?.contactVisibility || {
          enabled: true,
          mode: 'ALWAYS',
          startTime: '09:00',
          endTime: '19:00'
        };

        const updateVisibility = (updates: Partial<typeof visibility>) => {
          if (!currentUser) return;
          const newVisibility = { ...visibility, ...updates };
          const updatedUser = {
            ...currentUser,
            contactVisibility: newVisibility
          };
          setCurrentUser(updatedUser);
          api.profile.update({ contactVisibility: newVisibility }).catch(console.error);
          toast.success("Guardado. Aplicado a todos os anúncios.");
        };

        return (
          <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 pb-32">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("perfil")}
                className="w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary active:scale-90 transition-all shadow-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col gap-1">
                <h1 className="text-4xl font-black text-secondary uppercase leading-none italic">
                  Os Meus Anúncios
                </h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Gere as suas vendas e contactos
                </p>
              </div>
            </div>

            {/* CONTROLO DE CONTACTOS PANEL */}
            <div className="bg-white rounded-[40px] border-4 border-primary/10 shadow-xl overflow-hidden">
              <div className="bg-primary/5 p-6 border-b-2 border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-secondary uppercase leading-none">Controlo de Contactos</h2>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">Gira quem lhe pode ligar</p>
                  </div>
                </div>
                <div className="group relative">
                  <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary/30 hover:text-primary transition-colors border-2 border-primary/5">
                    <Info className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-12 w-64 p-4 bg-slate-900 text-white rounded-2xl text-xs font-bold leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-2xl">
                    <p className="text-primary font-black mb-1 uppercase tracking-widest text-[9px]">Porque existe isto?</p>
                    Para evitares muitos contactos. Podes ligar/desligar quando quiseres.
                  </div>
                </div>
              </div>

              <div className="p-8 flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-secondary uppercase tracking-tight">Mostrar WhatsApp e telefone</h3>
                    <p className="text-sm font-bold text-slate-400 max-w-xs mt-1 italic">
                      Desliga para não receber chamadas. Os interessados falam por AgroLink Chat.
                    </p>
                  </div>
                  <button 
                    onClick={() => updateVisibility({ enabled: !visibility.enabled })}
                    className={cn(
                      "w-24 h-12 rounded-full p-1 transition-all duration-300 relative",
                      visibility.enabled ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 bg-white rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center",
                      visibility.enabled ? "translate-x-12" : "translate-x-0"
                    )}>
                      {visibility.enabled ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <X className="w-6 h-6 text-slate-300" />}
                    </div>
                  </button>
                </div>

                {visibility.enabled && (
                  <div className="flex flex-col gap-8 pt-6 border-t-2 border-slate-50">
                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Quando mostrar</p>
                      <div className="flex bg-slate-100 p-1.5 rounded-[24px] gap-1.5">
                        {[
                          { id: 'ALWAYS', label: 'Sempre' },
                          { id: 'SCHEDULE', label: 'Só no horário' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => updateVisibility({ mode: mode.id as any })}
                            className={cn(
                              "flex-1 py-4 px-6 rounded-[20px] font-black text-sm uppercase tracking-widest transition-all",
                              visibility.mode === mode.id 
                                ? "bg-white text-secondary shadow-md" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {visibility.mode === 'SCHEDULE' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Das</label>
                          <input 
                            type="time" 
                            value={visibility.startTime}
                            onChange={(e) => updateVisibility({ startTime: e.target.value })}
                            className="w-full h-16 bg-white border-2 border-slate-100 rounded-3xl px-6 font-black text-2xl text-secondary focus:border-primary outline-none transition-all shadow-inner"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Até</label>
                          <input 
                            type="time" 
                            value={visibility.endTime}
                            onChange={(e) => updateVisibility({ endTime: e.target.value })}
                            className="w-full h-16 bg-white border-2 border-slate-100 rounded-3xl px-6 font-black text-2xl text-secondary focus:border-primary outline-none transition-all shadow-inner"
                          />
                        </div>
                        <p className="col-span-2 text-[10px] font-bold text-slate-400 italic text-center mt-2">Fora deste horário escondemos WhatsApp e telefone.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">No anúncio vai aparecer</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="bg-white border-2 border-green-100 text-green-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" /> Mensagem na app
                    </span>
                    {!visibility.enabled ? (
                      <>
                        <span className="bg-white border-2 border-red-50 text-red-300 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                          <X className="w-4 h-4" strokeWidth={3} /> WhatsApp
                        </span>
                        <span className="bg-white border-2 border-red-50 text-red-300 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                          <X className="w-4 h-4" strokeWidth={3} /> Telefone
                        </span>
                      </>
                    ) : visibility.mode === 'ALWAYS' ? (
                      <>
                        <span className="bg-white border-2 border-green-100 text-green-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> WhatsApp
                        </span>
                        <span className="bg-white border-2 border-green-100 text-green-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> Telefone
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="bg-white border-2 border-blue-50 text-blue-500 px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> WhatsApp (no horário)
                        </span>
                        <span className="bg-white border-2 border-blue-50 text-blue-500 px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> Telefone (no horário)
                        </span>
                      </>
                    )}
                  </div>
                </div>
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
                  value: myAds.reduce((s, l) => s + (l.stats?.views ?? 0), 0),
                  color: "text-secondary",
                },
                {
                  label: "Total Contactos",
                  value: myAds.reduce((s, l) => s + (l.stats?.contacts ?? 0), 0),
                  color: "text-green-600",
                },
                {
                  label: "Interessados",
                  value: myAds.reduce((s, l) => s + (l.stats?.saves ?? 0), 0),
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
                    onEdit={() => { setEditingListing(l); setCurrentView("publicar"); }}
                    onMarkAsSold={async () => {
                      setListings((prev) =>
                        prev.map((li) =>
                          li.id === l.id ? { ...li, status: "Vendido" } : li
                        )
                      );
                      toast.success("Anúncio marcado como vendido!");
                      try {
                        await api.listings.update(l.id, { status: "Vendido" });
                      } catch (e) {
                        console.error("Failed to update listing status:", e);
                      }
                    }}
                    policy={getContactPolicy(l, currentUser)}
                    onNavigateToDetails={(listing) => {
                      setSelectedListing(listing);
                      setCurrentView("detalhes");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "mensagens":
        if (!currentUser) return null;
        return (
          <ChatHistory
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            onSendMessage={handleSendMessage}
            onDeleteChat={handleDeleteChat}
            currentUser={currentUser}
            onUpdateDraft={(text) => {
              setCurrentUser((prev) => prev ? ({
                ...prev,
                draftMessage: text,
              }) : prev);
              api.profile.update({ draftMessage: text }).catch(console.error);
            }}
            onViewDetails={(listingId) => {
              const listing = listings.find(
                (l) => l.id === listingId,
              );
              if (listing) {
                setSelectedListing(listing);
                setCurrentView("detalhes");
              }
            }}
            onReport={(listingId, reportedUserId, listingTitle) =>
              handleOpenReport(listingId, reportedUserId, listingTitle)
            }
          />
        );
      case "publicar":
        return editingListing ? (
          <PublishWizard
            onCancel={() => { setEditingListing(null); setCurrentView("meus-anuncios"); }}
            onPublish={handleUpdate}
            currentUser={currentUser}
            initialData={editingListing}
            isEditMode
          />
        ) : (
          <PublishWizard
            onCancel={() => setCurrentView("explorar")}
            onPublish={handlePublish}
            currentUser={currentUser}
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
            isLoggedIn={!!currentUser}
            onRequireAuth={requireAuth}
            onReport={() => handleOpenReport(selectedListing.id, selectedListing.sellerId, `${selectedListing.species} — ${selectedListing.breed || 'Lote'}`)}
            policy={getContactPolicy(selectedListing, currentUser)}
          />
        ) : null;
      case "perfil":
        const myAdsCount = listings.filter(
          (l) =>
            l.sellerId === (currentUser?.id || "none") ||
            l.id.startsWith("generated-1"), // Mock for guest
        ).length;

        return (
          <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-10 pb-32">
            <h1 className="text-5xl font-black text-secondary italic">
              O Meu Perfil
            </h1>

            {/* Account Header Card */}
            <div className="bg-white p-8 md:p-10 rounded-[48px] border-2 border-primary/10 shadow-sm">
              {!currentUser?.isLoggedIn ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg shrink-0">
                      <User className="w-12 h-12 text-slate-300" />
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <h2 className="text-3xl font-black text-secondary leading-tight italic">Visitante</h2>
                      <p className="text-sm font-bold text-slate-500 leading-tight mt-1">
                        Entra para ver contactos, falar por WhatsApp e guardar favoritos.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setIsAuthGateVisible(true)}
                      className="w-full h-18 bg-primary text-white rounded-[32px] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                    >
                      <LogIn className="w-6 h-6" strokeWidth={3} />
                      ENTRAR
                    </button>
                    <button
                      onClick={() => setCurrentView("explorar")}
                      className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-primary transition-colors text-center"
                    >
                      Continuar a navegar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-xl shrink-0">
                    <User className="w-9 h-9 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={currentUser.name}
                      onChange={(e) => {
                        const updatedUser = { ...currentUser, name: e.target.value };
                        setCurrentUser(updatedUser);
                      }}
                      onBlur={() => {
                        api.profile.update({ name: currentUser.name }).catch(console.error);
                      }}
                      className="text-3xl font-black text-secondary truncate w-full bg-transparent border-none outline-none focus:ring-2 ring-primary/20 rounded-lg px-2 -ml-2"
                    />
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        <PhoneCountrySelect
                          value={currentUser.phoneCountry || '+351'}
                          onChange={(code) => {
                            const updatedUser = { ...currentUser, phoneCountry: code };
                            setCurrentUser(updatedUser);
                            api.profile.update({ phoneCountry: code }).catch(console.error);
                          }}
                        />
                        <input
                          type="text"
                          value={currentUser.phoneNumber || ''}
                          placeholder="Adicionar telefone"
                          onChange={(e) => {
                            const updatedUser = { ...currentUser, phoneNumber: e.target.value };
                            setCurrentUser(updatedUser);
                          }}
                          onBlur={() => {
                            api.profile.update({ phoneNumber: currentUser.phoneNumber }).catch(console.error);
                          }}
                          className="text-lg font-bold text-primary bg-transparent border-none outline-none focus:ring-2 ring-primary/20 rounded-lg px-1 w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <DistritoSelect
                          value={currentUser.region?.split(',')[0] || ''}
                          onChange={(district) => {
                            const region = `${district}, Portugal`;
                            const updatedUser = { ...currentUser, region };
                            setCurrentUser(updatedUser);
                            api.profile.update({ region }).catch(console.error);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shrink-0"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>

            {/* COMPRAR Section */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6 italic">COMPRAR</h3>
              <div className="grid gap-3">
                {[
                  {
                    id: 'favoritos',
                    title: 'FAVORITOS',
                    subtitle: 'Anúncios guardados',
                    icon: Heart,
                    badge: currentUser?.isLoggedIn ? favorites.length : null,
                    locked: !currentUser?.isLoggedIn,
                    lockText: 'Entrar para guardar'
                  },
                  {
                    id: 'mensagens',
                    title: 'MENSAGENS',
                    subtitle: 'Conversas com produtores',
                    icon: MessageCircle,
                    badge: currentUser?.isLoggedIn ? chats.filter(c => c.unread).length : null,
                    locked: !currentUser?.isLoggedIn,
                    lockText: 'Entrar para enviar mensagens'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.locked) {
                        setPendingAction(() => () => setCurrentView(item.id as View));
                        setIsAuthGateVisible(true);
                      } else {
                        setCurrentView(item.id as View);
                      }
                    }}
                    className="w-full bg-white p-7 rounded-[32px] border-2 border-primary/5 flex items-center justify-between hover:border-primary/20 transition-all shadow-sm active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-5 text-left">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center",
                        item.locked ? "bg-slate-50 text-slate-300" : "bg-primary/5 text-primary"
                      )}>
                        <item.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className={cn(
                          "text-xl font-black uppercase leading-none",
                          item.locked ? "text-slate-400" : "text-secondary"
                        )}>{item.title}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          {item.locked ? item.lockText : item.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.badge !== null && item.badge > 0 && (
                        <span className="bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      {item.locked ? (
                        <Lock className="w-6 h-6 text-slate-200" />
                      ) : (
                        <ChevronLeft className="w-8 h-8 rotate-180 text-primary/30" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* VENDER Section */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6 italic">VENDER</h3>
              <div className="grid gap-3">
                {/* Publicar CTA */}
                <button
                  onClick={() => requireAuth(() => setCurrentView("publicar"))}
                  className="w-full bg-primary p-8 rounded-[40px] flex items-center justify-between shadow-xl shadow-primary/20 group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border-2 border-white/20">
                      <PlusCircle className="w-8 h-8 text-white" strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-black uppercase leading-none text-white">
                        Publicar Anúncio
                      </h3>
                      <p className="text-sm font-bold text-white/70 uppercase tracking-widest mt-1">
                        Vender vacas, ovelhas ou cabras
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-10 h-10 rotate-180 text-white/40 group-hover:text-white transition-colors" />
                </button>

                {/* Os Meus Anúncios */}
                <button
                  onClick={() => {
                    if (!currentUser?.isLoggedIn) {
                      setPendingAction(() => () => setCurrentView("meus-anuncios"));
                      setIsAuthGateVisible(true);
                    } else {
                      setCurrentView("meus-anuncios");
                    }
                  }}
                  className={cn(
                    "w-full p-8 rounded-[40px] flex items-center justify-between transition-all active:scale-[0.98]",
                    !currentUser?.isLoggedIn 
                      ? "bg-slate-50 border-2 border-dashed border-slate-200" 
                      : "bg-secondary text-white shadow-xl shadow-secondary/10 group"
                  )}
                >
                  <div className="flex items-center gap-6 text-left">
                    <div className={cn(
                      "w-16 h-16 rounded-3xl flex items-center justify-center backdrop-blur-sm",
                      !currentUser?.isLoggedIn ? "bg-slate-100 text-slate-300" : "bg-white/10 text-white"
                    )}>
                      <LayoutGrid className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-2xl font-black uppercase leading-none",
                        !currentUser?.isLoggedIn ? "text-slate-400" : "text-white"
                      )}>
                        Os Meus Anúncios
                      </h3>
                      <p className={cn(
                        "text-sm font-bold uppercase tracking-widest mt-1",
                        !currentUser?.isLoggedIn ? "text-slate-300" : "text-white/60"
                      )}>
                        {!currentUser?.isLoggedIn ? "Entrar para gerir" : `${myAdsCount} anúncios publicados`}
                      </p>
                    </div>
                  </div>
                  {!currentUser?.isLoggedIn ? (
                    <Lock className="w-8 h-8 text-slate-200" />
                  ) : (
                    <ChevronLeft className="w-10 h-10 rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              </div>
            </div>

            {/* Help Section */}
            <div className="flex flex-col gap-3">
              {([
                { label: "Ajuda", key: "ajuda" },
                { label: "Segurança (Evitar burlas)", key: "seguranca" },
                { label: "Termos e Privacidade", key: "termos" },
              ] as { label: string; key: "ajuda" | "seguranca" | "termos" }[]).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setProfileSubPage(item.key)}
                  className="w-full text-left px-8 py-6 bg-white border-2 border-primary/5 rounded-[32px] flex items-center justify-between hover:border-primary/20 transition-all active:scale-[0.98]"
                >
                  <span className="text-lg font-black text-secondary">
                    {item.label}
                  </span>
                  <ChevronLeft className="w-6 h-6 rotate-180 text-primary/30" />
                </button>
              ))}
              <button
                onClick={() => window.open("https://www.livroreclamacoes.pt", "_blank")}
                className="w-full text-left px-8 py-6 bg-white border-2 border-primary/5 rounded-[32px] flex items-center justify-between hover:border-primary/20 transition-all active:scale-[0.98]"
              >
                <span className="text-lg font-black text-secondary">📕 Livro de Reclamações</span>
                <ChevronLeft className="w-6 h-6 rotate-180 text-primary/30" />
              </button>

              {currentUser?.email === ADMIN_EMAIL && (
                <button
                  onClick={() => setProfileSubPage("admin")}
                  className="w-full text-left px-8 py-6 bg-red-50 border-2 border-red-200 rounded-[32px] flex items-center justify-between hover:border-red-300 transition-all active:scale-[0.98]"
                >
                  <span className="text-lg font-black text-red-700">⚙️ ADMIN — Denúncias</span>
                  <div className="flex items-center gap-3">
                    {pendingReportsCount > 0 && (
                      <span className="min-w-[28px] h-7 bg-red-500 text-white text-sm font-black rounded-full flex items-center justify-center px-2">
                        {pendingReportsCount}
                      </span>
                    )}
                    <ChevronLeft className="w-6 h-6 rotate-180 text-red-300" />
                  </div>
                </button>
              )}
              {currentUser?.isLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-6 text-red-500 font-black uppercase text-xs tracking-[0.2em] mt-4"
                >
                  Terminar Sessão
                </button>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Loading screen
  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-xl shadow-primary/20">
          <span className="text-white font-black text-4xl italic">A</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-secondary">AgroLink</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">A ligar produtores</p>
        </div>
        <Loader2 className="w-8 h-8 text-primary animate-spin mt-4" />
        <Toaster position="top-center" richColors />
      </div>
    );
  }

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
            { id: "mensagens", icon: MessageCircle, label: "Mensagens" },
            { id: "favoritos", icon: Heart, label: "Favoritos" },
            { id: "perfil", icon: User, label: "Perfil" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "mensagens" || item.id === "favoritos") {
                  requireAuth(() => setCurrentView(item.id as View));
                } else {
                  setCurrentView(item.id as View);
                }
              }}
              className={cn(
                "relative flex items-center gap-2 xl:gap-3 px-4 xl:px-8 py-4 rounded-full text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap",
                currentView === item.id
                  ? "bg-primary text-white shadow-xl scale-105"
                  : "text-slate-400 hover:text-primary",
              )}
            >
              <item.icon className="w-4 h-4 xl:w-5 xl:h-5" />
              {item.label}
              {item.id === "mensagens" && totalUnreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                  {totalUnreadMessages}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex justify-end">
          <button
            onClick={() => requireAuth(() => setCurrentView("publicar"))}
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
                onClick={() => requireAuth(() => setCurrentView("publicar"))}
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
          { id: "mensagens", icon: MessageCircle, label: "Mensagens" },
          { id: "favoritos", icon: Heart, label: "Favoritos" },
          { id: "perfil", icon: User, label: "Perfil" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "mensagens" || item.id === "favoritos") {
                requireAuth(() => setCurrentView(item.id as View));
              } else {
                setCurrentView(item.id as View);
              }
            }}
            className={cn(
              "flex flex-col items-center gap-2 transition-all",
              currentView === item.id
                ? "text-primary scale-110"
                : "text-slate-400",
            )}
          >
            <div className="relative">
              <item.icon
                className={cn(
                  "w-8 h-8",
                  currentView === item.id ? "stroke-[3px]" : "stroke-2",
                )}
              />
              {item.id === "mensagens" && totalUnreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                  {totalUnreadMessages}
                </span>
              )}
            </div>
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

      <AuthGate 
        isOpen={isAuthGateVisible}
        onClose={() => setIsAuthGateVisible(false)}
        onLogin={() => {
          setIsAuthGateVisible(false);
          setIsLoginVisible(true);
        }}
      />

      <AnimatePresence>
        {isLoginVisible && (
          <LoginScreen 
            onBack={() => setIsLoginVisible(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOnboardingVisible && currentUser && (
          <OnboardingScreen 
            user={currentUser}
            onComplete={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileSubPage === "ajuda" && (
          <motion.div key="ajuda" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}>
            <HelpPage onBack={() => setProfileSubPage(null)} />
          </motion.div>
        )}
        {profileSubPage === "seguranca" && (
          <motion.div key="seguranca" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}>
            <SecurityPage onBack={() => setProfileSubPage(null)} userId={currentUser?.id} />
          </motion.div>
        )}
        {profileSubPage === "termos" && (
          <motion.div key="termos" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}>
            <TermsPage onBack={() => setProfileSubPage(null)} />
          </motion.div>
        )}
        {profileSubPage === "admin" && currentUser?.email === ADMIN_EMAIL && (
          <motion.div key="admin" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}>
            <AdminReportsPage onBack={() => { setProfileSubPage(null); setPendingReportsCount(0); api.supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending").then(({ count }) => setPendingReportsCount(count ?? 0)); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[3500] p-4 md:p-6">
          <div className="max-w-2xl mx-auto bg-white border-2 border-slate-100 rounded-t-3xl md:rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-black text-secondary text-lg leading-none mb-2">🍪 Cookies</h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Este site utiliza cookies essenciais para o funcionamento da plataforma e cookies de análise (Vercel Web Analytics) para melhorar a experiência.{" "}
                <button
                  onClick={() => { handleCookieConsent(true); setProfileSubPage("seguranca"); setCurrentView("perfil"); }}
                  className="text-primary font-black underline underline-offset-2 hover:no-underline"
                >
                  Ver Política de Privacidade
                </button>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleCookieConsent(false)}
                className="flex-1 h-12 rounded-2xl border-2 border-slate-200 font-black text-slate-500 text-sm uppercase tracking-widest active:scale-95 transition-transform hover:border-slate-300"
              >
                Recusar não essenciais
              </button>
              <button
                onClick={() => handleCookieConsent(true)}
                className="flex-1 h-12 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}

      {currentUser?.isLoggedIn && (
        <ReportModal
          isOpen={!!reportTarget}
          onClose={() => setReportTarget(null)}
          listingId={reportTarget?.listingId}
          listingTitle={reportTarget?.listingTitle}
          reportedUserId={reportTarget?.reportedUserId}
          currentUserId={currentUser.id}
        />
      )}

      <Toaster position="top-center" richColors />
    </div>
  );
}

