import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface CrossProductLevelProps {
  onNextLevel?: () => void;
  onPrevLevel?: () => void;
}

interface Vector3 { x: number; y: number; z: number; }

// Full 3D Rotation Matrix Logic
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

export const CrossProductLevel: React.FC<CrossProductLevelProps> = ({ onNextLevel, onPrevLevel }) => {
  const [vecA, setVecA] = useState<Vector3>({ x: 2, y: 0, z: 1 });
  const [vecB, setVecB] = useState<Vector3>({ x: 0, y: 2, z: 1 });
  
  // View State
  const [camera, setCamera] = useState({ x: -0.5, y: 0.5 }); // Pitch, Yaw
  const [scale, setScale] = useState(50);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'A' | 'B' | 'CAMERA' | null>(null);
  const lastMouse = useRef({x:0, y:0});

  // Calculate Cross Product
  // Cx = AyBz - AzBy
  // Cy = AzBx - AxBz
  // Cz = AxBy - AyBx
  const vecC = {
      x: vecA.y * vecB.z - vecA.z * vecB.y,
      y: vecA.z * vecB.x - vecA.x * vecB.z,
      z: vecA.x * vecB.y - vecA.y * vecB.x
  };
  const magC = Math.sqrt(vecC.x**2 + vecC.y**2 + vecC.z**2);

  const project = useCallback((v: Vector3, w: number, h: number) => {
      let p = rotateY(v, camera.y);
      p = rotateX(p, camera.x);
      return { x: w/2 + p.x * scale, y: h/2 - p.y * scale, z: p.z };
  }, [camera, scale]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

    // Axes
    const drawLine = (v1: Vector3, v2: Vector3, color: string) => {
        const p1 = project(v1, w, h); const p2 = project(v2, w, h);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color; ctx.stroke();
    };
    drawLine({x:-10,y:0,z:0}, {x:10,y:0,z:0}, '#1e293b');
    drawLine({x:0,y:-10,z:0}, {x:0,y:10,z:0}, '#1e293b');
    drawLine({x:0,y:0,z:-10}, {x:0,y:0,z:10}, '#1e293b');

    // Main Axes Highlights
    drawLine({x:0,y:0,z:0}, {x:5,y:0,z:0}, '#ef4444');
    drawLine({x:0,y:0,z:0}, {x:0,y:5,z:0}, '#22c55e');
    drawLine({x:0,y:0,z:0}, {x:0,y:0,z:5}, '#3b82f6');

    // Draw Parallelogram (Area visualization)
    const origin = project({x:0,y:0,z:0}, w, h);
    const tipA = project(vecA, w, h);
    const tipB = project(vecB, w, h);
    const sum = { x: vecA.x + vecB.x, y: vecA.y + vecB.y, z: vecA.z + vecB.z };
    const tipSum = project(sum, w, h);

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tipA.x, tipA.y);
    ctx.lineTo(tipSum.x, tipSum.y);
    ctx.lineTo(tipB.x, tipB.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.1)'; // faint yellow/gold fill
    ctx.fill();
    ctx.setLineDash([2,2]); ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; ctx.stroke(); ctx.setLineDash([]);

    // Helper draw vector
    const drawVec = (v: Vector3, color: string, label: string) => {
        const t = project(v, w, h);
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
        
        // Arrow
        const angle = Math.atan2(t.y - origin.y, t.x - origin.x);
        
        // Simple head
        ctx.beginPath(); ctx.arc(t.x, t.y, 4, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
        
        ctx.fillStyle = color; ctx.font = '12px monospace'; ctx.fillText(label, t.x+10, t.y);
        return t;
    };

    const tA = drawVec(vecA, '#3b82f6', 'A');
    const tB = drawVec(vecB, '#ef4444', 'B');
    drawVec(vecC, '#fbbf24', 'AxB'); // Gold result

    // Handles
    const drawHandle = (pos: {x:number, y:number}, color: string, active: boolean) => {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, active ? 8 : 5, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = color; ctx.stroke();
    };
    drawHandle(tA, '#3b82f6', dragging === 'A');
    drawHandle(tB, '#ef4444', dragging === 'B');

  }, [vecA, vecB, vecC, project, dragging]);

  useEffect(() => {
     const loop = () => { draw(); requestAnimationFrame(loop); };
     loop();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => { if(canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
    }};
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;

      const tA = project(vecA, w, h);
      const tB = project(vecB, w, h);

      if (Math.hypot(mx - tA.x, my - tA.y) < 20) setDragging('A');
      else if (Math.hypot(mx - tB.x, my - tB.y) < 20) setDragging('B');
      else setDragging('CAMERA');
      
      lastMouse.current = {x: e.clientX, y: e.clientY};
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = {x: e.clientX, y: e.clientY};

      if (dragging === 'CAMERA') {
          setCamera(prev => ({ x: prev.x + dy*0.01, y: prev.y + dx*0.01 }));
      } else {
          // Move Vectors
          const sensitivity = 1.0 / scale;
          // We map 2D mouse movement to 3D world movement relative to camera Yaw
          // This is an approximation for intuitive dragging
          const cosY = Math.cos(camera.y);
          const sinY = Math.sin(camera.y);
          
          const dXWorld = (dx * cosY) * sensitivity;
          const dZWorld = (dx * sinY) * sensitivity;
          const dYWorld = -(dy * sensitivity); // Screen Y is down, World Y is up

          const updater = dragging === 'A' ? setVecA : setVecB;
          updater(v => ({
              x: v.x + dXWorld,
              y: v.y + dYWorld,
              z: v.z + dZWorld
          }));
      }
  };

  const handleMouseUp = () => setDragging(null);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => Math.max(10, Math.min(200, prev * zoomFactor)));
  };

  // Helper for scrolling inputs
  const handleInputScroll = (vec: 'A' | 'B', axis: 'x' | 'y' | 'z') => (e: React.WheelEvent) => {
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      const setter = vec === 'A' ? setVecA : setVecB;
      setter(prev => ({ ...prev, [axis]: Number((prev[axis] + delta).toFixed(1)) }));
  };

  const ColumnVector = ({ 
    vec, 
    color, 
    label, 
    onChange, 
    name,
    readOnly = false
  }: { 
    vec: Vector3, 
    color: string, 
    label: string, 
    onChange?: (v: Vector3) => void,
    name?: 'A' | 'B',
    readOnly?: boolean
  }) => {
    // Tailwind color mapping
    let textColor = color; 

    const onScroll = (axis: keyof Vector3) => name && !readOnly ? handleInputScroll(name, axis) : undefined;
    
    const handleChange = (axis: keyof Vector3, val: string) => {
        if(onChange) onChange({...vec, [axis]: parseFloat(val)||0});
    };

    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-bold ${textColor} pixel-font opacity-80`}>{label}</span>
            <div className="flex items-stretch">
                <div className="w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-sm my-1"></div>
                <div className="flex flex-col gap-1 px-1 py-1">
                    <input type="number" step="0.5" value={vec.x.toFixed(1)} 
                        onChange={e => handleChange('x', e.target.value)} onWheel={onScroll('x')} readOnly={readOnly}
                        className={`w-14 bg-slate-800 text-center ${textColor} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`} 
                    />
                    <input type="number" step="0.5" value={vec.y.toFixed(1)} 
                        onChange={e => handleChange('y', e.target.value)} onWheel={onScroll('y')} readOnly={readOnly}
                        className={`w-14 bg-slate-800 text-center ${textColor} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`} 
                    />
                    <input type="number" step="0.5" value={vec.z.toFixed(1)} 
                        onChange={e => handleChange('z', e.target.value)} onWheel={onScroll('z')} readOnly={readOnly}
                        className={`w-14 bg-slate-800 text-center ${textColor} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`} 
                    />
                </div>
                <div className="w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-sm my-1"></div>
            </div>
        </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-move" 
         onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="block w-full h-full" />

        <DraggableWindow title="PRODUCTO CRUZ (CROSS)" initialPosition={{x:20, y:20}} width="w-96">
            <div className="space-y-4">
                 
                 {/* Equation with Column Vectors */}
                 <div className="flex items-center justify-center gap-2 md:gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                     <ColumnVector vec={vecA} label="A" color="text-blue-400" onChange={setVecA} name="A" />
                     <div className="text-xl text-slate-500 font-bold mt-4">×</div>
                     <ColumnVector vec={vecB} label="B" color="text-red-400" onChange={setVecB} name="B" />
                     <div className="text-xl text-slate-500 font-bold mt-4">=</div>
                     <ColumnVector vec={vecC} label="AxB" color="text-yellow-400" readOnly />
                 </div>
                 
                 <div className="flex justify-between items-center pt-2">
                     <span className="text-[9px] text-slate-500">ZOOM: {scale.toFixed(0)}</span>
                     <button onClick={() => { setCamera({x: -0.5, y: 0.5}); setScale(50); }} className="text-[9px] text-cyan-400 hover:underline">
                         RESET VIEW
                     </button>
                 </div>
            </div>
        </DraggableWindow>

        {/* Legend Window - NEW */}
        <DraggableWindow title="GUÍA TEÓRICA: PRODUCTO CRUZ" initialPosition={{x: 350, y: 400}} width="w-80">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">Concepto:</p>
                <p>El producto cruz genera un nuevo vector <strong className="text-yellow-400">AxB</strong> que es perpendicular tanto a A como a B.</p>
                
                <p className="text-white font-bold mt-2">Observa:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li>Mueve A o B: El vector amarillo gira para mantenerse siempre a 90°.</li>
                    <li><strong className="text-white">Magnitud:</strong> El largo de AxB es igual al área del paralelogramo gris (sombra).</li>
                    <li>Si A y B son paralelos, el área es 0 y el producto cruz desaparece.</li>
                </ul>

                <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                    <span>Área del Paralelogramo:</span>
                    <span className="text-yellow-400 font-bold">{magC.toFixed(2)}</span>
                </div>
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
                        <span className="block text-xs text-cyan-400 font-bold">PRODUCTO PUNTO</span>
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
                        <span className="block text-xs text-cyan-400 font-bold">TRANSFORMACIONES</span>
                    </div>
                </button>
            )}
        </div>
    </div>
  );
};