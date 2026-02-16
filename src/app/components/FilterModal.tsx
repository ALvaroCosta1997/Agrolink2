import React from 'react';
import { X, CheckCircle2, Minus, Plus, Info } from 'lucide-react';
import { Species, Sex } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BREED_OPTIONS = {
  Vacas: ['Alentejana', 'Mertolenga', 'Minhota', 'Mirandesa', 'Barrosã', 'Limousine', 'Charolês', 'Angus', 'Outra/Não sei'],
  Ovelhas: ['Merino', 'Churra', 'Bordaleira', 'Serra da Estrela', 'Ile-de-France', 'Outra/Não sei'],
  Cabras: ['Serrana', 'Serpentina', 'Charnequeira', 'Murciana', 'Outra/Não sei']
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    species: Species[];
    breeds: string[];
    lifeStages: string[];
    minMales: number;
    minFemales: number;
    maxPrice: number;
    hasPhotos: boolean;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const LIFE_STAGE_OPTIONS = [
  { id: 'NEWBORN', label: 'Recém-nascido', speciesLabels: { Vacas: 'Vitelo', Ovelhas: 'Borrego', Cabras: 'Cabrito' } },
  { id: 'YOUNG', label: 'Jovem' },
  { id: 'ADULT', label: 'Adulto' },
  { id: 'SLAUGHTER', label: 'Pronto para abate' }
];

export function FilterModal({ isOpen, onClose, filters, setFilters }: FilterModalProps) {
  if (!isOpen) return null;

  const isOneSpeciesSelected = filters.species.length === 1;
  const selectedSpecies = filters.species[0];
  const breeds = isOneSpeciesSelected ? BREED_OPTIONS[selectedSpecies] : [];

  const getLifeStageLabel = (opt: typeof LIFE_STAGE_OPTIONS[0]) => {
    if (opt.id === 'NEWBORN' && isOneSpeciesSelected) {
      return `${opt.label} / ${opt.speciesLabels[selectedSpecies as Species]}`;
    }
    return opt.label;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
          <h2 className="text-2xl font-black text-secondary">Filtrar Animais</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-8 pb-32 no-scrollbar">
          {/* Espécie */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-secondary">Que animal procura?</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['Vacas', 'Ovelhas', 'Cabras'] as Species[]).map(s => (
                <button 
                  key={s}
                  onClick={() => {
                    setFilters((prev: any) => {
                      const newSpecies = prev.species.includes(s) 
                        ? prev.species.filter((x: any) => x !== s) 
                        : [...prev.species, s];
                      return {
                        ...prev,
                        species: newSpecies,
                        breeds: [] 
                      };
                    });
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    filters.species.includes(s) ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 bg-white"
                  )}
                >
                  <span className="text-3xl">{s === 'Vacas' ? '🐄' : s === 'Ovelhas' ? '🐑' : '🐐'}</span>
                  <span className="text-xs font-black uppercase tracking-widest text-secondary">{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Idade (Fase) */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-secondary">Idade (fase)</h3>
              <p className="text-xs font-bold text-slate-400">Filtre por recém-nascido, jovem, adulto ou abate.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LIFE_STAGE_OPTIONS.map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => {
                    setFilters((prev: any) => ({
                      ...prev,
                      lifeStages: prev.lifeStages.includes(opt.id)
                        ? prev.lifeStages.filter((x: string) => x !== opt.id)
                        : [...prev.lifeStages, opt.id]
                    }));
                  }}
                  className={cn(
                    "px-4 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between min-h-[64px]",
                    filters.lifeStages.includes(opt.id) ? "border-primary bg-primary/5 text-primary font-black shadow-sm" : "border-slate-100 text-slate-500 font-bold bg-white"
                  )}
                >
                  <span className="text-sm leading-tight">{getLifeStageLabel(opt)}</span>
                  {filters.lifeStages.includes(opt.id) && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Composição do Lote (Machos e Fêmeas) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-secondary">Composição Mínima</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Machos */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nº de Machos</p>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minMales: Math.max(0, prev.minMales - 1) }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary disabled:opacity-30 active:scale-95 transition-transform"
                    disabled={filters.minMales === 0}
                  >
                    <Minus className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <span className="flex-1 text-center font-black text-xl">{filters.minMales}</span>
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minMales: prev.minMales + 1 }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              </div>
              
              {/* Fêmeas */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nº de Fêmeas</p>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minFemales: Math.max(0, prev.minFemales - 1) }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary disabled:opacity-30 active:scale-95 transition-transform"
                    disabled={filters.minFemales === 0}
                  >
                    <Minus className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <span className="flex-1 text-center font-black text-xl">{filters.minFemales}</span>
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minFemales: prev.minFemales + 1 }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
            {(filters.minMales > 0 || filters.minFemales > 0) && (
              <button 
                onClick={() => setFilters((prev: any) => ({ ...prev, minMales: 0, minFemales: 0 }))}
                className="text-xs font-black text-primary uppercase tracking-widest text-center mt-1 underline"
              >
                Limpar composição
              </button>
            )}
          </div>

          {/* Raça (Dependent on Species) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-secondary">Raça</h3>
            {filters.species.length === 1 ? (
              <div className="grid grid-cols-2 gap-2">
                {breeds.map(b => (
                  <button 
                    key={b}
                    onClick={() => setFilters((prev: any) => ({
                      ...prev,
                      breeds: prev.breeds.includes(b) 
                        ? prev.breeds.filter((x: string) => x !== b)
                        : [...prev.breeds, b]
                    }))}
                    className={cn(
                      "px-4 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                      filters.breeds.includes(b) ? "border-primary bg-primary/5 text-primary font-black" : "border-slate-100 text-slate-500 font-bold"
                    )}
                  >
                    <span className="text-sm">{b}</span>
                    {filters.breeds.includes(b) && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-400">
                  {filters.species.length === 0 
                    ? "Escolha uma espécie para ver as raças." 
                    : "Para filtrar por raça, escolha apenas uma espécie."}
                </p>
              </div>
            )}
          </div>

          {/* Pesos Médios */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-secondary">Peso Médio Mínimo (kg)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Peso Machos */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Peso Machos (kg)</p>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minMaleWeight: Math.max(0, prev.minMaleWeight - 50) }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Minus className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <span className="flex-1 text-center font-black text-xl">{filters.minMaleWeight}</span>
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minMaleWeight: prev.minMaleWeight + 50 }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              </div>
              
              {/* Peso Fêmeas */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Peso Fêmeas (kg)</p>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minFemaleWeight: Math.max(0, prev.minFemaleWeight - 50) }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Minus className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <span className="flex-1 text-center font-black text-xl">{filters.minFemaleWeight}</span>
                  <button 
                    onClick={() => setFilters((prev: any) => ({ ...prev, minFemaleWeight: prev.minFemaleWeight + 50 }))}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preço Máximo */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-bold text-secondary">Preço por cabeça</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Até que valor?</p>
              </div>
              <span className="text-xl font-black text-primary">{filters.maxPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}€</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="5000" 
              step="50"
              value={filters.maxPrice}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, maxPrice: parseInt(e.target.value) }))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-tighter">
              <span>0€</span>
              <span>2.500€</span>
              <span>5.000€+</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
          <button 
            onClick={onClose}
            className="w-full h-16 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 active:scale-95 transition-transform"
          >
            Ver Resultados
          </button>
        </div>
      </div>
    </div>
  );
}
