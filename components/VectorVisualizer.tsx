import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface VectorVisualizerProps {
  onNextLevel?: () => void;
}

// --- Math & Types ---
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Simple Matrix Rotation logic
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

export const VectorVisualizer: React.FC<VectorVisualizerProps> = ({ onNextLevel }) => {
  // --- State ---
  const [is3D, setIs3D] = useState(false);
  const [isPolar, setIsPolar] = useState(false); // Toggle between Cartesian and Polar/Spherical
  const [vector, setVector] = useState<Vector3>({ x: 3, y: 4, z: 0 });
  const [showAngle, setShowAngle] = useState(true);
  const [usePoint, setUsePoint] = useState(false);
  
  // Camera & View State
  const [cameraAngle, setCameraAngle] = useState({ x: -0.3, y: 0.5 }); // Pitch, Yaw
  const [scale, setScale] = useState(40); // Pixels per unit (Dynamic Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Screen offset
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [isDraggingVector, setIsDraggingVector] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Calculated stats (Cartesian)
  const magnitude = Math.sqrt(vector.x**2 + vector.y**2 + (is3D ? vector.z**2 : 0));
  // Angle in 2D (Standard Position)
  const angleRad = Math.atan2(vector.y, vector.x);
  const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

  // --- Polar/Spherical Calculations ---
  // r = magnitude
  // theta = atan2(y, x) (Azimuth)
  // phi = acos(z / r) (Inclination from Z axis)
  const safeMag = magnitude || 0.001; // Avoid division by zero
  const polarTheta = angleDeg; 
  // For 3D Spherical: Phi is angle from Z axis. 0 = up, 90 = equator, 180 = down
  const polarPhi = is3D ? (Math.acos(vector.z / safeMag) * 180 / Math.PI) : 90; 

  // --- Update Vector from Polar Inputs ---
  const updateFromPolar = (newR: number, newThetaDeg: number, newPhiDeg: number) => {
    const tRad = newThetaDeg * Math.PI / 180;
    
    if (!is3D) {
      // 2D Polar
      setVector({
        x: newR * Math.cos(tRad),
        y: newR * Math.sin(tRad),
        z: 0
      });
    } else {
      // 3D Spherical
      const pRad = newPhiDeg * Math.PI / 180;
      // Standard Physics Convention:
      // x = r * sin(phi) * cos(theta)
      // y = r * sin(phi) * sin(theta)
      // z = r * cos(phi)
      setVector({
        x: newR * Math.sin(pRad) * Math.cos(tRad),
        y: newR * Math.sin(pRad) * Math.sin(tRad),
        z: newR * Math.cos(pRad)
      });
    }
  };

  // --- 3D Projection Engine ---
  const project = useCallback((v: Vector3, width: number, height: number): { x: number, y: number, z: number } => {
    let p = { ...v };
    
    if (is3D) {
      // Rotate world based on camera
      p = rotateY(p, cameraAngle.y);
      p = rotateX(p, cameraAngle.x);
    } else {
      // Fixed 2D view (XY plane)
      p = { x: v.x, y: v.y, z: 0 };
    }

    // Projection Logic with Pan and Zoom
    return {
      x: width / 2 + pan.x + (p.x * scale), 
      y: height / 2 + pan.y - (p.y * scale),
      z: p.z 
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

    // Clear
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, height);

    // Draw Grid (Floor)
    ctx.strokeStyle = '#1e293b'; // Slate 800
    ctx.lineWidth = 1;
    const gridSize = 20; 
    
    const drawLine = (start: Vector3, end: Vector3, color?: string, widthPx: number = 1) => {
      const p1 = project(start, width, height);
      const p2 = project(end, width, height);
      
      // Optimization
      if ((p1.x < -100 && p2.x < -100) || (p1.x > width + 100 && p2.x > width + 100) ||
          (p1.y < -100 && p2.y < -100) || (p1.y > height + 100 && p2.y > height + 100)) {
            return;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color || '#334155';
      ctx.lineWidth = widthPx;
      ctx.stroke();
    };

    // Draw Grid Lines
    if (is3D) {
      for (let i = -gridSize; i <= gridSize; i++) {
        drawLine({ x: i, y: 0, z: -gridSize }, { x: i, y: 0, z: gridSize }); // Z lines
        drawLine({ x: -gridSize, y: 0, z: i }, { x: gridSize, y: 0, z: i }); // X lines
      }
      // Vertical Axis (Y-ish in this context, though technically Z is Up in spherical math, visually Y is up here)
      drawLine({ x: 0, y: -gridSize, z: 0 }, { x: 0, y: gridSize, z: 0 }, '#334155');
    } else {
      for (let i = -gridSize; i <= gridSize; i++) {
        drawLine({ x: i, y: -gridSize, z: 0 }, { x: i, y: gridSize, z: 0 }); // Vertical
        drawLine({ x: -gridSize, y: i, z: 0 }, { x: gridSize, y: i, z: 0 }); // Horizontal
      }
    }

    // Draw Main Axes
    drawLine({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, '#ef4444', 2); // X
    drawLine({ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }, '#22c55e', 2); // Y
    if (is3D) drawLine({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }, '#3b82f6', 2); // Z

    // --- Draw The Vector ---
    const origin = { x: 0, y: 0, z: 0 };
    const currentVector = is3D ? vector : { ...vector, z: 0 };
    const projectedOrigin = project(origin, width, height);
    const projectedTip = project(currentVector, width, height);

    // Vector Line
    if (!usePoint) {
      ctx.beginPath();
      ctx.moveTo(projectedOrigin.x, projectedOrigin.y);
      ctx.lineTo(projectedTip.x, projectedTip.y);
      ctx.strokeStyle = '#22d3ee'; // Cyan 400
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Vector Tip
    ctx.beginPath();
    ctx.arc(projectedTip.x, projectedTip.y, usePoint ? 8 : 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Components Projections
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    
    if (is3D) {
      drawLine(currentVector, { x: vector.x, y: 0, z: vector.z }, 'rgba(255,255,255,0.2)');
      drawLine({ x: vector.x, y: 0, z: vector.z }, { x: vector.x, y: 0, z: 0 }, 'rgba(239,68,68,0.3)');
      drawLine({ x: vector.x, y: 0, z: vector.z }, { x: 0, y: 0, z: vector.z }, 'rgba(59,130,246,0.3)');
    } else {
      drawLine(currentVector, { x: vector.x, y: 0, z: 0 });
      drawLine(currentVector, { x: 0, y: vector.y, z: 0 });
    }
    ctx.setLineDash([]);

    // --- Draw Angle Arc (2D Only for clarity) ---
    if (!is3D && showAngle && !usePoint) {
      const radius = 40;
      ctx.beginPath();
      ctx.arc(projectedOrigin.x, projectedOrigin.y, radius, -angleRad, 0, true);
      ctx.strokeStyle = '#fbbf24'; // Amber
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '10px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`${angleDeg.toFixed(0)}°`, projectedOrigin.x + radius + 5, projectedOrigin.y - 10);
    }

  }, [vector, is3D, cameraAngle, showAngle, usePoint, project, angleRad, angleDeg]);

  // Animation/Resize Loop
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

  useEffect(() => {
    draw();
  }, [draw]);

  // --- Interaction Handlers ---

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const cx = mx - width / 2;
    const cy = my - height / 2;

    const zoomIntensity = 0.1;
    const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
    const newScale = Math.max(5, Math.min(500, scale * zoomFactor));

    setPan(prev => ({
      x: cx - ((cx - prev.x) / scale) * newScale,
      y: cy - ((cy - prev.y) / scale) * newScale
    }));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const projectedTip = project(is3D ? vector : { ...vector, z: 0 }, canvasRef.current.width, canvasRef.current.height);
    const dist = Math.sqrt((mx - projectedTip.x)**2 + (my - projectedTip.y)**2);
    
    if (dist < 15) {
      setIsDraggingVector(true);
    } else {
      setIsOrbiting(true);
    }
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
    }
  };

  const handleMouseUp = () => {
    setIsDraggingVector(false);
    setIsOrbiting(false);
  };
  
  // Handler for inputs
  const handleInputScroll = (type: 'cartesian' | 'polar', axis: string) => (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -1 : 1; // Standardize direction
    
    if (type === 'cartesian') {
        const step = 0.5;
        const key = axis as keyof Vector3;
        setVector(prev => ({
          ...prev,
          [key]: Number((prev[key] + (delta * step)).toFixed(1))
        }));
    } else {
        // Polar Scrolling
        if (axis === 'r') {
            updateFromPolar(magnitude + (delta * 0.5), polarTheta, polarPhi);
        } else if (axis === 'theta') {
            updateFromPolar(magnitude, polarTheta + (delta * 5), polarPhi);
        } else if (axis === 'phi') {
            updateFromPolar(magnitude, polarTheta, polarPhi + (delta * 5));
        }
    }
  };

  // --- UI Components ---
  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 overflow-hidden cursor-crosshair">
      <canvas
        ref={canvasRef}
        onWheel={handleCanvasWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="block w-full h-full touch-none"
      />

      {/* Floating Control Window */}
      <DraggableWindow title="CONFIGURACIÓN DE VECTOR" initialPosition={{ x: 20, y: 20 }} width="w-80">
        <div className="space-y-4">
          
          {/* Dimensions & Coord System Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                <button onClick={() => { setIs3D(false); setCameraAngle({x:0, y:0}); setPan({x:0, y:0}); setScale(40); }}
                    className={`flex-1 py-1 text-[10px] font-bold font-mono transition-colors ${!is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    2D
                </button>
                <button onClick={() => { setIs3D(true); setCameraAngle({x: -0.3, y: 0.5}); }}
                    className={`flex-1 py-1 text-[10px] font-bold font-mono transition-colors ${is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    3D
                </button>
            </div>
            <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                <button onClick={() => setIsPolar(false)}
                    className={`flex-1 py-1 text-[10px] font-bold font-mono transition-colors ${!isPolar ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    XYZ
                </button>
                <button onClick={() => setIsPolar(true)}
                    className={`flex-1 py-1 text-[10px] font-bold font-mono transition-colors ${isPolar ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                    POLAR
                </button>
            </div>
          </div>

          {/* Component Inputs as Column Vector */}
          <div className="flex flex-col items-center py-4 bg-slate-950/50 rounded-lg border border-slate-800">
             <div className="flex items-center gap-3">
               <span className="font-serif italic text-cyan-400 text-xl font-bold">v</span>
               <span className="text-slate-500 text-lg">=</span>
               
               <div className="flex items-stretch">
                  {/* Left Bracket */}
                  <div className={`w-3 border-l-2 border-slate-500 my-1 ${isPolar ? 'border-t-0 border-b-0 rounded-l-xl' : 'border-t-2 border-b-2 rounded-l-md'}`}></div>
                  
                  {/* Inputs Stack */}
                  <div className="flex flex-col gap-2 px-2 py-2">
                     
                     {!isPolar ? (
                        /* CARTESIAN INPUTS */
                        <>
                            <div className="relative group flex items-center gap-2">
                                <input type="number" step="0.1" value={vector.x.toFixed(1)}
                                    onChange={(e) => setVector({...vector, x: parseFloat(e.target.value) || 0})}
                                    onWheel={handleInputScroll('cartesian', 'x')}
                                    className="w-20 bg-slate-800 text-right text-red-400 font-mono text-lg p-1 rounded border border-transparent focus:border-red-500 outline-none" />
                                <span className="text-[10px] font-mono text-red-500 opacity-60">x</span>
                            </div>
                            <div className="relative group flex items-center gap-2">
                                <input type="number" step="0.1" value={vector.y.toFixed(1)}
                                    onChange={(e) => setVector({...vector, y: parseFloat(e.target.value) || 0})}
                                    onWheel={handleInputScroll('cartesian', 'y')}
                                    className="w-20 bg-slate-800 text-right text-green-400 font-mono text-lg p-1 rounded border border-transparent focus:border-green-500 outline-none" />
                                <span className="text-[10px] font-mono text-green-500 opacity-60">y</span>
                            </div>
                            {is3D && (
                                <div className="relative group flex items-center gap-2">
                                    <input type="number" step="0.1" value={vector.z.toFixed(1)}
                                        onChange={(e) => setVector({...vector, z: parseFloat(e.target.value) || 0})}
                                        onWheel={handleInputScroll('cartesian', 'z')}
                                        className="w-20 bg-slate-800 text-right text-blue-400 font-mono text-lg p-1 rounded border border-transparent focus:border-blue-500 outline-none" />
                                    <span className="text-[10px] font-mono text-blue-500 opacity-60">z</span>
                                </div>
                            )}
                        </>
                     ) : (
                        /* POLAR INPUTS */
                        <>
                            <div className="relative group flex items-center gap-2">
                                <input type="number" step="0.1" value={magnitude.toFixed(1)}
                                    onChange={(e) => updateFromPolar(parseFloat(e.target.value)||0, polarTheta, polarPhi)}
                                    onWheel={handleInputScroll('polar', 'r')}
                                    className="w-20 bg-slate-800 text-right text-cyan-300 font-mono text-lg p-1 rounded border border-transparent focus:border-cyan-500 outline-none" />
                                <span className="text-[10px] font-mono text-cyan-300 opacity-60 italic">r</span>
                            </div>
                            <div className="relative group flex items-center gap-2">
                                <input type="number" step="1" value={Math.round(polarTheta)}
                                    onChange={(e) => updateFromPolar(magnitude, parseFloat(e.target.value)||0, polarPhi)}
                                    onWheel={handleInputScroll('polar', 'theta')}
                                    className="w-20 bg-slate-800 text-right text-yellow-300 font-mono text-lg p-1 rounded border border-transparent focus:border-yellow-500 outline-none" />
                                <span className="text-[10px] font-mono text-yellow-300 opacity-60 italic">θ</span>
                            </div>
                            {is3D && (
                                <div className="relative group flex items-center gap-2">
                                    <input type="number" step="1" value={Math.round(polarPhi)}
                                        onChange={(e) => updateFromPolar(magnitude, polarTheta, parseFloat(e.target.value)||0)}
                                        onWheel={handleInputScroll('polar', 'phi')}
                                        className="w-20 bg-slate-800 text-right text-purple-300 font-mono text-lg p-1 rounded border border-transparent focus:border-purple-500 outline-none" />
                                    <span className="text-[10px] font-mono text-purple-300 opacity-60 italic">φ</span>
                                </div>
                            )}
                        </>
                     )}

                  </div>

                  {/* Right Bracket */}
                  <div className={`w-3 border-r-2 border-slate-500 my-1 ${isPolar ? 'border-t-0 border-b-0 rounded-r-xl' : 'border-t-2 border-b-2 rounded-r-md'}`}></div>
               </div>
             </div>
          </div>

          {/* Style Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-700">
             <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={usePoint} onChange={(e) => setUsePoint(e.target.checked)} className="accent-cyan-400" />
                <span className="text-xs text-slate-400 group-hover:text-cyan-400 pixel-font text-[9px]">SOLO PUNTO</span>
             </label>

             {!usePoint && (
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={showAngle} onChange={(e) => setShowAngle(e.target.checked)} className="accent-yellow-400" disabled={is3D} />
                    <span className={`text-xs pixel-font text-[9px] ${is3D ? 'text-slate-600 decoration-line-through' : 'text-slate-400 group-hover:text-yellow-400'}`}>
                        MOSTRAR ÁNGULO (2D)
                    </span>
                </label>
             )}
          </div>
          
          <div className="text-[9px] text-slate-500 font-mono border-t border-slate-700 pt-2 flex justify-between">
            <span>ZOOM: {scale.toFixed(0)}%</span>
            <button onClick={() => { setScale(40); setPan({x:0, y:0}); }} className="hover:text-cyan-400">REINICIAR VISTA</button>
          </div>
        </div>
      </DraggableWindow>

      {/* Floating Stats Window */}
      <DraggableWindow title="ANÁLISIS DE DATOS" initialPosition={{ x: 20, y: 350 }}>
        <div className="space-y-3 font-mono">
            <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                <span className="text-xs text-slate-500">NORMA (MAGNITUD)</span>
                <span className="text-xl text-cyan-400 font-bold">{magnitude.toFixed(2)}</span>
            </div>
            
            <div className={`flex justify-between items-end ${usePoint ? 'opacity-30' : ''}`}>
                <span className="text-xs text-slate-500">ÁNGULO (THETA)</span>
                <div className="text-right">
                    <span className="block text-lg text-yellow-400 font-bold">
                        {is3D ? 'N/A' : `${angleDeg.toFixed(1)}°`}
                    </span>
                    <span className="block text-[10px] text-slate-600">
                        {is3D ? '(Solo en 2D)' : `${angleRad.toFixed(2)} rad`}
                    </span>
                </div>
            </div>
        </div>
      </DraggableWindow>
      
      {/* Legend Window - NEW */}
      <DraggableWindow title="GUÍA TEÓRICA: VECTORES" initialPosition={{ x: 300, y: 500 }} width="w-96">
        <div className="text-xs text-slate-400 space-y-2 font-mono">
            <p className="text-white font-bold">Concepto:</p>
            <p>Un vector es una cantidad que tiene <span className="text-cyan-400">Magnitud</span> (tamaño) y <span className="text-yellow-400">Dirección</span>. Es el bloque fundamental del espacio lineal.</p>
            <p className="text-white font-bold mt-2">Observa:</p>
            <ul className="list-disc pl-4 space-y-1 text-[10px]">
                <li>Arrastra la punta de la flecha: Los números (coordenadas) cambian para describir la nueva posición.</li>
                <li>Cambia a <strong>POLAR</strong>: Verás que el mismo vector se puede describir con un ángulo y un radio.</li>
                <li><strong>3D:</strong> El vector gana profundidad (eje Z azul).</li>
            </ul>
        </div>
      </DraggableWindow>

      {/* Navigation to Next Level */}
      {onNextLevel && (
        <div className="absolute bottom-4 left-4 z-50">
           <button 
             onClick={onNextLevel}
             className="group flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all rounded-r-full shadow-lg"
           >
              <div className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center bg-cyan-900/20 group-hover:bg-cyan-400/20">
                 <span className="text-cyan-400 animate-pulse text-lg">➔</span>
              </div>
              <div className="text-left pr-2">
                 <span className="block text-[9px] text-slate-500 pixel-font">SIGUIENTE NIVEL</span>
                 <span className="block text-xs text-cyan-400 font-bold">SUMA DE VECTORES</span>
              </div>
           </button>
        </div>
      )}

    </div>
  );
};