import React, { useState, useRef, useEffect } from 'react';

interface DraggableWindowProps {
  title: string;
  initialPosition: { x: number; y: number };
  children: React.ReactNode;
  width?: string;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({ 
  title, 
  initialPosition, 
  children,
  width = "w-64"
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if left click
    if (e.button !== 0) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      // Basic bounds checking
      const maxX = window.innerWidth - 50;
      const maxY = window.innerHeight - 50;
      
      setPosition({
        x: Math.min(Math.max(-100, newX), maxX),
        y: Math.min(Math.max(-100, newY), maxY)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={windowRef}
      onMouseDown={(e) => e.stopPropagation()} // CRITICAL: Stop event from reaching the canvas
      onWheel={(e) => e.stopPropagation()} // CRITICAL: Stop zoom on canvas when scrolling window
      style={{ 
        left: position.x, 
        top: position.y,
        position: 'absolute',
        zIndex: isDragging ? 50 : 40
      }}
      className={`${width} bg-slate-900/90 backdrop-blur-md border-2 border-slate-600 shadow-[4px_4px_0_rgba(0,0,0,0.5)] flex flex-col overflow-hidden rounded-sm`}
    >
      {/* Header Bar */}
      <div 
        onMouseDown={handleHeaderMouseDown}
        className={`px-3 py-2 bg-slate-800 border-b-2 border-slate-600 cursor-move flex items-center justify-between select-none ${isDragging ? 'cursor-grabbing' : ''}`}
      >
        <span className="pixel-font text-[10px] text-cyan-400 truncate pr-2">{title}</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 cursor-auto">
        {children}
      </div>
    </div>
  );
};