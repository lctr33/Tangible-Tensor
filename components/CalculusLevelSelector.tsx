import React from 'react';
import { ViewState } from '../types';

interface CalculusLevelSelectorProps {
  setView: (view: ViewState) => void;
}

export const CalculusLevelSelector: React.FC<CalculusLevelSelectorProps> = ({ setView }) => {
  
  const levels = [
    {
      id: 1,
      title: "LA DERIVADA",
      subtitle: "NIVEL 2-1",
      icon: "slope", 
      locked: false,
      target: ViewState.DERIVATIVE_DEFINITION,
      description: "Pendientes en el espacio 3D (Derivadas Parciales)."
    },
    {
      id: 2,
      title: "INTEGRAL DOBLE",
      subtitle: "NIVEL 2-2",
      icon: "blocks",
      locked: false,
      target: ViewState.INTEGRAL,
      description: "Acumulación de volumen bajo una superficie."
    },
    {
      id: 3,
      title: "EL GRADIENTE",
      subtitle: "NIVEL 2-3",
      icon: "mount",
      locked: false,
      target: ViewState.GRADIENT, 
      description: "La dirección de máximo ascenso."
    },
    {
      id: 4,
      title: "ROTACIONAL (CURL)",
      subtitle: "NIVEL 2-4",
      icon: "curl",
      locked: false,
      target: ViewState.ROTATIONAL,
      description: "Turbulencia, giro y la regla de la mano derecha."
    }
  ];

  const getIcon = (type: string) => {
      switch(type) {
          case 'slope': return <span className="text-5xl">📐</span>;
          case 'mount': return <span className="text-5xl">🏔️</span>;
          case 'blocks': return <span className="text-5xl">🧊</span>;
          case 'div': return <span className="text-5xl">💥</span>;
          case 'curl': return <span className="text-5xl">🌀</span>;
          default: return <span>🔒</span>;
      }
  };

  return (
    <div className="relative w-full h-full bg-[#0f172a] overflow-y-auto custom-scrollbar">
      {/* Grid Background Effect - Pink/Purple theme for Calculus */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(#4c1d95 1px, transparent 1px), linear-gradient(90deg, #4c1d95 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      ></div>

      <div className="relative z-10 p-8 md:p-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-b-4 border-pink-900/50 pb-6 flex flex-col md:flex-row items-baseline justify-between gap-4">
          <div>
            <h2 className="pixel-font text-3xl text-pink-500 drop-shadow-[2px_2px_0_#3b0764]">
              WORLD 2: VECTOR CALCULUS
            </h2>
            <p className="font-mono text-slate-400 mt-2 text-sm">OPTIMIZATION & FIELDS</p>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => !level.locked && setView(level.target)}
              disabled={level.locked}
              className={`group relative h-64 border-4 transition-all duration-200 flex flex-col text-left
                ${level.locked 
                  ? 'border-slate-800 bg-slate-900/50 cursor-not-allowed grayscale opacity-50' 
                  : 'border-pink-900/40 bg-slate-800 hover:bg-slate-800 hover:border-pink-500 hover:-translate-y-2 hover:shadow-[0_10px_0_#1e1b4b]'
                }
              `}
            >
              {/* Card Header (Icon Area) */}
              <div className={`flex-1 flex items-center justify-center bg-slate-900/50 border-b-4 border-inherit
                ${!level.locked && 'group-hover:bg-slate-900/80'}
              `}>
                {getIcon(level.icon)}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`pixel-font text-[10px] ${level.locked ? 'text-slate-600' : 'text-purple-400'}`}>
                    {level.subtitle}
                  </span>
                  {!level.locked && (
                    <span className="animate-pulse w-2 h-2 rounded-full bg-pink-500"></span>
                  )}
                </div>
                
                <h3 className={`pixel-font text-sm leading-snug ${level.locked ? 'text-slate-500' : 'text-white group-hover:text-pink-400'}`}>
                  {level.title}
                </h3>
                
                <p className="font-mono text-[10px] text-slate-500 line-clamp-2">
                  {level.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
