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

type CardinalityType = 'left' | 'omni' | 'right' | null;

/**
 * Get the allowed direction for a connection based on cardinality
 */
function getAllowedDirection(
  word1: string,
  word2: string,
  reference: string,
  connectionCardinalities: Record<string, CardinalityType>
): { forward: boolean; reverse: boolean } {
  // Create keys with the reference included, matching the format used in pairing display
  const forwardKey = `${word1}-${word2}-${reference}`;
  const reverseKey = `${word2}-${word1}-${reference}`;

  const forwardCardinality = connectionCardinalities[forwardKey];
  const reverseCardinality = connectionCardinalities[reverseKey];

  // Use explicit cardinality if set, otherwise default to omni (bidirectional)
  const effectiveCardinality = forwardCardinality || reverseCardinality;

  // Debug logging
  if (effectiveCardinality && effectiveCardinality !== 'omni') {
    console.log('Cardinality check:', {
      word1,
      word2,
      reference,
      forwardKey,
      reverseKey,
      forwardCardinality,
      reverseCardinality,
      effectiveCardinality
    });
  }

  if (!effectiveCardinality || effectiveCardinality === 'omni') {
    return { forward: true, reverse: true };
  }

  switch (effectiveCardinality) {
    case 'left':
      // Second term points to first term (word2 -> word1)
      console.log('LEFT: Allowing reverse direction only for', word1, '->', word2);
      return { forward: false, reverse: true };
    case 'right':
      // First term points to second term (word1 -> word2)
      console.log('RIGHT: Allowing forward direction only for', word1, '->', word2);
      return { forward: true, reverse: false };
    case null:
      console.log('NULL: No direction allowed for', word1, '->', word2);
      return { forward: false, reverse: false };
    default:
      return { forward: true, reverse: true };
  }
}

/**
 * Find the shortest path between two nodes using Dijkstra's algorithm
 */
export function findShortestPath(
  startNodeId: string,
  endNodeId: string,
  nodes: Node[],
  edges: Edge[],
  excludedEdges: string[] = [],
  connectionCardinalities: Record<string, CardinalityType> = {}
): string[] | null {
  if (startNodeId === endNodeId) {
    return [startNodeId];
  }

  // Build adjacency list
  const adjacencyList = new Map<string, string[]>();
  
  // Initialize adjacency list for all nodes
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });

  // Populate adjacency list with edges, excluding specified edges and respecting cardinality
  edges.forEach(edge => {
    const edgeId = [edge.source, edge.target].sort().join('-');
    if (excludedEdges.includes(edgeId)) {
      return; // Skip this edge if it's excluded
    }

    const directions = getAllowedDirection(edge.source, edge.target, edge.reference, connectionCardinalities);

    const sourceNeighbors = adjacencyList.get(edge.source) || [];
    const targetNeighbors = adjacencyList.get(edge.target) || [];

    console.log('Adjacency list construction:', {
      edge: `${edge.source} -> ${edge.target}`,
      reference: edge.reference,
      directions,
      sourceNeighborsBefore: [...sourceNeighbors],
      targetNeighborsBefore: [...targetNeighbors]
    });

    // Add forward direction (source -> target) if allowed
    if (directions.forward) {
      sourceNeighbors.push(edge.target);
      console.log(`  Added forward: ${edge.source} -> ${edge.target}`);
    } else {
      console.log(`  Blocked forward: ${edge.source} -> ${edge.target}`);
    }

    // Add reverse direction (target -> source) if allowed
    if (directions.reverse) {
      targetNeighbors.push(edge.source);
      console.log(`  Added reverse: ${edge.target} -> ${edge.source}`);
    } else {
      console.log(`  Blocked reverse: ${edge.target} -> ${edge.source}`);
    }

    adjacencyList.set(edge.source, sourceNeighbors);
    adjacencyList.set(edge.target, targetNeighbors);
  });

  // Dijkstra's algorithm implementation
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  // Initialize distances and unvisited set
  nodes.forEach(node => {
    distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  });

  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let currentNode: string | null = null;
    let minDistance = Infinity;
    
    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Infinity;
      if (distance < minDistance) {
        minDistance = distance;
        currentNode = nodeId;
      }
    }

    if (currentNode === null || minDistance === Infinity) {
      // No path exists
      break;
    }

    unvisited.delete(currentNode);

    // If we reached the target, we can stop
    if (currentNode === endNodeId) {
      break;
    }

    // Update distances to neighbors
    const neighbors = adjacencyList.get(currentNode) || [];
    const currentDistance = distances.get(currentNode) ?? 0;

    neighbors.forEach(neighborId => {
      if (unvisited.has(neighborId)) {
        const newDistance = currentDistance + 1; // Each edge has weight 1
        const existingDistance = distances.get(neighborId) ?? Infinity;
        
        if (newDistance < existingDistance) {
          distances.set(neighborId, newDistance);
          previous.set(neighborId, currentNode);
        }
      }
    });
  }

  // Reconstruct path
  const path: string[] = [];
  let currentNode: string | null = endNodeId;

  while (currentNode !== null) {
    path.unshift(currentNode);
    currentNode = previous.get(currentNode) || null;
  }

  // Check if path is valid (starts with startNodeId)
  if (path.length === 0 || path[0] !== startNodeId) {
    return null; // No path found
  }

  return path;
}

/**
 * Get all edges that are part of the path between nodes
 */
export function getPathEdges(path: string[], edges: Edge[]): Edge[] {
  if (path.length < 2) {
    return [];
  }

  const pathEdges: Edge[] = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const currentNode = path[i];
    const nextNode = path[i + 1];
    
    // Find edge between current and next node
    const edge = edges.find(e => 
      (e.source === currentNode && e.target === nextNode) ||
      (e.source === nextNode && e.target === currentNode)
    );
    
    if (edge) {
      pathEdges.push(edge);
    }
  }
  
  return pathEdges;
}



/**
 * Find all simple paths between two nodes (no cycles/backtracking)
 */
export function findAllSimplePaths(
  startNode: string,
  endNode: string,
  nodes: Node[],
  edges: Edge[],
  maxLength: number = 6,
  excludedEdges: string[] = [],
  connectionCardinalities: Record<string, CardinalityType> = {}
): string[][] {
  // Build adjacency list respecting cardinality restrictions
  const adjacencyList = new Map<string, string[]>();
  nodes.forEach(node => adjacencyList.set(node.id, []));
  edges.forEach(edge => {
    const edgeId = [edge.source, edge.target].sort().join('-');
    if (excludedEdges.includes(edgeId)) {
      return; // Skip this edge if it's excluded
    }

    const directions = getAllowedDirection(edge.source, edge.target, edge.reference, connectionCardinalities);

    const sourceNeighbors = adjacencyList.get(edge.source) || [];
    const targetNeighbors = adjacencyList.get(edge.target) || [];

    // Add forward direction (source -> target) if allowed
    if (directions.forward) {
      sourceNeighbors.push(edge.target);
    }

    // Add reverse direction (target -> source) if allowed
    if (directions.reverse) {
      targetNeighbors.push(edge.source);
    }

    adjacencyList.set(edge.source, sourceNeighbors);
    adjacencyList.set(edge.target, targetNeighbors);
  });

  const allPaths: string[][] = [];
  
  // DFS to find all simple paths
  function dfs(currentNode: string, targetNode: string, currentPath: string[], visited: Set<string>) {
    if (currentPath.length > maxLength) return; // Prevent very long paths
    
    if (currentNode === targetNode) {
      allPaths.push([...currentPath]);
      return;
    }
    
    const neighbors = adjacencyList.get(currentNode) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        currentPath.push(neighbor);
        dfs(neighbor, targetNode, currentPath, visited);
        currentPath.pop();
        visited.delete(neighbor);
      }
    }
  }
  
  const visited = new Set<string>();
  visited.add(startNode);
  dfs(startNode, endNode, [startNode], visited);
  
  // Sort paths by length (simplest to most complex)
  return allPaths.sort((a, b) => a.length - b.length);
}

/**
 * Get all nodes that are part of any simple path between start and end
 */
function getNodesOnAllPaths(
  startNode: string,
  endNode: string,
  nodes: Node[],
  edges: Edge[],
  excludedEdges: string[] = [],
  connectionCardinalities: Record<string, CardinalityType> = {}
): Set<string> {
  const allPaths = findAllSimplePaths(startNode, endNode, nodes, edges, 6, excludedEdges, connectionCardinalities);
  const pathNodes = new Set<string>();

  // Add all nodes from all paths
  allPaths.forEach(path => {
    path.forEach(node => pathNodes.add(node));
  });

  return pathNodes;
}

/**
 * Get all paths between two nodes sorted by complexity (simplest first)
 */
export function getAllPathsBetweenNodes(
  startNode: string,
  endNode: string,
  nodes: Node[],
  edges: Edge[],
  excludedEdges: string[] = [],
  connectionCardinalities: Record<string, CardinalityType> = {}
): string[][] {
  return findAllSimplePaths(startNode, endNode, nodes, edges, 6, excludedEdges, connectionCardinalities);
}

/**
 * Get highlighted elements for a specific path
 */
export function getHighlightedElementsForPath(
  path: string[],
  edges: Edge[]
): {
  highlightedNodes: Set<string>;
  highlightedEdgeIds: Set<string>;
} {
  const highlightedNodes = new Set(path);
  const highlightedEdgeIds = new Set<string>();
  
  // Get edges for this specific path
  const pathEdges = getPathEdges(path, edges);
  pathEdges.forEach(edge => {
    const edgeId = [edge.source, edge.target].sort().join('-');
    highlightedEdgeIds.add(edgeId);
  });
  
  return {
    highlightedNodes,
    highlightedEdgeIds
  };
}

/**
 * Get all nodes and edges that should be highlighted when two nodes are selected
 */
export function getHighlightedElements(
  selectedNodes: string[],
  nodes: Node[],
  edges: Edge[],
  excludedEdges: string[] = [],
  connectionCardinalities: Record<string, CardinalityType> = {}
): {
  highlightedNodes: Set<string>;
  highlightedEdgeIds: Set<string>;
  path: string[] | null;
} {
  if (selectedNodes.length !== 2) {
    return {
      highlightedNodes: new Set(),
      highlightedEdgeIds: new Set(),
      path: null
    };
  }

  const [startNode, endNode] = selectedNodes;

  // First find the shortest path for reference
  const shortestPath = findShortestPath(startNode, endNode, nodes, edges, excludedEdges, connectionCardinalities);

  if (!shortestPath) {
    // If no path found, just highlight the selected nodes
    return {
      highlightedNodes: new Set(selectedNodes),
      highlightedEdgeIds: new Set(),
      path: null
    };
  }

  // Find all nodes that are part of simple paths between start and end
  const pathNodes = getNodesOnAllPaths(startNode, endNode, nodes, edges, excludedEdges, connectionCardinalities);
  
  // Find all edges that connect nodes that are both on paths between start and end
  const highlightedEdgeIds = new Set<string>();
  edges.forEach(edge => {
    if (pathNodes.has(edge.source) && pathNodes.has(edge.target)) {
      const edgeId = [edge.source, edge.target].sort().join('-');
      highlightedEdgeIds.add(edgeId);
    }
  });
  
  return {
    highlightedNodes: pathNodes,
    highlightedEdgeIds,
    path: shortestPath
  };
}