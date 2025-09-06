'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { createTermColorMaps } from '../../lib/highlighting/colors';
import { SearchTermProcessor } from '../../lib/search-utils';
import React from 'react';

interface Node {
  id: string;
  x: number;
  y: number;
  word: string;
  radius: number;
}

interface Edge {
  source: string;
  target: string;
  reference: string;
  versePositions?: number[];
}

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  connections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  searchTerms: string;
  pairingsSearchTerms: string;
  isDarkMode: boolean;
  canvasSize: { width: number; height: number };
  transform: { x: number; y: number; scale: number };
  onEdgeClick: (edge: Edge, allConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>) => void;
  onTransformChange: (transform: { x: number; y: number; scale: number }) => void;
}

export function GraphCanvas({
  nodes,
  edges,
  connections,
  searchTerms,
  pairingsSearchTerms,
  isDarkMode,
  canvasSize,
  transform,
  onEdgeClick,
  onTransformChange,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Create color mappings for search terms
  const termColorMaps = React.useMemo(() => {
    const mainTerms = SearchTermProcessor.processSearchString(searchTerms);
    const pairingsTerms = SearchTermProcessor.processSearchString(pairingsSearchTerms);
    return createTermColorMaps(mainTerms, pairingsTerms, isDarkMode);
  }, [searchTerms, pairingsSearchTerms, isDarkMode]);

  // Memoized color function to prevent unnecessary recalculations
  const getNodeColor = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    
    const mainColor = termColorMaps.mainTermToColor.get(normalizedWord);
    if (mainColor) {
      return { background: mainColor, type: 'main' };
    }
    
    const pairingsColor = termColorMaps.pairingsTermToColor.get(normalizedWord);
    if (pairingsColor) {
      return { background: pairingsColor, type: 'pairings' };
    }
    
    return { 
      background: isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-800', 
      type: 'default' 
    };
  }, [termColorMaps, isDarkMode]);

  // Memoize color conversion function
  const getColorsFromTailwind = useCallback((classes: string) => {
    if (classes.includes('bg-yellow-200')) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    if (classes.includes('bg-blue-200')) return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
    if (classes.includes('bg-green-200')) return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
    if (classes.includes('bg-red-200')) return { bg: '#fecaca', text: '#dc2626', border: '#ef4444' };
    if (classes.includes('bg-purple-200')) return { bg: '#e9d5ff', text: '#7c3aed', border: '#8b5cf6' };
    if (classes.includes('bg-pink-200')) return { bg: '#fce7f3', text: '#be185d', border: '#ec4899' };
    if (classes.includes('bg-indigo-200')) return { bg: '#c7d2fe', text: '#4338ca', border: '#6366f1' };
    if (classes.includes('bg-orange-200')) return { bg: '#fed7aa', text: '#ea580c', border: '#f97316' };
    
    if (classes.includes('bg-yellow-300')) return { bg: '#fcd34d', text: '#92400e', border: '#f59e0b' };
    if (classes.includes('bg-blue-300')) return { bg: '#93c5fd', text: '#1e40af', border: '#3b82f6' };
    if (classes.includes('bg-green-300')) return { bg: '#86efac', text: '#166534', border: '#22c55e' };
    if (classes.includes('bg-red-300')) return { bg: '#fca5a5', text: '#dc2626', border: '#ef4444' };
    if (classes.includes('bg-purple-300')) return { bg: '#c4b5fd', text: '#7c3aed', border: '#8b5cf6' };
    if (classes.includes('bg-pink-300')) return { bg: '#f9a8d4', text: '#be185d', border: '#ec4899' };
    if (classes.includes('bg-indigo-300')) return { bg: '#a5b4fc', text: '#4338ca', border: '#6366f1' };
    if (classes.includes('bg-orange-300')) return { bg: '#fdba74', text: '#ea580c', border: '#f97316' };
    
    if (classes.includes('border-teal-500')) return { bg: 'transparent', text: '#0f766e', border: '#14b8a6' };
    if (classes.includes('border-cyan-500')) return { bg: 'transparent', text: '#0e7490', border: '#06b6d4' };
    if (classes.includes('border-lime-500')) return { bg: 'transparent', text: '#365314', border: '#84cc16' };
    if (classes.includes('border-amber-500')) return { bg: 'transparent', text: '#92400e', border: '#f59e0b' };
    if (classes.includes('border-rose-500')) return { bg: 'transparent', text: '#be123c', border: '#f43f5e' };
    if (classes.includes('border-violet-500')) return { bg: 'transparent', text: '#6b21a8', border: '#8b5cf6' };
    if (classes.includes('border-emerald-500')) return { bg: 'transparent', text: '#065f46', border: '#10b981' };
    if (classes.includes('border-sky-500')) return { bg: 'transparent', text: '#0c4a6e', border: '#0ea5e9' };
    
    if (classes.includes('border-teal-400')) return { bg: 'transparent', text: '#2dd4bf', border: '#2dd4bf' };
    if (classes.includes('border-cyan-400')) return { bg: 'transparent', text: '#22d3ee', border: '#22d3ee' };
    if (classes.includes('border-lime-400')) return { bg: 'transparent', text: '#a3e635', border: '#a3e635' };
    if (classes.includes('border-amber-400')) return { bg: 'transparent', text: '#fbbf24', border: '#fbbf24' };
    if (classes.includes('border-rose-400')) return { bg: 'transparent', text: '#fb7185', border: '#fb7185' };
    if (classes.includes('border-violet-400')) return { bg: 'transparent', text: '#a78bfa', border: '#a78bfa' };
    if (classes.includes('border-emerald-400')) return { bg: 'transparent', text: '#34d399', border: '#34d399' };
    if (classes.includes('border-sky-400')) return { bg: 'transparent', text: '#38bdf8', border: '#38bdf8' };
    
    if (classes.includes('bg-gray-600')) return { bg: '#4b5563', text: '#e5e7eb', border: '#6b7280' };
    return { bg: '#f3f4f6', text: '#374151', border: '#6b7280' };
  }, []);

  // Pan and zoom event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number | null = null;
    let pendingTransform: { x: number; y: number; scale: number } | null = null;

    const applyTransform = () => {
      if (pendingTransform) {
        onTransformChange(pendingTransform);
        pendingTransform = null;
      }
      animationFrameId = null;
    };

    const scheduleTransformUpdate = (newTransform: { x: number; y: number; scale: number }) => {
      pendingTransform = newTransform;
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(applyTransform);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.metaKey || e.ctrlKey) {
        // Zoom with Cmd/Ctrl+scroll - smoother zoom factor
        const zoomFactor = 1 - e.deltaY * 0.005;
        const newScale = Math.max(0.1, Math.min(5, transform.scale * zoomFactor));

        if (Math.abs(newScale - transform.scale) > 0.001) {
          const scaleChange = newScale / transform.scale;
          const newX = mouseX - (mouseX - transform.x) * scaleChange;
          const newY = mouseY - (mouseY - transform.y) * scaleChange;

          scheduleTransformUpdate({ x: newX, y: newY, scale: newScale });
        }
      } else {
        // Pan - reduce sensitivity for smoother panning
        const panSensitivity = 0.8;
        const newX = transform.x - e.deltaX * panSensitivity;
        const newY = transform.y - e.deltaY * panSensitivity;

        scheduleTransformUpdate({ x: newX, y: newY, scale: transform.scale });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const graphX = (mouseX - transform.x) / transform.scale;
      const graphY = (mouseY - transform.y) / transform.scale;

      // Check if click is on an edge
      let clickedEdge = null;
      for (const edge of edges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const A = graphX - sourceNode.x;
          const B = graphY - sourceNode.y;
          const C = targetNode.x - sourceNode.x;
          const D = targetNode.y - sourceNode.y;

          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          let param = -1;
          if (lenSq !== 0) param = dot / lenSq;

          let xx, yy;
          if (param < 0) {
            xx = sourceNode.x;
            yy = sourceNode.y;
          } else if (param > 1) {
            xx = targetNode.x;
            yy = targetNode.y;
          } else {
            xx = sourceNode.x + param * C;
            yy = sourceNode.y + param * D;
          }

          const dx = graphX - xx;
          const dy = graphY - yy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 15) {
            clickedEdge = edge;
            break;
          }
        }
      }

      if (clickedEdge) {
        const allConnections = connections.filter(conn => 
          (conn.word1 === clickedEdge.source && conn.word2 === clickedEdge.target) ||
          (conn.word1 === clickedEdge.target && conn.word2 === clickedEdge.source)
        );
        
        if (allConnections.length > 0) {
          onEdgeClick(clickedEdge, allConnections);
          return;
        }
      }

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastPanPoint({ x: transform.x, y: transform.y });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      scheduleTransformUpdate({
        ...transform,
        x: lastPanPoint.x + deltaX,
        y: lastPanPoint.y + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    canvas.style.cursor = 'grab';

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, dragStart, lastPanPoint, transform, onTransformChange, edges, nodes, connections, onEdgeClick]);

  // Optimized drawing effect with better performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable image smoothing for better quality at different scales
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    if (nodes.length === 0) {
      ctx.restore();
      return;
    }

    // Create node lookup map for better performance
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Draw edges with optimized rendering
    ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#666';
    ctx.lineWidth = Math.max(0.5, 1 / transform.scale);
    
    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        // Only draw labels if zoom level is sufficient
        if (transform.scale > 0.3) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;

          const connectionCount = connections.filter(conn => 
            (conn.word1 === edge.source && conn.word2 === edge.target) ||
            (conn.word1 === edge.target && conn.word2 === edge.source)
          ).length;

          const displayText = connectionCount > 1 
            ? `${edge.reference} (${connectionCount})`
            : edge.reference;

          let angle = Math.atan2(
            targetNode.y - sourceNode.y,
            targetNode.x - sourceNode.x
          );

          if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            angle += Math.PI;
          }

          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);

          ctx.fillStyle = isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
          const fontSize = Math.max(8, 10 / transform.scale);
          ctx.font = `${fontSize}px Arial`;
          const textWidth = ctx.measureText(displayText).width;
          ctx.fillRect(-textWidth / 2 - 2, -8, textWidth + 4, 12);

          ctx.fillStyle = isDarkMode ? '#e5e7eb' : '#333';
          ctx.textAlign = 'center';
          ctx.fillText(displayText, 0, -2);
          ctx.restore();
        }
      }
    });

    // Draw nodes with optimized rendering
    nodes.forEach((node) => {
      const nodeColor = getNodeColor(node.word);
      const colors = getColorsFromTailwind(nodeColor.background);
      
      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      
      if (colors.bg === 'transparent') {
        ctx.fillStyle = isDarkMode ? '#374151' : '#f9fafb';
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = Math.max(1, 3 / transform.scale);
      } else {
        ctx.fillStyle = colors.bg;
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = Math.max(0.5, 2 / transform.scale);
      }
      ctx.stroke();

      // Only draw text if zoom level is sufficient
      if (transform.scale > 0.2) {
        ctx.fillStyle = colors.text;
        const fontSize = Math.max(8, 12 / transform.scale);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.word, node.x, node.y);
      }
    });

    ctx.restore();
  }, [nodes, edges, transform, connections, getNodeColor, getColorsFromTailwind, isDarkMode, canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className='border border-gray-300 bg-white block w-full h-full'
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      }}
    />
  );
}