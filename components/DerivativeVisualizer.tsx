import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface DerivativeVisualizerProps {
    onNextLevel?: () => void;
    onPrevLevel?: () => void;
}

interface Point { x: number; y: number; z: number; }

// --- MATH DEFINITIONS ---
const FUNCTIONS = [
    {
        id: 'waves',
        name: 'Ondas (Sin/Cos)',
        eq: 'f(x,y) = sin(x) + cos(y)',
        dx_str: 'cos(x)',
        dy_str: '-sin(y)',
        f: (x: number, y: number) => Math.sin(x) + Math.cos(y),
        df_dx: (x: number, y: number) => Math.cos(x),
        df_dy: (x: number, y: number) => -Math.sin(y),
        range: 3.5
    },
    {
        id: 'bowl',
        name: 'Paraboloide (Copa)',
        eq: 'f(x,y) = (x² + y²) / 4',
        dx_str: 'x / 2',
        dy_str: 'y / 2',
        f: (x: number, y: number) => (x*x + y*y) / 4,
        df_dx: (x: number, y: number) => x / 2,
        df_dy: (x: number, y: number) => y / 2,
        range: 3.5
    },
    {
        id: 'saddle',
        name: 'Silla de Montar',
        eq: 'f(x,y) = (x² - y²) / 4',
        dx_str: 'x / 2',
        dy_str: '-y / 2',
        f: (x: number, y: number) => (x*x - y*y) / 4,
        df_dx: (x: number, y: number) => x / 2,
        df_dy: (x: number, y: number) => -y / 2,
        range: 3.5
    },
    {
        id: 'mult',
        name: 'Pendiente Cruzada',
        eq: 'f(x,y) = x · y / 4',
        dx_str: 'y / 4',
        dy_str: 'x / 4',
        f: (x: number, y: number) => (x * y) / 4,
        df_dx: (x: number, y: number) => y / 4,
        df_dy: (x: number, y: number) => x / 4,
        range: 3.5
    }
];

// --- 3D ENGINE HELPER ---
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
const project = (p: Point, w: number, h: number, cam: {x:number, y:number}, scale: number, pan: {x:number, y:number}) => {
    let r = rotateY(p, cam.y);
    r = rotateX(r, cam.x);
    return {
        x: w/2 + pan.x + r.x * scale,
        y: h/2 + pan.y - r.y * scale, 
        z: r.z
    };
};

// --- REUSABLE SURFACE COMPONENT ---
interface MiniSurfaceProps {
    func: (x: number, y: number) => number;
    range: number;
    position: { x: number, y: number };
    color: string;
    label: string;
    height?: number;
    showTangent?: boolean;
    tangentSlope?: number;
    tangentType?: 'X' | 'Y';
}

const MiniSurface: React.FC<MiniSurfaceProps> = ({ func, range, position, color, label, height = 150, showTangent, tangentSlope, tangentType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const zVal = func(position.x, position.y);
    
    // Fixed camera for mini views
    const cam = { x: -0.5, y: 0.5 };
    const scale = 20;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        
        // Background
        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(0,0,w,h);

        // Draw Grid
        const step = 0.5;
        ctx.lineWidth = 1;
        
        // X Lines
        for(let y = -range; y <= range; y += step) {
            ctx.beginPath();
            let first = true;
            for(let x = -range; x <= range; x += step) {
                const p = { x, y: func(x,y), z: y };
                const proj = project(p, w, h, cam, scale, {x:0, y:0});
                if (first) { ctx.moveTo(proj.x, proj.y); first = false; }
                else ctx.lineTo(proj.x, proj.y);
            }
            ctx.strokeStyle = color + '40'; // Low opacity hex
            ctx.stroke();
        }
        // Y Lines
        for(let x = -range; x <= range; x += step) {
            ctx.beginPath();
            let first = true;
            for(let y = -range; y <= range; y += step) {
                const p = { x, y: func(x,y), z: y };
                const proj = project(p, w, h, cam, scale, {x:0, y:0});
                if (first) { ctx.moveTo(proj.x, proj.y); first = false; }
                else ctx.lineTo(proj.x, proj.y);
            }
            ctx.strokeStyle = color + '40';
            ctx.stroke();
        }

        // Current Point
        const pt = { x: position.x, y: zVal, z: position.y };
        const projPt = project(pt, w, h, cam, scale, {x:0, y:0});
        
        // Drop Line
        const floorPt = { x: position.x, y: -range, z: position.y };
        const projFloor = project(floorPt, w, h, cam, scale, {x:0, y:0});
        ctx.beginPath(); ctx.moveTo(projPt.x, projPt.y); ctx.lineTo(projFloor.x, projFloor.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([]);

        // Tangent Line (if applicable)
        if (showTangent && tangentSlope !== undefined && tangentType) {
            const len = 1.0;
            let start, end;
            if (tangentType === 'X') {
                 start = { x: position.x - len, y: zVal - tangentSlope * len, z: position.y };
                 end   = { x: position.x + len, y: zVal + tangentSlope * len, z: position.y };
            } else {
                 start = { x: position.x, y: zVal - tangentSlope * len, z: position.y - len };
                 end   = { x: position.x, y: zVal + tangentSlope * len, z: position.y + len };
            }
            const pStart = project(start, w, h, cam, scale, {x:0, y:0});
            const pEnd = project(end, w, h, cam, scale, {x:0, y:0});
            ctx.beginPath(); ctx.moveTo(pStart.x, pStart.y); ctx.lineTo(pEnd.x, pEnd.y);
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Draw Dot
        ctx.beginPath(); ctx.arc(projPt.x, projPt.y, 4, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();

    }, [func, range, position, color, height, showTangent, tangentSlope, tangentType]);

    return (
        <div className="relative border border-slate-700 rounded overflow-hidden bg-slate-900">
            <canvas ref={canvasRef} width={240} height={height} className="block w-full" />
            <div className="absolute top-1 left-2 text-[9px] font-bold text-white bg-slate-900/50 px-1 rounded">
                {label}
            </div>
            <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-300">
                z = {zVal.toFixed(2)}
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
export const DerivativeVisualizer: React.FC<DerivativeVisualizerProps> = ({ onNextLevel, onPrevLevel }) => {
  // State
  const [funcIndex, setFuncIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Input coordinates
  const [showTangentX, setShowTangentX] = useState(true);
  const [showTangentY, setShowTangentY] = useState(true);
  
  const activeFunc = FUNCTIONS[funcIndex];

  // View State (Main Canvas)
  const [camera, setCamera] = useState({ x: -0.4, y: 0.5 });
  const [scale, setScale] = useState(50);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'POINT' | 'CAMERA' | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Current Values
  const zVal = activeFunc.f(position.x, position.y);
  const slopeX = activeFunc.df_dx(position.x, position.y);
  const slopeY = activeFunc.df_dy(position.x, position.y);

  // Main Draw Loop
  const drawMain = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width; 
      const h = canvas.height;

      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

      // 1. Draw Surface (Grid)
      const range = 3.5;
      const step = 0.25;
      ctx.lineWidth = 1;
      
      // We draw lines along X
      for(let y = -range; y <= range; y += step) {
          ctx.beginPath();
          let first = true;
          for(let x = -range; x <= range; x += step) {
              const p = { x, y: activeFunc.f(x,y), z: y }; 
              const proj = project(p, w, h, camera, scale, pan);
              if (first) { ctx.moveTo(proj.x, proj.y); first = false; }
              else ctx.lineTo(proj.x, proj.y);
          }
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; 
          ctx.stroke();
      }
      
      // We draw lines along Y (visual Z)
      for(let x = -range; x <= range; x += step) {
          ctx.beginPath();
          let first = true;
          for(let y = -range; y <= range; y += step) {
              const p = { x, y: activeFunc.f(x,y), z: y };
              const proj = project(p, w, h, camera, scale, pan);
              if (first) { ctx.moveTo(proj.x, proj.y); first = false; }
              else ctx.lineTo(proj.x, proj.y);
          }
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
          ctx.stroke();
      }

      // 2. Axes
      const origin = project({x:0, y:0, z:0}, w, h, camera, scale, pan);
      const xAxis = project({x:4, y:0, z:0}, w, h, camera, scale, pan);
      const yAxis = project({x:0, y:4, z:0}, w, h, camera, scale, pan); // Visual Y (Function value)
      const zAxis = project({x:0, y:0, z:4}, w, h, camera, scale, pan); // Visual Z (Input y)

      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(xAxis.x, xAxis.y); ctx.strokeStyle = '#ef4444'; ctx.lineWidth=2; ctx.stroke(); // X
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(yAxis.x, yAxis.y); ctx.strokeStyle = '#22c55e'; ctx.lineWidth=2; ctx.stroke(); // Y
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(zAxis.x, zAxis.y); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth=2; ctx.stroke(); // Z

      // 3. Current Point
      const pt3D = { x: position.x, y: zVal, z: position.y };
      const ptProj = project(pt3D, w, h, camera, scale, pan);

      // Drop Line
      const floorProj = project({x: position.x, y: -3, z: position.y}, w, h, camera, scale, pan);
      ctx.beginPath(); ctx.moveTo(ptProj.x, ptProj.y); ctx.lineTo(floorProj.x, floorProj.y);
      ctx.setLineDash([2,4]); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth=1; ctx.stroke(); ctx.setLineDash([]);

      // 4. Tangents
      const tangentLength = 1.5;

      if (showTangentX) {
          const tX_start = { x: position.x - tangentLength, y: zVal - slopeX * tangentLength, z: position.y };
          const tX_end   = { x: position.x + tangentLength, y: zVal + slopeX * tangentLength, z: position.y };
          const pStart = project(tX_start, w, h, camera, scale, pan);
          const pEnd   = project(tX_end, w, h, camera, scale, pan);
          
          ctx.beginPath(); ctx.moveTo(pStart.x, pStart.y); ctx.lineTo(pEnd.x, pEnd.y);
          ctx.strokeStyle = '#f472b6'; // Pink
          ctx.lineWidth = 4; ctx.stroke();
      }

      if (showTangentY) {
          const tY_start = { x: position.x, y: zVal - slopeY * tangentLength, z: position.y - tangentLength };
          const tY_end   = { x: position.x, y: zVal + slopeY * tangentLength, z: position.y + tangentLength };
          const pStart = project(tY_start, w, h, camera, scale, pan);
          const pEnd   = project(tY_end, w, h, camera, scale, pan);

          ctx.beginPath(); ctx.moveTo(pStart.x, pStart.y); ctx.lineTo(pEnd.x, pEnd.y);
          ctx.strokeStyle = '#22d3ee'; // Cyan
          ctx.lineWidth = 4; ctx.stroke();
      }

      // Draw Point
      ctx.beginPath(); ctx.arc(ptProj.x, ptProj.y, 6, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill(); 
      ctx.strokeStyle = '#000'; ctx.stroke();

  }, [position, zVal, slopeX, slopeY, showTangentX, showTangentY, camera, scale, pan, activeFunc]);

  // Event Loop
  useEffect(() => {
    const handleResize = () => { if(canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        drawMain();
    }};
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMain]);
  
  useEffect(() => drawMain(), [drawMain]);

  // Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;

      const ptProj = project({ x: position.x, y: zVal, z: position.y }, w, h, camera, scale, pan);
      
      if (Math.hypot(mx - ptProj.x, my - ptProj.y) < 20) {
          setDragging('POINT');
      } else {
          setDragging('CAMERA');
      }
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      if (dragging === 'CAMERA') {
          setCamera(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
      } else {
          // Drag Point Logic
          const sensitivity = 1.0 / scale;
          const cosY = Math.cos(camera.y);
          const sinY = Math.sin(camera.y);
          const dX = (dx * cosY) * sensitivity;
          const dZ = (dx * sinY) * sensitivity; 
          const dZ2 = -(dy * sensitivity); 

          setPosition(prev => ({
              x: Math.max(-3, Math.min(3, prev.x + dX)),
              y: Math.max(-3, Math.min(3, prev.y + dZ + dZ2))
          }));
      }
  };

  const handleMouseUp = () => setDragging(null);
  const handleWheel = (e: React.WheelEvent) => {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(prev => Math.max(20, Math.min(150, prev * zoomFactor)));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-crosshair" 
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* MAIN CONTROLS */}
        <DraggableWindow title="DERIVADA PARCIAL" initialPosition={{x: 20, y: 20}} width="w-80">
            <div className="space-y-4">
                {/* Function Selector */}
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500">FUNCIÓN f(x,y)</label>
                    <div className="relative">
                        <select 
                            value={funcIndex} 
                            onChange={(e) => { setFuncIndex(parseInt(e.target.value)); setPosition({x:0, y:0}); }}
                            className="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-700 outline-none appearance-none cursor-pointer hover:border-cyan-400 transition-colors"
                        >
                            {FUNCTIONS.map((func, i) => (
                                <option key={func.id} value={i}>{func.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                </div>

                {/* Main Math Display */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2 font-serif">
                    <div className="text-center border-b border-slate-800 pb-2">
                         <span className="text-slate-400 text-xs italic">{activeFunc.eq}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="flex flex-col items-center">
                            <div className="text-[10px] text-pink-400 font-bold font-sans mb-1">PARCIAL X</div>
                            <div className="text-white text-sm italic">∂f/∂x = {activeFunc.dx_str}</div>
                        </div>
                        <div className="flex flex-col items-center border-l border-slate-800">
                            <div className="text-[10px] text-cyan-400 font-bold font-sans mb-1">PARCIAL Y</div>
                            <div className="text-white text-sm italic">∂f/∂y = {activeFunc.dy_str}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-2 rounded border border-slate-700 bg-slate-800 ${showTangentX ? 'border-pink-500/50' : ''}`}>
                         <label className="flex items-center gap-2 mb-2 cursor-pointer">
                             <input type="checkbox" checked={showTangentX} onChange={e => setShowTangentX(e.target.checked)} className="accent-pink-500" />
                             <span className="text-[10px] font-bold text-pink-400">VER TANGENTE X</span>
                         </label>
                         <div className="text-right text-[9px] text-slate-400 mt-1">x = {position.x.toFixed(1)}</div>
                    </div>
                    <div className={`p-2 rounded border border-slate-700 bg-slate-800 ${showTangentY ? 'border-cyan-500/50' : ''}`}>
                         <label className="flex items-center gap-2 mb-2 cursor-pointer">
                             <input type="checkbox" checked={showTangentY} onChange={e => setShowTangentY(e.target.checked)} className="accent-cyan-400" />
                             <span className="text-[10px] font-bold text-cyan-400">VER TANGENTE Y</span>
                         </label>
                         <div className="text-right text-[9px] text-slate-400 mt-1">y = {position.y.toFixed(1)}</div>
                    </div>
                </div>
            </div>
        </DraggableWindow>

        {/* ANALYSIS WINDOW (THE NEW REQUEST) */}
        <DraggableWindow title="ANÁLISIS DE PENDIENTES" initialPosition={{x: 20, y: 350}} width="w-80">
            <div className="space-y-3">
                <p className="text-[9px] text-slate-500 leading-tight">
                    Las gráficas de abajo muestran el valor de la derivada en cada punto.
                    La <strong className="text-white">ALTURA</strong> en estas gráficas corresponde a la <strong className="text-white">INCLINACIÓN</strong> en la gráfica principal.
                </p>

                {/* GRAPH FOR PARTIAL X */}
                <div className="space-y-1">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-pink-400">DERIVADA EN X (∂f/∂x)</span>
                        <span className="text-xs font-mono text-white bg-pink-900/50 px-1 rounded">{slopeX.toFixed(2)}</span>
                    </div>
                    <MiniSurface 
                        func={activeFunc.df_dx} 
                        range={activeFunc.range} 
                        position={position} 
                        color="#f472b6" 
                        label="∂f/∂x Graph"
                        height={100}
                    />
                </div>

                {/* GRAPH FOR PARTIAL Y */}
                <div className="space-y-1 pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-cyan-400">DERIVADA EN Y (∂f/∂y)</span>
                        <span className="text-xs font-mono text-white bg-cyan-900/50 px-1 rounded">{slopeY.toFixed(2)}</span>
                    </div>
                    <MiniSurface 
                        func={activeFunc.df_dy} 
                        range={activeFunc.range} 
                        position={position} 
                        color="#22d3ee" 
                        label="∂f/∂y Graph"
                        height={100}
                    />
                </div>
            </div>
        </DraggableWindow>

        {/* Theoretical Guide */}
        <DraggableWindow title="GUÍA TEÓRICA: DERIVADAS" initialPosition={{x: 350, y: 500}} width="w-96">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">Relación Función - Derivada</p>
                <p>Mueve el punto en la gráfica principal:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li>Si la <strong className="text-pink-400">tangente rosa</strong> apunta hacia arriba, el punto en la <strong className="text-pink-400">gráfica de abajo</strong> estará ALTO (positivo).</li>
                    <li>Si la tangente apunta hacia abajo, el punto en la gráfica de derivada estará BAJO (negativo).</li>
                    <li>Si estás en una cima o valle, la derivada cruza CERO (altura media).</li>
                </ul>
            </div>
        </DraggableWindow>

        {/* Nav */}
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
                        <span className="block text-xs text-pink-500 font-bold">INTEGRAL DOBLE</span>
                    </div>
                </button>
            )}
        </div>
        
        {onPrevLevel && (
             <div className="absolute bottom-4 left-4 z-50">
                 <button onClick={onPrevLevel} className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-500 text-xs hover:text-white rounded-full">
                     ◀ MENÚ
                 </button>
             </div>
        )}
    </div>
  );
};
