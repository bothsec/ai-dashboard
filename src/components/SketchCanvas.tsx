import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface Point { x: number; y: number }
export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface SketchCanvasProps {
  onAskAI: (sketchDataUrl: string) => void;
  disabled?: boolean;
}

const COLORS = [
  '#f8fafc', // white
  '#94a3b8', // slate
  '#f97316', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#38bdf8', // sky
  '#818cf8', // indigo
  '#e879f9', // pink
];

export default function SketchCanvas({ onAskAI, disabled }: SketchCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [color, setColor] = useState('#f8fafc');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPos = useCallback((e: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startStroke = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    e.preventDefault();
    svgRef.current!.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentStroke([getPos(e)]);
  }, [disabled, getPos]);

  const continueStroke = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    setCurrentStroke(prev => [...prev, getPos(e)]);
  }, [isDrawing, disabled, getPos]);

  const endStroke = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    svgRef.current!.releasePointerCapture(e.pointerId);
    if (currentStroke.length > 1) {
      setStrokes(prev => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, points: currentStroke, color, width: lineWidth },
      ]);
    }
    setCurrentStroke([]);
    setIsDrawing(false);
  }, [isDrawing, disabled, currentStroke, color, lineWidth]);

  const undo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
  }, []);

  const toDataUrl = useCallback((): string => {
    const svg = svgRef.current;
    if (!svg) return '';
    const clone = svg.cloneNode(true) as SVGSVGElement;
    // White background for contrast
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#0f172a');
    clone.insertBefore(bg, clone.firstChild);
    return svgToDataUrl(clone);
  }, [strokes]);

  const handleAskAI = useCallback(() => {
    if (strokes.length === 0) return;
    const dataUrl = toDataUrl();
    onAskAI(dataUrl);
  }, [strokes, toDataUrl, onAskAI]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const pathD = (points: Point[]) =>
    points.length < 2
      ? `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`
      : `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

  const hasStrokes = strokes.length > 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-900/80 border border-slate-700/50 p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Color palette */}
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-transform ${
                color === c ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700" />

        {/* Stroke width */}
        <div className="flex gap-1 items-center">
          {[1, 2, 4, 8].map(w => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`rounded transition-colors ${
                lineWidth === w ? 'bg-slate-600' : 'hover:bg-slate-800'
              }`}
              title={`${w}px`}
            >
              <div
                className="mx-1 rounded-full bg-slate-200"
                style={{ width: Math.min(w * 2 + 4, 20), height: Math.min(w * 2 + 4, 20) }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700" />

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!hasStrokes || disabled}
          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="Undo (⌘Z)"
        >
          Undo
        </button>

        {/* Clear */}
        <button
          onClick={clear}
          disabled={!hasStrokes || disabled}
          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-red-900/50 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="Clear canvas"
        >
          Clear
        </button>

        {/* Stroke count */}
        {hasStrokes && (
          <span className="text-xs text-slate-500 ml-1">{strokes.length} stroke{strokes.length !== 1 ? 's' : ''}</span>
        )}

        <div className="flex-1" />

        {/* Ask AI */}
        <button
          onClick={handleAskAI}
          disabled={!hasStrokes || disabled}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-violet-900/30"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Ask AI
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className={`w-full rounded-lg cursor-crosshair select-none touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ height: 240, background: '#0f172a' }}
        onPointerDown={startStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      >
        {/* Grid dots */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="#1e293b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Completed strokes */}
        {strokes.map(s => (
          <path
            key={s.id}
            d={pathD(s.points)}
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

        {/* Current stroke */}
        {currentStroke.length > 1 && (
          <path
            d={pathD(currentStroke)}
            stroke={color}
            strokeWidth={lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}

// Helper — convert Blob to data URL
function svgToDataUrl(svgEl: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const encoded = btoa(unescape(encodeURIComponent(svgStr)));
  return `data:image/svg+xml;base64,${encoded}`;
}