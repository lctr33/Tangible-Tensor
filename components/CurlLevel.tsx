import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow'; 

interface CurlLevelProps {
  onPrevLevel?: () => void;
}

interface Point { x: number; y: number; z: number; }

// --- VECTOR FIELDS ---
const FIELDS = [
    {
        id: 'vortex',
        name: 'Remolino (Vortex)',
        desc: 'Un campo clásico con rotación pura. El agua gira alrededor del centro.',
        Fx: (x: number, y: number) => -y,
        Fy: (x: number, y: number) => x,
        dFy_dx: (x: number, y: number) => 1, // d(x)/dx
        dFx_dy: (x: number, y: number) => -1, // d(-y)/dy
        eq: 'F = <-y, x>',
        curl_const: 2 // 1 - (-1)
    },
    {
        id: 'shear',
        name: 'Río (Cizalla)',
        desc: 'Las líneas son rectas, pero la velocidad varía. Imagina una tabla flotando: un lado va más rápido que el otro, haciéndola girar.',
        Fx: (x: number, y: number) => y, // Speed increases with Y
        Fy: (x: number, y: number) => 0,
        dFy_dx: (x: number, y: number) => 0,
        dFx_dy: (x: number, y: number) => 1,
        eq: 'F = <y, 0>',
        curl_const: -1 // 0 - 1
    },
    {
        id: 'expansion',
        name: 'Explosión (Divergencia)',
        desc: 'Todo se aleja del centro. Hay movimiento, pero NO hay giro. La rueda no rota.',
        Fx: (x: number, y: number) => x,
        Fy: (x: number, y: number) => y,
        dFy_dx: (x: number, y: number) => 0,
        dFx_dy: (x: number, y: number) => 0,
        eq: 'F = <x, y>',
        curl_const: 0
    }
];

// --- 3D ENGINE ---
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

export const CurlLevel: React.FC<CurlLevelProps> = ({ onPrevLevel }) => {
  // State
  const [fieldIndex, setFieldIndex] = useState(0);
  const [position, setPosition] = useState({ x: 1.5, y: 1.5 }); // Probe position
  const [is3D, setIs3D] = useState(false);
  
  // Animation State for Paddlewheel
  const [paddleAngle, setPaddleAngle] = useState(0);

  // View State
  const [camera, setCamera] = useState({ x: -0.6, y: 0.5 });
  const [scale, setScale] = useState(50);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'ORBIT' | 'PROBE' | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  const activeField = FIELDS[fieldIndex];

  // Calculate Curl at current position
  // Curl 2D = dFy/dx - dFx/dy
  const term1 = activeField.dFy_dx(position.x, position.y);
  const term2 = activeField.dFx_dy(position.x, position.y);
  const curlVal = term1 - term2;

  // Animation Loop
  useEffect(() => {
      let raf: number;
      const loop = () => {
          // Rotate the paddlewheel based on curl value
          // Speed proportional to curl
          setPaddleAngle(prev => prev + curlVal * 0.05);
          raf = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(raf);
  }, [curlVal]);

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

  // Draw Function
  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width; 
      const h = canvas.height;

      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

      // 1. Draw Vector Field Grid
      const range = 3.5;
      const step = 0.5;

      const drawArrow3D = (pos: Point, vec: Point, color: string) => {
          const start = project(pos, w, h);
          // Scale down the vector for visualization
          const vecScaled = { x: vec.x * 0.2, y: vec.y * 0.2, z: vec.z * 0.2 };
          // Visualize vector on the plane (or 3D if vector has Z)
          const end3D = { x: pos.x + vecScaled.x, y: pos.y + vecScaled.y, z: pos.z + vecScaled.z };
          const end = project(end3D, w, h);

          ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
          
          // Arrowhead
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = 3;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI/6), end.y - headLen * Math.sin(angle - Math.PI/6));
          ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI/6), end.y - headLen * Math.sin(angle + Math.PI/6));
          ctx.fillStyle = color; ctx.fill();
      };

      for(let x = -range; x <= range; x += step) {
          for(let y = -range; y <= range; y += step) {
              const fx = activeField.Fx(x,y);
              const fy = activeField.Fy(x,y);
              // Draw field on Z=0 plane (visually floor)
              // Note: In our 3D engine, Y is Up. So the plane is X-Z.
              // Wait, previous levels used Y as depth? Let's check logic.
              // In GradientDescent: x=x, y=height, z=y(depth).
              // Let's match that. Input coordinates are (x, z_depth).
              // F vector is <Fx, Fy>.
              // So in 3D world: pos = {x: x, y: 0, z: y}. Vector = {x: fx, y: 0, z: fy}.
              
              const pos3D = { x: x, y: 0, z: y };
              const vec3D = { x: fx, y: 0, z: fy };
              
              // Color based on magnitude
              const mag = Math.sqrt(fx*fx + fy*fy);
              const opacity = Math.min(1, mag / 3);
              const color = `rgba(100, 116, 139, ${opacity})`;

              drawArrow3D(pos3D, vec3D, color);
          }
      }

      // 2. Draw Probe (Paddlewheel)
      const probePos3D = { x: position.x, y: 0, z: position.y };
      const projProbe = project(probePos3D, w, h);

      // Draw shadow/base
      ctx.beginPath(); 
      // Ellipse approximation
      ctx.ellipse(projProbe.x, projProbe.y, 10, 5, 0, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();

      // Draw The "Wheel"
      // We simulate rotation by drawing lines rotating around center
      const wheelRadius = 15;
      const numBlades = 4;
      
      // Determine color based on Curl direction
      // Positive (CCW) = Green, Negative (CW) = Pink, Zero = Gray
      let wheelColor = '#94a3b8';
      if (curlVal > 0.1) wheelColor = '#4ade80'; // Green
      if (curlVal < -0.1) wheelColor = '#f472b6'; // Pink

      // Draw blades
      for(let i=0; i<numBlades; i++) {
          const theta = paddleAngle + (i * (Math.PI*2 / numBlades));
          
          // In 2D view, simple rotation. In 3D, we project the blade tips.
          // Blade tip in local coordinates
          const tipLocalX = Math.cos(theta) * 0.3; // 0.3 world units
          const tipLocalZ = Math.sin(theta) * 0.3;
          
          const tip3D = { x: position.x + tipLocalX, y: 0, z: position.y + tipLocalZ };
          const projTip = project(tip3D, w, h);

          ctx.beginPath();
          ctx.moveTo(projProbe.x, projProbe.y);
          ctx.lineTo(projTip.x, projTip.y);
          ctx.strokeStyle = wheelColor;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw little paddle at end
          ctx.beginPath();
          ctx.arc(projTip.x, projTip.y, 2, 0, Math.PI*2);
          ctx.fillStyle = '#fff'; ctx.fill();
      }

      // Center Hub
      ctx.beginPath(); ctx.arc(projProbe.x, projProbe.y, 4, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = wheelColor; ctx.stroke();

      // 3. Draw Curl Vector (In 3D only)
      if (is3D && Math.abs(curlVal) > 0.1) {
          // Curl points UP (Y) or DOWN (-Y)
          const vecStart = probePos3D;
          const vecEnd = { x: position.x, y: curlVal * 0.5, z: position.y }; // Scale height
          
          const pStart = project(vecStart, w, h);
          const pEnd = project(vecEnd, w, h);

          ctx.beginPath(); ctx.moveTo(pStart.x, pStart.y); ctx.lineTo(pEnd.x, pEnd.y);
          ctx.strokeStyle = wheelColor; ctx.lineWidth = 4; ctx.stroke();
          
          // Arrowhead
          const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
          ctx.beginPath();
          ctx.moveTo(pEnd.x, pEnd.y);
          ctx.lineTo(pEnd.x - 8*Math.cos(angle-Math.PI/6), pEnd.y - 8*Math.sin(angle-Math.PI/6));
          ctx.lineTo(pEnd.x - 8*Math.cos(angle+Math.PI/6), pEnd.y - 8*Math.sin(angle+Math.PI/6));
          ctx.fillStyle = wheelColor; ctx.fill();

          // Label
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
          ctx.fillText("ROT", pEnd.x+5, pEnd.y);
      }

      // Draw Grid Frame
      const drawLine = (p1: Point, p2: Point, color: string) => {
          const pr1 = project(p1, w, h); const pr2 = project(p2, w, h);
          ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(pr2.x, pr2.y);
          ctx.strokeStyle = color; ctx.stroke();
      };
      drawLine({x:-range, y:0, z:-range}, {x:range, y:0, z:-range}, '#334155');
      drawLine({x:-range, y:0, z:range}, {x:range, y:0, z:range}, '#334155');
      drawLine({x:-range, y:0, z:-range}, {x:-range, y:0, z:range}, '#334155');
      drawLine({x:range, y:0, z:-range}, {x:range, y:0, z:range}, '#334155');

  }, [activeField, position, paddleAngle, is3D, camera, scale, pan, project, curlVal]);

  // Handlers
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

      // Check collision with probe
      const probePos3D = { x: position.x, y: 0, z: position.y };
      const proj = project(probePos3D, w, h);
      
      if (Math.hypot(mx - proj.x, my - proj.y) < 30) {
          setDragging('PROBE');
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
      } else {
          // Drag Probe on Floor (XZ plane)
          // Simplified projection inverse for dragging
          const sensitivity = 1.0 / scale;
          const cosY = Math.cos(camera.y);
          const sinY = Math.sin(camera.y);
          
          // Rotate input vector by camera yaw to match ground movement
          const dX = (dx * cosY + dy * sinY) * sensitivity;
          const dZ = (dy * cosY - dx * sinY) * sensitivity;

          setPosition(prev => ({
              x: Math.max(-3.5, Math.min(3.5, prev.x + dX)),
              y: Math.max(-3.5, Math.min(3.5, prev.y + dZ))
          }));
      }
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-move" 
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* CONTROLS */}
        <DraggableWindow title="ROTACIONAL (CURL)" initialPosition={{x:20, y:20}} width="w-80">
            <div className="space-y-4">
                {/* Selector */}
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500">CAMPO VECTORIAL</label>
                    <select 
                        value={fieldIndex} 
                        onChange={(e) => setFieldIndex(parseInt(e.target.value))}
                        className="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-700 outline-none hover:border-cyan-400"
                    >
                        {FIELDS.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
                    </select>
                </div>

                {/* View Toggles */}
                <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                    <button onClick={() => { setIs3D(false); setCamera({x:-0.6, y:0.5}); }}
                        className={`flex-1 py-1 text-[10px] font-bold transition-colors ${!is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                        2D (PLANO)
                    </button>
                    <button onClick={() => { setIs3D(true); setCamera({x:-0.6, y:0.5}); }}
                        className={`flex-1 py-1 text-[10px] font-bold transition-colors ${is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                        3D (VECTOR)
                    </button>
                </div>

                {/* Math Display */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2 text-center">
                    <div className="text-[10px] text-slate-500 font-mono">VALOR DEL ROTACIONAL</div>
                    <div className={`text-3xl font-bold pixel-font ${Math.abs(curlVal) < 0.1 ? 'text-slate-500' : (curlVal > 0 ? 'text-green-400' : 'text-pink-400')}`}>
                        {curlVal.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                        {curlVal > 0.1 ? "Giro Anti-horario (Positivo)" : curlVal < -0.1 ? "Giro Horario (Negativo)" : "Sin Rotación"}
                    </div>
                </div>

                <div className="text-xs text-slate-400 italic border-t border-slate-700 pt-2">
                    {activeField.desc}
                </div>
            </div>
        </DraggableWindow>

        {/* MATH BREAKDOWN */}
        <DraggableWindow title="CÁLCULO MATEMÁTICO" initialPosition={{x: 20, y: 400}} width="w-80">
            <div className="space-y-3 font-mono text-xs">
                 <div className="flex justify-center items-center gap-2 p-2 bg-slate-800 rounded text-sm text-white">
                     <span>Rot</span>
                     <span>=</span>
                     <div className="flex flex-col items-center">
                         <span className="border-b border-white mb-0.5">∂Fy</span>
                         <span>∂x</span>
                     </div>
                     <span>-</span>
                     <div className="flex flex-col items-center">
                         <span className="border-b border-white mb-0.5">∂Fx</span>
                         <span>∂y</span>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 text-center">
                     <div>
                         <span className="block text-[9px] text-cyan-400">∂Fy/∂x</span>
                         <span className="text-white">{term1.toFixed(1)}</span>
                         <p className="text-[8px] text-slate-500 mt-1">¿Cuánto cambia la fuerza Y al moverte en X?</p>
                     </div>
                     <div>
                         <span className="block text-[9px] text-pink-400">∂Fx/∂y</span>
                         <span className="text-white">{term2.toFixed(1)}</span>
                         <p className="text-[8px] text-slate-500 mt-1">¿Cuánto cambia la fuerza X al moverte en Y?</p>
                     </div>
                 </div>
                 
                 <div className="bg-slate-950 p-2 rounded text-center border border-slate-800 mt-2">
                     <span className="text-cyan-400">{term1.toFixed(1)}</span>
                     <span className="text-slate-500 mx-2">-</span>
                     <span className="text-pink-400">({term2.toFixed(1)})</span>
                     <span className="text-slate-500 mx-2">=</span>
                     <span className="text-white font-bold">{curlVal.toFixed(1)}</span>
                 </div>
            </div>
        </DraggableWindow>

        {/* Theoretical Guide */}
        <DraggableWindow title="GUÍA TEÓRICA: ROTACIONAL" initialPosition={{x: 350, y: 500}} width="w-96">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">La "Rueda de Paletas" (Paddlewheel)</p>
                <p>El rotacional mide cuánto giraría un objeto microscópico colocado en el fluido.</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li><strong className="text-white">Remolino:</strong> Es obvio. Todo gira.</li>
                    <li><strong className="text-white">Río (Shear):</strong> ¡Contraintuitivo! El agua va recta, pero la rueda gira. ¿Por qué? Porque el agua golpea las paletas de arriba más fuerte que las de abajo.</li>
                    <li><strong className="text-white">3D:</strong> El rotacional es en realidad un <span className="text-green-400">Vector</span> que sale de la pantalla (eje Z). Usa la vista 3D para verlo.</li>
                </ul>
            </div>
        </DraggableWindow>

        {/* Nav */}
        {onPrevLevel && (
            <div className="absolute bottom-4 left-4 z-50 flex gap-4">
                <button 
                    onClick={onPrevLevel}
                    className="group flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-pink-500 hover:bg-slate-800 transition-all rounded-l-full shadow-lg"
                >
                    <div className="w-8 h-8 rounded-full border border-pink-500/50 flex items-center justify-center bg-pink-900/20 group-hover:bg-pink-400/20">
                        <span className="text-pink-500 text-lg transform rotate-180">➔</span>
                    </div>
                    <div className="text-right pl-2 hidden md:block">
                        <span className="block text-[9px] text-slate-500 pixel-font">NIVEL ANTERIOR</span>
                        <span className="block text-xs text-pink-500 font-bold">GRADIENTE</span>
                    </div>
                </button>
            </div>
        )}

    </div>
  );
};
