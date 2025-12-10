import React, { useState } from 'react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  // State to manage which world menu is expanded
  // Defaults to null (collapsed) as requested
  const [expandedWorld, setExpandedWorld] = useState<'WORLD_1' | 'WORLD_2' | null>(null);

  const world1Levels = [
    { id: ViewState.LEVEL_1_VECTOR, label: '1-1: Vector Unit', icon: '↗️' },
    { id: ViewState.VECTORS, label: '1-2: Suma', icon: '➕' },
    { id: ViewState.SCALAR_MULTIPLICATION, label: '1-3: Escalar', icon: '📏' },
    { id: ViewState.LINE_EQUATION, label: '1-4: Recta', icon: '📉' },
    { id: ViewState.DOT_PRODUCT, label: '1-5: Prod. Punto', icon: '☀️' },
    { id: ViewState.CROSS_PRODUCT, label: '1-6: Prod. Cruz', icon: '❌' },
    { id: ViewState.MATRICES, label: '1-7: Matrices', icon: '🔄' },
    { id: ViewState.MATRIX_MULTIPLICATION, label: '1-8: Mult. Matriz', icon: '⛓️' },
    { id: ViewState.EIGENVECTORS, label: 'BOSS: Eigen', icon: '💎' },
  ];

  const world2Levels = [
    { id: ViewState.DERIVATIVE_DEFINITION, label: '2-1: Derivada', icon: '📐' },
    { id: ViewState.INTEGRAL, label: '2-2: Integral', icon: '🧊' },
    { id: ViewState.GRADIENT, label: '2-3: Gradiente', icon: '🏔️' },
    { id: ViewState.ROTATIONAL, label: '2-4: Rotacional', icon: '🌀' },
  ];

  const toggleWorld = (world: 'WORLD_1' | 'WORLD_2') => {
      setExpandedWorld(prev => prev === world ? null : world);
  };

  return (
    <div className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col h-full flex-shrink-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex-shrink-0">
        <h1 
            className="text-xl font-bold text-cyan-400 pixel-font leading-loose tracking-tighter cursor-pointer hover:text-cyan-300 transition-colors"
            onClick={() => setView(ViewState.HOME)}
        >
          TANGIBLE<br/>TENSOR
        </h1>
        <p className="text-[10px] text-slate-500 mt-2 font-mono">
          SYSTEM_READY...
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        
        {/* WORLD 1 ACCORDION */}
        <div className="space-y-1">
            <button 
                onClick={() => toggleWorld('WORLD_1')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-all duration-200 ${
                    expandedWorld === 'WORLD_1' 
                    ? 'bg-slate-800 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
                <span className="pixel-font text-[10px]">WORLD 1: ALGEBRA</span>
                <span className="text-[10px] transform transition-transform duration-200" style={{ transform: expandedWorld === 'WORLD_1' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            
            {expandedWorld === 'WORLD_1' && (
                <div className="pl-2 space-y-1 border-l-2 border-slate-800 ml-2 animate-[fadeIn_0.2s_ease-out]">
                    {world1Levels.map(level => (
                        <button
                            key={level.id}
                            onClick={() => setView(level.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] transition-colors font-mono text-left ${
                                currentView === level.id 
                                ? 'bg-cyan-900/20 text-cyan-400 font-bold border-l-2 border-cyan-400' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="opacity-70 w-4">{level.icon}</span>
                            <span>{level.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* WORLD 2 ACCORDION */}
        <div className="space-y-1">
            <button 
                onClick={() => toggleWorld('WORLD_2')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-all duration-200 ${
                    expandedWorld === 'WORLD_2' 
                    ? 'bg-slate-800 border-pink-500/50 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.1)]' 
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
                <span className="pixel-font text-[10px]">WORLD 2: CALCULUS</span>
                <span className="text-[10px] transform transition-transform duration-200" style={{ transform: expandedWorld === 'WORLD_2' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            
            {expandedWorld === 'WORLD_2' && (
                <div className="pl-2 space-y-1 border-l-2 border-slate-800 ml-2 animate-[fadeIn_0.2s_ease-out]">
                    {world2Levels.map(level => (
                        <button
                            key={level.id}
                            onClick={() => setView(level.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] transition-colors font-mono text-left ${
                                currentView === level.id 
                                ? 'bg-pink-900/20 text-pink-400 font-bold border-l-2 border-pink-400' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="opacity-70 w-4">{level.icon}</span>
                            <span>{level.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>

      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4 flex-shrink-0">
        {/* Status Indicator */}
        <div className="bg-slate-950 rounded p-3 border border-slate-800">
          <div className="flex items-center justify-between">
             <span className="text-[10px] text-slate-500 font-mono">STATUS</span>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,199,89,0.8)]"></div>
                <span className="text-xs text-green-400 font-mono">ONLINE</span>
             </div>
          </div>
        </div>

        {/* Home / Return Button */}
        <button 
          onClick={() => setView(ViewState.HOME)}
          className="w-full py-3 rounded-lg border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-cyan-400 hover:text-cyan-400 text-slate-500 transition-all duration-200 group flex items-center justify-center shadow-[0_4px_0_#1e293b] active:shadow-none active:translate-y-1"
          aria-label="Volver al inicio"
        >
           <span className="text-2xl group-hover:scale-110 transition-transform filter drop-shadow-lg">🏠</span>
        </button>
      </div>
    </div>
  );
};
