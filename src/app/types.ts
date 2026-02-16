export type Species = 'Vacas' | 'Ovelhas' | 'Cabras';
export type Sex = 'Macho' | 'Fêmea';
export type LifeStage = 'NEWBORN' | 'YOUNG' | 'ADULT' | 'SLAUGHTER';

export interface Listing {
  id: string;
  species: Species;
  maleQty: number;
  femaleQty: number;
  malePrice?: number;
  femalePrice?: number;
  maleAvgWeight?: number;
  femaleAvgWeight?: number;
  breed?: string;
  lifeStage: LifeStage;
  weight?: string;
  price?: number | 'Sob consulta';
  photos: string[];
  location: {
    lat: number;
    lng: number;
    municipality: string;
    freguesia: string;
    address?: string;
    showExactLocation?: boolean;
  };
  description: string;
  contacts: {
    phone: string;
    whatsapp: boolean;
    name: string;
  };
  createdAt: string;
  tags?: string[];
  status: 'Ativo' | 'Pausado' | 'Vendido';
  sellerId: string;
  viewed?: boolean;
  stats?: {
    views: number;
    contacts: number;
    saves: number;
  };
}

export interface User {
  id: string;
  name: string;
  isLoggedIn: boolean;
  draftMessage: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  messages: ChatMessage[];
  lastUpdate: string;
  listingTitle: string;
  listingPreview: string;
  userName: string;
  unread: boolean;
  isDeleted?: boolean;
}
