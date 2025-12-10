import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface MatrixTransformLevelProps {
    onNextLevel?: () => void;
    onPrevLevel?: () => void;
}

interface Point { x: number; y: number; z?: number; }
interface Matrix2x2 { a: number; b: number; c: number; d: number; }
interface Matrix3x3 { 
    a: number; b: number; c: number; 
    d: number; e: number; f: number; 
    g: number; h: number; i: number; 
}

// 3D Rotation helpers for Camera
const rotateX = (p: Point, angle: number): Point => ({
    x: p.x,
    y: p.y * Math.cos(angle) - (p.z||0) * Math.sin(angle),
    z: p.y * Math.sin(angle) + (p.z||0) * Math.cos(angle)
});
const rotateY = (p: Point, angle: number): Point => ({
    x: p.x * Math.cos(angle) + (p.z||0) * Math.sin(angle),
    y: p.y,
    z: -p.x * Math.sin(angle) + (p.z||0) * Math.cos(angle)
});

export const MatrixTransformLevel: React.FC<MatrixTransformLevelProps> = ({ onNextLevel, onPrevLevel }) => {
  const [is3D, setIs3D] = useState(false);
  
  // 2D State
  const [targetMatrix2D, setTargetMatrix2D] = useState<Matrix2x2>({ a: 1, b: 0, c: 0, d: 1 });
  const [currentMatrix2D, setCurrentMatrix2D] = useState<Matrix2x2>({ a: 1, b: 0, c: 0, d: 1 });

  // 3D State
  const [targetMatrix3D, setTargetMatrix3D] = useState<Matrix3x3>({ 
      a: 1, b: 0, c: 0, 
      d: 0, e: 1, f: 0, 
      g: 0, h: 0, i: 1 
  });
  const [currentMatrix3D, setCurrentMatrix3D] = useState<Matrix3x3>({ 
      a: 1, b: 0, c: 0, 
      d: 0, e: 1, f: 0, 
      g: 0, h: 0, i: 1 
  });

  const [animating, setAnimating] = useState(false);
  
  // View State
  const [scale, setScale] = useState(30);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [camera, setCamera] = useState({ x: -0.4, y: 0.6 }); // Pitch, Yaw

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'PAN' | 'ORBIT' | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  // --- Animation Loop ---
  useEffect(() => {
      let animationFrame: number;
      const animate = () => {
          const lerp = (start: number, end: number) => start + (end - start) * 0.1;
          
          if (is3D) {
             // 3D Animation
             setCurrentMatrix3D(prev => {
                const next = {
                    a: lerp(prev.a, targetMatrix3D.a), b: lerp(prev.b, targetMatrix3D.b), c: lerp(prev.c, targetMatrix3D.c),
                    d: lerp(prev.d, targetMatrix3D.d), e: lerp(prev.e, targetMatrix3D.e), f: lerp(prev.f, targetMatrix3D.f),
                    g: lerp(prev.g, targetMatrix3D.g), h: lerp(prev.h, targetMatrix3D.h), i: lerp(prev.i, targetMatrix3D.i),
                };
                
                const diff = Math.abs(next.a - targetMatrix3D.a) + Math.abs(next.b - targetMatrix3D.b) + Math.abs(next.c - targetMatrix3D.c) +
                             Math.abs(next.d - targetMatrix3D.d) + Math.abs(next.e - targetMatrix3D.e) + Math.abs(next.f - targetMatrix3D.f) +
                             Math.abs(next.g - targetMatrix3D.g) + Math.abs(next.h - targetMatrix3D.h) + Math.abs(next.i - targetMatrix3D.i);

                if (diff < 0.005) {
                    setAnimating(false);
                    return targetMatrix3D;
                }
                return next;
             });
          } else {
             // 2D Animation
             setCurrentMatrix2D(prev => {
                  const next = {
                      a: lerp(prev.a, targetMatrix2D.a), b: lerp(prev.b, targetMatrix2D.b),
                      c: lerp(prev.c, targetMatrix2D.c), d: lerp(prev.d, targetMatrix2D.d),
                  };
                  
                  const diff = Math.abs(next.a - targetMatrix2D.a) + Math.abs(next.b - targetMatrix2D.b) + 
                               Math.abs(next.c - targetMatrix2D.c) + Math.abs(next.d - targetMatrix2D.d);

                  if (diff < 0.005) {
                      setAnimating(false);
                      return targetMatrix2D;
                  }
                  return next;
             });
          }

          if (animating) animationFrame = requestAnimationFrame(animate);
      };
      if (animating) animate();
      return () => cancelAnimationFrame(animationFrame);
  }, [animating, targetMatrix2D, targetMatrix3D, is3D]);

  // --- Transformation Logic ---
  const transform2D = useCallback((p: Point, m: Matrix2x2) => ({
      x: m.a * p.x + m.b * p.y,
      y: m.c * p.x + m.d * p.y
  }), []);

  const transform3D = useCallback((p: Point, m: Matrix3x3) => ({
      x: m.a * p.x + m.b * p.y + m.c * (p.z||0),
      y: m.d * p.x + m.e * p.y + m.f * (p.z||0),
      z: m.g * p.x + m.h * p.y + m.i * (p.z||0)
  }), []);

  // --- 3D Projection Logic ---
  const project = useCallback((p: Point, w: number, h: number) => {
      let r = rotateY(p, camera.y);
      r = rotateX(r, camera.x);
      return {
          x: w/2 + pan.x + r.x * scale,
          y: h/2 + pan.y - r.y * scale, // Y up on screen
          z: r.z
      };
  }, [camera, pan, scale]);


  // --- Main Draw Function ---
  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const w = canvas.width; 
      const h = canvas.height;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);

      const time = Date.now();

      if (!is3D) {
          // --- 2D RENDERING ---
          const cx = w/2 + pan.x; 
          const cy = h/2 + pan.y;

          const drawLine = (p1: Point, p2: Point, color: string, width = 1) => {
             const t1 = transform2D(p1, currentMatrix2D);
             const t2 = transform2D(p2, currentMatrix2D);
             ctx.beginPath();
             ctx.moveTo(cx + t1.x * scale, cy - t1.y * scale);
             ctx.lineTo(cx + t2.x * scale, cy - t2.y * scale);
             ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
          };

          // Grid
          const G = 15;
          for(let i=-G; i<=G; i++) {
              if (i===0) continue;
              drawLine({x:i, y:-G}, {x:i, y:G}, '#1e293b');
              drawLine({x:-G, y:i}, {x:G, y:i}, '#1e293b');
          }
          // Axes
          drawLine({x:0, y:-G}, {x:0, y:G}, '#334155', 2);
          drawLine({x:-G, y:0}, {x:G, y:0}, '#334155', 2);

          // Basis Vectors
          const iHat = transform2D({x:1, y:0}, currentMatrix2D);
          const jHat = transform2D({x:0, y:1}, currentMatrix2D);

          // --- ANIMATED DETERMINANT AREA (2D) ---
          const det = currentMatrix2D.a * currentMatrix2D.d - currentMatrix2D.b * currentMatrix2D.c;
          const alpha = 0.2 + 0.1 * Math.sin(time / 200); // Pulse effect
          const color = det >= 0 ? `0, 255, 255` : `255, 99, 132`; // Cyan or Red/Pink

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + iHat.x*scale, cy - iHat.y*scale);
          ctx.lineTo(cx + (iHat.x+jHat.x)*scale, cy - (iHat.y+jHat.y)*scale);
          ctx.lineTo(cx + jHat.x*scale, cy - jHat.y*scale);
          ctx.fillStyle = `rgba(${color}, ${alpha})`; 
          ctx.fill();
          ctx.strokeStyle = `rgba(${color}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4,4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Determinant Label in Center
          const centerX = cx + (iHat.x + jHat.x) * scale * 0.5;
          const centerY = cy - (iHat.y + jHat.y) * scale * 0.5;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Area: ${det.toFixed(2)}`, centerX, centerY + 4);
          ctx.textAlign = 'left';

          const drawArrow = (v: Point, color: string) => {
              const ex = cx + v.x * scale, ey = cy - v.y * scale;
              ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
              ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
              // Tip
              const angle = Math.atan2(ey-cy, ex-cx);
              ctx.beginPath(); ctx.moveTo(ex, ey);
              ctx.lineTo(ex - 10*Math.cos(angle-Math.PI/6), ey - 10*Math.sin(angle-Math.PI/6));
              ctx.lineTo(ex - 10*Math.cos(angle+Math.PI/6), ey - 10*Math.sin(angle+Math.PI/6));
              ctx.fillStyle = color; ctx.fill();
          };

          drawArrow(iHat, '#ef4444'); // X = Red
          drawArrow(jHat, '#22c55e'); // Y = Green

      } else {
          // --- 3D RENDERING ---
          
          // Render Queue for Painter's Algorithm (Sort by Z)
          interface RenderItem {
            type: 'LINE' | 'ARROW' | 'FACE';
            z: number;
            draw: () => void;
          }
          const renderList: RenderItem[] = [];

          const m = currentMatrix3D;
          const det3D = m.a*(m.e*m.i - m.f*m.h) - m.b*(m.d*m.i - m.f*m.g) + m.c*(m.d*m.h - m.e*m.g);

          // Helper to add transformed line
          const addLine = (p1: Point, p2: Point, color: string, width = 1, dashed = false) => {
             const t1 = transform3D(p1, currentMatrix3D);
             const t2 = transform3D(p2, currentMatrix3D);
             const proj1 = project(t1, w, h);
             const proj2 = project(t2, w, h);

             const avgZ = (proj1.z + proj2.z) / 2;

             renderList.push({
                 type: 'LINE',
                 z: avgZ,
                 draw: () => {
                     ctx.beginPath();
                     ctx.moveTo(proj1.x, proj1.y);
                     ctx.lineTo(proj2.x, proj2.y);
                     ctx.strokeStyle = color; ctx.lineWidth = width;
                     if(dashed) ctx.setLineDash([2,4]); else ctx.setLineDash([]);
                     ctx.stroke(); ctx.setLineDash([]);
                 }
             });
          };

          // Helper to add Arrow (Vector)
          const addVector = (v: Point, color: string, label: string) => {
             const tOrigin = transform3D({x:0, y:0, z:0}, currentMatrix3D);
             const tEnd = transform3D(v, currentMatrix3D);
             const pOrigin = project(tOrigin, w, h);
             const pEnd = project(tEnd, w, h);
             
             const avgZ = (pOrigin.z + pEnd.z) / 2;

             renderList.push({
                 type: 'ARROW',
                 z: avgZ - 100, // Bias to draw on top
                 draw: () => {
                     ctx.beginPath(); ctx.moveTo(pOrigin.x, pOrigin.y); ctx.lineTo(pEnd.x, pEnd.y);
                     ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
                     // Tip
                     const angle = Math.atan2(pEnd.y - pOrigin.y, pEnd.x - pOrigin.x);
                     ctx.beginPath(); 
                     ctx.moveTo(pEnd.x, pEnd.y);
                     ctx.lineTo(pEnd.x - 10*Math.cos(angle-Math.PI/6), pEnd.y - 10*Math.sin(angle-Math.PI/6));
                     ctx.lineTo(pEnd.x - 10*Math.cos(angle+Math.PI/6), pEnd.y - 10*Math.sin(angle+Math.PI/6));
                     ctx.fillStyle = color; ctx.fill();
                     if (label) { ctx.fillStyle = color; ctx.font = 'bold 12px monospace'; ctx.fillText(label, pEnd.x+10, pEnd.y); }
                 }
             });
          };

          // 1. Generate Grid Lines (A cube lattice centered at origin)
          const limit = 3;
          // Lines parallel to X
          for(let y=-limit; y<=limit; y++) {
              for(let z=-limit; z<=limit; z++) {
                  const color = (y===0 && z===0) ? '#ef4444' : '#1e293b'; // Main Axis Red
                  const width = (y===0 && z===0) ? 2 : 1;
                  addLine({x: -limit, y, z}, {x: limit, y, z}, color, width);
              }
          }
          // Lines parallel to Y
          for(let x=-limit; x<=limit; x++) {
              for(let z=-limit; z<=limit; z++) {
                  const color = (x===0 && z===0) ? '#22c55e' : '#1e293b'; // Main Axis Green
                  const width = (x===0 && z===0) ? 2 : 1;
                  addLine({x, y: -limit, z}, {x, y: limit, z}, color, width);
              }
          }
          // Lines parallel to Z
          for(let x=-limit; x<=limit; x++) {
              for(let y=-limit; y<=limit; y++) {
                  const color = (x===0 && y===0) ? '#3b82f6' : '#1e293b'; // Main Axis Blue
                  const width = (x===0 && y===0) ? 2 : 1;
                  addLine({x, y, z: -limit}, {x, y, z: limit}, color, width);
              }
          }

          // 2. Add Basis Vectors
          addVector({x:1, y:0, z:0}, '#ef4444', 'i');
          addVector({x:0, y:1, z:0}, '#22c55e', 'j');
          addVector({x:0, y:0, z:1}, '#3b82f6', 'k');

          // 3. Add Unit Cube Faces (for reference of 1 unit volume)
          const corners = [
            {x:0,y:0,z:0}, {x:1,y:0,z:0}, {x:1,y:1,z:0}, {x:0,y:1,z:0},
            {x:0,y:0,z:1}, {x:1,y:0,z:1}, {x:1,y:1,z:1}, {x:0,y:1,z:1}
          ];
          
          // Compute transformed corners first to reuse
          const tCorners = corners.map(p => {
              const t = transform3D(p, currentMatrix3D);
              return project(t, w, h);
          });

          // Define faces (indices into corners array)
          const faces = [
              [0,1,2,3], // Back (z=0)
              [4,5,6,7], // Front (z=1)
              [0,4,7,3], // Left (x=0)
              [1,5,6,2], // Right (x=1)
              [0,1,5,4], // Bottom (y=0)
              [3,2,6,7]  // Top (y=1)
          ];

          faces.forEach(faceIndices => {
              const pts = faceIndices.map(i => tCorners[i]);
              const avgZ = pts.reduce((sum, p) => sum + p.z, 0) / 4;

              renderList.push({
                  type: 'FACE',
                  z: avgZ + 50, // Bias slightly behind arrows
                  draw: () => {
                      ctx.beginPath();
                      ctx.moveTo(pts[0].x, pts[0].y);
                      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
                      ctx.closePath();
                      
                      const alpha3D = 0.15 + 0.05 * Math.sin(time / 300);
                      const color = det3D >= 0 ? `0, 255, 255` : `255, 99, 132`;
                      ctx.fillStyle = `rgba(${color}, ${alpha3D})`;
                      ctx.fill();
                      ctx.strokeStyle = `rgba(${color}, 0.3)`;
                      ctx.lineWidth = 1;
                      ctx.stroke();
                  }
              });
          });

          // Sort and Draw
          renderList.sort((a, b) => b.z - a.z); // Draw furthest first
          renderList.forEach(item => item.draw());
      }

  }, [is3D, currentMatrix2D, currentMatrix3D, scale, pan, transform2D, transform3D, project]);

  // Handle Resize and Initial Draw
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
      // Continuous animation loop for the pulse effect
      let raf: number;
      const loop = () => {
          draw();
          raf = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(raf);
  }, [draw]);

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(is3D ? 'ORBIT' : 'PAN');
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    
    if (dragging === 'PAN') {
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    } else {
        setCamera(c => ({ x: c.x + dy * 0.01, y: c.y + dx * 0.01 }));
    }
  };

  const handleMouseUp = () => setDragging(null);

  const handleWheel = (e: React.WheelEvent) => {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(prev => Math.max(5, Math.min(200, prev * zoomFactor)));
  };

  const setPreset = (type: string) => {
      setAnimating(true);
      if (!is3D) {
        // 2D Presets
        switch(type) {
            case 'IDENTITY': setTargetMatrix2D({a:1, b:0, c:0, d:1}); break;
            case 'SHEAR': setTargetMatrix2D({a:1, b:1, c:0, d:1}); break;
            case 'ROTATE': setTargetMatrix2D({a:0, b:-1, c:1, d:0}); break;
            case 'SCALE': setTargetMatrix2D({a:2, b:0, c:0, d:2}); break;
            case 'REFLECT': setTargetMatrix2D({a:-1, b:0, c:0, d:1}); break;
            case 'COLLAPSE': setTargetMatrix2D({a:1, b:1, c:1, d:1}); break; 
        }
      } else {
        // 3D Presets
        switch(type) {
            case 'IDENTITY': setTargetMatrix3D({a:1,b:0,c:0, d:0,e:1,f:0, g:0,h:0,i:1}); break;
            case 'SCALE': setTargetMatrix3D({a:1.5,b:0,c:0, d:0,e:1.5,f:0, g:0,h:0,i:1.5}); break;
            case 'ROTX': setTargetMatrix3D({a:1,b:0,c:0, d:0,e:0,f:-1, g:0,h:1,i:0}); break; // 90 deg
            case 'ROTY': setTargetMatrix3D({a:0,b:0,c:1, d:0,e:1,f:0, g:-1,h:0,i:0}); break; // 90 deg
            case 'ROTZ': setTargetMatrix3D({a:0,b:-1,c:0, d:1,e:0,f:0, g:0,h:0,i:1}); break; // 90 deg
            case 'SHEAR': setTargetMatrix3D({a:1,b:0.5,c:0, d:0,e:1,f:0, g:0,h:0,i:1}); break; // Shear XY
            case 'COLLAPSE': setTargetMatrix3D({a:1,b:0,c:0, d:0,e:1,f:0, g:0,h:0,i:0}); break; // Flatten Z
        }
      }
  };

  // Input Helpers
  const handleScroll2D = (key: keyof Matrix2x2) => (e: React.WheelEvent) => {
      e.stopPropagation();
      setTargetMatrix2D(prev => ({...prev, [key]: Number((prev[key] + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(1)) }));
      setAnimating(true);
  };
  const update2D = (key: keyof Matrix2x2, val: string) => {
      setTargetMatrix2D(prev => ({...prev, [key]: parseFloat(val)||0}));
      setAnimating(true);
  };

  const handleScroll3D = (key: keyof Matrix3x3) => (e: React.WheelEvent) => {
      e.stopPropagation();
      setTargetMatrix3D(prev => ({...prev, [key]: Number((prev[key] + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(1)) }));
      setAnimating(true);
  };
  const update3D = (key: keyof Matrix3x3, val: string) => {
      setTargetMatrix3D(prev => ({...prev, [key]: parseFloat(val)||0}));
      setAnimating(true);
  };

  // Determinant Calculations
  const det2D = currentMatrix2D.a * currentMatrix2D.d - currentMatrix2D.b * currentMatrix2D.c;
  const m = currentMatrix3D;
  const det3D = m.a*(m.e*m.i - m.f*m.h) - m.b*(m.d*m.i - m.f*m.g) + m.c*(m.d*m.h - m.e*m.g);

  // Button styles to replace <style jsx>
  const btnBase = "p-1 rounded text-[10px] text-white transition-all duration-200";
  const btnDefault = `${btnBase} bg-slate-700 hover:bg-slate-600 hover:text-cyan-400`;
  const btnCollapse = `${btnBase} text-red-300 border border-red-900 bg-red-900/20 hover:bg-red-900/40 hover:text-red-200`;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-move" 
         onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        <DraggableWindow title={`MATRIZ DE TRANSFORMACIÓN ${is3D ? '(3D)' : '(2D)'}`} initialPosition={{x: 20, y: 20}} width="w-auto">
            <div className="space-y-4 px-2">
                
                {/* Mode Toggle */}
                <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                     <button onClick={() => { setIs3D(false); setScale(30); setPan({x:0,y:0}); }}
                         className={`flex-1 py-1 text-[10px] font-bold transition-colors ${!is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                         2D (CUADRADO)
                     </button>
                     <button onClick={() => { setIs3D(true); setScale(60); setPan({x:0,y:0}); }}
                         className={`flex-1 py-1 text-[10px] font-bold transition-colors ${is3D ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                         3D (R³)
                     </button>
                </div>

                {/* Visual Matrix Input */}
                <div className="flex items-center justify-center gap-2 p-2 bg-slate-950/50 rounded-lg border border-slate-800">
                    <span className="text-xl font-serif font-bold text-slate-500 italic">M =</span>
                    
                    <div className="flex items-stretch">
                        <div className="w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-md my-1"></div>
                        
                        {!is3D ? (
                            /* 2x2 Input */
                            <div className="grid grid-cols-2 gap-2 p-2">
                                <div className="flex flex-col gap-2">
                                    <input type="number" step="0.1" value={targetMatrix2D.a.toFixed(1)} onChange={e => update2D('a', e.target.value)} onWheel={handleScroll2D('a')} className="w-20 bg-slate-800 text-center text-red-400 font-bold p-1 rounded focus:border-red-500 outline-none border border-transparent" />
                                    <input type="number" step="0.1" value={targetMatrix2D.c.toFixed(1)} onChange={e => update2D('c', e.target.value)} onWheel={handleScroll2D('c')} className="w-20 bg-slate-800 text-center text-red-400 font-bold p-1 rounded focus:border-red-500 outline-none border border-transparent" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input type="number" step="0.1" value={targetMatrix2D.b.toFixed(1)} onChange={e => update2D('b', e.target.value)} onWheel={handleScroll2D('b')} className="w-20 bg-slate-800 text-center text-green-400 font-bold p-1 rounded focus:border-green-500 outline-none border border-transparent" />
                                    <input type="number" step="0.1" value={targetMatrix2D.d.toFixed(1)} onChange={e => update2D('d', e.target.value)} onWheel={handleScroll2D('d')} className="w-20 bg-slate-800 text-center text-green-400 font-bold p-1 rounded focus:border-green-500 outline-none border border-transparent" />
                                </div>
                            </div>
                        ) : (
                            /* 3x3 Input */
                            <div className="grid grid-cols-3 gap-1 p-2">
                                {/* Col 1 (Red X) */}
                                <div className="flex flex-col gap-1">
                                    {['a','d','g'].map(k => (
                                        <input key={k} type="number" step="0.5" value={targetMatrix3D[k as keyof Matrix3x3].toFixed(1)} 
                                            onChange={e => update3D(k as keyof Matrix3x3, e.target.value)} onWheel={handleScroll3D(k as keyof Matrix3x3)} 
                                            className="w-16 bg-slate-800 text-center text-red-400 font-bold text-xs p-1 rounded border border-transparent focus:border-red-500 outline-none" />
                                    ))}
                                </div>
                                {/* Col 2 (Green Y) */}
                                <div className="flex flex-col gap-1">
                                    {['b','e','h'].map(k => (
                                        <input key={k} type="number" step="0.5" value={targetMatrix3D[k as keyof Matrix3x3].toFixed(1)} 
                                            onChange={e => update3D(k as keyof Matrix3x3, e.target.value)} onWheel={handleScroll3D(k as keyof Matrix3x3)} 
                                            className="w-16 bg-slate-800 text-center text-green-400 font-bold text-xs p-1 rounded border border-transparent focus:border-green-500 outline-none" />
                                    ))}
                                </div>
                                {/* Col 3 (Blue Z) */}
                                <div className="flex flex-col gap-1">
                                    {['c','f','i'].map(k => (
                                        <input key={k} type="number" step="0.5" value={targetMatrix3D[k as keyof Matrix3x3].toFixed(1)} 
                                            onChange={e => update3D(k as keyof Matrix3x3, e.target.value)} onWheel={handleScroll3D(k as keyof Matrix3x3)} 
                                            className="w-16 bg-slate-800 text-center text-blue-400 font-bold text-xs p-1 rounded border border-transparent focus:border-blue-500 outline-none" />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-md my-1"></div>
                    </div>
                </div>

                {/* Presets */}
                {!is3D ? (
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setPreset('IDENTITY')} className={btnDefault}>REINICIAR</button>
                        <button onClick={() => setPreset('SHEAR')} className={btnDefault}>CIZALLA</button>
                        <button onClick={() => setPreset('ROTATE')} className={btnDefault}>ROTAR 90°</button>
                        <button onClick={() => setPreset('SCALE')} className={btnDefault}>ESCALAR</button>
                        <button onClick={() => setPreset('REFLECT')} className={btnDefault}>REFLEXIÓN</button>
                        <button onClick={() => setPreset('COLLAPSE')} className={btnCollapse}>COLAPSO</button>
                    </div>
                ) : (
                     <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setPreset('IDENTITY')} className={btnDefault}>REINICIAR</button>
                        <button onClick={() => setPreset('SCALE')} className={btnDefault}>ESCALAR</button>
                        <button onClick={() => setPreset('SHEAR')} className={btnDefault}>CIZALLA</button>
                        <button onClick={() => setPreset('ROTX')} className={btnDefault}>ROTAR X</button>
                        <button onClick={() => setPreset('ROTY')} className={btnDefault}>ROTAR Y</button>
                        <button onClick={() => setPreset('ROTZ')} className={btnDefault}>ROTAR Z</button>
                        <button onClick={() => setPreset('COLLAPSE')} className={`col-span-3 ${btnCollapse}`}>APLANAR Z (COLAPSO)</button>
                    </div>
                )}
            </div>
        </DraggableWindow>

        {/* Legend Window - NEW */}
        <DraggableWindow title="GUÍA TEÓRICA: TRANSFORMACIONES" initialPosition={{x: 20, y: 480}} width="w-96">
            <div className="text-xs text-slate-400 font-mono space-y-2">
                <p className="text-white font-bold">Concepto:</p>
                <p>Una matriz no es solo una tabla de números: es una <span className="text-cyan-400">instrucción de deformación</span> del espacio.</p>
                <p className="text-white font-bold mt-2">Observa:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li>Las líneas de cuadrícula siempre permanecen <strong className="text-white">paralelas</strong> y <strong className="text-white">equidistantes</strong> (por eso es lineal).</li>
                    <li>Las columnas de la matriz te dicen dónde aterrizan los vectores base <span className="text-red-400">i (x)</span>, <span className="text-green-400">j (y)</span> y <span className="text-blue-400">k (z)</span> después del movimiento.</li>
                    <li>El <strong className="text-white">Determinante</strong> mide cómo cambia el área (2D) o el volumen (3D). Si es negativo, el espacio se ha invertido como un espejo.</li>
                </ul>
                <div className="border-t border-slate-700 pt-2 flex justify-between items-center mt-2">
                    <span>Determinante actual:</span>
                    <span className={`text-lg font-bold ${(is3D ? Math.abs(det3D) : Math.abs(det2D)) < 0.1 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                        {is3D ? det3D.toFixed(2) : det2D.toFixed(2)}
                    </span>
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
                        <span className="block text-xs text-cyan-400 font-bold">CROSS</span>
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
                        <span className="block text-xs text-cyan-400 font-bold">COMPOSICIÓN</span>
                    </div>
                </button>
            )}
        </div>
    </div>
  );
};