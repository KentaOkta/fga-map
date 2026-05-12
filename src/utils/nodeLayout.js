export const NODE_WIDTH = 160
export const NODE_HEADER_HEIGHT = 40
export const RELATION_ROW_HEIGHT = 32

export function getNodeHeight(isExpanded, relationCount) {
  return isExpanded
    ? NODE_HEADER_HEIGHT + relationCount * RELATION_ROW_HEIGHT
    : NODE_HEADER_HEIGHT
}
