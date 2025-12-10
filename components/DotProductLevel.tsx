import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface DotProductLevelProps {
  onNextLevel?: () => void;
  onPrevLevel?: () => void;
}

interface Vector3 { x: number; y: number; z: number; }

const rotateY = (v: Vector3, angle: number): Vector3 => ({
  x: v.x * Math.cos(angle) + v.z * Math.sin(angle),
  y: v.y,
  z: -v.x * Math.sin(angle) + v.z * Math.cos(angle)
});

export const DotProductLevel: React.FC<DotProductLevelProps> = ({ onNextLevel, onPrevLevel }) => {
  const [vecA, setVecA] = useState<Vector3>({ x: 3, y: 2, z: 0 });
  const [vecB, setVecB] = useState<Vector3>({ x: 4, y: 0, z: 0 });
  const [is3D, setIs3D] = useState(false);
  const [cameraY, setCameraY] = useState(-0.3);
  
  // View State
  const [scale, setScale] = useState(40);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'A' | 'B' | 'PAN' | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Math
  const dotProduct = vecA.x * vecB.x + vecA.y * vecB.y + vecA.z * vecB.z;
  const magA = Math.sqrt(vecA.x**2 + vecA.y**2 + vecA.z**2);
  const magB = Math.sqrt(vecB.x**2 + vecB.y**2 + vecB.z**2);
  const angleRad = Math.acos(Math.min(1, Math.max(-1, dotProduct / ((magA * magB) || 1))));
  const angleDeg = angleRad * (180 / Math.PI);

  // Projection Vector P (Shadow of A onto B)
  // P = ( (A . B) / |B|^2 ) * B
  const scalarProj = dotProduct / (magB**2 || 1);
  const vecProj = { x: vecB.x * scalarProj, y: vecB.y * scalarProj, z: vecB.z * scalarProj };

  const project = useCallback((v: Vector3, width: number, height: number) => {
    let p = { ...v };
    if (is3D) p = rotateY(p, cameraY);
    
    return {
      x: width/2 + pan.x + p.x * scale,
      y: height/2 + pan.y - p.y * scale
    };
  }, [is3D, cameraY, scale, pan]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0,0,w,h);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    
    // Simple Grid Visualization
    const gridSize = 20;
    const drawLine = (start: Vector3, end: Vector3, color: string) => {
        const p1 = project(start, w, h);
        const p2 = project(end, w, h);
        // Culling simple
        if (p1.x < -100 && p2.x < -100) return;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color; ctx.stroke();
    };

    if (is3D) {
       for(let i=-gridSize; i<=gridSize; i+=2) {
           drawLine({x:i, y:0, z:-gridSize}, {x:i, y:0, z:gridSize}, '#1e293b');
           drawLine({x:-gridSize, y:0, z:i}, {x:gridSize, y:0, z:i}, '#1e293b');
       }
       drawLine({x:0, y:-10, z:0}, {x:0, y:10, z:0}, '#334155');
    } else {
       for(let i=-gridSize; i<=gridSize; i+=1) {
           drawLine({x:i, y:-gridSize, z:0}, {x:i, y:gridSize, z:0}, '#1e293b');
           drawLine({x:-gridSize, y:i, z:0}, {x:gridSize, y:i, z:0}, '#1e293b');
       }
    }
    
    // Draw Vectors helper
    const drawVec = (v: Vector3, color: string, label: string, widthLine = 3, dashed = false) => {
        const start = project({x:0,y:0,z:0}, w, h);
        const end = project(v, w, h);
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color; ctx.lineWidth = widthLine; 
        if (dashed) ctx.setLineDash([5,5]); else ctx.setLineDash([]);
        ctx.stroke(); ctx.setLineDash([]);
        
        // Arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = color; ctx.fill();

        if(label) { ctx.fillStyle = color; ctx.font = 'bold 12px monospace'; ctx.fillText(label, end.x+10, end.y); }
        return end;
    };

    // Draw Axes
    drawVec({x:5,y:0,z:0}, '#334155', '', 1);
    drawVec({x:0,y:5,z:0}, '#334155', '', 1);

    // Draw Projection (Shadow)
    drawVec(vecProj, '#c084fc', 'Proyección', 5); // Purple, Thick

    // Draw Projection Line (Dashed from A to Proj)
    const tipA = project(vecA, w, h);
    const tipProj = project(vecProj, w, h);
    ctx.beginPath(); ctx.moveTo(tipA.x, tipA.y); ctx.lineTo(tipProj.x, tipProj.y);
    ctx.setLineDash([4,4]); ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

    // Draw Main Vectors
    const tipVecB = drawVec(vecB, '#ef4444', 'B');
    const tipVecA = drawVec(vecA, '#3b82f6', 'A');

    // Handles
    const drawHandle = (pos: {x:number, y:number}, color: string, active: boolean) => {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, active ? 8 : 5, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = color; ctx.stroke();
    };
    drawHandle(tipVecA, '#3b82f6', dragging === 'A');
    drawHandle(tipVecB, '#ef4444', dragging === 'B');

  }, [vecA, vecB, vecProj, project, is3D, dragging]);

  // Event Listeners
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

  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left; 
      const my = e.clientY - rect.top;
      const w = canvasRef.current!.width; 
      const h = canvasRef.current!.height;

      const tA = project(vecA, w, h);
      const tB = project(vecB, w, h);

      if (Math.hypot(mx-tA.x, my-tA.y) < 20) setDragging('A');
      else if (Math.hypot(mx-tB.x, my-tB.y) < 20) setDragging('B');
      else {
          setDragging('PAN');
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      if (!dragging) return;

      if (dragging === 'PAN') {
          if (is3D) {
              // Orbit in 3D
              setCameraY(prev => prev + dx * 0.01);
          } else {
              // Pan in 2D
              setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          }
          return;
      }

      // Vector Dragging
      const sensitivity = 1.0 / scale;
      const vx = dx * sensitivity;
      const vy = -(dy * sensitivity);
      
      // In 3D we rotate the input based on camera for Y-axis visual consistency (simplified)
      const inputDx = is3D ? (dx * Math.cos(cameraY)) * sensitivity : vx;
      const inputDy = vy;

      if (dragging === 'A') setVecA(prev => ({...prev, x: prev.x + inputDx, y: prev.y + inputDy}));
      if (dragging === 'B') setVecB(prev => ({...prev, x: prev.x + inputDx, y: prev.y + inputDy}));
  };

  const handleMouseUp = () => setDragging(null);

  const handleWheel = (e: React.WheelEvent) => {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(prev => Math.max(10, Math.min(200, prev * zoomFactor)));
  };

  // Helper for scrolling inputs
  const handleInputScroll = (vec: 'A' | 'B', axis: 'x' | 'y' | 'z') => (e: React.WheelEvent) => {
      e.stopPropagation(); // Stop canvas zoom
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      const setter = vec === 'A' ? setVecA : setVecB;
      
      setter(prev => ({
          ...prev,
          [axis]: Number((prev[axis] + delta).toFixed(1))
      }));
  };

  // Column Vector Component
  const ColumnVector = ({ 
    vec, 
    color, 
    label, 
    onChange,
    name 
  }: { 
    vec: Vector3, 
    color: string, 
    label: string, 
    onChange: (v: Vector3) => void,
    name: 'A' | 'B'
  }) => {
    const textColor = color; 

    const onScroll = (axis: keyof Vector3) => handleInputScroll(name, axis);
    
    const handleChange = (axis: keyof Vector3, val: string) => {
        onChange({...vec, [axis]: parseFloat(val)||0});
    };

    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-bold ${textColor} pixel-font opacity-80`}>{label}</span>
            <div className="flex items-stretch">
                <div className="w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-sm my-1"></div>
                <div className="flex flex-col gap-1 px-1 py-1">
                    <input type="number" step="0.5" value={vec.x.toFixed(1)} 
                        onChange={e => handleChange('x', e.target.value)} onWheel={onScroll('x')}
                        className={`w-14 bg-slate-800 text-center ${textColor} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`} 
                    />
                    <input type="number" step="0.5" value={vec.y.toFixed(1)} 
                        onChange={e => handleChange('y', e.target.value)} onWheel={onScroll('y')}
                        className={`w-14 bg-slate-800 text-center ${textColor} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`} 
                    />
                    {is3D && (
                        <input type="number" step="0.5" value={vec.z.toFixed(1)} 
                            onChange={e => handleChange('z', e.target.value)} onWheel={onScroll('z')}
                            className={`w-14 bg-slate-800 text-center ${textColor} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`} 
                        />
                    )}
                </div>
                <div className="w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-sm my-1"></div>
            </div>
        </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-crosshair">
        <canvas ref={canvasRef} className="block w-full h-full" 
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel} onMouseLeave={handleMouseUp}/>

        <DraggableWindow title="PRODUCTO PUNTO (DOT)" initialPosition={{x:20, y:20}} width="w-96">
            <div className="space-y-4 text-xs font-mono">
                
                {/* Visual Equation with Column Vectors */}
                <div className="flex items-center justify-center gap-2 md:gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                     <ColumnVector vec={vecA} label="A" color="text-blue-400" onChange={setVecA} name="A" />
                     <div className="text-2xl text-slate-500 font-bold mt-4">·</div>
                     <ColumnVector vec={vecB} label="B" color="text-red-400" onChange={setVecB} name="B" />
                     <div className="text-2xl text-slate-500 font-bold mt-4">=</div>
                     <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-500 mb-1 pixel-font opacity-80">R</span>
                        <div className="text-3xl text-white font-bold pixel-font mt-2">
                           {dotProduct.toFixed(1)}
                        </div>
                     </div>
                </div>

                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <p className="text-slate-400 mb-1">Fórmula Geométrica:</p>
                    <p className="text-cyan-300">|A| · |B| · cos(θ)</p>
                    <div className="grid grid-cols-3 gap-1 mt-1 text-[10px] text-slate-400 text-center">
                        <div className="bg-slate-900 rounded p-1">
                            <span className="block text-blue-400">|A|</span>
                            {magA.toFixed(1)}
                        </div>
                        <div className="bg-slate-900 rounded p-1">
                            <span className="block text-red-400">|B|</span>
                            {magB.toFixed(1)}
                        </div>
                        <div className="bg-slate-900 rounded p-1">
                            <span className="block text-yellow-400">cos(θ)</span>
                            {Math.cos(angleRad).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setIs3D(!is3D)} className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white border border-slate-600">
                        {is3D ? "VISTA 2D" : "VISTA 3D"}
                    </button>
                    <button onClick={() => { setScale(40); setPan({x:0, y:0}); setCameraY(-0.3); }} className="px-2 py-1 text-slate-500 hover:text-cyan-400">
                        ⟲
                    </button>
                </div>
            </div>
        </DraggableWindow>

        {/* Legend Window - NEW */}
        <DraggableWindow title="GUÍA TEÓRICA: PRODUCTO PUNTO" initialPosition={{x:300, y: 400}} width="w-80">
            <div className="text-xs text-slate-400 space-y-2 font-mono">
                <p className="text-white font-bold">Concepto:</p>
                <p>El producto punto mide la <span className="text-cyan-400 font-bold">similitud direccional</span> entre dos vectores.</p>
                <p className="text-white font-bold mt-2">Observa:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li>Mueve los vectores hasta formar 90°: El resultado es <strong className="text-white">CERO</strong> (Ortogonales).</li>
                    <li>Si apuntan al mismo lado: Resultado <strong className="text-green-400">POSITIVO</strong> máximo.</li>
                    <li>Si apuntan a lados opuestos: Resultado <strong className="text-pink-400">NEGATIVO</strong>.</li>
                    <li>La <strong className="text-purple-400">línea punteada (Proyección)</strong> es la "sombra" que A proyecta sobre B.</li>
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
                        <span className="block text-xs text-cyan-400 font-bold">PRODUCTO CRUZ</span>
                    </div>
                </button>
            )}
        </div>
    </div>
  );
};