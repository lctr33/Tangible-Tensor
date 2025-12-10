import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface MatrixMultiplicationLevelProps {
    onNextLevel?: () => void;
    onPrevLevel?: () => void;
}

interface Point { x: number; y: number; }
interface Matrix2x2 { a: number; b: number; c: number; d: number; }

interface TransformationStep {
    id: string;
    name: string;
    matrix: Matrix2x2;
    color: string;
}

// Helper: Multiply two 2x2 matrices (A * B) -> Apply B first, then A
const multiply = (m1: Matrix2x2, m2: Matrix2x2): Matrix2x2 => ({
    a: m1.a * m2.a + m1.b * m2.c,
    b: m1.a * m2.b + m1.b * m2.d,
    c: m1.c * m2.a + m1.d * m2.c,
    d: m1.c * m2.b + m1.d * m2.d,
});

// Helper: Linear Interpolation between matrices
const lerpMatrix = (m1: Matrix2x2, m2: Matrix2x2, t: number): Matrix2x2 => ({
    a: m1.a + (m2.a - m1.a) * t,
    b: m1.b + (m2.b - m1.b) * t,
    c: m1.c + (m2.c - m1.c) * t,
    d: m1.d + (m2.d - m1.d) * t,
});

export const MatrixMultiplicationLevel: React.FC<MatrixMultiplicationLevelProps> = ({ onNextLevel, onPrevLevel }) => {
  // State
  const [queue, setQueue] = useState<TransformationStep[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGhost, setShowGhost] = useState(true); // Toggle for initial state ghost
  
  // Animation State
  const [currentMatrix, setCurrentMatrix] = useState<Matrix2x2>({ a: 1, b: 0, c: 0, d: 1 }); // Visual matrix
  const [stepIndex, setStepIndex] = useState(0); // Which step are we animating?
  const [progress, setProgress] = useState(0); // 0.0 to 1.0 within current step
  const [accumulatedMatrix, setAccumulatedMatrix] = useState<Matrix2x2>({ a: 1, b: 0, c: 0, d: 1 }); // Matrix BEFORE current step

  // View State
  const [scale, setScale] = useState(30);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Animation Loop
  useEffect(() => {
      let raf: number;
      if (isAnimating) {
          const loop = () => {
              setProgress(prev => {
                  const next = prev + 0.02; // Speed
                  if (next >= 1) {
                      // End of step
                      if (stepIndex < queue.length - 1) {
                          // Prepare for next step
                          // The accumulated matrix becomes the target of the finished step
                          const stepM = queue[stepIndex].matrix;
                          // Standard math: New = Step * Old (Left multiplication)
                          const newAcc = multiply(stepM, accumulatedMatrix);
                          setAccumulatedMatrix(newAcc);
                          setStepIndex(idx => idx + 1);
                          return 0; // Reset progress for next step
                      } else {
                          // All steps done
                          const lastStepM = queue[stepIndex].matrix;
                          const finalM = multiply(lastStepM, accumulatedMatrix);
                          setCurrentMatrix(finalM);
                          setIsAnimating(false);
                          return 1;
                      }
                  }
                  return next;
              });
              raf = requestAnimationFrame(loop);
          };
          loop();
      }
      return () => cancelAnimationFrame(raf);
  }, [isAnimating, stepIndex, queue, accumulatedMatrix]);

  // Update Visual Matrix based on Animation
  useEffect(() => {
     if (isAnimating && queue.length > 0) {
         // We are animating from 'accumulatedMatrix' TO 'targetMatrix'
         // Target = Step * Accumulated
         const stepM = queue[stepIndex].matrix;
         const targetM = multiply(stepM, accumulatedMatrix);
         
         // Smoothstep interpolation for nicer motion
         const t = progress * progress * (3 - 2 * progress); 
         setCurrentMatrix(lerpMatrix(accumulatedMatrix, targetM, t));
     } else if (!isAnimating && queue.length === 0) {
         setCurrentMatrix({ a: 1, b: 0, c: 0, d: 1 });
         setAccumulatedMatrix({ a: 1, b: 0, c: 0, d: 1 });
     }
  }, [progress, isAnimating, queue, stepIndex, accumulatedMatrix]);


  // --- Drawing Logic ---
  const transform = (p: Point, m: Matrix2x2) => ({
      x: m.a * p.x + m.b * p.y,
      y: m.c * p.x + m.d * p.y
  });

  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width; 
      const h = canvas.height;
      const cx = w/2 + pan.x; 
      const cy = h/2 + pan.y;

      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

      // Generic Line Drawer that accepts a Matrix
      const drawTransformedLine = (p1: Point, p2: Point, m: Matrix2x2, color: string, width = 1, dashed = false) => {
          const t1 = transform(p1, m);
          const t2 = transform(p2, m);
          ctx.beginPath();
          ctx.moveTo(cx + t1.x * scale, cy - t1.y * scale);
          ctx.lineTo(cx + t2.x * scale, cy - t2.y * scale);
          ctx.strokeStyle = color; 
          ctx.lineWidth = width; 
          if(dashed) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
          ctx.stroke();
          ctx.setLineDash([]);
      };

      const G = 15;
      const identityM = { a: 1, b: 0, c: 0, d: 1 };

      // 1. Draw GHOST Grid (Identity State)
      if (showGhost) {
          for(let i=-G; i<=G; i++) {
              if (i===0) continue;
              // Very faint, dashed lines
              drawTransformedLine({x:i, y:-G}, {x:i, y:G}, identityM, 'rgba(255, 255, 255, 0.05)', 1, true);
              drawTransformedLine({x:-G, y:i}, {x:G, y:i}, identityM, 'rgba(255, 255, 255, 0.05)', 1, true);
          }
          // Ghost Axes
          drawTransformedLine({x:0, y:-G}, {x:0, y:G}, identityM, 'rgba(255, 255, 255, 0.1)', 1, true);
          drawTransformedLine({x:-G, y:0}, {x:G, y:0}, identityM, 'rgba(255, 255, 255, 0.1)', 1, true);
      }

      // 2. Draw ACTIVE Grid (Current Transformation)
      for(let i=-G; i<=G; i++) {
        if (i===0) continue;
        drawTransformedLine({x:i, y:-G}, {x:i, y:G}, currentMatrix, '#1e293b');
        drawTransformedLine({x:-G, y:i}, {x:G, y:i}, currentMatrix, '#1e293b');
      }
      // Active Axes
      drawTransformedLine({x:0, y:-G}, {x:0, y:G}, currentMatrix, '#334155', 2);
      drawTransformedLine({x:-G, y:0}, {x:G, y:0}, currentMatrix, '#334155', 2);

      // 3. Basis Vectors
      // TRANSFORM the basis vectors using the current matrix
      const iHat = transform({x:1, y:0}, currentMatrix);
      const jHat = transform({x:0, y:1}, currentMatrix);

      const drawArrow = (v: Point, color: string, label: string) => {
          const ex = cx + v.x * scale, ey = cy - v.y * scale;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
          ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
          // Tip
          const angle = Math.atan2(ey-cy, ex-cx);
          ctx.beginPath(); ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 10*Math.cos(angle-Math.PI/6), ey - 10*Math.sin(angle-Math.PI/6));
          ctx.lineTo(ex - 10*Math.cos(angle+Math.PI/6), ey - 10*Math.sin(angle+Math.PI/6));
          ctx.fillStyle = color; ctx.fill();
          if(label) { ctx.fillStyle = color; ctx.font = 'bold 12px monospace'; ctx.fillText(label, ex+10, ey); }
      };

      // Draw the TRANSFORMED basis vectors
      drawArrow(iHat, '#ef4444', 'i');
      drawArrow(jHat, '#22c55e', 'j');

  }, [currentMatrix, scale, pan, showGhost]);

  useEffect(() => {
     const loop = () => { draw(); requestAnimationFrame(loop); };
     loop();
  }, [draw]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => { if(canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
    }};
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Interaction
  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); lastMouse.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMouse.current.x; const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => Math.max(10, Math.min(200, prev * zoomFactor)));
  };

  // --- Logic for Pipeline ---
  const addStep = (type: string) => {
      if (isAnimating) return;
      const id = Date.now().toString();
      let step: TransformationStep;

      switch(type) {
          case 'ROTATE':
             step = { id, name: 'ROTAR 90°', matrix: { a: 0, b: -1, c: 1, d: 0 }, color: 'text-yellow-400' };
             break;
          case 'SCALE':
             step = { id, name: 'ESCALAR 1.5x', matrix: { a: 1.5, b: 0, c: 0, d: 1.5 }, color: 'text-green-400' };
             break;
          case 'SHEAR':
             step = { id, name: 'CIZALLA X', matrix: { a: 1, b: 1, c: 0, d: 1 }, color: 'text-red-400' };
             break;
          case 'REFLECT':
              step = { id, name: 'REFLEJO X', matrix: { a: -1, b: 0, c: 0, d: 1 }, color: 'text-blue-400' };
              break;
          default: return;
      }
      setQueue(prev => [...prev, step]);
  };

  const removeStep = (idx: number) => {
      if (isAnimating) return;
      setQueue(prev => prev.filter((_, i) => i !== idx));
  };

  const runSequence = () => {
      if (queue.length === 0) return;
      // Reset visuals
      setCurrentMatrix({ a: 1, b: 0, c: 0, d: 1 });
      setAccumulatedMatrix({ a: 1, b: 0, c: 0, d: 1 });
      setStepIndex(0);
      setProgress(0);
      setIsAnimating(true);
  };

  const reset = () => {
      setIsAnimating(false);
      setQueue([]);
      setCurrentMatrix({ a: 1, b: 0, c: 0, d: 1 });
      setAccumulatedMatrix({ a: 1, b: 0, c: 0, d: 1 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-move" 
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Pipeline Control Window - WIDENED TO w-96 */}
        <DraggableWindow title="PIPELINE DE TRANSFORMACIÓN" initialPosition={{x:20, y:20}} width="w-96">
            <div className="space-y-4">
                <p className="text-[10px] text-slate-400">
                    Construye una secuencia. El orden importa: la última en la lista es la última en aplicarse.
                </p>

                {/* Queue Visualization */}
                <div className="bg-slate-950/50 rounded border border-slate-800 p-2 min-h-[120px] max-h-[200px] overflow-y-auto">
                    {queue.length === 0 && <div className="text-center text-slate-600 text-xs py-4 italic">Cola vacía</div>}
                    <div className="flex flex-col-reverse gap-1"> {/* Reversed to show stack order logically */}
                        {queue.map((step, idx) => (
                            <div key={step.id} className={`flex justify-between items-center p-2 rounded border border-slate-700 bg-slate-800 ${isAnimating && stepIndex === idx ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-500 font-mono">#{idx+1}</span>
                                    <span className={`text-xs font-bold ${step.color}`}>{step.name}</span>
                                </div>
                                {!isAnimating && (
                                    <button onClick={() => removeStep(idx)} className="text-slate-500 hover:text-red-400 px-2">×</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Add Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addStep('ROTATE')} disabled={isAnimating} className="px-2 py-1 bg-slate-800 border border-slate-700 hover:border-yellow-400 text-[10px] text-yellow-400 rounded disabled:opacity-50">+ ROTAR 90°</button>
                    <button onClick={() => addStep('SCALE')} disabled={isAnimating} className="px-2 py-1 bg-slate-800 border border-slate-700 hover:border-green-400 text-[10px] text-green-400 rounded disabled:opacity-50">+ ESCALAR</button>
                    <button onClick={() => addStep('SHEAR')} disabled={isAnimating} className="px-2 py-1 bg-slate-800 border border-slate-700 hover:border-red-400 text-[10px] text-red-400 rounded disabled:opacity-50">+ CIZALLA</button>
                    <button onClick={() => addStep('REFLECT')} disabled={isAnimating} className="px-2 py-1 bg-slate-800 border border-slate-700 hover:border-blue-400 text-[10px] text-blue-400 rounded disabled:opacity-50">+ REFLEJO</button>
                </div>

                {/* Main Controls */}
                <div className="flex gap-2 pt-2 border-t border-slate-700">
                    <button onClick={runSequence} disabled={isAnimating || queue.length===0} className="flex-1 py-2 bg-cyan-900/50 border border-cyan-500 text-cyan-400 font-bold text-xs rounded hover:bg-cyan-900 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isAnimating ? 'EJECUTANDO...' : '▶ EJECUTAR SECUENCIA'}
                    </button>
                    <button onClick={reset} disabled={isAnimating && queue.length > 0} className="px-3 py-2 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded hover:bg-slate-700">
                        🗑️
                    </button>
                </div>
                
                {/* View Toggles */}
                <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={showGhost} onChange={e => setShowGhost(e.target.checked)} className="accent-slate-500" />
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">MOSTRAR ESTADO INICIAL (FANTASMA)</span>
                    </label>
                </div>
            </div>
        </DraggableWindow>

        {/* Matrix Result Window */}
        <DraggableWindow title="MATRIZ RESULTANTE (TOTAL)" initialPosition={{x:20, y: 550}} width="w-auto">
             <div className="flex items-center gap-2 px-2">
                 <span className="text-xl font-serif font-bold text-slate-500 italic">M =</span>
                 <div className="flex items-stretch">
                    <div className="w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-md my-1"></div>
                    <div className="grid grid-cols-2 gap-1 p-1">
                        <div className="w-16 text-center text-xs font-bold text-white p-2 bg-slate-800 rounded">{currentMatrix.a.toFixed(1)}</div>
                        <div className="w-16 text-center text-xs font-bold text-white p-2 bg-slate-800 rounded">{currentMatrix.b.toFixed(1)}</div>
                        <div className="w-16 text-center text-xs font-bold text-white p-2 bg-slate-800 rounded">{currentMatrix.c.toFixed(1)}</div>
                        <div className="w-16 text-center text-xs font-bold text-white p-2 bg-slate-800 rounded">{currentMatrix.d.toFixed(1)}</div>
                    </div>
                    <div className="w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-md my-1"></div>
                 </div>
             </div>
        </DraggableWindow>

        {/* Legend Window - NEW */}
        <DraggableWindow title="GUÍA TEÓRICA: COMPOSICIÓN" initialPosition={{x: 350, y: 500}} width="w-80">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">Concepto:</p>
                <p>Multiplicar matrices es como aplicar funciones en cadena. El resultado de una transformación se convierte en la entrada de la siguiente.</p>
                <p className="text-white font-bold mt-2">Observa:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li><strong>El orden importa:</strong> "Rotar y luego Escalar" NO es lo mismo que "Escalar y luego Rotar". (No Conmutatividad).</li>
                    <li>Prueba crear una secuencia y luego reinicia y crea la misma en orden inverso. ¡Mira cómo cambia el resultado final!</li>
                </ul>
            </div>
        </DraggableWindow>

        {/* Navigation Controls */}
        <div className="absolute bottom-4 left-4 z-50 flex gap-4">
            {onPrevLevel && (
                <button 
                    onClick={onPrevLevel}
                    className="group flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all rounded-l-full shadow-lg"
                >
                    <div className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center bg-cyan-900/20 group-hover:bg-cyan-400/20">
                        <span className="text-cyan-400 text-lg transform rotate-180">➔</span>
                    </div>
                    <div className="text-right pl-2 hidden md:block">
                        <span className="block text-[9px] text-slate-500 pixel-font">NIVEL ANTERIOR</span>
                        <span className="block text-xs text-cyan-400 font-bold">TRANSFORMACIONES</span>
                    </div>
                </button>
            )}
        </div>

        <div className="absolute bottom-4 right-4 z-50 flex gap-4">
            {onNextLevel && (
                <button 
                    onClick={onNextLevel}
                    className="group flex flex-row-reverse items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all rounded-r-full shadow-lg"
                >
                    <div className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center bg-cyan-900/20 group-hover:bg-cyan-400/20">
                        <span className="text-cyan-400 animate-pulse text-lg">➔</span>
                    </div>
                    <div className="text-left pr-2 hidden md:block">
                        <span className="block text-[9px] text-slate-500 pixel-font">SIGUIENTE NIVEL</span>
                        <span className="block text-xs text-cyan-400 font-bold">EIGENVECTORS</span>
                    </div>
                </button>
            )}
        </div>

    </div>
  );
};