import React from 'react';
import { ViewState } from '../types';

interface LinearLevelSelectorProps {
  setView: (view: ViewState) => void;
}

export const LinearLevelSelector: React.FC<LinearLevelSelectorProps> = ({ setView }) => {
  
  const levels = [
    {
      id: 1,
      title: "VISUALIZAR VECTOR",
      subtitle: "NIVEL 1-1",
      icon: "↗️",
      locked: false,
      target: ViewState.LEVEL_1_VECTOR,
      description: "Conceptos básicos y magnitud."
    },
    {
      id: 2,
      title: "SUMA DE VECTORES",
      subtitle: "NIVEL 1-2",
      icon: "➕",
      locked: false,
      target: ViewState.VECTORS, 
      description: "Acoplamiento de fuerzas."
    },
    {
      id: 3,
      title: "ESCALAR Y DIRECCIÓN",
      subtitle: "NIVEL 1-3",
      icon: "📏",
      locked: false,
      target: ViewState.SCALAR_MULTIPLICATION,
      description: "Estirar, encoger e invertir."
    },
    {
      id: 4,
      title: "ECUACIÓN DE LA RECTA",
      subtitle: "NIVEL 1-4",
      icon: "📏",
      locked: false,
      target: ViewState.LINE_EQUATION,
      description: "Punto + Dirección. La base del movimiento."
    },
    {
      id: 5,
      title: "PRODUCTO PUNTO",
      subtitle: "NIVEL 1-5",
      icon: "☀️", // Sun casting shadow
      locked: false, 
      target: ViewState.DOT_PRODUCT,
      description: "Proyección y similitud."
    },
    {
      id: 6,
      title: "PRODUCTO CRUZ",
      subtitle: "NIVEL 1-6",
      icon: "❌",
      locked: false,
      target: ViewState.CROSS_PRODUCT,
      description: "Ortogonalidad en 3D."
    },
    {
      id: 7,
      title: "TRANSFORMACIONES",
      subtitle: "NIVEL 1-7",
      icon: "🔄",
      locked: false,
      target: ViewState.MATRICES,
      description: "Matrices deformando el espacio."
    },
    {
      id: 8,
      title: "MULTIPLICACIÓN",
      subtitle: "NIVEL 1-8",
      icon: "⛓️",
      locked: false,
      target: ViewState.MATRIX_MULTIPLICATION,
      description: "Composición de transformaciones."
    },
    {
      id: 9,
      title: "EIGENVECTORS",
      subtitle: "BOSS STAGE",
      icon: "💎",
      locked: false,
      target: ViewState.EIGENVECTORS,
      description: "El eje inmutable de la matriz."
    }
  ];

  return (
    <div className="relative w-full h-full bg-[#0f172a] overflow-y-auto custom-scrollbar">
      {/* Grid Background Effect */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      ></div>

      <div className="relative z-10 p-8 md:p-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-b-4 border-slate-700 pb-6 flex flex-col md:flex-row items-baseline justify-between gap-4">
          <div>
            <h2 className="pixel-font text-3xl text-cyan-400 drop-shadow-[2px_2px_0_#1e293b]">
              WORLD 1: LINEAR ALGEBRA
            </h2>
            <p className="font-mono text-slate-400 mt-2 text-sm">SELECT YOUR MISSION</p>
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
                  ? 'border-slate-700 bg-slate-900/50 cursor-not-allowed grayscale opacity-70' 
                  : 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-cyan-400 hover:-translate-y-2 hover:shadow-[0_10px_0_#0f172a]'
                }
              `}
            >
              {/* Card Header (Icon Area) */}
              <div className={`flex-1 flex items-center justify-center text-6xl bg-slate-900/50 border-b-4 border-inherit
                ${!level.locked && 'group-hover:bg-slate-900/80'}
              `}>
                {level.locked ? '🔒' : level.icon}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`pixel-font text-[10px] ${level.locked ? 'text-slate-600' : 'text-yellow-400'}`}>
                    {level.subtitle}
                  </span>
                  {!level.locked && (
                    <span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span>
                  )}
                </div>
                
                <h3 className={`pixel-font text-sm leading-snug ${level.locked ? 'text-slate-500' : 'text-white group-hover:text-cyan-400'}`}>
                  {level.title}
                </h3>
                
                <p className="font-mono text-[10px] text-slate-500 line-clamp-2">
                  {level.description}
                </p>
              </div>

              {/* Decorative Corner Pixels */}
              {!level.locked && (
                <>
                  <div className="absolute top-[-4px] left-[-4px] w-2 h-2 bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute top-[-4px] right-[-4px] w-2 h-2 bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-[-4px] left-[-4px] w-2 h-2 bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-[-4px] right-[-4px] w-2 h-2 bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};