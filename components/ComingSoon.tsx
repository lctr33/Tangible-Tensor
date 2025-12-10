import React from 'react';
import { ViewState } from '../types';

interface ComingSoonProps {
  onBack: () => void;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ onBack }) => {
  return (
    <div className="relative w-full h-full bg-[#101018] flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background elements reusing existing CSS classes from index.html */}
      <div className="stars opacity-50"></div>
      
      <div className="z-10 flex flex-col items-center gap-8 max-w-2xl text-center border-4 border-slate-700 bg-slate-900/90 p-12 shadow-2xl backdrop-blur-sm">
        <div className="text-6xl animate-bounce">🚧</div>
        
        <h2 className="pixel-font text-3xl md:text-5xl text-yellow-400 leading-tight drop-shadow-[4px_4px_0_#b45309]">
          COMING<br />SOON...
        </h2>
        
        <p className="pixel-font text-xs md:text-sm text-slate-400 tracking-widest leading-loose">
          ESTA SIMULACIÓN AÚN SE ESTÁ COMPUTANDO EN LA MATRIZ.
          <br/>
          VUELVE PRONTO, VIAJERO.
        </p>

        <button 
          onClick={onBack}
          className="mt-8 px-8 py-3 bg-slate-800 border-2 border-slate-600 text-cyan-400 pixel-font text-xs hover:bg-slate-700 hover:border-cyan-400 hover:text-white transition-all duration-200 shadow-[0_4px_0_#1e293b] active:shadow-none active:translate-y-1"
        >
          ◀ RETURN TO MAP
        </button>
      </div>
    </div>
  );
};