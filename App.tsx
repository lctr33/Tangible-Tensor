import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { VectorPlayground } from './components/VectorPlayground';
import { MatrixTransformLevel } from './components/MatrixTransformLevel';
import { MatrixMultiplicationLevel } from './components/MatrixMultiplicationLevel';
import { GradientDescent } from './components/GradientDescent';
import { LinearLevelSelector } from './components/LinearLevelSelector';
import { CalculusLevelSelector } from './components/CalculusLevelSelector';
import { DerivativeVisualizer } from './components/DerivativeVisualizer';
import { IntegralVisualizer } from './components/IntegralVisualizer';
import { CurlLevel } from './components/CurlLevel'; // New Import
import { VectorVisualizer } from './components/VectorVisualizer';
import { ScalarMultiplication } from './components/ScalarMultiplication';
import { DotProductLevel } from './components/DotProductLevel';
import { CrossProductLevel } from './components/CrossProductLevel';
import { EigenvectorsLevel } from './components/EigenvectorsLevel';
import { LineEquationLevel } from './components/LineEquationLevel';
import { ComingSoon } from './components/ComingSoon';
import { ViewState } from './types';

// Retro Landing Page Component
const LandingPage: React.FC<{ onStart: (view: ViewState) => void }> = ({ onStart }) => {
  return (
    <div className="relative w-full h-full bg-[#101018] overflow-hidden flex flex-col items-center justify-center select-none">
      {/* Background Effects */}
      <div className="stars"></div>
      <div className="twinkling"></div>
      
      {/* Content Container */}
      <div className="z-10 flex flex-col items-center gap-12 max-w-4xl px-4">
        
        {/* Title Section */}
        <div className="text-center space-y-4">
          <h1 className="pixel-font text-4xl md:text-6xl text-cyan-400 leading-tight drop-shadow-[4px_4px_0_#3b0764]">
            TANGIBLE<br />TENSOR
          </h1>
          <p className="pixel-font text-xs md:text-sm text-purple-400 mt-4 tracking-widest opacity-80">
            INSERT COIN TO LEARN
          </p>
        </div>

        {/* Menu Options */}
        <div className="flex flex-col gap-6 mt-8 w-full max-w-md">
           <button 
             onClick={() => onStart(ViewState.LEVEL_SELECT_LIN_ALG)}
             className="group relative px-8 py-4 bg-slate-900 border-4 border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all duration-100"
           >
             <div className="flex items-center justify-between">
                <span className="pixel-font text-white text-sm md:text-base group-hover:text-cyan-400">
                  ALGEBRA LINEAL
                </span>
                <span className="pixel-font text-xs text-slate-500 group-hover:text-cyan-400">
                  1P
                </span>
             </div>
             {/* Hover indicator */}
             <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pixel-font text-cyan-400 text-xl animate-pulse">
               ►
             </div>
           </button>

           <button 
             onClick={() => onStart(ViewState.LEVEL_SELECT_CALCULUS)}
             className="group relative px-8 py-4 bg-slate-900 border-4 border-slate-700 hover:border-pink-500 hover:bg-slate-800 transition-all duration-100"
           >
             <div className="flex items-center justify-between">
                <span className="pixel-font text-white text-sm md:text-base group-hover:text-pink-500">
                  CALCULO VECTORIAL
                </span>
                <span className="pixel-font text-xs text-slate-500 group-hover:text-pink-500">
                  2P
                </span>
             </div>
             {/* Hover indicator */}
             <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pixel-font text-pink-500 text-xl animate-pulse">
               ►
             </div>
           </button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="pixel-font text-yellow-400 text-sm blink">
            PRESS START
          </p>
          <p className="pixel-font text-[10px] text-slate-600 mt-4">
            © 2025 LECTER CORP
          </p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentView, setView] = useState<ViewState>(ViewState.HOME);

  const renderView = () => {
    switch (currentView) {
      // --- LINEAR ALGEBRA WORLD ---
      case ViewState.LEVEL_SELECT_LIN_ALG: 
        return <LinearLevelSelector setView={setView} />;
      
      case ViewState.LEVEL_1_VECTOR: 
        return <VectorVisualizer onNextLevel={() => setView(ViewState.VECTORS)} />;
      
      case ViewState.VECTORS: 
        return <VectorPlayground 
                  onPrevLevel={() => setView(ViewState.LEVEL_1_VECTOR)}
                  onNextLevel={() => setView(ViewState.SCALAR_MULTIPLICATION)} 
               />;
      
      case ViewState.SCALAR_MULTIPLICATION:
        return <ScalarMultiplication 
                  onPrevLevel={() => setView(ViewState.VECTORS)}
                  onNextLevel={() => setView(ViewState.LINE_EQUATION)} 
               />;
      
      case ViewState.LINE_EQUATION: 
        return <LineEquationLevel 
                  onPrevLevel={() => setView(ViewState.SCALAR_MULTIPLICATION)}
                  onNextLevel={() => setView(ViewState.DOT_PRODUCT)}
               />;

      case ViewState.DOT_PRODUCT:
        return <DotProductLevel 
                  onPrevLevel={() => setView(ViewState.LINE_EQUATION)}
                  onNextLevel={() => setView(ViewState.CROSS_PRODUCT)}
               />;

      case ViewState.CROSS_PRODUCT:
        return <CrossProductLevel 
                  onPrevLevel={() => setView(ViewState.DOT_PRODUCT)}
                  onNextLevel={() => setView(ViewState.MATRICES)}
               />;

      case ViewState.MATRICES: 
        return <MatrixTransformLevel 
                  onPrevLevel={() => setView(ViewState.CROSS_PRODUCT)}
                  onNextLevel={() => setView(ViewState.MATRIX_MULTIPLICATION)}
               />;
      
      case ViewState.MATRIX_MULTIPLICATION:
        return <MatrixMultiplicationLevel 
                  onPrevLevel={() => setView(ViewState.MATRICES)}
                  onNextLevel={() => setView(ViewState.EIGENVECTORS)}
               />;

      case ViewState.EIGENVECTORS:
        return <EigenvectorsLevel 
                  onPrevLevel={() => setView(ViewState.MATRIX_MULTIPLICATION)}
               />;

      // --- CALCULUS WORLD ---
      case ViewState.LEVEL_SELECT_CALCULUS:
        return <CalculusLevelSelector setView={setView} />;

      case ViewState.DERIVATIVE_DEFINITION:
        return <DerivativeVisualizer 
                  onPrevLevel={() => setView(ViewState.LEVEL_SELECT_CALCULUS)}
                  onNextLevel={() => setView(ViewState.INTEGRAL)}
               />;

      case ViewState.INTEGRAL:
        return <IntegralVisualizer
                  onPrevLevel={() => setView(ViewState.DERIVATIVE_DEFINITION)}
                  onNextLevel={() => setView(ViewState.GRADIENT)}
               />;

      case ViewState.GRADIENT: 
        return <GradientDescent 
                  onPrevLevel={() => setView(ViewState.INTEGRAL)}
                  onNextLevel={() => setView(ViewState.ROTATIONAL)}
               />;
      
      case ViewState.ROTATIONAL:
        return <CurlLevel
                  onPrevLevel={() => setView(ViewState.GRADIENT)}
               />;

      case ViewState.COMING_SOON: 
        return <ComingSoon onBack={() => setView(ViewState.HOME)} />;
        
      default: return null;
    }
  };

  if (currentView === ViewState.HOME) {
    return (
      <div className="w-full h-screen">
        <LandingPage onStart={setView} />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 w-full overflow-hidden font-sans">
      <Sidebar currentView={currentView} setView={setView} />
      <main className="flex-1 h-full overflow-hidden relative bg-slate-900">
        {renderView()}
      </main>
    </div>
  );
}