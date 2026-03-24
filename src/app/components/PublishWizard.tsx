import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Camera, MapPin, CheckCircle2, Info, Eye, EyeOff, Minus, Crosshair, Globe, Loader2, AlertCircle } from 'lucide-react';
import { Species, Listing, LifeStage, User } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'motion/react';
import { supabase } from '../api';
import { PhoneCountrySelect, PHONE_COUNTRIES } from './PhoneCountrySelect';

// Mapping of Portuguese Municipalities to Districts
const MUNICIPALITY_TO_DISTRICT: Record<string, string> = {
  // Beja
  'Aljustrel': 'Beja', 'Almodôvar': 'Beja', 'Alvito': 'Beja', 'Barrancos': 'Beja', 'Beja': 'Beja', 'Castro Verde': 'Beja', 'Cuba': 'Beja', 'Ferreira do Alentejo': 'Beja', 'Mértola': 'Beja', 'Moura': 'Beja', 'Odemira': 'Beja', 'Ourique': 'Beja', 'Serpa': 'Beja', 'Vidigueira': 'Beja',
  // Évora
  'Alandroal': 'Évora', 'Arraiolos': 'Évora', 'Borba': 'Évora', 'Estremoz': 'Évora', 'Évora': 'Évora', 'Montemor-o-Novo': 'Évora', 'Mora': 'Évora', 'Mourão': 'Évora', 'Portel': 'Évora', 'Redondo': 'Évora', 'Reguengos de Monsaraz': 'Évora', 'Vendas Novas': 'Évora', 'Viana do Alentejo': 'Évora', 'Vila Viçosa': 'Évora',
  // Portalegre
  'Alter do Chão': 'Portalegre', 'Arronches': 'Portalegre', 'Avis': 'Portalegre', 'Campo Maior': 'Portalegre', 'Castelo de Vide': 'Portalegre', 'Crato': 'Portalegre', 'Elvas': 'Portalegre', 'Fronteira': 'Portalegre', 'Gavião': 'Portalegre', 'Marvão': 'Portalegre', 'Monforte': 'Portalegre', 'Nisa': 'Portalegre', 'Ponte de Sor': 'Portalegre', 'Portalegre': 'Portalegre', 'Sousel': 'Portalegre',
  // Santarém
  'Abrantes': 'Santarém', 'Alcanena': 'Santarém', 'Almeirim': 'Santarém', 'Alpiarça': 'Santarém', 'Benavente': 'Santarém', 'Cartaxo': 'Santarém', 'Chamusca': 'Santarém', 'Constância': 'Santarém', 'Coruche': 'Santarém', 'Entroncamento': 'Santarém', 'Ferreira do Zêzere': 'Santarém', 'Golegã': 'Santarém', 'Mação': 'Santarém', 'Ourém': 'Santarém', 'Rio Maior': 'Santarém', 'Salvaterra de Magos': 'Santarém', 'Santarém': 'Santarém', 'Sardoal': 'Santarém', 'Tomar': 'Santarém', 'Torres Novas': 'Santarém', 'Vila Nova da Barquinha': 'Santarém',
  // Setúbal
  'Alcácer do Sal': 'Setúbal', 'Alcochete': 'Setúbal', 'Almada': 'Setúbal', 'Barreiro': 'Setúbal', 'Grândola': 'Setúbal', 'Moita': 'Setúbal', 'Montijo': 'Setúbal', 'Palmela': 'Setúbal', 'Santiago do Cacém': 'Setúbal', 'Seixal': 'Setúbal', 'Sesimbra': 'Setúbal', 'Setúbal': 'Setúbal', 'Sines': 'Setúbal',
  // Castelo Branco
  'Belmonte': 'Castelo Branco', 'Castelo Branco': 'Castelo Branco', 'Covilhã': 'Castelo Branco', 'Fundão': 'Castelo Branco', 'Idanha-a-Nova': 'Castelo Branco', 'Oleiros': 'Castelo Branco', 'Penamacor': 'Castelo Branco', 'Proença-a-Nova': 'Castelo Branco', 'Sertã': 'Castelo Branco', 'Vila de Rei': 'Castelo Branco', 'Vila Velha de Ródão': 'Castelo Branco',
  // Faro
  'Albufeira': 'Faro', 'Alcoutim': 'Faro', 'Aljezur': 'Faro', 'Castro Marim': 'Faro', 'Faro': 'Faro', 'Lagoa': 'Faro', 'Lagos': 'Faro', 'Loulé': 'Faro', 'Monchique': 'Faro', 'Olhão': 'Faro', 'Portimão': 'Faro', 'São Brás de Alportel': 'Faro', 'Silves': 'Faro', 'Tavira': 'Faro', 'Vila do Bispo': 'Faro', 'Vila Real de Santo António': 'Faro'
};

export const BREEDS_BY_SPECIES: Record<Species, string[]> = {
  Vacas: [
    'Cruzado', 'Alentejana', 'Mertolenga', 'Charolês', 'Limousine',
    'Angus', 'Mirandesa', 'Hereford', 'Simmental', "Blonde d'Aquitaine",
  ],
  Ovelhas: [
    'Cruzado', 'Serra da Estrela', 'Merina Branca', 'Merina Preta', 'Churra da Terra Quente',
  ],
  Cabras: [
    'Cruzado', 'Serrana', 'Charnequeira', 'Serpentina', 'Algarvia',
  ],
};

// Custom Marker for Publish Wizard
const createCustomIcon = (species: Species) => {
  const speciesIcon = species === 'Vacas' ? '🐄' : species === 'Ovelhas' ? '🐑' : '🐐';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="flex flex-col items-center">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-xl border-2 bg-primary border-white">
          <span>${speciesIcon}</span>
        </div>
        <div class="w-2.5 h-2.5 bg-primary rotate-45 -mt-1.5 shadow-lg border-r border-b border-white"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

function LocationPicker({ lat, lng, onLocationSelect, species }: { lat: number; lng: number; onLocationSelect: (lat: number, lng: number) => void; species: Species }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker position={[lat, lng]} icon={createCustomIcon(species)} />
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PublishWizardProps {
  onCancel: () => void;
  onPublish: (listing: Listing) => void;
  currentUser: User | null;
  initialData?: Listing;
  isEditMode?: boolean;
}

const parsePhone = (phone: string): { country: string; number: string } => {
  if (!phone) return { country: '+351', number: '' };
  const match = phone.match(/^(\+\d+)\s(.+)$/);
  if (match) return { country: match[1], number: match[2] };
  return { country: '+351', number: phone };
};

const LIFE_STAGE_OPTIONS = [
  { id: 'NEWBORN', label: 'Recém-nascido', speciesLabels: { Vacas: 'Vitelo', Ovelhas: 'Borrego', Cabras: 'Cabrito' } },
  { id: 'YOUNG', label: 'Jovem' },
  { id: 'ADULT', label: 'Adulto' },
  { id: 'SLAUGHTER', label: 'Pronto para abate' }
] as const;

export function PublishWizard({ onCancel, onPublish, currentUser, initialData, isEditMode }: PublishWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not available")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
      img.src = objectUrl;
    });

  const buildInitialFormData = () => {
    if (initialData) {
      const { country, number } = parsePhone(initialData.contacts.phone);
      return {
        species: initialData.species,
        maleQty: initialData.maleQty,
        femaleQty: initialData.femaleQty,
        malePrice: initialData.malePrice ?? '' as string | number,
        femalePrice: initialData.femalePrice ?? '' as string | number,
        maleAvgWeight: initialData.maleAvgWeight ?? '' as string | number,
        femaleAvgWeight: initialData.femaleAvgWeight ?? '' as string | number,
        lifeStage: initialData.lifeStage,
        breed: initialData.breed || '',
        priceType: (initialData.price === 'Sob consulta' ? 'consulta' : 'number') as 'number' | 'consulta',
        municipality: initialData.location.municipality,
        distrito: '',
        freguesia: initialData.location.freguesia,
        address: initialData.location.address || '',
        lat: initialData.location.lat,
        lng: initialData.location.lng,
        showExactLocation: initialData.location.showExactLocation || false,
        description: initialData.description,
        phoneCountry: country,
        phoneNumber: number,
        whatsapp: initialData.contacts.whatsapp,
        name: initialData.contacts.name,
        photos: initialData.photos || [],
        tags: initialData.tags || []
      };
    }
    return {
      species: 'Vacas' as Species,
      maleQty: 0,
      femaleQty: 1,
      malePrice: '' as string | number,
      femalePrice: '' as string | number,
      maleAvgWeight: '' as string | number,
      femaleAvgWeight: '' as string | number,
      lifeStage: 'ADULT' as LifeStage,
      breed: '',
      priceType: 'number' as 'number' | 'consulta',
      municipality: '',
      distrito: '',
      freguesia: '',
      address: '',
      lat: 38.5714,
      lng: -7.9135,
      showExactLocation: false,
      description: '',
      phoneCountry: currentUser?.phoneCountry || '+351',
      phoneNumber: currentUser?.phoneNumber || '',
      whatsapp: true,
      name: currentUser?.name || '',
      photos: [] as string[],
      tags: [] as string[]
    };
  };

  const [formData, setFormData] = useState(buildInitialFormData);

  // Also update if user logs in while wizard is open (only in create mode)
  useEffect(() => {
    if (currentUser && !isEditMode) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || currentUser.name,
        phoneNumber: prev.phoneNumber || currentUser.phoneNumber || '',
        phoneCountry: prev.phoneCountry || currentUser.phoneCountry || '+351'
      }));
    }
  }, [currentUser]);

  const fetchAddressInfo = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-PT`);
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        const concelho = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || '';
        const cleanConcelho = concelho.replace(/Município de /gi, '').trim();
        
        // Match Concelho to Distrito using local mapping
        const matchedDistrito = MUNICIPALITY_TO_DISTRICT[cleanConcelho] || addr.county || addr.state_district || addr.state || '';
        const cleanDistrito = matchedDistrito.replace(/Distrito de /gi, '').trim();
        
        const freguesia = addr.suburb || addr.neighbourhood || addr.city_district || '';

        setFormData(prev => ({
          ...prev,
          lat,
          lng,
          municipality: cleanConcelho,
          distrito: cleanDistrito,
          freguesia: freguesia
        }));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const validatePhone = (country: string, number: string) => {
    const cleanNum = number.replace(/\s+/g, '').replace(/^0/, '');
    if (country === '+351') {
      // Portugal: 9 digits, starts with 2, 3 or 9
      return cleanNum.length === 9 && /^[239]/.test(cleanNum);
    }
    if (country === '+34') {
      // Spain: 9 digits, starts with 6, 7, 8 or 9
      return cleanNum.length === 9 && /^[6789]/.test(cleanNum);
    }
    if (country === '+33') {
      // France: 9 digits (after stripping leading 0), starts with 1-9
      return cleanNum.length === 9 && /^[1-9]/.test(cleanNum);
    }
    // Generic: at least 7 digits
    return cleanNum.length >= 7;
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    fetchAddressInfo(lat, lng);
  };

  const nextStep = () => {
    setError(null);
    if (step === 2 && formData.maleQty + formData.femaleQty === 0) {
      setError("Indique o número de animais.");
      return; 
    }
    if (step === 4 && formData.priceType === 'number') {
      if (formData.maleQty > 0 && (Number(formData.malePrice) <= 0 || !formData.malePrice)) {
        setError("O preço dos machos deve ser superior a zero.");
        return;
      }
      if (formData.femaleQty > 0 && (Number(formData.femalePrice) <= 0 || !formData.femalePrice)) {
        setError("O preço das fêmeas deve ser superior a zero.");
        return;
      }
    }
    if (step === 5 && !formData.municipality) {
      setError("Por favor, selecione a localização no mapa.");
      return;
    }
    if (step === 6) {
      if (!formData.name) {
        setError("Por favor, indique o seu nome.");
        return;
      }
      if (!validatePhone(formData.phoneCountry, formData.phoneNumber)) {
        setError("Por favor, indique um número de telefone válido.");
        return;
      }
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const prevStep = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const formatPriceNum = (val: number | string) => {
    if (!val || val === 'Sob consulta') return val;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const calculateTotal = () => {
    if (formData.priceType === 'consulta') return 'Sob consulta';
    const m = (Number(formData.malePrice) || 0) * (Number(formData.maleQty) || 0);
    const f = (Number(formData.femalePrice) || 0) * (Number(formData.femaleQty) || 0);
    return m + f;
  };

  const handleFinish = () => {
    const totalQty = formData.maleQty + formData.femaleQty;
    const price = calculateTotal();
    const finalPhone = `${formData.phoneCountry} ${formData.phoneNumber}`.trim();

    const newListing: Listing = {
      id: isEditMode && initialData ? initialData.id : Math.random().toString(36).substr(2, 9),
      species: formData.species,
      maleQty: formData.maleQty,
      femaleQty: formData.femaleQty,
      malePrice: formData.maleQty > 0 && formData.priceType === 'number' ? Number(formData.malePrice) : undefined,
      femalePrice: formData.femaleQty > 0 && formData.priceType === 'number' ? Number(formData.femalePrice) : undefined,
      maleAvgWeight: formData.maleQty > 0 ? Number(formData.maleAvgWeight) : undefined,
      femaleAvgWeight: formData.femaleQty > 0 ? Number(formData.femaleAvgWeight) : undefined,
      lifeStage: formData.lifeStage,
      breed: formData.breed,
      price: price,
      photos: formData.photos.length > 0 ? formData.photos : ['https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800'],
      location: {
        lat: formData.lat,
        lng: formData.lng,
        municipality: formData.municipality || 'Portugal',
        freguesia: formData.freguesia || 'Centro',
        address: formData.address,
        showExactLocation: formData.showExactLocation
      },
      description: formData.description,
      contacts: {
        phone: finalPhone,
        whatsapp: formData.whatsapp,
        name: formData.name
      },
      createdAt: new Date().toISOString(),
      tags: formData.tags,
      status: 'Ativo',
      sellerId: currentUser?.id || 'pending'
    };
    onPublish(newListing);
  };

  const handleDetectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        handleLocationSelect(position.coords.latitude, position.coords.longitude);
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsCompressing(true);
    const uploadedUrls: string[] = [];
    for (const file of files) {
      let uploadBlob: Blob = file;
      let baseName = file.name.replace(/\.[^.]+$/, "");
      try {
        uploadBlob = await compressImage(file);
      } catch (err) {
        console.warn("Compression failed, using original:", err);
        baseName = file.name.replace(/\.[^.]+$/, "");
      }
      setIsCompressing(false);
      setIsUploading(true);
      const path = `${currentUser?.id || 'anon'}/${Date.now()}-${baseName}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(path, uploadBlob, { contentType: 'image/jpeg' });
      if (!uploadError) {
        const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      } else {
        console.error('Erro ao carregar foto:', uploadError.message);
      }
    }
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ...uploadedUrls] }));
    setIsUploading(false);
    e.target.value = '';
  };

  const handleRemovePhoto = async (url: string) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter(p => p !== url) }));
    try {
      const marker = '/listing-photos/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const path = decodeURIComponent(url.slice(idx + marker.length));
        await supabase.storage.from('listing-photos').remove([path]);
      }
    } catch (e) {
      console.error('Erro ao eliminar foto do armazenamento:', e);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-black">O que quer vender?</h2>
            <div className="grid grid-cols-1 gap-3">
              {(['Vacas', 'Ovelhas', 'Cabras'] as Species[]).map(s => (
                <button 
                  key={s}
                  onClick={() => setFormData({...formData, species: s, breed: ''})}
                  className={cn(
                    "flex items-center justify-between p-6 rounded-3xl border-2 transition-all text-left",
                    formData.species === s ? "border-primary bg-primary/5 shadow-lg" : "border-slate-100 bg-white"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-5xl">{s === 'Vacas' ? '🐄' : s === 'Ovelhas' ? '🐑' : '🐐'}</span>
                    <span className="text-2xl font-black">{s}</span>
                  </div>
                  {formData.species === s && <CheckCircle2 className="w-8 h-8 text-primary" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black">Idade (fase)</h2>
              <p className="text-lg font-bold text-slate-400">Escolha a fase do animal (Ex: recém-nascido, adulto, abate).</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {LIFE_STAGE_OPTIONS.map(opt => {
                const label = opt.id === 'NEWBORN' 
                  ? `${opt.label} / ${opt.speciesLabels[formData.species]}` 
                  : opt.label;
                return (
                  <button 
                    key={opt.id}
                    onClick={() => setFormData({...formData, lifeStage: opt.id as LifeStage})}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border-2 transition-all text-left min-h-[96px]",
                      formData.lifeStage === opt.id ? "border-primary bg-primary/5 shadow-lg" : "border-slate-100 bg-white"
                    )}
                  >
                    <span className="text-xl font-black">{label}</span>
                    {formData.lifeStage === opt.id && <CheckCircle2 className="w-7 h-7 text-primary" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3:
        const total = formData.maleQty + formData.femaleQty;
        return (
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-black">Composição do lote</h2>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-black uppercase tracking-widest text-slate-400">Nº de Machos</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                  <button 
                    onClick={() => setFormData({...formData, maleQty: Math.max(0, formData.maleQty - 1)})}
                    className="w-16 h-16 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary disabled:opacity-30 active:scale-95 transition-transform"
                    disabled={formData.maleQty === 0}
                  >
                    <Minus className="w-8 h-8" strokeWidth={3} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-black">{formData.maleQty}</span>
                  </div>
                  <button 
                    onClick={() => setFormData({...formData, maleQty: formData.maleQty + 1})}
                    className="w-16 h-16 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Plus className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-black uppercase tracking-widest text-slate-400">Nº de Fêmeas</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                  <button 
                    onClick={() => setFormData({...formData, femaleQty: Math.max(0, formData.femaleQty - 1)})}
                    className="w-16 h-16 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary disabled:opacity-30 active:scale-95 transition-transform"
                    disabled={formData.femaleQty === 0}
                  >
                    <Minus className="w-8 h-8" strokeWidth={3} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-black">{formData.femaleQty}</span>
                  </div>
                  <button 
                    onClick={() => setFormData({...formData, femaleQty: formData.femaleQty + 1})}
                    className="w-16 h-16 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Plus className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-3xl text-center border-2 border-primary/10">
                <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-1">Total de Animais</p>
                <p className="text-4xl font-black text-primary">{total}</p>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-black">Preços e Raça</h2>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400">Tipo de Preço</label>
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl">
                <button 
                  onClick={() => setFormData({...formData, priceType: 'number'})}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black transition-all",
                    formData.priceType === 'number' ? "bg-white text-primary shadow-md" : "text-slate-500"
                  )}
                >
                  Preço p/ Cabeça
                </button>
                <button 
                  onClick={() => setFormData({...formData, priceType: 'consulta'})}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black transition-all",
                    formData.priceType === 'consulta' ? "bg-white text-primary shadow-md" : "text-slate-500"
                  )}
                >
                  Sob Consulta
                </button>
              </div>
            </div>

            {formData.priceType === 'number' && (
              <div className="flex flex-col gap-6">
                {formData.maleQty > 0 && (
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Preço por Macho (€)</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Ex: 800"
                      value={formData.malePrice}
                      onChange={(e) => setFormData({...formData, malePrice: Math.max(0, Number(e.target.value)) || ''})}
                      className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-2xl font-black outline-none focus:border-primary"
                    />
                  </div>
                )}
                {formData.femaleQty > 0 && (
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Preço por Fêmea (€)</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Ex: 700"
                      value={formData.femalePrice}
                      onChange={(e) => setFormData({...formData, femalePrice: Math.max(0, Number(e.target.value)) || ''})}
                      className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-2xl font-black outline-none focus:border-primary"
                    />
                  </div>
                )}
                
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
                  <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Preço Total Estimado</p>
                  <p className="text-3xl font-black">{formatPriceNum(calculateTotal())}€</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400">Raça (Opcional)</label>
              <div className="grid grid-cols-2 gap-2">
                {(BREEDS_BY_SPECIES[formData.species] || []).map(r => (
                  <button 
                    key={r}
                    onClick={() => setFormData({...formData, breed: r})}
                    className={cn(
                      "py-3 px-4 rounded-xl border-2 font-bold transition-all text-sm",
                      formData.breed === r ? "border-primary bg-primary/5 text-primary" : "border-slate-100 bg-white text-slate-500"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Outra raça..."
                value={formData.breed}
                onChange={(e) => setFormData({...formData, breed: e.target.value})}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-base outline-none focus:border-primary"
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-black">Localização</h2>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400">Ponto no Mapa</label>
                  <button 
                    onClick={handleDetectLocation}
                    disabled={isGeocoding}
                    className="text-[10px] font-black text-primary uppercase flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full disabled:opacity-50"
                  >
                    {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                    Detectar onde estou
                  </button>
                </div>
                <div className="h-64 rounded-3xl overflow-hidden border-4 border-slate-100 relative z-0">
                  <MapContainer 
                    center={[formData.lat, formData.lng]} 
                    zoom={10} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker 
                      lat={formData.lat} 
                      lng={formData.lng} 
                      onLocationSelect={handleLocationSelect} 
                      species={formData.species}
                    />
                  </MapContainer>
                  {isGeocoding && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                      <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border-2 border-primary/10">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="font-black text-xs uppercase tracking-widest text-primary">A identificar local...</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-bold text-primary flex items-center gap-2 shadow-sm pointer-events-none">
                    <Info className="w-3 h-3" />
                    Toque no mapa para marcar o local dos animais
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400">Distrito</label>
                  <div className="h-16 bg-slate-100 border-2 border-slate-100 rounded-2xl px-6 flex items-center text-lg font-black text-slate-500">
                    {formData.distrito || 'Selecione no mapa'}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400">Concelho</label>
                  <div className="h-16 bg-slate-100 border-2 border-slate-100 rounded-2xl px-6 flex items-center text-lg font-black text-slate-500">
                    {formData.municipality || 'Selecione no mapa'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-black uppercase tracking-widest text-slate-400">Localidade / Herdade</label>
                <input 
                  type="text" 
                  placeholder="Ex: Monte das Flores ou Herdade do Sol"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-xl font-bold outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-black">Fotos e Contacto</h2>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400">Fotos do Lote</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isCompressing}
                  className="aspect-square bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  {(isUploading || isCompressing) ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : (
                    <Camera className="w-10 h-10" />
                  )}
                  <span className="font-black text-xs uppercase">
                    {isCompressing ? 'A comprimir...' : isUploading ? 'A carregar...' : 'Adicionar'}
                  </span>
                </button>
                {formData.photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-3xl overflow-hidden border">
                    <img src={p} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(p)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400">Seu Nome</label>
              <input 
                type="text" 
                placeholder="Ex: Manuel Silva"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-xl font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400">Telefone de Contacto</label>
              <div className="flex gap-2">
                <PhoneCountrySelect
                  value={formData.phoneCountry}
                  onChange={(code) => setFormData({...formData, phoneCountry: code})}
                />
                <input 
                  type="tel" 
                  placeholder="912 345 678"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '')})}
                  className="flex-1 h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-xl font-bold outline-none focus:border-primary"
                />
              </div>
              <p className="text-xs font-bold text-slate-400">Pode alterar o indicativo se necessário.</p>
            </div>
          </div>
        );
      case 7:
        const finalTotalQty = formData.maleQty + formData.femaleQty;
        const finalPrice = calculateTotal();
        return (
          <div className="flex flex-col gap-8 pb-10">
            <h2 className="text-3xl font-black">{isEditMode ? 'Rever e Guardar' : 'Rever e Publicar'}</h2>
            
            <div className="bg-slate-50 rounded-3xl p-6 flex flex-col gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white rounded-2xl shadow-sm flex items-center justify-center text-5xl">
                  {formData.species === 'Vacas' ? '🐄' : formData.species === 'Ovelhas' ? '🐑' : '🐐'}
                </div>
                <div>
                  <h3 className="text-3xl font-black">{finalTotalQty} {formData.species}</h3>
                  <p className="text-lg font-bold text-slate-500">
                    {formData.maleQty > 0 && `${formData.maleQty} Machos`}
                    {formData.maleQty > 0 && formData.femaleQty > 0 && ' + '}
                    {formData.femaleQty > 0 && `${formData.femaleQty} Fêmeas`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Preço Total</span>
                  <p className="text-xl font-black text-primary">
                    {finalPrice === 'Sob consulta' ? 'Sob Consulta' : `${formatPriceNum(finalPrice)}€`}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Localização</span>
                  <p className="text-xl font-black truncate">{formData.municipality || 'Não definido'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 text-green-700 rounded-2xl text-sm font-bold shadow-sm">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <p>Ao publicar, o seu anúncio ficará disponível para todos os compradores no AgroLink.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <button onClick={onCancel} className="p-3 bg-slate-100 rounded-full active:scale-90 transition-transform">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                step === i + 1 ? "w-8 bg-primary" : "w-2 bg-slate-200"
              )} 
            />
          ))}
        </div>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:max-w-xl md:mx-auto w-full no-scrollbar">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold"
          >
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
        {renderStep()}
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-white flex gap-4 md:max-w-xl md:mx-auto w-full">
        {step > 1 && (
          <button 
            onClick={prevStep}
            className="flex-1 h-16 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg active:scale-95 transition-transform"
          >
            Voltar
          </button>
        )}
        <button 
          onClick={step === totalSteps ? handleFinish : nextStep}
          className={cn(
            "h-16 rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95",
            step === 1 ? "w-full bg-primary text-white shadow-primary/30" : "flex-[2] bg-primary text-white shadow-primary/30"
          )}
        >
          {step === totalSteps ? (isEditMode ? 'Guardar Alterações' : 'Publicar Agora') : 'Continuar'}
        </button>
      </div>

      <style>{`
        .custom-div-icon { background: none !important; border: none !important; }
      `}</style>
    </div>
  );
}
