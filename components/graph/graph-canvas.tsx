'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { createTermColorMaps } from '../../lib/highlighting/colors';
import { SearchTermProcessor } from '../../lib/search-utils';
import { getHighlightedElements } from '../../lib/graph/path-finding';
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
  selectedNodes?: string[];
  onNodeClick?: (nodeId: string) => void;
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
  selectedNodes = [],
  onNodeClick,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Use a ref for immediate transform updates to avoid state update delays
  const currentTransform = useRef(transform);
  const isInternalUpdate = useRef(false);

  // Create color mappings for search terms
  const termColorMaps = React.useMemo(() => {
    const mainTerms = SearchTermProcessor.processSearchString(searchTerms);
    const pairingsTerms = SearchTermProcessor.processSearchString(pairingsSearchTerms);
    return createTermColorMaps(mainTerms, pairingsTerms, isDarkMode);
  }, [searchTerms, pairingsSearchTerms, isDarkMode]);

  // Calculate highlighted elements for path visualization
  const highlightedElements = React.useMemo(() => {
    return getHighlightedElements(selectedNodes, nodes, edges);
  }, [selectedNodes, nodes, edges]);

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

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const current = currentTransform.current;

    // Enable image smoothing for better quality at different scales
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas with proper background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background color to ensure it's not transparent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(current.x, current.y);
    ctx.scale(current.scale, current.scale);

    if (nodes.length === 0) {
      ctx.restore();
      return;
    }



    // Create node lookup map for better performance
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Draw edges with highlighting and transparency
    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        // Create edge ID for comparison
        const edgeId = [edge.source, edge.target].sort().join('-');
        const isHighlighted = highlightedElements.highlightedEdgeIds.has(edgeId);
        const shouldShowTransparent = selectedNodes.length === 2 && !isHighlighted;
        
        // Set edge style based on highlighting
        if (isHighlighted) {
          ctx.strokeStyle = isDarkMode ? '#fbbf24' : '#f59e0b'; // Highlighted color
          ctx.lineWidth = Math.max(2, 3 / current.scale);
          ctx.globalAlpha = 1;
        } else if (shouldShowTransparent) {
          ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#666';
          ctx.lineWidth = Math.max(0.5, 1 / current.scale);
          ctx.globalAlpha = 0.2;
        } else {
          ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#666';
          ctx.lineWidth = Math.max(0.5, 1 / current.scale);
          ctx.globalAlpha = 1;
        }
        
        // Set transparency for the entire edge
        ctx.globalAlpha = shouldShowTransparent ? 0.2 : 1;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        // Only draw labels if zoom level is sufficient and not too transparent
        if (current.scale > 0.3 && (!shouldShowTransparent || ctx.globalAlpha > 0.5)) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;

          const connectionCount = connections.filter(conn => 
            (conn.word1 === edge.source && conn.word2 === edge.target) ||
            (conn.word1 === edge.target && conn.word2 === edge.source)
          ).length;

          const displayText = connectionCount.toString();

          ctx.save();
          ctx.translate(midX, midY);

          const fontSize = Math.max(8, 10 / current.scale);
          ctx.font = `bold ${fontSize}px Arial`;
          const textMetrics = ctx.measureText(displayText);
          const textWidth = textMetrics.width;
          const textHeight = fontSize;
          
          // Calculate label dimensions with padding
          const padding = Math.max(3, 4 / current.scale);
          const labelWidth = textWidth + padding * 2;
          const labelHeight = textHeight + padding * 1.5;
          const radius = Math.min(labelWidth, labelHeight) * 0.2;
          
          // Draw rounded rectangle background
          const x = -labelWidth / 2;
          const y = -labelHeight / 2;
          
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + labelWidth - radius, y);
          ctx.quadraticCurveTo(x + labelWidth, y, x + labelWidth, y + radius);
          ctx.lineTo(x + labelWidth, y + labelHeight - radius);
          ctx.quadraticCurveTo(x + labelWidth, y + labelHeight, x + labelWidth - radius, y + labelHeight);
          ctx.lineTo(x + radius, y + labelHeight);
          ctx.quadraticCurveTo(x, y + labelHeight, x, y + labelHeight - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          
          // Fill background with current alpha
          const bgAlpha = isHighlighted ? 0.95 : (shouldShowTransparent ? 0.3 : 0.95);
          ctx.fillStyle = isDarkMode ? `rgba(31, 41, 55, ${bgAlpha})` : `rgba(255, 255, 255, ${bgAlpha})`;
          ctx.fill();
          
          // Add subtle border
          const borderAlpha = isHighlighted ? 0.4 : (shouldShowTransparent ? 0.1 : 0.3);
          ctx.strokeStyle = isDarkMode ? `rgba(156, 163, 175, ${borderAlpha})` : `rgba(107, 114, 128, ${borderAlpha})`;
          ctx.lineWidth = Math.max(0.5, 1 / current.scale);
          ctx.stroke();

          // Draw text centered
          const textAlpha = isHighlighted ? 1 : (shouldShowTransparent ? 0.4 : 1);
          ctx.fillStyle = isDarkMode ? `rgba(243, 244, 246, ${textAlpha})` : `rgba(31, 41, 55, ${textAlpha})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayText, 0, 0);
          ctx.restore();
        }
      }
    });

    // Reset global alpha for nodes
    ctx.globalAlpha = 1;

    // Draw nodes with highlighting and transparency
    nodes.forEach((node) => {
      const nodeColor = getNodeColor(node.word);
      const colors = getColorsFromTailwind(nodeColor.background);
      
      const isSelected = selectedNodes.includes(node.id);
      const isHighlighted = highlightedElements.highlightedNodes.has(node.id);
      const shouldShowTransparent = selectedNodes.length === 2 && !isHighlighted;
      


      
      // Set global alpha for the entire node
      ctx.globalAlpha = shouldShowTransparent ? 0.2 : 1;
      
      // Draw node circle with appropriate styling
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      
      if (colors.bg === 'transparent') {
        const bgColor = isDarkMode ? '#374151' : '#f9fafb';
        ctx.fillStyle = bgColor;
        ctx.fill();
        
        // Special styling for selected nodes
        if (isSelected) {
          ctx.strokeStyle = isDarkMode ? '#fbbf24' : '#f59e0b';
          ctx.lineWidth = Math.max(2, 4 / current.scale);
        } else {
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = Math.max(1, 3 / current.scale);
        }
      } else {
        ctx.fillStyle = colors.bg;
        ctx.fill();
        
        // Special styling for selected nodes
        if (isSelected) {
          ctx.strokeStyle = isDarkMode ? '#fbbf24' : '#f59e0b';
          ctx.lineWidth = Math.max(2, 4 / current.scale);
        } else {
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = Math.max(0.5, 2 / current.scale);
        }
      }
      ctx.stroke();

      // Only draw text if zoom level is sufficient
      if (current.scale > 0.2) {
        // Text uses the same global alpha as the node
        ctx.fillStyle = colors.text;
        
        const fontSize = Math.max(8, 12 / current.scale);
        ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.word, node.x, node.y);
      }
      
      // Reset global alpha for next node
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }, [nodes, edges, connections, getNodeColor, getColorsFromTailwind, isDarkMode, selectedNodes, highlightedElements]);

  // Always sync the ref with the prop, but track internal updates to prevent feedback loops
  useEffect(() => {
    if (!isInternalUpdate.current) {
      currentTransform.current = transform;
    }
    isInternalUpdate.current = false;
  }, [transform]);

  // Pan and zoom event handlers with smooth updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number | null = null;
    let pendingUpdate: { x: number; y: number; scale: number } | null = null;

    const scheduleUpdate = (newTransform: { x: number; y: number; scale: number }) => {
      // Always update the ref immediately for smooth visual feedback
      currentTransform.current = newTransform;
      isInternalUpdate.current = true;
      
      // Schedule parent update and redraw
      pendingUpdate = newTransform;
      
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingUpdate) {
            draw();
            onTransformChange(pendingUpdate);
            pendingUpdate = null;
          }
          rafId = null;
        });
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const current = currentTransform.current;

      if (e.metaKey || e.ctrlKey) {
        // Zoom with Cmd/Ctrl+scroll
        const zoomSensitivity = 0.005;
        const zoomFactor = 1 - e.deltaY * zoomSensitivity;
        const newScale = Math.max(0.1, Math.min(5, current.scale * zoomFactor));

        if (Math.abs(newScale - current.scale) > 0.001) {
          const scaleChange = newScale / current.scale;
          const newX = mouseX - (mouseX - current.x) * scaleChange;
          const newY = mouseY - (mouseY - current.y) * scaleChange;

          scheduleUpdate({ x: newX, y: newY, scale: newScale });
        }
      } else {
        // Trackpad panning
        const panSensitivity = 1.0;
        
        const deltaX = e.deltaX * panSensitivity;
        const deltaY = e.deltaY * panSensitivity;
        
        const newX = current.x - deltaX;
        const newY = current.y - deltaY;

        scheduleUpdate({ x: newX, y: newY, scale: current.scale });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const current = currentTransform.current;
      const graphX = (mouseX - current.x) / current.scale;
      const graphY = (mouseY - current.y) / current.scale;

      // Check if click is on a node first
      let clickedNode = null;
      for (const node of nodes) {
        const dx = graphX - node.x;
        const dy = graphY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= node.radius) {
          clickedNode = node;
          break;
        }
      }

      if (clickedNode && onNodeClick) {
        onNodeClick(clickedNode.id);
        return;
      }

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
      setLastPanPoint({ x: current.x, y: current.y });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      scheduleUpdate({
        ...currentTransform.current,
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
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, dragStart, lastPanPoint, onTransformChange, edges, nodes, connections, onEdgeClick, onNodeClick, draw]);

  // Single drawing effect - handles all drawing triggers
  useEffect(() => {
    draw();
  }, [draw]);

  // Force initial draw on mount and when canvas size changes
  useEffect(() => {
    // Use requestAnimationFrame instead of setTimeout for smoother rendering
    const rafId = requestAnimationFrame(() => {
      draw();
    });
    return () => cancelAnimationFrame(rafId);
  }, [draw, canvasSize.width, canvasSize.height]);



  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={`border border-gray-300 block w-full h-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      }}
    />
  );
}