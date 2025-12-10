import React, { useState } from 'react';
import { Matrix2x2, Vector2D } from '../types';

const GRID_POINTS = 10; // -10 to 10
const VIEW_SCALE = 15;
const CANVAS_SIZE = 400;
const CENTER = CANVAS_SIZE / 2;

export const MatrixTransform: React.FC = () => {
  const [matrix, setMatrix] = useState<Matrix2x2>({ a: 1, b: 0, c: 0, d: 1 });
  const [hovered, setHovered] = useState<boolean>(false);

  // Generate a grid of points
  const points: Vector2D[] = [];
  for (let x = -GRID_POINTS; x <= GRID_POINTS; x++) {
    for (let y = -GRID_POINTS; y <= GRID_POINTS; y++) {
      points.push({ x, y });
    }
  }

  // Apply transformation
  // T(v) = Av
  // [x'] = [a b] [x] = [ax + by]
  // [y']   [c d] [y]   [cx + dy]
  const transform = (p: Vector2D): Vector2D => {
    return {
      x: matrix.a * p.x + matrix.b * p.y,
      y: matrix.c * p.x + matrix.d * p.y
    };
  };

  const toSvg = (p: Vector2D) => ({
    x: CENTER + p.x * VIEW_SCALE,
    y: CENTER - p.y * VIEW_SCALE
  });

  const updateMatrix = (key: keyof Matrix2x2, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setMatrix(prev => ({ ...prev, [key]: num }));
    }
  };

  // Preset matrices
  const setIdentity = () => setMatrix({ a: 1, b: 0, c: 0, d: 1 });
  const setRotation90 = () => setMatrix({ a: 0, b: -1, c: 1, d: 0 });
  const setShearX = () => setMatrix({ a: 1, b: 1, c: 0, d: 1 });
  const setScaling = () => setMatrix({ a: 2, b: 0, c: 0, d: 2 });

  // Calculating Basis Vectors transformed
  const iHat = transform({x: 1, y: 0});
  const jHat = transform({x: 0, y: 1});

  // Calculate Determinant for visual feedback
  const det = (matrix.a * matrix.d) - (matrix.b * matrix.c);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full p-4 overflow-y-auto">
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col items-center">
         <h3 className="text-lg font-bold text-slate-800 mb-2">Transformaciones Lineales</h3>
         <p className="text-sm text-slate-500 mb-4 max-w-lg text-center">
            La matriz actúa como una "máquina" que deforma el espacio. 
            Observa cómo la cuadrícula cambia cuando alteras los valores de la matriz.
            Esto es análogo a cómo las capas de una Red Neuronal transforman los datos de entrada.
         </p>

        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-inner">
          <svg width={CANVAS_SIZE} height={CANVAS_SIZE}>
             {/* Transformed Grid Points */}
             {points.map((p, idx) => {
               const tp = toSvg(transform(p));
               // Only draw points that are roughly within view to keep DOM light
               if(tp.x < -50 || tp.x > CANVAS_SIZE + 50 || tp.y < -50 || tp.y > CANVAS_SIZE + 50) return null;
               
               const isAxis = p.x === 0 || p.y === 0;
               return (
                 <circle 
                  key={idx} 
                  cx={tp.x} 
                  cy={tp.y} 
                  r={isAxis ? 2 : 1.5} 
                  fill={isAxis ? "#475569" : "#cbd5e1"}
                  className="transition-all duration-500 ease-out"
                />
               );
             })}

             {/* Basis Vectors */}
             <line x1={CENTER} y1={CENTER} x2={toSvg(iHat).x} y2={toSvg(iHat).y} stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrow-blue)" className="transition-all duration-500" />
             <line x1={CENTER} y1={CENTER} x2={toSvg(jHat).x} y2={toSvg(jHat).y} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow-red)" className="transition-all duration-500" />

             <defs>
              <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" /></marker>
              <marker id="arrow-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" /></marker>
            </defs>
          </svg>
          <div className="absolute top-2 right-2 bg-white/80 p-2 rounded text-xs font-mono">
            Determinante: <span className={det === 0 ? "text-red-500 font-bold" : "text-slate-700"}>{det.toFixed(2)}</span>
            {det === 0 && <span className="block text-red-500 text-[10px]">Colapso dimensional</span>}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="font-semibold text-slate-700 mb-4">Matriz de Transformación</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-100 rounded-lg max-w-[200px] mx-auto border border-slate-300">
             <input type="number" value={matrix.a} onChange={(e) => updateMatrix('a', e.target.value)} className="w-full p-2 text-center rounded font-mono font-bold text-slate-700 border-transparent focus:border-indigo-500 focus:ring-0" step="0.1" />
             <input type="number" value={matrix.b} onChange={(e) => updateMatrix('b', e.target.value)} className="w-full p-2 text-center rounded font-mono font-bold text-slate-700 border-transparent focus:border-indigo-500 focus:ring-0" step="0.1" />
             <input type="number" value={matrix.c} onChange={(e) => updateMatrix('c', e.target.value)} className="w-full p-2 text-center rounded font-mono font-bold text-slate-700 border-transparent focus:border-indigo-500 focus:ring-0" step="0.1" />
             <input type="number" value={matrix.d} onChange={(e) => updateMatrix('d', e.target.value)} className="w-full p-2 text-center rounded font-mono font-bold text-slate-700 border-transparent focus:border-indigo-500 focus:ring-0" step="0.1" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={setIdentity} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition">Identidad</button>
            <button onClick={setRotation90} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition">Rotación 90°</button>
            <button onClick={setShearX} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition">Cizalla (Shear)</button>
            <button onClick={setScaling} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition">Escalado 2x</button>
          </div>
        </div>

        <div 
          className="bg-amber-50 p-4 rounded-lg border border-amber-200 cursor-help"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <h4 className="font-semibold text-amber-900 text-sm mb-2 flex items-center gap-2">
            🧠 Teoría Cognitiva
            {hovered && <span className="text-[10px] bg-amber-200 px-1 rounded">Expandida</span>}
          </h4>
          <p className="text-xs text-amber-800">
            Al manipular los números y ver la deformación instantánea, tu cerebro mapea el concepto abstracto de "transformación lineal" a una experiencia visual concreta. No necesitas calcular $Ax = b$ mentalmente; el software extiende tu capacidad de procesamiento.
          </p>
        </div>
      </div>
    </div>
  );
};