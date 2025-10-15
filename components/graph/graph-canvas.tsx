'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { createTermColorMaps } from '../../lib/highlighting/colors';
import { SearchTermProcessor } from '../../lib/search-utils';
import { getHighlightedElements, getHighlightedElementsForPath } from '../../lib/graph/path-finding';
import { CardinalityType } from '../ui/cardinality-toggle';
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

const getEdgeKey = (word1: string, word2: string) =>
  [word1, word2].sort((a, b) => a.localeCompare(b)).join('-');

const EDGE_CLICK_THRESHOLD_PX = 12;

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  connections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  allConnections?: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  searchTerms: string;
  isDarkMode: boolean;
  canvasSize: { width: number; height: number };
  transform: { x: number; y: number; scale: number };
  onEdgeClick: (edge: Edge, allConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>) => void;
  onEdgeExclusionToggle?: (edgeId: string) => void;
  onTransformChange: (transform: { x: number; y: number; scale: number }) => void;
  selectedNodes?: string[];
  onNodeClick?: (nodeId: string | string[]) => void;
  currentPath?: string[] | null;
  excludedEdges?: string[];
  connectionCardinalities?: Record<string, CardinalityType>;
  checkedEdges?: string[];
}

export function GraphCanvas({
  nodes,
  edges,
  connections,
  allConnections = [],
  searchTerms,
  isDarkMode,
  canvasSize,
  transform,
  onEdgeClick,
  onEdgeExclusionToggle,
  onTransformChange,
  selectedNodes = [],
  onNodeClick,
  currentPath = null,
  excludedEdges = [],
  connectionCardinalities = {},
  checkedEdges = [],
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
    const pairingsTerms: string[] = [];
    return createTermColorMaps(mainTerms, pairingsTerms, isDarkMode);
  }, [searchTerms, isDarkMode]);

  // Calculate highlighted elements for path visualization
  const highlightedElements = React.useMemo(() => {
    // If we have a specific current path, use that for highlighting
    if (currentPath && currentPath.length > 1) {
      return getHighlightedElementsForPath(currentPath, edges);
    }
    // Otherwise, fall back to the original behavior (show all paths)
    return getHighlightedElements(selectedNodes, nodes, edges, excludedEdges, connectionCardinalities);
  }, [selectedNodes, nodes, edges, currentPath, excludedEdges, connectionCardinalities]);

  const checkedEdgeSet = React.useMemo(() => new Set(checkedEdges), [checkedEdges]);

  // Calculate cumulative edge directions based on all connections
  const getEdgeDirection = useCallback((edge: Edge): { left: boolean; right: boolean; isPathEdge?: boolean } => {
    const edgeConnections = connections.filter(conn =>
      (conn.word1 === edge.source && conn.word2 === edge.target) ||
      (conn.word1 === edge.target && conn.word2 === edge.source)
    );

    let hasLeftDirection = false;
    let hasRightDirection = false;
    let isPathEdge = false;
    let hasForwardConnection = false;
    let hasReverseConnection = false;

    // Check if this edge is part of the current path
    if (currentPath && currentPath.length > 1) {
      for (let i = 0; i < currentPath.length - 1; i++) {
        const pathSource = currentPath[i];
        const pathTarget = currentPath[i + 1];

        // Check if this edge matches the path direction
        if ((edge.source === pathSource && edge.target === pathTarget) ||
            (edge.source === pathTarget && edge.target === pathSource)) {
          isPathEdge = true;

          // For path edges, keep the arrow in the direction of the path flow
          if (edge.source === pathSource && edge.target === pathTarget) {
            hasLeftDirection = true; // Path flows from source to target
          } else if (edge.source === pathTarget && edge.target === pathSource) {
            hasRightDirection = true; // Path flows from target to source
          }
          break; // Found the path edge, no need to check further
        }
      }
    }

    edgeConnections.forEach(conn => {
      const isForwardConnection = conn.word1 === edge.source && conn.word2 === edge.target;
      const isReverseConnection = conn.word1 === edge.target && conn.word2 === edge.source;

      if (isForwardConnection) {
        hasForwardConnection = true;
      }
      if (isReverseConnection) {
        hasReverseConnection = true;
      }

      const connectionKey = `${conn.word1}-${conn.word2}-${conn.reference}`;
      const cardinality = connectionCardinalities[connectionKey];

      if (cardinality === 'left') {
        // Left means second term points to first term
        if (isForwardConnection) {
          hasRightDirection = true; // Arrow from target to source (right to left)
        } else if (isReverseConnection) {
          hasLeftDirection = true; // Arrow from source to target (left to right)
        }
      } else if (cardinality === 'right') {
        // Right means first term points to second term
        if (isForwardConnection) {
          hasLeftDirection = true; // Arrow from source to target (left to right)
        } else if (isReverseConnection) {
          hasRightDirection = true; // Arrow from target to source (right to left)
        }
      } else if (cardinality === 'omni') {
        // Omni means both directions
        hasLeftDirection = true;
        hasRightDirection = true;
      }
      // If cardinality is null, we defer to path direction or connection presence
    });

    // For path edges that have evidence of connections in both directions,
    // ensure arrows are rendered on both ends even when cardinality is unset.
    if (isPathEdge && hasForwardConnection && hasReverseConnection) {
      hasLeftDirection = true;
      hasRightDirection = true;
    }

    return { left: hasLeftDirection, right: hasRightDirection, isPathEdge };
  }, [connections, connectionCardinalities, currentPath]);

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
    // Filled background colors (main search terms)
    if (classes.includes('bg-red-500')) return { bg: '#ef4444', text: '#ffffff', border: '#ef4444' };
    if (classes.includes('bg-emerald-500')) return { bg: '#10b981', text: '#ffffff', border: '#10b981' };
    if (classes.includes('bg-amber-500')) return { bg: '#f59e0b', text: '#ffffff', border: '#f59e0b' };
    if (classes.includes('bg-purple-500')) return { bg: '#8b5cf6', text: '#ffffff', border: '#8b5cf6' };
    if (classes.includes('bg-pink-500')) return { bg: '#ec4899', text: '#ffffff', border: '#ec4899' };
    if (classes.includes('bg-orange-500')) return { bg: '#f97316', text: '#ffffff', border: '#f97316' };
    if (classes.includes('bg-cyan-500')) return { bg: '#06b6d4', text: '#ffffff', border: '#06b6d4' };
    if (classes.includes('bg-lime-500')) return { bg: '#84cc16', text: '#ffffff', border: '#84cc16' };
    if (classes.includes('bg-indigo-500')) return { bg: '#6366f1', text: '#ffffff', border: '#6366f1' };
    if (classes.includes('bg-rose-500')) return { bg: '#f43f5e', text: '#ffffff', border: '#f43f5e' };
    if (classes.includes('bg-sky-500')) return { bg: '#0ea5e9', text: '#ffffff', border: '#0ea5e9' };
    if (classes.includes('bg-teal-500')) return { bg: '#14b8a6', text: '#ffffff', border: '#14b8a6' };
    if (classes.includes('bg-violet-500')) return { bg: '#8b5cf6', text: '#ffffff', border: '#8b5cf6' };
    if (classes.includes('bg-yellow-500')) return { bg: '#eab308', text: '#ffffff', border: '#eab308' };
    if (classes.includes('bg-green-500')) return { bg: '#22c55e', text: '#ffffff', border: '#22c55e' };
    if (classes.includes('bg-blue-500')) return { bg: '#3b82f6', text: '#ffffff', border: '#3b82f6' };
    if (classes.includes('bg-fuchsia-500')) return { bg: '#d946ef', text: '#ffffff', border: '#d946ef' };

    // Darker filled colors (600 series)
    if (classes.includes('bg-red-600')) return { bg: '#dc2626', text: '#ffffff', border: '#dc2626' };
    if (classes.includes('bg-emerald-600')) return { bg: '#059669', text: '#ffffff', border: '#059669' };
    if (classes.includes('bg-amber-600')) return { bg: '#d97706', text: '#ffffff', border: '#d97706' };
    if (classes.includes('bg-purple-600')) return { bg: '#9333ea', text: '#ffffff', border: '#9333ea' };
    if (classes.includes('bg-pink-600')) return { bg: '#db2777', text: '#ffffff', border: '#db2777' };
    if (classes.includes('bg-orange-600')) return { bg: '#ea580c', text: '#ffffff', border: '#ea580c' };
    if (classes.includes('bg-cyan-600')) return { bg: '#0891b2', text: '#ffffff', border: '#0891b2' };
    if (classes.includes('bg-lime-600')) return { bg: '#65a30d', text: '#ffffff', border: '#65a30d' };
    if (classes.includes('bg-indigo-600')) return { bg: '#4f46e5', text: '#ffffff', border: '#4f46e5' };
    if (classes.includes('bg-rose-600')) return { bg: '#e11d48', text: '#ffffff', border: '#e11d48' };
    if (classes.includes('bg-sky-600')) return { bg: '#0284c7', text: '#ffffff', border: '#0284c7' };
    if (classes.includes('bg-teal-600')) return { bg: '#0d9488', text: '#ffffff', border: '#0d9488' };
    if (classes.includes('bg-violet-600')) return { bg: '#7c3aed', text: '#ffffff', border: '#7c3aed' };
    if (classes.includes('bg-yellow-600')) return { bg: '#ca8a04', text: '#ffffff', border: '#ca8a04' };
    if (classes.includes('bg-green-600')) return { bg: '#16a34a', text: '#ffffff', border: '#16a34a' };
    if (classes.includes('bg-blue-600')) return { bg: '#2563eb', text: '#ffffff', border: '#2563eb' };
    if (classes.includes('bg-fuchsia-600')) return { bg: '#c026d3', text: '#ffffff', border: '#c026d3' };

    // Even darker filled colors (700 series)
    if (classes.includes('bg-red-700')) return { bg: '#b91c1c', text: '#ffffff', border: '#b91c1c' };
    if (classes.includes('bg-emerald-700')) return { bg: '#047857', text: '#ffffff', border: '#047857' };
    if (classes.includes('bg-amber-700')) return { bg: '#b45309', text: '#ffffff', border: '#b45309' };
    if (classes.includes('bg-purple-700')) return { bg: '#7c3aed', text: '#ffffff', border: '#7c3aed' };
    if (classes.includes('bg-pink-700')) return { bg: '#be185d', text: '#ffffff', border: '#be185d' };
    if (classes.includes('bg-orange-700')) return { bg: '#c2410c', text: '#ffffff', border: '#c2410c' };
    if (classes.includes('bg-cyan-700')) return { bg: '#0e7490', text: '#ffffff', border: '#0e7490' };
    if (classes.includes('bg-lime-700')) return { bg: '#4d7c0f', text: '#ffffff', border: '#4d7c0f' };
    if (classes.includes('bg-indigo-700')) return { bg: '#4338ca', text: '#ffffff', border: '#4338ca' };
    if (classes.includes('bg-rose-700')) return { bg: '#be123c', text: '#ffffff', border: '#be123c' };
    if (classes.includes('bg-sky-700')) return { bg: '#0369a1', text: '#ffffff', border: '#0369a1' };
    if (classes.includes('bg-teal-700')) return { bg: '#0f766e', text: '#ffffff', border: '#0f766e' };
    if (classes.includes('bg-violet-700')) return { bg: '#6d28d9', text: '#ffffff', border: '#6d28d9' };
    if (classes.includes('bg-yellow-700')) return { bg: '#a16207', text: '#ffffff', border: '#a16207' };
    if (classes.includes('bg-green-700')) return { bg: '#15803d', text: '#ffffff', border: '#15803d' };
    if (classes.includes('bg-blue-700')) return { bg: '#1d4ed8', text: '#ffffff', border: '#1d4ed8' };
    if (classes.includes('bg-fuchsia-700')) return { bg: '#a21caf', text: '#ffffff', border: '#a21caf' };

    // Darkest filled colors (800 series)
    if (classes.includes('bg-red-800')) return { bg: '#991b1b', text: '#ffffff', border: '#991b1b' };
    if (classes.includes('bg-emerald-800')) return { bg: '#065f46', text: '#ffffff', border: '#065f46' };
    if (classes.includes('bg-amber-800')) return { bg: '#92400e', text: '#ffffff', border: '#92400e' };
    if (classes.includes('bg-purple-800')) return { bg: '#6b21a8', text: '#ffffff', border: '#6b21a8' };
    if (classes.includes('bg-pink-800')) return { bg: '#9d174d', text: '#ffffff', border: '#9d174d' };
    if (classes.includes('bg-orange-800')) return { bg: '#9a3412', text: '#ffffff', border: '#9a3412' };
    if (classes.includes('bg-cyan-800')) return { bg: '#155e75', text: '#ffffff', border: '#155e75' };
    if (classes.includes('bg-lime-800')) return { bg: '#365314', text: '#ffffff', border: '#365314' };
    if (classes.includes('bg-indigo-800')) return { bg: '#3730a3', text: '#ffffff', border: '#3730a3' };
    if (classes.includes('bg-rose-800')) return { bg: '#9f1239', text: '#ffffff', border: '#9f1239' };
    if (classes.includes('bg-sky-800')) return { bg: '#075985', text: '#ffffff', border: '#075985' };
    if (classes.includes('bg-teal-800')) return { bg: '#115e59', text: '#ffffff', border: '#115e59' };
    if (classes.includes('bg-violet-800')) return { bg: '#5b21b6', text: '#ffffff', border: '#5b21b6' };
    if (classes.includes('bg-yellow-800')) return { bg: '#854d0e', text: '#ffffff', border: '#854d0e' };
    if (classes.includes('bg-green-800')) return { bg: '#166534', text: '#ffffff', border: '#166534' };
    if (classes.includes('bg-blue-800')) return { bg: '#1e40af', text: '#ffffff', border: '#1e40af' };
    if (classes.includes('bg-fuchsia-800')) return { bg: '#86198f', text: '#ffffff', border: '#86198f' };

    // Outline/border colors (pairings search terms) - transparent background with colored border and text
    if (classes.includes('border-red-500')) return { bg: 'transparent', text: '#b91c1c', border: '#ef4444' };
    if (classes.includes('border-emerald-500')) return { bg: 'transparent', text: '#047857', border: '#10b981' };
    if (classes.includes('border-amber-500')) return { bg: 'transparent', text: '#b45309', border: '#f59e0b' };
    if (classes.includes('border-purple-500')) return { bg: 'transparent', text: '#7c3aed', border: '#8b5cf6' };
    if (classes.includes('border-pink-500')) return { bg: 'transparent', text: '#be185d', border: '#ec4899' };
    if (classes.includes('border-orange-500')) return { bg: 'transparent', text: '#c2410c', border: '#f97316' };
    if (classes.includes('border-cyan-500')) return { bg: 'transparent', text: '#0e7490', border: '#06b6d4' };
    if (classes.includes('border-lime-500')) return { bg: 'transparent', text: '#4d7c0f', border: '#84cc16' };
    if (classes.includes('border-indigo-500')) return { bg: 'transparent', text: '#4338ca', border: '#6366f1' };
    if (classes.includes('border-rose-400')) return { bg: 'transparent', text: '#be123c', border: '#fb7185' };
    if (classes.includes('border-sky-400')) return { bg: 'transparent', text: '#0369a1', border: '#38bdf8' };
    if (classes.includes('border-teal-400')) return { bg: 'transparent', text: '#0f766e', border: '#2dd4bf' };
    if (classes.includes('border-violet-500')) return { bg: 'transparent', text: '#6d28d9', border: '#8b5cf6' };
    if (classes.includes('border-yellow-500')) return { bg: 'transparent', text: '#a16207', border: '#eab308' };
    if (classes.includes('border-green-500')) return { bg: 'transparent', text: '#15803d', border: '#22c55e' };
    if (classes.includes('border-blue-500')) return { bg: 'transparent', text: '#1d4ed8', border: '#3b82f6' };
    if (classes.includes('border-fuchsia-500')) return { bg: 'transparent', text: '#a21caf', border: '#d946ef' };

    // Darker border colors (600 series)
    if (classes.includes('border-red-600')) return { bg: 'transparent', text: '#991b1b', border: '#dc2626' };
    if (classes.includes('border-emerald-600')) return { bg: 'transparent', text: '#065f46', border: '#059669' };
    if (classes.includes('border-amber-600')) return { bg: 'transparent', text: '#92400e', border: '#d97706' };
    if (classes.includes('border-purple-600')) return { bg: 'transparent', text: '#6b21a8', border: '#9333ea' };
    if (classes.includes('border-pink-600')) return { bg: 'transparent', text: '#9d174d', border: '#db2777' };
    if (classes.includes('border-orange-600')) return { bg: 'transparent', text: '#9a3412', border: '#ea580c' };
    if (classes.includes('border-cyan-600')) return { bg: 'transparent', text: '#155e75', border: '#0891b2' };
    if (classes.includes('border-lime-600')) return { bg: 'transparent', text: '#365314', border: '#65a30d' };
    if (classes.includes('border-indigo-600')) return { bg: 'transparent', text: '#3730a3', border: '#4f46e5' };
    if (classes.includes('border-violet-600')) return { bg: 'transparent', text: '#5b21b6', border: '#7c3aed' };
    if (classes.includes('border-yellow-600')) return { bg: 'transparent', text: '#854d0e', border: '#ca8a04' };
    if (classes.includes('border-green-600')) return { bg: 'transparent', text: '#166534', border: '#16a34a' };
    if (classes.includes('border-blue-600')) return { bg: 'transparent', text: '#1e40af', border: '#2563eb' };
    if (classes.includes('border-fuchsia-600')) return { bg: 'transparent', text: '#86198f', border: '#c026d3' };

    // Even darker border colors (700 series)
    if (classes.includes('border-red-700')) return { bg: 'transparent', text: '#7f1d1d', border: '#b91c1c' };
    if (classes.includes('border-emerald-700')) return { bg: 'transparent', text: '#064e3b', border: '#047857' };
    if (classes.includes('border-amber-700')) return { bg: 'transparent', text: '#78350f', border: '#b45309' };
    if (classes.includes('border-purple-700')) return { bg: 'transparent', text: '#581c87', border: '#7c3aed' };
    if (classes.includes('border-pink-700')) return { bg: 'transparent', text: '#831843', border: '#be185d' };
    if (classes.includes('border-orange-700')) return { bg: 'transparent', text: '#7c2d12', border: '#c2410c' };
    if (classes.includes('border-cyan-700')) return { bg: 'transparent', text: '#164e63', border: '#0e7490' };
    if (classes.includes('border-lime-700')) return { bg: 'transparent', text: '#1a2e05', border: '#4d7c0f' };
    if (classes.includes('border-indigo-700')) return { bg: 'transparent', text: '#312e81', border: '#4338ca' };
    if (classes.includes('border-violet-700')) return { bg: 'transparent', text: '#4c1d95', border: '#6d28d9' };
    if (classes.includes('border-yellow-700')) return { bg: 'transparent', text: '#713f12', border: '#a16207' };
    if (classes.includes('border-green-700')) return { bg: 'transparent', text: '#14532d', border: '#15803d' };
    if (classes.includes('border-blue-700')) return { bg: 'transparent', text: '#1e3a8a', border: '#1d4ed8' };
    if (classes.includes('border-fuchsia-700')) return { bg: 'transparent', text: '#701a75', border: '#a21caf' };

    // Darkest border colors (800 series)
    if (classes.includes('border-red-800')) return { bg: 'transparent', text: '#7f1d1d', border: '#991b1b' };
    if (classes.includes('border-emerald-800')) return { bg: 'transparent', text: '#064e3b', border: '#065f46' };
    if (classes.includes('border-amber-800')) return { bg: 'transparent', text: '#78350f', border: '#92400e' };
    if (classes.includes('border-purple-800')) return { bg: 'transparent', text: '#581c87', border: '#6b21a8' };
    if (classes.includes('border-pink-800')) return { bg: 'transparent', text: '#831843', border: '#9d174d' };
    if (classes.includes('border-orange-800')) return { bg: 'transparent', text: '#7c2d12', border: '#9a3412' };
    if (classes.includes('border-cyan-800')) return { bg: 'transparent', text: '#164e63', border: '#155e75' };
    if (classes.includes('border-lime-800')) return { bg: 'transparent', text: '#1a2e05', border: '#365314' };
    if (classes.includes('border-indigo-800')) return { bg: 'transparent', text: '#312e81', border: '#3730a3' };
    if (classes.includes('border-violet-800')) return { bg: 'transparent', text: '#4c1d95', border: '#5b21b6' };
    if (classes.includes('border-yellow-800')) return { bg: 'transparent', text: '#713f12', border: '#854d0e' };
    if (classes.includes('border-green-800')) return { bg: 'transparent', text: '#14532d', border: '#166534' };
    if (classes.includes('border-blue-800')) return { bg: 'transparent', text: '#1e3a8a', border: '#1e40af' };
    if (classes.includes('border-fuchsia-800')) return { bg: 'transparent', text: '#701a75', border: '#86198f' };

    // Default colors for unmatched terms
    if (classes.includes('bg-gray-600')) return { bg: '#4b5563', text: '#e5e7eb', border: '#6b7280' };
    return { bg: '#f3f4f6', text: '#374151', border: '#6b7280' };
  }, []);

  // Function to draw an arrow
  const drawArrow = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    arrowSize: number = 8,
    nodeRadius: number = 15
  ) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowAngle = Math.PI / 6; // 30 degrees

    // Position arrowhead to touch the node edge exactly
    const arrowOffset = nodeRadius; // Touch the node edge
    const arrowTipX = toX - arrowOffset * Math.cos(angle);
    const arrowTipY = toY - arrowOffset * Math.sin(angle);

    // Calculate arrow head points from the tip
    const arrowX1 = arrowTipX - arrowSize * Math.cos(angle - arrowAngle);
    const arrowY1 = arrowTipY - arrowSize * Math.sin(angle - arrowAngle);
    const arrowX2 = arrowTipX - arrowSize * Math.cos(angle + arrowAngle);
    const arrowY2 = arrowTipY - arrowSize * Math.sin(angle + arrowAngle);

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowX1, arrowY1);
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowX2, arrowY2);
    ctx.stroke();
  }, []);

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const current = currentTransform.current;

    // Debug: Draw a test rectangle to ensure canvas is working
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 10, 20, 20);

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

    const selectedEdgeKeys = new Set(edges.map(edge => getEdgeKey(edge.source, edge.target)));

    const dottedEdgeOperations: Array<{
      key: string;
      sourceNode: Node;
      targetNode: Node;
    }> = [];

    if (allConnections.length > 0) {
      const processedKeys = new Set<string>();

      allConnections.forEach(conn => {
        if (!conn || typeof conn.word1 !== 'string' || typeof conn.word2 !== 'string') {
          return;
        }

        const key = getEdgeKey(conn.word1, conn.word2);
        if (selectedEdgeKeys.has(key) || processedKeys.has(key)) {
          return;
        }

        const sourceNode = nodeMap.get(conn.word1);
        const targetNode = nodeMap.get(conn.word2);

        if (sourceNode && targetNode) {
          dottedEdgeOperations.push({
            key,
            sourceNode,
            targetNode,
          });
          processedKeys.add(key);
        }
      });
    }

    // Collect arrow drawing operations for proper z-ordering
    const arrowOperations: Array<{
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      arrowSize: number;
      nodeRadius: number;
      isHighlighted: boolean;
      isPathEdge: boolean;
      isChecked: boolean;
      shouldShowTransparent: boolean;
    }> = [];

    // Collect edge drawing operations for proper z-ordering
    const nonHighlightedEdgeOperations: Array<{
      edge: Edge;
      sourceNode: Node;
      targetNode: Node;
      isExcluded: boolean;
      shouldShowTransparent: boolean;
      isChecked: boolean;
    }> = [];

    const highlightedEdgeOperations: Array<{
      edge: Edge;
      sourceNode: Node;
      targetNode: Node;
      isExcluded: boolean;
      shouldShowTransparent: boolean;
      isChecked: boolean;
    }> = [];

    // Collect edge operations instead of drawing immediately
    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        // Create edge ID for comparison
        const edgeId = getEdgeKey(edge.source, edge.target);
        const isHighlighted = highlightedElements.highlightedEdgeIds.has(edgeId);
        const isExcluded = excludedEdges.includes(edgeId);
        const isChecked = checkedEdgeSet.has(edgeId);
        const shouldShowTransparent = selectedNodes.length === 2 && !isHighlighted;

        // Collect edge operation for later rendering
        const edgeOperation = {
          edge,
          sourceNode,
          targetNode,
          isExcluded,
          shouldShowTransparent,
          isChecked
        };

        if (isHighlighted || isExcluded || isChecked) {
          highlightedEdgeOperations.push(edgeOperation);
        } else {
          nonHighlightedEdgeOperations.push(edgeOperation);
        }

        // Collect arrow drawing operations
        const edgeDirection = getEdgeDirection(edge);
        const arrowSize = Math.max(8, 12 / current.scale); // Reasonable arrow size
        const nodeRadius = Math.max(sourceNode.radius, targetNode.radius); // Use the larger node radius

        if (edgeDirection.left || edgeDirection.right) {
          if (edgeDirection.left) {
            // Collect arrow from source to target (left to right)
            arrowOperations.push({
              fromX: sourceNode.x,
              fromY: sourceNode.y,
              toX: targetNode.x,
              toY: targetNode.y,
              arrowSize,
              nodeRadius,
              isHighlighted: (edgeDirection.isPathEdge ?? false) || isHighlighted,
              isPathEdge: edgeDirection.isPathEdge ?? false,
              isChecked,
              shouldShowTransparent
            });
          }

          if (edgeDirection.right) {
            // Collect arrow from target to source (right to left)
            arrowOperations.push({
              fromX: targetNode.x,
              fromY: targetNode.y,
              toX: sourceNode.x,
              toY: sourceNode.y,
              arrowSize,
              nodeRadius,
              isHighlighted: (edgeDirection.isPathEdge ?? false) || isHighlighted,
              isPathEdge: edgeDirection.isPathEdge ?? false,
              isChecked,
              shouldShowTransparent
            });
          }
        }
      }
    });

    // Render unselected dotted edges behind everything else
    dottedEdgeOperations.forEach(({ sourceNode, targetNode }) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = isDarkMode ? '#6b7280' : '#94a3b8';
      ctx.lineWidth = Math.max(0.5, 1 / current.scale);
      const dashLength = Math.max(4, 6 / current.scale);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.restore();
    });

    // Helper function to draw an edge with its label
    const drawEdgeWithLabel = (edgeOp: typeof nonHighlightedEdgeOperations[0]) => {
      const { edge, sourceNode, targetNode, isExcluded, shouldShowTransparent, isChecked } = edgeOp;
      const edgeId = getEdgeKey(edge.source, edge.target);
      const isHighlighted = highlightedElements.highlightedEdgeIds.has(edgeId);

      // Set edge style based on highlighting and exclusion
      if (isExcluded) {
        // Excluded edges: dashed red line
        ctx.strokeStyle = isDarkMode ? '#ef4444' : '#dc2626'; // Red color
        ctx.lineWidth = Math.max(1, 2 / current.scale);
        ctx.globalAlpha = 1;
        ctx.setLineDash([5, 5]); // Dashed line
      } else if (isChecked) {
        ctx.strokeStyle = isDarkMode ? '#60a5fa' : '#2563eb'; // Blue for checked edges
        ctx.lineWidth = Math.max(1.5, 2.5 / current.scale);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]); // Solid line
      } else if (isHighlighted) {
        ctx.strokeStyle = isDarkMode ? '#fbbf24' : '#f59e0b'; // Gold for pathfinding
        ctx.lineWidth = Math.max(2, 3 / current.scale);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]); // Solid line
      } else if (shouldShowTransparent) {
        ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#777';
        ctx.lineWidth = Math.max(0.5, 1 / current.scale);
        ctx.globalAlpha = 0.2;
        ctx.setLineDash([]); // Solid line
      } else {
        ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#777';
        ctx.lineWidth = Math.max(0.5, 1 / current.scale);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]); // Solid line
      }

      // Set transparency for the entire edge
      ctx.globalAlpha = shouldShowTransparent ? 0.2 : 1;

      // Draw the complete edge line
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // Reset line dash for next edge
      ctx.setLineDash([]);

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
        const bgAlpha = isExcluded
          ? 0.95
          : (isChecked
              ? (shouldShowTransparent ? 0.3 : 0.95)
              : (isHighlighted ? 0.95 : (shouldShowTransparent ? 0.3 : 0.95)));
        let bgColor: string;
        if (isExcluded) {
          bgColor = isDarkMode ? `rgba(127, 29, 29, ${bgAlpha})` : `rgba(254, 202, 202, ${bgAlpha})`; // Red background for excluded
        } else if (isChecked) {
          bgColor = isDarkMode ? `rgba(37, 99, 235, ${bgAlpha})` : `rgba(59, 130, 246, ${bgAlpha})`;
        } else if (isHighlighted) {
          bgColor = isDarkMode ? `rgba(120, 53, 15, ${bgAlpha})` : `rgba(253, 224, 71, ${bgAlpha})`;
        } else {
          bgColor = isDarkMode ? `rgba(31, 41, 55, ${bgAlpha})` : `rgba(255, 255, 255, ${bgAlpha})`;
        }
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Add subtle border
        const borderAlpha = isExcluded
          ? 0.6
          : (isChecked
              ? (shouldShowTransparent ? 0.1 : 0.4)
              : (isHighlighted ? 0.4 : (shouldShowTransparent ? 0.1 : 0.3)));
        const borderColor = (() => {
          if (isExcluded) {
            return `rgba(220, 38, 38, ${borderAlpha})`; // Red border for excluded
          }
          if (isChecked) {
            return isDarkMode ? `rgba(96, 165, 250, ${borderAlpha})` : `rgba(59, 130, 246, ${borderAlpha})`;
          }
          if (isHighlighted) {
            return isDarkMode ? `rgba(251, 191, 36, ${borderAlpha})` : `rgba(245, 158, 11, ${borderAlpha})`;
          }
          return isDarkMode ? `rgba(156, 163, 175, ${borderAlpha})` : `rgba(107, 114, 128, ${borderAlpha})`;
        })();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = Math.max(0.5, 1 / current.scale);
        ctx.stroke();

        // Draw text centered
        const textAlpha = isExcluded
          ? 1
          : (isChecked
              ? (shouldShowTransparent ? 0.4 : 1)
              : (isHighlighted ? 1 : (shouldShowTransparent ? 0.4 : 1)));
        const textColor = (() => {
          if (isExcluded) {
            return `rgba(31, 41, 55, ${textAlpha})`; // Dark text for excluded
          }
          if (isChecked && !isHighlighted) {
            return `rgba(255, 255, 255, ${textAlpha})`;
          }
          if (isHighlighted && !isChecked) {
            return isDarkMode ? `rgba(254, 243, 199, ${textAlpha})` : `rgba(67, 56, 12, ${textAlpha})`;
          }
          return isDarkMode ? `rgba(243, 244, 246, ${textAlpha})` : `rgba(31, 41, 55, ${textAlpha})`;
        })();
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, 0, 0);
        ctx.restore();
      }
    };

    // Render in correct z-order:
    // 1. Non-highlighted edges (lines + labels)
    nonHighlightedEdgeOperations.forEach(drawEdgeWithLabel);

    // 2. All arrows (non-highlighted first, then highlighted)
    arrowOperations
      .sort((a, b) => {
        const getPriority = (op: typeof arrowOperations[number]) => {
          if (op.isPathEdge) return 3;
          if (op.isHighlighted) return 2;
          if (op.isChecked) return 1;
          return 0;
        };
        return getPriority(a) - getPriority(b);
      })
      .forEach(arrowOp => {
        // Save current context state
        ctx.save();

        // Set arrow style based on highlighting
        if (arrowOp.isChecked) {
          ctx.strokeStyle = isDarkMode ? '#60a5fa' : '#2563eb'; // Checked edge arrows stay blue
          ctx.lineWidth = arrowOp.isPathEdge ? Math.max(4, 5 / current.scale) : Math.max(3, 4 / current.scale);
        } else if (arrowOp.isPathEdge) {
          ctx.strokeStyle = isDarkMode ? '#fbbf24' : '#f59e0b'; // Gold for path edges between selected nodes
          ctx.lineWidth = Math.max(4, 5 / current.scale); // Even thicker for path edges
        } else if (arrowOp.isHighlighted) {
          ctx.strokeStyle = isDarkMode ? '#fbbf24' : '#f59e0b'; // Gold for highlighted edges
          ctx.lineWidth = Math.max(3, 4 / current.scale); // Thicker for highlighted edges
        } else {
          ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#777'; // Regular color for non-highlighted edges
          ctx.lineWidth = Math.max(3, 4 / current.scale); // Slightly thicker than edge line
        }
        ctx.globalAlpha = arrowOp.shouldShowTransparent ? 0.2 : 1;

        // Draw the arrow
        drawArrow(ctx, arrowOp.fromX, arrowOp.fromY, arrowOp.toX, arrowOp.toY, arrowOp.arrowSize, arrowOp.nodeRadius);

        // Restore context state
        ctx.restore();
      });

    // 3. Highlighted edges (lines + labels) - renders above arrows
    highlightedEdgeOperations.forEach(drawEdgeWithLabel);

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
  }, [nodes, edges, connections, allConnections, getNodeColor, getColorsFromTailwind, isDarkMode, selectedNodes, highlightedElements, excludedEdges, getEdgeDirection, drawArrow, checkedEdgeSet]);

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
      const isWithinEdgeClickRadius = (distance: number) =>
        distance * current.scale < EDGE_CLICK_THRESHOLD_PX;
      const graphX = (mouseX - current.x) / current.scale;
      const graphY = (mouseY - current.y) / current.scale;

      const nodeMap = new Map(nodes.map(node => [node.id, node]));
      const selectedEdgeKeys = new Set(edges.map(edge => getEdgeKey(edge.source, edge.target)));

      // Check if click is on a node first
      let clickedNode = null;
      for (const node of nodes) {
        // Check if this node should be transparent (and therefore not clickable)
        const isHighlighted = highlightedElements.highlightedNodes.has(node.id);
        const shouldShowTransparent = selectedNodes.length === 2 && !isHighlighted;

        // Skip click detection for transparent nodes
        if (shouldShowTransparent) {
          continue;
        }

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
      let clickedEdge: Edge | null = null;
      let clickedEdgeIsDotted = false;

      for (const edge of edges) {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (sourceNode && targetNode) {
          // Check if this edge should be transparent (and therefore not clickable)
          const edgeId = [edge.source, edge.target].sort().join('-');
          const isHighlighted = highlightedElements.highlightedEdgeIds.has(edgeId);
          const shouldShowTransparent = selectedNodes.length === 2 && !isHighlighted;

          // Skip click detection for transparent edges
          if (shouldShowTransparent) {
            continue;
          }

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

          if (isWithinEdgeClickRadius(distance)) {
            clickedEdge = edge;
            break;
          }
        }
      }

      if (!clickedEdge && allConnections.length > 0) {
        const processedKeys = new Set<string>();

        for (const conn of allConnections) {
          if (!conn || typeof conn.word1 !== 'string' || typeof conn.word2 !== 'string') {
            continue;
          }

          const key = getEdgeKey(conn.word1, conn.word2);
          if (selectedEdgeKeys.has(key) || processedKeys.has(key)) {
            continue;
          }

          processedKeys.add(key);

          const sourceNode = nodeMap.get(conn.word1);
          const targetNode = nodeMap.get(conn.word2);

          if (!sourceNode || !targetNode) {
            continue;
          }

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

          if (isWithinEdgeClickRadius(distance)) {
            clickedEdge = {
              source: conn.word1,
              target: conn.word2,
              reference: conn.reference,
              versePositions: conn.versePositions,
            };
            clickedEdgeIsDotted = true;
            break;
          }
        }
      }

      if (clickedEdge) {
        // Check if this is a right-click (context menu)
        if (e.button === 2) { // Right mouse button
          if (clickedEdgeIsDotted) {
            e.preventDefault();
          } else {
            e.preventDefault(); // Prevent context menu
            const edgeId = [clickedEdge.source, clickedEdge.target].sort().join('-');
            if (onEdgeExclusionToggle) {
              onEdgeExclusionToggle(edgeId);
            }
          }
          return;
        } else {
          // Left click - show edge modal
          const matchingConnections = allConnections.filter(conn =>
            (conn.word1 === clickedEdge.source && conn.word2 === clickedEdge.target) ||
            (conn.word1 === clickedEdge.target && conn.word2 === clickedEdge.source)
          );

          if (matchingConnections.length > 0) {
            onEdgeClick(clickedEdge, matchingConnections);
            return;
          }
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

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent default context menu
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

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
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isDragging, dragStart, lastPanPoint, onTransformChange, edges, nodes, allConnections, onEdgeClick, onEdgeExclusionToggle, onNodeClick, draw]);

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
