import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow'; 

interface GradientDescentProps {
  onPrevLevel?: () => void;
  onNextLevel?: () => void;
}

interface Point { x: number; y: number; z: number; }

// --- MATH DEFINITIONS ---
const FUNCTIONS = [
    {
        id: 'bowl',
        name: 'Copa Convexa (Simple)',
        eq: 'f(x,y) = x²/4 + y²/4',
        f: (x: number, y: number) => (x*x + y*y) / 4,
        df_dx: (x: number, y: number) => x / 2,
        df_dy: (x: number, y: number) => y / 2,
        start: { x: 3, y: 3 },
        range: 4
    },
    {
        id: 'waves',
        name: 'Valle de Ondas (Mínimos Locales)',
        eq: 'f(x,y) = cos(x) + cos(y) + (x²+y²)/10',
        f: (x: number, y: number) => Math.cos(x) + Math.cos(y) + (x*x + y*y)/10,
        df_dx: (x: number, y: number) => -Math.sin(x) + x/5,
        df_dy: (x: number, y: number) => -Math.sin(y) + y/5,
        start: { x: 2.5, y: 2.5 },
        range: 4
    },
    {
        id: 'saddle',
        name: 'Silla de Montar',
        eq: 'f(x,y) = x² - y²',
        f: (x: number, y: number) => (x*x - y*y)/4,
        df_dx: (x: number, y: number) => x/2,
        df_dy: (x: number, y: number) => -y/2,
        start: { x: 0.1, y: 3 },
        range: 4
    }
];

// --- 3D UTILS ---
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

export const GradientDescent: React.FC<GradientDescentProps> = ({ onPrevLevel, onNextLevel }) => {
  // Config State
  const [funcIndex, setFuncIndex] = useState(0);
  const [learningRate, setLearningRate] = useState(0.1);
  const [isRunning, setIsRunning] = useState(false);
  
  // Algorithm State
  const activeFunc = FUNCTIONS[funcIndex];
  const [position, setPosition] = useState(activeFunc.start);
  const [path, setPath] = useState<Point[]>([]);
  const [iteration, setIteration] = useState(0);

  // View State
  const [camera, setCamera] = useState({ x: -0.5, y: 0.5 });
  const [scale, setScale] = useState(40);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'ORBIT' | 'BALL' | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const requestIdRef = useRef<number | null>(null);

  // --- ALGORITHM LOGIC ---
  const step = useCallback(() => {
    setPosition(prev => {
      // Calculate Gradient (Slope) at current position
      const gradX = activeFunc.df_dx(prev.x, prev.y);
      const gradY = activeFunc.df_dy(prev.x, prev.y);
      
      // Gradient Descent Step: x_new = x_old - learning_rate * gradient
      const nextX = prev.x - learningRate * gradX;
      const nextY = prev.y - learningRate * gradY;

      // Stop condition (convergence or divergence)
      const dist = Math.sqrt((nextX-prev.x)**2 + (nextY-prev.y)**2);
      if (dist < 0.001 || dist > 10) {
        setIsRunning(false);
        return prev;
      }
      
      // Store history for the trail
      const currentZ = activeFunc.f(prev.x, prev.y);
      setPath(old => [...old, { x: prev.x, y: currentZ, z: prev.y }]);
      setIteration(i => i + 1);

      return { x: nextX, y: nextY };
    });
  }, [activeFunc, learningRate]);

  // Animation Loop for Algorithm
  useEffect(() => {
    if (isRunning) {
      // Slow down the animation slightly so the user can see the steps
      const interval = setInterval(() => {
          step();
      }, 100); 
      return () => clearInterval(interval);
    }
  }, [isRunning, step]);

  // Reset when function changes
  useEffect(() => {
      reset();
  }, [funcIndex]);

  const reset = () => {
      setIsRunning(false);
      setPosition(activeFunc.start);
      setPath([]);
      setIteration(0);
  };

  // --- PROJECTION ---
  const project = useCallback((p: Point, w: number, h: number) => {
      let r = rotateY(p, camera.y);
      r = rotateX(r, camera.x);
      return {
          x: w/2 + pan.x + r.x * scale,
          y: h/2 + pan.y - r.y * scale, 
          z: r.z
      };
  }, [camera, scale, pan]);

  // --- DRAW LOOP ---
  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width; 
      const h = canvas.height;

      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

      const range = activeFunc.range;
      const stepSize = 0.5;

      // 1. Draw Surface (Grid)
      // Helper to draw projected lines
      const drawLine3D = (p1: Point, p2: Point, color: string) => {
          const pr1 = project(p1, w, h);
          const pr2 = project(p2, w, h);
          ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(pr2.x, pr2.y);
          ctx.strokeStyle = color; ctx.stroke();
      };

      ctx.lineWidth = 1;
      // X Lines
      for(let y = -range; y <= range; y += stepSize) {
          let first = true;
          const pathPoints: {x:number, y:number}[] = [];
          for(let x = -range; x <= range; x += stepSize) {
              const p = { x, y: activeFunc.f(x,y), z: y };
              pathPoints.push(project(p, w, h));
          }
          ctx.beginPath();
          pathPoints.forEach((p, i) => {
              if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          });
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)'; ctx.stroke();
      }
      // Y Lines
      for(let x = -range; x <= range; x += stepSize) {
          const pathPoints: {x:number, y:number}[] = [];
          for(let y = -range; y <= range; y += stepSize) {
              const p = { x, y: activeFunc.f(x,y), z: y };
              pathPoints.push(project(p, w, h));
          }
          ctx.beginPath();
          pathPoints.forEach((p, i) => {
              if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          });
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)'; ctx.stroke();
      }

      // 2. Draw Axes
      const origin = {x:0, y:0, z:0};
      drawLine3D(origin, {x:range, y:0, z:0}, '#ef4444');
      drawLine3D(origin, {x:0, y:range, z:0}, '#22c55e');
      drawLine3D(origin, {x:0, y:0, z:range}, '#3b82f6');

      // 3. Draw Path (History)
      if (path.length > 1) {
          ctx.beginPath();
          path.forEach((p, i) => {
              const proj = project(p, w, h);
              if (i===0) ctx.moveTo(proj.x, proj.y); else ctx.lineTo(proj.x, proj.y);
          });
          // Connect to current pos
          const currZ = activeFunc.f(position.x, position.y);
          const currProj = project({x:position.x, y:currZ, z:position.y}, w, h);
          ctx.lineTo(currProj.x, currProj.y);

          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2;
          ctx.stroke();
      }

      // 4. Draw Current Position (Ball)
      const currentZ = activeFunc.f(position.x, position.y);
      const pos3D = { x: position.x, y: currentZ, z: position.y };
      const ballProj = project(pos3D, w, h);

      // Draw shadow on "floor" (y=min) for depth cue
      const shadowProj = project({ x: position.x, y: -2, z: position.y }, w, h);
      ctx.beginPath(); ctx.moveTo(ballProj.x, ballProj.y); ctx.lineTo(shadowProj.x, shadowProj.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([2,4]); ctx.stroke(); ctx.setLineDash([]);

      // Ball
      ctx.beginPath(); ctx.arc(ballProj.x, ballProj.y, 6, 0, Math.PI*2);
      ctx.fillStyle = dragging === 'BALL' ? '#fde047' : '#fff'; // Yellow when dragging
      ctx.fill();
      ctx.strokeStyle = '#22d3ee'; ctx.stroke();
      
      // Hover/Drag indicator
      if (dragging === 'BALL') {
          ctx.beginPath(); ctx.arc(ballProj.x, ballProj.y, 10, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
      }

      // 5. Draw Gradient Vectors
      const gx = activeFunc.df_dx(position.x, position.y);
      const gy = activeFunc.df_dy(position.x, position.y);
      
      // Helper to draw arrow
      const drawArrow = (dirX: number, dirY: number, color: string, scaleFactor: number = 1) => {
          // Tangent vector on surface approximation
          // We map the 2D gradient (dx, dy) to 3D vector.
          // Rise = directional derivative approx magnitude * slope
          // Simple visualization: Just draw the arrow in 3D space originating from ball
          
          const vecLen = 0.8;
          // To visualize it "on the surface", we just project it out
          const tip = {
              x: position.x + dirX * vecLen,
              y: currentZ + (dirX*gx + dirY*gy) * vecLen, // Tangent plane approximation
              z: position.y + dirY * vecLen
          };
          
          const tipProj = project(tip, w, h);
          
          ctx.beginPath(); ctx.moveTo(ballProj.x, ballProj.y); ctx.lineTo(tipProj.x, tipProj.y);
          ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
          
          // Arrowhead
          const angle = Math.atan2(tipProj.y - ballProj.y, tipProj.x - ballProj.x);
          ctx.beginPath();
          ctx.moveTo(tipProj.x, tipProj.y);
          ctx.lineTo(tipProj.x - 8*Math.cos(angle-Math.PI/6), tipProj.y - 8*Math.sin(angle-Math.PI/6));
          ctx.lineTo(tipProj.x - 8*Math.cos(angle+Math.PI/6), tipProj.y - 8*Math.sin(angle+Math.PI/6));
          ctx.fillStyle = color; ctx.fill();
      };

      // Draw Gradient (Uphill - Red/Pink)
      drawArrow(gx, gy, '#f472b6');

      // Draw Descent Direction (Downhill - Cyan/Green) - This is where we are going!
      drawArrow(-gx, -gy, '#22d3ee');

  }, [activeFunc, position, path, camera, scale, pan, project, dragging]);

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

  // Interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = canvasRef.current!.width;
    const h = canvasRef.current!.height;

    // Check collision with ball
    const currentZ = activeFunc.f(position.x, position.y);
    const ballPos3D = { x: position.x, y: currentZ, z: position.y };
    const proj = project(ballPos3D, w, h);

    const dist = Math.sqrt((mx - proj.x)**2 + (my - proj.y)**2);

    if (dist < 15) {
        setDragging('BALL');
        setIsRunning(false); // Stop algorithm when moving manually
        setPath([]); // Clear path
        setIteration(0);
    } else {
        setDragging('ORBIT');
    }

    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    if (dragging === 'ORBIT') {
        setCamera(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
    } else if (dragging === 'BALL') {
        const sensitivity = 1.0 / scale;
        // Map screen XY to World XZ based on Camera Yaw
        const cosY = Math.cos(camera.y);
        const sinY = Math.sin(camera.y);

        // This approximates moving along the "Floor" relative to view
        const dX = (dx * cosY + dy * sinY) * sensitivity;
        const dY = (dy * cosY - dx * sinY) * sensitivity; // Note: In this component, visual Y (depth) corresponds to state.y

        setPosition(prev => ({
            x: Math.max(-4, Math.min(4, prev.x + dX)),
            y: Math.max(-4, Math.min(4, prev.y + dY))
        }));
    }
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
        <DraggableWindow title="DESCENSO DE GRADIENTE" initialPosition={{x: 20, y: 20}} width="w-80">
            <div className="space-y-4">
                {/* Function Selector */}
                <div className="space-y-1">
                     <label className="text-[9px] font-bold text-slate-500">SUPERFICIE DE COSTO (ERROR)</label>
                     <select 
                        value={funcIndex} 
                        onChange={(e) => setFuncIndex(parseInt(e.target.value))}
                        disabled={isRunning}
                        className="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-700 outline-none hover:border-cyan-400 disabled:opacity-50"
                    >
                        {FUNCTIONS.map((func, i) => (
                            <option key={func.id} value={i}>{func.name}</option>
                        ))}
                    </select>
                </div>

                {/* Parameters */}
                <div className="space-y-2 border-t border-slate-700 pt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>LEARNING RATE (α)</span>
                        <span className="text-cyan-400">{learningRate}</span>
                    </div>
                    <input 
                        type="range" min="0.01" max="0.5" step="0.01" 
                        value={learningRate} 
                        onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                        disabled={isRunning}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsRunning(!isRunning)}
                        className={`flex-1 py-2 rounded font-bold text-xs transition-all ${isRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                    >
                        {isRunning ? '⏸ PAUSAR' : '▶ INICIAR'}
                    </button>
                    <button 
                        onClick={reset}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 hover:text-white"
                    >
                        ↺
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/50 p-2 rounded">
                    <div>ITERACIÓN: <span className="text-white">{iteration}</span></div>
                    <div>ERROR (z): <span className="text-white">{activeFunc.f(position.x, position.y).toFixed(3)}</span></div>
                </div>
            </div>
        </DraggableWindow>

        {/* Legend / Info */}
        <DraggableWindow title="GUÍA TEÓRICA: OPTIMIZACIÓN" initialPosition={{x: 350, y: 500}} width="w-96">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">¿Cómo encuentra la IA el mínimo error?</p>
                <p>Imagina que estás en la montaña a oscuras y quieres bajar.</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li><strong className="text-pink-400">Flecha Rosa ($\nabla f$):</strong> Te dice hacia dónde sube más rápido el terreno.</li>
                    <li><strong className="text-cyan-400">Flecha Cian ($-\nabla f$):</strong> Es la dirección opuesta. La IA da un paso en esta dirección.</li>
                    <li><strong>Learning Rate ($\alpha$):</strong> El tamaño del paso. Si es muy grande, podrías saltarte el valle. Si es muy pequeño, tardarás una eternidad.</li>
                </ul>
                <div className="mt-2 p-2 bg-slate-800 border-l-2 border-yellow-400">
                    <p className="text-[9px] italic">
                        <strong className="text-yellow-400">INTERACCIÓN:</strong> ¡Arrastra la bola blanca con el mouse! En el mapa de "Ondas", prueba soltarla en diferentes laderas para ver cómo cae en distintos valles (Mínimos Locales).
                    </p>
                </div>
            </div>
        </DraggableWindow>

        {/* Navigation Controls */}
        <div className="pointer-events-none"> {/* Wrapper to avoid layout shifts, inner buttons have pointer-events-auto */}
            {onPrevLevel && (
                <div className="absolute bottom-4 left-4 z-50 flex gap-4 pointer-events-auto">
                    <button 
                        onClick={onPrevLevel}
                        className="group flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-pink-500 hover:bg-slate-800 transition-all rounded-l-full shadow-lg"
                    >
                        <div className="w-8 h-8 rounded-full border border-pink-500/50 flex items-center justify-center bg-pink-900/20 group-hover:bg-pink-400/20">
                            <span className="text-pink-500 text-lg transform rotate-180">➔</span>
                        </div>
                        <div className="text-right pl-2 hidden md:block">
                            <span className="block text-[9px] text-slate-500 pixel-font">NIVEL ANTERIOR</span>
                            <span className="block text-xs text-pink-500 font-bold">INTEGRAL</span>
                        </div>
                    </button>
                </div>
            )}
            
            {onNextLevel && (
                <div className="absolute bottom-4 right-4 z-50 flex gap-4 pointer-events-auto">
                    <button 
                        onClick={onNextLevel}
                        className="group flex flex-row-reverse items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-pink-500 hover:bg-slate-800 transition-all rounded-r-full shadow-lg"
                    >
                        <div className="w-8 h-8 rounded-full border border-pink-500/50 flex items-center justify-center bg-pink-900/20 group-hover:bg-pink-400/20">
                            <span className="text-pink-500 animate-pulse text-lg">➔</span>
                        </div>
                        <div className="text-left pr-2 hidden md:block">
                            <span className="block text-[9px] text-slate-500 pixel-font">SIGUIENTE NIVEL</span>
                            <span className="block text-xs text-pink-500 font-bold">ROTACIONAL</span>
                        </div>
                    </button>
                </div>
            )}
        </div>

    </div>
  );
};