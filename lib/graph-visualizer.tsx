'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GraphCanvas } from '../components/graph/graph-canvas';
import { GraphModal } from '../components/graph/graph-modal';
import { applyForceDirectedLayout, generateInitialPosition, calculateNodeRadius } from './graph/force-layout';

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
  initialTransform?: {
    x: number;
    y: number;
    scale: number;
  };
  onTransformChange?: (transform: { x: number; y: number; scale: number }) => void;
}

export function GraphVisualizer({ 
  connections, 
  searchTerms = '', 
  pairingsSearchTerms = '', 
  isDarkMode = false,
  initialTransform = { x: 0, y: 0, scale: 1 },
  onTransformChange
}: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState(initialTransform);
  const [selectedEdge, setSelectedEdge] = useState<{
    edge: Edge;
    connection: typeof connections[0];
    allConnections?: typeof connections;
  } | null>(null);

  // Update canvas size when container resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(300, Math.floor(rect.width - 4));
        const height = Math.max(200, Math.floor(rect.height - 4));
        setCanvasSize({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  const resetView = () => {
    const newTransform = { x: 0, y: 0, scale: 1 };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  };

  // Handle transform changes with persistence
  const handleTransformChange = useCallback((newTransform: { x: number; y: number; scale: number }) => {
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  }, [onTransformChange]);

  const [shouldAutoFit, setShouldAutoFit] = useState(false);

  const fitToView = useCallback(() => {
    if (nodes.length === 0) {
      resetView();
      return;
    }

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

    const newTransform = { x, y, scale };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  }, [nodes, canvasSize]);

  // Update graph when connections change
  useEffect(() => {
    if (connections.length === 0) {
      setNodes([]);
      setEdges([]);
      resetView();
      return;
    }

    setNodes((prevNodes) => {
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
        newNodes.push(node);
      });

      connections.forEach((conn) => {
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
      setEdges(newEdges);

      // Mark for auto-fit when first nodes are added
      if (!hadNodes && layoutedNodes.length > 0) {
        setShouldAutoFit(true);
      }

      return layoutedNodes;
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

  const handleEdgeClick = (edge: Edge, allConnections: typeof connections) => {
    setSelectedEdge({ edge, connection: allConnections[0], allConnections });
  };

  if (selectedEdge) {
    return (
      <div ref={containerRef} className='w-full h-full'>
        <GraphModal
          selectedEdge={selectedEdge}
          connections={connections}
          onClose={() => setSelectedEdge(null)}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className='w-full h-full relative overflow-hidden'>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        connections={connections}
        searchTerms={searchTerms}
        pairingsSearchTerms={pairingsSearchTerms}
        isDarkMode={isDarkMode}
        canvasSize={canvasSize}
        transform={transform}
        onEdgeClick={handleEdgeClick}
        onTransformChange={handleTransformChange}
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
