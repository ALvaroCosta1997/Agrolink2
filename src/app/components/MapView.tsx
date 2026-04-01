import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
// @ts-ignore
import 'leaflet-draw';
import Supercluster, { ClusterFeature, PointFeature } from 'supercluster';
import { Listing } from '../types';
import { ContactPolicy } from '../App';

// Re-setup Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CLUSTER_MAX_ZOOM = 12;
const SMALL_PIN_ZOOM = 10;

interface MapViewProps {
  listings: Listing[];
  onMarkerClick: (listing: Listing) => void;
  onNavigateToDetails: (listing: Listing) => void;
  onChat: (listing: Listing) => void;
  onCall: (listing: Listing) => void;
  onWhatsApp: (listing: Listing) => void;
  hoveredId: string | null;
  onMarkerHover: (id: string | null) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  selectedId: string | null;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onPolygonCreated?: (polygon: [number, number][]) => void;
  onPolygonDeleted?: () => void;
  mobileViewMode?: "list" | "map";
  getContactPolicy: (listing: Listing) => ContactPolicy;
  contactVisibilityVersion?: any;
}

export function MapView({
  listings,
  onMarkerClick,
  onNavigateToDetails,
  onChat,
  onCall,
  onWhatsApp,
  hoveredId,
  onMarkerHover,
  onBoundsChange,
  selectedId,
  favorites,
  onToggleFavorite,
  onPolygonCreated,
  onPolygonDeleted,
  mobileViewMode,
  getContactPolicy,
  contactVisibilityVersion,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawLayerRef = useRef<L.FeatureGroup | null>(null);
  // Single layer group that owns all cluster + individual markers
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const superclusterRef = useRef<Supercluster | null>(null);
  // Stable ref so map event handlers always call the latest render function
  const renderClustersRef = useRef<() => void>(() => {});
  const isMapReadyRef = useRef(false);
  const [activeDrawHandler, setActiveDrawHandler] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const drawTools = [
    { id: 'polygon', label: 'Desenhar Área', icon: '✏️', hint: 'Toque para desenhar' },
    { id: 'delete', label: 'Limpar Área', icon: '🗑️', hint: 'Eliminar zona' },
  ];

  // ---------------------------------------------------------------------------
  // 1. Initialize Map (runs once on mount)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      tap: false,
      touchZoom: true,
      dragging: true,
    });

    mapRef.current = map;
    map.setView([38.8, -7.6], 8);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer group that cluster rendering writes into
    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    const drawItems = new L.FeatureGroup();
    map.addLayer(drawItems);
    drawLayerRef.current = drawItems;

    try {
      if ((L as any).drawLocal) {
        (L as any).drawLocal.draw.handlers.polygon.tooltip.start = 'Toque para começar a desenhar';
        (L as any).drawLocal.draw.handlers.polygon.tooltip.cont = 'Continue a tocar para desenhar a área';
        (L as any).drawLocal.draw.handlers.polygon.tooltip.end = 'Toque no primeiro ponto para fechar';
      }
    } catch (_) {}

    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      if (!drawLayerRef.current) return;
      drawLayerRef.current.clearLayers();
      const layer = e.layer;
      drawLayerRef.current.addLayer(layer);
      const latlngsRaw = layer.getLatLngs();
      const latlngs = Array.isArray(latlngsRaw[0])
        ? latlngsRaw[0].map((ll: any) => [ll.lat, ll.lng])
        : latlngsRaw.map((ll: any) => [ll.lat, ll.lng]);
      onPolygonCreated?.(latlngs);
      setActiveDrawHandler(null);
    });

    map.on((L as any).Draw.Event.DRAWSTOP, () => {
      setTimeout(() => setActiveDrawHandler(null), 100);
    });

    map.on('moveend', () => {
      if (mapRef.current) onBoundsChange(mapRef.current.getBounds());
      renderClustersRef.current();
    });

    map.on('zoomend', () => {
      renderClustersRef.current();
    });

    const timer = setTimeout(() => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize();
          isMapReadyRef.current = true;
          setIsMapReady(true);
        } catch (e) {
          console.error('Leaflet invalidateSize error:', e);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 1.1 Trigger invalidateSize when mobile view becomes visible
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current && mobileViewMode === 'map') {
      const timer = setTimeout(() => mapRef.current?.invalidateSize(), 300);
      return () => clearTimeout(timer);
    }
  }, [mobileViewMode]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getIconHtml = (listing: Listing, isSelected: boolean, hovered: boolean, zoom: number) => {
    // Below SMALL_PIN_ZOOM render as a compact dot to avoid clutter
    if (zoom < SMALL_PIN_ZOOM) {
      const bg = isSelected ? '#2d5a27' : listing.viewed ? '#94a3b8' : '#2d5a27';
      return `<div style="width:12px;height:12px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`;
    }
    const isViewed = listing.viewed;
    const speciesIcon =
      listing.species === 'Vacas' ? '🐄' : listing.species === 'Ovelhas' ? '🐑' : '🐐';
    return `
      <div class="relative group cursor-pointer">
        <div class="flex flex-col items-center">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-xl border-2 transition-all duration-300 transform ${isSelected ? 'scale-125 z-[3000] bg-primary border-white' : isViewed ? 'bg-slate-100 border-slate-300' : 'bg-white border-primary'} ${hovered ? 'scale-110 -translate-y-1' : ''}">
            <span class="${isSelected ? 'scale-110' : ''}">${speciesIcon}</span>
          </div>
          <div class="w-2.5 h-2.5 ${isSelected ? 'bg-primary' : isViewed ? 'bg-slate-300' : 'bg-primary'} rotate-45 -mt-1.5 shadow-lg border-r border-b border-white"></div>
        </div>
      </div>
    `;
  };

  const getPopupContent = (listing: Listing, isFavorite: boolean) => {
    const formattedMalePrice = listing.malePrice
      ? listing.malePrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : '-';
    const formattedFemalePrice = listing.femalePrice
      ? listing.femalePrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : '-';
    const policy = getContactPolicy(listing);

    return `
      <div class="p-4 w-64 flex flex-col gap-4">
        <div class="relative h-36 rounded-2xl overflow-hidden bg-slate-100 group">
          <img src="${listing.photos[0]}" class="w-full h-full object-cover" />
          <div class="absolute top-2 right-2 bg-white/95 px-2 py-1 rounded-lg text-[10px] font-black uppercase text-primary border border-primary/10 shadow-sm">
            ${listing.location.municipality}
          </div>
          <button type="button" class="popup-fav-btn absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-lg cursor-pointer transition-all active:scale-90 ${isFavorite ? 'bg-red-500 text-white' : 'text-slate-400'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="3"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>

        <div class="space-y-1">
          <h4 class="popup-title-btn font-black text-secondary text-lg leading-tight cursor-pointer hover:text-primary transition-colors">
            ${listing.species} — ${listing.breed || 'Raça não esp.'}
          </h4>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${listing.contacts.name}</span>
            <span class="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded">Lote de ${listing.maleQty + listing.femaleQty}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 border-y border-slate-100 py-3">
          ${listing.maleQty > 0 ? `<div class="flex flex-col"><span class="text-[9px] font-black text-slate-400 uppercase">♂️ Machos</span><span class="text-sm font-black text-secondary">${formattedMalePrice}€</span></div>` : ''}
          ${listing.femaleQty > 0 ? `<div class="flex flex-col"><span class="text-[9px] font-black text-slate-400 uppercase">♀️ Fêmeas</span><span class="text-sm font-black text-secondary">${formattedFemalePrice}€</span></div>` : ''}
        </div>

        <div class="flex flex-col gap-2">
          ${policy.showDirectContact ? `
            <div class="grid grid-cols-3 gap-2">
              <button type="button" class="popup-chat-btn h-12 bg-primary text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-primary/10 transition-all active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                <span class="text-[8px] font-black uppercase leading-none">Chat</span>
              </button>
              <button type="button" class="popup-whatsapp-btn h-12 bg-green-500 text-white !text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-green-500/10 transition-all active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                <span class="text-[8px] font-black uppercase leading-none">WhatsApp</span>
              </button>
              <button type="button" class="popup-call-btn h-12 bg-slate-900 text-white !text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-slate-900/10 no-underline transition-all active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span class="text-[8px] font-black uppercase leading-none">Ligar</span>
              </button>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              <button type="button" class="popup-chat-btn h-12 bg-primary text-white rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary/10 transition-all active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                <span class="text-[10px] font-black uppercase">Enviar Mensagem</span>
              </button>
              <div class="bg-orange-50 border border-orange-100 rounded-xl p-2 text-center">
                <p class="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">
                  ${policy.reason === 'OFF' ? 'SÓ CHAT ACTIVO' : 'FORA DO HORÁRIO'}
                </p>
                <p class="text-[8px] font-bold text-orange-400 mt-1 uppercase">
                  ${policy.reason === 'OFF' ? 'Contacto oculto pelo vendedor' : `Contactos disponíveis das ${policy.startTime} às ${policy.endTime}`}
                </p>
              </div>
            </div>
          `}

          <button type="button" class="popup-details-btn w-full h-10 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] border border-slate-100 transition-all hover:bg-slate-100">
            Ver detalhes completos
          </button>
        </div>
    `;
  };

  const wirePopupInteractions = (marker: L.Marker, listing: Listing) => {
    const popup = marker.getPopup();
    setTimeout(() => {
      const popupElement = popup?.getElement();
      if (!popupElement) return;

      L.DomEvent.disableClickPropagation(popupElement);

      const chatBtn = popupElement.querySelector('.popup-chat-btn');
      const whatsappBtn = popupElement.querySelector('.popup-whatsapp-btn');
      const callBtn = popupElement.querySelector('.popup-call-btn');
      const favBtn = popupElement.querySelector('.popup-fav-btn');
      const detailsBtn = popupElement.querySelector('.popup-details-btn');
      const titleBtn = popupElement.querySelector('.popup-title-btn');

      if (favBtn) {
        L.DomEvent.on(favBtn as HTMLElement, 'click', (e) => {
          L.DomEvent.stop(e);
          onToggleFavorite(listing.id);
        });
      }
      if (detailsBtn) {
        L.DomEvent.on(detailsBtn as HTMLElement, 'click', (e) => {
          L.DomEvent.stop(e);
          onNavigateToDetails(listing);
        });
      }
      if (titleBtn) {
        L.DomEvent.on(titleBtn as HTMLElement, 'click', (e) => {
          L.DomEvent.stop(e);
          onNavigateToDetails(listing);
        });
      }
      if (chatBtn) {
        L.DomEvent.on(chatBtn as HTMLElement, 'click', (e) => {
          L.DomEvent.stop(e);
          onChat(listing);
        });
      }
      if (whatsappBtn) {
        L.DomEvent.on(whatsappBtn as HTMLElement, 'click', (e) => {
          L.DomEvent.stop(e);
          onWhatsApp(listing);
        });
      }
      if (callBtn) {
        L.DomEvent.on(callBtn as HTMLElement, 'click', (e) => {
          L.DomEvent.stop(e);
          onCall(listing);
        });
      }
    }, 10);
  };

  // ---------------------------------------------------------------------------
  // Core cluster render — defined in component body so closures are always fresh.
  // renderClustersRef is kept up-to-date so stable map event handlers can call it.
  // ---------------------------------------------------------------------------
  const renderClusters = () => {
    if (!mapRef.current || !superclusterRef.current || !isMapReadyRef.current) return;
    const map = mapRef.current;
    const sc = superclusterRef.current;

    markerLayerRef.current?.clearLayers();

    const bounds = map.getBounds();
    const zoom = Math.floor(map.getZoom());
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const clusters = sc.getClusters(bbox, zoom);

    clusters.forEach((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;

      if ((cluster as ClusterFeature<{ id: string }>).properties.cluster) {
        // ── Cluster bubble ──────────────────────────────────────────────────
        const count: number = (cluster as ClusterFeature<{ id: string }>).properties.point_count;
        const size = count < 10 ? 30 : count < 50 ? 38 : 46;
        const fontSize = count < 10 ? 12 : count < 50 ? 13 : 15;

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width:${size}px;height:${size}px;
              border-radius:50%;
              background:#2d5a27;
              display:flex;align-items:center;justify-content:center;
              color:white;font-weight:900;font-size:${fontSize}px;
              border:3px solid white;
              box-shadow:0 4px 14px rgba(45,90,39,0.45);
              cursor:pointer;
            ">${count}</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const clusterMarker = L.marker(L.latLng(lat, lng), {
          icon,
          bubblingMouseEvents: false,
        });

        clusterMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          // flyTo is Leaflet's animated equivalent of Mapbox's easeTo
          map.flyTo(L.latLng(lat, lng), Math.min(zoom + 2, 18), { duration: 0.5 });
        });

        clusterMarker.addTo(markerLayerRef.current!);
      } else {
        // ── Individual pin ───────────────────────────────────────────────────
        const listingId = (cluster as PointFeature<{ id: string }>).properties.id;
        const listing = listings.find((l) => l.id === listingId);
        if (!listing) return;

        const isSelected = selectedId === listingId;
        const hovered = hoveredId === listingId;
        const isFavorite = favorites.includes(listingId);
        const isSmall = zoom < SMALL_PIN_ZOOM;

        const icon = L.divIcon({
          className: isSmall ? '' : 'custom-div-icon',
          html: getIconHtml(listing, isSelected, hovered, zoom),
          iconSize: isSmall ? [12, 12] : [40, 40],
          iconAnchor: isSmall ? [6, 6] : [20, 40],
        });

        const marker = L.marker(L.latLng(lat, lng), {
          icon,
          bubblingMouseEvents: false,
          zIndexOffset: isSelected ? 2000 : hovered ? 1000 : 0,
        });

        if (!isSmall) {
          // Full pin at zoom >= SMALL_PIN_ZOOM: bind popup
          const content = getPopupContent(listing, isFavorite);
          marker.bindPopup(content, {
            closeButton: false,
            className: 'custom-popup',
            offset: [0, -32],
            maxWidth: 280,
            autoPan: true,
          });
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onMarkerClick(listing);
            marker.openPopup();
          });
          marker.on('popupopen', () => wirePopupInteractions(marker, listing));
        } else {
          // Small dot at low zoom: just select on click, no popup
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onMarkerClick(listing);
          });
        }

        marker.on('mouseover', () => onMarkerHover(listing.id));
        marker.on('mouseout', () => onMarkerHover(null));

        marker.addTo(markerLayerRef.current!);
      }
    });
  };

  // Keep the ref pointing to the latest render function on every render
  renderClustersRef.current = renderClusters;

  // ---------------------------------------------------------------------------
  // 2. Rebuild supercluster index when listings change, then re-render
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const sc = new Supercluster({ radius: 50, maxZoom: CLUSTER_MAX_ZOOM, minZoom: 0 });
    sc.load(
      listings.map((l) => ({
        type: 'Feature' as const,
        properties: { id: l.id },
        geometry: { type: 'Point' as const, coordinates: [l.location.lng, l.location.lat] },
      }))
    );
    superclusterRef.current = sc;
    renderClustersRef.current();
  }, [listings]);

  // ---------------------------------------------------------------------------
  // 3. Re-render when view-dependent state changes (hover, selected, favorites)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    renderClustersRef.current();
  }, [hoveredId, selectedId, favorites, contactVisibilityVersion, isMapReady]);

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full h-full relative bg-slate-100">
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 transition-opacity duration-700"
        style={{ opacity: isMapReady ? 1 : 0.01 }}
      />

      {!isMapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50/95 backdrop-blur-sm z-50">
          <div className="w-16 h-16 border-8 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="flex flex-col items-center">
            <p className="font-black text-secondary uppercase tracking-[0.2em] text-sm italic">AgrowLink</p>
            <p className="font-bold text-primary/60 uppercase tracking-widest text-[10px] mt-2">A sintonizar mercado...</p>
          </div>
        </div>
      )}

      {/* Manual Draw Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {drawTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === 'polygon') {
                if (!mapRef.current) return;
                if (activeDrawHandler) {
                  try {
                    activeDrawHandler.disable();
                    setActiveDrawHandler(null);
                  } catch (_) {}
                  return;
                }
                const polygonTool = new (L as any).Draw.Polygon(mapRef.current, {
                  allowIntersection: false,
                  showArea: false,
                  metric: true,
                  repeatMode: false,
                  shapeOptions: { color: '#2d5a27', fillOpacity: 0.2, weight: 3 },
                });
                polygonTool.enable();
                setActiveDrawHandler(polygonTool);
              } else {
                drawLayerRef.current?.clearLayers();
                onPolygonDeleted?.();
              }
            }}
            className={`group flex items-center bg-white/90 backdrop-blur-sm border-2 rounded-2xl p-1 shadow-lg transition-all active:scale-95 ${activeDrawHandler && tool.id === 'polygon' ? 'border-primary ring-4 ring-primary/10' : 'border-white hover:border-primary'}`}
          >
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl transition-colors ${activeDrawHandler && tool.id === 'polygon' ? 'bg-primary text-white' : 'bg-slate-50 text-secondary'}`}
            >
              {tool.icon}
            </div>
            <div className="mx-2 pr-2 text-left hidden sm:block">
              <p className="text-[10px] font-black text-secondary uppercase leading-none">{tool.label}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{tool.hint}</p>
            </div>
            {activeDrawHandler && tool.id === 'polygon' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white sm:hidden"></div>
            )}
          </button>
        ))}

        {activeDrawHandler && (
          <button
            onClick={() => {
              if (activeDrawHandler && typeof activeDrawHandler.completeShape === 'function') {
                activeDrawHandler.completeShape();
              } else if (activeDrawHandler?._finishShape) {
                activeDrawHandler._finishShape();
              } else {
                activeDrawHandler.disable();
              }
            }}
            className="flex items-center justify-center bg-primary border-2 border-white rounded-2xl h-12 px-4 shadow-xl hover:scale-105 transition-all active:scale-95 text-white animate-pulse"
          >
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-black uppercase leading-none">CONCLUIR</p>
            </div>
          </button>
        )}
      </div>

      <style>{`
        .leaflet-popup-pane { z-index: 1000 !important; }
        .custom-popup { pointer-events: auto !important; }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 32px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.4);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .custom-popup .leaflet-popup-content { margin: 0; width: auto !important; }
        .custom-div-icon { background: none !important; border: none !important; }
        .leaflet-container { background: #f8fafc !important; }
      `}</style>
    </div>
  );
}
