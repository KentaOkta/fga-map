import dagre from '@dagrejs/dagre'
import { NODE_WIDTH, NODE_HEADER_HEIGHT } from './nodeLayout.js'

/**
 * Apply Dagre layout to React Flow nodes and edges.
 *
 * @param {object[]} nodes
 * @param {object[]} edges
 * @param {'LR'|'TB'} direction
 * @returns {object[]} repositioned nodes (edges are unchanged)
 */
export function applyDagreLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 })

  for (const node of nodes) {
    const height = node.data?.nodeHeight ?? NODE_HEADER_HEIGHT
    g.setNode(node.id, { width: NODE_WIDTH, height })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const { x, y } = g.node(node.id)
    const height = node.data?.nodeHeight ?? NODE_HEADER_HEIGHT
    return {
      ...node,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - height / 2,
      },
    }
  })
}
