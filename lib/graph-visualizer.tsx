'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Node {
  id: string;
  x: number;
  y: number;
  word: string;
}

interface Edge {
  source: string;
  target: string;
  reference: string;
}

interface GraphVisualizerProps {
  connections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
}

export function GraphVisualizer({ connections }: GraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

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

  // Generate a position for a new node that doesn't overlap with existing nodes
  const generateNodePosition = (existingNodes: Node[]) => {
    // Use a larger virtual space for better node distribution
    const virtualWidth = 1200;
    const virtualHeight = 900;
    const margin = 100;
    const minDistance = 150;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const x = margin + Math.random() * (virtualWidth - 2 * margin);
      const y = margin + Math.random() * (virtualHeight - 2 * margin);

      // Check if this position is far enough from existing nodes
      const tooClose = existingNodes.some((node) => {
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        return distance < minDistance;
      });

      if (!tooClose) {
        return { x, y };
      }
      attempts++;
    }

    // Fallback: use a grid-based position
    const gridSize = Math.ceil(Math.sqrt(existingNodes.length + 1));
    const cellWidth = (virtualWidth - 2 * margin) / gridSize;
    const cellHeight = (virtualHeight - 2 * margin) / gridSize;
    const index = existingNodes.length;
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    return {
      x: margin + col * cellWidth + cellWidth / 2,
      y: margin + row * cellHeight + cellHeight / 2,
    };
  };

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
      minX = Math.min(minX, node.x - 35); // Account for node radius
      maxX = Math.max(maxX, node.x + 35);
      minY = Math.min(minY, node.y - 35);
      maxY = Math.max(maxY, node.y + 35);
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

      // Build map of existing nodes first
      prevNodes.forEach((node) => {
        nodeMap.set(node.id, node);
        newNodes.push(node);
      });

      connections.forEach((conn) => {
        // Create nodes if they don't exist
        if (!nodeMap.has(conn.word1)) {
          const position = generateNodePosition(newNodes);
          const node: Node = {
            id: conn.word1,
            x: position.x,
            y: position.y,
            word: conn.word1,
          };
          nodeMap.set(conn.word1, node);
          newNodes.push(node);
        }

        if (!nodeMap.has(conn.word2)) {
          const position = generateNodePosition(newNodes);
          const node: Node = {
            id: conn.word2,
            x: position.x,
            y: position.y,
            word: conn.word2,
          };
          nodeMap.set(conn.word2, node);
          newNodes.push(node);
        }

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
          });
        }
      });

      // Update edges in a separate effect to avoid dependency issues
      setEdges(newEdges);

      // Mark for auto-fit when first nodes are added or when starting fresh
      if (!hadNodes && newNodes.length > 0) {
        setShouldAutoFit(true);
      }

      return newNodes;
    });
  }, [connections]);

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
          minX = Math.min(minX, node.x - 35);
          maxX = Math.max(maxX, node.x + 35);
          minY = Math.min(minY, node.y - 35);
          maxY = Math.max(maxY, node.y + 35);
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

    let initialScale = 1;
    let initialTransform = { x: 0, y: 0, scale: 1 };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform((prev) => {
        // Detect zoom gestures: ctrlKey (pinch), metaKey (cmd+scroll), or deltaZ
        const isZoomGesture = e.ctrlKey || e.metaKey || Math.abs(e.deltaZ) > 0;

        // Also detect zoom if deltaX and deltaY are both 0 but deltaY is significant (mouse wheel)
        const isMouseWheel =
          e.deltaX === 0 && Math.abs(e.deltaY) > 0 && e.deltaZ === 0;

        if (isZoomGesture || isMouseWheel) {
          // Zoom
          let zoomDelta = e.deltaY;

          // Use deltaZ if available (some trackpads)
          if (Math.abs(e.deltaZ) > Math.abs(e.deltaY)) {
            zoomDelta = e.deltaZ;
          }

          const zoomFactor = 1 - zoomDelta * 0.01;
          const newScale = Math.max(0.1, Math.min(5, prev.scale * zoomFactor));

          // Zoom towards mouse position
          const scaleChange = newScale / prev.scale;
          const newX = mouseX - (mouseX - prev.x) * scaleChange;
          const newY = mouseY - (mouseY - prev.y) * scaleChange;

          return { x: newX, y: newY, scale: newScale };
        } else {
          // Pan - trackpad scroll gestures
          return {
            ...prev,
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          };
        }
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
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

    // Handle Safari/WebKit gesture events for better trackpad support
    const handleGestureStart = (e: Event & Partial<{ scale: number }>) => {
      e.preventDefault();
      initialScale = e.scale || 1;
      initialTransform = { ...transform };
    };

    const handleGestureChange = (e: Event & Partial<{ scale: number }>) => {
      e.preventDefault();
      const scaleChange = (e.scale || 1) / initialScale;
      const newScale = Math.max(
        0.1,
        Math.min(5, initialTransform.scale * scaleChange)
      );

      setTransform({
        ...initialTransform,
        scale: newScale,
      });
    };

    const handleGestureEnd = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Add gesture event listeners for Safari/WebKit
    canvas.addEventListener('gesturestart', handleGestureStart, {
      passive: false,
    });
    canvas.addEventListener('gesturechange', handleGestureChange, {
      passive: false,
    });
    canvas.addEventListener('gestureend', handleGestureEnd, { passive: false });

    // Set initial cursor
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('gesturestart', handleGestureStart);
      canvas.removeEventListener('gesturechange', handleGestureChange);
      canvas.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [isDragging, dragStart, lastPanPoint, transform]);

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
      // Show empty state message (reset transform for centered text)
      ctx.restore();
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Select word pairs from the results to build your graph',
        canvas.width / 2,
        canvas.height / 2
      );
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

        // Calculate angle for text rotation
        const angle = Math.atan2(
          targetNode.y - sourceNode.y,
          targetNode.x - sourceNode.x
        );

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);

        // Background for text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const fontSize = 10 / transform.scale;
        ctx.font = `${fontSize}px Arial`;
        const textWidth = ctx.measureText(edge.reference).width;
        ctx.fillRect(-textWidth / 2 - 2, -8, textWidth + 4, 12);

        // Text
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(edge.reference, 0, -2);
        ctx.restore();
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      // Draw circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 35, 0, 2 * Math.PI);
      ctx.fillStyle = '#f8f9fa';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2 / transform.scale; // Keep stroke width consistent
      ctx.stroke();

      // Draw text
      ctx.fillStyle = '#333';
      const fontSize = 12 / transform.scale;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(node.word, node.x, node.y + 4);
    });

    ctx.restore();
  }, [nodes, edges, transform]);

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
      {nodes.length > 0 && (
        <div className='absolute top-2 right-2 flex gap-1'>
          <button
            onClick={fitToView}
            className='px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors'
            title='Fit graph to view'
          >
            Fit to View
          </button>
          <button
            onClick={resetView}
            className='px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
            title='Reset view (zoom and pan)'
          >
            Reset View
          </button>
        </div>
      )}
    </div>
  );
}
