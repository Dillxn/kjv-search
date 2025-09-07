'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GraphCanvas } from '../components/graph/graph-canvas';
import { GraphModal } from '../components/graph/graph-modal';
import { PathSlider } from '../components/graph/path-slider';
import { IconButton } from '../components/ui/button';
import {
  applyForceDirectedLayout,
  generateInitialPosition,
  calculateNodeRadius,
} from './graph/force-layout';
import { getAllPathsBetweenNodes } from './graph/path-finding';
import { Fullscreen, Maximize2, RotateCcw } from 'lucide-react';
import { getBackgroundClass } from './theme-utils';

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
  onTransformChange?: (transform: {
    x: number;
    y: number;
    scale: number;
  }) => void;
  selectedNodes?: string[];
  onNodeClick?: (nodeId: string) => void;
  onClearSelection?: () => void;
  currentPathIndex?: number;
  onPathIndexChange?: (index: number) => void;
  excludedEdges?: string[];
  onEdgeExclusionToggle?: (edgeId: string) => void;
}

export function GraphVisualizer({
  connections,
  searchTerms = '',
  pairingsSearchTerms = '',
  isDarkMode = false,
  initialTransform = { x: 0, y: 0, scale: 1 },
  onTransformChange,
  selectedNodes = [],
  onNodeClick,
  onClearSelection,
  currentPathIndex = 0,
  onPathIndexChange,
  excludedEdges = [],
  onEdgeExclusionToggle,
}: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState(initialTransform);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<{
    edge: Edge;
    connection: (typeof connections)[0];
    allConnections?: typeof connections;
  } | null>(null);
  const [availablePaths, setAvailablePaths] = useState<string[][]>([]);

  // Update canvas size when container resizes or full-screen changes
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
  }, [isFullScreen]);

  // Handle escape key to exit full-screen
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    if (isFullScreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullScreen]);

  // Handle transform changes with persistence
  const handleTransformChange = useCallback(
    (newTransform: { x: number; y: number; scale: number }) => {
      setTransform(newTransform);
      onTransformChange?.(newTransform);
    },
    [onTransformChange]
  );

  // Handle initial transform changes (like from tab switching)
  useEffect(() => {
    // Use requestAnimationFrame to smooth the transform update
    const rafId = requestAnimationFrame(() => {
      setTransform(initialTransform);
    });
    return () => cancelAnimationFrame(rafId);
  }, [initialTransform]);

  const [shouldAutoFit, setShouldAutoFit] = useState(false);

  const fitToView = useCallback(() => {
    if (nodes.length === 0) {
      // Reset view but don't call onTransformChange for empty state
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const padding = 100;
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
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
  }, [nodes, canvasSize, onTransformChange]);

  // Update graph when connections change
  useEffect(() => {
    if (connections.length === 0) {
      setNodes([]);
      setEdges([]);
      // Don't reset transform when clearing - let it maintain the current state
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
        // Safety check for valid connection data
        if (
          conn &&
          typeof conn.word1 === 'string' &&
          typeof conn.word2 === 'string'
        ) {
          wordsInConnections.add(conn.word1);
          wordsInConnections.add(conn.word2);
        } else {
          console.warn('Invalid connection data:', conn);
        }
      });

      // Create nodes only for words that appear in connections
      wordsInConnections.forEach((word) => {
        // Additional safety check for word
        if (!word || typeof word !== 'string') {
          console.warn('Skipping invalid word:', word);
          return;
        }

        const existingPosition = existingNodePositions.get(word);
        const position =
          existingPosition || generateInitialPosition(word, newNodes);
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
        // Safety check for valid connection data
        if (
          !conn ||
          typeof conn.word1 !== 'string' ||
          typeof conn.word2 !== 'string'
        ) {
          console.warn('Skipping invalid connection:', conn);
          return;
        }

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

      // Mark for auto-fit when first nodes are added, but only if we don't have a meaningful transform
      if (!hadNodes && layoutedNodes.length > 0) {
        // Only auto-fit if we're at the default transform (no meaningful pan/zoom)
        // Also check that initialTransform is default to avoid auto-fitting during tab switches
        const isDefaultTransform =
          transform.x === 0 && transform.y === 0 && transform.scale === 1;
        const isDefaultInitialTransform =
          initialTransform.x === 0 &&
          initialTransform.y === 0 &&
          initialTransform.scale === 1;
        if (isDefaultTransform && isDefaultInitialTransform) {
          setShouldAutoFit(true);
        }
      }

      return layoutedNodes;
    });
  }, [connections]);

  // Auto-fit effect - separate from the nodes update
  useEffect(() => {
    if (
      shouldAutoFit &&
      nodes.length > 0 &&
      canvasSize.width > 0 &&
      canvasSize.height > 0
    ) {
      // Use requestAnimationFrame for smoother auto-fit
      const rafId = requestAnimationFrame(() => {
        fitToView();
        setShouldAutoFit(false);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [
    shouldAutoFit,
    nodes.length,
    canvasSize.width,
    canvasSize.height,
    fitToView,
  ]);

  // Calculate available paths when two nodes are selected
  useEffect(() => {
    if (selectedNodes.length === 2 && nodes.length > 0 && edges.length > 0) {
      const [startNode, endNode] = selectedNodes;
      const paths = getAllPathsBetweenNodes(startNode, endNode, nodes, edges, excludedEdges);
      setAvailablePaths(paths);
    } else {
      setAvailablePaths([]);
    }
  }, [selectedNodes, nodes, edges, excludedEdges]);

  // Reset path index if it's out of bounds when paths change
  // Only run bounds checking after paths are available
  useEffect(() => {
    // Only check bounds when we have paths available
    if (availablePaths.length > 0) {
      // If current path index is out of bounds, reset to 0
      if (currentPathIndex >= availablePaths.length || currentPathIndex < 0) {
        onPathIndexChange?.(0);
      }
    }
    // Don't run bounds checking when paths are empty - let the external state manage it
  }, [availablePaths.length, currentPathIndex, onPathIndexChange]);

  const handleEdgeClick = (edge: Edge, allConnections: typeof connections) => {
    setSelectedEdge({ edge, connection: allConnections[0], allConnections });
  };

  const handleEdgeExclusionToggle = useCallback((edgeId: string) => {
    if (onEdgeExclusionToggle) {
      onEdgeExclusionToggle(edgeId);
    }
  }, [onEdgeExclusionToggle]);

  const handleFullScreenToggle = () => {
    setIsFullScreen(!isFullScreen);
  };

  if (selectedEdge) {
    return (
      <div
        ref={containerRef}
        className={`w-full h-full ${
          isFullScreen
            ? 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center'
            : ''
        }`}
      >
        <div
          className={
            isFullScreen ? 'w-4/5 h-4/5 max-w-4xl max-h-4xl' : 'w-full h-full'
          }
        >
          <GraphModal
            selectedEdge={selectedEdge}
            connections={connections}
            onClose={() => setSelectedEdge(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${
        isFullScreen
          ? `fixed inset-0 z-50 ${getBackgroundClass(isDarkMode)}`
          : ''
      }`}
    >
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
        onEdgeExclusionToggle={handleEdgeExclusionToggle}
        onTransformChange={handleTransformChange}
        selectedNodes={selectedNodes}
        onNodeClick={onNodeClick}
        currentPath={availablePaths[currentPathIndex] || null}
        excludedEdges={excludedEdges}
      />

      {/* Control buttons */}
      {nodes.length > 0 && (
        <div className='absolute top-2 right-2 flex gap-1'>
          {selectedNodes.length > 0 && onClearSelection && (
            <IconButton
              onClick={onClearSelection}
              title='Clear node selection'
              isDarkMode={isDarkMode}
            >
              <RotateCcw size={16} />
            </IconButton>
          )}
          <IconButton
            onClick={fitToView}
            title='Fit graph to view'
            isDarkMode={isDarkMode}
          >
            <Fullscreen size={16} />
          </IconButton>
          <IconButton
            onClick={handleFullScreenToggle}
            title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
            isDarkMode={isDarkMode}
          >
            <Maximize2 size={16} />
          </IconButton>
        </div>
      )}

      {/* Selection status and path slider */}
      {selectedNodes.length > 0 && (
        <div className='absolute top-2 left-2 flex flex-col gap-2'>
          <div className='bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm'>
            {selectedNodes.length === 1 ? (
              <span>
                Selected: <strong>{selectedNodes[0]}</strong> (click another node
                to see path)
              </span>
            ) : (
              <span>
                Path: <strong>{selectedNodes[0]}</strong> →{' '}
                <strong>{selectedNodes[1]}</strong>
              </span>
            )}
          </div>
          
          {selectedNodes.length === 2 && availablePaths.length > 1 && (
            <PathSlider
              currentPathIndex={currentPathIndex}
              totalPaths={availablePaths.length}
              onPathChange={(index) => {
                // Ensure index is within bounds
                const clampedIndex = Math.max(0, Math.min(index, availablePaths.length - 1));
                onPathIndexChange?.(clampedIndex);
              }}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      )}

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
    </div>
  );
}
