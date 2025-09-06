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

/**
 * Find the shortest path between two nodes using Dijkstra's algorithm
 */
export function findShortestPath(
  startNodeId: string,
  endNodeId: string,
  nodes: Node[],
  edges: Edge[]
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

  // Populate adjacency list with edges
  edges.forEach(edge => {
    const sourceNeighbors = adjacencyList.get(edge.source) || [];
    const targetNeighbors = adjacencyList.get(edge.target) || [];
    
    sourceNeighbors.push(edge.target);
    targetNeighbors.push(edge.source);
    
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
  maxLength: number = 6
): string[][] {
  // Build adjacency list
  const adjacencyList = new Map<string, string[]>();
  nodes.forEach(node => adjacencyList.set(node.id, []));
  edges.forEach(edge => {
    const sourceNeighbors = adjacencyList.get(edge.source) || [];
    const targetNeighbors = adjacencyList.get(edge.target) || [];
    sourceNeighbors.push(edge.target);
    targetNeighbors.push(edge.source);
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
  edges: Edge[]
): Set<string> {
  const allPaths = findAllSimplePaths(startNode, endNode, nodes, edges);
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
  edges: Edge[]
): string[][] {
  return findAllSimplePaths(startNode, endNode, nodes, edges);
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
  edges: Edge[]
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
  const shortestPath = findShortestPath(startNode, endNode, nodes, edges);
  
  if (!shortestPath) {
    // If no path found, just highlight the selected nodes
    return {
      highlightedNodes: new Set(selectedNodes),
      highlightedEdgeIds: new Set(),
      path: null
    };
  }

  // Find all nodes that are part of simple paths between start and end
  const pathNodes = getNodesOnAllPaths(startNode, endNode, nodes, edges);
  
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