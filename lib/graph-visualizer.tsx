'use client';

import React, { useRef, useEffect, useState } from 'react';

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
  }>;
}

export function GraphVisualizer({ connections }: GraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Generate a position for a new node that doesn't overlap with existing nodes
  const generateNodePosition = (
    existingNodes: Node[],
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const margin = 60;
    const minDistance = 120;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const x = margin + Math.random() * (canvasWidth - 2 * margin);
      const y = margin + Math.random() * (canvasHeight - 2 * margin);

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
    const cellWidth = (canvasWidth - 2 * margin) / gridSize;
    const cellHeight = (canvasHeight - 2 * margin) / gridSize;
    const index = existingNodes.length;
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    return {
      x: margin + col * cellWidth + cellWidth / 2,
      y: margin + row * cellHeight + cellHeight / 2,
    };
  };

  // Update graph when connections change
  useEffect(() => {
    if (connections.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    const canvasHeight = canvas?.height || 600;

    setNodes((prevNodes) => {
      const nodeMap = new Map<string, Node>();
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Build map of existing nodes first
      prevNodes.forEach((node) => {
        nodeMap.set(node.id, node);
        newNodes.push(node);
      });

      connections.forEach((conn) => {
        // Create nodes if they don't exist
        if (!nodeMap.has(conn.word1)) {
          const position = generateNodePosition(
            newNodes,
            canvasWidth,
            canvasHeight
          );
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
          const position = generateNodePosition(
            newNodes,
            canvasWidth,
            canvasHeight
          );
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

      return newNodes;
    });
  }, [connections]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (nodes.length === 0) {
      // Show empty state message
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
    ctx.lineWidth = 1;
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
        const textWidth = ctx.measureText(edge.reference).width;
        ctx.fillRect(-textWidth / 2 - 2, -8, textWidth + 4, 12);

        // Text
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
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
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.word, node.x, node.y + 4);
    });
  }, [nodes, edges]);

  return (
    <div className='w-full h-full'>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className='border border-gray-300 w-full h-full bg-white'
      />
    </div>
  );
}
