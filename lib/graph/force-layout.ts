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

// Force-directed layout algorithm to minimize edge crossings
export function applyForceDirectedLayout(nodes: Node[], edges: Edge[]): Node[] {
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;
  const iterations = 120;
  const repulsionStrength = 20000;
  const attractionStrength = 0.03;
  const crossingAvoidanceStrength = 1000;
  const dampening = 0.88;
  const idealEdgeLength = 250;

  // Create a copy of nodes to modify
  const layoutNodes = nodes.map(node => ({ ...node, vx: 0, vy: 0 }));

  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    layoutNodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Repulsion forces between all nodes
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const nodeA = layoutNodes[i];
        const nodeB = layoutNodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const minDistance = nodeA.radius + nodeB.radius + 20;
        
        if (distance > 0 && distance < minDistance * 3) {
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

  // Return updated positions
  return layoutNodes.map(({ vx, vy, ...node }) => node);
}

// Generate initial position for a node based on its word
export function generateInitialPosition(word: string, existingNodes: Node[]) {
  const virtualWidth = 1200;
  const virtualHeight = 900;
  const margin = 100;

  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const hash = hashCode(word.toLowerCase());
  
  const x = margin + (hash % (virtualWidth - 2 * margin));
  const y = margin + ((hash >> 16) % (virtualHeight - 2 * margin));

  return { x, y };
}

// Calculate node radius based on text width
export function calculateNodeRadius(word: string, fontSize: number = 12): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 35;
  
  ctx.font = `${fontSize}px Arial`;
  const textWidth = ctx.measureText(word).width;
  
  const minRadius = Math.max(35, (textWidth / 2) + 20);
  
  return Math.min(minRadius, 80);
}