import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface EigenvectorsLevelProps {
    onPrevLevel?: () => void;
}

interface Matrix2x2 { a: number; b: number; c: number; d: number; }
interface Vector2 { x: number; y: number; }

// Presets with pre-calculated eigen info for teaching purposes
const PRESETS = [
    {
        id: 'SCALE_X',
        name: 'ESTIRAMIENTO X',
        matrix: { a: 2, b: 0, c: 0, d: 1 },
        eigenLines: [{ x: 1, y: 0 }, { x: 0, y: 1 }], // X axis and Y axis
        desc: "El eje X se estira (λ=2). El eje Y no cambia (λ=1)."
    },
    {
        id: 'SCALE_UNIFORM',
        name: 'ESCALADO UNIFORME',
        matrix: { a: 2, b: 0, c: 0, d: 2 },
        eigenLines: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], // Technically all vectors are eigenvectors
        desc: "Todos los vectores son Eigenvectors. Todo se escala igual (λ=2)."
    },
    {
        id: 'SHEAR',
        name: 'CIZALLA (SHEAR)',
        matrix: { a: 1, b: 1, c: 0, d: 1 },
        eigenLines: [{ x: 1, y: 0 }], // Only X axis is stable
        desc: "Solo el eje X sobrevive a la deformación (λ=1). Los demás rotan."
    },
    {
        id: 'DIAGONAL',
        name: 'ESTIRAMIENTO DIAG.',
        matrix: { a: 2, b: 1, c: 1, d: 2 },
        eigenLines: [{ x: 1, y: 1 }, { x: -1, y: 1 }],
        desc: "Estiramiento a lo largo de y=x (λ=3) y y=-x (λ=1)."
    }
];

export const EigenvectorsLevel: React.FC<EigenvectorsLevelProps> = ({ onPrevLevel }) => {
  // State
  const [currentPreset, setCurrentPreset] = useState(PRESETS[0]);
  const [t, setT] = useState(0); // Time/Progress of transformation (0 to 1)
  const [isPlaying, setIsPlaying] = useState(false);
  
  // A probe vector set by the user at t=0
  const [probeBase, setProbeBase] = useState<Vector2>({ x: 1, y: 2 });

  // View State
  const [scale, setScale] = useState(40);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'PROBE' | 'PAN' | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Math Helpers
  const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;
  
  // Calculate Matrix at current time t (Interpolate between Identity and Target)
  const currentMatrix: Matrix2x2 = {
      a: lerp(1, currentPreset.matrix.a, t),
      b: lerp(0, currentPreset.matrix.b, t),
      c: lerp(0, currentPreset.matrix.c, t),
      d: lerp(1, currentPreset.matrix.d, t)
  };

  const transform = (v: Vector2, m: Matrix2x2): Vector2 => ({
      x: m.a * v.x + m.b * v.y,
      y: m.c * v.x + m.d * v.y
  });

  // Calculate probe position at current t
  const currentProbe = transform(probeBase, currentMatrix);

  // Animation Loop
  useEffect(() => {
      let raf: number;
      if (isPlaying) {
          const loop = () => {
              setT(prev => {
                  if (prev >= 1) {
                      setIsPlaying(false);
                      return 1;
                  }
                  return prev + 0.01;
              });
              raf = requestAnimationFrame(loop);
          };
          loop();
      }
      return () => cancelAnimationFrame(raf);
  }, [isPlaying]);


  // Rendering
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

      // 1. Draw Static Eigen Lines (The "Tracks")
      // These show the infinite span where eigenvectors SHOULD live
      const far = 100;
      currentPreset.eigenLines.forEach(dir => {
          ctx.beginPath();
          ctx.moveTo(cx - dir.x * far * scale, cy + dir.y * far * scale);
          ctx.lineTo(cx + dir.x * far * scale, cy - dir.y * far * scale);
          ctx.strokeStyle = 'rgba(74, 222, 128, 0.2)'; // Green low opacity
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 10]);
          ctx.stroke();
          ctx.setLineDash([]);
      });

      // 2. Draw Transformed Grid
      const drawGridLine = (p1: Vector2, p2: Vector2, color: string) => {
          const t1 = transform(p1, currentMatrix);
          const t2 = transform(p2, currentMatrix);
          ctx.beginPath();
          ctx.moveTo(cx + t1.x * scale, cy - t1.y * scale);
          ctx.lineTo(cx + t2.x * scale, cy - t2.y * scale);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
      };

      const G = 10;
      for(let i=-G; i<=G; i++) {
          // Vertical lines (transforming)
          drawGridLine({x: i, y: -G}, {x: i, y: G}, '#1e293b');
          // Horizontal lines (transforming)
          drawGridLine({x: -G, y: i}, {x: G, y: i}, '#1e293b');
      }
      
      // Axes (transforming)
      drawGridLine({x:0, y:-G}, {x:0, y:G}, '#475569');
      drawGridLine({x:-G, y:0}, {x:G, y:0}, '#475569');

      // 3. Draw Vectors
      const drawVec = (v: Vector2, color: string, label: string, glow: boolean = false) => {
          const ex = cx + v.x * scale;
          const ey = cy - v.y * scale;
          
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
          ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
          
          // Head
          ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
          
          if(glow) {
              ctx.shadowColor = color; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;
          }
          if(label) {
              ctx.fillStyle = color; ctx.font = 'bold 12px monospace'; ctx.fillText(label, ex+10, ey);
          }
          return {x: ex, y: ey};
      };

      // Draw "True" Eigenvectors (visual guides on the lines)
      currentPreset.eigenLines.forEach((dir, i) => {
          // We calculate their position based on current t
          const pos = transform(dir, currentMatrix);
          drawVec(pos, '#4ade80', t > 0.9 ? `λv${i}` : '', true); // Green glowing
      });

      // Draw User Probe
      // Check if probe aligns with any eigen line
      let isAligned = false;
      currentPreset.eigenLines.forEach(line => {
          const cross = probeBase.x * line.y - probeBase.y * line.x;
          if (Math.abs(cross) < 0.1) isAligned = true;
      });

      const probeTip = drawVec(currentProbe, isAligned ? '#fbbf24' : '#f472b6', 'v', isAligned); // Yellow if eigen, Pink if not

      // Draw ghost of initial position if t > 0
      if (t > 0) {
          const startX = cx + probeBase.x * scale;
          const startY = cy - probeBase.y * scale;
          ctx.beginPath(); ctx.arc(startX, startY, 3, 0, Math.PI*2); 
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
          // Dotted line path
          ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(probeTip.x, probeTip.y);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([2,4]); ctx.stroke(); ctx.setLineDash([]);
      }

  }, [currentPreset, t, currentMatrix, probeBase, scale, pan]);

  // Boilerplate Event Listeners
  useEffect(() => {
      const handleResize = () => { if(canvasRef.current && containerRef.current) {
          canvasRef.current.width = containerRef.current.clientWidth;
          canvasRef.current.height = containerRef.current.clientHeight;
          draw();
      }};
      window.addEventListener('resize', handleResize); handleResize();
      return () => window.removeEventListener('resize', handleResize);
  }, [draw]);
  
  useEffect(() => draw(), [draw]);

  // Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;
      const cx = w/2 + pan.x;
      const cy = h/2 + pan.y;

      // Check probe tip (hit test against CURRENT position)
      const tX = cx + currentProbe.x * scale;
      const tY = cy - currentProbe.y * scale;

      if (Math.hypot(mx - tX, my - tY) < 20) {
          // Only allow dragging if t is close to 0, otherwise reset t
          if (t > 0.1) setT(0);
          setDragging('PROBE');
      } else {
          setDragging('PAN');
      }
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      if (dragging === 'PAN') {
          setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      } else {
          // Update Base Vector
          // Logic: Mouse moves current tip -> Inverse transform to find base? 
          // Simplification: Dragging resets T to 0, so we just set base directly.
          if (t > 0) setT(0); 
          setProbeBase(prev => ({
              x: prev.x + dx / scale,
              y: prev.y - dy / scale
          }));
      }
  };

  const handleMouseUp = () => setDragging(null);
  const handleWheel = (e: React.WheelEvent) => {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(prev => Math.max(10, Math.min(200, prev * zoomFactor)));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-crosshair" 
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        <DraggableWindow title="VISUALIZADOR DE EIGENVECTORS" initialPosition={{x: 20, y: 20}} width="w-80">
            <div className="space-y-4">
                
                {/* Timeline Control */}
                <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-400 font-bold">TRANSFORMACIÓN (t)</span>
                        <span className="text-xs font-mono text-cyan-400">{(t * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={t} 
                        onChange={(e) => setT(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex gap-2 mt-3">
                        <button 
                            onClick={() => { setT(0); setIsPlaying(true); }}
                            className={`flex-1 py-1 rounded text-xs font-bold border ${isPlaying ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}`}
                        >
                            ▶ ANIMAR
                        </button>
                        <button 
                            onClick={() => { setIsPlaying(false); setT(0); }}
                            className="px-3 py-1 rounded text-xs font-bold bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        >
                            ↺
                        </button>
                    </div>
                </div>

                {/* Preset Selector */}
                <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold">SELECCIONAR MATRIZ</span>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => { setCurrentPreset(p); setT(0); }}
                                className={`p-2 text-[9px] rounded border transition-all ${currentPreset.id === p.id 
                                    ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Legend / Info */}
                <div className="text-xs space-y-2 border-t border-slate-700 pt-3">
                    <p className="text-slate-300 italic leading-relaxed">
                        {currentPreset.desc}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                        <span className="text-slate-400 text-[10px]">Eigenvector (No rota, solo escala)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                        <span className="text-slate-400 text-[10px]">Vector Normal (Es empujado fuera de su línea)</span>
                    </div>
                </div>
            </div>
        </DraggableWindow>

        <DraggableWindow title="TU VECTOR (v)" initialPosition={{x: 20, y: 550}} width="w-60">
             <div className="text-center">
                 <p className="text-[10px] text-slate-400 mb-2">
                     Arrastra el vector rosa. Si lo colocas sobre la línea punteada verde, ¡se convierte en amarillo!
                 </p>
                 <div className="font-mono text-white bg-slate-800 rounded p-1 inline-block px-3">
                     v = [{probeBase.x.toFixed(1)}, {probeBase.y.toFixed(1)}]
                 </div>
             </div>
        </DraggableWindow>

        {/* Legend Window - NEW */}
        <DraggableWindow title="GUÍA TEÓRICA: EIGENVECTORS" initialPosition={{x: 350, y: 500}} width="w-80">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">Concepto:</p>
                <p>Durante una transformación lineal, la mayoría de los vectores son "empujados" fuera de su línea original. Los <span className="text-green-400">Eigenvectors</span> son los únicos que permanecen en su propio eje.</p>
                <p className="text-white font-bold mt-2">Observa:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li>Arrastra el vector rosa hasta que coincida con las líneas punteadas verdes.</li>
                    <li>Cuando coincide, se vuelve <strong className="text-yellow-400">amarillo</strong>: ¡Encontraste un Eigenvector!</li>
                    <li>Fíjate que solo se estira o encoge, pero no gira.</li>
                </ul>
            </div>
        </DraggableWindow>

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
                        <span className="block text-xs text-cyan-400 font-bold">COMPOSICIÓN</span>
                    </div>
                </button>
            )}
        </div>
    </div>
  );
};