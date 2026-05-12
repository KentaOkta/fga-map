import { BaseEdge } from '@xyflow/react'

export default function IntraRefEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, style }) {
  const vertDist = Math.abs(sourceY - targetY)
  const arc = Math.max(30, vertDist * 0.5)

  const edgePath = [
    `M ${sourceX} ${sourceY}`,
    `C ${sourceX + arc} ${sourceY},`,
    `${targetX + arc} ${targetY},`,
    `${targetX} ${targetY}`,
  ].join(' ')

  return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
}
