import React, { useState, useRef, useEffect } from 'react';
import type { CaseNode, CitationEdge } from './types';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Info,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Target
} from 'lucide-react';

interface Props {
  nodes: CaseNode[];
  edges: CitationEdge[];
  onSelectNode?: (node: CaseNode) => void;
}

export default function LineageMap({ nodes = [], edges = [], onSelectNode }: Props) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<CaseNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<CitationEdge | null>(null);
  const [viewMode, setViewMode] = useState<'force' | 'radial' | 'hierarchical'>('radial');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced layout calculations
  const calculateRadialLayout = () => {
    const center = { x: 450, y: 220 };
    const baseRadius = Math.min(180, Math.max(80, nodes.length * 8));
    
    return nodes.map((n, i) => {
      if (nodes.length === 1) return { ...n, x: center.x, y: center.y };
      
      const angle = (2 * Math.PI * i) / Math.max(1, nodes.length);
      const radius = baseRadius * (1 + 0.3 * Math.sin(angle * 2));
      return {
        ...n,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
        angle,
        radius
      };
    });
  };

  const calculateForceLayout = () => {
    // Simplified force-directed layout
    const center = { x: 450, y: 220 };
    return nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, nodes.length);
      const spread = 200;
      return {
        ...n,
        x: center.x + spread * Math.cos(angle) * (0.7 + 0.3 * Math.random()),
        y: center.y + spread * Math.sin(angle) * (0.7 + 0.3 * Math.random())
      };
    });
  };

  const calculateHierarchicalLayout = () => {
    const center = { x: 450, y: 220 };
    const levels = 3;
    const levelHeight = 120;
    
    return nodes.map((n, i) => {
      const level = i % levels;
      const nodesInLevel = Math.ceil(nodes.length / levels);
      const indexInLevel = Math.floor(i / levels);
      const levelWidth = 400;
      const spacing = levelWidth / (nodesInLevel + 1);
      
      return {
        ...n,
        x: center.x - levelWidth/2 + spacing * (indexInLevel + 1),
        y: center.y - levelHeight + level * levelHeight
      };
    });
  };

  const getLayoutNodes = () => {
    switch (viewMode) {
      case 'force': return calculateForceLayout();
      case 'hierarchical': return calculateHierarchicalLayout();
      case 'radial':
      default: return calculateRadialLayout();
    }
  };

  const positioned = getLayoutNodes();

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && svgRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, scale * delta));
    setScale(newScale);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const fitToView = () => {
    if (containerRef.current && svgRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      const svg = svgRef.current.getBoundingClientRect();
      const scaleX = container.width / svg.width;
      const scaleY = container.height / svg.height;
      const newScale = Math.min(scaleX, scaleY) * 0.8;
      setScale(newScale);
      setPosition({ x: (container.width - svg.width * newScale) / 2, y: (container.height - svg.height * newScale) / 2 });
    }
  };

  // Export functionality
  useEffect(() => {
    function onExport() {
      const svg = document.getElementById('lineage-svg') as SVGSVGElement | null;
      if (!svg) return;

      // Add watermark for export
      const originalContent = svg.innerHTML;
      const watermark = `
        <g id="watermark" opacity="0.1">
          <text x="400" y="430" text-anchor="middle" font-family="Arial" font-size="24" fill="#334155">
            Legal Lineage Explorer
          </text>
          <text x="400" y="460" text-anchor="middle" font-family="Arial" font-size="12" fill="#64748b">
            Generated ${new Date().toLocaleDateString()}
          </text>
        </g>
      `;
      
      svg.innerHTML += watermark;

      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      
      // Remove watermark after serialization
      const watermarkEl = document.getElementById('watermark');
      if (watermarkEl) watermarkEl.remove();

      const img = new Image();
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw SVG
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Add watermark on canvas
          ctx.globalAlpha = 0.1;
          ctx.font = '24px Arial';
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'center';
          ctx.fillText('Legal Lineage Explorer', canvas.width / 2, canvas.height - 40);
          ctx.font = '12px Arial';
          ctx.fillText(`Generated ${new Date().toLocaleDateString()}`, canvas.width / 2, canvas.height - 15);
          ctx.globalAlpha = 1;
          
          URL.revokeObjectURL(url);
          
          const png = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = png;
          a.download = `legal-lineage-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      };
      
      img.src = url;
    }

    window.addEventListener('exportGraph', onExport as EventListener);
    return () => window.removeEventListener('exportGraph', onExport as EventListener);
  }, []);

  // Get edge color based on relation
  const getEdgeColor = (relation: string) => {
    switch (relation) {
      case 'followed': return '#10b981';
      case 'overruled': return '#ef4444';
      case 'distinguished': return '#f59e0b';
      case 'cited': return '#8b5cf6';
      case 'related': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const getEdgeLabel = (relation: string) => {
    switch (relation) {
      case 'followed': return 'Followed';
      case 'overruled': return 'Overruled';
      case 'distinguished': return 'Distinguished';
      case 'cited': return 'Cited';
      default: return 'Related';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-2 flex gap-1">
          <button
            onClick={() => setViewMode('radial')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'radial' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'}`}
            title="Radial View"
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('force')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'force' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'}`}
            title="Force-Directed View"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('hierarchical')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'hierarchical' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'}`}
            title="Hierarchical View"
          >
            <GitPullRequest className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-2 flex gap-1">
          <button
            onClick={() => setScale(s => Math.min(3, s * 1.2))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(0.5, s * 0.8))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={fitToView}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fit to View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hover Info Panel */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-4 max-w-xs shadow-xl">
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2 rounded-lg ${hoveredNode.isCentral ? 'bg-gradient-to-r from-teal-100 to-cyan-100' : 'bg-gradient-to-r from-blue-100 to-indigo-100'}`}>
              <GitCommit className={`w-5 h-5 ${hoveredNode.isCentral ? 'text-teal-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">{hoveredNode.title}</h4>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                <span className="px-2 py-0.5 bg-slate-100 rounded">#{hoveredNode.id}</span>
                {hoveredNode.year && <span>{hoveredNode.year}</span>}
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-600 line-clamp-3">{hoveredNode.summary || 'No summary available'}</p>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            <div className="text-sm">
              <span className="text-slate-500">Citations: </span>
              <span className="font-semibold text-slate-800">{hoveredNode.citations || 0}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Cited by: </span>
              <span className="font-semibold text-slate-800">{hoveredNode.citedBy || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edge Hover Info */}
      {hoveredEdge && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getEdgeColor(hoveredEdge.relation) }} />
            <span className="font-medium text-slate-800">{getEdgeLabel(hoveredEdge.relation)}</span>
          </div>
          <div className="text-sm text-slate-600 mt-1">
            {hoveredEdge.source} → {hoveredEdge.target}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-4 shadow-sm">
        <h5 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Legend
        </h5>
        <div className="space-y-2">
          {['followed', 'overruled', 'distinguished', 'cited'].map((rel) => (
            <div key={rel} className="flex items-center gap-2">
              <div className="w-3 h-0.5" style={{ backgroundColor: getEdgeColor(rel) }} />
              <span className="text-sm text-slate-600 capitalize">{rel}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
            <span className="text-sm text-slate-600">Central Case</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-sm text-slate-600">Related Cases</span>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={handleMouseDown}>
        <svg
          ref={svgRef}
          id="lineage-svg"
          width="900"
          height="500"
          className={`transition-transform duration-150 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            {/* Arrow markers */}
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
            
            {/* Glow effects */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Gradient definitions */}
            <linearGradient id="node-gradient-central" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5a4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="node-gradient-regular" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <radialGradient id="node-shine">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background grid */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

          {/* Edges */}
          {edges.map((e, idx) => {
            const s = positioned.find((p) => p.id === e.source);
            const t = positioned.find((p) => p.id === e.target);
            if (!s || !t) return null;

            const color = getEdgeColor(e.relation);
            const edgeLength = Math.sqrt(Math.pow(t.x - s.x, 2) + Math.pow(t.y - s.y, 2));
            const curvature = 0.3;
            
            // Bezier curve for better visualization
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            const cp1X = s.x + (t.x - s.x) * 0.5;
            const cp1Y = s.y + (t.y - s.y) * 0.5 + curvature * edgeLength;
            const cp2X = s.x + (t.x - s.x) * 0.5;
            const cp2Y = s.y + (t.y - s.y) * 0.5 - curvature * edgeLength;

            return (
              <g key={idx}>
                <path
                  d={`M ${s.x} ${s.y} Q ${cp1X} ${cp1Y}, ${midX} ${midY} T ${t.x} ${t.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={e.weight || 2}
                  opacity={hoveredEdge?.id === e.id ? 1 : 0.6}
                  markerEnd="url(#arrow)"
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredEdge(e)}
                  onMouseLeave={() => setHoveredEdge(null)}
                />
                {/* Edge label */}
                <text
                  x={midX}
                  y={midY - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill={color}
                  fontWeight="600"
                  className="pointer-events-none"
                >
                  {getEdgeLabel(e.relation)}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {positioned.map((n) => {
            const isCenter = n.isCentral || nodes[0]?.id === n.id;
            const nodeSize = isCenter ? 36 : 28;
            const title = (n.title || n.id || '').toString();
            const isHovered = hoveredNode?.id === n.id;

            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                {/* Glow effect on hover */}
                {isHovered && (
                  <circle
                    r={nodeSize + 8}
                    fill={`url(#${isCenter ? 'node-gradient-central' : 'node-gradient-regular'})`}
                    opacity="0.2"
                    filter="url(#glow)"
                  />
                )}
                
                {/* Main node */}
                <circle
                  r={nodeSize}
                  fill={`url(#${isCenter ? 'node-gradient-central' : 'node-gradient-regular'})`}
                  stroke={isCenter ? '#083344' : '#1e40af'}
                  strokeWidth={isCenter ? 2.5 : 2}
                  className="transition-all duration-200 cursor-pointer hover:r-[32]"
                  onMouseEnter={() => setHoveredNode(n)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onSelectNode?.(n)}
                />
                
                {/* Shine effect */}
                <circle
                  r={nodeSize - 4}
                  fill="url(#node-shine)"
                  className="pointer-events-none"
                />
                
                {/* Node label */}
                <text
                  x={0}
                  y={5}
                  textAnchor="middle"
                  fontSize={isCenter ? 11 : 10}
                  fill="#ffffff"
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {title.length > (isCenter ? 20 : 15) 
                    ? `${title.slice(0, isCenter ? 17 : 12)}...`
                    : title}
                </text>
                
                {/* Year badge */}
                {n.year && (
                  <g transform="translate(0, 24)">
                    <rect
                      x={-20}
                      y={0}
                      width={40}
                      height={16}
                      rx={8}
                      fill="#ffffff"
                      opacity="0.9"
                      className="pointer-events-none"
                    />
                    <text
                      x={0}
                      y={11}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {n.year}
                    </text>
                  </g>
                )}
                
                <title>{`${title} — ${n.year || '—'}`}</title>
              </g>
            );
          })}

          {/* Center indicator for radial view */}
          {viewMode === 'radial' && nodes.length > 1 && (
            <g>
              <circle cx="450" cy="220" r="4" fill="#64748b" opacity="0.5" />
              <circle cx="450" cy="220" r="60" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
            </g>
          )}
        </svg>
      </div>

      {/* Stats bar */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <GitCommit className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-800">{nodes.length}</span> nodes
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-slate-800">{edges.length}</span> edges
          </span>
          <span className="text-xs text-slate-500">
            Scale: {scale.toFixed(2)}x • {viewMode} view
          </span>
        </div>
      </div>
    </div>
  );
}