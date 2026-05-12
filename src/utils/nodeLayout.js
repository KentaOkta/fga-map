export const NODE_WIDTH = 160
export const NODE_HEADER_HEIGHT = 40
export const RELATION_ROW_HEIGHT = 32

/** Offset (px) of the source handle from the node's top edge. */
export function sourceHandleOffset(sh, nodeRelations) {
  if (!sh) return NODE_HEADER_HEIGHT / 2                          // header source handle
  const idx = (nodeRelations ?? []).indexOf(sh)
  if (idx === -1) return NODE_HEADER_HEIGHT / 2
  return NODE_HEADER_HEIGHT + idx * RELATION_ROW_HEIGHT + RELATION_ROW_HEIGHT / 2
}

export function getNodeHeight(isExpanded, relationCount) {
  return isExpanded
    ? NODE_HEADER_HEIGHT + relationCount * RELATION_ROW_HEIGHT
    : NODE_HEADER_HEIGHT
}
