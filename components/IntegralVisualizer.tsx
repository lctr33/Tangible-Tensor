import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface IntegralVisualizerProps {
    onNextLevel?: () => void;
    onPrevLevel?: () => void;
}

interface Point { x: number; y: number; z: number; }

// Rotation Helpers
const rotateX = (p: Point, angle: number): Point => ({
    x: p.x,
    y: p.y * Math.cos(angle) - p.z * Math.sin(angle),
    z: p.y * Math.sin(angle) + p.z * Math.cos(angle)
});
const rotateY = (p: Point, angle: number): Point => ({
    x: p.x * Math.cos(angle) + p.z * Math.sin(angle),
    y: p.y,
    z: -p.x * Math.sin(angle) + p.z * Math.cos(angle)
});

// --- MATH DEFINITIONS ---
const FUNCTIONS = [
    {
        name: 'Paraboloide',
        eq: 'z = 1 + (x² + y²)/8',
        f: (x: number, y: number) => 1 + (x*x + y*y) / 8,
        range: 3
    },
    {
        name: 'Plano Inclinado',
        eq: 'z = 2 + 0.3x + 0.3y',
        f: (x: number, y: number) => 2 + 0.3*x + 0.3*y,
        range: 3
    },
    {
        name: 'Ondas (Sin)',
        eq: 'z = 2 + sin(x)·cos(y)',
        f: (x: number, y: number) => 2 + Math.sin(x) * Math.cos(y),
        range: 3
    }
];

export const IntegralVisualizer: React.FC<IntegralVisualizerProps> = ({ onNextLevel, onPrevLevel }) => {
  const [resolution, setResolution] = useState(6); // Grid subdivisions
  const [funcIndex, setFuncIndex] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [showSample, setShowSample] = useState(true); // Show a specific "dA" element
  
  // View State
  const [camera, setCamera] = useState({ x: -0.5, y: 0.6 });
  const [scale, setScale] = useState(45);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'ORBIT' | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  const activeFunc = FUNCTIONS[funcIndex];

  // Derived Values for Math Display
  const range = activeFunc.range; // -3 to 3
  const totalWidth = range * 2;   // 6
  const dx = totalWidth / resolution;
  const dy = totalWidth / resolution;
  const dA = dx * dy;

  // Projection
  const project = useCallback((p: Point, w: number, h: number) => {
      let r = rotateY(p, camera.y);
      r = rotateX(r, camera.x);
      return {
          x: w/2 + pan.x + r.x * scale,
          y: h/2 + pan.y - r.y * scale, 
          z: r.z
      };
  }, [camera, scale, pan]);

  // Draw Loop
  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width; 
      const h = canvas.height;

      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

      const step = (range * 2) / resolution;
      
      let vol = 0;
      
      // Store prisms to draw them sorted by Z (Painter's Algorithm)
      const prisms: {
          centerZ: number, 
          isSample: boolean,
          draw: () => void
      }[] = [];

      // Determine center index for "Sample Prism" highlight
      // We want the prism closest to (0,0)
      const sampleThreshold = step / 1.5;

      // Loop through grid
      for(let x = -range; x < range; x += step) {
          for(let y = -range; y < range; y += step) {
              // Midpoint Riemann Sum
              const midX = x + step/2;
              const midY = y + step/2;
              const height = activeFunc.f(midX, midY);
              
              if(height <= 0) continue; 

              vol += height * (step * step);

              const isSample = showSample && Math.abs(midX) < sampleThreshold && Math.abs(midY) < sampleThreshold;

              const corners = [
                  {x: x, y: 0, z: y},           
                  {x: x+step, y: 0, z: y},      
                  {x: x+step, y: 0, z: y+step}, 
                  {x: x, y: 0, z: y+step},      
                  {x: x, y: height, z: y},           
                  {x: x+step, y: height, z: y},      
                  {x: x+step, y: height, z: y+step}, 
                  {x: x, y: height, z: y+step},      
              ];

              const projCorners = corners.map(p => project(p, w, h));
              const avgZ = projCorners.reduce((acc, p) => acc + p.z, 0) / 8;

              // Color Logic
              let fillStyle, strokeStyle;
              
              if (isSample) {
                  // The "Sample" is bright yellow
                  fillStyle = `rgba(250, 204, 21, 0.9)`;
                  strokeStyle = `rgba(255, 255, 255, 1)`;
              } else {
                  // Regular Heatmap
                  const hue = Math.max(0, Math.min(240, 240 - (height * 60))); 
                  fillStyle = `hsla(${hue}, 70%, 50%, 0.7)`;
                  strokeStyle = `hsla(${hue}, 80%, 30%, 0.3)`;
              }

              prisms.push({
                  centerZ: avgZ,
                  isSample,
                  draw: () => {
                      ctx.strokeStyle = strokeStyle;
                      ctx.fillStyle = fillStyle;
                      ctx.lineWidth = isSample ? 2 : 1;

                      // Top Face
                      ctx.beginPath();
                      ctx.moveTo(projCorners[4].x, projCorners[4].y);
                      ctx.lineTo(projCorners[5].x, projCorners[5].y);
                      ctx.lineTo(projCorners[6].x, projCorners[6].y);
                      ctx.lineTo(projCorners[7].x, projCorners[7].y);
                      ctx.closePath();
                      ctx.fill();
                      ctx.stroke();

                      // Vertical Pillars (Simplified wireframe look for density)
                      // Only draw verticals if resolution is low OR if it's the sample
                      if (resolution < 20 || isSample) {
                          ctx.beginPath();
                          ctx.moveTo(projCorners[0].x, projCorners[0].y); ctx.lineTo(projCorners[4].x, projCorners[4].y);
                          ctx.moveTo(projCorners[1].x, projCorners[1].y); ctx.lineTo(projCorners[5].x, projCorners[5].y);
                          ctx.moveTo(projCorners[2].x, projCorners[2].y); ctx.lineTo(projCorners[6].x, projCorners[6].y);
                          ctx.moveTo(projCorners[3].x, projCorners[3].y); ctx.lineTo(projCorners[7].x, projCorners[7].y);
                          ctx.stroke();
                      }
                      
                      // Highlight label for sample
                      if(isSample) {
                          ctx.fillStyle = '#fff';
                          ctx.font = 'bold 12px monospace';
                          ctx.fillText("dV", projCorners[6].x + 5, projCorners[6].y);
                      }
                  }
              });
          }
      }

      setTotalVolume(vol);

      // Sort back to front
      prisms.sort((a, b) => b.centerZ - a.centerZ);
      prisms.forEach(p => p.draw());

      // Draw Axes Overlay
      const origin = project({x:0,y:0,z:0}, w, h);
      const xAxis = project({x:4,y:0,z:0}, w, h);
      const yAxis = project({x:0,y:4,z:0}, w, h); // Height
      const zAxis = project({x:0,y:0,z:4}, w, h);

      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(xAxis.x, xAxis.y); ctx.strokeStyle='#ef4444'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(yAxis.x, yAxis.y); ctx.strokeStyle='#22c55e'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(zAxis.x, zAxis.y); ctx.strokeStyle='#3b82f6'; ctx.stroke();

  }, [resolution, activeFunc, camera, scale, pan, project, showSample]);

  // Events
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
    setDragging('ORBIT');
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setCamera(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
  };
  const handleMouseUp = () => setDragging(null);
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => Math.max(20, Math.min(150, prev * zoomFactor)));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-move" 
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Main Controls */}
        <DraggableWindow title="INTEGRAL DOBLE (SUMA DE RIEMANN)" initialPosition={{x: 20, y: 20}} width="w-80">
            <div className="space-y-4">
                {/* Function Selector */}
                <div className="space-y-1">
                     <label className="text-[9px] font-bold text-slate-500">SUPERFICIE f(x,y)</label>
                     <select 
                        value={funcIndex} 
                        onChange={(e) => setFuncIndex(parseInt(e.target.value))}
                        className="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-700 outline-none hover:border-cyan-400"
                    >
                        {FUNCTIONS.map((func, i) => (
                            <option key={i} value={i}>{func.name}</option>
                        ))}
                    </select>
                </div>

                {/* Resolution Control */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>RESOLUCIÓN (Cantidad de Prismas)</span>
                        <span className="text-cyan-400">{resolution} x {resolution}</span>
                    </div>
                    <input 
                        type="range" min="2" max="50" step="1" 
                        value={resolution} 
                        onChange={(e) => setResolution(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                        <span>Baja (Bloques)</span>
                        <span>Alta (Suave)</span>
                    </div>
                </div>

                {/* Math Display */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center space-y-2">
                    <div className="text-slate-500 text-[10px] font-mono mb-1">VOLUMEN APROXIMADO</div>
                    <div className="text-3xl text-white font-bold pixel-font">
                        {totalVolume.toFixed(2)} u³
                    </div>
                    <div className="text-[9px] text-slate-500 italic border-t border-slate-800 pt-1 mt-2">
                        {activeFunc.eq}
                    </div>
                </div>

                {/* Visual Options */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                    <input type="checkbox" checked={showSample} onChange={e => setShowSample(e.target.checked)} className="accent-yellow-400" />
                    <span className="text-[10px] text-yellow-400 font-bold">RESALTAR ELEMENTO (dV)</span>
                </div>
            </div>
        </DraggableWindow>

        {/* MATH BREAKDOWN WINDOW */}
        <DraggableWindow title="TU CUADERNO vs REALIDAD" initialPosition={{x: 20, y: 380}} width="w-80">
            <div className="space-y-3 font-mono text-xs">
                
                {/* 1. Integral to Sum */}
                <div className="bg-slate-800 p-2 rounded border-l-2 border-cyan-400">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-400">Notación Integral</span>
                        <span className="text-white">∫∫ f(x,y) dA</span>
                    </div>
                    <div className="text-center text-slate-500 text-lg">↓</div>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-slate-400">Suma Riemann</span>
                        <span className="text-cyan-300">Σ f(x,y) · Δx · Δy</span>
                    </div>
                </div>

                {/* 2. Variables Breakdown */}
                <div className="space-y-1 pt-2">
                    <p className="text-[10px] text-slate-500 font-sans">
                        Al dividir el espacio de -3 a 3 en <span className="text-white">{resolution}</span> partes:
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-slate-900 p-2 rounded text-center">
                            <span className="block text-[9px] text-pink-400 font-bold">Δx (Ancho Base)</span>
                            <span className="text-white text-sm">{dx.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded text-center">
                            <span className="block text-[9px] text-blue-400 font-bold">Δy (Largo Base)</span>
                            <span className="text-white text-sm">{dy.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="bg-slate-950 p-2 rounded text-center border border-slate-700 mt-2">
                         <span className="block text-[9px] text-yellow-400 font-bold mb-1">ÁREA DE LA BASE (dA)</span>
                         <span className="text-slate-400 text-[10px]">{dx.toFixed(2)} × {dy.toFixed(2)} = </span>
                         <span className="text-yellow-400 text-sm font-bold ml-1">{dA.toFixed(3)} u²</span>
                    </div>
                </div>

                {/* 3. Connection to 3D */}
                {showSample && (
                    <p className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-700">
                        El prisma <span className="text-yellow-400 font-bold">AMARILLO</span> en el centro representa un solo término de tu suma.
                        <br/>
                        Volumen = Altura (f) × Base ({dA.toFixed(2)})
                    </p>
                )}
            </div>
        </DraggableWindow>

        <DraggableWindow title="GUÍA TEÓRICA: INTEGRALES" initialPosition={{x: 350, y: 500}} width="w-96">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">Interpretación Geométrica</p>
                <p>Cuando resuelves una integral doble en papel, estás calculando el volumen acumulado.</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li><strong className="text-cyan-400">Resolución Baja:</strong> Bloques grandes y toscos. El cálculo es rápido pero impreciso (verás escalones).</li>
                    <li><strong className="text-cyan-400">Resolución Alta:</strong> Los bloques se hacen finos ($\Delta x \to 0$). La superficie se vuelve suave y el volumen se acerca al valor "Real".</li>
                    <li>La integral exacta es el límite cuando tienes <strong>infinitos</strong> bloques infinitamente delgados.</li>
                </ul>
            </div>
        </DraggableWindow>

        {/* Navigation */}
        <div className="absolute bottom-4 right-4 z-50 flex gap-4">
            {onNextLevel && (
                <button 
                    onClick={onNextLevel}
                    className="group flex flex-row-reverse items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-pink-500 hover:bg-slate-800 transition-all rounded-r-full shadow-lg"
                >
                    <div className="w-8 h-8 rounded-full border border-pink-500/50 flex items-center justify-center bg-pink-900/20 group-hover:bg-pink-400/20">
                        <span className="text-pink-500 animate-pulse text-lg">➔</span>
                    </div>
                    <div className="text-left pr-2 hidden md:block">
                        <span className="block text-[9px] text-slate-500 pixel-font">SIGUIENTE NIVEL</span>
                        <span className="block text-xs text-pink-500 font-bold">DESCENSO DE GRADIENTE</span>
                    </div>
                </button>
            )}
        </div>
        
        {onPrevLevel && (
             <div className="absolute bottom-4 left-4 z-50 flex gap-4">
                <button 
                    onClick={onPrevLevel}
                    className="group flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all rounded-l-full shadow-lg"
                >
                    <div className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center bg-cyan-900/20 group-hover:bg-cyan-400/20">
                        <span className="text-cyan-400 text-lg transform rotate-180">➔</span>
                    </div>
                    <div className="text-right pl-2 hidden md:block">
                        <span className="block text-[9px] text-slate-500 pixel-font">NIVEL ANTERIOR</span>
                        <span className="block text-xs text-cyan-400 font-bold">DERIVADA</span>
                    </div>
                </button>
            </div>
        )}
    </div>
  );
};
