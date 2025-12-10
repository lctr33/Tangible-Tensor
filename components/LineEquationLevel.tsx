import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface LineEquationLevelProps {
    onNextLevel?: () => void;
    onPrevLevel?: () => void;
}

interface Vector3 { x: number; y: number; z: number; }

// Rotation Helpers
const rotateX = (v: Vector3, angle: number): Vector3 => ({
  x: v.x,
  y: v.y * Math.cos(angle) - v.z * Math.sin(angle),
  z: v.y * Math.sin(angle) + v.z * Math.cos(angle)
});

const rotateY = (v: Vector3, angle: number): Vector3 => ({
  x: v.x * Math.cos(angle) + v.z * Math.sin(angle),
  y: v.y,
  z: -v.x * Math.sin(angle) + v.z * Math.cos(angle)
});

export const LineEquationLevel: React.FC<LineEquationLevelProps> = ({ onNextLevel, onPrevLevel }) => {
  // State
  const [pointP, setPointP] = useState<Vector3>({ x: -2, y: -1, z: 0 }); // Starting point
  const [dirV, setDirV] = useState<Vector3>({ x: 1, y: 1, z: 0 });     // Direction
  const [t, setT] = useState<number>(0);                               // Parameter
  
  // View State
  const [is3D, setIs3D] = useState(false);
  const [cameraAngle, setCameraAngle] = useState({ x: -0.3, y: 0.5 });
  const [scale, setScale] = useState(40);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction
  const [dragging, setDragging] = useState<'P' | 'V' | 'ORBIT' | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Math: L(t) = P + t*v
  const currentPoint = {
      x: pointP.x + t * dirV.x,
      y: pointP.y + t * dirV.y,
      z: pointP.z + t * dirV.z
  };

  // Projection Logic
  const project = useCallback((v: Vector3, width: number, height: number): { x: number, y: number, z: number } => {
    let p = { ...v };
    if (is3D) {
      p = rotateY(p, cameraAngle.y);
      p = rotateX(p, cameraAngle.x);
    } else {
      p = { x: v.x, y: v.y, z: 0 };
    }
    return {
      x: width / 2 + pan.x + (p.x * scale),
      y: height / 2 + pan.y - (p.y * scale),
      z: p.z
    };
  }, [is3D, cameraAngle, scale, pan]);

  // Drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // --- Grid ---
    ctx.lineWidth = 1;
    const gridSize = 20;
    const drawLine = (start: Vector3, end: Vector3, color: string, dashed = false) => {
        const p1 = project(start, w, h);
        const p2 = project(end, w, h);
        if ((p1.x < -100 && p2.x < -100) || (p1.x > w + 100 && p2.x > w + 100)) return;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        if (dashed) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    // Draw Grid Floor
    if (is3D) {
       for (let i = -gridSize; i <= gridSize; i+=2) {
         drawLine({ x: i, y: 0, z: -gridSize }, { x: i, y: 0, z: gridSize }, '#1e293b');
         drawLine({ x: -gridSize, y: 0, z: i }, { x: gridSize, y: 0, z: i }, '#1e293b');
       }
       drawLine({ x: 0, y: -gridSize, z: 0 }, { x: 0, y: gridSize, z: 0 }, '#334155'); // Axis Y
    } else {
       for (let i = -gridSize; i <= gridSize; i++) {
         drawLine({ x: i, y: -gridSize, z: 0 }, { x: i, y: gridSize, z: 0 }, '#1e293b');
         drawLine({ x: -gridSize, y: i, z: 0 }, { x: gridSize, y: i, z: 0 }, '#1e293b');
       }
    }

    // Axes
    ctx.lineWidth = 2;
    drawLine({x:0,y:0,z:0}, {x:5,y:0,z:0}, '#ef4444');
    drawLine({x:0,y:0,z:0}, {x:0,y:5,z:0}, '#22c55e');
    if(is3D) drawLine({x:0,y:0,z:0}, {x:0,y:0,z:5}, '#3b82f6');

    // --- The Infinite Line ---
    // Calculate two points far away in both directions
    const farStart = {
        x: pointP.x - 100 * dirV.x,
        y: pointP.y - 100 * dirV.y,
        z: pointP.z - 100 * dirV.z
    };
    const farEnd = {
        x: pointP.x + 100 * dirV.x,
        y: pointP.y + 100 * dirV.y,
        z: pointP.z + 100 * dirV.z
    };
    drawLine(farStart, farEnd, 'rgba(34, 211, 238, 0.2)', false); // Faint cyan line path

    // --- Vectors ---
    const drawVector = (startPos: Vector3, endPos: Vector3, color: string, label: string) => {
        const p1 = project(startPos, w, h);
        const p2 = project(endPos, w, h);
        
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
        
        // Arrowhead
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 10 * Math.cos(angle - Math.PI / 6), p2.y - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 10 * Math.cos(angle + Math.PI / 6), p2.y - 10 * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = color; ctx.fill();

        if (label) {
            ctx.fillStyle = color; ctx.font = 'bold 12px monospace'; ctx.fillText(label, p2.x + 10, p2.y);
        }
        return p2; // Return tip screen coords
    };

    // 1. Position Vector P (Origin -> P)
    const tipP = drawVector({x:0,y:0,z:0}, pointP, '#3b82f6', 'P'); // Blue

    // 2. Direction Vector V (Placed at Origin for reference - Ghost)
    drawVector({x:0,y:0,z:0}, dirV, 'rgba(239, 68, 68, 0.3)', 'v'); // Red ghost

    // 3. Direction Vector V (Placed at P)
    // We visualize it scaled by t
    const tEndPoint = {
        x: pointP.x + t * dirV.x,
        y: pointP.y + t * dirV.y,
        z: pointP.z + t * dirV.z
    };
    
    // Draw the "active" segment P -> P + tv
    drawLine(pointP, tEndPoint, '#ef4444', false); 

    // Draw point at P + tv
    const tipT = project(tEndPoint, w, h);
    ctx.beginPath(); ctx.arc(tipT.x, tipT.y, 6, 0, Math.PI*2);
    ctx.fillStyle = '#22d3ee'; ctx.fill(); // Cyan dot
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#22d3ee'; ctx.fillText('L(t)', tipT.x+10, tipT.y-10);

    // Draw Handles
    const drawHandle = (pos: {x:number, y:number}, color: string, active: boolean) => {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, active ? 8 : 5, 0, Math.PI*2);
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = color; ctx.stroke();
    };
    drawHandle(tipP, '#3b82f6', dragging === 'P');

    // Calculate tip of V relative to P for dragging direction
    const tipVabs = { x: pointP.x + dirV.x, y: pointP.y + dirV.y, z: pointP.z + dirV.z };
    const tipVscreen = project(tipVabs, w, h);
    
    // Draw little vector P -> P+v (Unit direction reference)
    ctx.beginPath(); ctx.moveTo(tipP.x, tipP.y); ctx.lineTo(tipVscreen.x, tipVscreen.y);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke();
    drawHandle(tipVscreen, '#ef4444', dragging === 'V');

  }, [pointP, dirV, t, is3D, cameraAngle, scale, pan, dragging, project]);

  // Event Listeners
  useEffect(() => {
    const handleResize = () => { if(containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        draw();
    }};
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);
  
  useEffect(() => draw(), [draw]);

  // Interactions
  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;

      const tP = project(pointP, w, h);
      const tipVabs = { x: pointP.x + dirV.x, y: pointP.y + dirV.y, z: pointP.z + dirV.z };
      const tV = project(tipVabs, w, h);

      if (Math.hypot(mx - tP.x, my - tP.y) < 15) setDragging('P');
      else if (Math.hypot(mx - tV.x, my - tV.y) < 15) setDragging('V');
      else if (is3D) setDragging('ORBIT');
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      if (!dragging) return;

      if (dragging === 'ORBIT') {
          setCameraAngle(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
          return;
      }

      const sensitivity = 1.0 / scale;
      // Simplified drag mapping
      let moveX = dx * sensitivity;
      let moveY = -dy * sensitivity;
      let moveZ = 0;

      if (is3D) {
         // Map screen X/Y to world based on camera yaw approx
         const cosY = Math.cos(cameraAngle.y);
         const sinY = Math.sin(cameraAngle.y);
         moveX = (dx * cosY) * sensitivity;
         moveZ = (dx * sinY) * sensitivity;
      }

      if (dragging === 'P') {
          setPointP(prev => ({ x: prev.x + moveX, y: prev.y + moveY, z: prev.z + moveZ }));
      } else if (dragging === 'V') {
          // Dragging tip of V means we are changing direction relative to P
          // V_new = MousePos_World - P
          // Since we apply delta, we just add delta to V
          setDirV(prev => ({ x: prev.x + moveX, y: prev.y + moveY, z: prev.z + moveZ }));
      }
  };

  const handleMouseUp = () => setDragging(null);
  const handleWheel = (e: React.WheelEvent) => {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(prev => Math.max(10, Math.min(200, prev * zoomFactor)));
  };

  const updateVec = (setter: React.Dispatch<React.SetStateAction<Vector3>>, axis: keyof Vector3, val: string) => {
      setter(prev => ({...prev, [axis]: parseFloat(val)||0}));
  };

  // Helper Input Component with Scroll
  const VecInput = ({ v, label, color, onChange }: { v: Vector3, label: string, color: string, onChange: React.Dispatch<React.SetStateAction<Vector3>> }) => {
      const onScroll = (axis: keyof Vector3) => (e: React.WheelEvent) => {
          e.stopPropagation();
          const delta = e.deltaY > 0 ? -0.5 : 0.5;
          onChange(prev => ({...prev, [axis]: Number((prev[axis] + delta).toFixed(1))}));
      };

      return (
          <div className="flex flex-col items-center">
              <span className={`text-[10px] font-bold ${color} mb-1`}>{label}</span>
              <div className="flex flex-col gap-1">
                  <input type="number" step="0.5" className={`w-20 bg-slate-800 text-center text-xs p-1 rounded border border-slate-700 focus:border-${color.split('-')[1]}-400 outline-none ${color}`} 
                      value={v.x.toFixed(1)} onChange={e => updateVec(onChange, 'x', e.target.value)} onWheel={onScroll('x')} />
                  <input type="number" step="0.5" className={`w-20 bg-slate-800 text-center text-xs p-1 rounded border border-slate-700 focus:border-${color.split('-')[1]}-400 outline-none ${color}`} 
                      value={v.y.toFixed(1)} onChange={e => updateVec(onChange, 'y', e.target.value)} onWheel={onScroll('y')} />
                  {is3D && <input type="number" step="0.5" className={`w-20 bg-slate-800 text-center text-xs p-1 rounded border border-slate-700 focus:border-${color.split('-')[1]}-400 outline-none ${color}`} 
                      value={v.z.toFixed(1)} onChange={e => updateVec(onChange, 'z', e.target.value)} onWheel={onScroll('z')} />}
              </div>
          </div>
      );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-crosshair"
         onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel}>
         <canvas ref={canvasRef} className="block w-full h-full" />

         <DraggableWindow title="ECUACIÓN DE LA RECTA" initialPosition={{x:20, y:20}} width="w-96">
             <div className="space-y-4 px-2">
                 {/* Formula Display */}
                 <div className="flex items-center justify-center gap-2 p-3 bg-slate-950/50 rounded border border-slate-800 font-mono text-sm">
                     <span className="text-cyan-400 font-bold">L(t)</span>
                     <span className="text-slate-500">=</span>
                     <span className="text-blue-400 font-bold">P</span>
                     <span className="text-slate-500">+</span>
                     <span className="text-white font-bold">t</span>
                     <span className="text-slate-500">·</span>
                     <span className="text-red-400 font-bold">v</span>
                 </div>

                 <div className="flex justify-around items-start">
                     <VecInput v={pointP} label="PUNTO (P)" color="text-blue-400" onChange={setPointP} />
                     <div className="mt-4 text-slate-600">+</div>
                     <div className="flex flex-col items-center">
                         <span className="text-[10px] font-bold text-white mb-1">t</span>
                         <input type="number" value={t} onChange={e => setT(parseFloat(e.target.value))} className="w-12 bg-slate-800 text-center text-white text-xs p-1 rounded border border-slate-700 outline-none"/>
                     </div>
                     <div className="mt-4 text-slate-600">·</div>
                     <VecInput v={dirV} label="DIRECCIÓN (v)" color="text-red-400" onChange={setDirV} />
                 </div>
                 
                 {/* Slider for T */}
                 <div>
                     <input type="range" min="-5" max="5" step="0.1" value={t} 
                         onChange={e => setT(parseFloat(e.target.value))} 
                         onMouseDown={(e) => e.stopPropagation()}
                         onTouchStart={(e) => e.stopPropagation()}
                         className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                     <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                         <span>-5</span>
                         <span>0</span>
                         <span>+5</span>
                     </div>
                 </div>

                 {/* View Toggles */}
                 <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                     <button onClick={() => { setIs3D(false); setCameraAngle({x:0, y:0}); setPan({x:0,y:0}); }}
                         className={`flex-1 py-1 text-[10px] font-bold transition-colors ${!is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                         2D
                     </button>
                     <button onClick={() => { setIs3D(true); setCameraAngle({x: -0.3, y: 0.5}); }}
                         className={`flex-1 py-1 text-[10px] font-bold transition-colors ${is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                         3D
                     </button>
                 </div>
             </div>
         </DraggableWindow>

         {/* Legend Window - NEW */}
         <DraggableWindow title="GUÍA TEÓRICA: RECTA" initialPosition={{x: 350, y: 400}} width="w-80">
             <div className="text-xs text-slate-400 space-y-2 font-mono">
                 <p className="text-white font-bold">Concepto:</p>
                 <p>Una recta no es más que una dirección infinita que pasa por un punto específico.</p>
                 <p className="text-white font-bold mt-2">Observa:</p>
                 <ul className="list-disc pl-4 space-y-1 text-[10px]">
                     <li><strong className="text-blue-400">P (Punto):</strong> Arrástralo. Mueve toda la línea por el espacio, pero no cambia su inclinación.</li>
                     <li><strong className="text-red-400">v (Vector):</strong> Define la inclinación. Si cambias su dirección, la línea gira sobre P.</li>
                     <li><strong className="text-white">t (Parámetro):</strong> Es el "tiempo" o distancia que viajamos desde P a lo largo de v. Mueve el deslizador para ver cómo el punto cian recorre la recta.</li>
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
                        <span className="block text-xs text-cyan-400 font-bold">ESCALAR</span>
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
                        <span className="block text-xs text-cyan-400 font-bold">PRODUCTO PUNTO</span>
                    </div>
                </button>
            )}
        </div>
    </div>
  );
};