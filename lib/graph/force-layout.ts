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

interface LayoutOptions {
  pinnedPositions?: Record<string, { x: number; y: number }>;
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
        const minDistance = nodeA.radius + nodeB.radius + 25; // Now always 125 (50 + 50 + 25)
        
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
function resolveOverlapsWithDistribution(
  nodes: Node[],
  idealSpacing: number,
  pinnedNodeIds?: Set<string>
) {
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
        const isPinnedA = pinnedNodeIds?.has(nodeA.id) ?? false;
        const isPinnedB = pinnedNodeIds?.has(nodeB.id) ?? false;
        
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
            
            if (!isPinnedA) {
              forces[i].x -= fx;
              forces[i].y -= fy;
            }
            if (!isPinnedB) {
              forces[j].x += fx;
              forces[j].y += fy;
            }
          }
          
          // X-axis distribution forces
          if (xDistance < idealXSpacing * 0.8) {
            const xForce = (idealXSpacing * 0.8 - xDistance) * 0.15;
            const xDir = dx > 0 ? 1 : -1;
            if (!isPinnedA) {
              forces[i].x -= xDir * xForce;
            }
            if (!isPinnedB) {
              forces[j].x += xDir * xForce;
            }
          }
          
          // Y-axis distribution forces
          if (yDistance < idealYSpacing * 0.8) {
            const yForce = (idealYSpacing * 0.8 - yDistance) * 0.15;
            const yDir = dy > 0 ? 1 : -1;
            if (!isPinnedA) {
              forces[i].y -= yDir * yForce;
            }
            if (!isPinnedB) {
              forces[j].y += yDir * yForce;
            }
          }
        }
      }
    }

    // Apply axis balancing forces to maintain even spread
    const xPositions = nodes.map(n => n.x).sort((a, b) => a - b);
    const yPositions = nodes.map(n => n.y).sort((a, b) => a - b);
    
    nodes.forEach((node, index) => {
      if (pinnedNodeIds?.has(node.id)) {
        return;
      }

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
      if (pinnedNodeIds?.has(nodes[i].id)) {
        continue;
      }
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
export function applyForceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] {
  if (nodes.length === 0) {
    return [];
  }

  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const iterations = 200;
  const dampening = 0.85;
  const { pinnedPositions = {} } = options;
  const pinnedNodeIds = new Set(Object.keys(pinnedPositions));

  // Create a copy of nodes to modify
  const layoutNodes = nodes.map(node => {
    const pinned = pinnedPositions[node.id];
    return {
      ...node,
      x: pinned ? pinned.x : node.x,
      y: pinned ? pinned.y : node.y,
      vx: 0,
      vy: 0,
    };
  });

  const applyForce = (
    node: (typeof layoutNodes)[number],
    fx: number,
    fy: number
  ) => {
    if (!pinnedNodeIds.has(node.id)) {
      node.vx += fx;
      node.vy += fy;
    }
  };

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
            applyForce(nodeA, -xDir * xForce, 0);
            applyForce(nodeB, xDir * xForce, 0);
          }
          
          if (yForce > 0) {
            const yDir = dy > 0 ? 1 : -1;
            applyForce(nodeA, 0, -yDir * yForce);
            applyForce(nodeB, 0, yDir * yForce);
          }
          
          // Standard radial distribution force for overall spacing
          const targetDistance = idealSpacing;
          const distributionForce = (targetDistance - distance) * 0.08;
          
          // Stronger force when nodes are too close (overlap prevention)
          const minDistance = nodeA.radius + nodeB.radius + 25; // Now always 125 (50 + 50 + 25)
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
            
            applyForce(nodeA, -fx, -fy);
            applyForce(nodeB, fx, fy);
          }
        }
      }
    }
    
    // Additional X/Y axis balancing forces to ensure even spread
    if (iter < iterations * 0.7) { // Apply during first 70% of iterations
      // Calculate current distribution on each axis
      const xPositions = layoutNodes.map(n => n.x).sort((a, b) => a - b);
      const yPositions = layoutNodes.map(n => n.y).sort((a, b) => a - b);
      
      // Apply balancing forces to spread nodes more evenly on each axis
      layoutNodes.forEach((node, index) => {
        if (pinnedNodeIds.has(node.id)) {
          return;
        }

        // X-axis balancing
        const targetX = margin + (availableWidth * (index + 0.5)) / layoutNodes.length;
        const xDeviation = node.x - targetX;
        if (Math.abs(xDeviation) > idealXSpacing * 0.3) {
          applyForce(node, -xDeviation * 0.02, 0);
        }
        
        // Y-axis balancing - use a different distribution pattern
        const targetY = margin + (availableHeight * ((index * 7) % layoutNodes.length + 0.5)) / layoutNodes.length;
        const yDeviation = node.y - targetY;
        if (Math.abs(yDeviation) > idealYSpacing * 0.3) {
          applyForce(node, 0, -yDeviation * 0.02);
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
          
          applyForce(sourceNode, fx, fy);
          applyForce(targetNode, -fx, -fy);
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
                applyForce(source1, perp1X * force, perp1Y * force);
                applyForce(target1, perp1X * force, perp1Y * force);
                applyForce(source2, -perp1X * force, -perp1Y * force);
                applyForce(target2, -perp1X * force, -perp1Y * force);
              }
            }
          }
        }
      }
    }

    // Apply forces and update positions
    layoutNodes.forEach(node => {
      if (pinnedNodeIds.has(node.id)) {
        const pinned = pinnedPositions[node.id];
        if (pinned) {
          node.x = pinned.x;
          node.y = pinned.y;
        }
        node.vx = 0;
        node.vy = 0;
        return;
      }

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
  resolveOverlapsWithDistribution(layoutNodes, idealSpacing, pinnedNodeIds);

  // Return updated positions (remove velocity properties)
  return layoutNodes.map(({ vx: _vx, vy: _vy, ...node }) => node);
}

export function applyPathAwareLayout(
  nodes: Node[],
  edges: Edge[],
  path: string[]
): Node[] {
  if (!Array.isArray(path) || path.length < 2) {
    return applyForceDirectedLayout(nodes, edges);
  }

  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const availableWidth = virtualWidth - 2 * margin;
  const availableHeight = virtualHeight - 2 * margin;

  const pathNodes = path
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is Node => Boolean(node));

  if (pathNodes.length < 2) {
    return applyForceDirectedLayout(nodes, edges);
  }

  const segments = pathNodes.length - 1;
  const baseSpacing = segments > 0 ? availableWidth / segments : availableWidth;
  const maxSpacing = 280;
  const minSpacing = 140;

  let pathSpacing = baseSpacing;
  if (segments > 0) {
    const withUpperBound = Math.min(pathSpacing, maxSpacing);
    const lowerBound = Math.min(minSpacing, baseSpacing);
    pathSpacing = Math.max(withUpperBound, lowerBound);
  }

  const totalWidth = segments > 0 ? pathSpacing * segments : 0;
  const startX = margin + (availableWidth - totalWidth) / 2;
  const pathY = margin + availableHeight / 2;
  const hasMidSegments = pathNodes.length > 2;
  const chordLength = totalWidth;

  const clampXWithinBounds = (node: Node, value: number) =>
    Math.max(
      margin + node.radius,
      Math.min(virtualWidth - margin - node.radius, value)
    );
  const clampYWithinBounds = (node: Node, value: number) =>
    Math.max(
      margin + node.radius,
      Math.min(virtualHeight - margin - node.radius, value)
    );

  const pathBounds = pathNodes.reduce(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.x),
      maxX: Math.max(bounds.maxX, node.x),
      minY: Math.min(bounds.minY, node.y),
      maxY: Math.max(bounds.maxY, node.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );

  const defaultCenterX = margin + availableWidth / 2;
  const defaultCenterY = margin + availableHeight / 2;
  let circleCenterX =
    Number.isFinite(pathBounds.minX) && Number.isFinite(pathBounds.maxX)
      ? (pathBounds.minX + pathBounds.maxX) / 2
      : defaultCenterX;
  let circleCenterY =
    Number.isFinite(pathBounds.minY) && Number.isFinite(pathBounds.maxY)
      ? (pathBounds.minY + pathBounds.maxY) / 2
      : defaultCenterY;

  const pinnedPositions: Record<string, { x: number; y: number }> = {};

  if (hasMidSegments && chordLength > 0) {
    // Pin the selected path along a near-complete circular arc, leaving a sizeable opening
    const requestedGap = Math.PI / Math.max(segments, 2);
    const minGap = (2 * Math.PI) / 3; // keep endpoints well separated (~120°)
    const maxGap = (5 * Math.PI) / 6; // still leave most of the circle intact (~150°)
    const gapAngle = Math.min(Math.max(requestedGap, minGap), maxGap);
    const arcAngle = 2 * Math.PI - gapAngle;

    const minRadius = Math.min(availableWidth, availableHeight) / 5;
    const maxRadius = Math.max(
      minRadius,
      Math.min(availableWidth, availableHeight) / 2 - 80
    );
    let radius =
      segments > 0 ? (pathSpacing * segments) / arcAngle : minRadius;
    radius = Math.min(Math.max(radius, minRadius), maxRadius);

    const minCenterX = margin + radius;
    const maxCenterX = margin + availableWidth - radius;
    const minCenterY = margin + radius;
    const maxCenterY = margin + availableHeight - radius;

    circleCenterX = Math.min(Math.max(circleCenterX, minCenterX), maxCenterX);
    circleCenterY = Math.min(Math.max(circleCenterY, minCenterY), maxCenterY);

    if (radius > 20 && maxRadius > 0) {
      // Aim the gap toward the rest of the graph so the arc hugs its original region
      const graphCenter = nodes.reduce(
        (acc, node) => {
          acc.x += node.x;
          acc.y += node.y;
          return acc;
        },
        { x: 0, y: 0 }
      );
      graphCenter.x /= nodes.length || 1;
      graphCenter.y /= nodes.length || 1;

      const dx = graphCenter.x - circleCenterX;
      const dy = graphCenter.y - circleCenterY;
      const gapCenterAngle =
        Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3
          ? Math.atan2(dy, dx)
          : -Math.PI / 2;

      const startAngle = gapCenterAngle + gapAngle / 2;
      const endAngle = startAngle + arcAngle;

      pathNodes.forEach((node, index) => {
        const progress = segments > 0 ? index / segments : 0;
        const angle = startAngle + (endAngle - startAngle) * progress;

        const x = circleCenterX + Math.cos(angle) * radius;
        const y = circleCenterY + Math.sin(angle) * radius;

        pinnedPositions[node.id] = {
          x: clampXWithinBounds(node, x),
          y: clampYWithinBounds(node, y),
        };
      });
    }
  }

  pathNodes.forEach((node, index) => {
    if (pinnedPositions[node.id]) {
      return;
    }

    pinnedPositions[node.id] = {
      x: clampXWithinBounds(node, startX + index * pathSpacing),
      y: clampYWithinBounds(node, pathY),
    };
  });

  return applyForceDirectedLayout(nodes, edges, {
    pinnedPositions,
  });
}

// Generate initial position for a node based on its word, prioritizing even distribution
export function generateInitialPosition(word: string, existingNodes: Node[]) {
  // Safety check for undefined word
  if (!word || typeof word !== 'string') {
    console.warn('generateInitialPosition called with invalid word:', word);
    return { x: 100, y: 100 }; // Return default position
  }

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
  
  // Add deterministic jitter based on the word to avoid perfect grid alignment
  const wordHash = hashCode(word.toLowerCase());
  const jitterX = ((wordHash % 1000) / 1000 - 0.5) * cellWidth * 0.3;
  const jitterY = (((wordHash >> 10) % 1000) / 1000 - 0.5) * cellHeight * 0.3;
  
  return {
    x: Math.max(margin + 50, Math.min(virtualWidth - margin - 50, bestCell.x + jitterX)),
    y: Math.max(margin + 50, Math.min(virtualWidth - margin - 50, bestCell.y + jitterY))
  };
}

// Calculate standardized node radius - all nodes have the same size
export function calculateNodeRadius(word: string, fontSize: number = 12): number {
  // Return a fixed radius for all nodes to standardize their size
  return 50;
}
