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

// Enhanced overlap resolution that maintains even distribution on both X and Y axes
function resolveOverlapsWithDistribution(nodes: Node[], idealSpacing: number) {
  const maxIterations = 30;
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const availableWidth = virtualWidth - 2 * margin;
  const availableHeight = virtualHeight - 2 * margin;
  
  // Calculate ideal X and Y spacing
  const idealXSpacing = availableWidth / Math.ceil(Math.sqrt(nodes.length));
  const idealYSpacing = availableHeight / Math.ceil(Math.sqrt(nodes.length));
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasOverlaps = false;
    const forces: Array<{ x: number; y: number }> = nodes.map(() => ({ x: 0, y: 0 }));

    // Calculate forces for each node
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const xDistance = Math.abs(dx);
        const yDistance = Math.abs(dy);
        
        if (distance > 0) {
          const minDistance = nodeA.radius + nodeB.radius + 25;
          
          // Overlap resolution forces
          if (distance < minDistance) {
            hasOverlaps = true;
            const overlapForce = (minDistance - distance) * 2;
            const fx = (dx / distance) * overlapForce;
            const fy = (dy / distance) * overlapForce;
            
            forces[i].x -= fx;
            forces[i].y -= fy;
            forces[j].x += fx;
            forces[j].y += fy;
          }
          
          // X-axis distribution forces
          if (xDistance < idealXSpacing * 0.8) {
            const xForce = (idealXSpacing * 0.8 - xDistance) * 0.15;
            const xDir = dx > 0 ? 1 : -1;
            forces[i].x -= xDir * xForce;
            forces[j].x += xDir * xForce;
          }
          
          // Y-axis distribution forces
          if (yDistance < idealYSpacing * 0.8) {
            const yForce = (idealYSpacing * 0.8 - yDistance) * 0.15;
            const yDir = dy > 0 ? 1 : -1;
            forces[i].y -= yDir * yForce;
            forces[j].y += yDir * yForce;
          }
        }
      }
    }

    // Apply axis balancing forces to maintain even spread
    const xPositions = nodes.map(n => n.x).sort((a, b) => a - b);
    const yPositions = nodes.map(n => n.y).sort((a, b) => a - b);
    
    nodes.forEach((node, index) => {
      // X-axis balancing - encourage even spacing along X
      const currentXRank = xPositions.indexOf(node.x);
      const targetX = margin + (availableWidth * (currentXRank + 0.5)) / nodes.length;
      const xDeviation = node.x - targetX;
      if (Math.abs(xDeviation) > idealXSpacing * 0.2) {
        forces[index].x -= xDeviation * 0.05;
      }
      
      // Y-axis balancing - encourage even spacing along Y
      const currentYRank = yPositions.indexOf(node.y);
      const targetY = margin + (availableHeight * (currentYRank + 0.5)) / nodes.length;
      const yDeviation = node.y - targetY;
      if (Math.abs(yDeviation) > idealYSpacing * 0.2) {
        forces[index].y -= yDeviation * 0.05;
      }
    });

    // Apply forces with bounds checking
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x += forces[i].x;
      nodes[i].y += forces[i].y;
      
      // Keep nodes within bounds
      nodes[i].x = Math.max(margin + nodes[i].radius, Math.min(virtualWidth - margin - nodes[i].radius, nodes[i].x));
      nodes[i].y = Math.max(margin + nodes[i].radius, Math.min(virtualHeight - margin - nodes[i].radius, nodes[i].y));
    }

    // Early exit if no overlaps remain
    if (!hasOverlaps) break;
  }
}

// Force-directed layout algorithm that prioritizes even distribution first, then minimizes edge crossings
export function applyForceDirectedLayout(nodes: Node[], edges: Edge[]): Node[] {
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const iterations = 200;
  const dampening = 0.85;

  // Create a copy of nodes to modify
  const layoutNodes = nodes.map(node => ({ ...node, vx: 0, vy: 0 }));

  // Calculate ideal spacing based on available space and number of nodes
  const availableWidth = virtualWidth - 2 * margin;
  const availableHeight = virtualHeight - 2 * margin;
  const totalArea = availableWidth * availableHeight;
  const areaPerNode = totalArea / layoutNodes.length;
  const idealSpacing = Math.sqrt(areaPerNode) * 0.8; // Use 80% for some overlap tolerance

  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    layoutNodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Phase 1: Even distribution forces (PRIMARY PRIORITY)
    // This creates a uniform distribution across the available space with specific X/Y axis distribution
    
    // Calculate ideal X and Y spacing separately
    const idealXSpacing = availableWidth / Math.ceil(Math.sqrt(layoutNodes.length));
    const idealYSpacing = availableHeight / Math.ceil(Math.sqrt(layoutNodes.length));
    
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const nodeA = layoutNodes[i];
        const nodeB = layoutNodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          // Separate X and Y axis distribution forces
          const xDistance = Math.abs(dx);
          const yDistance = Math.abs(dy);
          
          // X-axis distribution force
          let xForce = 0;
          if (xDistance < idealXSpacing) {
            xForce = (idealXSpacing - xDistance) * 0.15;
          }
          
          // Y-axis distribution force  
          let yForce = 0;
          if (yDistance < idealYSpacing) {
            yForce = (idealYSpacing - yDistance) * 0.15;
          }
          
          // Apply axis-specific forces
          if (xForce > 0) {
            const xDir = dx > 0 ? 1 : -1;
            nodeA.vx -= xDir * xForce;
            nodeB.vx += xDir * xForce;
          }
          
          if (yForce > 0) {
            const yDir = dy > 0 ? 1 : -1;
            nodeA.vy -= yDir * yForce;
            nodeB.vy += yDir * yForce;
          }
          
          // Standard radial distribution force for overall spacing
          const targetDistance = idealSpacing;
          const distributionForce = (targetDistance - distance) * 0.08;
          
          // Stronger force when nodes are too close (overlap prevention)
          const minDistance = nodeA.radius + nodeB.radius + 25;
          let repulsionForce = 0;
          
          if (distance < minDistance) {
            repulsionForce = 8000 * (minDistance - distance) / (distance * distance);
          } else if (distance < targetDistance) {
            repulsionForce = 2000 / (distance * distance);
          }
          
          const totalRadialForce = distributionForce + repulsionForce;
          
          if (Math.abs(totalRadialForce) > 0.01) {
            const fx = (dx / distance) * totalRadialForce;
            const fy = (dy / distance) * totalRadialForce;
            
            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }
    }
    
    // Additional X/Y axis balancing forces to ensure even spread
    if (iter < iterations * 0.7) { // Apply during first 70% of iterations
      const centerX = margin + availableWidth / 2;
      const centerY = margin + availableHeight / 2;
      
      // Calculate current distribution on each axis
      const xPositions = layoutNodes.map(n => n.x).sort((a, b) => a - b);
      const yPositions = layoutNodes.map(n => n.y).sort((a, b) => a - b);
      
      // Apply balancing forces to spread nodes more evenly on each axis
      layoutNodes.forEach((node, index) => {
        // X-axis balancing
        const targetX = margin + (availableWidth * (index + 0.5)) / layoutNodes.length;
        const xDeviation = node.x - targetX;
        if (Math.abs(xDeviation) > idealXSpacing * 0.3) {
          node.vx -= xDeviation * 0.02;
        }
        
        // Y-axis balancing - use a different distribution pattern
        const targetY = margin + (availableHeight * ((index * 7) % layoutNodes.length + 0.5)) / layoutNodes.length;
        const yDeviation = node.y - targetY;
        if (Math.abs(yDeviation) > idealYSpacing * 0.3) {
          node.vy -= yDeviation * 0.02;
        }
      });
    }

    // Phase 2: Edge-based forces (maintain connectivity while preserving distribution)
    const edgeAttractionStrength = Math.max(0.005, 0.02 * (1 - iter / iterations)); // Decrease over time
    const idealEdgeLength = Math.min(idealSpacing * 1.5, 250); // Adaptive edge length
    
    edges.forEach(edge => {
      const sourceNode = layoutNodes.find(n => n.id === edge.source);
      const targetNode = layoutNodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const displacement = distance - idealEdgeLength;
          const force = edgeAttractionStrength * displacement * 0.5; // Reduced to maintain distribution
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      }
    });

    // Phase 3: Edge crossing avoidance (SECONDARY PRIORITY - only after distribution is established)
    if (iter > iterations * 0.3) { // Only apply after initial distribution is established
      const crossingAvoidanceStrength = 200 * (iter / iterations); // Gradually increase
      
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
                
                const force = crossingAvoidanceStrength * 0.05; // Reduced to preserve distribution
                
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

  // Post-processing: Final overlap resolution while maintaining distribution
  resolveOverlapsWithDistribution(layoutNodes, idealSpacing);

  // Return updated positions (remove velocity properties)
  return layoutNodes.map(({ vx: _vx, vy: _vy, ...node }) => node);
}

// Generate initial position for a node based on its word, prioritizing even distribution
export function generateInitialPosition(word: string, existingNodes: Node[]) {
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const availableWidth = virtualWidth - 2 * margin;
  const availableHeight = virtualHeight - 2 * margin;

  // Calculate ideal spacing based on total expected nodes
  const totalNodes = existingNodes.length + 1;
  const totalArea = availableWidth * availableHeight;
  const areaPerNode = totalArea / totalNodes;
  const idealSpacing = Math.sqrt(areaPerNode) * 0.8;

  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  // Strategy 1: Try to find a position that maximizes distance from existing nodes
  let bestPosition = { x: 0, y: 0 };
  let maxMinDistance = 0;
  const attempts = 30;
  const hash = hashCode(word.toLowerCase());
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    const seedX = (hash + attempt * 1234) % availableWidth;
    const seedY = ((hash >> 8) + attempt * 5678) % availableHeight;
    
    const x = margin + seedX;
    const y = margin + seedY;
    
    // Find minimum distance to existing nodes
    let minDistance = Infinity;
    for (const existingNode of existingNodes) {
      const dx = x - existingNode.x;
      const dy = y - existingNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      minDistance = Math.min(minDistance, distance);
    }
    
    if (minDistance > maxMinDistance) {
      maxMinDistance = minDistance;
      bestPosition = { x, y };
    }
  }
  
  // If we found a good position with reasonable spacing, use it
  if (maxMinDistance > idealSpacing * 0.5) {
    return bestPosition;
  }
  
  // Strategy 2: Use a more systematic grid-based approach for better distribution
  const gridSize = Math.ceil(Math.sqrt(totalNodes));
  const cellWidth = availableWidth / gridSize;
  const cellHeight = availableHeight / gridSize;
  
  // Try to place in the least crowded grid cell
  let bestCell = { x: 0, y: 0, crowding: Infinity };
  
  for (let gridX = 0; gridX < gridSize; gridX++) {
    for (let gridY = 0; gridY < gridSize; gridY++) {
      const cellCenterX = margin + gridX * cellWidth + cellWidth / 2;
      const cellCenterY = margin + gridY * cellHeight + cellHeight / 2;
      
      // Count nodes in this cell and adjacent cells
      let crowding = 0;
      for (const existingNode of existingNodes) {
        const dx = existingNode.x - cellCenterX;
        const dy = existingNode.y - cellCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Weight nearby nodes more heavily
        if (distance < cellWidth) {
          crowding += 2;
        } else if (distance < cellWidth * 1.5) {
          crowding += 1;
        }
      }
      
      if (crowding < bestCell.crowding) {
        bestCell = { x: cellCenterX, y: cellCenterY, crowding };
      }
    }
  }
  
  // Add some randomness within the chosen cell to avoid perfect grid alignment
  const jitterX = (Math.random() - 0.5) * cellWidth * 0.3;
  const jitterY = (Math.random() - 0.5) * cellHeight * 0.3;
  
  return {
    x: Math.max(margin + 50, Math.min(virtualWidth - margin - 50, bestCell.x + jitterX)),
    y: Math.max(margin + 50, Math.min(virtualHeight - margin - 50, bestCell.y + jitterY))
  };
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