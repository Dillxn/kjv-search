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

// Helper function to check if two line segments intersect
function doLinesIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Function to resolve overlapping nodes after force simulation
function resolveOverlaps(nodes: Node[]) {
  const maxIterations = 50;
  let hasOverlaps = true;
  let iteration = 0;

  while (hasOverlaps && iteration < maxIterations) {
    hasOverlaps = false;
    iteration++;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = nodeA.radius + nodeB.radius + 25;
        
        if (distance < minDistance && distance > 0) {
          hasOverlaps = true;
          
          // Calculate how much to separate the nodes
          const overlap = minDistance - distance;
          const separationDistance = overlap / 2 + 5; // Add extra padding
          
          // Normalize the direction vector
          const dirX = dx / distance;
          const dirY = dy / distance;
          
          // Move nodes apart
          nodeA.x -= dirX * separationDistance;
          nodeA.y -= dirY * separationDistance;
          nodeB.x += dirX * separationDistance;
          nodeB.y += dirY * separationDistance;
          
          // Keep nodes within bounds
          const virtualWidth = 1200;
          const virtualHeight = 900;
          const margin = 100;
          
          nodeA.x = Math.max(margin + nodeA.radius, Math.min(virtualWidth - margin - nodeA.radius, nodeA.x));
          nodeA.y = Math.max(margin + nodeA.radius, Math.min(virtualHeight - margin - nodeA.radius, nodeA.y));
          nodeB.x = Math.max(margin + nodeB.radius, Math.min(virtualWidth - margin - nodeB.radius, nodeB.x));
          nodeB.y = Math.max(margin + nodeB.radius, Math.min(virtualHeight - margin - nodeB.radius, nodeB.y));
        }
      }
    }
  }
}

// Force-directed layout algorithm to minimize edge crossings and prevent overlaps
export function applyForceDirectedLayout(nodes: Node[], edges: Edge[]): Node[] {
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const iterations = 150;
  const repulsionStrength = 50000;
  const attractionStrength = 0.02;
  const crossingAvoidanceStrength = 1000;
  const dampening = 0.85;
  const idealEdgeLength = 200;

  // Create a copy of nodes to modify
  const layoutNodes = nodes.map(node => ({ ...node, vx: 0, vy: 0 }));

  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    layoutNodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Strong repulsion forces between all nodes to prevent overlapping
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const nodeA = layoutNodes[i];
        const nodeB = layoutNodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const minDistance = nodeA.radius + nodeB.radius + 30; // Increased minimum distance
        
        if (distance > 0) {
          let force = 0;
          
          // Very strong repulsion when nodes are overlapping or too close
          if (distance < minDistance) {
            force = repulsionStrength * (minDistance - distance) / (distance * distance);
          } else if (distance < minDistance * 2) {
            // Moderate repulsion for nearby nodes
            force = repulsionStrength * 0.3 / (distance * distance);
          } else if (distance < minDistance * 4) {
            // Weak repulsion for distant nodes
            force = repulsionStrength * 0.1 / (distance * distance);
          }
          
          if (force > 0) {
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }
    }

    // Attraction forces along edges
    edges.forEach(edge => {
      const sourceNode = layoutNodes.find(n => n.id === edge.source);
      const targetNode = layoutNodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
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
          if (doLinesIntersect(
            source1.x, source1.y, target1.x, target1.y,
            source2.x, source2.y, target2.x, target2.y
          )) {
            const edge1Dx = target1.x - source1.x;
            const edge1Dy = target1.y - source1.y;
            const edge1Length = Math.sqrt(edge1Dx * edge1Dx + edge1Dy * edge1Dy);
            
            if (edge1Length > 0) {
              const perp1X = -edge1Dy / edge1Length;
              const perp1Y = edge1Dx / edge1Length;
              
              const force = crossingAvoidanceStrength * 0.1;
              
              source1.vx += perp1X * force;
              source1.vy += perp1Y * force;
              target1.vx += perp1X * force;
              target1.vy += perp1Y * force;
              
              source2.vx -= perp1X * force;
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
      
      // Keep nodes within bounds
      node.x = Math.max(margin + node.radius, Math.min(virtualWidth - margin - node.radius, node.x));
      node.y = Math.max(margin + node.radius, Math.min(virtualHeight - margin - node.radius, node.y));
    });
  }

  // Post-processing: Resolve any remaining overlaps
  resolveOverlaps(layoutNodes);

  // Return updated positions (remove velocity properties)
  return layoutNodes.map(({ vx: _vx, vy: _vy, ...node }) => node);
}

// Generate initial position for a node based on its word, avoiding existing nodes
export function generateInitialPosition(word: string, existingNodes: Node[]) {
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const minNodeDistance = 120; // Minimum distance between nodes

  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  // Try multiple positions to find one that doesn't overlap
  const maxAttempts = 50;
  const hash = hashCode(word.toLowerCase());
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Use hash + attempt to get different positions
    const seedX = (hash + attempt * 1234) % (virtualWidth - 2 * margin);
    const seedY = ((hash >> 8) + attempt * 5678) % (virtualHeight - 2 * margin);
    
    const x = margin + seedX;
    const y = margin + seedY;
    
    // Check if this position conflicts with existing nodes
    let hasConflict = false;
    for (const existingNode of existingNodes) {
      const dx = x - existingNode.x;
      const dy = y - existingNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minNodeDistance) {
        hasConflict = true;
        break;
      }
    }
    
    if (!hasConflict) {
      return { x, y };
    }
  }
  
  // If no good position found, use a grid-based approach
  const gridSize = Math.ceil(Math.sqrt(existingNodes.length + 1));
  const cellWidth = (virtualWidth - 2 * margin) / gridSize;
  const cellHeight = (virtualHeight - 2 * margin) / gridSize;
  
  const nodeIndex = existingNodes.length;
  const gridX = nodeIndex % gridSize;
  const gridY = Math.floor(nodeIndex / gridSize);
  
  const x = margin + gridX * cellWidth + cellWidth / 2;
  const y = margin + gridY * cellHeight + cellHeight / 2;
  
  return { x, y };
}

// Calculate node radius based on text width
export function calculateNodeRadius(word: string, fontSize: number = 12): number {
  // Use a more predictable calculation to avoid canvas creation issues
  const estimatedCharWidth = fontSize * 0.6; // Approximate character width
  const textWidth = word.length * estimatedCharWidth;
  
  const padding = 25; // Padding around text
  const minRadius = Math.max(40, (textWidth / 2) + padding);
  
  // Ensure reasonable bounds
  return Math.min(Math.max(minRadius, 40), 85);
}