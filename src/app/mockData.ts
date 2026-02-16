import { Listing } from './types';

const species = ['Vacas', 'Ovelhas', 'Cabras'] as const;
const breeds = {
  Vacas: ['Alentejana', 'Mertolenga', 'Minhota', 'Mirandesa', 'Barrosã', 'Limousine', 'Charolês', 'Angus'],
  Ovelhas: ['Merino', 'Churra', 'Bordaleira', 'Serra da Estrela', 'Ile-de-France'],
  Cabras: ['Serrana', 'Serpentina', 'Charnequeira', 'Murciana']
};
const municipalities = [
  { name: 'Portalegre', lat: 39.29, lng: -7.42 },
  { name: 'Elvas', lat: 38.88, lng: -7.16 },
  { name: 'Ponte de Sor', lat: 39.25, lng: -8.01 },
  { name: 'Évora', lat: 38.57, lng: -7.91 },
  { name: 'Estremoz', lat: 38.84, lng: -7.58 },
  { name: 'Reguengos de Monsaraz', lat: 38.42, lng: -7.53 },
  { name: 'Beja', lat: 38.01, lng: -7.86 },
  { name: 'Serpa', lat: 37.94, lng: -7.59 },
  { name: 'Mértola', lat: 37.64, lng: -7.66 }
];

const generateListings = (count: number): Listing[] => {
  const data: Listing[] = [];
  for (let i = 1; i <= count; i++) {
    const sp = species[Math.floor(Math.random() * species.length)];
    const mun = municipalities[Math.floor(Math.random() * municipalities.length)];
    const breed = breeds[sp][Math.floor(Math.random() * breeds[sp].length)];
    
    // Generate quantities
    let maleQty = 0;
    let femaleQty = 0;
    const type = Math.random();
    if (type < 0.33) {
      maleQty = Math.floor(Math.random() * 40) + 5;
    } else if (type < 0.66) {
      femaleQty = Math.floor(Math.random() * 40) + 5;
    } else {
      maleQty = Math.floor(Math.random() * 15) + 1;
      femaleQty = Math.floor(Math.random() * 30) + 5;
    }
    
    const isConsult = Math.random() < 0.1;
    let malePrice = 0;
    let femalePrice = 0;
    
    // Determine life stage
    let lifeStage: any = 'ADULT';
    const rand = Math.random();
    if (rand < 0.15) lifeStage = 'NEWBORN';
    else if (rand < 0.35) lifeStage = 'YOUNG';
    else if (rand < 0.85) lifeStage = 'ADULT';
    else lifeStage = 'SLAUGHTER';

    const desc = `Lote de ${maleQty + femaleQty} ${sp} da raça ${breed}. Excelente estado de saúde e nutrição para pastoreio no Alentejo.`;
    
    if (!isConsult) {
      if (sp === 'Vacas') {
        malePrice = 800 + Math.floor(Math.random() * 400);
        femalePrice = 700 + Math.floor(Math.random() * 300);
      } else if (sp === 'Ovelhas') {
        malePrice = 120 + Math.floor(Math.random() * 80);
        femalePrice = 100 + Math.floor(Math.random() * 60);
      } else {
        malePrice = 100 + Math.floor(Math.random() * 60);
        femalePrice = 90 + Math.floor(Math.random() * 50);
      }
    }
    
    const totalPrice = (maleQty * malePrice) + (femaleQty * femalePrice);
    
    // Average weights based on species and stage
    let maleAvgWeight: number | undefined;
    let femaleAvgWeight: number | undefined;

    if (sp === 'Vacas') {
      const base = lifeStage === 'NEWBORN' ? 50 : lifeStage === 'YOUNG' ? 250 : lifeStage === 'ADULT' ? 500 : 650;
      if (maleQty > 0) maleAvgWeight = base + Math.floor(Math.random() * 50);
      if (femaleQty > 0) femaleAvgWeight = (base * 0.85) + Math.floor(Math.random() * 40);
    } else if (sp === 'Ovelhas' || sp === 'Cabras') {
      const base = lifeStage === 'NEWBORN' ? 5 : lifeStage === 'YOUNG' ? 20 : lifeStage === 'ADULT' ? 60 : 80;
      if (maleQty > 0) maleAvgWeight = base + Math.floor(Math.random() * 10);
      if (femaleQty > 0) femaleAvgWeight = (base * 0.9) + Math.floor(Math.random() * 8);
    }

    const photosPool = {
      Vacas: [
        'https://images.unsplash.com/photo-1760523876904-9301f0eb842e?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1765100480313-a1f192dba1bf?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800'
      ],
      Ovelhas: [
        'https://images.unsplash.com/photo-1609585051727-1dc8c3361910?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1665323725617-470ef01493a3?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1495539406979-bf61750d38ad?auto=format&fit=crop&q=80&w=800'
      ],
      Cabras: [
        'https://images.unsplash.com/photo-1690025046509-bc7b60325044?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1659710895910-7958973344d0?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1533630660533-5c74384931e5?auto=format&fit=crop&q=80&w=800'
      ]
    };

    const getRandomPhotos = (s: Species) => {
      const pool = photosPool[s];
      // Shuffle and take 3-4 photos to ensure "multiple" for every listing
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const count = Math.floor(Math.random() * 2) + 3; // 3 or 4 photos
      return shuffled.slice(0, count);
    };

    data.push({
      id: `generated-${i}`,
      species: sp,
      maleQty,
      femaleQty,
      malePrice: malePrice || undefined,
      femalePrice: femalePrice || undefined,
      breed: breed,
      lifeStage: lifeStage,
      price: isConsult ? 'Sob consulta' : totalPrice,
      photos: getRandomPhotos(sp),
      location: {
        lat: mun.lat + (Math.random() - 0.5) * 0.15,
        lng: mun.lng + (Math.random() - 0.5) * 0.15,
        municipality: mun.name,
        freguesia: 'Zona Rural',
        showExactLocation: Math.random() > 0.3
      },
      description: `Lote de ${maleQty + femaleQty} ${sp} da raça ${breed}. Excelente estado de saúde e nutrição para pastoreio no Alentejo.`,
      contacts: {
        phone: `+351 9${(Math.floor(Math.random() * 90000000) + 10000000).toString()}`,
        whatsapp: Math.random() > 0.2,
        name: ['António', 'Maria', 'Joaquim', 'José', 'Manuel'][Math.floor(Math.random() * 5)] + ' ' + ['Santos', 'Silva', 'Pereira', 'Costa'][Math.floor(Math.random() * 4)]
      },
      createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      status: 'Ativo',
      sellerId: `seller-${i}`,
      maleAvgWeight,
      femaleAvgWeight,
      stats: {
        views: Math.floor(Math.random() * 450) + 50,
        contacts: Math.floor(Math.random() * 40) + 5,
        saves: Math.floor(Math.random() * 80) + 10
      }
    });
  }
  return data;
};

export const INITIAL_LISTINGS: Listing[] = generateListings(50);
