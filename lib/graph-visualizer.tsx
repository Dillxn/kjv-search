'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { kjvParser, VersePairing } from './';
import { PairingDisplay } from '../components/shared/pairing-display';
import { createTermColorMaps } from './highlighting/colors';
import { SearchTermProcessor } from './search-utils';

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

interface GraphVisualizerProps {
  connections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  searchTerms?: string;
  pairingsSearchTerms?: string;
  isDarkMode?: boolean;
}

export function GraphVisualizer({ 
  connections, 
  searchTerms = '', 
  pairingsSearchTerms = '', 
  isDarkMode = false 
}: GraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const connectionsRef = useRef(connections);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Update connections ref when connections change
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);


  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [selectedEdge, setSelectedEdge] = useState<{
    edge: Edge;
    connection: typeof connections[0];
    allConnections?: typeof connections;
  } | null>(null);

  // Create color mappings for search terms
  const termColorMaps = useMemo(() => {
    const mainTerms = SearchTermProcessor.processSearchString(searchTerms);
    const pairingsTerms = SearchTermProcessor.processSearchString(pairingsSearchTerms);
    return createTermColorMaps(mainTerms, pairingsTerms, isDarkMode);
  }, [searchTerms, pairingsSearchTerms, isDarkMode]);

  // Helper function to get node color based on search terms
  const getNodeColor = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    
    // Check main search terms first
    const mainColor = termColorMaps.mainTermToColor.get(normalizedWord);
    if (mainColor) {
      return { background: mainColor, type: 'main' };
    }
    
    // Check pairings search terms
    const pairingsColor = termColorMaps.pairingsTermToColor.get(normalizedWord);
    if (pairingsColor) {
      return { background: pairingsColor, type: 'pairings' };
    }
    
    // Default color for words not in search terms
    return { 
      background: isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-800', 
      type: 'default' 
    };
  }, [termColorMaps, isDarkMode]);

  // Helper function to calculate node radius based on text width
  const calculateNodeRadius = useCallback((word: string, fontSize: number = 12) => {
    // Create a temporary canvas to measure text width
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 35; // fallback
    
    ctx.font = `${fontSize}px Arial`;
    const textWidth = ctx.measureText(word).width;
    
    // Add padding around text (minimum 20px padding on each side)
    const minRadius = Math.max(35, (textWidth / 2) + 20);
    
    // Cap maximum radius to keep nodes reasonable
    return Math.min(minRadius, 80);
  }, []);

  // Update canvas size when container resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(300, Math.floor(rect.width - 4)); // Minimal padding
        const height = Math.max(200, Math.floor(rect.height - 4));
        setCanvasSize({ width, height });
      }
    };

    // Use ResizeObserver for better responsiveness
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial size update
    updateCanvasSize();

    // Fallback window resize listener
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);



  // Generate initial position for a node based on its word
  const generateInitialPosition = (word: string, existingNodes: Node[]) => {
    const virtualWidth = 1200;
    const virtualHeight = 900;
    const margin = 100;

    // Create a simple hash function for the word to get consistent positioning
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };

    const hash = hashCode(word.toLowerCase());
    
    // Use hash to generate deterministic but well-distributed initial positions
    const x = margin + (hash % (virtualWidth - 2 * margin));
    const y = margin + ((hash >> 16) % (virtualHeight - 2 * margin));

    return { x, y };
  };

  // Helper function to check if two line segments intersect
  const doLinesIntersect = (
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };

  // Force-directed layout algorithm to minimize edge crossings
  const applyForceDirectedLayout = useCallback((nodes: Node[], edges: Edge[]) => {
    const virtualWidth = 1200;
    const virtualHeight = 900;
    const margin = 100;
    const iterations = 120;
    const repulsionStrength = 20000;
    const attractionStrength = 0.03;
    const crossingAvoidanceStrength = 1000; // Much gentler crossing avoidance
    const dampening = 0.88;
    const idealEdgeLength = 250; // Longer target edge length for better readability

    // Create a copy of nodes to modify
    const layoutNodes = nodes.map(node => ({ ...node, vx: 0, vy: 0 }));

    for (let iter = 0; iter < iterations; iter++) {
      // Reset forces
      layoutNodes.forEach(node => {
        node.vx = 0;
        node.vy = 0;
      });

      // Repulsion forces between all nodes (accounting for node sizes)
      for (let i = 0; i < layoutNodes.length; i++) {
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const nodeA = layoutNodes[i];
          const nodeB = layoutNodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Minimum distance should account for both node radii plus some padding
          const minDistance = nodeA.radius + nodeB.radius + 20;
          
          if (distance > 0 && distance < minDistance * 3) { // Only apply repulsion when nodes are close
            const force = repulsionStrength / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // Attraction forces along edges (spring-like behavior)
      edges.forEach(edge => {
        const sourceNode = layoutNodes.find(n => n.id === edge.source);
        const targetNode = layoutNodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            // Spring force: attract if too far, repel if too close
            const displacement = distance - idealEdgeLength;
            const force = attractionStrength * displacement;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            sourceNode.vx += fx;
            sourceNode.vy += fy;
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        }
      });

      // Edge crossing avoidance forces
      for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const edge1 = edges[i];
          const edge2 = edges[j];
          
          // Skip if edges share a node
          if (edge1.source === edge2.source || edge1.source === edge2.target ||
              edge1.target === edge2.source || edge1.target === edge2.target) {
            continue;
          }
          
          const source1 = layoutNodes.find(n => n.id === edge1.source);
          const target1 = layoutNodes.find(n => n.id === edge1.target);
          const source2 = layoutNodes.find(n => n.id === edge2.source);
          const target2 = layoutNodes.find(n => n.id === edge2.target);
          
          if (source1 && target1 && source2 && target2) {
            // Check if edges intersect
            if (doLinesIntersect(
              source1.x, source1.y, target1.x, target1.y,
              source2.x, source2.y, target2.x, target2.y
            )) {
              // Apply forces to uncross the edges
              // Move nodes perpendicular to their edge direction
              const edge1Dx = target1.x - source1.x;
              const edge1Dy = target1.y - source1.y;
              const edge1Length = Math.sqrt(edge1Dx * edge1Dx + edge1Dy * edge1Dy);
              
              const edge2Dx = target2.x - source2.x;
              const edge2Dy = target2.y - source2.y;
              const edge2Length = Math.sqrt(edge2Dx * edge2Dx + edge2Dy * edge2Dy);
              
              if (edge1Length > 0 && edge2Length > 0) {
                // Perpendicular directions
                const perp1X = -edge1Dy / edge1Length;
                const perp1Y = edge1Dx / edge1Length;
                const perp2X = -edge2Dy / edge2Length;
                const perp2Y = edge2Dx / edge2Length;
                
                // Scale force based on how close the intersection is to edge midpoints
                // This makes the force gentler and more targeted
                const force = crossingAvoidanceStrength * 0.1; // Much gentler force
                
                // Apply perpendicular forces to separate the crossing edges
                // Only apply to one pair to avoid over-correction
                source1.vx += perp1X * force;
                source1.vy += perp1Y * force;
                target1.vx += perp1X * force;
                target1.vy += perp1Y * force;
                
                source2.vx -= perp1X * force; // Use same perpendicular direction
                source2.vy -= perp1Y * force;
                target2.vx -= perp1X * force;
                target2.vy -= perp1Y * force;
              }
            }
          }
        }
      }

      // Apply forces and update positions
      layoutNodes.forEach(node => {
        node.vx *= dampening;
        node.vy *= dampening;
        
        node.x += node.vx;
        node.y += node.vy;
        
        // Keep nodes within bounds (accounting for node radius)
        node.x = Math.max(margin + node.radius, Math.min(virtualWidth - margin - node.radius, node.x));
        node.y = Math.max(margin + node.radius, Math.min(virtualHeight - margin - node.radius, node.y));
      });
    }

    // Return updated positions
    return layoutNodes.map(({ vx, vy, ...node }) => node);
  }, []); // No dependencies needed as this is a pure function

  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const fitToView = useCallback(() => {
    if (nodes.length === 0) {
      resetView();
      return;
    }

    // Calculate bounding box of all nodes
    const padding = 100; // Extra padding around the content
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.x - node.radius); // Account for actual node radius
      maxX = Math.max(maxX, node.x + node.radius);
      minY = Math.min(minY, node.y - node.radius);
      maxY = Math.max(maxY, node.y + node.radius);
    });

    const contentWidth = maxX - minX + 2 * padding;
    const contentHeight = maxY - minY + 2 * padding;

    // Calculate scale to fit content in canvas
    const scaleX = canvasSize.width / contentWidth;
    const scaleY = canvasSize.height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    // Calculate center position
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const canvasCenterX = canvasSize.width / 2;
    const canvasCenterY = canvasSize.height / 2;

    const x = canvasCenterX - contentCenterX * scale;
    const y = canvasCenterY - contentCenterY * scale;

    setTransform({ x, y, scale });
  }, [nodes, canvasSize]);

  // Track if we need to auto-fit
  const [shouldAutoFit, setShouldAutoFit] = useState(false);

  // Update graph when connections change
  useEffect(() => {
    if (connections.length === 0) {
      setNodes([]);
      setEdges([]);
      resetView();
      return;
    }

    setNodes((prevNodes) => {
      const nodeMap = new Map<string, Node>();
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const hadNodes = prevNodes.length > 0;

      // Build map of existing nodes for position preservation
      const existingNodePositions = new Map<string, { x: number; y: number }>();
      prevNodes.forEach((node) => {
        existingNodePositions.set(node.id, { x: node.x, y: node.y });
      });

      // Collect all words that appear in current connections
      const wordsInConnections = new Set<string>();
      connections.forEach((conn) => {
        wordsInConnections.add(conn.word1);
        wordsInConnections.add(conn.word2);
      });

      // Create nodes only for words that appear in connections
      wordsInConnections.forEach((word) => {
        const existingPosition = existingNodePositions.get(word);
        const position = existingPosition || generateInitialPosition(word, newNodes);
        const radius = calculateNodeRadius(word);
        
        const node: Node = {
          id: word,
          x: position.x,
          y: position.y,
          word: word,
          radius: radius,
        };
        nodeMap.set(word, node);
        newNodes.push(node);
      });

      connections.forEach((conn) => {
        // Nodes are already created above, just create edges

        // Create edge if it doesn't exist
        const edgeExists = newEdges.some(
          (edge) =>
            (edge.source === conn.word1 && edge.target === conn.word2) ||
            (edge.source === conn.word2 && edge.target === conn.word1)
        );

        if (!edgeExists) {
          newEdges.push({
            source: conn.word1,
            target: conn.word2,
            reference: conn.reference,
            versePositions: conn.versePositions,
          });
        }
      });

      // Apply force-directed layout to minimize edge crossings
      const layoutedNodes = applyForceDirectedLayout(newNodes, newEdges);

      // Update edges in a separate effect to avoid dependency issues
      setEdges(newEdges);

      // Mark for auto-fit when first nodes are added or when starting fresh
      if (!hadNodes && layoutedNodes.length > 0) {
        setShouldAutoFit(true);
      }

      return layoutedNodes;
    });
  }, [applyForceDirectedLayout, connections, calculateNodeRadius]);

  // Auto-fit effect - separate from the nodes update
  useEffect(() => {
    if (shouldAutoFit && nodes.length > 0) {
      setTimeout(() => {
        fitToView();
        setShouldAutoFit(false);
      }, 50);
    }
  }, [shouldAutoFit, nodes.length, fitToView]);

  // Auto-fit when canvas size changes and we have nodes
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to ensure canvas is properly resized
      const timeoutId = setTimeout(() => {
        // Inline the fit logic to avoid dependency issues
        const padding = 100;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        nodes.forEach(node => {
          minX = Math.min(minX, node.x - node.radius);
          maxX = Math.max(maxX, node.x + node.radius);
          minY = Math.min(minY, node.y - node.radius);
          maxY = Math.max(maxY, node.y + node.radius);
        });

        const contentWidth = maxX - minX + 2 * padding;
        const contentHeight = maxY - minY + 2 * padding;

        const scaleX = canvasSize.width / contentWidth;
        const scaleY = canvasSize.height / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;
        const canvasCenterX = canvasSize.width / 2;
        const canvasCenterY = canvasSize.height / 2;

        const x = canvasCenterX - contentCenterX * scale;
        const y = canvasCenterY - contentCenterY * scale;

        setTransform({ x, y, scale });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [canvasSize.width, canvasSize.height, nodes]);

  // Pan and zoom event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initialScale = 1;
    const initialTransform = { x: 0, y: 0, scale: 1 };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform((prev) => {
        // Simple and reliable: only Cmd+scroll zooms, everything else pans
        if (e.metaKey) {
          // Zoom with Cmd+scroll
          const zoomFactor = 1 - e.deltaY * 0.01;
          const newScale = Math.max(0.1, Math.min(5, prev.scale * zoomFactor));

          // Zoom towards mouse position
          const scaleChange = newScale / prev.scale;
          const newX = mouseX - (mouseX - prev.x) * scaleChange;
          const newY = mouseY - (mouseY - prev.y) * scaleChange;

          return { x: newX, y: newY, scale: newScale };
        } else {
          // Pan - all trackpad gestures (horizontal and vertical scrolling)
          return {
            ...prev,
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          };
        }
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Convert mouse coordinates to graph coordinates
      const graphX = (mouseX - transform.x) / transform.scale;
      const graphY = (mouseY - transform.y) / transform.scale;

      // Check if click is on an edge
      let clickedEdge = null;
      for (const edge of edges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          // Calculate distance from point to line segment
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

          // If click is within 15 pixels of the edge
          if (distance < 15) {
            clickedEdge = edge;
            break;
          }
        }
      }

      if (clickedEdge) {
        // Find ALL connections between these two words
        const allConnections = connectionsRef.current.filter(conn => 
          (conn.word1 === clickedEdge.source && conn.word2 === clickedEdge.target) ||
          (conn.word1 === clickedEdge.target && conn.word2 === clickedEdge.source)
        );
        
        if (allConnections.length > 0) {
          setSelectedEdge({ edge: clickedEdge, connection: allConnections[0], allConnections });
          return; // Don't start dragging if we clicked an edge
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

      setTransform((prev) => ({
        ...prev,
        x: lastPanPoint.x + deltaX,
        y: lastPanPoint.y + deltaY,
      }));
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

    // Set initial cursor
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, dragStart, lastPanPoint, transform, edges, nodes]);

  // Drawing effect with transform applied
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    if (nodes.length === 0) {
      // Empty state will be handled by JSX overlay
      ctx.restore();
      return;
    }

    // Draw edges
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1 / transform.scale; // Keep line width consistent
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        // Draw reference label
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;

        // Count connections for this edge using ref to avoid dependency issues
        const connectionCount = connectionsRef.current.filter(conn => 
          (conn.word1 === edge.source && conn.word2 === edge.target) ||
          (conn.word1 === edge.target && conn.word2 === edge.source)
        ).length;

        // Create display text - show count if more than 1 connection
        const displayText = connectionCount > 1 
          ? `${edge.reference} (${connectionCount})`
          : edge.reference;

        // Calculate angle for text rotation
        let angle = Math.atan2(
          targetNode.y - sourceNode.y,
          targetNode.x - sourceNode.x
        );

        // Keep text right side up by flipping if angle is > 90° or < -90°
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
          angle += Math.PI;
        }

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);

        // Background for text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const fontSize = 10 / transform.scale;
        ctx.font = `${fontSize}px Arial`;
        const textWidth = ctx.measureText(displayText).width;
        ctx.fillRect(-textWidth / 2 - 2, -8, textWidth + 4, 12);

        // Text
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(displayText, 0, -2);
        ctx.restore();
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const nodeColor = getNodeColor(node.word);
      
      // Parse Tailwind classes to get actual colors
      const getColorsFromTailwind = (classes: string) => {
        // Extract background and text colors from Tailwind classes
        if (classes.includes('bg-yellow-200')) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
        if (classes.includes('bg-blue-200')) return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
        if (classes.includes('bg-green-200')) return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
        if (classes.includes('bg-red-200')) return { bg: '#fecaca', text: '#dc2626', border: '#ef4444' };
        if (classes.includes('bg-purple-200')) return { bg: '#e9d5ff', text: '#7c3aed', border: '#8b5cf6' };
        if (classes.includes('bg-pink-200')) return { bg: '#fce7f3', text: '#be185d', border: '#ec4899' };
        if (classes.includes('bg-indigo-200')) return { bg: '#c7d2fe', text: '#4338ca', border: '#6366f1' };
        if (classes.includes('bg-orange-200')) return { bg: '#fed7aa', text: '#ea580c', border: '#f97316' };
        
        // Dark mode colors
        if (classes.includes('bg-yellow-300')) return { bg: '#fcd34d', text: '#92400e', border: '#f59e0b' };
        if (classes.includes('bg-blue-300')) return { bg: '#93c5fd', text: '#1e40af', border: '#3b82f6' };
        if (classes.includes('bg-green-300')) return { bg: '#86efac', text: '#166534', border: '#22c55e' };
        if (classes.includes('bg-red-300')) return { bg: '#fca5a5', text: '#dc2626', border: '#ef4444' };
        if (classes.includes('bg-purple-300')) return { bg: '#c4b5fd', text: '#7c3aed', border: '#8b5cf6' };
        if (classes.includes('bg-pink-300')) return { bg: '#f9a8d4', text: '#be185d', border: '#ec4899' };
        if (classes.includes('bg-indigo-300')) return { bg: '#a5b4fc', text: '#4338ca', border: '#6366f1' };
        if (classes.includes('bg-orange-300')) return { bg: '#fdba74', text: '#ea580c', border: '#f97316' };
        
        // Pairings colors (border-based)
        if (classes.includes('border-teal-500')) return { bg: 'transparent', text: '#0f766e', border: '#14b8a6' };
        if (classes.includes('border-cyan-500')) return { bg: 'transparent', text: '#0e7490', border: '#06b6d4' };
        if (classes.includes('border-lime-500')) return { bg: 'transparent', text: '#365314', border: '#84cc16' };
        if (classes.includes('border-amber-500')) return { bg: 'transparent', text: '#92400e', border: '#f59e0b' };
        if (classes.includes('border-rose-500')) return { bg: 'transparent', text: '#be123c', border: '#f43f5e' };
        if (classes.includes('border-violet-500')) return { bg: 'transparent', text: '#6b21a8', border: '#8b5cf6' };
        if (classes.includes('border-emerald-500')) return { bg: 'transparent', text: '#065f46', border: '#10b981' };
        if (classes.includes('border-sky-500')) return { bg: 'transparent', text: '#0c4a6e', border: '#0ea5e9' };
        
        // Dark mode pairings colors
        if (classes.includes('border-teal-400')) return { bg: 'transparent', text: '#2dd4bf', border: '#2dd4bf' };
        if (classes.includes('border-cyan-400')) return { bg: 'transparent', text: '#22d3ee', border: '#22d3ee' };
        if (classes.includes('border-lime-400')) return { bg: 'transparent', text: '#a3e635', border: '#a3e635' };
        if (classes.includes('border-amber-400')) return { bg: 'transparent', text: '#fbbf24', border: '#fbbf24' };
        if (classes.includes('border-rose-400')) return { bg: 'transparent', text: '#fb7185', border: '#fb7185' };
        if (classes.includes('border-violet-400')) return { bg: 'transparent', text: '#a78bfa', border: '#a78bfa' };
        if (classes.includes('border-emerald-400')) return { bg: 'transparent', text: '#34d399', border: '#34d399' };
        if (classes.includes('border-sky-400')) return { bg: 'transparent', text: '#38bdf8', border: '#38bdf8' };
        
        // Default colors
        if (classes.includes('bg-gray-600')) return { bg: '#4b5563', text: '#e5e7eb', border: '#6b7280' };
        return { bg: '#f3f4f6', text: '#374151', border: '#6b7280' };
      };
      
      const colors = getColorsFromTailwind(nodeColor.background);
      
      // Draw circle with dynamic radius
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      
      if (colors.bg === 'transparent') {
        // For pairings terms, use a subtle background with prominent border
        ctx.fillStyle = isDarkMode ? '#374151' : '#f9fafb';
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3 / transform.scale; // Thicker border for pairings
      } else {
        // For main search terms, use the background color
        ctx.fillStyle = colors.bg;
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2 / transform.scale;
      }
      ctx.stroke();

      // Draw text
      ctx.fillStyle = colors.text;
      const fontSize = 12 / transform.scale;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(node.word, node.x, node.y + 4);
    });

    ctx.restore();
  }, [nodes, edges, transform]);

  if (selectedEdge) {
    // Show modal view
    return (
      <div ref={containerRef} className='w-full h-full flex flex-col bg-white'>
        {/* Header */}
        <div className='px-3 py-2 border-b bg-white shadow-sm flex justify-between items-center flex-shrink-0'>
          <h3 className='text-sm font-semibold text-gray-800'>
            {selectedEdge.edge.source} ↔ {selectedEdge.edge.target}
          </h3>
          <button
            onClick={() => setSelectedEdge(null)}
            className='text-gray-500 hover:text-gray-700 text-lg font-bold px-1 py-0.5 rounded hover:bg-gray-100'
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          <div className='text-sm text-gray-600 mb-4'>
            {(() => {
              // Get current connections for this word pair (real-time)
              const currentConnections = connectionsRef.current.filter(conn => 
                (conn.word1 === selectedEdge.edge.source && conn.word2 === selectedEdge.edge.target) ||
                (conn.word1 === selectedEdge.edge.target && conn.word2 === selectedEdge.edge.source)
              );
              
              return currentConnections.length > 0 
                ? `Found ${currentConnections.length} connection(s) between these words`
                : 'No connections currently selected for these words';
            })()}
          </div>
          
          {(() => {
            // Get current connections and verses (real-time)
            const currentConnections = connectionsRef.current.filter(conn => 
              (conn.word1 === selectedEdge.edge.source && conn.word2 === selectedEdge.edge.target) ||
              (conn.word1 === selectedEdge.edge.target && conn.word2 === selectedEdge.edge.source)
            );
            
            if (currentConnections.length === 0) {
              return (
                <div className='text-center py-8 text-gray-500'>
                  <p>No verses currently selected for this word pair.</p>
                  <p className='text-sm mt-2'>Add pairings from the search results to see verses here.</p>
                </div>
              );
            }
            
            // Collect all unique verse positions from current connections
            const allVersePositions = new Set<number>();
            currentConnections.forEach(conn => {
              conn.versePositions?.forEach(pos => allVersePositions.add(pos));
            });

            const verses = kjvParser.getVerses();
            const sortedPositions = Array.from(allVersePositions).sort((a, b) => a - b);
            
            // Group connections by verse positions to create consolidated pairings
            const verseGroupMap = new Map<string, typeof currentConnections>();
            currentConnections.forEach(conn => {
              const verseKey = conn.versePositions?.slice().sort((a, b) => a - b).join(',') || '';
              if (!verseGroupMap.has(verseKey)) {
                verseGroupMap.set(verseKey, []);
              }
              verseGroupMap.get(verseKey)!.push(conn);
            });

            const allVerses = kjvParser.getVerses();
            
            return (
              <div className='space-y-2'>
                {Array.from(verseGroupMap.entries()).map(([verseKey, connections]) => {
                  if (connections.length === 0) return null;
                  
                  const firstConn = connections[0];
                  const versePositions = firstConn.versePositions || [];
                  const verseObjects = versePositions
                    .map(pos => allVerses.find(v => v.position === pos))
                    .filter(Boolean) as typeof allVerses;
                  
                  if (verseObjects.length === 0) return null;

                  // Create a mock pairing for the shared component
                  const mockPairing: VersePairing = {
                    verses: verseObjects,
                    term1: connections[0].word1,
                    term2: connections[0].word2,
                    proximity: 0,
                    // Add consolidated term pairs if multiple connections
                    allTermPairs: connections.length > 1 
                      ? connections.map(conn => `${conn.word1} ↔ ${conn.word2}`)
                      : undefined,
                  };

                  return (
                    <PairingDisplay
                      key={verseKey}
                      pairing={mockPairing}
                      searchTerms={`${selectedEdge.edge.source} ${selectedEdge.edge.target}`}
                      isDarkMode={false}
                      showCheckbox={false}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Show graph view
  return (
    <div ref={containerRef} className='w-full h-full relative overflow-hidden'>
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
      
      {/* Empty state message */}
      {nodes.length === 0 && (
        <div className='absolute inset-0 flex items-center justify-center p-8'>
          <div className='text-center text-gray-500 max-w-sm'>
            <p className='text-sm leading-relaxed'>
              Select word pairs from the results to build your graph
            </p>
          </div>
        </div>
      )}
      
      {/* Control buttons */}
      {nodes.length > 0 && (
        <div className='absolute top-2 right-2'>
          <button
            onClick={fitToView}
            className='px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors'
            title='Fit graph to view'
          >
            Fit to View
          </button>
        </div>
      )}
    </div>
  );
}
