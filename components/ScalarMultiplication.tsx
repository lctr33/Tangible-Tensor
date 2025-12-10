import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface ScalarMultiplicationProps {
  onNextLevel?: () => void;
  onPrevLevel?: () => void;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// 3D Logic Helpers
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

export const ScalarMultiplication: React.FC<ScalarMultiplicationProps> = ({ onNextLevel, onPrevLevel }) => {
  // State
  const [vector, setVector] = useState<Vector3>({ x: 2, y: 1, z: 0 });
  const [scalar, setScalar] = useState<number>(2.0);
  
  // View State
  const [is3D, setIs3D] = useState(false);
  const [cameraAngle, setCameraAngle] = useState({ x: -0.3, y: 0.5 });
  const [scale, setScale] = useState(40);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [isDraggingVector, setIsDraggingVector] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Calculated Result
  const resultVector = { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
  const baseMag = Math.sqrt(vector.x**2 + vector.y**2 + vector.z**2);
  const resultMag = Math.sqrt(resultVector.x**2 + resultVector.y**2 + resultVector.z**2);

  // Projection
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

  // Render
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Grid
    const gridSize = 20;
    ctx.lineWidth = 1;
    const drawLine = (start: Vector3, end: Vector3, color: string, dashed = false) => {
        const p1 = project(start, width, height);
        const p2 = project(end, width, height);
        // Culling
        if ((p1.x < -100 && p2.x < -100) || (p1.x > width + 100 && p2.x > width + 100) || (p1.y < -100 && p2.y < -100) || (p1.y > height + 100 && p2.y > height + 100)) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        if (dashed) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    if (is3D) {
       for (let i = -gridSize; i <= gridSize; i++) {
         drawLine({ x: i, y: 0, z: -gridSize }, { x: i, y: 0, z: gridSize }, '#1e293b');
         drawLine({ x: -gridSize, y: 0, z: i }, { x: gridSize, y: 0, z: i }, '#1e293b');
       }
       drawLine({ x: 0, y: -gridSize, z: 0 }, { x: 0, y: gridSize, z: 0 }, '#334155');
    } else {
       for (let i = -gridSize; i <= gridSize; i++) {
         drawLine({ x: i, y: -gridSize, z: 0 }, { x: i, y: gridSize, z: 0 }, '#1e293b');
         drawLine({ x: -gridSize, y: i, z: 0 }, { x: gridSize, y: i, z: 0 }, '#1e293b');
       }
    }

    // Axes
    ctx.lineWidth = 2;
    drawLine({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, '#ef4444');
    drawLine({ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }, '#22c55e');
    if (is3D) drawLine({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }, '#3b82f6');

    // Draw Vector Helper
    const drawVector = (v: Vector3, color: string, label: string, isGhost = false) => {
        const start = project({x:0, y:0, z:0}, width, height);
        const end = project(v, width, height);
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = isGhost ? 2 : 4;
        if (isGhost) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = isGhost ? 6 : 10;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = color;
        ctx.fill();

        if (label) {
            ctx.fillStyle = color;
            ctx.font = 'bold 12px monospace';
            ctx.fillText(label, end.x + 10, end.y);
        }
        return end;
    };

    // Draw Vectors
    // Original Vector (Ghost)
    drawVector(vector, 'rgba(148, 163, 184, 0.4)', 'v', true);

    // Result Vector
    const tipResult = drawVector(resultVector, scalar < 0 ? '#f472b6' : '#22d3ee', 'kv');

    // Handle on original vector to control direction
    const tipOriginal = project(vector, width, height);
    
    // Draw Handle on Original Vector (to control direction)
    const drawHandle = (pos: {x:number, y:number}, color: string, hovered: boolean) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, hovered ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
    };
    
    drawHandle(tipOriginal, '#94a3b8', isDraggingVector);

  }, [vector, resultVector, scalar, scale, pan, is3D, cameraAngle, project, isDraggingVector]);

  // Event Listeners
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
            draw();
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // Interaction Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const tip = project(vector, canvasRef.current.width, canvasRef.current.height);
    const dist = Math.sqrt((mx - tip.x)**2 + (my - tip.y)**2);

    if (dist < 20) setIsDraggingVector(true);
    else if (is3D) setIsOrbiting(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (isDraggingVector) {
        const sensitivity = 1.0 / scale;
        setVector(prev => {
            let nx = prev.x, ny = prev.y, nz = prev.z;
            if (is3D) {
                const cosY = Math.cos(cameraAngle.y);
                const sinY = Math.sin(cameraAngle.y);
                nx += (dx * cosY) * sensitivity;
                nz += (dx * sinY) * sensitivity; 
                ny -= dy * sensitivity;
            } else {
                nx += dx * sensitivity;
                ny -= dy * sensitivity;
            }
            return { x: nx, y: ny, z: nz };
        });
    } else if (isOrbiting && is3D) {
        setCameraAngle(prev => ({
            x: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.x + dy * 0.01)),
            y: prev.y + dx * 0.01
        }));
    } else if (e.buttons === 1 && !is3D) {
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = () => { setIsDraggingVector(false); setIsOrbiting(false); };
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => Math.max(10, Math.min(200, prev * zoomFactor)));
  };

  // Helper for inputs
  const handleInputScroll = (axis: keyof Vector3) => (e: React.WheelEvent) => {
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      setVector(prev => ({ ...prev, [axis]: Number((prev[axis] + delta).toFixed(1)) }));
  };

  const ColumnVector = ({
    vec,
    color,
    label,
    onChange,
    readOnly = false
  }: {
    vec: Vector3,
    color: string,
    label?: string,
    onChange?: (v: Vector3) => void,
    readOnly?: boolean
  }) => {
    const textClass = color === 'cyan' ? 'text-cyan-400' : (color === 'pink' ? 'text-pink-400' : 'text-slate-300');
    
    const handleChange = (axis: keyof Vector3, val: string) => {
        if(onChange) onChange({...vec, [axis]: parseFloat(val)||0});
    };

    return (
        <div className="flex flex-col items-center gap-1">
            {label && <span className={`text-[10px] font-bold ${textClass} pixel-font opacity-80`}>{label}</span>}
            <div className="flex items-stretch">
                <div className="w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-sm my-1"></div>
                <div className="flex flex-col gap-1 px-1 py-1">
                    <input type="number" step="0.5" value={vec.x.toFixed(1)}
                        onChange={e => handleChange('x', e.target.value)} onWheel={!readOnly ? handleInputScroll('x') : undefined} readOnly={readOnly}
                        className={`w-14 bg-slate-800 text-center ${textClass} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`}
                    />
                    <input type="number" step="0.5" value={vec.y.toFixed(1)}
                        onChange={e => handleChange('y', e.target.value)} onWheel={!readOnly ? handleInputScroll('y') : undefined} readOnly={readOnly}
                        className={`w-14 bg-slate-800 text-center ${textClass} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`}
                    />
                    {is3D && (
                        <input type="number" step="0.5" value={vec.z.toFixed(1)}
                            onChange={e => handleChange('z', e.target.value)} onWheel={!readOnly ? handleInputScroll('z') : undefined} readOnly={readOnly}
                            className={`w-14 bg-slate-800 text-center ${textClass} font-mono text-sm p-1 rounded border border-transparent focus:border-slate-600 outline-none`}
                        />
                    )}
                </div>
                <div className="w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-sm my-1"></div>
            </div>
        </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 overflow-hidden cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="block w-full h-full touch-none"
      />

      {/* Control Window */}
      <DraggableWindow title="MULTIPLICACIÓN POR ESCALAR" initialPosition={{ x: 20, y: 20 }} width="w-96">
         <div className="space-y-4">
             {/* Scalar Slider */}
             <div className="space-y-1">
                 <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                     <span>ESCALAR (k)</span>
                     <span className={scalar < 0 ? "text-pink-400" : "text-cyan-400"}>{scalar.toFixed(1)}</span>
                 </div>
                 <input 
                    type="range" min="-3" max="3" step="0.1" 
                    value={scalar} 
                    onChange={(e) => setScalar(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                 />
                 <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                     <span>-3 (Invierte)</span>
                     <span>0</span>
                     <span>3 (Estira)</span>
                 </div>
             </div>

             {/* Equation with Column Vectors */}
             <div className="flex items-center justify-center gap-2 md:gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                 <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500 mb-1 pixel-font">k</span>
                    <input type="number" step="0.1" value={scalar} onChange={e => setScalar(parseFloat(e.target.value))} 
                        className={`w-12 text-center bg-slate-800 rounded p-1 font-mono text-sm font-bold border border-slate-700 focus:border-cyan-400 outline-none ${scalar < 0 ? 'text-pink-400' : 'text-cyan-400'}`} />
                 </div>
                 <div className="text-xl text-slate-500 font-bold mt-4">×</div>
                 <ColumnVector vec={vector} color="slate" label="v" onChange={setVector} />
                 <div className="text-xl text-slate-500 font-bold mt-4">=</div>
                 <ColumnVector vec={resultVector} color={scalar < 0 ? 'pink' : 'cyan'} label="kv" readOnly />
             </div>

             {/* 3D Toggle */}
             <div className="flex bg-slate-800 p-1 rounded border border-slate-700 mt-2">
                 <button onClick={() => { setIs3D(false); setCameraAngle({x:0, y:0}); setPan({x:0, y:0}); }}
                     className={`flex-1 py-1 text-[10px] font-bold ${!is3D ? 'bg-slate-600 text-white' : 'text-slate-500'}`}>2D</button>
                 <button onClick={() => { setIs3D(true); setCameraAngle({x: -0.3, y: 0.5}); }}
                     className={`flex-1 py-1 text-[10px] font-bold ${is3D ? 'bg-slate-600 text-white' : 'text-slate-500'}`}>3D</button>
             </div>
         </div>
      </DraggableWindow>

      {/* Info Window / Legend */}
      <DraggableWindow title="GUÍA TEÓRICA: ESCALAR" initialPosition={{ x: 300, y: 450 }} width="w-80">
          <div className="text-xs space-y-2 text-slate-400 font-mono">
              <p className="text-white font-bold">Concepto:</p>
              <p>
                  Multiplicar un vector por un número (escalar) cambia su 
                  <span className="text-cyan-400 font-bold"> magnitud (longitud)</span> pero mantiene su inclinación.
              </p>
              <p className="text-white font-bold mt-2">Observa:</p>
              <ul className="list-disc pl-4 space-y-1 text-[10px]">
                  <li>Mueve el deslizador <strong>k</strong>: El vector crece o se encoge.</li>
                  <li>Si <span className="text-pink-400">k es negativo</span>: El vector apunta en la dirección opuesta (se invierte).</li>
                  <li>La pendiente nunca cambia (la línea es la misma), solo la escala.</li>
              </ul>
              <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between">
                     <span>||v|| (Original)</span>
                     <span>{baseMag.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-cyan-400 font-bold">
                     <span>||kv|| (Escalado)</span>
                     <span>{resultMag.toFixed(2)}</span>
                  </div>
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
                    <span className="block text-xs text-cyan-400 font-bold">SUMA</span>
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
                    <span className="block text-xs text-cyan-400 font-bold">ECUACIÓN DE LA RECTA</span>
                </div>
            </button>
        )}
      </div>

    </div>
  );
};