import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface VectorPlaygroundProps {
    onNextLevel?: () => void;
    onPrevLevel?: () => void;
}

// --- Math & Types ---
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Matrix Rotation Logic (Reused for consistency)
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

export const VectorPlayground: React.FC<VectorPlaygroundProps> = ({ onNextLevel, onPrevLevel }) => {
  // --- State ---
  const [vecA, setVecA] = useState<Vector3>({ x: 4, y: 1, z: 0 });
  const [vecB, setVecB] = useState<Vector3>({ x: 1, y: 3, z: 0 });
  
  // View State
  const [is3D, setIs3D] = useState(false);
  const [cameraAngle, setCameraAngle] = useState({ x: -0.3, y: 0.5 }); // Pitch, Yaw
  const [scale, setScale] = useState(40); 
  const [pan, setPan] = useState({ x: 0, y: 0 }); 
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [dragging, setDragging] = useState<'A' | 'B' | null>(null);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Math: Resultant
  const vecR = { x: vecA.x + vecB.x, y: vecA.y + vecB.y, z: vecA.z + vecB.z };

  // Math: Analysis
  const getMag = (v: Vector3) => Math.sqrt(v.x**2 + v.y**2 + v.z**2);
  const getAngle2D = (v: Vector3) => (Math.atan2(v.y, v.x) * 180 / Math.PI + 360) % 360; // Only for 2D View

  // --- Projection Logic ---
  const project = useCallback((v: Vector3, width: number, height: number): { x: number, y: number, z: number } => {
    let p = { ...v };

    if (is3D) {
      // 3D Projection: Rotate world based on camera
      p = rotateY(p, cameraAngle.y);
      p = rotateX(p, cameraAngle.x);
    } else {
      // 2D Projection: Ignore Z, map X/Y directly
      p = { x: v.x, y: v.y, z: 0 };
    }

    // World to Screen
    // In 3D: Y is Up (screen Y is inverted). In 2D: Y is Up.
    return {
      x: width / 2 + pan.x + (p.x * scale),
      y: height / 2 + pan.y - (p.y * scale),
      z: p.z // Depth for sorting if needed
    };
  }, [is3D, cameraAngle, scale, pan]);

  // --- Render Loop ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Background
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, height);

    // 2. Grid & Axes
    ctx.lineWidth = 1;
    const gridSize = 20;

    const drawLine = (start: Vector3, end: Vector3, color: string, dashed = false) => {
        const p1 = project(start, width, height);
        const p2 = project(end, width, height);
        
        // Culling optimization
        if ((p1.x < -100 && p2.x < -100) || (p1.x > width + 100 && p2.x > width + 100) ||
            (p1.y < -100 && p2.y < -100) || (p1.y > height + 100 && p2.y > height + 100)) return;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        if (dashed) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    // Draw Floor Grid
    if (is3D) {
      // 3D Grid on XZ plane
      for (let i = -gridSize; i <= gridSize; i++) {
        drawLine({ x: i, y: 0, z: -gridSize }, { x: i, y: 0, z: gridSize }, '#1e293b'); // Z lines
        drawLine({ x: -gridSize, y: 0, z: i }, { x: gridSize, y: 0, z: i }, '#1e293b'); // X lines
      }
      // Vertical Axis (Y)
      drawLine({ x: 0, y: -gridSize, z: 0 }, { x: 0, y: gridSize, z: 0 }, '#334155');
    } else {
      // 2D Grid on XY plane
      for (let i = -gridSize; i <= gridSize; i++) {
        drawLine({ x: i, y: -gridSize, z: 0 }, { x: i, y: gridSize, z: 0 }, '#1e293b'); // Vertical
        drawLine({ x: -gridSize, y: i, z: 0 }, { x: gridSize, y: i, z: 0 }, '#1e293b'); // Horizontal
      }
    }

    // Main Axes
    ctx.lineWidth = 2;
    drawLine({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, '#ef4444'); // X (Red)
    drawLine({ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }, '#22c55e'); // Y (Green)
    if (is3D) drawLine({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }, '#3b82f6'); // Z (Blue)

    // --- Helper for drawing vectors ---
    const drawVector = (v: Vector3, color: string, label: string, from: Vector3 = {x:0, y:0, z:0}, isGhost = false) => {
        const start = project(from, width, height);
        // Calculate absolute end position
        const absEnd = { x: from.x + v.x, y: from.y + v.y, z: from.z + v.z };
        const end = project(absEnd, width, height); 

        // Draw Line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = isGhost ? 2 : 3;
        if (isGhost) ctx.setLineDash([5, 5]); else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = isGhost ? 8 : 10;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = color;
        ctx.fill();

        // 3D Components Drop Lines (only for main vectors in 3D)
        if (is3D && !isGhost) {
            // Line from tip to floor (XZ plane)
            const floorPt = { x: absEnd.x, y: 0, z: absEnd.z };
            drawLine(absEnd, floorPt, color + '40', true); 
            // Line to axis (optional, keeping it clean for now)
        }

        // Label
        if (label) {
            ctx.fillStyle = color;
            ctx.font = 'bold 12px monospace';
            ctx.fillText(label, end.x + 10, end.y);
        }

        return end;
    };

    // 4. Draw Vectors
    const tipA = drawVector(vecA, '#3b82f6', 'A');
    const tipB = drawVector(vecB, '#ef4444', 'B');
    
    // Ghosts
    drawVector(vecB, 'rgba(239, 68, 68, 0.5)', '', vecA, true); // Ghost B starts at A
    drawVector(vecA, 'rgba(59, 130, 246, 0.3)', '', vecB, true); // Ghost A starts at B
    
    // Resultant
    const tipR = drawVector(vecR, '#22c55e', 'R');

    // 5. Draw Interactive Handles
    const drawHandle = (pos: {x:number, y:number}, color: string, isHovered: boolean) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isHovered ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
        if (isHovered) {
             ctx.shadowColor = color;
             ctx.shadowBlur = 10;
             ctx.stroke();
             ctx.shadowBlur = 0;
        }
    };

    drawHandle(tipA, '#3b82f6', dragging === 'A');
    drawHandle(tipB, '#ef4444', dragging === 'B');
    drawHandle(tipR, '#22c55e', false); // Resultant not directly draggable in this model

  }, [vecA, vecB, vecR, scale, pan, dragging, project, is3D, cameraAngle]);


  // --- Event Listeners ---
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


  // --- Interactions ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Hit Testing
    // For 3D, we project current vectors to screen and check distance
    const tipA = project(vecA, canvasRef.current.width, canvasRef.current.height);
    const tipB = project(vecB, canvasRef.current.width, canvasRef.current.height);

    const distA = Math.sqrt((mx - tipA.x)**2 + (my - tipA.y)**2);
    const distB = Math.sqrt((mx - tipB.x)**2 + (my - tipB.y)**2);

    if (distA < 20) {
      setDragging('A');
    } else if (distB < 20) {
      setDragging('B');
    } else {
      // If not clicking a vector, we are orbiting (in 3D) or panning (in 2D)
      if (is3D) setIsOrbiting(true);
      // In 2D we allow panning via mouse move if not dragging
    }
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (dragging) {
        const sensitivity = 1.0 / scale;

        const updateVector = (setter: React.Dispatch<React.SetStateAction<Vector3>>) => {
            setter(prev => {
                let nx = prev.x, ny = prev.y, nz = prev.z;
                if (is3D) {
                    // Logic to map screen movement to 3D world based on camera angle
                    // Simple approximation: X movement maps to Camera Right, Y to Up/Down
                    const cosY = Math.cos(cameraAngle.y);
                    const sinY = Math.sin(cameraAngle.y);
                    nx += (dx * cosY) * sensitivity;
                    nz += (dx * sinY) * sensitivity; 
                    ny -= dy * sensitivity; // Screen Y is inverse
                } else {
                    nx += dx * sensitivity;
                    ny -= dy * sensitivity;
                }
                return { x: nx, y: ny, z: nz };
            });
        };

        if (dragging === 'A') updateVector(setVecA);
        else updateVector(setVecB);

    } else if (isOrbiting && is3D) {
        setCameraAngle(prev => ({
            x: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.x + dy * 0.01)),
            y: prev.y + dx * 0.01
        }));
    } else if (e.buttons === 1 && !is3D) {
        // Simple Panning in 2D
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsOrbiting(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
      const zoomIntensity = 0.1;
      const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
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

  // Helper Component for Column Vector
  const ColumnVector = ({ 
    vec, 
    color, 
    label, 
    onChange, 
    readOnly = false 
  }: { 
    vec: Vector3, 
    color: string, 
    label: string, 
    onChange?: (v: Vector3) => void, 
    readOnly?: boolean 
  }) => {
    const textColor = color === 'blue' ? 'text-blue-400' : color === 'red' ? 'text-red-400' : 'text-green-400';
    
    const onScroll = (axis: keyof Vector3) => !readOnly && label !== 'R' ? handleInputScroll(label as 'A'|'B', axis) : undefined;
    
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
                    {is3D && (
                        <input type="number" step="0.5" value={vec.z.toFixed(1)} 
                            onChange={e => handleChange('z', e.target.value)} onWheel={onScroll('z')} readOnly={readOnly}
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
      <DraggableWindow title="SUMA DE VECTORES" initialPosition={{ x: 20, y: 20 }} width="w-auto">
         <div className="space-y-4 px-2">
            
            {/* View Toggles */}
            <div className="flex bg-slate-800 p-1 rounded border border-slate-700 w-full mb-2">
                <button onClick={() => { setIs3D(false); setCameraAngle({x:0, y:0}); setPan({x:0, y:0}); setScale(40); }}
                    className={`flex-1 py-1 text-[10px] font-bold font-mono transition-colors ${!is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    2D
                </button>
                <button onClick={() => { setIs3D(true); setCameraAngle({x: -0.3, y: 0.5}); }}
                    className={`flex-1 py-1 text-[10px] font-bold font-mono transition-colors ${is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    3D
                </button>
            </div>

            {/* Column Vector Equation */}
            <div className="flex items-center justify-center gap-2 md:gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                <ColumnVector vec={vecA} color="blue" label="A" onChange={setVecA} />
                <div className="text-2xl text-slate-500 font-bold mt-4">+</div>
                <ColumnVector vec={vecB} color="red" label="B" onChange={setVecB} />
                <div className="text-2xl text-slate-500 font-bold mt-4">=</div>
                <ColumnVector vec={vecR} color="green" label="R" readOnly />
            </div>

            <div className="text-[9px] text-slate-500 font-mono border-t border-slate-700 pt-2 flex justify-between gap-2">
                <span>USA LA RUEDA SOBRE LOS NÚMEROS</span>
                <button onClick={() => { setScale(40); setPan({x:0, y:0}); setCameraAngle({x: -0.3, y: 0.5}); }} className="hover:text-cyan-400 font-bold whitespace-nowrap">REINICIAR VISTA</button>
            </div>
         </div>
      </DraggableWindow>

      {/* Stats Window */}
      <DraggableWindow title="ANÁLISIS DE DATOS" initialPosition={{ x: 20, y: 400 }} width="w-64">
        <div className="space-y-4 font-mono text-xs">
            {/* Stat Row A */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="text-blue-400 font-bold">||A||</span>
                <div className="text-right">
                    <span className="block text-slate-300">{getMag(vecA).toFixed(2)}</span>
                    {!is3D && <span className="text-[9px] text-slate-600">∠ {getAngle2D(vecA).toFixed(0)}°</span>}
                </div>
            </div>
            {/* Stat Row B */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="text-red-400 font-bold">||B||</span>
                <div className="text-right">
                    <span className="block text-slate-300">{getMag(vecB).toFixed(2)}</span>
                    {!is3D && <span className="text-[9px] text-slate-600">∠ {getAngle2D(vecB).toFixed(0)}°</span>}
                </div>
            </div>
            {/* Stat Row R */}
            <div className="flex justify-between items-center bg-slate-800/50 p-1 rounded">
                <span className="text-green-400 font-bold">||R||</span>
                <div className="text-right">
                    <span className="block text-white font-bold">{getMag(vecR).toFixed(2)}</span>
                    {!is3D && <span className="text-[9px] text-slate-500">∠ {getAngle2D(vecR).toFixed(0)}°</span>}
                </div>
            </div>

            <div className="pt-2 text-[9px] text-slate-500 italic">
                {getMag(vecR) < (getMag(vecA) + getMag(vecB)) - 0.01 
                    ? "Desigualdad Triangular: ||A+B|| ≤ ||A|| + ||B||"
                    : "Los vectores son colineales (Fuerza máxima)."}
            </div>
        </div>
      </DraggableWindow>

      {/* Explanation Tooltip / Legend */}
      <DraggableWindow title="GUÍA TEÓRICA: SUMA" initialPosition={{x: 350, y: 20}} width="w-80">
          <div className="text-xs text-slate-400 space-y-2 leading-relaxed font-mono">
              <p>
                  Para sumar <span className="text-blue-400 font-bold">A</span> y <span className="text-red-400 font-bold">B</span>:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Visualmente (Cabeza-Cola):</strong> Imagina caminar a lo largo de A, y desde ahí caminar a lo largo de B. El vector <span className="text-green-400">Resultante</span> es el atajo desde el inicio hasta el final.</li>
                  <li><strong>Numéricamente:</strong> Simplemente suma las coordenadas (x+x, y+y).</li>
              </ul>
              <p className="text-white font-bold mt-2">Observa:</p>
              <ul className="list-disc pl-4 space-y-1 text-[10px]">
                  <li>Arrastra los vectores para ver cómo cambia la diagonal verde.</li>
                  <li>La suma es <strong>Conmutativa</strong>: A+B es lo mismo que B+A (mira las líneas fantasma).</li>
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
                    <span className="block text-xs text-cyan-400 font-bold">VECTOR</span>
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
                    <span className="block text-xs text-cyan-400 font-bold">ESCALAR</span>
                </div>
            </button>
        )}
      </div>

    </div>
  );
};